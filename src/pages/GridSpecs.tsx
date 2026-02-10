import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Plus, Search, Download, Edit, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type GridSpec = Tables<'gridspecs'>;

export default function GridSpecs() {
  const [gridSpecs, setGridSpecs] = useState<GridSpec[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [plantFilter, setPlantFilter] = useState("all");
  const [speciesFilter, setSpeciesFilter] = useState("all");

  useEffect(() => {
    fetchGridSpecs();
  }, []);

  const fetchGridSpecs = async () => {
    try {
      const { data, error } = await supabase
        .from('gridspecs')
        .select('*')
        .order('species', { ascending: true })
        .order('version', { ascending: false });

      if (error) throw error;
      setGridSpecs(data || []);
    } catch (error) {
      console.error('Error fetching grid specs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSpecs = gridSpecs.filter(spec => {
    const matchesSearch = spec.id?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
                         spec.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         spec.species?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecies = speciesFilter === "all" || spec.species === speciesFilter;
    
    return matchesSearch && matchesSpecies;
  });

  const getVersionBadge = (spec: GridSpec) => {
    if (spec.effective_to) {
      return <Badge variant="secondary">v{spec.version} (Expired)</Badge>;
    }
    return <Badge variant="default">v{spec.version} (Current)</Badge>;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading grid specifications...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
                  <SelectItem value="pilot-processor">Pilot Processor</SelectItem>
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
                      <p className="text-sm text-muted-foreground">Plant ID: {spec.plant_id}</p>
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
                    <div className="text-lg font-semibold">{spec.min_hscw} - {spec.max_hscw} kg</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Fat Code</div>
                    <div className="text-lg font-semibold">{spec.fat_code}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Dentition</div>
                    <div className="text-lg font-semibold">{spec.dentition_or_age}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Effective</div>
                    <div className="text-sm">
                      {spec.effective_from}
                      {spec.effective_to && ` to ${spec.effective_to}`}
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

        {/* Demo Data Notice */}
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p className="font-medium">📝 Demo Data</p>
              <p>This is sample grid specification data for demonstration purposes. Production would show real grid specs with version control.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}