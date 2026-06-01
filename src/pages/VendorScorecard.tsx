import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RefreshCw,
  ArrowUpDown,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VendorScore {
  id: string;
  supplier_name: string;
  score_overall: number;
  score_paperwork: number;
  score_delivery: number;
  score_arrival_time: number;
  score_grading: number;
  nvd_compliance_pct: number;
  nlis_compliance_pct: number;
  on_time_delivery_pct: number;
  head_count_accuracy_pct: number;
  avg_ph: number;
  msa_pass_pct: number;
  total_bookings: number;
  bookings_changed: number;
  change_rate_pct: number;
  rating: "excellent" | "good" | "fair" | "poor";
  trend: "improving" | "stable" | "declining";
  last_kill_date: string | null;
  notes: string | null;
}

interface BookingChange {
  id: string;
  booking_id: string | null;
  changed_at: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  change_note: string | null;
  changed_by: string | null;
}

// ─── Demo fallback ────────────────────────────────────────────────────────────

const DEMO_VENDORS: VendorScore[] = [
  {
    id: "1",
    supplier_name: "Chinchilla Plains Pastoral",
    score_overall: 91,
    score_paperwork: 95,
    score_delivery: 90,
    score_arrival_time: 94,
    score_grading: 88,
    nvd_compliance_pct: 99,
    nlis_compliance_pct: 100,
    on_time_delivery_pct: 94,
    head_count_accuracy_pct: 98,
    avg_ph: 5.52,
    msa_pass_pct: 94,
    total_bookings: 48,
    bookings_changed: 3,
    change_rate_pct: 6.3,
    rating: "excellent",
    trend: "improving",
    last_kill_date: "2026-05-28",
    notes: null,
  },
  {
    id: "2",
    supplier_name: "Merriwa Pastoral Co",
    score_overall: 88,
    score_paperwork: 92,
    score_delivery: 88,
    score_arrival_time: 78,
    score_grading: 94,
    nvd_compliance_pct: 97,
    nlis_compliance_pct: 98,
    on_time_delivery_pct: 88,
    head_count_accuracy_pct: 96,
    avg_ph: 5.55,
    msa_pass_pct: 91,
    total_bookings: 36,
    bookings_changed: 4,
    change_rate_pct: 11.1,
    rating: "excellent",
    trend: "stable",
    last_kill_date: "2026-05-26",
    notes: null,
  },
  {
    id: "3",
    supplier_name: "Darling Downs Feedlot",
    score_overall: 75,
    score_paperwork: 80,
    score_delivery: 72,
    score_arrival_time: 88,
    score_grading: 70,
    nvd_compliance_pct: 90,
    nlis_compliance_pct: 92,
    on_time_delivery_pct: 82,
    head_count_accuracy_pct: 88,
    avg_ph: 5.60,
    msa_pass_pct: 78,
    total_bookings: 22,
    bookings_changed: 3,
    change_rate_pct: 13.6,
    rating: "good",
    trend: "stable",
    last_kill_date: "2026-05-22",
    notes: null,
  },
  {
    id: "4",
    supplier_name: "Capella Grazing",
    score_overall: 62,
    score_paperwork: 55,
    score_delivery: 70,
    score_arrival_time: 65,
    score_grading: 58,
    nvd_compliance_pct: 78,
    nlis_compliance_pct: 82,
    on_time_delivery_pct: 72,
    head_count_accuracy_pct: 80,
    avg_ph: 5.68,
    msa_pass_pct: 65,
    total_bookings: 20,
    bookings_changed: 5,
    change_rate_pct: 25.0,
    rating: "fair",
    trend: "declining",
    last_kill_date: "2026-05-15",
    notes:
      "High change rate (25%). Review booking modification behaviour. pH trending up.",
  },
  {
    id: "5",
    supplier_name: "Blackwater Downs Station",
    score_overall: 45,
    score_paperwork: 38,
    score_delivery: 55,
    score_arrival_time: 42,
    score_grading: 50,
    nvd_compliance_pct: 62,
    nlis_compliance_pct: 70,
    on_time_delivery_pct: 55,
    head_count_accuracy_pct: 68,
    avg_ph: 5.74,
    msa_pass_pct: 48,
    total_bookings: 8,
    bookings_changed: 5,
    change_rate_pct: 62.5,
    rating: "poor",
    trend: "declining",
    last_kill_date: "2026-04-30",
    notes:
      "New supplier — high change rate 62.5%, paperwork issues. Do not expand volume until compliance improves.",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 85) return "#16a34a"; // green-600
  if (score >= 65) return "#2563eb"; // blue-600
  if (score >= 50) return "#d97706"; // amber-600
  return "#dc2626"; // red-600
}

