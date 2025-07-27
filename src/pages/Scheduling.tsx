import React from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar,
  Clock,
  Plus,
  MapPin,
  Truck,
  Users,
  Settings
} from "lucide-react";

const timeSlots = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"
];

const killSlots = ["A-1", "A-2", "A-3", "B-1", "B-2", "B-3"];

const scheduledBookings = [
  { time: "06:00", slot: "A-1", farm: "Green Valley", animals: 15, status: "confirmed" },
  { time: "08:30", slot: "A-2", farm: "Highland Ranch", animals: 22, status: "in-progress" },
  { time: "11:00", slot: "B-1", farm: "Meadow Creek", animals: 18, status: "confirmed" },
  { time: "14:00", slot: "B-2", farm: "Pine Ridge", animals: 12, status: "pending" },
  { time: "16:30", slot: "A-3", farm: "Oak Hill Ranch", animals: 20, status: "confirmed" },
];

const Scheduling = () => {
  const getSlotBooking = (time: string, slot: string) => {
    return scheduledBookings.find(booking => 
      booking.time === time && booking.slot === slot
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-800 border-green-200";
      case "in-progress": return "bg-blue-100 text-blue-800 border-blue-200";
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Kill Slot Scheduling</h1>
            <p className="text-muted-foreground mt-1">
              Manage and optimize processing schedules and capacity
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </div>
        </div>

        {/* Schedule Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Today's Capacity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Slots Booked</span>
                  <span className="font-medium">5/12</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full w-5/12"></div>
                </div>
                <p className="text-xs text-muted-foreground">
                  87 animals scheduled for processing
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Transport Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Arrivals Expected</span>
                  <span className="font-medium">8</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Currently Arrived</span>
                  <span className="font-medium text-green-600">2</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Delayed</span>
                  <span className="font-medium text-red-600">1</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Staff Allocation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Available Staff</span>
                  <span className="font-medium">12</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Currently Working</span>
                  <span className="font-medium text-green-600">8</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Break/Lunch</span>
                  <span className="font-medium text-yellow-600">4</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Schedule Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Schedule Grid - {new Date().toLocaleDateString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="grid grid-cols-7 gap-2 min-w-[800px]">
                {/* Header Row */}
                <div className="font-medium text-center p-2 bg-muted rounded">Time</div>
                {killSlots.map(slot => (
                  <div key={slot} className="font-medium text-center p-2 bg-muted rounded">
                    Kill Slot {slot}
                  </div>
                ))}

                {/* Time Slot Rows */}
                {timeSlots.map(time => (
                  <React.Fragment key={time}>
                    <div className="flex items-center justify-center p-2 bg-muted/30 rounded font-medium">
                      <Clock className="h-4 w-4 mr-1 text-primary" />
                      {time}
                    </div>
                    {killSlots.map(slot => {
                      const booking = getSlotBooking(time, slot);
                      return (
                        <div key={`${time}-${slot}`} className="p-1">
                          {booking ? (
                            <div className={`p-3 rounded-lg border-2 ${getStatusColor(booking.status)} cursor-pointer hover:shadow-md transition-country`}>
                              <div className="text-xs font-medium mb-1">{booking.farm}</div>
                              <div className="text-xs">{booking.animals} animals</div>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {booking.status}
                              </Badge>
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg border-2 border-dashed border-border bg-background hover:bg-muted/30 cursor-pointer transition-country flex items-center justify-center">
                              <Plus className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Bookings (Next 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { date: "Jan 28", farm: "Sunrise Ranch", animals: 30, slot: "A-1", time: "07:00" },
                { date: "Jan 29", farm: "River View Farm", animals: 25, slot: "B-2", time: "09:30" },
                { date: "Jan 30", farm: "Mountain Peak Ranch", animals: 18, slot: "A-3", time: "11:00" },
              ].map((booking, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{booking.farm}</h4>
                      <p className="text-sm text-muted-foreground">
                        {booking.date} at {booking.time} - Slot {booking.slot}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground">{booking.animals} Animals</p>
                    <Badge variant="outline">Confirmed</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Scheduling;