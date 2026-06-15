import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Search, Calendar, MapPin, FileText, Plus, Loader2, CheckCircle2, CheckCircle, Truck, Scale, PenLine, Hammer, Package } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

type IntakeEvent = {
  id: string;
  booking_id: string | null;
  event_type: string | null;
  location: string | null;
  notes: string | null;
  timestamp: string;
  // enriched
  species?: string | null;
  head_count?: number | null;
  supplier_name?: string;
  kill_date?: string | null;
  booking_status?: string | null;
};

type TodayBooking = {
  id: string;
  supplier_id: string | null;
  supplier_name: string;
  species: string | null;
  head_count: number | null;
  status: string | null;
  arrival_slot: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EVENT_TYPES = [
  { value: "arrived",    label: "Arrived",    icon: Truck,      colour: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "weighed",    label: "Weighed",    icon: Scale,      colour: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "lairaged",   label: "Lairaged",   icon: Package,    colour: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "penned",     label: "Penned",     icon: PenLine,    colour: "bg-violet-50 text-violet-700 border-violet-200" },
  { value: "killed",     label: "Killed",     icon: Hammer,     colour: "bg-gray-50 text-gray-700 border-gray-200" },
  { value: "dispatched", label: "Dispatched", icon: CheckCircle2, colour: "bg-purple-50 text-purple-700 border-purple-200" },
] as const;

const eventTypeStyle = (t: string | null): string => {
  return EVENT_TYPES.find(e => e.value === t)?.colour
    ?? "bg-muted text-muted-foreground border-border";
};

const LOCATIONS = [
  "Receiving bay 1",
  "Receiving bay 2",
  "Receiving bay 3",
  "Lairage pen A",
  "Lairage pen B",
  "Lairage pen C",
  "Scales",
  "Holding yard",
  "Kill floor",
  "Chiller 1",
  "Chiller 2",
  "Dispatch bay",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function IntakeStatus() {
  const { toast } = useToast();

  // Event log state
  const [events, setEvents]       = useState<IntakeEvent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [dateRange, setDateRange] = useState("7");

  // Today's bookings for the log-event panel
  const [todayBookings, setTodayBookings] = useState<TodayBooking[]>([]);
  const [loadingToday, setLoadingToday]   = useState(false);

  // Log-event form state
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [logBookingId, setLogBookingId] = useState("");
  const [logEventType, setLogEventType] = useState("");
  const [logLocation, setLogLocation]   = useState("");
  const [logNotes, setLogNotes]         = useState("");
  const [logActualHead, setLogActualHead] = useState("");
  const [saving, setSaving]             = useState(false);

  // ── Fetch today's bookings ─────────────────────────────────────────────────
  useEffect(() => {
    const fetchToday = async () => {
      setLoadingToday(true);
      const today = format(new Date(), "yyyy-MM-dd");

      const { data: bks } = await supabase
        .from("bookings")
        .select("id, supplier_id, species, head_count, status, arrival_slot")
        .eq("requested_kill_date", today)
        .neq("status", "cancelled")
        .order("arrival_slot", { ascending: true });

      if (!bks || bks.length === 0) {
        setTodayBookings([]);
        setLoadingToday(false);
        return;
      }

      const supIds = [...new Set((bks as any[]).map(b => b.supplier_id).filter(Boolean))] as string[];
      let supMap: Record<string, string> = {};
      if (supIds.length > 0) {
        const { data: sups } = await supabase.from("suppliers").select("id, name").in("id", supIds);
        (sups as any[] || []).forEach(s => (supMap[s.id] = s.name));
      }

      setTodayBookings((bks as any[]).map(b => ({
        ...b,
        supplier_name: supMap[b.supplier_id] || "",
      })));
      setLoadingToday(false);
    };
    fetchToday();
  }, []);

  // ── Fetch event log ────────────────────────────────────────────────────────
  const fetchEvents = async () => {
    setLoading(true);
    const since = format(
      new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000),
      "yyyy-MM-dd"
    );

    const { data: evData } = await supabase
      .from("intake_events")
      .select("*")
      .gte("timestamp", since)
      .order("timestamp", { ascending: false })
      .limit(150);

    if (!evData || evData.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const bookingIds = [...new Set((evData as any[]).map(e => e.booking_id).filter(Boolean))] as string[];

    let bookingMap: Record<string, any> = {};
    if (bookingIds.length > 0) {
      const { data: bks } = await supabase
        .from("bookings")
        .select("id, species, head_count, status, requested_kill_date, supplier_id")
        .in("id", bookingIds);

      const supplierIds = [...new Set((bks as any[] || []).map(b => b.supplier_id).filter(Boolean))] as string[];
      let supplierMap: Record<string, string> = {};
      if (supplierIds.length > 0) {
        const { data: sups } = await supabase.from("suppliers").select("id, name").in("id", supplierIds);
        (sups as any[] || []).forEach(s => (supplierMap[s.id] = s.name));
      }
      (bks as any[] || []).forEach(b => {
        bookingMap[b.id] = { ...b, supplier_name: supplierMap[b.supplier_id] || "Unknown" };
      });
    }

    setEvents((evData as any[]).map(e => ({
      ...e,
      species:        bookingMap[e.booking_id]?.species,
      head_count:     bookingMap[e.booking_id]?.head_count,
      supplier_name:  bookingMap[e.booking_id]?.supplier_name,
      kill_date:      bookingMap[e.booking_id]?.requested_kill_date,
      booking_status: bookingMap[e.booking_id]?.status,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, [dateRange]);

  // ── Log new event ──────────────────────────────────────────────────────────
  const handleLogEvent = async () => {
    if (!logBookingId || !logEventType) {
      toast({ title: "Missing fields", description: "Select a booking and event type.", variant: "destructive" });
      return;
    }
    setSaving(true);

    const bookingForLog = todayBookings.find(b => b.id === logBookingId);
    const bookedHead = bookingForLog?.head_count || 0;
    const actualHead = logActualHead ? parseInt(logActualHead) : null;
    const headMismatch = actualHead !== null && actualHead !== bookedHead
      ? ` | Actual head: ${actualHead} (booked: ${bookedHead}, diff: ${actualHead - bookedHead})`
      : actualHead !== null ? ` | Head confirmed: ${actualHead}` : "";
    const finalNotes = logNotes
      ? logNotes + headMismatch
      : headMismatch ? headMismatch.replace(" | ", "").trim() : null;

    const { error } = await supabase.from("intake_events").insert({
      booking_id: logBookingId,
      event_type: logEventType,
      location:   logLocation || null,
      notes:      finalNotes  || null,
      timestamp:  new Date().toISOString(),
    });

    if (error) {
      toast({ title: "Error logging event", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const eventLabel = EVENT_TYPES.find(e => e.value === logEventType)?.label || logEventType;
    const mismatch = actualHead !== null && actualHead !== (bookingForLog?.head_count || 0);
    toast({
      title: mismatch
        ? `${eventLabel} logged — head count mismatch`
        : `${eventLabel} logged`,
      description: mismatch
        ? `Booked ${(bookingForLog?.head_count || 0).toLocaleString()} — arrived ${actualHead?.toLocaleString()}. Shortfall of ${Math.abs(actualHead! - (bookingForLog?.head_count || 0))} head.`
        : `${bookingForLog?.supplier_name || "Booking"} — ${(bookingForLog?.head_count || 0).toLocaleString()} head`,
      variant: mismatch ? "destructive" : "default",
    });

    // Reset form but keep booking selected for quick follow-up events
    setLogEventType("");
    setLogNotes("");
    setLogActualHead("");
    setSaving(false);
    fetchEvents(); // refresh log
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const uniqueEventTypes = [...new Set(events.map(e => e.event_type).filter(Boolean))] as string[];

  const filtered = events.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (e.supplier_name || "").toLowerCase().includes(q) ||
      (e.location      || "").toLowerCase().includes(q) ||
      (e.notes         || "").toLowerCase().includes(q) ||
      (e.booking_id    || "").toLowerCase().includes(q);
    const matchType = eventFilter === "all" || e.event_type === eventFilter;
    return matchSearch && matchType;
  });

  const arrivedToday = events.filter(e =>
    e.event_type === "arrived" &&
    e.timestamp &&
    format(parseISO(e.timestamp), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  ).length;

  const uniqueBookings = new Set(filtered.map(e => e.booking_id).filter(Boolean)).size;

  const selectedBookingForLog = todayBookings.find(b => b.id === logBookingId);

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Intake Status</h1>
            <p className="text-muted-foreground mt-1">Live intake feed — monitor arrivals, lairage status and pre-slaughter checks</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="1">Today</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => setShowLogPanel(v => !v)}
              variant={showLogPanel ? "default" : "outline"}
            >
              <Plus className="h-4 w-4 mr-2" />
              Log event
            </Button>
          </div>
        </div>

        <div className={`grid gap-6 ${showLogPanel ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"}`}>

          {/* ── Log-event panel ─────────────────────────────────────────────── */}
          {showLogPanel && (
            <div className="lg:col-span-1 space-y-4">
              <Card className="border-primary/30 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" />
                    Log intake event
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Records to today's live event log. Timestamp is set automatically.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* Booking selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Booking (today's kill)</Label>
                    {loadingToday ? (
                      <div className="text-xs text-muted-foreground animate-pulse py-2">Loading today's bookings…</div>
                    ) : todayBookings.length === 0 ? (
                      <div className="text-xs text-muted-foreground italic py-2">No bookings scheduled for today</div>
                    ) : (
                      <Select value={logBookingId} onValueChange={setLogBookingId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select booking…" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover z-50">
                          {todayBookings.map(b => (
                            <SelectItem key={b.id} value={b.id}>
                              <span className="font-medium">{b.supplier_name}</span>
                              <span className="text-muted-foreground ml-1.5 text-xs">
                                {(b.head_count || 0).toLocaleString()} {b.species}
                                {b.arrival_slot ? ` · ${b.arrival_slot}` : ""}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Quick booking summary */}
                    {selectedBookingForLog && (
                      <div className="rounded-md bg-muted/40 border px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                        <div className="flex justify-between">
                          <span>{selectedBookingForLog.supplier_name}</span>
                          <span className="font-medium text-foreground">
                            {(selectedBookingForLog.head_count || 0).toLocaleString()} head
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="capitalize">{selectedBookingForLog.species || "—"}</span>
                          <span className="capitalize">{selectedBookingForLog.status || "—"}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Event type — big tap targets */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Event type</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {EVENT_TYPES.map(({ value, label, icon: Icon, colour }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setLogEventType(value)}
                          className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-all ${
                            logEventType === value
                              ? `${colour} ring-2 ring-offset-1 ring-current`
                              : "bg-background hover:bg-muted border-border text-foreground"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5 shrink-0" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actual head count — shown when event is "arrived" or "weighed" */}
                  {(logEventType === "arrived" || logEventType === "weighed") && selectedBookingForLog && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">
                        Actual head count on arrival
                        <span className="font-normal text-muted-foreground ml-1">(booked: {(selectedBookingForLog.head_count || 0).toLocaleString()})</span>
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder={`Expected ${selectedBookingForLog.head_count || 0}`}
                        value={logActualHead}
                        onChange={e => setLogActualHead(e.target.value)}
                        className="text-sm"
                      />
                      {/* Mismatch warning */}
                      {logActualHead && selectedBookingForLog.head_count && (() => {
                        const actual = parseInt(logActualHead);
                        const booked = selectedBookingForLog.head_count || 0;
                        const diff = actual - booked;
                        const pct = Math.abs(diff / booked * 100);
                        if (Math.abs(diff) === 0) return (
                          <p className="text-xs text-emerald-700 flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5" /> Head count matches booking
                          </p>
                        );
                        return (
                          <div className={`rounded-md px-3 py-2 text-xs border ${diff < 0 ? "bg-red-50 border-red-200 text-red-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
                            <p className="font-semibold">
                              {diff < 0
                                ? `⚠ Short by ${Math.abs(diff)} head (${pct.toFixed(0)}% shortfall)`
                                : `${diff} extra head above booking`}
                            </p>
                            <p className="mt-0.5">
                              {diff < 0
                                ? "Note in the Notes field below — procurement will need to be notified."
                                : "Confirm with supplier whether additional head are authorised."}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Location */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Location <span className="font-normal text-muted-foreground">(optional)</span></Label>
                    <Select value={logLocation} onValueChange={setLogLocation}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location…" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="">No location</SelectItem>
                        {LOCATIONS.map(l => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
                    <Textarea
                      placeholder="e.g. NLIS mob scan complete, 2 head lame on arrival…"
                      value={logNotes}
                      onChange={e => setLogNotes(e.target.value)}
                      className="min-h-[72px] resize-none text-sm"
                    />
                  </div>

                  {/* Submit */}
                  <Button
                    className="w-full"
                    onClick={handleLogEvent}
                    disabled={saving || !logBookingId || !logEventType}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Logging…
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Log {logEventType ? EVENT_TYPES.find(e => e.value === logEventType)?.label : "event"}
                      </>
                    )}
                  </Button>

                  {/* Timestamp note */}
                  <p className="text-xs text-center text-muted-foreground">
                    Timestamp: {format(new Date(), "HH:mm")} · {format(new Date(), "d MMM yyyy")}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Right panel: summary + log ────────────────────────────────── */}
          <div className={`space-y-5 ${showLogPanel ? "lg:col-span-2" : ""}`}>

            {/* Summary strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Events (filtered)</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{loading ? "—" : filtered.length}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Arrivals today</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-emerald-600">{loading ? "—" : arrivedToday}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Bookings with events</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{loading ? "—" : uniqueBookings}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Event types</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{loading ? "—" : uniqueEventTypes.length}</div></CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by supplier, location, booking…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All event types" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All event types</SelectItem>
                  {EVENT_TYPES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Event log */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {loading ? "Loading…" : `${filtered.length} event${filtered.length !== 1 ? "s" : ""}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-muted-foreground animate-pulse py-8 text-center">Loading intake events…</p>
                ) : filtered.length === 0 ? (
                  <div className="py-10 text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No intake events in this period.</p>
                    <p className="text-xs text-muted-foreground mt-1">Use "Log event" to record arrivals, weighing, lairage and kills.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map(e => (
                      <div key={e.id} className="flex items-start gap-4 rounded-md border border-border bg-muted/20 px-4 py-3">

                        {/* Event badge */}
                        <span className={`shrink-0 text-xs font-semibold border rounded px-2 py-1 capitalize min-w-[84px] text-center mt-0.5 ${eventTypeStyle(e.event_type)}`}>
                          {e.event_type || "—"}
                        </span>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-foreground">
                              {e.supplier_name || "Unknown vendor"}
                            </span>
                            {e.species && (
                              <span className="text-xs text-muted-foreground capitalize">{e.species}</span>
                            )}
                            {e.head_count && (
                              <span className="text-xs text-muted-foreground">{e.head_count.toLocaleString()} head</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-wrap mt-1">
                            {e.booking_id && (
                              <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {e.booking_id.slice(-8).toUpperCase()}
                              </span>
                            )}
                            {e.location && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {e.location}
                              </span>
                            )}
                            {e.kill_date && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Kill {format(parseISO(e.kill_date), "d MMM")}
                              </span>
                            )}
                          </div>
                          {e.notes && (
                            <p className="text-xs text-muted-foreground italic mt-1">"{e.notes}"</p>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(e.timestamp), "d MMM yyyy")}
                          </p>
                          <p className="text-xs font-semibold text-foreground">
                            {format(parseISO(e.timestamp), "HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
