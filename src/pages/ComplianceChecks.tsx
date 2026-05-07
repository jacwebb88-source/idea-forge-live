import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ComplianceCheck {
  id: number;
  booking_id: string | null;
  nlis_status: string | null;
  nvd_status: string | null;
  pic_status: string | null;
  checked_at: string | null;
  checked_by: string | null;
  notes: string | null;
}

interface BookingDetails {
  head_count: number | null;
  species: string | null;
  requested_kill_date: string | null;
}

export default function ComplianceChecks() {
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'missing' | 'pending' | 'ok'>('all');
  const [selectedCheck, setSelectedCheck] = useState<ComplianceCheck | null>(null);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchComplianceChecks = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('compliance_checks')
        .select('*, bookings!inner(plant_id)')
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

  const handleRowClick = async (check: ComplianceCheck) => {
    if (!check.booking_id) return;
    
    setSelectedCheck(check);
    setDialogOpen(true);
    setLoadingBooking(true);
    
    const { data, error } = await supabase
      .from('bookings')
      .select('head_count, species, requested_kill_date')
      .eq('id', check.booking_id)
      .single();
    
    if (error) {
      console.error('Error fetching booking details:', error);
      setBookingDetails(null);
    } else {
      setBookingDetails(data);
    }
    
    setLoadingBooking(false);
  };

  /** Returns true if any check field is 'missing' */
  const hasMissing = (c: ComplianceCheck) =>
    c.nlis_status === "missing" || c.nvd_status === "missing" || c.pic_status === "missing";

  /** Returns true if any check field is 'pending' (and none missing) */
  const hasPending = (c: ComplianceCheck) =>
    !hasMissing(c) && (c.nlis_status === "pending" || c.nvd_status === "pending" || c.pic_status === "pending");

  /** Returns true if all three are 'ok' or 'complete' */
  const isAllOk = (c: ComplianceCheck) =>
    ["ok","complete"].includes((c.nlis_status||"").toLowerCase()) &&
    ["ok","complete"].includes((c.nvd_status||"").toLowerCase()) &&
    ["ok","complete"].includes((c.pic_status||"").toLowerCase());

  const filteredChecks = checks.filter((c) => {
    if (statusFilter === "missing") return hasMissing(c);
    if (statusFilter === "pending") return hasPending(c);
    if (statusFilter === "ok")      return isAllOk(c);
    return true;
  });

  const missingCount = checks.filter(hasMissing).length;
  const pendingCount = checks.filter(hasPending).length;
  const okCount      = checks.filter(isAllOk).length;

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

        {/* Compliance summary strip */}
        {!loading && (
          <div className="flex flex-wrap gap-3">
            <div
              className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer transition-all ${statusFilter === "missing" ? "ring-2 ring-red-400" : ""} bg-red-50 border-red-200`}
              onClick={() => setStatusFilter(s => s === "missing" ? "all" : "missing")}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              <span className="font-medium text-red-700">Missing</span>
              <span className="font-bold text-red-700">{missingCount}</span>
            </div>
            <div
              className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer transition-all ${statusFilter === "pending" ? "ring-2 ring-amber-400" : ""} bg-amber-50 border-amber-200`}
              onClick={() => setStatusFilter(s => s === "pending" ? "all" : "pending")}
            >
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-medium text-amber-700">Pending</span>
              <span className="font-bold text-amber-700">{pendingCount}</span>
            </div>
            <div
              className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer transition-all ${statusFilter === "ok" ? "ring-2 ring-emerald-400" : ""} bg-emerald-50 border-emerald-200`}
              onClick={() => setStatusFilter(s => s === "ok" ? "all" : "ok")}
            >
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-medium text-emerald-700">All clear</span>
              <span className="font-bold text-emerald-700">{okCount}</span>
            </div>
            {statusFilter !== "all" && (
              <button
                className="text-xs text-muted-foreground underline self-center"
                onClick={() => setStatusFilter("all")}
              >
                Clear filter
              </button>
            )}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>
              {loading ? "Loading…" : `Compliance Checks (${filteredChecks.length}${statusFilter !== "all" ? ` · filtered` : ""})`}
            </CardTitle>
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
                    <TableHead>NLIS</TableHead>
                    <TableHead>NVD</TableHead>
                    <TableHead>PIC</TableHead>
                    <TableHead>Overall</TableHead>
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
                  {filteredChecks.map((check) => (
                    <TableRow
                      key={check.id}
                      onClick={() => handleRowClick(check)}
                      className={`${check.booking_id ? "cursor-pointer" : ""} ${hasMissing(check) ? "bg-red-50/60 dark:bg-red-950/20 border-l-4 border-l-red-400" : hasPending(check) ? "border-l-4 border-l-amber-400" : isAllOk(check) ? "border-l-4 border-l-emerald-400" : ""}`}
                    >
                      <TableCell className="font-mono text-xs">{check.booking_id ? check.booking_id.slice(-8).toUpperCase() : "—"}</TableCell>
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
                      <TableCell>
                        {hasMissing(check) ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 border border-red-200 rounded-full px-2 py-0.5">
                            <AlertTriangle className="h-3 w-3" /> Missing
                          </span>
                        ) : hasPending(check) ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        ) : isAllOk(check) ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full px-2 py-0.5">
                            <CheckCircle className="h-3 w-3" /> Clear
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {check.checked_at
                          ? format(new Date(check.checked_at), 'dd MMM yyyy HH:mm')
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Booking Details Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
            </DialogHeader>
            {loadingBooking ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : bookingDetails ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Booking ID</p>
                    <p className="text-sm font-mono">{selectedCheck?.booking_id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Head Count</p>
                    <p className="text-sm">{bookingDetails.head_count || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Species</p>
                    <p className="text-sm">{bookingDetails.species || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Requested Kill Date</p>
                    <p className="text-sm">
                      {bookingDetails.requested_kill_date 
                        ? format(new Date(bookingDetails.requested_kill_date), 'MMM d, yyyy')
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No booking details found</p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
