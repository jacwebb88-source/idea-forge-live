import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BookingActivity {
  id: string;
  status: string;
  lot_id: string | null;
  species: string;
  head_count: number | null;
  created_at: string;
  supplier_name: string;
}

export function RecentActivity() {
  const [activities, setActivities] = useState<BookingActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentBookings();
  }, []);

  const fetchRecentBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          lot_id,
          species,
          head_count,
          created_at,
          suppliers!inner(name)
        `)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) {
        console.error('Error fetching recent bookings:', error);
        return;
      }

      const bookingActivities = data?.map(booking => ({
        id: booking.id,
        status: booking.status || 'requested',
        lot_id: booking.lot_id,
        species: booking.species,
        head_count: booking.head_count,
        created_at: booking.created_at,
        supplier_name: (booking.suppliers as any)?.name || 'Unknown Supplier'
      })) || [];

      setActivities(bookingActivities);
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

  const getActivityMessage = (activity: BookingActivity) => {
    const lotInfo = activity.lot_id ? ` (Lot: ${activity.lot_id})` : '';
    const headInfo = activity.head_count ? ` • ${activity.head_count} head` : '';
    
    switch (activity.status?.toLowerCase()) {
      case "confirmed":
        return `Booking confirmed for ${activity.supplier_name}${lotInfo}${headInfo}`;
      case "changed":
        return `Booking modified for ${activity.supplier_name}${lotInfo}${headInfo}`;
      case "cancelled":
        return `Booking cancelled for ${activity.supplier_name}${lotInfo}${headInfo}`;
      case "requested":
      default:
        return `New booking from ${activity.supplier_name}${lotInfo}${headInfo}`;
    }
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
    if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  };

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-muted-foreground py-8">
            Loading recent activity...
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No recent booking activity
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-country">
                <Calendar className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium">
                    {getActivityMessage(activity)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {getRelativeTime(activity.created_at)}
                    </p>
                    <Badge variant={getStatusVariant(activity.status)}>
                      {activity.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}