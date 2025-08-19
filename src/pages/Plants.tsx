import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Building2, Plus, Search, Edit, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Plant = Tables<'plants'>;

export default function Plants() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchPlants();
  }, []);

  const fetchPlants = async () => {
    try {
      const { data, error } = await supabase
        .from('plants')
        .select('*')
        .order('plant_name');

      if (error) {
        console.error('Error fetching plants:', error);
        return;
      }

      setPlants(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlants = plants.filter(plant =>
    plant.plant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plant.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Plants</h1>
            <p className="text-muted-foreground">Manage processing plant information</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Plant
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search plants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Plants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              Loading plants...
            </div>
          ) : filteredPlants.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No plants found
            </div>
          ) : (
            filteredPlants.map((plant) => (
              <Card key={plant.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{plant.plant_name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Company</p>
                      <p className="text-sm">{plant.company_name || 'N/A'}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Location</p>
                      <p className="text-sm">{plant.state || 'N/A'}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground">License Type</p>
                      <p className="text-sm">{plant.licence_type || 'N/A'}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Species Supported</p>
                      <div className="flex flex-wrap gap-1">
                        {plant.species_supported && plant.species_supported.length > 0 ? (
                          plant.species_supported.map((species, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {species}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">None specified</span>
                        )}
                      </div>
                    </div>

                    {plant.is_default && (
                      <Badge className="bg-primary/10 text-primary">Default Plant</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Demo Data Notice */}
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p className="font-medium">Demo Data</p>
              <p>This is sample plant data for demonstration purposes</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}