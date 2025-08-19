import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NewBookingForm } from "@/components/NewBookingForm";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Search, Plus, Filter, Download, CheckCircle, X, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

// Type definition for booking data with supplier info
type BookingWithSupplier = Tables<'bookings'> & {
  suppliers?: {
    name: string;
    type: string;
  } | null;
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

const getStatusVariant = (status: string): "confirmed" | "requested" | "changed" | "cancelled" | "secondary" => {
  switch (status) {
    case "confirmed": return "confirmed";
    case "requested": return "requested";
    case "changed": return "changed";
    case "cancelled": return "cancelled";
    default: return "secondary";
  }
};

const formatTimeWindow = (start?: string, end?: string) => {
  if (!start || !end) return "TBD";
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
  return `${startTime} - ${endTime}`;
};

export default function BookingBoard() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<BookingWithSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("requested"); // Default to "requested"
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [updatingBookings, setUpdatingBookings] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{bookingId: string, field: 'requested_window_start' | 'requested_window_end'} | null>(null);
  const [tempValue, setTempValue] = useState("");

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          suppliers(
            name,
            type
          )
        `)
        .order('requested_kill_date', { ascending: true });

      if (error) {
        console.error('Error fetching bookings:', error);
        return;
      }

      setBookings(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingCreated = () => {
    fetchBookings(); // Refresh the bookings list
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: 'confirmed' | 'cancelled') => {
    setUpdatingBookings(prev => new Set([...prev, bookingId]));

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) {
        console.error('Error updating booking status:', error);
        toast({
          title: "Error",
          description: `Failed to ${newStatus === 'confirmed' ? 'confirm' : 'cancel'} booking. Please try again.`,
          variant: "destructive",
        });
        return;
      }

      // Success
      toast({
        title: `Booking ${newStatus}`,
        description: `Booking has been successfully ${newStatus}.`,
      });

      // Refresh bookings list
      fetchBookings();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingBookings(prev => {
        const newSet = new Set(prev);
        newSet.delete(bookingId);
        return newSet;
      });
    }
  };

  const handleCellEdit = (bookingId: string, field: 'requested_window_start' | 'requested_window_end', currentValue: string | null) => {
    setEditingCell({ bookingId, field });
    // Convert datetime to input format
    const formattedValue = currentValue ? new Date(currentValue).toISOString().slice(0, 16) : '';
    setTempValue(formattedValue);
  };

  const handleCellUpdate = async () => {
    if (!editingCell || !tempValue) {
      setEditingCell(null);
      setTempValue("");
      return;
    }

    const { bookingId, field } = editingCell;
    
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ [field]: tempValue })
        .eq('id', bookingId);

      if (error) {
        console.error('Error updating booking time:', error);
        toast({
          title: "Error",
          description: "Failed to update booking time. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Time updated",
        description: "Booking time has been successfully updated.",
      });

      // Refresh just this booking
      fetchBookings();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setEditingCell(null);
      setTempValue("");
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setTempValue("");
  };

  const formatDateTime = (dateTimeString: string | null) => {
    if (!dateTimeString) return '-';
    return new Date(dateTimeString).toLocaleString('en-AU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = (booking.lot_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          booking.agent_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          booking.suppliers?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ?? false;
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Booking Board</h1>
            <p className="text-muted-foreground">Manage kill slot bookings and scheduling</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => setIsNewBookingOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by supplier, lot ID or agent ref..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="requested">Requested</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="changed">Changed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bookings Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {loading ? "Loading bookings..." : `Current Bookings (${filteredBookings.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="table-header">
                    <th className="text-left py-3 px-3 text-sm font-medium">Booking ID</th>
                    <th className="text-left py-3 px-3 text-sm font-medium">Supplier</th>
                    <th className="text-left py-3 px-3 text-sm font-medium">Species</th>
                    <th className="text-left py-3 px-3 text-sm font-medium">Agent Ref</th>
                    <th className="text-left py-3 px-3 text-sm font-medium">Lot ID</th>
                    <th className="text-right py-3 px-2 text-sm font-medium">Head Count</th>
                    <th className="text-left py-3 px-3 text-sm font-medium">Kill Date</th>
                    <th className="text-left py-3 px-3 text-sm font-medium">Window Start</th>
                    <th className="text-left py-3 px-3 text-sm font-medium">Window End</th>
                    <th className="text-left py-3 px-3 text-sm font-medium">Status</th>
                    <th className="text-left py-3 px-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-muted-foreground">
                        Loading bookings...
                      </td>
                    </tr>
                  ) : filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-muted-foreground">
                        No bookings found
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((booking, index) => (
                      <tr key={booking.id} className={`table-row-hover table-row-zebra border-b border-border transition-colors`}>
                        <td className="py-3 px-3 text-sm font-medium">{booking.id.slice(-8)}</td>
                        <td className="py-3 px-3">
                          <div>
                            <div className="font-medium text-sm">{booking.suppliers?.name || 'Unknown Supplier'}</div>
                            <div className="text-xs text-muted-foreground capitalize">{booking.suppliers?.type || ''}</div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={getSpeciesVariant(booking.species)} className="capitalize">
                            {booking.species}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-sm">{booking.agent_ref || '-'}</td>
                        <td className="py-3 px-3 text-sm font-mono">{booking.lot_id || '-'}</td>
                        <td className="py-3 px-2 text-sm table-cell-numeric">{booking.head_count || '-'}</td>
                        <td className="py-3 px-3 text-sm">
                          {booking.requested_kill_date ? new Date(booking.requested_kill_date).toLocaleDateString('en-AU') : '-'}
                        </td>
                        <td className="py-3 px-3 text-sm">
                          {editingCell?.bookingId === booking.id && editingCell.field === 'requested_window_start' ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="datetime-local"
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                className="w-40 h-8 text-xs"
                                onBlur={handleCellUpdate}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCellUpdate();
                                  if (e.key === 'Escape') handleCellCancel();
                                }}
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div 
                              className="cursor-pointer hover:bg-muted/50 p-1 rounded"
                              onClick={() => handleCellEdit(booking.id, 'requested_window_start', booking.requested_window_start)}
                            >
                              {formatDateTime(booking.requested_window_start)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-sm">
                          {editingCell?.bookingId === booking.id && editingCell.field === 'requested_window_end' ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="datetime-local"
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                className="w-40 h-8 text-xs"
                                onBlur={handleCellUpdate}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCellUpdate();
                                  if (e.key === 'Escape') handleCellCancel();
                                }}
                                autoFocus
                              />
                            </div>
                          ) : (
                            <div 
                              className="cursor-pointer hover:bg-muted/50 p-1 rounded"
                              onClick={() => handleCellEdit(booking.id, 'requested_window_end', booking.requested_window_end)}
                            >
                              {formatDateTime(booking.requested_window_end)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={getStatusVariant(booking.status || 'unknown')}>
                            {booking.status || 'unknown'}
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex gap-1">
                            {booking.status === 'requested' && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleStatusUpdate(booking.id, 'confirmed')}
                                  disabled={updatingBookings.has(booking.id)}
                                  className="text-success hover:text-success/80 hover:bg-success/10"
                                >
                                  {updatingBookings.has(booking.id) ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                  )}
                                  Confirm
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                                  disabled={updatingBookings.has(booking.id)}
                                  className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                >
                                  {updatingBookings.has(booking.id) ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <X className="h-3 w-3 mr-1" />
                                  )}
                                  Cancel
                                </Button>
                              </>
                            )}
                            {booking.status !== 'requested' && (
                              <>
                                <Button variant="ghost" size="sm">Edit</Button>
                                <Button variant="ghost" size="sm">View</Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Calendar View Toggle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendar View
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              Calendar view coming soon - switch between table and calendar layouts
            </div>
          </CardContent>
        </Card>

        {/* Demo Data Notice */}
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p className="font-medium">📊 Demo Data</p>
              <p>This is sample booking data for demonstration purposes. Real supplier names and booking details would appear in production.</p>
            </div>
          </CardContent>
        </Card>

        {/* Transport Slotting Demo Notice */}
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p className="font-medium">🚛 Transport & Capacity Management</p>
              <p>Visit Transport Slotting to see assigned/capacity ratios and conflict warnings in action.</p>
            </div>
          </CardContent>
        </Card>

        {/* Import Preview Notice */}
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p className="font-medium">📤 Data Import & Validation</p>
              <p>Check the Import Data page to see CSV preview and row validation features.</p>
            </div>
          </CardContent>
        </Card>

        {/* New Booking Form */}
        <NewBookingForm 
          open={isNewBookingOpen}
          onOpenChange={setIsNewBookingOpen}
          onBookingCreated={handleBookingCreated}
        />
      </div>
    </DashboardLayout>
  );
}