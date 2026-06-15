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
import { useDemo } from "@/contexts/DemoContext";
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
  todayHead: number;
  todayBookings: number;
  todayConfirmed: number;
  todaySuppliers: number;
};

type TodayReadiness = {
  totalBookings: number;
  confirmedBookings: number;
  complianceChecked: number;
  transportArranged: number;
  hgpConflict: boolean;
};

const Index = () => {
  const { plantId: demoPlantId } = useDemo();
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
  const [todayReadiness, setTodayReadiness] = useState<TodayReadiness | null>(null);

  // ── Live dashboard metrics from Supabase ──
  useEffect(() => {
    const fetchMetrics = async () => {
      setLoadingMetrics(true);
      const today = format(new Date(), "yyyy-MM-dd");
      const weekEnd = format(addDays(new Date(), 7), "yyyy-MM-dd");

      // Parallel fetches
      const bookingsQuery = supabase
        .from("bookings")
        .select("id, head_count, status, transport_status, hgp_status, requested_kill_date, supplier_id")
        .gte("requested_kill_date", today)
        .neq("status", "cancelled");
      if (demoPlantId) bookingsQuery.eq("plant_id", demoPlantId);

      const [{ data: upcoming }, { data: kpiLatest }] = await Promise.all([
        bookingsQuery,
        supabase
          .from("kpi_records")
          .select("fill_rate_pct, slot_adherence_pct")
          .order("date", { ascending: false })
          .limit(1),
      ]);

      const bks = (upcoming || []) as any[];
      const thisWeek = bks.filter(b => b.requested_kill_date && b.requested_kill_date <= weekEnd);
      const todayBks = bks.filter(b => b.requested_kill_date === today);

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
        todayHead:       todayBks.reduce((sum: number, b: any) => sum + (b.head_count || 0), 0),
        todayBookings:   todayBks.length,
        todayConfirmed:  todayBks.filter(b => b.status === "confirmed").length,
        todaySuppliers:  new Set(todayBks.map((b: any) => b.supplier_id).filter(Boolean)).size,
      });
      setLoadingMetrics(false);
    };
    fetchMetrics();
  }, [demoPlantId]);

  // ── Kill-day readiness check ──
  useEffect(() => {
    const fetchReadiness = async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const readinessQuery = supabase
        .from("bookings")
        .select("id, status, transport_status, hgp_status, kill_order_seq")
        .eq("requested_kill_date", today)
        .neq("status", "cancelled");
      if (demoPlantId) readinessQuery.eq("plant_id", demoPlantId);
      const { data: todayBks } = await readinessQuery;

      if (!todayBks || todayBks.length === 0) { setTodayReadiness(null); return; }

      const ids = todayBks.map((b: any) => b.id);
      const { data: checks } = await (supabase as any)
        .from("compliance_checks")
        .select("booking_id, nvd_status, nlis_status, pic_status")
        .in("booking_id", ids);

      const checkedSet = new Set(
        ((checks as any[]) || [])
          .filter((c: any) => c.nvd_status === "ok" && c.nlis_status === "ok" && c.pic_status === "ok")
          .map((c: any) => c.booking_id)
      );

      const transportOk = (b: any) =>
        ["confirmed", "arranged", "arrived", "not_required"].includes((b.transport_status || "").toLowerCase());

      // HGP conflict: a nil-HGP booking has a higher kill_order_seq than an implanted/under_withholding booking
      const sorted = [...todayBks].sort((a: any, b: any) => (a.kill_order_seq ?? 999) - (b.kill_order_seq ?? 999));
      let hgpConflict = false;
      let seenHgpTreated = false;
      for (const b of sorted as any[]) {
        if (b.hgp_status === "implanted" || b.hgp_status === "under_withholding") seenHgpTreated = true;
        if (seenHgpTreated && b.hgp_status === "nil") { hgpConflict = true; break; }
      }

      setTodayReadiness({
        totalBookings:    todayBks.length,
        confirmedBookings: todayBks.filter((b: any) => b.status === "confirmed").length,
        complianceChecked: ids.filter(id => checkedSet.has(id)).length,
        transportArranged: todayBks.filter((b: any) => transportOk(b)).length,
        hgpConflict,
      });
    };
    fetchReadiness();
  }, [demoPlantId]);

  // Fetch unconfirmed bookings due in the next 14 days
  useEffect(() => {
    const fetchReminders = async () => {
      setLoadingReminders(true);
      const today = new Date();
      const cutoff = addDays(today, 14);
      const todayStr  = format(today,  "yyyy-MM-dd");
      const cutoffStr = format(cutoff, "yyyy-MM-dd");

      const remindersQuery = supabase
        .from("bookings")
        .select("id, supplier_id, head_count, species, requested_kill_date, status")
        .gte("requested_kill_date", todayStr)
        .lte("requested_kill_date", cutoffStr)
        .in("status", ["placeholder", "pending", "requested", "low"]);
      if (demoPlantId) remindersQuery.eq("plant_id", demoPlantId);
      const { data: bks } = await remindersQuery;

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
  }, [demoPlantId]);

  useEffect(() => {
    const fetchComplianceData = async () => {
      setLoadingCompliance(true);

      let bookingIds: string[] | null = null;

      // In demo mode, get booking IDs for this plant first, then filter compliance
      if (demoPlantId) {
        const { data: plantBookings } = await supabase
          .from('bookings')
          .select('id')
          .eq('plant_id', demoPlantId)
          .neq('status', 'cancelled');
        bookingIds = (plantBookings || []).map((b: any) => b.id);
      }

      let complianceQuery = (supabase as any).from('compliance_checks').select('nvd_status, nlis_status, pic_status');
      if (bookingIds !== null) complianceQuery = complianceQuery.in('booking_id', bookingIds.length > 0 ? bookingIds : ['none']);
      const { data, error } = await complianceQuery;

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
  }, [demoPlantId]);

  // ── Operational gaps: transport + compliance missing in next 7 days ──
  useEffect(() => {
    const fetchGaps = async () => {
      setLoadingGaps(true);
      const today = new Date();
      const todayStr  = format(today, "yyyy-MM-dd");
      const cutoffStr = format(addDays(today, 7), "yyyy-MM-dd");

      const gapsQuery = supabase
        .from("bookings")
        .select("id, supplier_id, head_count, species, requested_kill_date, transport_status")
        .gte("requested_kill_date", todayStr)
        .lte("requested_kill_date", cutoffStr)
        .neq("status", "cancelled");
      if (demoPlantId) gapsQuery.eq("plant_id", demoPlantId);
      const { data: bks } = await gapsQuery;

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
  }, [demoPlantId]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Kill floor live status — bookings on the board, compliance, and follow-ups due today
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

        {/* ── Kill-Day Readiness Checklist ── */}
        {!loadingMetrics && todayReadiness && (() => {
          const r = todayReadiness;
          const allGood = r.confirmedBookings === r.totalBookings
            && r.complianceChecked === r.totalBookings
            && r.transportArranged === r.totalBookings
            && !r.hgpConflict;
          const issueCount = (r.confirmedBookings < r.totalBookings ? 1 : 0)
            + (r.complianceChecked < r.totalBookings ? 1 : 0)
            + (r.transportArranged < r.totalBookings ? 1 : 0)
            + (r.hgpConflict ? 1 : 0);

          const Row = ({ ok, label, detail, to }: { ok: boolean; label: string; detail: string; to?: string }) => (
            <div className="flex items-center gap-3">
              {ok
                ? <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${ok ? "text-foreground" : "text-amber-800"}`}>{label}</p>
                <p className="text-xs text-muted-foreground">{detail}</p>
              </div>
              {!ok && to && (
                <NavLink to={to}>
                  <button className="shrink-0 text-xs font-semibold text-primary underline whitespace-nowrap">
                    Fix →
                  </button>
                </NavLink>
              )}
            </div>
          );

          return (
            <Card className={allGood ? "border-emerald-300 bg-emerald-50/40" : "border-amber-300 bg-amber-50/40"}>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {allGood
                      ? <CheckCircle className="h-5 w-5 text-emerald-500" />
                      : <AlertTriangle className="h-5 w-5 text-amber-500" />}
                    Kill-Day Readiness — {format(new Date(), "EEEE d MMMM")}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    allGood
                      ? "text-emerald-700 bg-emerald-100 border-emerald-200"
                      : "text-amber-700 bg-amber-100 border-amber-200"
                  }`}>
                    {allGood ? "Ready to kill ✓" : `${issueCount} action${issueCount !== 1 ? "s" : ""} needed`}
                  </span>
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {r.totalBookings} booking{r.totalBookings !== 1 ? "s" : ""} · {(metrics?.todayHead ?? 0).toLocaleString()} head · {metrics?.todaySuppliers} vendor{metrics?.todaySuppliers !== 1 ? "s" : ""}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                <Row
                  ok={r.confirmedBookings === r.totalBookings}
                  label={r.confirmedBookings === r.totalBookings
                    ? "All bookings confirmed"
                    : `${r.totalBookings - r.confirmedBookings} booking${r.totalBookings - r.confirmedBookings !== 1 ? "s" : ""} not yet confirmed`}
                  detail={`${r.confirmedBookings} of ${r.totalBookings} confirmed`}
                  to="/bookings"
                />
                <Row
                  ok={r.complianceChecked === r.totalBookings}
                  label={r.complianceChecked === r.totalBookings
                    ? "Compliance checks complete"
                    : `${r.totalBookings - r.complianceChecked} booking${r.totalBookings - r.complianceChecked !== 1 ? "s" : ""} missing compliance check`}
                  detail={`${r.complianceChecked} of ${r.totalBookings} checked — NVD, NLIS, PIC`}
                  to="/compliance"
                />
                <Row
                  ok={r.transportArranged === r.totalBookings}
                  label={r.transportArranged === r.totalBookings
                    ? "Transport confirmed for all bookings"
                    : `${r.totalBookings - r.transportArranged} booking${r.totalBookings - r.transportArranged !== 1 ? "s" : ""} without confirmed transport`}
                  detail={`${r.transportArranged} of ${r.totalBookings} transport arranged or not required`}
                  to="/transport"
                />
                <Row
                  ok={!r.hgpConflict}
                  label={r.hgpConflict
                    ? "HGP sequencing conflict — HGP-free must kill before treated"
                    : "HGP kill order correct"}
                  detail={r.hgpConflict
                    ? "Check kill_order_seq — HGP-treated animals appearing before HGP-free"
                    : "HGP-free animals sequenced before any treated animals"}
                  to="/kill-plan"
                />
                {allGood && (
                  <div className="pt-1 flex gap-2">
                    <NavLink to="/kill-plan">
                      <Button size="sm" variant="outline">View Kill Plan</Button>
                    </NavLink>
                    <NavLink to="/kill-reports">
                      <Button size="sm">
                        <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                        Today's Kill Report
                      </Button>
                    </NavLink>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* ── No kill today banner ── */}
        {!loadingMetrics && !todayReadiness && (metrics?.todayBookings ?? 0) === 0 && (
          <Card className="border-dashed border-muted-foreground/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{format(new Date(), "EEEE d MMMM yyyy")}</p>
                  <p className="text-sm text-muted-foreground italic">No kill scheduled for today</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
            description="Total head booked across the next 7 kill dates"
          />
          <NavLink to="/transport" className="block">
            <MetricCard
              title="Pending Transport"
              value={loadingMetrics ? "—" : metrics?.pendingTransport ?? 0}
              change={loadingMetrics ? undefined : metrics?.pendingTransport === 0 ? "All arranged" : "Awaiting arrangement — click to fix"}
              changeType={metrics?.pendingTransport === 0 ? "positive" : "neutral"}
              icon={Truck}
              description="Bookings without confirmed transport"
            />
          </NavLink>
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
              <NavLink to="/compliance" className="block">
                <MetricCard
                  title="Missing Compliance Records"
                  value={loadingCompliance ? "—" : missingCompliance}
                  change={missingCompliance > 0 ? "Click to fix" : "All records complete"}
                  changeType={missingCompliance === 0 ? "positive" : "negative"}
                  icon={AlertTriangle}
                  description="Records with any missing status"
                />
              </NavLink>
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
                        <NavLink to={isTransport ? "/transport" : "/compliance"}>
                          <button className="shrink-0 text-xs font-semibold text-primary underline whitespace-nowrap">
                            Fix →
                          </button>
                        </NavLink>
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
              Fill rate and slot adherence come from KPI records — add entries via Operational KPIs.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Index;
