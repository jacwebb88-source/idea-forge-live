import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Search, MapPin, ShieldCheck, Calendar, TrendingUp, Star } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Plant = Tables<"plants"> & {
  activeBookings?: number;
  thisWeekHead?: number;
  totalHead?: number;
};

const licenceColour = (licence: string | null) => {
  switch ((licence || "").toLowerCase()) {
    case "export":     return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "domestic":   return "bg-blue-50 text-blue-700 border-blue-200";
    case "wholesale":  return "bg-purple-50 text-purple-700 border-purple-200";
    default:           return "bg-gray-50 text-gray-600 border-gray-200";
  }
};

const speciesColour = (sp: string) => {
  switch (sp.toLowerCase()) {
    case "beef":
    case "cattle": return "bg-red-50 text-red-700 border-red-200";
    case "lamb":   return "bg-blue-50 text-blue-700 border-blue-200";
    case "mutton":
    case "sheep":  return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "goat":   return "bg-amber-50 text-amber-700 border-amber-200";
    default:       return "bg-muted text-muted-foreground border-border";
  }
};

export default function Plants() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      const { data: plantData } = await supabase
        .from("plants")
        .select("*")
        .order("plant_name");

      if (!plantData) { setLoading(false); return; }

      // Fetch booking stats per plant
      const today = format(new Date(), "yyyy-MM-dd");
      const weekEnd = format(addDays(new Date(), 7), "yyyy-MM-dd");

      const { data: bookingData } = await supabase
        .from("bookings")
        .select("plant_id, head_count, requested_kill_date, status")
        .neq("status", "cancelled");

      const bookingMap: Record<string, { active: number; thisWeekHead: number; totalHead: number }> = {};
      (bookingData || []).forEach((b: any) => {
        if (!b.plant_id) return;
        if (!bookingMap[b.plant_id]) bookingMap[b.plant_id] = { active: 0, thisWeekHead: 0, totalHead: 0 };
        bookingMap[b.plant_id].active += 1;
        bookingMap[b.plant_id].totalHead += b.head_count || 0;
        if (b.requested_kill_date && b.requested_kill_date >= today && b.requested_kill_date <= weekEnd) {
          bookingMap[b.plant_id].thisWeekHead += b.head_count || 0;
        }
      });

      setPlants(plantData.map((p: any) => ({
        ...p,
        activeBookings: bookingMap[p.id]?.active ?? 0,
        thisWeekHead:   bookingMap[p.id]?.thisWeekHead ?? 0,
        totalHead:      bookingMap[p.id]?.totalHead ?? 0,
      })));

      setLoading(false);
    };
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    if (!searchTerm) return plants;
    const q = searchTerm.toLowerCase();
    return plants.filter(p =>
      p.plant_name.toLowerCase().includes(q) ||
      (p.company_name || "").toLowerCase().includes(q) ||
      (p.state || "").toLowerCase().includes(q)
    );
  }, [plants, searchTerm]);

  const totalActiveBookings = plants.reduce((sum, p) => sum + (p.activeBookings || 0), 0);
  const totalHead = plants.reduce((sum, p) => sum + (p.totalHead || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Processing Plants</h1>
          <p className="text-muted-foreground">Registered abattoirs and processing facilities</p>
        </div>

        {/* Summary strip */}
        {!loading && plants.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Plants</p>
                <p className="text-2xl font-bold">{plants.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Active bookings</p>
                <p className="text-2xl font-bold">{totalActiveBookings}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Total head on book</p>
                <p className="text-2xl font-bold">{totalHead.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">This week (next 7 days)</p>
                <p className="text-2xl font-bold">
                  {plants.reduce((sum, p) => sum + (p.thisWeekHead || 0), 0).toLocaleString()} hd
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search plants, company, state…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Plants grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-56 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No plants found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(plant => (
              <Card key={plant.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <CardTitle className="text-base leading-tight truncate flex items-center gap-1.5">
                          {plant.plant_name}
                          {plant.is_default && (
                            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 flex-shrink-0" aria-label="Default plant" />
                          )}
                        </CardTitle>
                        {plant.company_name && (
                          <p className="text-xs text-muted-foreground truncate">{plant.company_name}</p>
                        )}
                      </div>
                    </div>
                    {plant.licence_type && (
                      <span className={`shrink-0 text-xs font-medium border rounded-full px-2 py-0.5 capitalize ${licenceColour(plant.licence_type)}`}>
                        {plant.licence_type}
                      </span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {/* Location */}
                  {plant.state && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span>{plant.state}</span>
                    </div>
                  )}

                  {/* Licence */}
                  {plant.licence_type && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span>{plant.licence_type} licence</span>
                    </div>
                  )}

                  {/* Species supported */}
                  {plant.species_supported && plant.species_supported.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Species supported</p>
                      <div className="flex flex-wrap gap-1">
                        {plant.species_supported.map((sp, i) => (
                          <span key={i} className={`text-xs font-medium border rounded px-1.5 py-0.5 capitalize ${speciesColour(sp)}`}>
                            {sp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Booking stats */}
                  <div className="pt-2 border-t border-border grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Bookings</p>
                        <p className="text-sm font-semibold">{plant.activeBookings ?? 0}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">This week</p>
                        <p className="text-sm font-semibold">
                          {(plant.thisWeekHead || 0) > 0
                            ? `${(plant.thisWeekHead || 0).toLocaleString()} hd`
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
