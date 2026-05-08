import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Search, Calendar, MapPin, FileText } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";

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

const eventTypeColour = (t: string | null): string => {
  switch ((t || "").toLowerCase()) {
    case "arrived":     return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "weighed":     return "bg-blue-50 text-blue-700 border-blue-200";
    case "penned":      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "killed":      return "bg-gray-50 text-gray-700 border-gray-200";
    case "dispatched":  return "bg-purple-50 text-purple-700 border-purple-200";
    default:            return "bg-muted text-muted-foreground border-border";
  }
};

export default function IntakeStatus() {
  const [events, setEvents] = useState<IntakeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [dateRange, setDateRange] = useState("7");

  useEffect(() => {
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
        .limit(100);

      if (!evData || evData.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      // Enrich with booking + supplier info
      const bookingIds = Array.from(
        new Set((evData as any[]).map(e => e.booking_id).filter(Boolean))
      ) as string[];

      let bookingMap: Record<string, any> = {};
      if (bookingIds.length > 0) {
        const { data: bks } = await supabase
          .from("bookings")
          .select("id, species, head_count, status, requested_kill_date, supplier_id")
          .in("id", bookingIds);

        const supplierIds = Array.from(
          new Set((bks as any[] || []).map(b => b.supplier_id).filter(Boolean))
        ) as string[];

        let supplierMap: Record<string, string> = {};
        if (supplierIds.length > 0) {
          const { data: sups } = await supabase
            .from("suppliers")
            .select("id, name")
            .in("id", supplierIds);
          (sups as any[] || []).forEach(s => (supplierMap[s.id] = s.name));
        }

        (bks as any[] || []).forEach(b => {
          bookingMap[b.id] = {
            ...b,
            supplier_name: b.supplier_id ? (supplierMap[b.supplier_id] || "Unknown") : undefined,
          };
        });
      }

      setEvents((evData as any[]).map(e => ({
        ...e,
        species: bookingMap[e.booking_id]?.species,
        head_count: bookingMap[e.booking_id]?.head_count,
        supplier_name: bookingMap[e.booking_id]?.supplier_name,
        kill_date: bookingMap[e.booking_id]?.requested_kill_date,
        booking_status: bookingMap[e.booking_id]?.status,
      })));
      setLoading(false);
    };
    fetchEvents();
  }, [dateRange]);

  const uniqueEventTypes = Array.from(new Set(events.map(e => e.event_type).filter(Boolean))) as string[];

  const filtered = events.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (e.supplier_name || "").toLowerCase().includes(q) ||
      (e.location || "").toLowerCase().includes(q) ||
      (e.notes || "").toLowerCase().includes(q) ||
      (e.booking_id || "").toLowerCase().includes(q);
    const matchType = eventFilter === "all" || e.event_type === eventFilter;
    return matchSearch && matchType;
  });

  // Summary counts
  const arrivedToday = events.filter(e =>
    e.event_type === "arrived" &&
    e.timestamp &&
    format(parseISO(e.timestamp), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  ).length;

  const uniqueBookings = new Set(filtered.map(e => e.booking_id).filter(Boolean)).size;

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Intake Status</h1>
            <p className="text-muted-foreground">
              Live event log — arrivals, weighing, penning, and kill progress
            </p>
          </div>
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
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Events (filtered)</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{loading ? "—" : filtered.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Arrivals today</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{loading ? "—" : arrivedToday}</div></CardContent>
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
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All event types" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All event types</SelectItem>
              {uniqueEventTypes.map(t => (
                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Events log */}
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
                <p className="text-sm text-muted-foreground">No intake events recorded in this period.</p>
                <p className="text-xs text-muted-foreground mt-1">Events are logged automatically as livestock move through the plant.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(e => (
                  <div key={e.id} className="flex items-start gap-4 rounded-md border border-border bg-muted/20 px-4 py-3">
                    {/* Event type badge */}
                    <span className={`shrink-0 text-xs font-semibold border rounded px-2 py-1 capitalize min-w-[80px] text-center mt-0.5 ${eventTypeColour(e.event_type)}`}>
                      {e.event_type || "—"}
                    </span>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-foreground">
                          {e.supplier_name || "Unknown supplier"}
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
                      <p className="text-xs font-medium text-foreground">
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
    </DashboardLayout>
  );
}
