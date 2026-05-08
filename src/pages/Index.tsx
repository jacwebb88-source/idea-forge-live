import { DashboardLayout } from "@/components/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { ScheduleOverview } from "@/components/dashboard/ScheduleOverview";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { format, addDays, differenceInDays, parseISO } from "date-fns";
import { NavLink } from "react-router-dom";
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
  Clock,
  XCircle,
  ArrowRight,
} from "lucide-react";

type OperationalGap = {
  id: string;
  supplierName: string;
  head_count: number | null;
  species: string | null;
  requested_kill_date: string | null;
  daysUntilKill: number;
  gapType: "transport" | "compliance";
};

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

type DashboardMetrics = {
  activeBookings: number;
  thisWeekHead: number;
  confirmedHead: number;
  avgFillRate: number | null;
  slotAdherence: number | null;
  pendingTransport: number;
  hgpConflicts: number;
};

const Index = () => {
  const [complianceOk, setComplianceOk] = useState<number | null>(null);
  const [missingCompliance, setMissingCompliance] = useState<number>(0);
  const [pendingCompliance, setPendingCompliance] = useState<number>(0);
  const [loadingCompliance, setLoadingCompliance] = useState(true);
  const [unconfirmedBookings, setUnconfirmedBookings] = useState<UnconfirmedBooking[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [operationalGaps, setOperationalGaps] = useState<OperationalGap[]>([]);
  const [loadingGaps, setLoadingGaps] = useState(true);

  // ── Live dashboard metrics from Supabase ──
  useEffect(() => {
    const fetchMetrics = async () => {
      setLoadingMetrics(true);
      const today = format(new Date(), "yyyy-MM-dd");
      const weekEnd = format(addDays(new Date(), 7), "yyyy-MM-dd");

      // Parallel fetches
      const [{ data: upcoming }, { data: kpiLatest }] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, head_count, status, transport_status, hgp_status, requested_kill_date")
          .gte("requested_kill_date", today)
          .neq("status", "cancelled"),
        supabase
          .from("kpi_records")
          .select("fill_rate_pct, slot_adherence_pct")
          .order("date", { ascending: false })
          .limit(1),
      ]);

      const bks = (upcoming || []) as any[];
      const thisWeek = bks.filter(b => b.requested_kill_date && b.requested_kill_date <= weekEnd);

      // HGP sequencing conflict: any day with both hgp_treated + hgp_free would need
      // deeper analysis — here we flag bookings where hgp_treated is set (proxy for attention)
      const hgpConflicts = bks.filter(b => b.hgp_status === "hgp_treated").length;

      setMetrics({
        activeBookings: bks.length,
        thisWeekHead: thisWeek.reduce((sum: number, b: any) => sum + (b.head_count || 0), 0),
        confirmedHead: bks
          .filter(b => b.status === "confirmed")
          .reduce((sum: number, b: any) => sum + (b.head_count || 0), 0),
        avgFillRate: kpiLatest?.[0]?.fill_rate_pct ?? null,
        slotAdherence: kpiLatest?.[0]?.slot_adherence_pct ?? null,
        pendingTransport: bks.filter(b => !b.transport_status || b.transport_status === "pending").length,
        hgpConflicts,
      });
      setLoadingMetrics(false);
    };
    fetchMetrics();
  }, []);

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

  // ── Operational gaps: transport + compliance missing in next 7 days ──
  useEffect(() => {
    const fetchGaps = async () => {
      setLoadingGaps(true);
      const today = new Date();
      const todayStr  = format(today, "yyyy-MM-dd");
      const cutoffStr = format(addDays(today, 7), "yyyy-MM-dd");

      const { data: bks } = await supabase
        .from("bookings")
        .select("id, supplier_id, head_count, species, requested_kill_date, transport_status")
        .gte("requested_kill_date", todayStr)
        .lte("requested_kill_date", cutoffStr)
        .neq("status", "cancelled");

      const bookingList = (bks as any[]) || [];
      if (bookingList.length === 0) { setOperationalGaps([]); setLoadingGaps(false); return; }

      // Supplier names
      const sids = Array.from(new Set(bookingList.map((b: any) => b.supplier_id).filter(Boolean))) as string[];
      let supplierMap: Record<string, string> = {};
      if (sids.length) {
        const { data: sups } = await supabase.from("suppliers").select("id, name").in("id", sids);
        (sups as any[] || []).forEach((s: any) => (supplierMap[s.id] = s.name));
      }

      // Which bookings have a compliance check record?
      const bookingIds = bookingList.map((b: any) => b.id);
      const { data: checks } = await (supabase as any)
        .from("compliance_checks")
        .select("booking_id")
        .in("booking_id", bookingIds);
      const checkedIds = new Set((checks as any[] || []).map((c: any) => c.booking_id));

      const gaps: OperationalGap[] = [];

      for (const b of bookingList) {
        const days = b.requested_kill_date
          ? differenceInDays(parseISO(b.requested_kill_date), today)
          : 99;
        const base = {
          id: b.id,
          supplierName: supplierMap[b.supplier_id] || "Unknown supplier",
          head_count: b.head_count,
          species: b.species,
          requested_kill_date: b.requested_kill_date,
          daysUntilKill: days,
        };

        // Transport not arranged (null or still pending, NOT 'not_required' or 'confirmed')
        const ts = (b.transport_status || "").toLowerCase();
        if (!ts || ts === "pending" || ts === "tbc") {
          gaps.push({ ...base, gapType: "transport" });
        }

        // Compliance check missing
        if (!checkedIds.has(b.id)) {
          gaps.push({ ...base, gapType: "compliance" });
        }
      }

      // Sort: most urgent first
      gaps.sort((a, b) => a.daysUntilKill - b.daysUntilKill);
      setOperationalGaps(gaps);
      setLoadingGaps(false);
    };
    fetchGaps();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Operations Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Live overview — active bookings, compliance status, and what needs action today
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <NavLink to="/kill-plan">
              <Button variant="outline" className="flex items-center gap-2 w-full sm:w-auto">
                <Calendar className="h-4 w-4" />
                Kill Plan
              </Button>
            </NavLink>
            <NavLink to="/kill-reports">
              <Button variant="outline" className="flex items-center gap-2 w-full sm:w-auto">
                <BarChart3 className="h-4 w-4" />
                Kill Reports
              </Button>
            </NavLink>
            <NavLink to="/bookings">
              <Button className="flex items-center gap-2 w-full sm:w-auto">
                <ArrowRight className="h-4 w-4" />
                All Bookings
              </Button>
            </NavLink>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Active Bookings"
            value={loadingMetrics ? "—" : metrics?.activeBookings ?? 0}
            change={loadingMetrics ? undefined : `${metrics?.confirmedHead?.toLocaleString() ?? 0} confirmed head`}
            changeType="positive"
            icon={Calendar}
            description="Upcoming non-cancelled bookings"
          />
          <MetricCard
            title="This Week — Head Count"
            value={loadingMetrics ? "—" : (metrics?.thisWeekHead ?? 0).toLocaleString()}
            change={loadingMetrics ? undefined : "Next 7 days"}
            changeType="neutral"
            icon={Users}
            description="Total head booked in the next 7 days"
          />
          <MetricCard
            title="Pending Transport"
            value={loadingMetrics ? "—" : metrics?.pendingTransport ?? 0}
            change={loadingMetrics ? undefined : metrics?.pendingTransport === 0 ? "All arranged" : "Awaiting arrangement"}
            changeType={metrics?.pendingTransport === 0 ? "positive" : "neutral"}
            icon={Truck}
            description="Bookings without confirmed transport"
          />
          <MetricCard
            title="Fill Rate"
            value={loadingMetrics ? "—" : metrics?.avgFillRate != null ? `${metrics.avgFillRate.toFixed(1)}%` : "No data"}
            change={loadingMetrics ? undefined : "From latest KPI record"}
            changeType="neutral"
            icon={BarChart3}
            description="Booking capacity utilisation"
            thresholds={metrics?.avgFillRate != null ? {
              value: metrics.avgFillRate,
              greenAbove: 90,
              amberAbove: 75
            } : undefined}
          />
          <MetricCard
            title="Slot Adherence"
            value={loadingMetrics ? "—" : metrics?.slotAdherence != null ? `${metrics.slotAdherence.toFixed(1)}%` : "No data"}
            change={loadingMetrics ? undefined : "From latest KPI record"}
            changeType="neutral"
            icon={TrendingUp}
            description="Kept vs assigned arrival slots"
            thresholds={metrics?.slotAdherence != null ? {
              value: metrics.slotAdherence,
              greenAbove: 90,
              amberAbove: 75
            } : undefined}
          />
          <MetricCard
            title="HGP Attention"
            value={loadingMetrics ? "—" : metrics?.hgpConflicts ?? 0}
            change={loadingMetrics ? undefined : metrics?.hgpConflicts === 0 ? "No HGP-treated bookings" : "HGP-treated bookings upcoming"}
            changeType={metrics?.hgpConflicts === 0 ? "positive" : "negative"}
            icon={AlertTriangle}
            description="Bookings flagged HGP-treated"
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
                value={loadingCompliance ? "—" : complianceOk !== null ? `${complianceOk.toFixed(0)}%` : "No records"}
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
                value={loadingCompliance ? "—" : missingCompliance}
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

        {/* ── Operational Gaps panel ── */}
        {(loadingGaps || operationalGaps.length > 0) && (
          <Card className={operationalGaps.some(g => g.daysUntilKill <= 1) ? "border-destructive/60" : "border-amber-200/60"}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <XCircle className="h-4 w-4 text-destructive" />
                Operational Gaps — Next 7 Days
                {!loadingGaps && operationalGaps.length > 0 && (
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    {operationalGaps.length} item{operationalGaps.length !== 1 ? "s" : ""} need action
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingGaps ? (
                <p className="text-sm text-muted-foreground animate-pulse">Checking for gaps…</p>
              ) : operationalGaps.length === 0 ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  No transport or compliance gaps in the next 7 days.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {operationalGaps.map((g, idx) => {
                    const isTransport   = g.gapType === "transport";
                    const urgencyClass  = g.daysUntilKill <= 1
                      ? "bg-red-50 border-red-200 dark:bg-red-950/20"
                      : g.daysUntilKill <= 3
                      ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20"
                      : "border-border bg-muted/20";
                    const tagClass      = isTransport
                      ? "text-blue-700 bg-blue-50 border-blue-200"
                      : "text-orange-700 bg-orange-50 border-orange-200";
                    const daysLabel     = g.daysUntilKill === 0 ? "TODAY"
                      : g.daysUntilKill === 1 ? "Tomorrow"
                      : `${g.daysUntilKill}d`;

                    return (
                      <div key={`${g.id}-${g.gapType}-${idx}`}
                        className={`flex items-center gap-3 rounded-md border px-3 py-2 text-xs ${urgencyClass}`}>
                        {isTransport
                          ? <Truck className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                          : <Shield className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                        }
                        <span className={`shrink-0 font-semibold border rounded px-1.5 py-0.5 ${tagClass}`}>
                          {isTransport ? "Transport" : "Compliance"}
                        </span>
                        <span className="flex-1 min-w-0 truncate text-foreground">
                          {g.supplierName}
                          {g.head_count ? ` · ${g.head_count.toLocaleString()} head` : ""}
                          {g.species ? ` · ${g.species}` : ""}
                        </span>
                        {g.requested_kill_date && (
                          <span className="shrink-0 text-muted-foreground">
                            Kill {format(parseISO(g.requested_kill_date), "d MMM")}
                          </span>
                        )}
                        <span className={`shrink-0 font-bold rounded px-1.5 py-0.5 ${
                          g.daysUntilKill <= 1 ? "text-red-700 bg-red-100" :
                          g.daysUntilKill <= 3 ? "text-amber-700 bg-amber-100" :
                          "text-muted-foreground bg-muted"
                        }`}>
                          {daysLabel}
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


        {/* Live data note */}
        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground text-center">
              <span className="font-medium">Live data.</span> Booking counts, head counts, and transport are pulled in real time from Supabase.
              Fill rate and slot adherence come from KPI records — add entries via the KPI Dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Index;
