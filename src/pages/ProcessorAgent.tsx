import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  CheckCircle2,
  Truck,
  FileText,
  ShieldAlert,
  RefreshCw,
  Send,
  ChevronRight,
  Clock,
  User,
  Info,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentAlert {
  id: string;
  alert_type: string;
  severity: "critical" | "warning" | "notice" | "info";
  title: string;
  message: string;
  booking_id: string | null;
  supplier_name: string | null;
  kill_date: string | null;
  resolved: boolean;
  created_at: string;
}

interface MorningBriefing {
  briefing_date: string;
  kill_date: string;
  total_head: number;
  total_bookings: number;
  compliant_bookings: number;
  non_compliant_bookings: number;
  hgp_conflicts: number;
  transport_confirmed: number;
  transport_unconfirmed: number;
  cert_warnings: number;
  schedule_changes_24h: number;
  summary_text: string;
}

// ─── Demo fallback data ───────────────────────────────────────────────────────

const DEMO_BRIEFING: MorningBriefing = {
  briefing_date: "2026-06-01",
  kill_date: "2026-06-02",
  total_head: 510,
  total_bookings: 8,
  compliant_bookings: 6,
  non_compliant_bookings: 2,
  hgp_conflicts: 1,
  transport_confirmed: 5,
  transport_unconfirmed: 3,
  cert_warnings: 2,
  schedule_changes_24h: 1,
  summary_text:
    "Tomorrow's kill is 510 head across 8 bookings. Compliance is 75% — two bookings have outstanding NVD issues requiring resolution before 5am. One HGP conflict on Booking MKP-2025-0012 needs immediate action. Transport is 63% confirmed with 3 suppliers outstanding. Two export cert warnings: AFIC Halal (22 days) and USA FSIS (18 days) require lodgement this week. One schedule change in the last 24 hours.",
};

