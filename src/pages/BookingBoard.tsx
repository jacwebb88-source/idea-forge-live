import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Search, Plus, Filter, Download } from "lucide-react";
import { useState } from "react";

// Mock data for bookings
const mockBookings = [
  {
    id: "B001",
    plant: "JBS - Dinmore (test)",
    species: "beef",
    supplier: "Murray Valley Livestock",
    lot: "MVL-2025-001",
    headCount: 150,
    requestedDate: "2025-08-18",
    window: "06:00 - 09:00",
    status: "confirmed",
    estLiveWt: 550,
    estHSCW: 320,
  },
  {
    id: "B002", 
    plant: "Teys - Beenleigh (test)",
    species: "lamb",
    supplier: "Southern Pastoral Co",
    lot: "SPC-2025-089",
    headCount: 300,
    requestedDate: "2025-08-19",
    window: "07:00 - 10:00",
    status: "requested",
    estLiveWt: 45,
    estHSCW: 22,
  },
  {
    id: "B003",
    plant: "NH Foods - Oakey (test)",
    species: "beef",
    supplier: "Queensland Cattle Co",
    lot: "QCC-2025-034",
    headCount: 200,
    requestedDate: "2025-08-20",
    window: "05:30 - 08:30",
    status: "changed",
    estLiveWt: 580,
    estHSCW: 340,
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed": return "bg-green-100 text-green-800 border-green-200";
    case "requested": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "changed": return "bg-orange-100 text-orange-800 border-orange-200";
    case "cancelled": return "bg-red-100 text-red-800 border-red-200";
    default: return "bg-muted text-muted-foreground";
  }
};

export default function BookingBoard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [plantFilter, setPlantFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredBookings = mockBookings.filter(booking => {
    const matchesSearch = booking.lot.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlant = plantFilter === "all" || booking.plant === plantFilter;
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    
    return matchesSearch && matchesPlant && matchesStatus;
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
                    placeholder="Search by lot ID or supplier..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={plantFilter} onValueChange={setPlantFilter}>
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
            <CardTitle>Current Bookings ({filteredBookings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Booking ID</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Plant</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Species</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Supplier</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Lot ID</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Head Count</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Kill Date</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Window</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-2 text-sm font-medium">{booking.id}</td>
                      <td className="py-3 px-2 text-sm">{booking.plant}</td>
                      <td className="py-3 px-2">
                        <Badge variant="outline" className="capitalize">
                          {booking.species}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-sm">{booking.supplier}</td>
                      <td className="py-3 px-2 text-sm font-mono">{booking.lot}</td>
                      <td className="py-3 px-2 text-sm">{booking.headCount}</td>
                      <td className="py-3 px-2 text-sm">{booking.requestedDate}</td>
                      <td className="py-3 px-2 text-sm">{booking.window}</td>
                      <td className="py-3 px-2">
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">Edit</Button>
                          <Button variant="ghost" size="sm">View</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
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