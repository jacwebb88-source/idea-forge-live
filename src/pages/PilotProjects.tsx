import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Pilot {
  id: number;
  processor_id: string | null;
  partner_name: string | null;
  funding_source: string | null;
  status: string | null;
  start_date: string | null;
  created_at: string;
}

export default function PilotProjects() {
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPilots = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('pilots')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching pilots:', error);
      } else if (data) {
        setPilots(data);
      }
      setLoading(false);
    };

    fetchPilots();
  }, []);

  const getStatusBadgeVariant = (status: string | null): "confirmed" | "cancelled" | "secondary" => {
    if (!status) return "secondary";
    switch (status.toLowerCase()) {
      case "active":
      case "completed":
        return "confirmed";
      case "cancelled":
      case "on hold":
        return "cancelled";
      default:
        return "secondary";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pilot Projects</h1>
            <p className="text-muted-foreground">Overview of all pilot projects and partnerships</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Pilots</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : pilots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pilot projects found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Processor</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Partner Name</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Funding Source</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Start Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pilots.map((pilot) => (
                      <tr key={pilot.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-2">{pilot.processor_id || "—"}</td>
                        <td className="py-3 px-2 font-medium">{pilot.partner_name || "—"}</td>
                        <td className="py-3 px-2">{pilot.funding_source || "—"}</td>
                        <td className="py-3 px-2">
                          <Badge variant={getStatusBadgeVariant(pilot.status)}>
                            {pilot.status || "Unknown"}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {pilot.start_date ? new Date(pilot.start_date).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
