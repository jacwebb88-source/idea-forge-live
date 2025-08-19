import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertCircle, Truck, Calendar } from "lucide-react";

const activities = [
  {
    id: 1,
    type: "booking",
    message: "New booking scheduled for Friday 8:00 AM",
    time: "2 minutes ago",
    status: "pending",
    icon: Calendar,
  },
  {
    id: 2,
    type: "transport",
    message: "Transport TRK-001 arrived with 25 cattle",
    time: "15 minutes ago",
    status: "completed",
    icon: Truck,
  },
  {
    id: 3,
    type: "processing",
    message: "Kill slot B-3 processing completed",
    time: "32 minutes ago",
    status: "completed",
    icon: CheckCircle,
  },
  {
    id: 4,
    type: "alert",
    message: "Delay in morning delivery from Farm ABC",
    time: "1 hour ago",
    status: "warning",
    icon: AlertCircle,
  },
  {
    id: 5,
    type: "booking",
    message: "Weekly booking confirmed for next Monday",
    time: "2 hours ago",
    status: "confirmed",
    icon: Calendar,
  },
];

export function RecentActivity() {
  const getStatusVariant = (status: string): "confirmed" | "requested" | "changed" | "cancelled" | "secondary" => {
    switch (status) {
      case "completed": return "confirmed";
      case "confirmed": return "confirmed";
      case "pending": return "requested";
      case "warning": return "cancelled";
      default: return "secondary";
    }
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
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-country">
              <activity.icon className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground font-medium">
                  {activity.message}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">
                    {activity.time}
                  </p>
                  <Badge variant={getStatusVariant(activity.status)}>
                    {activity.status}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}