import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, parseISO, startOfToday, differenceInDays } from "date-fns";
import {
  CalendarDays, Plus, CheckCircle, Clock, AlertTriangle, XCircle,
  Truck, Package, ChevronRight, LogOut, ClipboardCheck,
  BarChart2, Leaf, ShieldAlert, FileText, Layers,
  Scale, ArrowRight, Info, Square,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type SlotDay = {
  date: string;
  label: string;
  totalBooked: number;
  capacity: number;
  available: number;
  status: "open" | "filling" | "full";
};

type Dispatch = {
  id: string;
  requested_kill_date: string | null;
  species: string;
  head_count: number | null;
  status: string | null;
  lot_id: string | null;
  hgp_status: string | null;
  est_avg_hscw: number | null;
  est_avg_live_wt: number | null;
  created_at: string;
  agent_ref: string | null;
};

type Lot = {
  id: string;         // lot_id string
  species: string;
  headIn: number;
  entryDate: string;  // estimated — derived from earliest booking
  killDate: string;
  dof: number;        // days on feed
  estHscw: number | null;
  dispatches: Dispatch[];
  status: "active" | "dispatched" | "killed";
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SPECIES_OPTIONS = [
  { value: "cattle",  label: "Cattle" },
  { value: "lamb",    label: "Lamb" },
  { value: "sheep",   label: "Sheep" },
  { value: "goat",    label: "Goat" },
];

const HGP_OPTIONS = [
  { value: "nil",               label: "HGP free" },
  { value: "implanted",         label: "HGP implanted" },
  { value: "under_withholding", label: "Under withholding period" },
];

const MULESING_OPTIONS = [
  { value: "nm",    label: "Not mulesed (NM)" },
  { value: "m",     label: "Mulesed (M)" },
  { value: "np",    label: "NLIS progeny (NP)" },
  { value: "na",    label: "N/A (cattle/goat)" },
];

const STATUS_META: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  requested: { label: "Awaiting approval", cls: "bg-amber-100 text-amber-800 border-amber-200",   icon: Clock },
  confirmed: { label: "Confirmed",         cls: "bg-blue-100 text-blue-800 border-blue-200",     icon: CheckCircle },
  pending:   { label: "Pending",           cls: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  high:      { label: "Confirmed",         cls: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle },
  medium:    { label: "Tentative",         cls: "bg-sky-100 text-sky-800 border-sky-200",         icon: Clock },
  cancelled: { label: "Cancelled",         cls: "bg-red-100 text-red-800 border-red-200",         icon: XCircle },
  killed:    { label: "Processed",         cls: "bg-purple-100 text-purple-800 border-purple-200", icon: CheckCircle },
};

const SLOT_STYLE = {
  open:    { card: "bg-emerald-50 border-emerald-200 hover:shadow-md hover:scale-[1.02]", badge: "bg-emerald-100 text-emerald-800", bar: "bg-emerald-400", label: "Open" },
  filling: { card: "bg-amber-50 border-amber-200 hover:shadow-md hover:scale-[1.02]",    badge: "bg-amber-100 text-amber-800",    bar: "bg-amber-400",   label: "Filling" },
  full:    { card: "bg-red-50 border-red-200 opacity-60 cursor-not-allowed",              badge: "bg-red-100 text-red-800",        bar: "bg-red-400",     label: "Full" },
};

// ─── Compliance Item ──────────────────────────────────────────────────────────

function ComplianceRow({
  checked, label, detail, warning,
}: { checked: boolean; label: string; detail: string; warning?: boolean }) {
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 ${
      warning ? "bg-amber-50 border-amber-200" :
      checked  ? "bg-emerald-50 border-emerald-200" : "bg-muted/30 border-border"
    }`}>
      {warning ? (
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
      ) : checked ? (
        <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
      ) : (
        <Square className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      )}
      <div>
        <p className={`text-sm font-medium ${warning ? "text-amber-800" : checked ? "text-emerald-800" : "text-foreground"}`}>
          {label}
        </p>
        <p className={`text-xs mt-0.5 ${warning ? "text-amber-700" : "text-muted-foreground"}`}>{detail}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SupplierPortal() {
  const { profile, signOut } = useAuth();
  const { toast }            = useToast();

  // Slot availability
  const [slots, setSlots]                 = useState<SlotDay[]>([]);
  const [loadingSlots, setLoadingSlots]   = useState(true);

  // Dispatches
  const [dispatches, setDispatches]               = useState<Dispatch[]>([]);
  const [loadingDispatches, setLoadingDispatches] = useState(true);

  // Dialog
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [submitting, setSubmitting]   = useState(false);

  // Form fields
  const [species, setSpecies]           = useState("cattle");
  const [headCount, setHeadCount]       = useState("");
  const [picNumber, setPicNumber]       = useState("");
  const [hgpStatus, setHgpStatus]       = useState("nil");
  const [mulesingStatus, setMulesingStatus] = useState("na");
  const [nvdNumber, setNvdNumber]       = useState("");
  const [carrierName, setCarrierName]   = useState("");
  const [vehicleRego, setVehicleRego]   = useState("");
  const [estimatedLiveWt, setEstimatedLiveWt] = useState("");
  const [lotRef, setLotRef]             = useState("");
  const [notes, setNotes]               = useState("");

  // Compliance form
  const [nvdSigned, setNvdSigned]               = useState(false);
  const [nlisTransferred, setNlisTransferred]   = useState(false);
  const [withholdingClear, setWithholdingClear] = useState(false);
  const [animalsFasted, setAnimalsFasted]       = useState(false);

  // ── Fetch slot availability ──
  const fetchSlots = async () => {
    setLoadingSlots(true);
    const today = startOfToday();
    const dates = Array.from({ length: 14 }, (_, i) =>
      format(addDays(today, i + 1), "yyyy-MM-dd")
    );
    const { data: bookings } = await supabase
      .from("bookings")
      .select("requested_kill_date, head_count, status")
      .in("requested_kill_date", dates)
      .neq("status", "cancelled");
    const { data: plants } = await supabase
      .from("plants")
      .select("daily_capacity")
      .limit(1);
    const cap    = (plants as any[])?.[0]?.daily_capacity ?? 500;
    const bkList = (bookings as any[]) ?? [];
    const slotDays: SlotDay[] = dates.map(date => {
      const dayBks = bkList.filter((b: any) => b.requested_kill_date === date);
      const booked = dayBks.reduce((s: number, b: any) => s + (b.head_count || 0), 0);
      const avail  = Math.max(0, cap - booked);
      const pct    = cap > 0 ? booked / cap : 0;
      return {
        date,
        label:       format(parseISO(date), "EEE d MMM"),
        totalBooked: booked,
        capacity:    cap,
        available:   avail,
        status:      pct >= 1 ? "full" : pct >= 0.75 ? "filling" : "open",
      };
    });
    setSlots(slotDays);
    setLoadingSlots(false);
  };

  // ── Fetch my dispatches ──
  const fetchDispatches = async () => {
    setLoadingDispatches(true);
    const { data } = await supabase
      .from("bookings")
      .select("id, requested_kill_date, species, head_count, status, lot_id, hgp_status, est_avg_hscw, est_avg_live_wt, created_at, agent_ref")
      .order("requested_kill_date", { ascending: false })
      .limit(50);
    setDispatches((data as Dispatch[]) ?? []);
    setLoadingDispatches(false);
  };

  useEffect(() => { fetchSlots(); }, []);
  useEffect(() => { fetchDispatches(); }, [profile]);

  // ── Open dialog ──
  const openDialog = (date: string) => {
    setSelectedDate(date);
    setSpecies("cattle");
    setHeadCount("");
    setPicNumber("");
    setHgpStatus("nil");
    setMulesingStatus("na");
    setNvdNumber("");
    setCarrierName("");
    setVehicleRego("");
    setEstimatedLiveWt("");
    setLotRef("");
    setNotes("");
    setDialogOpen(true);
  };

  // ── Submit dispatch pre-advice ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headCount || parseInt(headCount) < 1) {
      toast({ title: "Head count required", variant: "destructive" });
      return;
    }
    if (!picNumber.trim()) {
      toast({ title: "PIC required", description: "Property Identification Code is required for NLIS", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    // Build agent_ref from PIC + NVD so ops can see them at a glance
    const agentRefStr = [picNumber.trim(), nvdNumber.trim() ? `NVD:${nvdNumber.trim()}` : null, carrierName.trim() || null].filter(Boolean).join(" | ");

    const { error } = await supabase.from("bookings").insert({
      requested_kill_date: selectedDate,
      species,
      head_count:      parseInt(headCount),
      hgp_status:      hgpStatus,
      mulesing_status: mulesingStatus !== "na" ? mulesingStatus : null,
      est_avg_live_wt: estimatedLiveWt ? parseFloat(estimatedLiveWt) : null,
      lot_id:          lotRef.trim() || null,
      agent_ref:       agentRefStr || null,
      notes:           [
        notes,
        vehicleRego ? `Vehicle: ${vehicleRego}` : null,
      ].filter(Boolean).join(" | ") || null,
      status:           "requested",
      transport_status: carrierName.trim() ? "booked" : "pending",
    });

    if (error) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Dispatch pre-advice sent",
        description: `${headCount} head ${species} — kill date ${format(parseISO(selectedDate), "d MMM yyyy")}. Awaiting processor confirmation.`,
      });
      setDialogOpen(false);
      fetchDispatches();
      fetchSlots();
    }
    setSubmitting(false);
  };

  // ── Derive lots from dispatches (group by lot_id) ──
  const lots: Lot[] = (() => {
    const lotMap: Record<string, Dispatch[]> = {};
    dispatches.forEach(d => {
      const key = d.lot_id ?? `ADHOC-${d.id.slice(0, 8)}`;
      if (!lotMap[key]) lotMap[key] = [];
      lotMap[key].push(d);
    });
    return Object.entries(lotMap).map(([lotId, ds]) => {
      const sorted   = [...ds].sort((a, b) =>
        (a.requested_kill_date ?? "").localeCompare(b.requested_kill_date ?? "")
      );
      const killDate = sorted[0]?.requested_kill_date ?? "";
      const estHscw  = sorted[0]?.est_avg_hscw ?? null;
      const headIn   = ds.reduce((s, d) => s + (d.head_count ?? 0), 0);
      const dof      = killDate
        ? Math.max(0, differenceInDays(parseISO(killDate), startOfToday()))
        : 0;
      const allKilled    = ds.every(d => d.status === "killed");
      const anyConfirmed = ds.some(d => ["confirmed", "high"].includes(d.status ?? ""));
      return {
        id:        lotId,
        species:   sorted[0]?.species ?? "—",
        headIn,
        entryDate: "",
        killDate,
        dof,
        estHscw,
        dispatches: ds,
        status: allKilled ? "killed" : anyConfirmed ? "dispatched" : "active",
      } satisfies Lot;
    }).sort((a, b) => a.killDate.localeCompare(b.killDate));
  })();

  // ── Kill results: bookings that have est_avg_hscw filled & status high/confirmed ──
  const killResults = dispatches.filter(d =>
    d.est_avg_hscw && ["high", "confirmed", "killed"].includes(d.status ?? "")
  );

  // ── Compliance score ──
  const complianceScore = [nvdSigned, nlisTransferred, withholdingClear, animalsFasted].filter(Boolean).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center">
                <Leaf className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Muster Supplier</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              {profile?.display_name
                ? `Welcome back, ${profile.display_name}`
                : "Supplier dispatch portal"}{" "}
              — pre-advise livestock, track bookings and compliance
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut} className="shrink-0">
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Active dispatches",
              value: dispatches.filter(d => ["requested", "pending", "medium"].includes(d.status ?? "")).length,
              icon: Clock,
              cls: "text-amber-600",
            },
            {
              label: "Confirmed kills",
              value: dispatches.filter(d => ["confirmed", "high"].includes(d.status ?? "")).length,
              icon: CheckCircle,
              cls: "text-emerald-600",
            },
            {
              label: "Head this month",
              value: dispatches
                .filter(d => d.requested_kill_date?.startsWith(format(new Date(), "yyyy-MM")))
                .reduce((s, d) => s + (d.head_count ?? 0), 0)
                .toLocaleString(),
              icon: Package,
              cls: "text-blue-600",
            },
            {
              label: "Compliance score",
              value: `${complianceScore}/4`,
              icon: ShieldAlert,
              cls: complianceScore === 4 ? "text-emerald-600" : "text-amber-600",
            },
          ].map(stat => (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`h-4 w-4 ${stat.cls}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </Card>
          ))}
        </div>

        {/* Main tabs */}
        <Tabs defaultValue="dispatch" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-xl">
            <TabsTrigger value="dispatch" className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Dispatch</span>
            </TabsTrigger>
            <TabsTrigger value="lots" className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">My Lots</span>
            </TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Compliance</span>
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-1.5">
              <BarChart2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Kill Results</span>
            </TabsTrigger>
          </TabsList>

          {/* ── Dispatch Tab ──────────────────────────────────────────────── */}
          <TabsContent value="dispatch" className="space-y-4">

            {/* Availability grid */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Kill Slot Availability — Next 14 Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSlots ? (
                  <p className="text-sm text-muted-foreground animate-pulse">Checking availability…</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                    {slots.map(slot => {
                      const style = SLOT_STYLE[slot.status];
                      const pct   = slot.capacity > 0
                        ? Math.round((slot.totalBooked / slot.capacity) * 100)
                        : 0;
                      return (
                        <button
                          key={slot.date}
                          disabled={slot.status === "full"}
                          onClick={() => openDialog(slot.date)}
                          className={`rounded-lg border p-3 text-left space-y-1.5 transition-all ${style.card}`}
                        >
                          <p className="text-xs font-semibold text-foreground">{slot.label}</p>
                          <div className="w-full bg-white/60 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${style.bar}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium rounded px-1.5 py-0.5 ${style.badge}`}>
                            {style.label}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {slot.available.toLocaleString()} head free
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Click an available date to lodge a dispatch pre-advice. Processor will confirm within 1 business day.
                </p>
              </CardContent>
            </Card>

            {/* Recent dispatches */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  My Dispatches
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDispatches ? (
                  <p className="text-sm text-muted-foreground animate-pulse">Loading dispatches…</p>
                ) : dispatches.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <Truck className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      No dispatches yet — click a date above to send your first pre-advice.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dispatches.slice(0, 10).map(d => {
                      const meta = STATUS_META[d.status ?? ""] ?? {
                        label: d.status ?? "Unknown",
                        cls:   "bg-muted text-muted-foreground border-border",
                        icon:  ChevronRight,
                      };
                      const Icon = meta.icon;
                      return (
                        <div
                          key={d.id}
                          className="flex items-center gap-3 rounded-lg border px-4 py-3 bg-muted/20"
                        >
                          <Icon className={`h-5 w-5 shrink-0 ${
                            d.status === "confirmed" || d.status === "high" ? "text-emerald-500" :
                            d.status === "requested" || d.status === "pending" ? "text-amber-500" :
                            d.status === "cancelled" ? "text-red-500" : "text-muted-foreground"
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold capitalize">
                                {(d.head_count ?? 0).toLocaleString()} head {d.species}
                              </p>
                              <span className={`text-xs font-medium rounded-full border px-2 py-0.5 ${meta.cls}`}>
                                {meta.label}
                              </span>
                              {d.lot_id && (
                                <span className="text-xs bg-slate-100 text-slate-700 rounded px-1.5 py-0.5">
                                  Lot {d.lot_id}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Kill date:{" "}
                              {d.requested_kill_date
                                ? format(parseISO(d.requested_kill_date), "EEE d MMM yyyy")
                                : "—"}
                              {d.hgp_status && d.hgp_status !== "nil"
                                ? ` · HGP: ${d.hgp_status}`
                                : " · HGP free"}
                              {d.est_avg_live_wt
                                ? ` · ~${d.est_avg_live_wt} kg LW`
                                : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {dispatches.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center pt-1">
                        Showing 10 of {dispatches.length} dispatches
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* What happens next */}
            <Card className="border-teal-200 bg-teal-50/40">
              <CardContent className="pt-4 pb-4">
                <div className="flex gap-3">
                  <ArrowRight className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-teal-800">Dispatch workflow</p>
                    <ol className="text-xs text-teal-700 space-y-0.5 list-decimal list-inside">
                      <li>Submit pre-advice here with head count, PIC and compliance details</li>
                      <li>Processor confirms your slot (within 1 business day)</li>
                      <li>Arrange transport — animals arrive in your confirmed window</li>
                      <li>Intake team weighs and tallies on arrival</li>
                      <li>Kill results (HSCW, grading) appear in your Kill Results tab</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Lots Tab ──────────────────────────────────────────────────── */}
          <TabsContent value="lots" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    Lot Summary
                  </CardTitle>
                  <Button size="sm" onClick={() => openDialog(
                    format(addDays(startOfToday(), 7), "yyyy-MM-dd")
                  )}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    New dispatch
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {lots.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <Layers className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      No lots yet. Submit a dispatch with a Lot reference to group animals here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lots.map(lot => {
                      const statusCls =
                        lot.status === "killed"     ? "bg-purple-100 text-purple-800 border-purple-200" :
                        lot.status === "dispatched" ? "bg-blue-100 text-blue-800 border-blue-200" :
                                                      "bg-emerald-100 text-emerald-800 border-emerald-200";
                      const statusLabel =
                        lot.status === "killed"     ? "Processed" :
                        lot.status === "dispatched" ? "Confirmed" : "Active";
                      return (
                        <div key={lot.id} className="rounded-lg border bg-card p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm">
                                  {lot.id.startsWith("ADHOC-") ? "Ad-hoc dispatch" : `Lot ${lot.id}`}
                                </p>
                                <span className={`text-xs font-medium rounded-full border px-2 py-0.5 ${statusCls}`}>
                                  {statusLabel}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                                {lot.headIn.toLocaleString()} head {lot.species}
                                {lot.killDate ? ` · Kill ${format(parseISO(lot.killDate), "d MMM yyyy")}` : ""}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              {lot.dof > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  {lot.dof} days to kill
                                </p>
                              )}
                              {lot.estHscw && (
                                <p className="text-xs font-medium text-foreground">
                                  ~{lot.estHscw} kg HSCW
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Dispatch list within lot */}
                          {lot.dispatches.length > 0 && (
                            <>
                              <Separator />
                              <div className="space-y-1">
                                {lot.dispatches.map(d => {
                                  const meta = STATUS_META[d.status ?? ""] ?? {
                                    label: d.status ?? "Unknown",
                                    cls:   "bg-muted text-muted-foreground border-border",
                                  };
                                  return (
                                    <div key={d.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <div className={`h-1.5 w-1.5 rounded-full ${
                                        d.status === "confirmed" || d.status === "high" ? "bg-emerald-500" :
                                        d.status === "cancelled" ? "bg-red-400" : "bg-amber-400"
                                      }`} />
                                      <span>
                                        {(d.head_count ?? 0).toLocaleString()} head {d.species}
                                        {d.requested_kill_date
                                          ? ` — ${format(parseISO(d.requested_kill_date), "d MMM")}`
                                          : ""}
                                      </span>
                                      <span className={`ml-auto text-xs rounded-full border px-1.5 py-0 ${meta.cls}`}>
                                        {meta.label}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feedlot tip */}
            <Card className="border-blue-200 bg-blue-50/40">
              <CardContent className="pt-4 pb-4">
                <div className="flex gap-3">
                  <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Feedlot tip — use Lot references</p>
                    <p className="text-xs text-blue-700 mt-0.5">
                      When submitting a dispatch, enter your internal lot number in the "Lot / pen reference" field.
                      All dispatches from that lot will be grouped here so you can track head counts, kill dates and results across drafts.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Compliance Tab ────────────────────────────────────────────── */}
          <TabsContent value="compliance" className="space-y-4">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Pre-dispatch checklist */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                    Pre-dispatch Checklist
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <button
                    className="w-full text-left"
                    onClick={() => setNvdSigned(v => !v)}
                  >
                    <ComplianceRow
                      checked={nvdSigned}
                      label="NVD completed and signed"
                      detail="National Vendor Declaration — required for every consignment. Keep a copy."
                    />
                  </button>
                  <button
                    className="w-full text-left"
                    onClick={() => setNlisTransferred(v => !v)}
                  >
                    <ComplianceRow
                      checked={nlisTransferred}
                      label="NLIS transfer initiated"
                      detail="Transfer registered animals to the processor's PIC before departure."
                    />
                  </button>
                  <button
                    className="w-full text-left"
                    onClick={() => setWithholdingClear(v => !v)}
                  >
                    <ComplianceRow
                      checked={withholdingClear}
                      label="Withholding periods clear"
                      detail="All chemical treatments (drenches, dips, injections) must be past WHP."
                    />
                  </button>
                  <button
                    className="w-full text-left"
                    onClick={() => setAnimalsFasted(v => !v)}
                  >
                    <ComplianceRow
                      checked={animalsFasted}
                      label="Animals off feed (transit)"
                      detail="Typically 12–24 hrs off water before transport to reduce gut fill and bruising."
                    />
                  </button>

                  <Separator className="my-2" />

                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-foreground">Checklist progress</p>
                    <p className="text-xs text-muted-foreground">{complianceScore} / 4 complete</p>
                  </div>
                  <Progress value={complianceScore * 25} className="h-2" />

                  <p className="text-xs text-muted-foreground pt-1">
                    Click each item to mark it complete. This checklist is a local guide only — your processor may have additional requirements.
                  </p>
                </CardContent>
              </Card>

              {/* Withholding reference */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-primary" />
                    Withholding Period Guide
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { product: "Ivermectin pour-on (cattle)", whp: "28 days" },
                    { product: "Closantel (sheep — lamb)", whp: "28 days (meat)" },
                    { product: "Naphthalophos (sheep drench)", whp: "7 days" },
                    { product: "Monensin feed additive", whp: "5 days" },
                    { product: "Erythromycin (injection)", whp: "28 days" },
                    { product: "Oxytetracycline (LA)", whp: "21 days" },
                    { product: "Chlortetracycline (feed)", whp: "7 days" },
                    { product: "Albendazole (oral)", whp: "10 days" },
                  ].map(item => (
                    <div key={item.product} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                      <p className="text-xs text-foreground">{item.product}</p>
                      <Badge variant="outline" className="text-xs shrink-0 ml-2">{item.whp}</Badge>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground pt-2">
                    Always check the product label. This is a reference guide only — not a substitute for label instructions or veterinary advice.
                  </p>
                </CardContent>
              </Card>

              {/* NVD reminder */}
              <Card className="border-amber-200 bg-amber-50/40 md:col-span-2">
                <CardContent className="pt-4 pb-4">
                  <div className="flex gap-3">
                    <FileText className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-amber-800">NVD — National Vendor Declaration</p>
                      <p className="text-xs text-amber-700">
                        The NVD is a legal document. Supplying false or misleading information is an offence.
                        Complete it honestly and retain a copy for your records. The processor is required to
                        sight the NVD before accepting your consignment. Digital NVDs via the Integrity Systems
                        Company (ISC) eNVD platform are accepted at most processors.
                      </p>
                      <p className="text-xs text-amber-700 font-medium">
                        eNVD platform: integrity.animalhealthaustralia.com.au
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Kill Results Tab ──────────────────────────────────────────── */}
          <TabsContent value="results" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" />
                  Kill Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {killResults.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <BarChart2 className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Kill results will appear here once your consignments have been processed and data entered by the floor team.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {killResults.map(d => {
                      const dressingPct = d.est_avg_live_wt && d.est_avg_hscw
                        ? ((d.est_avg_hscw / d.est_avg_live_wt) * 100).toFixed(1)
                        : null;
                      return (
                        <div key={d.id} className="rounded-lg border bg-card p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-sm capitalize">
                                {(d.head_count ?? 0).toLocaleString()} head {d.species}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Kill date:{" "}
                                {d.requested_kill_date
                                  ? format(parseISO(d.requested_kill_date), "EEE d MMM yyyy")
                                  : "—"}
                                {d.lot_id ? ` · Lot ${d.lot_id}` : ""}
                              </p>
                            </div>
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200 shrink-0">
                              Results in
                            </Badge>
                          </div>

                          <Separator className="my-3" />

                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Avg HSCW</p>
                              <p className="text-lg font-bold text-foreground">{d.est_avg_hscw} kg</p>
                            </div>
                            {d.est_avg_live_wt && (
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Avg live wt</p>
                                <p className="text-lg font-bold text-foreground">{d.est_avg_live_wt} kg</p>
                              </div>
                            )}
                            {dressingPct && (
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Dressing %</p>
                                <p className={`text-lg font-bold ${parseFloat(dressingPct) >= 52 ? "text-emerald-600" : "text-amber-600"}`}>
                                  {dressingPct}%
                                </p>
                              </div>
                            )}
                          </div>

                          {(d.head_count && d.est_avg_hscw) && (
                            <div className="mt-3 rounded-md bg-muted/40 px-3 py-2 flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">Total estimated HSCW this consignment</p>
                              <p className="text-sm font-bold text-foreground">
                                {(d.head_count * d.est_avg_hscw).toLocaleString()} kg
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-slate-50/40">
              <CardContent className="pt-4 pb-4">
                <div className="flex gap-3">
                  <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600">
                    Kill data is entered by the processor's kill floor team after each kill run. Results typically appear within 24–48 hours of kill date.
                    Contact your account manager if results are overdue.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Dispatch Pre-advice Dialog ──────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              Dispatch Pre-advice
              {selectedDate && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  — {format(parseISO(selectedDate), "EEE d MMM yyyy")}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              Let the processor know what's coming. This pre-advice creates a booking request that ops will confirm.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">

            {/* Species + head count */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Species *</Label>
                <Select value={species} onValueChange={v => {
                  setSpecies(v);
                  if (v !== "sheep" && v !== "lamb") setMulesingStatus("na");
                  else if (mulesingStatus === "na") setMulesingStatus("nm");
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SPECIES_OPTIONS.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="headCount">Head count *</Label>
                <Input
                  id="headCount"
                  type="number"
                  min={1}
                  placeholder="e.g. 150"
                  value={headCount}
                  onChange={e => setHeadCount(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* PIC + NVD */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="picNumber">Property PIC *</Label>
                <Input
                  id="picNumber"
                  placeholder="e.g. QA123456"
                  value={picNumber}
                  onChange={e => setPicNumber(e.target.value.toUpperCase())}
                  required
                />
                <p className="text-xs text-muted-foreground">Required for NLIS</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nvdNumber">NVD / eNVD number</Label>
                <Input
                  id="nvdNumber"
                  placeholder="e.g. eNVD-123456"
                  value={nvdNumber}
                  onChange={e => setNvdNumber(e.target.value)}
                />
              </div>
            </div>

            {/* HGP + mulesing (sheep only) */}
            <div className={`grid gap-3 ${species === "sheep" || species === "lamb" ? "grid-cols-2" : "grid-cols-1"}`}>
              <div className="space-y-1.5">
                <Label>HGP status *</Label>
                <Select value={hgpStatus} onValueChange={setHgpStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HGP_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(species === "sheep" || species === "lamb") && (
                <div className="space-y-1.5">
                  <Label>Mulesing status</Label>
                  <Select value={mulesingStatus} onValueChange={setMulesingStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MULESING_OPTIONS.filter(o => o.value !== "na").map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Est live weight + lot ref */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="estLiveWt">Est. avg live weight (kg)</Label>
                <Input
                  id="estLiveWt"
                  type="number"
                  min={1}
                  placeholder={species === "cattle" ? "e.g. 580" : "e.g. 48"}
                  value={estimatedLiveWt}
                  onChange={e => setEstimatedLiveWt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lotRef">Lot / pen reference</Label>
                <Input
                  id="lotRef"
                  placeholder="e.g. LOT-24-B or Pen 7"
                  value={lotRef}
                  onChange={e => setLotRef(e.target.value)}
                />
              </div>
            </div>

            {/* Transport */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="carrierName">Carrier / transport co.</Label>
                <Input
                  id="carrierName"
                  placeholder="e.g. Burns Transport"
                  value={carrierName}
                  onChange={e => setCarrierName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vehicleRego">Vehicle rego (if known)</Label>
                <Input
                  id="vehicleRego"
                  placeholder="e.g. 123 ABC"
                  value={vehicleRego}
                  onChange={e => setVehicleRego(e.target.value.toUpperCase())}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Additional notes</Label>
              <Textarea
                id="notes"
                placeholder="e.g. Mixed age, some dry cows, delivering from Roma — expect arrival ~7am"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? "Sending pre-advice…" : "Send pre-advice"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
