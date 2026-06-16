import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO } from "date-fns";
import {
  Search,
  ClipboardList,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  Activity,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Booking {
  id: string;
  booking_ref?: string | null;
  supplier_name: string | null;
  supplier_id: string | null;
  species: string | null;
  head_count: number | null;
  requested_kill_date: string | null;
  status: string | null;
}

interface KillGrade {
  id?: string;
  booking_id: string;
  mob_id?: string | null;
  nlis_tag?: string | null;
  lot_sequence: number;
  hscw_kg?: number | null;
  dressing_pct?: number | null;
  ph_reading?: number | null;
  fat_depth_mm?: number | null;
  ema_cm2?: number | null;
  marbling_score?: number | null;
  msa_grade?: string | null;
  msa_index?: number | null;
  dentition?: string | null;
  breed_code?: string | null;
  condemnation_reason?: string | null;
  price_per_kg?: number | null;
  graded_by?: string | null;
  notes?: string | null;
}

interface AnimalRow {
  _key: string;
  nlis_tag: string;
  hscw_kg: string;
  ph_reading: string;
  fat_depth_mm: string;
  msa_grade: string;
  marbling_score: string;
  price_per_kg: string;
  saving?: boolean;
  saved?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MSA_GRADES = ["MSA 3", "MSA 4", "MSA 5", "MSA 6", "Non-MSA"];
const DENTITIONS = ["0 tooth", "2 tooth", "4 tooth", "6 tooth", "8 tooth"];

const DEMO_LOT: Partial<KillGrade> = {
  hscw_kg: 312,
  ph_reading: 5.54,
  fat_depth_mm: 11,
  ema_cm2: 68,
  msa_grade: "MSA 4",
  marbling_score: 3,
  msa_index: 62.5,
  price_per_kg: 8.85,
  dentition: "2 tooth",
  graded_by: "",
  notes: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function phClass(ph: number | null | undefined): string {
  if (!ph) return "";
  if (ph > 5.7) return "bg-red-50 border-red-300 text-red-900";
  if (ph >= 5.6) return "bg-amber-50 border-amber-300 text-amber-900";
  return "bg-emerald-50 border-emerald-300 text-emerald-900";
}

function phBadgeClass(ph: number | null | undefined): string {
  if (!ph) return "";
  if (ph > 5.7) return "bg-red-100 text-red-800 border-red-200";
  if (ph >= 5.6) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}

function marblingClass(score: number | null | undefined): string {
  if (!score && score !== 0) return "";
  if (score >= 4) return "bg-yellow-100 text-yellow-800 border-yellow-300";
  if (score >= 2) return "bg-blue-100 text-blue-800 border-blue-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

function msaGradeColor(grade: string): string {
  switch (grade) {
    case "MSA 3": return "bg-blue-100 text-blue-800";
    case "MSA 4": return "bg-emerald-100 text-emerald-800";
    case "MSA 5": return "bg-purple-100 text-purple-800";
    case "MSA 6": return "bg-yellow-100 text-yellow-800";
    case "Non-MSA": return "bg-gray-100 text-gray-600";
    default: return "bg-gray-100 text-gray-600";
  }
}

function newAnimalRow(): AnimalRow {
  return {
    _key: crypto.randomUUID(),
    nlis_tag: "",
    hscw_kg: "",
    ph_reading: "",
    fat_depth_mm: "",
    msa_grade: "",
    marbling_score: "",
    price_per_kg: "",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KillGrading() {
  const { toast } = useToast();

  // Booking list state
  const [dateFrom, setDateFrom] = useState<string>(
    format(subDays(new Date(), 7), "yyyy-MM-dd")
  );
  const [dateTo, setDateTo] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Grading state
  const [grades, setGrades] = useState<KillGrade[]>([]);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [lotForm, setLotForm] = useState<Partial<KillGrade>>(DEMO_LOT);
  const [lotSaving, setLotSaving] = useState(false);
  const [animalRows, setAnimalRows] = useState<AnimalRow[]>([newAnimalRow()]);

  // ── Fetch bookings ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setBookingsLoading(true);
      const { data } = await supabase
        .from("bookings")
        .select("id, supplier_id, species, head_count, requested_kill_date, status")
        .gte("requested_kill_date", dateFrom)
        .lte("requested_kill_date", dateTo)
        .neq("status", "cancelled")
        .order("requested_kill_date", { ascending: false });

      const bks = (data as any[] | null) || [];

      // Enrich supplier names
      const supplierIds = Array.from(new Set(bks.map((b: any) => b.supplier_id).filter(Boolean)));
      let supplierMap: Record<string, string> = {};
      if (supplierIds.length) {
        const { data: sups } = await supabase
          .from("suppliers")
          .select("id, name")
          .in("id", supplierIds as string[]);
        (sups as any[] | null)?.forEach((s) => (supplierMap[s.id] = s.name));
      }

      setBookings(
        bks.map((b: any) => ({
          ...b,
          supplier_name: supplierMap[b.supplier_id] || "",
        }))
      );
      setBookingsLoading(false);
    };
    load();
  }, [dateFrom, dateTo]);

  // ── Fetch grades for selected booking ──────────────────────────────────────
  useEffect(() => {
    if (!selectedBooking) return;
    const load = async () => {
      setGradesLoading(true);
      const { data } = await supabase
        .from("kill_grades" as any)
        .select("*")
        .eq("booking_id", selectedBooking.id)
        .order("lot_sequence", { ascending: true });

      const gradeList = (data as KillGrade[] | null) || [];
      setGrades(gradeList);

      // Pre-populate lot form
      const lotSummary = gradeList.find((g) => g.lot_sequence === 0);
      if (lotSummary) {
        setLotForm(lotSummary);
      } else {
        // Use demo data so form doesn't look blank
        setLotForm({ ...DEMO_LOT, booking_id: selectedBooking.id });
      }

      // Individual animals (lot_sequence > 0)
      const animals = gradeList.filter((g) => g.lot_sequence > 0);
      if (animals.length > 0) {
        setAnimalRows(
          animals.map((g) => ({
            _key: g.id || crypto.randomUUID(),
            nlis_tag: g.nlis_tag || "",
            hscw_kg: g.hscw_kg?.toString() || "",
            ph_reading: g.ph_reading?.toString() || "",
            fat_depth_mm: g.fat_depth_mm?.toString() || "",
            msa_grade: g.msa_grade || "",
            marbling_score: g.marbling_score?.toString() || "",
            price_per_kg: g.price_per_kg?.toString() || "",
          }))
        );
      } else {
        setAnimalRows([newAnimalRow()]);
      }

      setGradesLoading(false);
    };
    load();
  }, [selectedBooking]);

  // ── Booking status helpers ──────────────────────────────────────────────────
  const gradedCount = useMemo(() => {
    if (!selectedBooking) return 0;
    const animals = grades.filter((g) => g.lot_sequence > 0);
    return animals.length || (grades.some((g) => g.lot_sequence === 0) ? 1 : 0);
  }, [grades, selectedBooking]);

  function bookingGradeStatus(bookingId: string): "Not Started" | "In Progress" | "Complete" {
    // For now we can't check counts per booking without fetching all grades;
    // use local selection info when available
    if (selectedBooking?.id === bookingId) {
      if (grades.length === 0) return "Not Started";
      const total = selectedBooking.head_count || 1;
      const individuals = grades.filter((g) => g.lot_sequence > 0).length;
      if (individuals >= total || grades.some((g) => g.lot_sequence === 0)) {
        return individuals >= total ? "Complete" : "In Progress";
      }
      return "Not Started";
    }
    return "Not Started";
  }

  // ── Save lot summary ────────────────────────────────────────────────────────
  const handleSaveLotSummary = async () => {
    if (!selectedBooking) return;
    setLotSaving(true);
    const payload: any = {
      booking_id: selectedBooking.id,
      lot_sequence: 0,
      hscw_kg: lotForm.hscw_kg ?? null,
      ph_reading: lotForm.ph_reading ?? null,
      fat_depth_mm: lotForm.fat_depth_mm ?? null,
      ema_cm2: lotForm.ema_cm2 ?? null,
      marbling_score: lotForm.marbling_score ?? null,
      msa_grade: lotForm.msa_grade ?? null,
      msa_index: lotForm.msa_index ?? null,
      dentition: lotForm.dentition ?? null,
      price_per_kg: lotForm.price_per_kg ?? null,
      graded_by: lotForm.graded_by ?? null,
      notes: lotForm.notes ?? null,
    };

    const existing = grades.find((g) => g.lot_sequence === 0);
    if (existing?.id) {
      await supabase.from("kill_grades" as any).update(payload).eq("id", existing.id);
    } else {
      await supabase.from("kill_grades" as any).insert(payload);
    }

    toast({ title: "Lot summary saved" });
    setLotSaving(false);
  };

  // ── Save individual animal row ──────────────────────────────────────────────
  const saveAnimalRow = async (row: AnimalRow, seq: number) => {
    if (!selectedBooking) return;
    setAnimalRows((prev) =>
      prev.map((r) => (r._key === row._key ? { ...r, saving: true } : r))
    );
    const payload: any = {
      booking_id: selectedBooking.id,
      lot_sequence: seq,
      nlis_tag: row.nlis_tag || null,
      hscw_kg: row.hscw_kg ? parseFloat(row.hscw_kg) : null,
      ph_reading: row.ph_reading ? parseFloat(row.ph_reading) : null,
      fat_depth_mm: row.fat_depth_mm ? parseFloat(row.fat_depth_mm) : null,
      msa_grade: row.msa_grade || null,
      marbling_score: row.marbling_score ? parseInt(row.marbling_score) : null,
      price_per_kg: row.price_per_kg ? parseFloat(row.price_per_kg) : null,
    };
    await supabase.from("kill_grades" as any).insert(payload);
    setAnimalRows((prev) =>
      prev.map((r) => (r._key === row._key ? { ...r, saving: false, saved: true } : r))
    );
  };

  const deleteAnimalRow = (key: string) => {
    setAnimalRows((prev) => prev.filter((r) => r._key !== key));
  };

  // ── Running averages for individual animal tab ─────────────────────────────
  const animalStats = useMemo(() => {
    const filled = animalRows.filter((r) => r.hscw_kg);
    if (!filled.length) return null;
    const avgHscw =
      filled.reduce((s, r) => s + parseFloat(r.hscw_kg || "0"), 0) / filled.length;
    const phFilled = animalRows.filter((r) => r.ph_reading);
    const avgPh = phFilled.length
      ? phFilled.reduce((s, r) => s + parseFloat(r.ph_reading || "0"), 0) / phFilled.length
      : null;
    const marbFilled = animalRows.filter((r) => r.marbling_score);
    const avgMarb = marbFilled.length
      ? marbFilled.reduce((s, r) => s + parseFloat(r.marbling_score || "0"), 0) /
        marbFilled.length
      : null;
    const totalValue = filled.reduce((s, r) => {
      const kg = parseFloat(r.hscw_kg || "0");
      const price = parseFloat(r.price_per_kg || "0");
      return s + kg * price;
    }, 0);
    return { avgHscw, avgPh, avgMarb, totalValue, count: filled.length };
  }, [animalRows]);

  // ── Stats bar ──────────────────────────────────────────────────────────────
  const statsBarData = useMemo(() => {
    const lotSummary = grades.find((g) => g.lot_sequence === 0);
    const individuals = grades.filter((g) => g.lot_sequence > 0);

    const headGraded = individuals.length || (lotSummary ? selectedBooking?.head_count || 0 : 0);
    const avgHscw = lotSummary?.hscw_kg ?? lotForm.hscw_kg ?? null;
    const avgMsaIndex = lotSummary?.msa_index ?? lotForm.msa_index ?? null;
    const totalKillValue =
      avgHscw && lotForm.price_per_kg
        ? avgHscw * (selectedBooking?.head_count || 1) * (lotForm.price_per_kg ?? 0)
        : null;

    // Grade distribution
    const gradeMap: Record<string, number> = {};
    if (lotSummary?.msa_grade) {
      gradeMap[lotSummary.msa_grade] = selectedBooking?.head_count || 1;
    }
    individuals.forEach((g) => {
      if (g.msa_grade) gradeMap[g.msa_grade] = (gradeMap[g.msa_grade] || 0) + 1;
    });

    return { headGraded, avgHscw, avgMsaIndex, totalKillValue, gradeMap };
  }, [grades, lotForm, selectedBooking]);

  // ── Filtered bookings ──────────────────────────────────────────────────────
  const filteredBookings = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return bookings;
    return bookings.filter(
      (b) =>
        (b.booking_ref || "").toLowerCase().includes(q) ||
        (b.supplier_name || "").toLowerCase().includes(q) ||
        (b.species || "").toLowerCase().includes(q)
    );
  }, [bookings, search]);

  // ── Grade distribution bar ─────────────────────────────────────────────────
  const totalGraded = Object.values(statsBarData.gradeMap).reduce((a, b) => a + b, 0);
  const gradeColors: Record<string, string> = {
    "MSA 3": "bg-blue-400",
    "MSA 4": "bg-emerald-400",
    "MSA 5": "bg-purple-400",
    "MSA 6": "bg-yellow-400",
    "Non-MSA": "bg-gray-400",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Kill Grading</h1>
          <p className="text-muted-foreground mt-1">
            Enter carcase grading outcomes for each booking or lot
          </p>
        </div>

        <div className="flex gap-6 h-[calc(100vh-200px)] min-h-[600px]">
          {/* ── Left panel: booking selector ─────────────────────────────── */}
          <div className="w-[30%] flex flex-col gap-3">
            {/* Date range filter */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">From</Label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full border rounded-md px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">To</Label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full border rounded-md px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring mt-1"
                    />
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search bookings…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Booking list */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {bookingsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8 animate-pulse">
                  Loading bookings…
                </p>
              ) : filteredBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8 italic">
                  No bookings in this date range
                </p>
              ) : (
                filteredBookings.map((booking) => {
                  const isSelected = selectedBooking?.id === booking.id;
                  const status = bookingGradeStatus(booking.id);
                  const graded =
                    isSelected
                      ? gradedCount
                      : 0;
                  const total = booking.head_count || 0;

                  return (
                    <Card
                      key={booking.id}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary ring-1 ring-primary"
                          : "hover:border-muted-foreground/40"
                      }`}
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <CardContent className="pt-3 pb-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {booking.supplier_name || ""}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {booking.booking_ref || booking.id.slice(-8).toUpperCase()}
                            </p>
                          </div>
                          <Badge
                            className={`text-xs shrink-0 border ${
                              status === "Complete"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : status === "In Progress"
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                          >
                            {status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="capitalize">
                            {booking.species || "—"} · {total.toLocaleString()} head
                          </span>
                          <span>
                            {booking.requested_kill_date
                              ? format(parseISO(booking.requested_kill_date), "d MMM")
                              : "—"}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">{graded}</span>
                            {" / "}
                            {total} graded
                            <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: total ? `${Math.min(100, (graded / total) * 100)}%` : "0%" }}
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Right panel: grading entry ────────────────────────────────── */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {!selectedBooking ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
                <ClipboardList className="h-12 w-12 opacity-30" />
                <p className="text-sm">Select a booking to enter grading data</p>
              </div>
            ) : (
              <>
                {/* Booking header */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {selectedBooking.supplier_name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {selectedBooking.booking_ref || selectedBooking.id.slice(-8).toUpperCase()}
                      {" · "}
                      {selectedBooking.requested_kill_date
                        ? format(parseISO(selectedBooking.requested_kill_date), "d MMM yyyy")
                        : ""}
                      {" · "}
                      <span className="capitalize">{selectedBooking.species || "—"}</span>
                      {" · "}
                      {(selectedBooking.head_count || 0).toLocaleString()} head
                    </p>
                  </div>
                </div>

                {gradesLoading ? (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground animate-pulse text-sm">
                    Loading grading data…
                  </div>
                ) : (
                  <Tabs defaultValue="lot" className="flex-1 flex flex-col">
                    <TabsList className="w-fit">
                      <TabsTrigger value="lot">Lot Summary</TabsTrigger>
                      <TabsTrigger value="individual">Individual Animals</TabsTrigger>
                    </TabsList>

                    {/* ── Lot Summary tab ── */}
                    <TabsContent value="lot" className="flex-1 overflow-y-auto mt-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {/* HSCW */}
                            <div>
                              <Label>Average HSCW (kg)</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={lotForm.hscw_kg ?? ""}
                                onChange={(e) =>
                                  setLotForm((f) => ({
                                    ...f,
                                    hscw_kg: e.target.value ? parseFloat(e.target.value) : undefined,
                                  }))
                                }
                                className="mt-1"
                              />
                            </div>

                            {/* Dressing % */}
                            <div>
                              <Label>Dressing %</Label>
                              <Input
                                type="number"
                                step="0.1"
                                placeholder="Auto or manual"
                                value={lotForm.dressing_pct ?? ""}
                                onChange={(e) =>
                                  setLotForm((f) => ({
                                    ...f,
                                    dressing_pct: e.target.value ? parseFloat(e.target.value) : undefined,
                                  }))
                                }
                                className="mt-1"
                              />
                            </div>

                            {/* pH */}
                            <div>
                              <Label>Average pH</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={lotForm.ph_reading ?? ""}
                                onChange={(e) =>
                                  setLotForm((f) => ({
                                    ...f,
                                    ph_reading: e.target.value ? parseFloat(e.target.value) : undefined,
                                  }))
                                }
                                className={`mt-1 border ${phClass(lotForm.ph_reading)}`}
                              />
                              {lotForm.ph_reading && (
                                <p
                                  className={`text-xs mt-1 font-medium ${
                                    lotForm.ph_reading > 5.7
                                      ? "text-red-600"
                                      : lotForm.ph_reading >= 5.6
                                      ? "text-amber-600"
                                      : "text-emerald-600"
                                  }`}
                                >
                                  {lotForm.ph_reading > 5.7
                                    ? "High pH — dark cutting risk"
                                    : lotForm.ph_reading >= 5.6
                                    ? "Borderline pH"
                                    : "pH within range"}
                                </p>
                              )}
                            </div>

                            {/* Fat depth */}
                            <div>
                              <Label>Average Fat Depth (mm)</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={lotForm.fat_depth_mm ?? ""}
                                onChange={(e) =>
                                  setLotForm((f) => ({
                                    ...f,
                                    fat_depth_mm: e.target.value ? parseFloat(e.target.value) : undefined,
                                  }))
                                }
                                className="mt-1"
                              />
                            </div>

                            {/* EMA */}
                            <div>
                              <Label>Average EMA (cm²)</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={lotForm.ema_cm2 ?? ""}
                                onChange={(e) =>
                                  setLotForm((f) => ({
                                    ...f,
                                    ema_cm2: e.target.value ? parseFloat(e.target.value) : undefined,
                                  }))
                                }
                                className="mt-1"
                              />
                            </div>

                            {/* Marbling */}
                            <div>
                              <Label>Marbling Score</Label>
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                max="9"
                                value={lotForm.marbling_score ?? ""}
                                onChange={(e) =>
                                  setLotForm((f) => ({
                                    ...f,
                                    marbling_score: e.target.value ? parseInt(e.target.value) : undefined,
                                  }))
                                }
                                className={`mt-1 border ${marblingClass(lotForm.marbling_score)}`}
                              />
                            </div>

                            {/* MSA Grade */}
                            <div>
                              <Label>Predominant MSA Grade</Label>
                              <Select
                                value={lotForm.msa_grade ?? ""}
                                onValueChange={(v) => setLotForm((f) => ({ ...f, msa_grade: v }))}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select grade" />
                                </SelectTrigger>
                                <SelectContent>
                                  {MSA_GRADES.map((g) => (
                                    <SelectItem key={g} value={g}>
                                      {g}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* MSA Index */}
                            <div>
                              <Label>Average MSA Index</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={lotForm.msa_index ?? ""}
                                onChange={(e) =>
                                  setLotForm((f) => ({
                                    ...f,
                                    msa_index: e.target.value ? parseFloat(e.target.value) : undefined,
                                  }))
                                }
                                className="mt-1"
                              />
                            </div>

                            {/* Dentition */}
                            <div>
                              <Label>Predominant Dentition</Label>
                              <Select
                                value={lotForm.dentition ?? ""}
                                onValueChange={(v) => setLotForm((f) => ({ ...f, dentition: v }))}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select dentition" />
                                </SelectTrigger>
                                <SelectContent>
                                  {DENTITIONS.map((d) => (
                                    <SelectItem key={d} value={d}>
                                      {d}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Grid Price */}
                            <div>
                              <Label>Grid Price ($/kg HSCW)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={lotForm.price_per_kg ?? ""}
                                onChange={(e) =>
                                  setLotForm((f) => ({
                                    ...f,
                                    price_per_kg: e.target.value ? parseFloat(e.target.value) : undefined,
                                  }))
                                }
                                className="mt-1"
                              />
                            </div>

                            {/* Graded By */}
                            <div>
                              <Label>Graded By</Label>
                              <Input
                                placeholder="Staff name"
                                value={lotForm.graded_by ?? ""}
                                onChange={(e) =>
                                  setLotForm((f) => ({ ...f, graded_by: e.target.value }))
                                }
                                className="mt-1"
                              />
                            </div>

                            {/* Notes — full width */}
                            <div className="col-span-2 md:col-span-3">
                              <Label>Notes</Label>
                              <textarea
                                rows={3}
                                value={lotForm.notes ?? ""}
                                onChange={(e) =>
                                  setLotForm((f) => ({ ...f, notes: e.target.value }))
                                }
                                className="w-full mt-1 border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                                placeholder="Any notes about this lot…"
                              />
                            </div>
                          </div>

                          <div className="mt-4 flex justify-end">
                            <Button onClick={handleSaveLotSummary} disabled={lotSaving}>
                              {lotSaving ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Saving…
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-2" />
                                  Save Lot Summary
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    {/* ── Individual Animals tab ── */}
                    <TabsContent value="individual" className="flex-1 overflow-y-auto mt-4 space-y-4">
                      {/* Running averages banner */}
                      {animalStats && (
                        <Card className="bg-muted/40">
                          <CardContent className="pt-3 pb-3">
                            <div className="flex flex-wrap gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground text-xs">Animals entered</span>
                                <p className="font-bold">{animalStats.count}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground text-xs">Avg HSCW</span>
                                <p className="font-bold">{animalStats.avgHscw.toFixed(1)} kg</p>
                              </div>
                              {animalStats.avgPh && (
                                <div>
                                  <span className="text-muted-foreground text-xs">Avg pH</span>
                                  <p className={`font-bold ${animalStats.avgPh > 5.7 ? "text-red-600" : animalStats.avgPh >= 5.6 ? "text-amber-600" : "text-emerald-600"}`}>
                                    {animalStats.avgPh.toFixed(2)}
                                  </p>
                                </div>
                              )}
                              {animalStats.avgMarb !== null && (
                                <div>
                                  <span className="text-muted-foreground text-xs">Avg Marbling</span>
                                  <p className="font-bold">{animalStats.avgMarb.toFixed(1)}</p>
                                </div>
                              )}
                              <div>
                                <span className="text-muted-foreground text-xs">Total Value</span>
                                <p className="font-bold text-emerald-700">
                                  ${animalStats.totalValue.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Animal table */}
                      <Card>
                        <CardContent className="pt-4 overflow-x-auto">
                          <table className="w-full text-sm min-w-[700px]">
                            <thead>
                              <tr className="border-b text-xs text-muted-foreground">
                                <th className="text-left pb-2 pr-2 font-medium">NLIS Tag</th>
                                <th className="text-left pb-2 pr-2 font-medium">HSCW (kg)</th>
                                <th className="text-left pb-2 pr-2 font-medium">pH</th>
                                <th className="text-left pb-2 pr-2 font-medium">Fat (mm)</th>
                                <th className="text-left pb-2 pr-2 font-medium">MSA Grade</th>
                                <th className="text-left pb-2 pr-2 font-medium">Marbling</th>
                                <th className="text-left pb-2 pr-2 font-medium">$/kg</th>
                                <th className="text-left pb-2 font-medium">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {animalRows.map((row, idx) => (
                                <tr key={row._key} className="border-b last:border-0">
                                  <td className="py-1.5 pr-2">
                                    <Input
                                      value={row.nlis_tag}
                                      onChange={(e) =>
                                        setAnimalRows((prev) =>
                                          prev.map((r) =>
                                            r._key === row._key ? { ...r, nlis_tag: e.target.value } : r
                                          )
                                        )
                                      }
                                      placeholder="982…"
                                      className="h-8 text-xs font-mono"
                                    />
                                  </td>
                                  <td className="py-1.5 pr-2">
                                    <Input
                                      type="number"
                                      value={row.hscw_kg}
                                      onChange={(e) =>
                                        setAnimalRows((prev) =>
                                          prev.map((r) =>
                                            r._key === row._key ? { ...r, hscw_kg: e.target.value } : r
                                          )
                                        )
                                      }
                                      className="h-8 text-xs w-20"
                                    />
                                  </td>
                                  <td className="py-1.5 pr-2">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={row.ph_reading}
                                      onChange={(e) =>
                                        setAnimalRows((prev) =>
                                          prev.map((r) =>
                                            r._key === row._key ? { ...r, ph_reading: e.target.value } : r
                                          )
                                        )
                                      }
                                      className={`h-8 text-xs w-16 border ${row.ph_reading ? phClass(parseFloat(row.ph_reading)) : ""}`}
                                    />
                                  </td>
                                  <td className="py-1.5 pr-2">
                                    <Input
                                      type="number"
                                      value={row.fat_depth_mm}
                                      onChange={(e) =>
                                        setAnimalRows((prev) =>
                                          prev.map((r) =>
                                            r._key === row._key ? { ...r, fat_depth_mm: e.target.value } : r
                                          )
                                        )
                                      }
                                      className="h-8 text-xs w-16"
                                    />
                                  </td>
                                  <td className="py-1.5 pr-2">
                                    <Select
                                      value={row.msa_grade}
                                      onValueChange={(v) =>
                                        setAnimalRows((prev) =>
                                          prev.map((r) =>
                                            r._key === row._key ? { ...r, msa_grade: v } : r
                                          )
                                        )
                                      }
                                    >
                                      <SelectTrigger className="h-8 text-xs w-24">
                                        <SelectValue placeholder="Grade" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {MSA_GRADES.map((g) => (
                                          <SelectItem key={g} value={g}>
                                            {g}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="py-1.5 pr-2">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="9"
                                      value={row.marbling_score}
                                      onChange={(e) =>
                                        setAnimalRows((prev) =>
                                          prev.map((r) =>
                                            r._key === row._key ? { ...r, marbling_score: e.target.value } : r
                                          )
                                        )
                                      }
                                      className={`h-8 text-xs w-14 border ${row.marbling_score ? marblingClass(parseInt(row.marbling_score)) : ""}`}
                                    />
                                  </td>
                                  <td className="py-1.5 pr-2">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={row.price_per_kg}
                                      onChange={(e) =>
                                        setAnimalRows((prev) =>
                                          prev.map((r) =>
                                            r._key === row._key ? { ...r, price_per_kg: e.target.value } : r
                                          )
                                        )
                                      }
                                      className="h-8 text-xs w-16"
                                    />
                                  </td>
                                  <td className="py-1.5">
                                    <div className="flex items-center gap-1">
                                      {row.saved ? (
                                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 px-2"
                                          onClick={() => saveAnimalRow(row, idx + 1)}
                                          disabled={row.saving}
                                        >
                                          {row.saving ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <Save className="h-3 w-3" />
                                          )}
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-destructive hover:text-destructive"
                                        onClick={() => deleteAnimalRow(row._key)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => setAnimalRows((prev) => [...prev, newAnimalRow()])}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Animal
                          </Button>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                )}

                {/* ── Stats bar ── */}
                {!gradesLoading && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-3">
                      <Card>
                        <CardContent className="pt-3 pb-3">
                          <p className="text-xs text-muted-foreground">Total Head Graded</p>
                          <p className="text-xl font-bold mt-0.5">{statsBarData.headGraded}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-3 pb-3">
                          <p className="text-xs text-muted-foreground">Avg HSCW</p>
                          <p className="text-xl font-bold mt-0.5">
                            {statsBarData.avgHscw ? `${statsBarData.avgHscw} kg` : "—"}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-3 pb-3">
                          <p className="text-xs text-muted-foreground">Avg MSA Index</p>
                          <p className="text-xl font-bold mt-0.5">
                            {statsBarData.avgMsaIndex ?? "—"}
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-3 pb-3">
                          <p className="text-xs text-muted-foreground">Total Kill Value</p>
                          <p className="text-xl font-bold mt-0.5 text-emerald-700">
                            {statsBarData.totalKillValue
                              ? `$${statsBarData.totalKillValue.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                              : "—"}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* MSA grade distribution */}
                    {totalGraded > 0 && (
                      <Card>
                        <CardContent className="pt-3 pb-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs font-semibold text-muted-foreground">
                              MSA Grade Distribution
                            </p>
                          </div>
                          <div className="space-y-1.5">
                            {MSA_GRADES.map((grade) => {
                              const count = statsBarData.gradeMap[grade] || 0;
                              const pct = totalGraded ? (count / totalGraded) * 100 : 0;
                              return (
                                <div key={grade} className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground w-16 shrink-0">
                                    {grade}
                                  </span>
                                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${gradeColors[grade] || "bg-gray-400"}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium w-12 text-right">
                                    {count} ({pct.toFixed(0)}%)
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
