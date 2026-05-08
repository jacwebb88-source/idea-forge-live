import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle, Info, History, Edit2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  format,
  isSameDay,
  parseISO,
} from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type Booking = {
  id: string;
  species: string | null;
  head_count: number | null;
  requested_kill_date: string | null;
  status: string | null;
  supplier_id: string | null;
  plant_id: string | null;
  fill_rate: number | null;
  lot_id: string | null;
  agent_ref: string | null;
  slot_time: string | null;
  arrival_slot: string | null;
  transport_status: string | null;
  hgp_status: string | null;
  kill_order_seq: number | null;
  msa_enrolled: boolean | null;
  pericardium_ok: boolean | null;
  mulesing_status: string | null;
  species_class: string | null;
  exit_followup_status: string | null;
};

type ComplianceCheck = {
  booking_id: string | null;
  nlis_status: string | null;
  nvd_status: string | null;
  pic_status: string | null;
};

const complianceState = (c?: ComplianceCheck): "ok" | "pending" | "fail" | "none" => {
  if (!c) return "none";
  const vals = [c.nlis_status, c.nvd_status, c.pic_status].map(v => (v || "").toLowerCase());
  if (vals.some(v => v === "fail" || v === "failed" || v === "rejected")) return "fail";
  if (vals.every(v => v === "ok" || v === "pass" || v === "verified" || v === "approved")) return "ok";
  return "pending";
};

type Supplier = { id: string; name: string };
type DayPlan = {
  id: string;
  date: string;
  species: string;
  planned_head: number;
  plant_id: string | null;
};

// ─── Confidence / status helpers ─────────────────────────────────────────────

/**
 * Maps booking status → confidence level name.
 * When a real confidence_level column is added to the DB, swap this mapping.
 */
const statusToConfidence = (status: string | null): string => {
  switch ((status || "").toLowerCase()) {
    case "confirmed":   return "Confirmed";
    case "high":        return "High";
    case "medium":      return "Medium";
    case "low":         return "Low";
    case "placeholder": return "Placeholder";
    case "pending":
    case "requested":   return "Low";
    case "cancelled":   return "Cancelled";
    default:            return "Placeholder";
  }
};

/**
 * Returns Tailwind classes for the booking card left border + subtle background
 * based on confidence level.
 * Palette:  Placeholder=grey  Low=yellow  Medium=amber  High=green  Confirmed=blue
 */
const confidenceCardStyle = (status: string | null): string => {
  const level = statusToConfidence(status);
  switch (level) {
    case "Confirmed":   return "border-l-4 border-l-blue-500   bg-blue-50/40  dark:bg-blue-950/20";
    case "High":        return "border-l-4 border-l-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20";
    case "Medium":      return "border-l-4 border-l-amber-500  bg-amber-50/40 dark:bg-amber-950/20";
    case "Low":         return "border-l-4 border-l-yellow-400 bg-yellow-50/40 dark:bg-yellow-950/20";
    case "Cancelled":   return "border-l-4 border-l-red-400    bg-red-50/40   dark:bg-red-950/20 opacity-60";
    default:            return "border-l-4 border-l-gray-300   bg-gray-50/40  dark:bg-gray-900/20"; // Placeholder
  }
};

/** Badge dot colour pill for confidence level */
const ConfidenceBadge = ({ status }: { status: string | null }) => {
  const level = statusToConfidence(status);
  const styles: Record<string, string> = {
    Confirmed:   "bg-blue-100   text-blue-800   border-blue-200",
    High:        "bg-emerald-100 text-emerald-800 border-emerald-200",
    Medium:      "bg-amber-100  text-amber-800  border-amber-200",
    Low:         "bg-yellow-100 text-yellow-800 border-yellow-200",
    Placeholder: "bg-gray-100   text-gray-600   border-gray-200",
    Cancelled:   "bg-red-100    text-red-700    border-red-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${styles[level] || styles.Placeholder}`}>
      {level}
    </span>
  );
};

/** Capacity bar colour */
const capacityBarColor = (pct: number, hasPlan: boolean): string => {
  if (!hasPlan) return "bg-muted";
  if (pct > 100) return "bg-destructive";
  if (pct >= 90)  return "bg-amber-500";
  if (pct >= 70)  return "bg-emerald-500";
  return "bg-emerald-400";
};

