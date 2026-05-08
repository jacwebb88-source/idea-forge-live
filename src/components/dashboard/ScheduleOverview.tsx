import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, addDays } from "date-fns";

interface UpcomingBooking {
  id: string;
  species: string | null;
  head_count: number | null;
  requested_kill_date: string | null;
  arrival_slot: string | null;
  status: string | null;
  hgp_status: string | null;
  supplier_id: string | null;
  supplierName?: string;
}

const getStatusVariant = (status: string | null): "confirmed" | "requested" | "changed" | "cancelled" | "secondary" => {
  switch ((status || "").toLowerCase()) {
    case "confirmed": return "confirmed";
    case "high":
    case "medium":
    case "requested":
    case "low":
    case "pending": return "requested";
    case "changed":  return "changed";
    case "cancelled": return "cancelled";
    default: return "secondary";
  }
};

const getSpeciesVariant = (species: string | null): "beef" | "lamb" | "mutton" | "goat" | "secondary" => {
  switch ((species || "").toLowerCase()) {
    case "beef":
    case "cattle": return "beef";
    case "lamb": return "lamb";
    case "mutton":
    case "sheep": return "mutton";
    case "goat": return "goat";
    default: return "secondary";
  }
};

const confidenceLeft = (status: string | null): string => {
  switch ((status || "").toLowerCase()) {
    case "confirmed":   return "border-l-4 border-blue-500";
    case "high":        return "border-l-4 border-emerald-500";
    case "medium":      return "border-l-4 border-amber-500";
    case "low":
    case "pending":
    case "requested":   return "border-l-4 border-yellow-400";
    case "cancelled":   return "border-l-4 border-red-400";
    default:            return "border-l-4 border-gray-300";
  }
};

export function ScheduleOverview() {
  const [bookings, setBookings] = useState<UpcomingBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpcoming = async () => {
      setLoading(true);
      const today = format(new Date(), "yyyy-MM-dd");
      const cutoff = format(addDays(new Date(), 7), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("bookings")
        .select("id, species, head_count, requested_kill_date, arrival_slot, status, hgp_status, supplier_id")
        .gte("requested_kill_date", today)
        .lte("requested_kill_date", cutoff)
        .neq("status", "cancelled")
        .order("requested_kill_date", { ascending: true })
        .order("arrival_slot", { ascending: true })
        .limit(8);

      if (error) {
        console.error("ScheduleOverview fetch error:", error);
        setLoading(false);
        return;
      }

      const raw = (data || []) as UpcomingBooking[];

      // Enrich with supplier names
      const ids = Array.from(new Set(raw.map(b => b.supplier_id).filter(Boolean))) as string[];
      let supplierMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: sups } = await supabase
          .from("suppliers")
          .select("id, name")
          .in("id", ids);
        (sups || []).forEach((s: any) => (supplierMap[s.id] = s.name));
      }

      setBookings(raw.map(b => ({
        ...b,
        supplierName: b.supplier_id ? (supplierMap[b.supplier_id] || "Unknown") : undefined,
      })));
      setLoading(false);
    };
    fetchUpcoming();
  }, []);

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-5 w-5 text-primary" />
          Upcoming — Next 7 Days
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-muted-foreground py-8 text-sm animate-pulse">
            Loading schedule…
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            No upcoming bookings in the next 7 days.
          </div>
        ) : (
          <div className="space-y-2">
            {bookings.map((b) => (
              <div
                key={b.id}
                className={`flex items-start gap-3 rounded-md border px-3 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors ${confidenceLeft(b.status)}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium truncate">
                      {b.supplierName || <span className="text-muted-foreground italic">No supplier</span>}
                    </span>
                    <Badge variant={getSpeciesVariant(b.species)} className="capitalize text-xs shrink-0">
                      {b.species || "—"}
                    </Badge>
                    {b.hgp_status === "hgp_treated" && (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-0.5 shrink-0">
                        HGP
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(b.head_count || 0).toLocaleString()} head
                    {b.requested_kill_date && (
                      <> · {format(parseISO(b.requested_kill_date), "EEE d MMM")}</>
                    )}
                    {b.arrival_slot && <> · {b.arrival_slot}</>}
                  </p>
                </div>
                <Badge variant={getStatusVariant(b.status)} className="shrink-0 capitalize text-xs">
                  {b.status || "placeholder"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