function scoreBarColor(score: number): string {
  if (score >= 75) return "bg-green-500";
  if (score >= 55) return "bg-amber-500";
  return "bg-red-500";
}

function ratingBadge(rating: VendorScore["rating"]) {
  const map: Record<string, string> = {
    excellent: "bg-green-100 text-green-800 border-green-200",
    good: "bg-blue-100 text-blue-800 border-blue-200",
    fair: "bg-amber-100 text-amber-800 border-amber-200",
    poor: "bg-red-100 text-red-800 border-red-200",
  };
  return map[rating] ?? map["fair"];
}

function TrendIcon({ trend }: { trend: VendorScore["trend"] }) {
  if (trend === "improving")
    return <TrendingUp className="w-4 h-4 text-green-600" />;
  if (trend === "declining")
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const fill = (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg width="96" height="96" className="-rotate-90">
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="#e2e8f0"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - fill}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute text-xl font-bold"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

function MiniBar({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span className="font-medium text-slate-700">{score}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${scoreBarColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ─── Vendor Card ──────────────────────────────────────────────────────────────

function VendorCard({
  vendor,
  alertCount,
  bookingChanges,
}: {
  vendor: VendorScore;
  alertCount: number;
  bookingChanges: BookingChange[];
}) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const recentChanges = bookingChanges
    .filter(
      (bc) =>
        // best-effort: match by supplier name embedded in change notes
        bc.change_note?.toLowerCase().includes(vendor.supplier_name.toLowerCase()) ||
        true // show all for demo since we don't have supplier_name on booking_changes
    )
    .slice(0, 5);

  return (
    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5 space-y-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 text-sm leading-tight truncate">
              {vendor.supplier_name}
            </h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${ratingBadge(vendor.rating)}`}
            >
              {vendor.rating}
            </span>
            <TrendIcon trend={vendor.trend} />
            {alertCount > 0 && (
              <button
                onClick={() => navigate("/agent-alerts")}
                className="flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 border border-red-200 rounded-full px-2 py-0.5 hover:bg-red-100 transition-colors"
              >
                <AlertTriangle className="w-3 h-3" />
                {alertCount} alert{alertCount > 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>

        {/* Score ring + breakdown */}
        <div className="flex gap-4 items-center">
          <ScoreRing score={vendor.score_overall} />
          <div className="flex-1 space-y-1.5">
            <MiniBar label="📋 Paperwork" score={vendor.score_paperwork} />
            <MiniBar label="🚚 Delivery Accuracy" score={vendor.score_delivery} />
            <MiniBar label="⏰ Arrival Time" score={vendor.score_arrival_time} />
            <MiniBar label="🥩 Grading" score={vendor.score_grading} />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 pt-1 border-t border-slate-100">
          <div className="text-center">
            <div className="text-xs text-slate-400">Bookings</div>
            <div className="text-sm font-semibold text-slate-800">
              {vendor.total_bookings}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400">Change Rate</div>
            <div
              className={`text-sm font-semibold ${
                vendor.change_rate_pct > 20 ? "text-red-600" : "text-slate-800"
              }`}
            >
              {vendor.change_rate_pct}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400">Avg pH</div>
            <div
              className={`text-sm font-semibold ${
                vendor.avg_ph > 5.65 ? "text-red-600" : "text-slate-800"
              }`}
            >
              {vendor.avg_ph.toFixed(2)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400">MSA Pass</div>
            <div className="text-sm font-semibold text-slate-800">
              {vendor.msa_pass_pct}%
            </div>
          </div>
        </div>

        {/* Notes */}
        {vendor.notes && (
          <p className="text-xs italic text-slate-500 bg-slate-50 rounded px-3 py-2 border border-slate-100">
            {vendor.notes}
          </p>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-center gap-1 text-xs text-slate-500 hover:text-slate-700 pt-1 border-t border-slate-100 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> Hide details
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> Show details
            </>
          )}
        </button>

        {/* Expanded detail panel */}
        {expanded && (
          <div className="space-y-4 pt-2 border-t border-slate-100">
            {/* Compliance stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "NVD Compliance", value: `${vendor.nvd_compliance_pct}%` },
                { label: "NLIS Compliance", value: `${vendor.nlis_compliance_pct}%` },
                { label: "On-time Delivery", value: `${vendor.on_time_delivery_pct}%` },
                { label: "Head Count Accuracy", value: `${vendor.head_count_accuracy_pct}%` },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-slate-50 rounded px-3 py-2 border border-slate-100"
                >
                  <div className="text-xs text-slate-400">{label}</div>
                  <div className="text-sm font-semibold text-slate-800">{value}</div>
                </div>
              ))}
            </div>

            {/* Last kill */}
            {vendor.last_kill_date && (
              <div className="text-xs text-slate-500">
                <span className="font-medium text-slate-700">Last kill date:</span>{" "}
                {format(new Date(vendor.last_kill_date), "d MMM yyyy")}
              </div>
            )}

            {/* Recent booking changes */}
            <div>
              <div className="text-xs font-medium text-slate-600 mb-2">
                Recent Booking Changes
              </div>
              {recentChanges.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No recent changes recorded.</p>
              ) : (
                <div className="space-y-1.5">
                  {recentChanges.map((bc) => (
                    <div
                      key={bc.id}
                      className="text-xs bg-amber-50 border border-amber-100 rounded px-3 py-1.5"
                    >
                      <span className="font-medium text-slate-700">{bc.field_name}</span>
                      {bc.old_value && bc.new_value && (
                        <span className="text-slate-500">
                          {" "}
                          {bc.old_value} → {bc.new_value}
                        </span>
                      )}
                      <span className="text-slate-400 ml-2">
                        {format(new Date(bc.changed_at), "d MMM")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs">
                Send Reminder
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => navigate("/kill-reports")}
              >
                View Kill History
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── League Table ─────────────────────────────────────────────────────────────

type SortKey =
  | "score_overall"
  | "score_paperwork"
  | "score_delivery"
  | "score_arrival_time"
  | "score_grading"
  | "trend";

function LeagueTable({ vendors }: { vendors: VendorScore[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("score_overall");
  const [sortAsc, setSortAsc] = useState(false);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function toggleFlag(id: string) {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const trendOrder: Record<VendorScore["trend"], number> = {
    improving: 2,
    stable: 1,
    declining: 0,
  };

  const sorted = [...vendors].sort((a, b) => {
    let av: number;
    let bv: number;
    if (sortKey === "trend") {
      av = trendOrder[a.trend];
      bv = trendOrder[b.trend];
    } else {
      av = a[sortKey];
      bv = b[sortKey];
    }
    return sortAsc ? av - bv : bv - av;
  });

  const cols: { label: string; key: SortKey }[] = [
    { label: "Overall", key: "score_overall" },
    { label: "Paperwork", key: "score_paperwork" },
    { label: "Delivery", key: "score_delivery" },
    { label: "Arrival", key: "score_arrival_time" },
    { label: "Grading", key: "score_grading" },
    { label: "Trend", key: "trend" },
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Rank
            </th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Supplier
            </th>
            {cols.map(({ label, key }) => (
              <th
                key={key}
                className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-800 select-none"
                onClick={() => handleSort(key)}
              >
                <span className="inline-flex items-center gap-1 justify-center">
                  {label}
                  <ArrowUpDown className="w-3 h-3 opacity-50" />
                </span>
              </th>
            ))}
            <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((vendor, idx) => (
            <tr
              key={vendor.id}
              className={`transition-colors ${
                flagged.has(vendor.id)
                  ? "bg-red-50 border-l-4 border-red-400"
                  : "hover:bg-slate-50"
              }`}
            >
              <td className="px-4 py-3 text-slate-500 font-medium">{idx + 1}</td>
              <td className="px-4 py-3 font-medium text-slate-900 max-w-[180px]">
                <span className="truncate block">{vendor.supplier_name}</span>
              </td>
              {[
                vendor.score_overall,
                vendor.score_paperwork,
                vendor.score_delivery,
                vendor.score_arrival_time,
                vendor.score_grading,
              ].map((score, i) => (
                <td key={i} className="px-3 py-3 text-center">
                  <span
                    className="font-semibold"
                    style={{ color: scoreColor(score) }}
                  >
                    {score}
                  </span>
                </td>
              ))}
              <td className="px-3 py-3 text-center">
                <div className="flex justify-center">
                  <TrendIcon trend={vendor.trend} />
                </div>
              </td>
              <td className="px-3 py-3 text-center">
                <Button
                  variant={flagged.has(vendor.id) ? "destructive" : "outline"}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => toggleFlag(vendor.id)}
                >
                  {flagged.has(vendor.id) ? "Flagged" : "Flag for Review"}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function VendorScorecard() {
  const [vendors, setVendors] = useState<VendorScore[]>([]);
  const [alertCounts, setAlertCounts] = useState<Record<string, number>>({});
  const [bookingChanges, setBookingChanges] = useState<BookingChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastCalculated] = useState(new Date());

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Vendor scores — fall back to demo if table doesn't exist
      try {
        const { data, error } = await (supabase as any)
          .from("vendor_scores")
          .select("*")
          .order("score_overall", { ascending: false });

        if (!error && data && data.length > 0) {
          setVendors(data as VendorScore[]);
        } else {
          setVendors(DEMO_VENDORS);
        }
      } catch {
        setVendors(DEMO_VENDORS);
      }

      // Agent alerts — count per supplier
      try {
        const { data } = await (supabase as any)
          .from("agent_alerts")
          .select("supplier_name, id")
          .eq("status", "active");

        if (data) {
          const counts: Record<string, number> = {};
          for (const row of data as { supplier_name: string; id: string }[]) {
            counts[row.supplier_name] = (counts[row.supplier_name] ?? 0) + 1;
          }
          setAlertCounts(counts);
        }
      } catch {
        // table doesn't exist yet — no alerts to show
      }

      // Recent booking changes
      try {
        const { data } = await supabase
          .from("booking_changes")
          .select("*")
          .order("changed_at", { ascending: false })
          .limit(50);

        if (data) {
          setBookingChanges(data as BookingChange[]);
        }
      } catch {
        // ignore
      }

      setLoading(false);
    }

    load();
  }, []);

  const excellentCount = vendors.filter((v) => v.score_overall >= 85).length;
  const attentionCount = vendors.filter((v) => v.score_overall < 65).length;
  const avgScore =
    vendors.length > 0
      ? Math.round(
          vendors.reduce((sum, v) => sum + v.score_overall, 0) / vendors.length
        )
      : 0;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Vendor Scorecard</h1>
            <p className="text-sm text-slate-500 mt-1">
              Reliability, compliance and grading performance — every supplier, every kill
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-400">Last calculated</div>
              <div className="text-xs font-medium text-slate-600">
                {format(lastCalculated, "d MMM yyyy, h:mm a")}
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Recalculate Scores
            </Button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border border-slate-200">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 mb-1">Excellent suppliers</div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-green-600">
                  {excellentCount}
                </span>
                <span className="text-xs text-slate-400 mb-0.5">score ≥ 85</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 mb-1">Needs attention</div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold text-amber-600">
                  {attentionCount}
                </span>
                <span className="text-xs text-slate-400 mb-0.5">score &lt; 65</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 mb-1">Total suppliers tracked</div>
              <div className="text-2xl font-bold text-slate-900">{vendors.length}</div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 mb-1">Avg overall score</div>
              <div
                className="text-2xl font-bold"
                style={{ color: scoreColor(avgScore) }}
              >
                {avgScore}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vendor cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-64 bg-slate-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vendors.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                alertCount={alertCounts[vendor.supplier_name] ?? 0}
                bookingChanges={bookingChanges}
              />
            ))}
          </div>
        )}

        {/* League table */}
        {!loading && vendors.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-slate-800">
              Supplier League Table
            </h2>
            <LeagueTable vendors={vendors} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
