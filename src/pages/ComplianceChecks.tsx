import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchComplianceChecks = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('compliance_checks')
        .select('*')
        .order('checked_at', { ascending: sortOrder === 'asc' });
      
      if (error) {
        console.error('Error fetching compliance checks:', error);
      } else if (data) {
        setChecks(data);
      }
      setLoading(false);
    };

    fetchComplianceChecks();
  }, [sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>NLIS Status</TableHead>
                    <TableHead>NVD Status</TableHead>
                    <TableHead>PIC Status</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleSortOrder}
                        className="flex items-center gap-1 hover:bg-transparent"
                      >
                        Checked At
                        <ArrowUpDown className="h-4 w-4" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checks.map((check) => (
                    <TableRow key={check.id}>
                      <TableCell className="font-mono text-sm">{check.booking_id || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(check.nlis_status)}>
                          {check.nlis_status || "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(check.nvd_status)}>
                          {check.nvd_status || "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(check.pic_status)}>
                          {check.pic_status || "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {check.checked_at 
                          ? format(new Date(check.checked_at), 'MMM d, yyyy HH:mm')
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
