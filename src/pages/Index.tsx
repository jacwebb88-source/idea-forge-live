import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ScheduleOverview } from "@/components/dashboard/ScheduleOverview";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { format, addDays, differenceInDays, parseISO } from "date-fns";
import {
  Users,
  Calendar,
  Truck,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Activity,
  BarChart3,
  Shield,
  Bell,
  Clock
} from "lucide-react";

type UnconfirmedBooking = {
  id: string;
  supplier_id: string | null;
  head_count: number | null;
  species: string | null;
  requested_kill_date: string | null;
  status: string | null;
  supplierName?: string;
  daysUntilKill: number;
};

const Index = () => {
  const { toast } = useToast();
  const [complianceOk, setComplianceOk] = useState<number | null>(null);
  const [missingCompliance, setMissingCompliance] = useState<number>(0);
  const [pendingCompliance, setPendingCompliance] = useState<number>(0);
  const [loadingCompliance, setLoadingCompliance] = useState(true);
  const [unconfirmedBookings, setUnconfirmedBookings] = useState<UnconfirmedBooking[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(true);

  // Fetch unconfirmed bookings due in the next 14 days
  useEffect(() => {
    const fetchReminders = async () => {
      setLoadingReminders(true);
      const today = new Date();
      const cutoff = addDays(today, 14);
      const todayStr  = format(today,  "yyyy-MM-dd");
      const cutoffStr = format(cutoff, "yyyy-MM-dd");

      const { data: bks } = await supabase
        .from("bookings")
        .select("id, supplier_id, head_count, species, requested_kill_date, status")
        .gte("requested_kill_date", todayStr)
        .lte("requested_kill_date", cutoffStr)
        .in("status", ["placeholder", "pending", "requested", "low"]);

      if (!bks || bks.length === 0) {
        setUnconfirmedBookings([]);
        setLoadingReminders(false);
        return;
      }

      // Enrich with supplier names
      const supplierIds = Array.from(
        new Set((bks as any[]).map((b) => b.supplier_id).filter(Boolean))
      ) as string[];

      let supplierMap: Record<string, string> = {};
      if (supplierIds.length) {
        const { data: sups } = await supabase
          .from("suppliers")
          .select("id, name")
          .in("id", supplierIds);
        (sups as any[] | null)?.forEach((s) => (supplierMap[s.id] = s.name));
      }

      const enriched: UnconfirmedBooking[] = (bks as any[]).map((b) => ({
        ...b,
        supplierName: supplierMap[b.supplier_id] || "Unknown supplier",
        daysUntilKill: b.requested_kill_date
          ? differenceInDays(parseISO(b.requested_kill_date), today)
          : 99,
      }));

      // Sort by most urgent first
      enriched.sort((a, b) => a.daysUntilKill - b.daysUntilKill);
      setUnconfirmedBookings(enriched);
      setLoadingReminders(false);
    };
    fetchReminders();
  }, []);

  useEffect(() => {
    const fetchComplianceData = async () => {
      setLoadingCompliance(true);
      
      const { data, error } = await (supabase as any)
        .from('compliance_checks')
        .select('nvd_status, nlis_status, pic_status');

      if (error) {
        console.error('Error fetching compliance data:', error);
        setComplianceOk(null);
        setMissingCompliance(0);
      } else if (data && data.length > 0) {
        const okCount = data.filter((c: any) => 
          c.nvd_status === 'ok' && 
          c.nlis_status === 'ok' && 
          c.pic_status === 'ok'
        ).length;
        
        const missingCount = data.filter((c: any) => 
          c.nvd_status === 'missing' || 
          c.nlis_status === 'missing' || 
          c.pic_status === 'missing'
        ).length;
        
        const pendingCount = data.filter((c: any) => 
          c.nvd_status === 'pending' || 
          c.nlis_status === 'pending' || 
          c.pic_status === 'pending'
        ).length;
        
        setComplianceOk((okCount / data.length) * 100);
        setMissingCompliance(missingCount);
        setPendingCompliance(pendingCount);
      } else {
        setComplianceOk(null);
        setMissingCompliance(0);
        setPendingCompliance(0);
      }
      
      setLoadingCompliance(false);
    };

    fetchComplianceData();
  }, []);

  const handleConfirmSlot = () => {
    toast({
      title: "Booking locked in",
      description: "The booking slot has been confirmed and locked.",
    });
  };

  const handleChangeRequest = () => {
    toast({
      title: "Window updated", 
      description: "The booking window has been successfully updated.",
    });
  };

  const handleSendGrid = () => {
    toast({
      title: "ETA received",
      description: "Grid specifications sent and ETA confirmation received.",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Today's Schedule</h1>
            <p className="text-muted-foreground mt-1">
              Pilot console demonstrating booking, compliance, and capacity visibility.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="flex items-center gap-2" onClick={handleConfirmSlot}>
              <CheckCircle className="h-4 w-4" />
              Confirm Slot
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={handleChangeRequest}>
              <Calendar className="h-4 w-4" />
              Change Request
            </Button>
            <Button className="flex items-center gap-2" onClick={handleSendGrid}>
              <BarChart3 className="h-4 w-4" />
              Send Grid
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Fill Rate"
            value="87.5%"
            change="+4.3pp from last week"
            changeType="positive"
            icon={BarChart3}
            description="Booking capacity utilization"
          />
          <MetricCard
            title="Lead Time Variance"
            value="0.25hr"
            change="↓ 1.6 hrs vs last week"
            changeType="positive"
            icon={Calendar}
            description="Planned vs Actual Timing"
          />
          <MetricCard
            title="Active Bookings"
            value="156"
            change="+8 from yesterday"
            changeType="positive"
            icon={Calendar}
            description="Confirmed processing slots"
          />
          <MetricCard
            title="Transport Loads"
            value="48"
            change="3 pending"
            changeType="neutral"
            icon={Truck}
            description="Scheduled transport today"
          />
          <MetricCard
            title="Slot Adherence"
            value="92.3%"
            change="+3.6pp from last week"
            changeType="positive"
            icon={TrendingUp}
            description="Kept vs assigned slots"
          />
          <MetricCard
            title="Conflicts"
            value="3"
            change="1 critical"
            changeType="negative"
            icon={AlertTriangle}
            description="Active scheduling conflicts"
          />
        </div>

        {/* Compliance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                title="Compliance OK %"
                value={loadingCompliance ? "Loading..." : "84%"}
                change={complianceOk !== null ? "Fully compliant bookings" : undefined}
                changeType="neutral"
                icon={Shield}
                description="All three compliance checks passed"
                thresholds={complianceOk !== null ? {
                  value: complianceOk,
                  greenAbove: 95,
                  amberAbove: 80
                } : undefined}
              />
              <MetricCard
                title="Missing Compliance Records"
                value={loadingCompliance ? "Loading..." : "8"}
                change={missingCompliance > 0 ? "Requires attention" : "All records complete"}
                changeType={missingCompliance === 0 ? "positive" : "negative"}
                icon={AlertTriangle}
                description="Records with any missing status"
              />
              <MetricCard
                title="Compliance Pending"
                value={loadingCompliance ? "Loading..." : pendingCompliance === 0 ? "All clear ✅" : pendingCompliance}
                change={pendingCompliance > 0 ? "Awaiting checks" : "No pending checks"}
                changeType={pendingCompliance === 0 ? "positive" : "neutral"}
                icon={Activity}
                description="Records with pending status"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Exit Date Reminders panel ── */}
        {(loadingReminders || unconfirmedBookings.length > 0) && (
          <Card className={unconfirmedBookings.some(b => b.daysUntilKill <= 2) ? "border-destructive/60" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4 text-amber-500" />
                Exit Date Reminders
                {!loadingReminders && unconfirmedBookings.length > 0 && (
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    {unconfirmedBookings.length} booking{unconfirmedBookings.length !== 1 ? "s" : ""} need confirmation
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingReminders ? (
                <p className="text-sm text-muted-foreground animate-pulse">Loading reminders…</p>
              ) : unconfirmedBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  All upcoming bookings confirmed — nothing to action.
                </p>
              ) : (
                <div className="space-y-2">
                  {unconfirmedBookings.map((b) => {
                    const urgency = b.daysUntilKill <= 1
                      ? "bg-red-50 border-red-200 dark:bg-red-950/20"
                      : b.daysUntilKill <= 3
                      ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20"
                      : "bg-yellow-50 border-yellow-100 dark:bg-yellow-950/10";
                    const urgencyText = b.daysUntilKill <= 1
                      ? "text-red-700 bg-red-100 border-red-200"
                      : b.daysUntilKill <= 3
                      ? "text-amber-700 bg-amber-100 border-amber-200"
                      : "text-yellow-700 bg-yellow-100 border-yellow-200";
                    const daysLabel = b.daysUntilKill === 0
                      ? "TODAY"
                      : b.daysUntilKill === 1
                      ? "Tomorrow"
                      : `${b.daysUntilKill} days`;

                    return (
                      <div
                        key={b.id}
                        className={`flex items-center gap-3 rounded-md border px-3 py-2.5 ${urgency}`}
                      >
                        <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{b.supplierName}</p>
                          <p className="text-xs text-muted-foreground">
                            {(b.head_count ?? 0).toLocaleString()} head
                            {b.species ? ` · ${b.species}` : ""}
                            {b.requested_kill_date
                              ? ` · Kill ${format(parseISO(b.requested_kill_date), "d MMM yyyy")}`
                              : ""}
                          </p>
                        </div>
                        <span className={`shrink-0 text-xs font-semibold rounded-full border px-2 py-0.5 ${urgencyText}`}>
                          {daysLabel}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground capitalize border rounded px-1.5 py-0.5 bg-background">
                          {b.status || "placeholder"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ScheduleOverview />
          <RecentActivity />
        </div>


        {/* Demo Data Notice */}
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p className="font-medium">🏭 Demo Data</p>
              <p>This is sample dashboard data for demonstration. Production would show real processor metrics, live activity feeds, and actual plant performance.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Index;
