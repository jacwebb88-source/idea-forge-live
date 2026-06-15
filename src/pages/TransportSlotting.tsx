import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, AlertTriangle, Calendar, CheckCircle, Clock, RefreshCcw, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, addDays } from "date-fns";

type BookingTransport = {
  id: string;
  species: string | null;
  head_count: number | null;
  requested_kill_date: string | null;
  arrival_slot: string | null;
  transport_status: string | null;
  status: string | null;
  supplier_id: string | null;
  supplierName?: string;
  hgp_status: string | null;
};

type SlotConflict = {
  slot_id: string | null;
  window_start_dt: string | null;
  window_end_dt: string | null;
  species: string | null;
  assigned_loads: number | null;
  max_truck_loads: number | null;
  is_conflict: boolean | null;
};

const transportStatusColour = (s: string | null) => {
  switch ((s || "").toLowerCase()) {
    case "confirmed":    return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "arranged":     return "bg-blue-50 text-blue-700 border-blue-200";
    case "arrived":      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "in_transit":   return "bg-cyan-50 text-cyan-700 border-cyan-200";
    case "not_required": return "bg-gray-50 text-gray-600 border-gray-200";
    case "pending":      return "bg-amber-50 text-amber-700 border-amber-200";
    default:             return "bg-gray-50 text-gray-500 border-gray-200";
  }
};

const getStatusBadge = (s: string | null) => (
  <span className={`text-xs font-medium border rounded px-2 py-0.5 capitalize ${transportStatusColour(s)}`}>
    {s || "Not set"}
  </span>
);