const DEMO_ALERTS: AgentAlert[] = [
  {
    id: "1",
    alert_type: "HGP Conflict",
    severity: "critical",
    title: "HGP conflict on Booking MKP-2025-0012",
    message:
      "Capella Grazing has declared HGP-treated cattle on a booking destined for the EU-certified chain. This booking must be moved to a domestic kill day before 5am or the lot will be rejected at the gate.",
    booking_id: "MKP-2025-0012",
    supplier_name: "Capella Grazing",
    kill_date: "2026-06-02",
    resolved: false,
    created_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    alert_type: "NVD Missing",
    severity: "critical",
    title: "NVD not lodged — Darling Downs Feedlot (220 head)",
    message:
      "No NVD has been received for Darling Downs Feedlot's booking of 220 head killing 4 June. MSA eligibility cannot be confirmed. Automated reminder sent 3 hours ago — no response.",
    booking_id: "MKP-2025-0019",
    supplier_name: "Darling Downs Feedlot",
    kill_date: "2026-06-04",
    resolved: false,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    alert_type: "Cert Expiry",
    severity: "warning",
    title: "USA FSIS export certificate expiring in 18 days",
    message:
      "Your USA FSIS export establishment certificate expires 19 June 2026. DAFF requires 15 business days for renewal. Lodge renewal application today to avoid a gap in export eligibility.",
    booking_id: null,
    supplier_name: null,
    kill_date: null,
    resolved: false,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    alert_type: "Cert Expiry",
    severity: "warning",
    title: "AFIC Halal certificate — 22 days remaining",
    message:
      "AFIC Halal certification expires 23 June 2026. You have 8 Halal-designated bookings in the next 30 days totalling 1,240 head. Lodge renewal with AFIC this week.",
    booking_id: null,
    supplier_name: null,
    kill_date: null,
    resolved: false,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "5",
    alert_type: "Over Capacity",
    severity: "warning",
    title: "Thursday 5 June is over capacity — 70 head excess",
    message:
      "Current Thursday bookings total 620 head against a plant capacity of 550. Friday 6 June has 260 head available capacity. Recommend contacting Merriwa Pastoral Co (smallest lot, 80 head) to shift to Friday.",
    booking_id: null,
    supplier_name: "Merriwa Pastoral Co",
    kill_date: "2026-06-05",
    resolved: false,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "6",
    alert_type: "Transport Unconfirmed",
    severity: "warning",
    title: "3 bookings have unconfirmed transport for tomorrow",
    message:
      "Capella Grazing (180 head), Blackwater Downs (95 head) and Kinnoul Station (140 head) have not confirmed transport arrangements for the 2 June kill. Delivery window opens at 10pm tonight.",
    booking_id: null,
    supplier_name: null,
    kill_date: "2026-06-02",
    resolved: false,
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "7",
    alert_type: "NVD Missing",
    severity: "warning",
    title: "NVD not lodged — Capella Grazing (180 head)",
    message:
      "Capella Grazing has not lodged an NVD for tomorrow's kill of 180 head. This is their third consecutive booking with a late NVD. Consider flagging for vendor review.",
    booking_id: "MKP-2025-0018",
    supplier_name: "Capella Grazing",
    kill_date: "2026-06-02",
    resolved: false,
    created_at: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "8",
    alert_type: "pH Fail",
    severity: "notice",
    title: "Elevated pH fail rate this week — 4 fails from Capella Grazing",
    message:
      "Capella Grazing has recorded 4 pH fails this week (avg 5.67 vs target <5.70). Pattern indicates late arrivals reducing lairage rest time. Recommend pre-arrival briefing before next kill.",
    booking_id: null,
    supplier_name: "Capella Grazing",
    kill_date: null,
    resolved: false,
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "9",
    alert_type: "Schedule Change",
    severity: "notice",
    title: "Chinchilla Plains Pastoral increased lot by 40 head",
    message:
      "Chinchilla Plains Pastoral amended Booking MKP-2025-0015 from 280 to 320 head (change made 11:42pm last night). Kill plan has been updated. Confirm grader staffing covers the additional volume.",
    booking_id: "MKP-2025-0015",
    supplier_name: "Chinchilla Plains Pastoral",
    kill_date: "2026-06-03",
    resolved: false,
    created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "10",
    alert_type: "New Supplier",
    severity: "notice",
    title: "First booking from Blackwater Downs — paperwork review required",
    message:
      "Blackwater Downs is a first-time supplier with a booking of 95 head on 2 June. Vendor score is unestablished. Ensure kill floor supervisor reviews NVD for accuracy before accepting lot.",
    booking_id: "MKP-2025-0021",
    supplier_name: "Blackwater Downs",
    kill_date: "2026-06-02",
    resolved: false,
    created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "11",
    alert_type: "MSA",
    severity: "info",
    title: "MSA audit scheduled for 15 June — prep checklist ready",
    message:
      "Your annual MSA compliance audit is in 14 days. The prep checklist has been generated and is available in the Compliance module. Key areas flagged: lairage records completeness and pH log sign-off.",
    booking_id: null,
    supplier_name: null,
    kill_date: null,
    resolved: false,
    created_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "12",
    alert_type: "HACCP",
    severity: "info",
    title: "HACCP certification renewal in 47 days",
    message:
      "HACCP certification expires 18 July 2026. Recommend scheduling internal audit prep in the next two weeks. No immediate action required.",
    booking_id: null,
    supplier_name: null,
    kill_date: null,
    resolved: false,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ─── Query response patterns ──────────────────────────────────────────────────

function getAgentResponse(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("nvd") || q.includes("outstanding")) {
    return "2 bookings have outstanding NVDs for tomorrow's kill: Capella Grazing (180 head, kill 2 June) and Darling Downs Feedlot (220 head, kill 4 June). Both suppliers have been sent automated reminders. Last contact: Capella Grazing — no response. Darling Downs — acknowledged, submitting tonight.";
  }
  if (q.includes("vendor") || q.includes("reliability")) {
    return "Vendor reliability summary:\n• Chinchilla Plains Pastoral — 91/100 ✅ (42 bookings, 2.4% change rate)\n• Merriwa Pastoral Co — 88/100 ✅ (28 bookings, 3.1% change rate)\n• Darling Downs Feedlot — 75/100 🟡 (19 bookings, 11% change rate)\n• Capella Grazing — 62/100 🟠 (declining — high change rate 25%, recurring late NVDs)\n• Blackwater Downs — 45/100 🔴 (new supplier, paperwork issues — review before expanding volume)";
  }
  if (q.includes("capacity") || q.includes("7 days") || q.includes("next week")) {
    return "Next 7 days capacity:\n• Mon 2 June — 380 head (69% capacity) ✅\n• Tue 3 June — 420 head (76%) ✅\n• Wed 4 June — 510 head (93%) ⚠️ near capacity\n• Thu 5 June — 620 head (113%) 🔴 OVER CAPACITY — 70 head needs moving\n• Fri 6 June — 290 head (53%) ✅ available\n\nRecommend: move 70 head from Thursday to Friday. Best candidate — Merriwa Pastoral Co (80 head, flexible delivery).";
  }
  if (q.includes("ph") || q.includes("pH") || q.includes("grading")) {
    return "pH performance this month: Average 5.54 (target <5.70) ✅. Fail rate: 3.1% (3-month avg 2.1%) ⚠️ slightly elevated.\n\nWorst performer: Capella Grazing — avg pH 5.61, 4 fails this month.\nBest performer: Chinchilla Plains Pastoral — avg pH 5.44, 0 fails.\n\nRecommend reviewing lairage rest times for Capella lots — pattern shows consistent late arrivals reducing minimum rest period below 2 hours.";
  }
  if (q.includes("cert") || q.includes("expiry") || q.includes("expir")) {
    return "Certificate expiry summary:\n⚠️ USA FSIS Export — 18 days (action required this week)\n⚠️ AFIC Halal — 22 days (action required this week)\nℹ️ HACCP — 47 days (schedule audit prep)\n✅ DAFF Export Establishment — 589 days\n✅ EU Listed Establishment — 730 days\n\nTwo certificates require immediate action. DAFF processing time for FSIS renewal is 15 business days minimum.";
  }
  return "I can help with: NVD compliance status, vendor reliability scores, capacity planning, pH and grading performance, and cert expiry tracking. Try one of the suggested queries above or ask me something specific about your kill schedule.";
}

// ─── Severity helpers ─────────────────────────────────────────────────────────

const severityBorderClass: Record<string, string> = {
  critical: "border-l-red-500",
  warning: "border-l-amber-400",
  notice: "border-l-blue-400",
  info: "border-l-slate-400",
};

const severityBadgeClass: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  warning: "bg-amber-400/20 text-amber-400 border-amber-400/30",
  notice: "bg-blue-400/20 text-blue-400 border-blue-400/30",
  info: "bg-slate-400/20 text-slate-400 border-slate-400/30",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function AlertCard({
  alert,
  onResolve,
}: {
  alert: AgentAlert;
  onResolve: (id: string) => void;
}) {
  const timeAgo = formatDistanceToNow(new Date(alert.created_at), { addSuffix: true });
  return (
    <div
      className={`border-l-4 ${severityBorderClass[alert.severity]} bg-slate-800/60 rounded-r-lg p-4 space-y-2`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded border uppercase tracking-wide ${severityBadgeClass[alert.severity]}`}
        >
          {alert.severity}
        </span>
        <span className="text-xs text-slate-400 font-mono">{alert.alert_type}</span>
        {alert.supplier_name && (
          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full border border-slate-600">
            {alert.supplier_name}
          </span>
        )}
        <span className="text-xs text-slate-500 ml-auto flex items-center gap-1">
          <Clock size={11} /> {timeAgo}
        </span>
      </div>
      <p className="text-sm font-semibold text-white">{alert.title}</p>
      <p className="text-sm text-slate-300 leading-relaxed">{alert.message}</p>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {alert.booking_id && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            View Booking {alert.booking_id} <ChevronRight size={12} className="ml-1" />
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-slate-600 text-slate-300 hover:bg-slate-700"
          onClick={() => onResolve(alert.id)}
        >
          Mark Resolved
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          <User size={11} className="mr-1" /> Assign to →
        </Button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProcessorAgent() {
  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [alerts, setAlerts] = useState<AgentAlert[]>([]);
  const [showResolved, setShowResolved] = useState(false);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load data
  useEffect(() => {
    async function load() {
      // Morning briefing
      const { data: briefData } = await (supabase as any)
        .from("morning_briefings")
        .select("*")
        .order("briefing_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      setBriefing(briefData ?? DEMO_BRIEFING);

      // Alerts
      const { data: alertData } = await (supabase as any)
        .from("agent_alerts")
        .select("*")
        .order("created_at", { ascending: false });
      setAlerts(
        alertData && alertData.length > 0
          ? (alertData as AgentAlert[])
          : DEMO_ALERTS
      );
    }
    load();
  }, []);

  const b = briefing ?? DEMO_BRIEFING;

  const visibleAlerts = alerts.filter((a) =>
    showResolved ? true : !a.resolved
  );

  const criticalAlerts = visibleAlerts.filter((a) => a.severity === "critical");
  const warningAlerts = visibleAlerts.filter((a) => a.severity === "warning");
  const noticeInfoAlerts = visibleAlerts.filter(
    (a) => a.severity === "notice" || a.severity === "info"
  );
  const unresolvedCount = alerts.filter((a) => !a.resolved).length;
  const criticalCount = alerts.filter(
    (a) => !a.resolved && (a.severity === "critical" || a.severity === "warning")
  ).length;

  function handleResolve(id: string) {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, resolved: true } : a))
    );
    (supabase as any)
      .from("agent_alerts")
      .update({ resolved: true })
      .eq("id", id);
  }

  function handleQuery() {
    if (!query.trim()) return;
    setIsQuerying(true);
    setTimeout(() => {
      setResponse(getAgentResponse(query));
      setIsQuerying(false);
    }, 600);
  }

  function handleChip(chip: string) {
    setQuery(chip);
    setIsQuerying(true);
    setTimeout(() => {
      setResponse(getAgentResponse(chip));
      setIsQuerying(false);
    }, 600);
    inputRef.current?.focus();
  }

  const nvdPct =
    b.total_bookings > 0
      ? Math.round((b.compliant_bookings / b.total_bookings) * 100)
      : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6 max-w-5xl mx-auto">
        {/* ── Section 1: Header ─────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="relative mt-1">
              <span className="block w-3 h-3 rounded-full bg-green-400" />
              <span className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-60" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Operations Agent
                <span className="ml-3 text-xs font-normal text-green-400 align-middle uppercase tracking-widest">
                  Live
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Your kill floor co-pilot — monitoring compliance, schedule and performance
              </p>
            </div>
          </div>

          {/* Status strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 flex items-center gap-2">
              <ShieldAlert size={15} className="text-red-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 leading-none">Active Alerts</p>
                <p className="text-lg font-bold text-red-400 leading-tight">{criticalCount}</p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 flex items-center gap-2">
              <CheckCircle2 size={15} className="text-green-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 leading-none">Compliance</p>
                <p className="text-lg font-bold text-white leading-tight">
                  {b.compliant_bookings}/{b.total_bookings}
                </p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 flex items-center gap-2">
              <Truck size={15} className="text-blue-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 leading-none">Transport</p>
                <p className="text-lg font-bold text-white leading-tight">
                  {b.transport_confirmed}/{b.transport_confirmed + b.transport_unconfirmed}
                </p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 flex items-center gap-2">
              <FileText size={15} className="text-amber-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 leading-none">NVD Status</p>
                <p
                  className={`text-lg font-bold leading-tight ${
                    nvdPct >= 80 ? "text-green-400" : nvdPct >= 60 ? "text-amber-400" : "text-red-400"
                  }`}
                >
                  {nvdPct}%
                </p>
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-400 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 leading-none">Cert Warnings</p>
                <p className="text-lg font-bold text-amber-400 leading-tight">{b.cert_warnings}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Morning Briefing ───────────────────────────────────── */}
        <Card className="border-slate-700 bg-slate-900 overflow-hidden">
          <CardHeader className="bg-slate-800 border-b border-slate-700 py-3 px-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-base font-semibold flex items-center gap-2">
                  <Zap size={15} className="text-amber-400" />
                  Today's Kill Briefing
                </CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kill date:{" "}
                  <span className="text-slate-200 font-medium">
                    {format(new Date(b.kill_date), "EEEE d MMMM yyyy")}
                  </span>
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <RefreshCw size={11} className="mr-1" /> Regenerate
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total Head", value: b.total_head.toLocaleString(), sub: `${b.total_bookings} bookings`, colour: "text-white" },
                  { label: "Compliant", value: b.compliant_bookings, sub: `${b.non_compliant_bookings} non-compliant`, colour: b.non_compliant_bookings > 0 ? "text-amber-400" : "text-green-400" },
                  { label: "Transport Confirmed", value: b.transport_confirmed, sub: `${b.transport_unconfirmed} unconfirmed`, colour: b.transport_unconfirmed > 0 ? "text-amber-400" : "text-green-400" },
                  { label: "Schedule Changes", value: b.schedule_changes_24h, sub: `${b.hgp_conflicts} HGP conflict${b.hgp_conflicts !== 1 ? "s" : ""}`, colour: b.hgp_conflicts > 0 ? "text-red-400" : "text-slate-300" },
                ].map(({ label, value, sub, colour }) => (
                  <div
                    key={label}
                    className="bg-slate-800 rounded-lg p-3 border border-slate-700"
                  >
                    <p className="text-xs text-slate-400 mb-1">{label}</p>
                    <p className={`text-2xl font-bold ${colour}`}>{value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Summary + recommended actions */}
              <div className="space-y-3">
                <blockquote className="border-l-2 border-amber-400 pl-3 text-sm text-slate-300 leading-relaxed italic">
                  {b.summary_text}
                </blockquote>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Recommended Actions
                  </p>
                  <ol className="space-y-1.5">
                    {[
                      "Resolve HGP conflict on Booking #MKP-2025-0012 before 5am — move to domestic kill day",
                      "Lodge AFIC Halal cert renewal today — 22 days remaining",
                      "Chase exit date confirmations from 3 outstanding transport suppliers",
                    ].map((action, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-200">
                        <span className="text-amber-400 font-bold shrink-0">{i + 1}.</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <p className="text-xs text-slate-500 pt-1">
                  Briefing generated at 05:30 today
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 3: Active Alerts ──────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">Active Alerts</h2>
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                {unresolvedCount}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={() => setShowResolved((v) => !v)}
            >
              {showResolved ? "Hide Resolved" : "Show Resolved"}
            </Button>
          </div>

          {/* Critical */}
          {criticalAlerts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-red-950/40 border border-red-800/40 rounded-lg px-3 py-2">
                <span className="text-sm font-semibold text-red-400">
                  🚨 Needs Immediate Action
                </span>
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs ml-auto">
                  {criticalAlerts.length}
                </Badge>
              </div>
              <div className="space-y-2 pl-1">
                {criticalAlerts.map((a) => (
                  <AlertCard key={a.id} alert={a} onResolve={handleResolve} />
                ))}
              </div>
            </div>
          )}

          {/* Warning */}
          {warningAlerts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-amber-950/30 border border-amber-800/30 rounded-lg px-3 py-2">
                <span className="text-sm font-semibold text-amber-400">
                  ⚠️ Action Required Today
                </span>
                <Badge className="bg-amber-400/20 text-amber-400 border-amber-400/30 text-xs ml-auto">
                  {warningAlerts.length}
                </Badge>
              </div>
              <div className="space-y-2 pl-1">
                {warningAlerts.map((a) => (
                  <AlertCard key={a.id} alert={a} onResolve={handleResolve} />
                ))}
              </div>
            </div>
          )}

          {/* Notice / Info */}
          {noticeInfoAlerts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2">
                <span className="text-sm font-semibold text-slate-300">
                  ℹ️ For Your Awareness
                </span>
                <Badge className="bg-slate-600/40 text-slate-400 border-slate-600/40 text-xs ml-auto">
                  {noticeInfoAlerts.length}
                </Badge>
              </div>
              <div className="space-y-2 pl-1">
                {noticeInfoAlerts.map((a) => (
                  <AlertCard key={a.id} alert={a} onResolve={handleResolve} />
                ))}
              </div>
            </div>
          )}

          {visibleAlerts.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-sm">
              No alerts to display.
            </div>
          )}
        </div>

        {/* ── Section 4: Agent Query Box ────────────────────────────────────── */}
        <Card className="border-slate-700 bg-slate-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base font-semibold flex items-center gap-2">
              <Info size={15} className="text-blue-400" />
              Ask the Agent
            </CardTitle>
            <p className="text-xs text-slate-400">
              Query your kill floor data in plain English
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Chips */}
            <div className="flex flex-wrap gap-2">
              {[
                "Outstanding NVDs today",
                "Vendor reliability summary",
                "Next 7 days capacity",
                "pH performance this month",
                "Cert expiry dates",
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => handleChip(chip)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 px-3 py-1.5 rounded-full transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input row */}
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleQuery()}
                placeholder="e.g. What was Capella Grazing's average pH last quarter? / Which vendors have outstanding NVDs? / Show me next week's capacity"
                className="bg-slate-800 border-slate-600 text-slate-200 placeholder:text-slate-500 text-sm"
              />
              <Button
                onClick={handleQuery}
                disabled={isQuerying || !query.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white shrink-0"
              >
                <Send size={14} />
              </Button>
            </div>

            {/* Response */}
            {isQuerying && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Querying…
              </div>
            )}
            {response && !isQuerying && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-2">
                <pre className="text-sm text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                  {response}
                </pre>
                <p className="text-xs text-slate-500 pt-1 border-t border-slate-700 mt-2">
                  Powered by Muster Intelligence
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
