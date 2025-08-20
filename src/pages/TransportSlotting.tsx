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

// Type definition for slot conflicts
type SlotConflict = Tables<'slot_conflicts'>;

export default function TransportSlotting() {
  const [slotConflicts, setSlotConflicts] = useState<SlotConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpecies, setSelectedSpecies] = useState("all");

  useEffect(() => {
    fetchSlotConflicts();
  }, []);

  const fetchSlotConflicts = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('slot_conflicts')
        .select('*')
        .order('window_start_dt', { ascending: true });

      if (error) {
        console.error('Error fetching slot conflicts:', error);
        return;
      }

      setSlotConflicts(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConflicts = slotConflicts.filter(conflict => {
    return selectedSpecies === "all" || conflict.species === selectedSpecies;
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
                Loading slot conflicts...
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Window Start</TableHead>
                      <TableHead>Window End</TableHead>
                      <TableHead>Species</TableHead>
                      <TableHead>Assigned Loads</TableHead>
                      <TableHead>Max Truck Loads</TableHead>
                      <TableHead>Conflict Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                     {filteredConflicts.map((conflict, index) => (
                        <TableRow 
                          key={conflict.slot_id || `conflict-${index}`}
                          className={conflict.is_conflict ? "bg-destructive/10 border-destructive/30" : ""}
                        >
                          <TableCell className="font-mono text-sm">
                            {formatDateTime(conflict.window_start_dt)}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {formatDateTime(conflict.window_end_dt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {conflict.species || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {conflict.assigned_loads || 0}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {conflict.max_truck_loads || 0}
                          </TableCell>
                          <TableCell>
                            {conflict.is_conflict ? (
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
                    {filteredConflicts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No slot conflicts found
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
                    {filteredConflicts.length}
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
                    {filteredConflicts.filter(conflict => conflict.is_conflict).length}
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
                    {filteredConflicts.reduce((sum, conflict) => sum + (conflict.assigned_loads || 0), 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Assigned Loads</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Demo Data Notice */}
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p className="font-medium">🚛 Slot Conflicts</p>
              <p>Data from slot_conflicts table showing transport capacity conflicts and assignments.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}