import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, AlertTriangle, Calendar, Clock } from "lucide-react";
import { useState } from "react";

// Mock transport slots data
const mockTransportSlots = [
  {
    id: "TS001",
    plant: "JBS - Dinmore (test)",
    date: "2025-08-18",
    windowStart: "06:00",
    windowEnd: "09:00",
    species: "beef",
    maxTruckLoads: 3,
    assignedBookings: ["B001"],
    conflictFlag: false,
  },
  {
    id: "TS002",
    plant: "Teys - Beenleigh (test)",
    date: "2025-08-19",
    windowStart: "07:00",
    windowEnd: "10:00",
    species: "lamb",
    maxTruckLoads: 2,
    assignedBookings: ["B002", "B004"],
    conflictFlag: true,
  },
  {
    id: "TS003",
    plant: "NH Foods - Oakey (test)",
    date: "2025-08-20",
    windowStart: "05:30",
    windowEnd: "08:30",
    species: "beef",
    maxTruckLoads: 4,
    assignedBookings: ["B003"],
    conflictFlag: false,
  },
];

// Generate week view
const getWeekDays = () => {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push({
      date: date.toISOString().split('T')[0],
      dayName: date.toLocaleDateString('en-AU', { weekday: 'short' }),
      dayNumber: date.getDate(),
    });
  }
  return days;
};

export default function TransportSlotting() {
  const [selectedPlant, setSelectedPlant] = useState("all");
  const [selectedSpecies, setSelectedSpecies] = useState("all");
  const weekDays = getWeekDays();

  const filteredSlots = mockTransportSlots.filter(slot => {
    const matchesPlant = selectedPlant === "all" || slot.plant === selectedPlant;
    const matchesSpecies = selectedSpecies === "all" || slot.species === selectedSpecies;
    return matchesPlant && matchesSpecies;
  });

  const getSlotsByDate = (date: string) => {
    return filteredSlots.filter(slot => slot.date === date);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Transport Slotting</h1>
            <p className="text-muted-foreground">Manage transport windows and assignments</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Change Week
            </Button>
            <Button>
              <Truck className="h-4 w-4 mr-2" />
              New Slot
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select plant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plants</SelectItem>
                  <SelectItem value="JBS - Dinmore (test)">JBS - Dinmore</SelectItem>
                  <SelectItem value="Teys - Beenleigh (test)">Teys - Beenleigh</SelectItem>
                  <SelectItem value="NH Foods - Oakey (test)">NH Foods - Oakey</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedSpecies} onValueChange={setSelectedSpecies}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Species" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Species</SelectItem>
                  <SelectItem value="beef">Beef</SelectItem>
                  <SelectItem value="lamb">Lamb</SelectItem>
                  <SelectItem value="mutton">Mutton</SelectItem>
                  <SelectItem value="goat">Goat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Transport Slot Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Weekly Transport Slots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-4">
              {weekDays.map((day) => {
                const daySlots = getSlotsByDate(day.date);
                return (
                  <div key={day.date} className="border border-border rounded-lg p-3">
                    <div className="text-center mb-3">
                      <div className="text-sm font-medium text-muted-foreground">{day.dayName}</div>
                      <div className="text-lg font-bold text-foreground">{day.dayNumber}</div>
                    </div>
                    
                    <div className="space-y-2">
                      {daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`p-2 rounded border text-xs ${
                            slot.conflictFlag 
                              ? "border-destructive bg-destructive/10" 
                              : "border-border bg-card"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className="text-xs">
                              {slot.species}
                            </Badge>
                            {slot.conflictFlag && (
                              <AlertTriangle className="h-3 w-3 text-destructive" />
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {slot.windowStart} - {slot.windowEnd}
                          </div>
                          <div className="text-xs">
                            {slot.assignedBookings.length}/{slot.maxTruckLoads} loads
                          </div>
                          <div className="text-xs font-mono text-muted-foreground mt-1">
                            {slot.plant.split(' - ')[0]}
                          </div>
                        </div>
                      ))}
                      
                      {daySlots.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground text-xs">
                          No slots
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Conflict Highlighter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Conflicts & Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredSlots
                .filter(slot => slot.conflictFlag)
                .map((slot) => (
                  <div key={slot.id} className="flex items-center justify-between p-3 border border-destructive rounded-lg bg-destructive/5">
                    <div>
                      <div className="font-medium text-foreground">
                        {slot.plant} - {slot.species} slot
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {slot.date} {slot.windowStart}-{slot.windowEnd} • Over capacity: {slot.assignedBookings.length}/{slot.maxTruckLoads} loads
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Resolve
                    </Button>
                  </div>
                ))}
              
              {filteredSlots.filter(slot => slot.conflictFlag).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No conflicts detected
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {filteredSlots.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Slots</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {filteredSlots.filter(slot => slot.conflictFlag).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Conflicts</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-accent" />
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {filteredSlots.reduce((sum, slot) => sum + slot.assignedBookings.length, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Assigned Loads</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}