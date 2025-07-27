import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin } from "lucide-react";

const todaySchedule = [
  {
    id: 1,
    time: "06:00",
    farm: "Green Valley Farm",
    animals: 15,
    type: "Cattle",
    slot: "A-1",
    status: "completed",
  },
  {
    id: 2,
    time: "08:30",
    farm: "Highland Ranch",
    animals: 22,
    type: "Cattle",
    slot: "A-2",
    status: "in-progress",
  },
  {
    id: 3,
    time: "11:00",
    farm: "Meadow Creek",
    animals: 18,
    type: "Cattle",
    slot: "B-1",
    status: "scheduled",
  },
  {
    id: 4,
    time: "14:00",
    farm: "Pine Ridge Farm",
    animals: 12,
    type: "Sheep",
    slot: "B-2",
    status: "scheduled",
  },
  {
    id: 5,
    time: "16:30",
    farm: "Oak Hill Ranch",
    animals: 20,
    type: "Cattle",
    slot: "A-3",
    status: "scheduled",
  },
];

export function ScheduleOverview() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in-progress": return "bg-blue-100 text-blue-800";
      case "scheduled": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Today's Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {todaySchedule.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-country">
              <div className="flex flex-col items-center justify-center w-16 h-16 bg-primary/10 rounded-lg">
                <Clock className="h-4 w-4 text-primary mb-1" />
                <span className="text-xs font-medium text-primary">{item.time}</span>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-foreground">{item.farm}</h4>
                  <Badge variant="outline" className="text-xs">
                    Slot {item.slot}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{item.animals} {item.type}</span>
                  <Badge className={getStatusColor(item.status)}>
                    {item.status.replace("-", " ")}
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