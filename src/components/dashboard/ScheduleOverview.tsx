import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TodayBooking {
  species: string;
  head_count: number;
  requested_kill_date: string | null;
  requested_window_start: string | null;
  requested_window_end: string | null;
  status: string;
}

export function ScheduleOverview() {
  const [bookings, setBookings] = useState<TodayBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodayBookings();
  }, []);

  const fetchTodayBookings = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
      
      const { data, error } = await supabase
        .from('app_bookings')
        .select('species,head_count,requested_kill_date,requested_window_start,requested_window_end,status')
        .gte('requested_kill_date', today)
        .order('requested_kill_date', { ascending: true })
        .order('requested_window_start', { ascending: true })
        .limit(6);

      if (error) {
        console.error('Error fetching upcoming bookings:', error);
        return;
      }

      setBookings(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string): "confirmed" | "requested" | "changed" | "cancelled" | "secondary" => {
    switch (status?.toLowerCase()) {
      case "confirmed": return "confirmed";
      case "requested": return "requested"; 
      case "changed": return "changed";
      case "cancelled": return "cancelled";
      default: return "secondary";
    }
  };

  const getSpeciesVariant = (species: string): "beef" | "lamb" | "mutton" | "goat" | "secondary" => {
    switch (species?.toLowerCase()) {
      case "beef":
      case "cattle": return "beef";
      case "lamb": return "lamb";
      case "mutton": 
      case "sheep": return "mutton";
      case "goat": return "goat";
      default: return "secondary";
    }
  };

  const formatTimeWindow = (start: string | null, end: string | null) => {
    if (!start || !end) return "Time TBD";
    
    const startTime = new Date(start).toLocaleTimeString('en-AU', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    const endTime = new Date(end).toLocaleTimeString('en-AU', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    return `${startTime}–${endTime}`;
  };

  const formatKillDate = (dateString: string | null) => {
    if (!dateString) return "TBD";
    return new Date(dateString).toLocaleDateString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Upcoming Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-muted-foreground py-8">
            Loading schedule...
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No upcoming bookings
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">
                    {booking.species}: {booking.head_count} head • {formatKillDate(booking.requested_kill_date)} {formatTimeWindow(booking.requested_window_start, booking.requested_window_end)}
                  </span>
                </div>
                <Badge variant={getStatusVariant(booking.status)}>
                  {booking.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}