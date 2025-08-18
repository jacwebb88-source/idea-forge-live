import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, AlertTriangle, Calendar, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

// Type definition for transport slot data
type TransportSlot = Tables<'transport_slots'>;

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

const formatTime = (dateTimeString: string) => {
  return new Date(dateTimeString).toLocaleTimeString('en-AU', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
};

export default function TransportSlotting() {
  const [transportSlots, setTransportSlots] = useState<TransportSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlant, setSelectedPlant] = useState("all");
  const [selectedSpecies, setSelectedSpecies] = useState("all");
  const weekDays = getWeekDays();

  useEffect(() => {
    fetchTransportSlots();
  }, []);

  const fetchTransportSlots = async () => {
    try {
      const { data, error } = await supabase
        .from('transport_slots')
        .select('*')
        .order('window_start_dt', { ascending: true });

      if (error) {
        console.error('Error fetching transport slots:', error);
        return;
      }

      setTransportSlots(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSlots = transportSlots.filter(slot => {
    const matchesPlant = selectedPlant === "all" || slot.plant_id === selectedPlant;
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
              {loading ? "Loading Transport Slots..." : "Weekly Transport Slots"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading transport slots...
              </div>
            ) : (
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
                              slot.conflict_flag 
                                ? "border-destructive bg-destructive/10" 
                                : "border-border bg-card"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline" className="text-xs capitalize">
                                {slot.species}
                              </Badge>
                              {slot.conflict_flag && (
                                <AlertTriangle className="h-3 w-3 text-destructive" />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {slot.window_start_dt ? formatTime(slot.window_start_dt) : ''} - {slot.window_end_dt ? formatTime(slot.window_end_dt) : ''}
                            </div>
                            <div className="text-xs">
                              {slot.assigned_booking_ids?.length || 0}/{slot.max_truck_loads || 1} loads
                            </div>
                            <div className="text-xs font-mono text-muted-foreground mt-1">
                              Plant {slot.plant_id?.slice(-3) || 'N/A'}
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
            )}
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
                .filter(slot => slot.conflict_flag)
                .map((slot) => (
                  <div key={slot.id} className="flex items-center justify-between p-3 border border-destructive rounded-lg bg-destructive/5">
                    <div>
                      <div className="font-medium text-foreground">
                        Plant {slot.plant_id?.slice(-3) || 'N/A'} - {slot.species} slot
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {slot.date} {slot.window_start_dt ? formatTime(slot.window_start_dt) : ''}-{slot.window_end_dt ? formatTime(slot.window_end_dt) : ''} • Over capacity: {slot.assigned_booking_ids?.length || 0}/{slot.max_truck_loads || 1} loads
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Resolve
                    </Button>
                  </div>
                ))}
              
              {filteredSlots.filter(slot => slot.conflict_flag).length === 0 && (
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
                    {filteredSlots.filter(slot => slot.conflict_flag).length}
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
                    {filteredSlots.reduce((sum, slot) => sum + (slot.assigned_booking_ids?.length || 0), 0)}
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