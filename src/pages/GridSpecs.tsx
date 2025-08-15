import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Plus, Search, Download, Edit, Eye } from "lucide-react";
import { useState } from "react";

// Mock grid specs data
const mockGridSpecs = [
  {
    id: "GS001",
    plant: "JBS - Dinmore (test)",
    species: "beef",
    version: 1,
    effectiveFrom: "2025-01-01",
    effectiveTo: null,
    minHSCW: 200,
    maxHSCW: 380,
    fatCode: "P8 2-4mm",
    dentition: "0-2 teeth",
    notes: "Standard beef grid for export",
  },
  {
    id: "GS002",
    plant: "Teys - Beenleigh (test)",
    species: "lamb",
    version: 2,
    effectiveFrom: "2025-02-01",
    effectiveTo: null,
    minHSCW: 16,
    maxHSCW: 32,
    fatCode: "GR 6-15mm",
    dentition: "Milk teeth",
    notes: "Premium lamb specifications",
  },
  {
    id: "GS003",
    plant: "NH Foods - Oakey (test)",
    species: "beef",
    version: 1,
    effectiveFrom: "2025-01-15",
    effectiveTo: "2025-07-31",
    minHSCW: 220,
    maxHSCW: 350,
    fatCode: "P8 3-5mm",
    dentition: "0-4 teeth",
    notes: "Domestic market specifications",
  },
  {
    id: "GS004",
    plant: "Greenham - Smithton (test)",
    species: "mutton",
    version: 1,
    effectiveFrom: "2025-03-01",
    effectiveTo: null,
    minHSCW: 20,
    maxHSCW: 40,
    fatCode: "GR 8-20mm",
    dentition: "4+ teeth",
    notes: "Mature sheep processing grid",
  },
];

export default function GridSpecs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [plantFilter, setPlantFilter] = useState("all");
  const [speciesFilter, setSpeciesFilter] = useState("all");

  const filteredSpecs = mockGridSpecs.filter(spec => {
    const matchesSearch = spec.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         spec.plant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         spec.notes.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlant = plantFilter === "all" || spec.plant === plantFilter;
    const matchesSpecies = speciesFilter === "all" || spec.species === speciesFilter;
    
    return matchesSearch && matchesPlant && matchesSpecies;
  });

  const getVersionBadge = (spec: any) => {
    if (spec.effectiveTo) {
      return <Badge variant="secondary">v{spec.version} (Expired)</Badge>;
    }
    return <Badge variant="default">v{spec.version} (Current)</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Grid Specifications</h1>
            <p className="text-muted-foreground">Manage plant and species specifications</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Grid Spec
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by ID, plant, or notes..."
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
                  <SelectItem value="Greenham - Smithton (test)">Greenham - Smithton</SelectItem>
                </SelectContent>
              </Select>
              <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
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

        {/* Grid Specifications List */}
        <div className="grid gap-4">
          {filteredSpecs.map((spec) => (
            <Card key={spec.id} className="transition-country hover:shadow-country">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{spec.id}</CardTitle>
                      <p className="text-sm text-muted-foreground">{spec.plant}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getVersionBadge(spec)}
                    <Badge variant="outline" className="capitalize">
                      {spec.species}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">HSCW Range</div>
                    <div className="text-lg font-semibold">{spec.minHSCW} - {spec.maxHSCW} kg</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Fat Code</div>
                    <div className="text-lg font-semibold">{spec.fatCode}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Dentition</div>
                    <div className="text-lg font-semibold">{spec.dentition}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Effective</div>
                    <div className="text-sm">
                      {spec.effectiveFrom}
                      {spec.effectiveTo && ` to ${spec.effectiveTo}`}
                    </div>
                  </div>
                </div>
                
                {spec.notes && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-muted-foreground mb-1">Notes</div>
                    <div className="text-sm">{spec.notes}</div>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSpecs.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground mb-2">No grid specifications found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search criteria or create a new grid specification.
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create New Grid Spec
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}