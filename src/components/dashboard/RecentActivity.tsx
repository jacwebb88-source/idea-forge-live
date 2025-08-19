import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ActivityItem {
  booking_id: string;
  supplier_name: string | null;
  lot_id: string | null;
  species: string | null;
  event: string;
  at_time: string;
  type: 'booking' | 'intake';
}

export function RecentActivity() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  const fetchRecentActivity = async () => {
    try {
      const { data, error } = await supabase
        .from('app_recent_activity' as any)
        .select('*')
        .order('at_time', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching recent activity:', error);
        return;
      }

      setActivities((data as unknown as ActivityItem[]) || []);
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

  const getActivityMessage = (activity: ActivityItem) => {
    const lotInfo = activity.lot_id ? ` (Lot: ${activity.lot_id})` : '';
    const speciesInfo = activity.species ? `${activity.species} ` : '';
    
    if (activity.type === 'intake') {
      return `${activity.event}${lotInfo}`;
    }
    
    // For booking events
    switch (activity.event?.toLowerCase()) {
      case "confirmed":
        return `Booking confirmed${lotInfo ? ` ${lotInfo}` : ''}`;
      case "changed":
        return `Booking modified${lotInfo ? ` ${lotInfo}` : ''}`;
      case "cancelled":
        return `Booking cancelled${lotInfo ? ` ${lotInfo}` : ''}`;
      case "requested":
      default:
        return `New booking${lotInfo ? ` ${lotInfo}` : ''}`;
    }
  };

  const getTypeColor = (type: 'booking' | 'intake') => {
    return type === 'booking' ? 'bg-primary' : 'bg-accent';
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
            {activities.map((activity, index) => (
              <div key={`${activity.booking_id}-${index}`} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${getTypeColor(activity.type)}`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground font-medium">
                    {getActivityMessage(activity)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {getRelativeTime(activity.at_time)}
                    </p>
                    <Badge variant={getStatusVariant(activity.event)}>
                      {activity.event}
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