export default function TransportSlotting() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<BookingTransport[]>([]);
  const [slotConflicts, setSlotConflicts] = useState<SlotConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingConflicts, setLoadingConflicts] = useState(true);
  const [speciesFilter, setSpeciesFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setLoadingConflicts(true);

    const today = format(new Date(), "yyyy-MM-dd");
    const cutoff = format(addDays(new Date(), 21), "yyyy-MM-dd");

    const [{ data: bks }, { data: conflicts }] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, species, head_count, requested_kill_date, arrival_slot, transport_status, status, supplier_id, hgp_status")
        .gte("requested_kill_date", today)
        .lte("requested_kill_date", cutoff)
        .neq("status", "cancelled")
        .order("requested_kill_date", { ascending: true })
        .order("arrival_slot", { ascending: true }),
      (supabase as any)
        .from("slot_conflicts")
        .select("*")
        .order("window_start_dt", { ascending: true }),
    ]);

    const rawBks = (bks || []) as BookingTransport[];

    // Enrich with supplier names
    const supplierIds = Array.from(new Set(rawBks.map(b => b.supplier_id).filter(Boolean))) as string[];
    let supplierMap: Record<string, string> = {};
    if (supplierIds.length > 0) {
      const { data: sups } = await supabase
        .from("suppliers")
        .select("id, name")
        .in("id", supplierIds);
      (sups || []).forEach((s: any) => (supplierMap[s.id] = s.name));
    }

    setBookings(rawBks.map(b => ({
      ...b,
      supplierName: b.supplier_id ? (supplierMap[b.supplier_id] || "") : undefined,
    })));
    setSlotConflicts((conflicts || []) as SlotConflict[]);
    setLoading(false);
    setLoadingConflicts(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updateTransportStatus = async (bookingId: string, newStatus: string) => {
    setUpdatingId(bookingId);
    const { error } = await supabase
      .from("bookings")
      .update({ transport_status: newStatus })
      .eq("id", bookingId);

    if (error) {
      toast({ title: "Error updating transport", description: error.message, variant: "destructive" });
    } else {
      setBookings(prev => prev.map(b =>
        b.id === bookingId ? { ...b, transport_status: newStatus } : b
      ));
      toast({ title: "Transport status updated", description: `Marked as ${newStatus}` });
    }
    setUpdatingId(null);
  };

  const filteredBookings = bookings.filter(b => {
    const matchSpecies = speciesFilter === "all" || (b.species || "").toLowerCase() === speciesFilter;
    const matchStatus = statusFilter === "all" ||
      (statusFilter === "needs_arranging" && (!b.transport_status || b.transport_status === "pending")) ||
      (statusFilter !== "needs_arranging" && b.transport_status === statusFilter);
    return matchSpecies && matchStatus;
  });

  const filteredConflicts = slotConflicts.filter(c =>
    speciesFilter === "all" || (c.species || "").toLowerCase() === speciesFilter
  );

  // Summary counts
  const needsArranging = bookings.filter(b => !b.transport_status || b.transport_status === "pending" || b.transport_status === "tbc").length;
  const arranged  = bookings.filter(b => b.transport_status === "arranged").length;
  const confirmed = bookings.filter(b => b.transport_status === "confirmed").length;
  const arrived   = bookings.filter(b => b.transport_status === "arrived").length;
  const conflictCount = slotConflicts.filter(c => c.is_conflict).length;

  const formatDT = (dt: string | null) => {
    if (!dt) return "—";
    return new Date(dt).toLocaleString("en-AU", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Transport Slotting</h1>
            <p className="text-muted-foreground mt-1">Assign transport to confirmed bookings and manage pickup schedules</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchData}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className={needsArranging > 0 ? "border-amber-200" : ""}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Needs arranging</p>
                  <p className="text-2xl font-bold leading-tight">{loading ? "—" : needsArranging}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <Truck className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Arranged</p>
                  <p className="text-2xl font-bold leading-tight">{loading ? "—" : arranged}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Confirmed</p>
                  <p className="text-2xl font-bold leading-tight">{loading ? "—" : confirmed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                  <MapPin className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Arrived</p>
                  <p className="text-2xl font-bold leading-tight">{loading ? "—" : arrived}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className={conflictCount > 0 ? "border-destructive/50" : ""}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Slot conflicts</p>
                  <p className="text-2xl font-bold leading-tight">{loadingConflicts ? "—" : conflictCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All species" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All species</SelectItem>
              <SelectItem value="beef">Beef / Cattle</SelectItem>
              <SelectItem value="lamb">Lamb</SelectItem>
              <SelectItem value="sheep">Sheep</SelectItem>
              <SelectItem value="goat">Goat</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All transport statuses</SelectItem>
              <SelectItem value="needs_arranging">Needs arranging</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="arranged">Arranged</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="arrived">Arrived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Upcoming bookings — transport management */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Upcoming bookings — transport status
              {!loading && (
                <span className="ml-auto text-sm font-normal text-muted-foreground">
                  {filteredBookings.length} of {bookings.length} shown
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground animate-pulse py-8 text-center">
                Loading upcoming bookings…
              </p>
            ) : filteredBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center italic">
                No upcoming bookings in the next 21 days.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Kill Date</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Vendor</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Species</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Head</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Slot</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">HGP</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Transport</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map(b => {
                      const isUrgent = !b.transport_status || b.transport_status === "pending" || b.transport_status === "tbc";
                      return (
                        <tr
                          key={b.id}
                          className={`border-b border-border/50 ${isUrgent ? "bg-amber-50/30 dark:bg-amber-950/10" : ""}`}
                        >
                          <td className="py-2 px-3 font-medium">
                            {b.requested_kill_date
                              ? format(parseISO(b.requested_kill_date), "EEE d MMM")
                              : "—"}
                          </td>
                          <td className="py-2 px-3 max-w-[160px] truncate" title={b.supplierName}>
                            {b.supplierName || <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="py-2 px-3 capitalize text-muted-foreground">
                            {b.species || "—"}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold">
                            {(b.head_count || 0).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-muted-foreground text-xs">
                            {b.arrival_slot || "—"}
                          </td>
                          <td className="py-2 px-3">
                            {b.hgp_status === "nil" ? (
                              <span className="text-xs text-emerald-700">No HGP</span>
                            ) : b.hgp_status === "implanted" ? (
                              <span className="text-xs text-amber-700 font-semibold">HGP ⚠</span>
                            ) : b.hgp_status === "under_withholding" ? (
                              <span className="text-xs text-orange-700 font-semibold">HGP–W/D ⚠</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {getStatusBadge(b.transport_status)}
                          </td>
                          <td className="py-2 px-3">
                            <Select
                              value={b.transport_status || ""}
                              onValueChange={v => updateTransportStatus(b.id, v)}
                              disabled={updatingId === b.id}
                            >
                              <SelectTrigger className="h-7 w-32 text-xs">
                                <SelectValue placeholder="Set status" />
                              </SelectTrigger>
                              <SelectContent className="bg-popover z-50">
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="arranged">Arranged</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="in_transit">In Transit</SelectItem>
                                <SelectItem value="arrived">Arrived</SelectItem>
                                <SelectItem value="not_required">Not Required</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Slot conflicts (from transport_slots view) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              Slot capacity conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingConflicts ? (
              <p className="text-sm text-muted-foreground animate-pulse py-6 text-center">
                Loading conflicts…
              </p>
            ) : filteredConflicts.length === 0 ? (
              <div className="py-6 text-center">
                <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No slot conflicts — all clear.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Window start</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Window end</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Species</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Loads</th>
                      <th className="text-right py-2 px-3 font-medium text-muted-foreground">Max</th>
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                      <th className="py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredConflicts.map((c, idx) => (
                      <tr
                        key={c.slot_id || idx}
                        className={`border-b border-border/50 ${c.is_conflict ? "bg-destructive/5" : ""}`}
                      >
                        <td className="py-2 px-3 font-mono text-xs">{formatDT(c.window_start_dt)}</td>
                        <td className="py-2 px-3 font-mono text-xs">{formatDT(c.window_end_dt)}</td>
                        <td className="py-2 px-3 capitalize text-muted-foreground">{c.species || "—"}</td>
                        <td className="py-2 px-3 text-right font-semibold">{c.assigned_loads ?? "—"}</td>
                        <td className="py-2 px-3 text-right text-muted-foreground">{c.max_truck_loads ?? "—"}</td>
                        <td className="py-2 px-3">
                          {c.is_conflict ? (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              Conflict
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-600 flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5" />
                              OK
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {c.is_conflict && (
                            <a
                              href="/kill-plan"
                              className="text-xs font-semibold text-primary underline whitespace-nowrap"
                            >
                              Reschedule →
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