// ─── Component ────────────────────────────────────────────────────────────────

// ── Arrival slot options (30-min windows 06:00–22:00) ─────────────────────────
const ARRIVAL_SLOTS = Array.from({ length: 33 }, (_, i) => {
  const h = Math.floor(i / 2) + 6;
  const m = i % 2 === 0 ? "00" : "30";
  const hNext = m === "30" ? h + 1 : h;
  const mNext = m === "30" ? "00" : "30";
  return `${String(h).padStart(2,"0")}:${m}–${String(hNext).padStart(2,"0")}:${mNext}`;
}).filter(s => {
  const [start] = s.split("–");
  const [h] = start.split(":").map(Number);
  return h < 22;
});

// Fields that can be edited inline in the Kill Plan dialog
type EditableFields = {
  status: string;
  head_count: string;
  arrival_slot: string;
  kill_order_seq: string;
  transport_status: string;
  hgp_status: string;
  change_note: string;
};

export default function KillPlan() {
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [speciesFilter, setSpeciesFilter] = useState<string>("all");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [suppliers, setSuppliers] = useState<Record<string, string>>({});
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingChanges, setBookingChanges] = useState<any[]>([]);
  const [loadingChanges, setLoadingChanges] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState<EditableFields>({
    status: "", head_count: "", arrival_slot: "",
    kill_order_seq: "", transport_status: "", hgp_status: "", change_note: "",
  });
  const [saving, setSaving] = useState(false);

  const [compliance, setCompliance] = useState<Record<string, ComplianceCheck>>({});

  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // ── Data fetching ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const startStr = format(weekStart, "yyyy-MM-dd");
      const endStr   = format(weekEnd,   "yyyy-MM-dd");

      const [{ data: bks }, { data: dps }] = await Promise.all([
        supabase
          .from("bookings")
          .select(
            "id, species, head_count, requested_kill_date, status, supplier_id, plant_id, fill_rate, lot_id, agent_ref, slot_time, arrival_slot, transport_status, hgp_status, kill_order_seq, msa_enrolled, pericardium_ok, mulesing_status, species_class, exit_followup_status"
          )
          .gte("requested_kill_date", startStr)
          .lte("requested_kill_date", endStr),
        supabase
          .from("day_plans")
          .select("id, date, species, planned_head, plant_id")
          .gte("date", startStr)
          .lte("date", endStr),
      ]);

      const bookingList = (bks as unknown as Booking[]) || [];
      setBookings(bookingList);
      setDayPlans((dps as DayPlan[]) || []);

      const supplierIds = Array.from(
        new Set(bookingList.map((b) => b.supplier_id).filter(Boolean) as string[])
      );
      if (supplierIds.length) {
        const { data: sup } = await supabase
          .from("suppliers")
          .select("id, name")
          .in("id", supplierIds);
        const map: Record<string, string> = {};
        (sup as Supplier[] | null)?.forEach((s) => (map[s.id] = s.name));
        setSuppliers(map);
      } else {
        setSuppliers({});
      }

      // Compliance status per booking
      const bookingIds = bookingList.map(b => b.id);
      if (bookingIds.length) {
        const { data: cc } = await supabase
          .from("compliance_checks")
          .select("booking_id, nlis_status, nvd_status, pic_status")
          .in("booking_id", bookingIds);
        const cMap: Record<string, ComplianceCheck> = {};
        (cc as ComplianceCheck[] | null)?.forEach(r => {
          if (r.booking_id) cMap[r.booking_id] = r;
        });
        setCompliance(cMap);
      } else {
        setCompliance({});
      }

      setLoading(false);
    };
    load();
  }, [weekStart, weekEnd]);

  // ── Fetch change history when a booking is opened ─────────────────────────
  useEffect(() => {
    if (!selectedBooking) { setBookingChanges([]); return; }
    const fetchChanges = async () => {
      setLoadingChanges(true);
      const { data } = await (supabase as any)
        .from("booking_changes")
        .select("*")
        .eq("booking_id", selectedBooking.id)
        .order("changed_at", { ascending: false })
        .limit(20);
      setBookingChanges(data || []);
      setLoadingChanges(false);
    };
    fetchChanges();
  }, [selectedBooking]);

  // ── Open edit mode with current booking values ────────────────────────────
  const openEditMode = () => {
    if (!selectedBooking) return;
    setEditFields({
      status:          selectedBooking.status          || "",
      head_count:      String(selectedBooking.head_count ?? ""),
      arrival_slot:    selectedBooking.arrival_slot    || selectedBooking.slot_time || "",
      kill_order_seq:  String(selectedBooking.kill_order_seq ?? ""),
      transport_status: selectedBooking.transport_status || "",
      hgp_status:      selectedBooking.hgp_status      || "",
      change_note:     "",
    });
    setEditMode(true);
  };

  // ── Save edits: diff fields → write booking_changes + update booking ──────
  const saveEdit = async () => {
    if (!selectedBooking) return;
    setSaving(true);

    // Fields to diff (old value source → new value)
    const diffable: Array<{ key: keyof EditableFields; dbKey: string; oldVal: string }> = [
      { key: "status",           dbKey: "status",           oldVal: selectedBooking.status           || "" },
      { key: "head_count",       dbKey: "head_count",       oldVal: String(selectedBooking.head_count ?? "") },
      { key: "arrival_slot",     dbKey: "arrival_slot",     oldVal: selectedBooking.arrival_slot || selectedBooking.slot_time || "" },
      { key: "kill_order_seq",   dbKey: "kill_order_seq",   oldVal: String(selectedBooking.kill_order_seq ?? "") },
      { key: "transport_status", dbKey: "transport_status", oldVal: selectedBooking.transport_status || "" },
      { key: "hgp_status",       dbKey: "hgp_status",       oldVal: selectedBooking.hgp_status       || "" },
    ];

    const changed = diffable.filter(f => {
      const oldNorm = f.oldVal.trim();
      const newNorm = editFields[f.key].trim();
      return oldNorm !== newNorm;
    });

    if (changed.length === 0) {
      toast({ title: "No changes", description: "Nothing was modified." });
      setEditMode(false);
      setSaving(false);
      return;
    }

    // Write one row per changed field to booking_changes
    const changeRows = changed.map(f => ({
      booking_id:      selectedBooking.id,
      field_name:      f.dbKey,
      old_value:       f.oldVal || null,
      new_value:       editFields[f.key] || null,
      changed_by:      "Kill Plan",
      changed_by_role: "Processor",
      change_note:     editFields.change_note || null,
    }));

    const { error: insertError } = await (supabase as any)
      .from("booking_changes")
      .insert(changeRows);

    if (insertError) {
      toast({ title: "Error saving", description: insertError.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Build the update payload
    const updatePayload: Record<string, any> = {};
    for (const f of changed) {
      if (f.key === "head_count") {
        updatePayload[f.dbKey] = parseInt(editFields[f.key]) || null;
      } else if (f.key === "kill_order_seq") {
        updatePayload[f.dbKey] = parseInt(editFields[f.key]) || null;
      } else if (f.key === "arrival_slot") {
        updatePayload["arrival_slot"] = editFields[f.key] || null;
      } else {
        updatePayload[f.dbKey] = editFields[f.key] || null;
      }
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update(updatePayload)
      .eq("id", selectedBooking.id);

    if (updateError) {
      toast({ title: "Error updating booking", description: updateError.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Update local state
    const updatedBooking: Booking = {
      ...selectedBooking,
      status:           "status"           in updatePayload ? updatePayload.status           : selectedBooking.status,
      head_count:       "head_count"       in updatePayload ? updatePayload.head_count       : selectedBooking.head_count,
      arrival_slot:     "arrival_slot"     in updatePayload ? updatePayload.arrival_slot     : selectedBooking.arrival_slot,
      kill_order_seq:   "kill_order_seq"   in updatePayload ? updatePayload.kill_order_seq   : selectedBooking.kill_order_seq,
      transport_status: "transport_status" in updatePayload ? updatePayload.transport_status : selectedBooking.transport_status,
      hgp_status:       "hgp_status"       in updatePayload ? updatePayload.hgp_status       : selectedBooking.hgp_status,
    };

    setBookings(prev => prev.map(b => b.id === selectedBooking.id ? updatedBooking : b));
    setSelectedBooking(updatedBooking);

    // Refresh change history
    const { data: newChanges } = await (supabase as any)
      .from("booking_changes")
      .select("*")
      .eq("booking_id", selectedBooking.id)
      .order("changed_at", { ascending: false })
      .limit(20);
    setBookingChanges(newChanges || []);

    toast({
      title: `${changed.length} change${changed.length !== 1 ? "s" : ""} saved`,
      description: "Booking updated and change log recorded.",
    });
    setEditMode(false);
    setSaving(false);
  };

  // ── Filtering helpers ──────────────────────────────────────────────────────
  const matchesSpecies = (s: string | null) => {
    if (speciesFilter === "all") return true;
    const v = (s || "").toLowerCase();
    if (speciesFilter === "cattle") return v === "cattle" || v === "beef";
    return v === speciesFilter;
  };

  const filteredBookings = bookings.filter(
    (b) => matchesSpecies(b.species) && (b.status || "").toLowerCase() !== "cancelled"
  );

  const bookingsForDay = (d: Date) =>
    filteredBookings.filter(
      (b) => b.requested_kill_date && isSameDay(parseISO(b.requested_kill_date), d)
    );

  const plannedForDay = (d: Date) => {
    const dStr = format(d, "yyyy-MM-dd");
    return dayPlans
      .filter((p) => p.date === dStr && matchesSpecies(p.species))
      .reduce((sum, p) => sum + (p.planned_head || 0), 0);
  };

  // ── HGP sequencing check: returns true if HGP-treated appears before HGP-free on a day ──
  const hasHGPSequenceError = (dayBks: Booking[]): boolean => {
    const sorted = [...dayBks].sort((a, b) => (a.kill_order_seq ?? 999) - (b.kill_order_seq ?? 999));
    let seenTreated = false;
    for (const b of sorted) {
      if ((b.hgp_status || "").toLowerCase() === "hgp_treated") seenTreated = true;
      if (seenTreated && (b.hgp_status || "").toLowerCase() === "hgp_free") return true;
    }
    return false;
  };

  // ── Week summary stats ─────────────────────────────────────────────────────
  const totalBooked = filteredBookings.reduce((sum, b) => sum + (b.head_count || 0), 0);
  const totalPlanned = dayPlans
    .filter((p) => matchesSpecies(p.species))
    .reduce((sum, p) => sum + (p.planned_head || 0), 0);
  const fillRate = totalPlanned > 0 ? (totalBooked / totalPlanned) * 100 : 0;
  const placeholderCount = filteredBookings.filter(
    (b) => statusToConfidence(b.status) === "Placeholder"
  ).length;
  const overCapacityDays = days.filter((d) => {
    const planned = plannedForDay(d);
    const booked  = bookingsForDay(d).reduce((sum, b) => sum + (b.head_count || 0), 0);
    return planned > 0 && booked > planned;
  }).length;
  const shortfallDays = days.filter((d) => {
    const planned = plannedForDay(d);
    const booked  = bookingsForDay(d).reduce((sum, b) => sum + (b.head_count || 0), 0);
    // Weekday with capacity but booked < 80% = shortfall risk
    const dow = d.getDay();
    const isWeekday = dow >= 1 && dow <= 5;
    return isWeekday && planned > 0 && booked < planned * 0.8;
  }).length;
  const complianceFailCount = filteredBookings.filter(
    (b) => complianceState(compliance[b.id]) === "fail"
  ).length;
  const exitFollowupCount = filteredBookings.filter(
    (b) => (b.exit_followup_status || "").toLowerCase() === "pending"
      || (b.exit_followup_status || "").toLowerCase() === "overdue"
  ).length;

  // ── Confidence legend data ─────────────────────────────────────────────────
  const legendItems = [
    { level: "Placeholder", colour: "bg-gray-300",    label: "Placeholder — unconfirmed slot" },
    { level: "Low",         colour: "bg-yellow-400",  label: "Low — early enquiry" },
    { level: "Medium",      colour: "bg-amber-500",   label: "Medium — likely to proceed" },
    { level: "High",        colour: "bg-emerald-500", label: "High — verbal commitment" },
    { level: "Confirmed",   colour: "bg-blue-500",    label: "Confirmed — paperwork complete" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Kill Board</h1>
            <p className="text-muted-foreground">
              Weekly kill schedule — head count, booking confidence, compliance &amp; exit-date follow-up
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekStart(addWeeks(weekStart, -1))}
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-3 py-2 border rounded-md min-w-[240px] justify-center">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {format(weekStart, "d MMM")} – {format(weekEnd, "d MMM yyyy")}
              </span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekStart(addWeeks(weekStart, 1))}
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            >
              This week
            </Button>
            <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Species" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All species</SelectItem>
                <SelectItem value="cattle">Cattle</SelectItem>
                <SelectItem value="sheep">Sheep</SelectItem>
                <SelectItem value="lamb">Lamb</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setShowLegend((v) => !v)}
            >
              <Info className="h-4 w-4 mr-1" />
              Legend
            </Button>
          </div>
        </div>

        {/* ── Confidence legend (collapsible) ── */}
        {showLegend && (
          <Card className="border-dashed">
            <CardContent className="pt-4 pb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Booking confidence colours
              </p>
              <div className="flex flex-wrap gap-4">
                {legendItems.map((item) => (
                  <div key={item.level} className="flex items-center gap-2 text-sm">
                    <div className={`w-3 h-3 rounded-sm ${item.colour}`} />
                    <span className="text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Head booked this week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBooked.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Planned kill capacity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPlanned.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Fill rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${fillRate > 100 ? "text-destructive" : fillRate >= 80 ? "text-emerald-600" : ""}`}>
                {fillRate.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card className={overCapacityDays > 0 ? "border-destructive/50 bg-destructive/5" : shortfallDays > 0 ? "border-amber-400/50 bg-amber-50/40 dark:bg-amber-950/10" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1">
                {(overCapacityDays > 0 || shortfallDays > 0) && (
                  <AlertTriangle className={`h-3.5 w-3.5 ${overCapacityDays > 0 ? "text-destructive" : "text-amber-600"}`} />
                )}
                Overschedule &amp; shortfall
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0.5">
                <div className={`text-sm font-semibold ${overCapacityDays > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {overCapacityDays} overschedule
                </div>
                <div className={`text-sm font-semibold ${shortfallDays > 0 ? "text-amber-700" : "text-muted-foreground"}`}>
                  {shortfallDays} shortfall
                </div>
                <div className="text-xs text-muted-foreground pt-0.5">
                  {placeholderCount > 0 && <>{placeholderCount} placeholder{placeholderCount !== 1 ? "s" : ""} · </>}
                  {complianceFailCount > 0 && <span className="text-destructive font-medium">{complianceFailCount} compliance · </span>}
                  {exitFollowupCount > 0 && <span className="text-amber-700 font-medium">{exitFollowupCount} exit f/u</span>}
                  {placeholderCount === 0 && complianceFailCount === 0 && exitFollowupCount === 0 && "All clear"}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Week grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
          {days.map((day) => {
            const dayBookings = bookingsForDay(day);
            const planned = plannedForDay(day);
            const booked  = dayBookings.reduce((sum, b) => sum + (b.head_count || 0), 0);
            const hasPlan = planned > 0;
            const pct     = hasPlan ? (booked / planned) * 100 : 0;
            const barWidth = hasPlan ? Math.min(pct, 100) : 0;
            const isOver  = hasPlan && booked > planned;
            const dow = day.getDay();
            const isWeekday = dow >= 1 && dow <= 5;
            const isShortfall = isWeekday && hasPlan && !isOver && booked < planned * 0.8;
            const hgpError = hasHGPSequenceError(dayBookings);
            const isToday = isSameDay(day, new Date());

            return (
              <Card
                key={day.toISOString()}
                className={`flex flex-col ${isOver ? "ring-2 ring-destructive/70 border-destructive/50" : isShortfall ? "ring-2 ring-amber-400/70 border-amber-300" : hgpError ? "ring-2 ring-orange-400/70 border-orange-300" : isToday ? "ring-2 ring-primary/60 border-primary/40" : ""}`}
              >
                <CardHeader className="pb-3">
                  {/* Day header */}
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-semibold flex flex-col">
                      <span className={isToday ? "text-primary" : ""}>{format(day, "EEEE")}</span>
                      <span className={`text-xs font-normal ${isToday ? "text-primary/80 font-semibold" : "text-muted-foreground"}`}>
                        {format(day, "d MMM")}{isToday ? " · Today" : ""}
                      </span>
                    </CardTitle>
                    {isOver && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-destructive bg-destructive/10 rounded px-1.5 py-0.5">
                        <AlertTriangle className="h-3 w-3" />
                        OVER
                      </span>
                    )}
                    {isShortfall && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">
                        <AlertTriangle className="h-3 w-3" />
                        SHORT
                      </span>
                    )}
                    {hgpError && !isOver && !isShortfall && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-100 rounded px-1.5 py-0.5">
                        <AlertTriangle className="h-3 w-3" />
                        HGP
                      </span>
                    )}
                  </div>

                  {/* Capacity bar */}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span className={isOver ? "font-semibold text-destructive" : ""}>
                        {booked.toLocaleString()} / {hasPlan ? planned.toLocaleString() : "—"}
                      </span>
                      <span className={isOver ? "font-semibold text-destructive" : ""}>
                        {hasPlan ? `${pct.toFixed(0)}%` : "—"}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full ${capacityBarColor(pct, hasPlan)} transition-all`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    {/* Overflow indicator */}
                    {isOver && hasPlan && (
                      <div className="mt-1 text-xs text-destructive font-medium">
                        +{(booked - planned).toLocaleString()} overscheduled
                      </div>
                    )}
                    {isShortfall && (
                      <div className="mt-1 text-xs text-amber-700 font-medium">
                        {(planned - booked).toLocaleString()} head shortfall
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-2 pt-0">
                  {loading ? (
                    <div className="text-xs text-muted-foreground animate-pulse">Loading…</div>
                  ) : dayBookings.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic">No bookings</div>
                  ) : (
                    dayBookings.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setSelectedBooking(b)}
                        className={`w-full text-left p-2 rounded-md border border-border hover:brightness-95 transition-all ${confidenceCardStyle(b.status)}`}
                      >
                        {/* Supplier name */}
                        <div className="text-sm font-medium truncate leading-tight">
                          {suppliers[b.supplier_id || ""] || "Unknown supplier"}
                        </div>
                        {/* Head count + species row */}
                        <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {(b.head_count ?? 0).toLocaleString()} hd
                          </span>
                          <span className="capitalize">{b.species || "—"}</span>
                        </div>
                        {/* Confidence + HGP + compliance + exit follow-up badges */}
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <ConfidenceBadge status={b.status} />
                          {(() => {
                            const cs = complianceState(compliance[b.id]);
                            if (cs === "fail") return (
                              <span className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs font-semibold bg-red-50 text-red-700 border-red-200" title="Compliance failed">
                                ⚠ Compliance
                              </span>
                            );
                            if (cs === "pending") return (
                              <span className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs font-semibold bg-yellow-50 text-yellow-800 border-yellow-200" title="Compliance pending">
                                Compl. pending
                              </span>
                            );
                            if (cs === "ok") return (
                              <span className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200" title="Compliance verified">
                                ✓ Compl.
                              </span>
                            );
                            return null;
                          })()}
                          {(b.exit_followup_status || "").toLowerCase() === "overdue" && (
                            <span className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs font-semibold bg-red-50 text-red-700 border-red-200" title="Exit follow-up overdue">
                              Exit f/u overdue
                            </span>
                          )}
                          {(b.exit_followup_status || "").toLowerCase() === "pending" && (
                            <span className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border-amber-200" title="Exit follow-up pending">
                              Exit f/u
                            </span>
                          )}
                          {b.hgp_status === "hgp_free" && (
                            <span className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
                              HGP-Free
                            </span>
                          )}
                          {b.hgp_status === "hgp_treated" && (
                            <span className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs font-semibold bg-orange-50 text-orange-700 border-orange-200">
                              HGP
                            </span>
                          )}
                          {b.arrival_slot && (
                            <span className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs text-muted-foreground bg-background border-border">
                              {b.arrival_slot}
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </CardContent>

                {/* Day footer total */}
                <div className="border-t border-border px-4 py-2 text-xs flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className={`font-semibold ${isOver ? "text-destructive" : ""}`}>
                    {booked.toLocaleString()} head
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Booking detail / edit dialog ── */}
      <Dialog
        open={!!selectedBooking}
        onOpenChange={(open) => { if (!open) { setSelectedBooking(null); setEditMode(false); } }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle>{editMode ? "Edit booking" : "Booking details"}</DialogTitle>
                <DialogDescription>
                  Ref: {selectedBooking?.id.slice(-8).toUpperCase()}
                  {" · "}{suppliers[selectedBooking?.supplier_id || ""] || "Unknown supplier"}
                </DialogDescription>
              </div>
              {!editMode ? (
                <Button variant="outline" size="sm" onClick={openEditMode} className="shrink-0">
                  <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                  Edit
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setEditMode(false)} className="shrink-0">
                  <X className="h-3.5 w-3.5 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
          </DialogHeader>

          {selectedBooking && !editMode && (
            <div className="space-y-3 text-sm">
              {/* Confidence banner */}
              <div className={`rounded-md px-3 py-2 flex items-center justify-between ${confidenceCardStyle(selectedBooking.status)}`}>
                <span className="text-xs font-medium text-muted-foreground">Booking confidence</span>
                <ConfidenceBadge status={selectedBooking.status} />
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Supplier</p>
                  <p className="font-medium">{suppliers[selectedBooking.supplier_id || ""] || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Species</p>
                  <p className="capitalize">{selectedBooking.species || "—"}{selectedBooking.species_class ? ` · ${selectedBooking.species_class}` : ""}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Head count</p>
                  <p className="font-semibold">{(selectedBooking.head_count ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Kill date</p>
                  <p>{selectedBooking.requested_kill_date
                    ? format(parseISO(selectedBooking.requested_kill_date), "d MMM yyyy")
                    : "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Arrival slot</p>
                  <p>{selectedBooking.arrival_slot || selectedBooking.slot_time || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Transport</p>
                  <p className="capitalize">{selectedBooking.transport_status || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lot ID</p>
                  <p>{selectedBooking.lot_id || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Buyer / agent allocation</p>
                  <p>{selectedBooking.agent_ref || "—"}</p>
                </div>
              </div>

              {/* ── Compliance flags ── */}
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Compliance flags</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">HGP status</p>
                    {selectedBooking.hgp_status === "hgp_free" ? (
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">✓ HGP-Free</span>
                    ) : selectedBooking.hgp_status === "hgp_treated" ? (
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-orange-50 text-orange-700 border-orange-200">HGP-Treated</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Not set</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Kill order</p>
                    <p>{selectedBooking.kill_order_seq != null ? `#${selectedBooking.kill_order_seq}` : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">MSA enrolled</p>
                    <p>{selectedBooking.msa_enrolled === true ? "✓ Yes" : selectedBooking.msa_enrolled === false ? "No" : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Pericardium</p>
                    <p>{selectedBooking.pericardium_ok === true ? "✓ OK" : selectedBooking.pericardium_ok === false ? "⚠ Flag" : "—"}</p>
                  </div>
                  {["lamb","sheep","mutton"].includes((selectedBooking.species || "").toLowerCase()) && (
                    <div>
                      <p className="text-xs text-muted-foreground">Mulesing status</p>
                      <p className="capitalize">{selectedBooking.mulesing_status?.replace(/_/g, " ") || "⚠ Not set"}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Fill rate</p>
                    <p>{selectedBooking.fill_rate != null ? `${selectedBooking.fill_rate.toFixed(1)}%` : "—"}</p>
                  </div>
                </div>
              </div>

              {/* ── Change audit trail ── */}
              <div className="border-t pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <History className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Change history</p>
                </div>
                {loadingChanges ? (
                  <p className="text-xs text-muted-foreground animate-pulse">Loading…</p>
                ) : bookingChanges.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No changes recorded yet. Use Edit to make the first change.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {bookingChanges.map((c: any) => (
                      <div key={c.id} className="text-xs border rounded-md px-2.5 py-1.5 bg-muted/40">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-semibold text-foreground capitalize">{c.field_name?.replace(/_/g, " ")}</span>
                          <span className="text-muted-foreground shrink-0">
                            {c.changed_at ? format(parseISO(c.changed_at), "d MMM HH:mm") : "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
                          <span className="line-through">{c.old_value || "—"}</span>
                          <span>→</span>
                          <span className="text-foreground font-medium">{c.new_value || "—"}</span>
                        </div>
                        {c.changed_by && (
                          <p className="text-muted-foreground mt-0.5">by {c.changed_by}{c.changed_by_role ? ` (${c.changed_by_role})` : ""}</p>
                        )}
                        {c.change_note && (
                          <p className="text-muted-foreground italic mt-0.5">"{c.change_note}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Edit mode ── */}
          {selectedBooking && editMode && (
            <div className="space-y-4 text-sm">
              <p className="text-xs text-muted-foreground">
                Only changed fields will be saved. Each change is recorded in the audit log automatically.
              </p>

              <div className="grid grid-cols-2 gap-3">
                {/* Status */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-status" className="text-xs">Confidence / Status</Label>
                  <Select value={editFields.status} onValueChange={v => setEditFields(p => ({ ...p, status: v }))}>
                    <SelectTrigger id="edit-status" className="h-8 text-xs">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-[200]">
                      <SelectItem value="placeholder">Placeholder</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Head count */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-head" className="text-xs">Head count</Label>
                  <Input
                    id="edit-head"
                    type="number"
                    min={1}
                    className="h-8 text-xs"
                    value={editFields.head_count}
                    onChange={e => setEditFields(p => ({ ...p, head_count: e.target.value }))}
                  />
                </div>

                {/* Arrival slot */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-slot" className="text-xs">Arrival slot</Label>
                  <Select value={editFields.arrival_slot} onValueChange={v => setEditFields(p => ({ ...p, arrival_slot: v }))}>
                    <SelectTrigger id="edit-slot" className="h-8 text-xs">
                      <SelectValue placeholder="Select slot" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-[200] max-h-48 overflow-y-auto">
                      <SelectItem value="">No slot</SelectItem>
                      {ARRIVAL_SLOTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Kill order */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-killorder" className="text-xs">Kill order seq #</Label>
                  <Input
                    id="edit-killorder"
                    type="number"
                    min={1}
                    className="h-8 text-xs"
                    placeholder="e.g. 3"
                    value={editFields.kill_order_seq}
                    onChange={e => setEditFields(p => ({ ...p, kill_order_seq: e.target.value }))}
                  />
                </div>

                {/* Transport status */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-transport" className="text-xs">Transport status</Label>
                  <Select value={editFields.transport_status} onValueChange={v => setEditFields(p => ({ ...p, transport_status: v }))}>
                    <SelectTrigger id="edit-transport" className="h-8 text-xs">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-[200]">
                      <SelectItem value="">Not set</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="arranged">Arranged</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="arrived">Arrived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* HGP status */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-hgp" className="text-xs">HGP status</Label>
                  <Select value={editFields.hgp_status} onValueChange={v => setEditFields(p => ({ ...p, hgp_status: v }))}>
                    <SelectTrigger id="edit-hgp" className="h-8 text-xs">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-[200]">
                      <SelectItem value="">Unknown</SelectItem>
                      <SelectItem value="hgp_free">HGP-Free</SelectItem>
                      <SelectItem value="hgp_treated">HGP-Treated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Change note */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-note" className="text-xs">Reason for change (optional)</Label>
                <Textarea
                  id="edit-note"
                  className="text-xs min-h-[60px] resize-none"
                  placeholder="e.g. Supplier called to reduce numbers, transport delayed…"
                  value={editFields.change_note}
                  onChange={e => setEditFields(p => ({ ...p, change_note: e.target.value }))}
                />
              </div>

              {/* Save button */}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>Cancel</Button>
                <Button size="sm" onClick={saveEdit} disabled={saving}>
                  {saving ? (
                    <span className="animate-pulse">Saving…</span>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      Save changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
