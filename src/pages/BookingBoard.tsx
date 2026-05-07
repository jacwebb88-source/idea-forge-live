import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NewBookingForm } from "@/components/NewBookingForm";
import { BookingCalendar } from "@/components/BookingCalendar";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Search, Plus, Filter, Download, CheckCircle, X, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Type definition for booking data from public.bookings
type BookingData = {
  id: string;
  species: string | null;
  head_count: number | null;
  requested_kill_date: string | null;
  status: string | null;
  fill_rate: number | null;
  plant_id: string | null;
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

const formatFillRate = (fillRate: number | null) => {
  if (fillRate === null || fillRate === undefined) return '-';
  return `${fillRate.toFixed(1)}%`;
};

const getStatusVariant = (status: string): "confirmed" | "requested" | "changed" | "cancelled" | "secondary" => {
  switch (status) {
    case "confirmed": return "confirmed";
    case "requested":
    case "pending":
    case "low":       return "requested";
    case "changed":   return "changed";
    case "cancelled": return "cancelled";
    default:          return "secondary";
  }
};

/** Left border colour on table rows — mirrors Kill Plan confidence colours */
const confidenceRowStyle = (status: string | null): string => {
  switch ((status || "").toLowerCase()) {
    case "confirmed":   return "border-l-4 border-l-blue-500";
    case "high":        return "border-l-4 border-l-emerald-500";
    case "medium":      return "border-l-4 border-l-amber-500";
    case "low":
    case "pending":
    case "requested":   return "border-l-4 border-l-yellow-400";
    case "cancelled":   return "border-l-4 border-l-red-400 opacity-60";
    default:            return "border-l-4 border-l-gray-300";
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
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [selectedProcessor, setSelectedProcessor] = useState("all");
  const [selectedPlant, setSelectedPlant] = useState("all");
  const [plants, setPlants] = useState<any[]>([]);
  const [processors, setProcessors] = useState<string[]>([]);

  // Fetch plants and processors
  useEffect(() => {
    const fetchPlants = async () => {
      const { data } = await supabase
        .from('plants')
        .select('*')
        .order('plant_name');
      if (data) {
        setPlants(data);
        const uniqueProcessors = [...new Set(data.map(p => p.company_name).filter(Boolean))] as string[];
        setProcessors(uniqueProcessors);
      }
    };
    fetchPlants();
  }, []);

  // Reset plant selection when processor changes
  useEffect(() => {
    setSelectedPlant("all");
  }, [selectedProcessor]);

  // Filter plants based on selected processor
  const filteredPlants = selectedProcessor === "all" 
    ? plants 
    : plants.filter(p => p.company_name === selectedProcessor);

  // Get plant IDs for the current filter
  const getFilteredPlantIds = () => {
    if (selectedPlant !== "all") {
      return [selectedPlant];
    }
    if (selectedProcessor !== "all") {
      return filteredPlants.map(p => p.id);
    }
    return plants.map(p => p.id);
  };

  useEffect(() => {
    if (plants.length > 0) {
      fetchBookings();
    }
  }, [selectedProcessor, selectedPlant, plants]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const plantIds = getFilteredPlantIds();
      
      let query = supabase
        .from('bookings')
        .select('id, species, head_count, requested_kill_date, status, fill_rate, plant_id')
        .order('requested_kill_date', { ascending: true });

      if (plantIds.length > 0) {
        if (plantIds.length === 1) {
          query = query.eq('plant_id', plantIds[0]);
        } else {
          query = query.in('plant_id', plantIds);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching bookings:', error);
        toast({
          title: "Error",
          description: "Failed to fetch bookings. Please try again.",
          variant: "destructive",
        });
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

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.species?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Confidence summary counts
  const confidenceCounts = {
    Confirmed:   bookings.filter(b => (b.status || "").toLowerCase() === "confirmed").length,
    High:        bookings.filter(b => (b.status || "").toLowerCase() === "high").length,
    Medium:      bookings.filter(b => (b.status || "").toLowerCase() === "medium").length,
    Low:         bookings.filter(b => ["low","pending","requested"].includes((b.status||"").toLowerCase())).length,
    Placeholder: bookings.filter(b => !b.status || (b.status||"").toLowerCase() === "placeholder").length,
  };

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

        {/* Confidence summary strip */}
        {!loading && bookings.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Confirmed",   count: confidenceCounts.Confirmed,   colour: "bg-blue-500",    text: "text-blue-700",    bg: "bg-blue-50   border-blue-200" },
              { label: "High",        count: confidenceCounts.High,        colour: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
              { label: "Medium",      count: confidenceCounts.Medium,      colour: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50  border-amber-200" },
              { label: "Low",         count: confidenceCounts.Low,         colour: "bg-yellow-400",  text: "text-yellow-700",  bg: "bg-yellow-50 border-yellow-200" },
              { label: "Placeholder", count: confidenceCounts.Placeholder, colour: "bg-gray-300",    text: "text-gray-600",    bg: "bg-gray-50   border-gray-200" },
            ].map(({ label, count, colour, text, bg }) => (
              <div key={label} className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${bg}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${colour}`} />
                <span className={`font-medium ${text}`}>{label}</span>
                <span className={`font-bold ${text}`}>{count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <Select value={selectedProcessor} onValueChange={setSelectedProcessor}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select processor" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All Processors</SelectItem>
                  {processors.map((processor) => (
                    <SelectItem key={processor} value={processor}>
                      {processor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select plant" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All Plants</SelectItem>
                  {filteredPlants.map((plant) => (
                    <SelectItem key={plant.id} value={plant.id}>
                      {plant.plant_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                placeholder="Search by species..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Confidence" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="placeholder">Placeholder</SelectItem>
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
                    <th className="text-left py-3 px-3 text-sm font-medium">Species</th>
                    <th className="text-right py-3 px-3 text-sm font-medium">Head Count</th>
                    <th className="text-left py-3 px-3 text-sm font-medium">Status</th>
                    <th className="text-left py-3 px-3 text-sm font-medium">Kill Date</th>
                    <th className="text-right py-3 px-3 text-sm font-medium">Fill Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        Loading bookings...
                      </td>
                    </tr>
                  ) : filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No bookings found
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((booking) => (
                      <tr key={booking.id} className={`table-row-hover border-b border-border transition-colors ${confidenceRowStyle(booking.status)}`}>
                        <td className="py-3 px-3 text-sm font-medium font-mono">{booking.id.slice(-8).toUpperCase()}</td>
                        <td className="py-3 px-3">
                          <Badge variant={getSpeciesVariant(booking.species || "")} className="capitalize">
                            {booking.species || "—"}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-sm text-right table-cell-numeric">{booking.head_count || '-'}</td>
                        <td className="py-3 px-3">
                          <Badge variant={getStatusVariant(booking.status || 'unknown')}>
                            {booking.status || 'unknown'}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-sm">
                          {booking.requested_kill_date ? new Date(booking.requested_kill_date).toLocaleDateString('en-AU') : '-'}
                        </td>
                        <td className="py-3 px-3 text-sm text-right table-cell-numeric">
                          {booking.fill_rate != null ? `${booking.fill_rate.toFixed(1)}%` : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Calendar View */}
        <BookingCalendar />

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