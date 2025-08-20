import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, AlertTriangle, Calendar, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

// Type definition for transport slots
type TransportSlot = Tables<'app_transport_slots'>;

export default function TransportSlotting() {
  const [transportSlots, setTransportSlots] = useState<TransportSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpecies, setSelectedSpecies] = useState("all");

  useEffect(() => {
    fetchTransportSlots();
  }, []);

  const fetchTransportSlots = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('app_transport_slots')
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
    return selectedSpecies === "all" || slot.species === selectedSpecies;
  });

  const formatDateTime = (dateTimeString: string | null) => {
    if (!dateTimeString) return 'N/A';
    return new Date(dateTimeString).toLocaleString('en-AU', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Transport Slotting</h1>
            <p className="text-muted-foreground">Monitor transport slot conflicts and capacity</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Refresh
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
              <Select value={selectedSpecies} onValueChange={setSelectedSpecies}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by species" />
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

        {/* Slot Conflicts Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Transport Slot Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading transport slots...
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Window Start</TableHead>
                      <TableHead>Window End</TableHead>
                      <TableHead>Species</TableHead>
                      <TableHead>Assigned Bookings</TableHead>
                      <TableHead>Max Truck Loads</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                     {filteredSlots.map((slot) => (
                        <TableRow 
                          key={slot.id}
                          className={slot.conflict_flag ? "bg-destructive/10 border-destructive/30" : ""}
                        >
                          <TableCell className="font-mono text-sm">
                            {formatDateTime(slot.window_start_dt)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatDateTime(slot.window_end_dt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {slot.species || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {slot.assigned_booking_ids?.length || 0}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {slot.max_truck_loads || 0}
                          </TableCell>
                          <TableCell>
                            {slot.conflict_flag ? (
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                                <Badge variant="destructive">Conflict</Badge>
                              </div>
                            ) : (
                              <Badge variant="secondary">Normal</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    {filteredSlots.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No transport slots found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
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
                  <div className="text-sm text-muted-foreground">Total Assigned Bookings</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Demo Data Notice */}
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p className="font-medium">🚛 Transport Slots</p>
              <p>Data from app_transport_slots table showing transport capacity and assignments.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}