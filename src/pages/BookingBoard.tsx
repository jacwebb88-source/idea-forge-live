import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Search, Plus, Filter, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

// Type definition for booking data
type Booking = Tables<'bookings'>;

const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed": return "bg-green-100 text-green-800 border-green-200";
    case "requested": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "changed": return "bg-orange-100 text-orange-800 border-orange-200";
    case "cancelled": return "bg-red-100 text-red-800 border-red-200";
    default: return "bg-muted text-muted-foreground";
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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
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

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = (booking.lot_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          booking.agent_ref?.toLowerCase().includes(searchTerm.toLowerCase())) ?? false;
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
            <Button>
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
                    placeholder="Search by lot ID or agent ref..."
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
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Booking ID</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Species</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Agent Ref</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Lot ID</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Head Count</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Kill Date</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Window</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-muted-foreground">
                        Loading bookings...
                      </td>
                    </tr>
                  ) : filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-muted-foreground">
                        No bookings found
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((booking) => (
                      <tr key={booking.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-2 text-sm font-medium">{booking.id}</td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className="capitalize">
                            {booking.species}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-sm">{booking.agent_ref || '-'}</td>
                        <td className="py-3 px-2 text-sm font-mono">{booking.lot_id || '-'}</td>
                        <td className="py-3 px-2 text-sm">{booking.head_count || '-'}</td>
                        <td className="py-3 px-2 text-sm">
                          {booking.requested_kill_date ? new Date(booking.requested_kill_date).toLocaleDateString('en-AU') : '-'}
                        </td>
                        <td className="py-3 px-2 text-sm">
                          {formatTimeWindow(booking.requested_window_start, booking.requested_window_end)}
                        </td>
                        <td className="py-3 px-2">
                          <Badge className={getStatusColor(booking.status || 'unknown')}>
                            {booking.status || 'unknown'}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm">Edit</Button>
                            <Button variant="ghost" size="sm">View</Button>
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
      </div>
    </DashboardLayout>
  );
}