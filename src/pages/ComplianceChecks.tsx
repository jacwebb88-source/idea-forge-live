import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface ComplianceCheck {
  id: number;
  booking_id: string | null;
  nlis_status: string | null;
  nvd_status: string | null;
  pic_status: string | null;
  checked_at: string | null;
  notes: string | null;
}

export default function ComplianceChecks() {
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComplianceChecks = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('Compliance_checks')
        .select('*')
        .order('checked_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching compliance checks:', error);
      } else if (data) {
        setChecks(data);
      }
      setLoading(false);
    };

    fetchComplianceChecks();
  }, []);

  const getStatusBadgeVariant = (status: string | null): "confirmed" | "cancelled" | "secondary" => {
    if (!status) return "secondary";
    switch (status.toLowerCase()) {
      case "pass":
      case "approved":
      case "compliant":
        return "confirmed";
      case "fail":
      case "rejected":
      case "non-compliant":
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
            <h1 className="text-3xl font-bold text-foreground">Compliance Checks</h1>
            <p className="text-muted-foreground">Monitor NLIS, NVD, and PIC compliance status</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Compliance Checks</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : checks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No compliance checks found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Booking ID</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">NLIS Status</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">NVD Status</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">PIC Status</th>
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Checked At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checks.map((check) => (
                      <tr key={check.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-2 font-mono text-sm">{check.booking_id || "—"}</td>
                        <td className="py-3 px-2">
                          <Badge variant={getStatusBadgeVariant(check.nlis_status)}>
                            {check.nlis_status || "Pending"}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant={getStatusBadgeVariant(check.nvd_status)}>
                            {check.nvd_status || "Pending"}
                          </Badge>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant={getStatusBadgeVariant(check.pic_status)}>
                            {check.pic_status || "Pending"}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {check.checked_at 
                            ? format(new Date(check.checked_at), 'MMM d, yyyy HH:mm')
                            : "—"}
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
