import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Calendar as CalendarIcon, Clock, Users, Beef } from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";

interface BookingData {
  id: string;
  status: string;
  plant_name: string;
  requested_kill_date: string;
  head_count: number;
  species: string;
  lot_id: string;
  agent_ref: string;
  requested_window_start: string;
  requested_window_end: string;
}

const getSpeciesColor = (species: string) => {
  switch (species?.toLowerCase()) {
    case "beef":
    case "cattle": return "bg-red-500";
    case "lamb": return "bg-green-500";
    case "mutton": 
    case "sheep": return "bg-blue-500";
    case "goat": return "bg-purple-500";
    default: return "bg-gray-500";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed": return "bg-green-100 text-green-800 border-green-200";
    case "requested": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "changed": return "bg-orange-100 text-orange-800 border-orange-200";
    case "cancelled": return "bg-red-100 text-red-800 border-red-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export function BookingCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [plantFilter, setPlantFilter] = useState<string>("all");

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_bookings')
        .select('*')
        .not('requested_kill_date', 'is', null)
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

  const getDayBookings = (date: Date) => {
    return bookings.filter(booking => 
      booking.requested_kill_date && 
      isSameDay(parseISO(booking.requested_kill_date), date) &&
      (plantFilter === "all" || booking.plant_name === plantFilter)
    );
  };

  const getSelectedDateBookings = () => {
    return getDayBookings(selectedDate);
  };

  const getBookingDates = () => {
    const dates = bookings
      .filter(booking => booking.requested_kill_date && (plantFilter === "all" || booking.plant_name === plantFilter))
      .map(booking => parseISO(booking.requested_kill_date))
      .filter(date => date.getMonth() === selectedMonth.getMonth() && date.getFullYear() === selectedMonth.getFullYear());
    return dates;
  };

  const uniquePlants = [...new Set(bookings.map(b => b.plant_name).filter(Boolean))];

  const modifiers = {
    hasBookings: getBookingDates(),
  };

  const modifiersStyles = {
    hasBookings: {
      backgroundColor: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
      fontWeight: 'bold',
    },
  };

  const totalHeadCount = getSelectedDateBookings().reduce((sum, booking) => sum + (booking.head_count || 0), 0);
  const confirmedBookings = getSelectedDateBookings().filter(b => b.status === 'confirmed').length;
  const pendingBookings = getSelectedDateBookings().filter(b => b.status === 'requested').length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Processor Booking Calendar
            </CardTitle>
            <Select value={plantFilter} onValueChange={setPlantFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select plant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plants</SelectItem>
                {uniquePlants.map(plant => (
                  <SelectItem key={plant} value={plant}>{plant}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            Click on highlighted dates to view bookings. Current capacity: {getSelectedDateBookings().length} bookings
          </p>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            onMonthChange={setSelectedMonth}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {format(selectedDate, 'EEEE, MMMM d')}
          </CardTitle>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center p-2 bg-muted rounded">
              <div className="font-semibold">{getSelectedDateBookings().length}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="font-semibold text-green-700">{confirmedBookings}</div>
              <div className="text-xs text-green-600">Confirmed</div>
            </div>
            <div className="text-center p-2 bg-yellow-50 rounded">
              <div className="font-semibold text-yellow-700">{pendingBookings}</div>
              <div className="text-xs text-yellow-600">Pending</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-center py-4 text-muted-foreground">Loading bookings...</div>
          ) : getSelectedDateBookings().length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No bookings scheduled for this date</p>
            </div>
          ) : (
            getSelectedDateBookings().map((booking) => (
              <div key={booking.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-red-500`}></div>
                    <span className="font-medium text-sm">{booking.lot_id || booking.agent_ref}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getStatusColor(booking.status)}`}
                  >
                    {booking.status}
                  </Badge>
                </div>
                
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Beef className="h-3 w-3" />
                    <span className="capitalize">Beef</span>
                    <span>•</span>
                    <Users className="h-3 w-3" />
                    <span>{booking.head_count} head</span>
                  </div>
                  
                  {booking.requested_window_start && booking.requested_window_end && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(parseISO(booking.requested_window_start), 'HH:mm')} - {format(parseISO(booking.requested_window_end), 'HH:mm')}
                      </span>
                    </div>
                  )}
                  
                  {booking.plant_name && (
                    <div className="text-xs font-medium">
                      {booking.plant_name}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          {getSelectedDateBookings().length > 0 && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4" />
                <span className="font-medium">Total Head Count: {totalHeadCount}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}