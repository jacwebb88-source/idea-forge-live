import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Filter, 
  Plus,
  MapPin,
  Calendar,
  Truck,
  Eye
} from "lucide-react";

const animalData = [
  {
    id: "ANM-001",
    farm: "Green Valley Farm",
    type: "Cattle",
    breed: "Angus",
    count: 15,
    weight: "550kg avg",
    arrival: "2024-01-27 06:00",
    status: "arrived",
    transport: "TRK-001",
    slot: "A-1",
  },
  {
    id: "ANM-002", 
    farm: "Highland Ranch",
    type: "Cattle",
    breed: "Hereford",
    count: 22,
    weight: "520kg avg",
    arrival: "2024-01-27 08:30",
    status: "processing",
    transport: "TRK-002",
    slot: "A-2",
  },
  {
    id: "ANM-003",
    farm: "Meadow Creek",
    type: "Cattle", 
    breed: "Charolais",
    count: 18,
    weight: "580kg avg",
    arrival: "2024-01-27 11:00",
    status: "scheduled",
    transport: "TRK-003",
    slot: "B-1",
  },
  {
    id: "ANM-004",
    farm: "Pine Ridge Farm",
    type: "Sheep",
    breed: "Merino",
    count: 45,
    weight: "65kg avg",
    arrival: "2024-01-27 14:00",
    status: "scheduled",
    transport: "TRK-004",
    slot: "B-2",
  },
  {
    id: "ANM-005",
    farm: "Oak Hill Ranch",
    type: "Cattle",
    breed: "Simmental",
    count: 20,
    weight: "600kg avg",
    arrival: "2024-01-27 16:30",
    status: "scheduled",
    transport: "TRK-005",
    slot: "A-3",
  },
];

const Animals = () => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "arrived": return "bg-blue-100 text-blue-800";
      case "processing": return "bg-green-100 text-green-800";
      case "scheduled": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Animal Tracking</h1>
            <p className="text-muted-foreground mt-1">
              Monitor livestock arrivals, processing, and inventory
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Batch
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by farm, transport, or batch ID..." 
                    className="pl-10"
                  />
                </div>
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Animal Tracking Table */}
        <Card>
          <CardHeader>
            <CardTitle>Current Livestock Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-medium text-muted-foreground">Batch ID</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Farm Origin</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Animals</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Weight</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Arrival</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Slot</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {animalData.map((batch) => (
                    <tr key={batch.id} className="border-b border-border hover:bg-muted/30 transition-country">
                      <td className="p-4">
                        <div className="font-medium text-foreground">{batch.id}</div>
                        <div className="text-sm text-muted-foreground">{batch.transport}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <div>
                            <div className="font-medium text-foreground">{batch.farm}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-foreground">{batch.count} {batch.type}</div>
                        <div className="text-sm text-muted-foreground">{batch.breed}</div>
                      </td>
                      <td className="p-4">
                        <span className="text-foreground font-medium">{batch.weight}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <div>
                            <div className="text-sm text-foreground">{batch.arrival.split(' ')[1]}</div>
                            <div className="text-xs text-muted-foreground">{batch.arrival.split(' ')[0]}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={getStatusColor(batch.status)}>
                          {batch.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">{batch.slot}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Animals;