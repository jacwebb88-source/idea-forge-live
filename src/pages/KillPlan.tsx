import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  transport_status: string | null;
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

export default function KillPlan() {
  const [weekStart, setWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [speciesFilter, setSpeciesFilter] = useState<string>("all");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [suppliers, setSuppliers] = useState<Record<string, string>>({});
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showLegend, setShowLegend] = useState(false);

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
            "id, species, head_count, requested_kill_date, status, supplier_id, plant_id, fill_rate, lot_id, agent_ref, slot_time, transport_status"
          )
          .gte("requested_kill_date", startStr)
          .lte("requested_kill_date", endStr),
        supabase
          .from("day_plans")
          .select("id, date, species, planned_head, plant_id")
          .gte("date", startStr)
          .lte("date", endStr),
      ]);

      const bookingList = (bks as Booking[]) || [];
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
      setLoading(false);
    };
    load();
  }, [weekStart, weekEnd]);

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
            <h1 className="text-3xl font-bold text-foreground">Kill Plan</h1>
            <p className="text-muted-foreground">
              Weekly scheduling view — capacity, confidence &amp; overschedule alerts
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
              <CardTitle className="text-sm text-muted-foreground font-medium">Total head booked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBooked.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Total capacity</CardTitle>
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
          <Card className={overCapacityDays > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1">
                {overCapacityDays > 0 && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                Over capacity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${overCapacityDays > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {overCapacityDays} {overCapacityDays === 1 ? "day" : "days"}
              </div>
              {placeholderCount > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{placeholderCount} placeholder{placeholderCount !== 1 ? "s" : ""} to confirm</p>
              )}
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

            return (
              <Card
                key={day.toISOString()}
                className={`flex flex-col ${isOver ? "ring-2 ring-destructive/70 border-destructive/50" : ""}`}
              >
                <CardHeader className="pb-3">
                  {/* Day header */}
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-semibold flex flex-col">
                      <span>{format(day, "EEEE")}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        {format(day, "d MMM")}
                      </span>
                    </CardTitle>
                    {isOver && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-destructive bg-destructive/10 rounded px-1.5 py-0.5">
                        <AlertTriangle className="h-3 w-3" />
                        OVER
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
                        +{(booked - planned).toLocaleString()} over capacity
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
                        {/* Confidence badge */}
                        <div className="mt-1.5">
                          <ConfidenceBadge status={b.status} />
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

      {/* ── Booking detail dialog ── */}
      <Dialog
        open={!!selectedBooking}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Booking details</DialogTitle>
            <DialogDescription>
              Ref: {selectedBooking?.id.slice(-8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-3 text-sm">
              {/* Confidence banner */}
              <div className={`rounded-md px-3 py-2 flex items-center justify-between ${confidenceCardStyle(selectedBooking.status)}`}>
                <span className="text-xs font-medium text-muted-foreground">Confidence level</span>
                <ConfidenceBadge status={selectedBooking.status} />
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Supplier</p>
                  <p className="font-medium">{suppliers[selectedBooking.supplier_id || ""] || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Species</p>
                  <p className="capitalize">{selectedBooking.species || "—"}</p>
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
                  <p className="text-xs text-muted-foreground">Slot time</p>
                  <p>{selectedBooking.slot_time || "—"}</p>
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
                  <p className="text-xs text-muted-foreground">Agent ref</p>
                  <p>{selectedBooking.agent_ref || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fill rate</p>
                  <p>{selectedBooking.fill_rate != null
                    ? `${selectedBooking.fill_rate.toFixed(1)}%`
                    : "—"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
