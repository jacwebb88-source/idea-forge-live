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
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
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
};

type Supplier = { id: string; name: string };
type DayPlan = {
  id: string;
  date: string;
  species: string;
  planned_head: number;
  plant_id: string | null;
};

const statusVariant = (status: string | null) => {
  switch ((status || "").toLowerCase()) {
    case "confirmed":
      return "confirmed" as const;
    case "placeholder":
    case "requested":
    case "pending":
      return "requested" as const;
    case "cancelled":
      return "cancelled" as const;
    default:
      return "secondary" as const;
  }
};

const capacityColor = (pct: number) => {
  if (pct > 95) return "bg-destructive";
  if (pct >= 80) return "bg-amber-500";
  return "bg-emerald-500";
};

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

  const weekEnd = useMemo(() => endOfWeek(weekStart, { weekStartsOn: 1 }), [weekStart]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const startStr = format(weekStart, "yyyy-MM-dd");
      const endStr = format(weekEnd, "yyyy-MM-dd");

      const [{ data: bks }, { data: dps }] = await Promise.all([
        supabase
          .from("bookings")
          .select(
            "id, species, head_count, requested_kill_date, status, supplier_id, plant_id, fill_rate, lot_id, agent_ref"
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

  const matchesSpecies = (s: string | null) => {
    if (speciesFilter === "all") return true;
    const v = (s || "").toLowerCase();
    if (speciesFilter === "cattle") return v === "cattle" || v === "beef";
    return v === speciesFilter;
  };

  const filteredBookings = bookings.filter((b) => matchesSpecies(b.species));

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

  const totalBooked = filteredBookings.reduce(
    (sum, b) => sum + (b.head_count || 0),
    0
  );
  const totalPlanned = dayPlans
    .filter((p) => matchesSpecies(p.species))
    .reduce((sum, p) => sum + (p.planned_head || 0), 0);
  const fillRate = totalPlanned > 0 ? (totalBooked / totalPlanned) * 100 : 0;
  const placeholderCount = filteredBookings.filter(
    (b) => (b.status || "").toLowerCase() === "placeholder"
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Kill Plan</h1>
            <p className="text-muted-foreground">
              Weekly scheduling view across all bookings and capacity
            </p>
          </div>
          <div className="flex items-center gap-2">
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
              onClick={() =>
                setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
              }
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
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">
                Total head booked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBooked.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">
                Total capacity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPlanned.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">
                Fill rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fillRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">
                Placeholders to confirm
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{placeholderCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Week grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
          {days.map((day) => {
            const dayBookings = bookingsForDay(day);
            const planned = plannedForDay(day);
            const booked = dayBookings.reduce(
              (sum, b) => sum + (b.head_count || 0),
              0
            );
            const pct = planned > 0 ? (booked / planned) * 100 : booked > 0 ? 101 : 0;
            const barWidth = Math.min(pct, 100);

            return (
              <Card key={day.toISOString()} className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex flex-col">
                    <span>{format(day, "EEEE")}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {format(day, "d MMM")}
                    </span>
                  </CardTitle>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>
                        {booked} / {planned || "—"}
                      </span>
                      <span>{planned > 0 ? `${pct.toFixed(0)}%` : ""}</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full ${capacityColor(pct)} transition-all`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-2 pt-0">
                  {loading ? (
                    <div className="text-xs text-muted-foreground">Loading…</div>
                  ) : dayBookings.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic">
                      No bookings
                    </div>
                  ) : (
                    dayBookings.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => setSelectedBooking(b)}
                        className="w-full text-left p-2 rounded-md border border-border hover:bg-accent transition-colors"
                      >
                        <div className="text-sm font-medium truncate">
                          {suppliers[b.supplier_id || ""] || "Unknown supplier"}
                        </div>
                        <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                          <span>{b.head_count ?? 0} head</span>
                          <span className="capitalize">{b.species || "—"}</span>
                        </div>
                        <div className="mt-1">
                          <Badge variant={statusVariant(b.status)} className="text-xs">
                            {b.status || "unknown"}
                          </Badge>
                        </div>
                      </button>
                    ))
                  )}
                </CardContent>
                <div className="border-t border-border px-4 py-2 text-xs flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold">{booked} head</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog
        open={!!selectedBooking}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Booking details</DialogTitle>
            <DialogDescription>
              {selectedBooking?.id.slice(-8)}
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Supplier</span>
                <span className="font-medium">
                  {suppliers[selectedBooking.supplier_id || ""] || "Unknown"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Species</span>
                <span className="capitalize">{selectedBooking.species || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Head count</span>
                <span>{selectedBooking.head_count ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kill date</span>
                <span>
                  {selectedBooking.requested_kill_date
                    ? format(parseISO(selectedBooking.requested_kill_date), "d MMM yyyy")
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={statusVariant(selectedBooking.status)}>
                  {selectedBooking.status || "unknown"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lot ID</span>
                <span>{selectedBooking.lot_id || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Agent ref</span>
                <span>{selectedBooking.agent_ref || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fill rate</span>
                <span>
                  {selectedBooking.fill_rate != null
                    ? `${selectedBooking.fill_rate.toFixed(1)}%`
                    : "—"}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
