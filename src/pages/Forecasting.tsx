import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Calendar, DollarSign, Target, BarChart3 } from "lucide-react";
import { useMemo } from "react";
import { format, addWeeks, startOfWeek, addDays } from "date-fns";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const CAPACITY = 550;
const KILL_FEE = 65; // $/head
const AVG_HSCW = 310; // kg
const VALUE_ADD_PER_HEAD = 18; // grading + MSA per head average

// ─── Demo data generators ──────────────────────────────────────────────────────

function generateKillForecast() {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  // Realistic confirmed + projected head counts — 2–3 weeks over capacity
  const confirmedHeads = [420, 380, 490, 310, 0, 0, 0, 0, 0, 0, 0, 0];
  const projectedHeads = [510, 480, 570, 540, 620, 480, 390, 450, 530, 580, 420, 480];

  return Array.from({ length: 12 }, (_, i) => {
    const weekDate = addWeeks(weekStart, i);
    const killDate = addDays(weekDate, 1); // Tuesday kill date
    const confirmed = confirmedHeads[i] ?? 0;
    const projected = projectedHeads[i];
    const total = confirmed > 0 ? confirmed : projected;
    const capacityPct = Math.round((total / CAPACITY) * 100);
    const status =
      capacityPct >= 100 ? "Over" : capacityPct >= 88 ? "Near Capacity" : "On Track";

    return {
      week: `Wk ${i + 1}`,
      weekLabel: format(weekDate, "d MMM"),
      killDate: format(killDate, "EEE d MMM"),
      confirmed,
      projected,
      capacityPct,
      status,
    };
  });
}

// ─── Vendor supply forecast data ───────────────────────────────────────────────

const vendorForecasts = [
  {
    name: "Capella Grazing",
    lastKill: "12 May 2026",
    frequency: "books every 3 weeks",
    nextDate: "2 Jun 2026",
    confidence: "High" as const,
    lotRange: "200–240 head",
    trend: "up" as const,
  },
  {
    name: "Merriwa Pastoral Co",
    lastKill: "19 May 2026",
    frequency: "books every 4 weeks",
    nextDate: "16 Jun 2026",
    confidence: "High" as const,
    lotRange: "160–190 head",
    trend: "stable" as const,
  },
  {
    name: "Darling Downs Feedlot",
    lastKill: "5 May 2026",
    frequency: "books every 5 weeks",
    nextDate: "9 Jun 2026",
    confidence: "Medium" as const,
    lotRange: "280–340 head",
    trend: "up" as const,
  },
  {
    name: "Chinchilla Plains Pastoral",
    lastKill: "28 Apr 2026",
    frequency: "books every 6 weeks",
    nextDate: "9 Jun 2026",
    confidence: "Medium" as const,
    lotRange: "120–160 head",
    trend: "down" as const,
  },
  {
    name: "Blackwater Downs Station",
    lastKill: "10 Mar 2026",
    frequency: "books every 10–12 weeks",
    nextDate: "Mid Jun 2026",
    confidence: "Low" as const,
    lotRange: "80–130 head",
    trend: "stable" as const,
  },
];

// ─── Revenue projection data ───────────────────────────────────────────────────

function generateRevenueData(killData: ReturnType<typeof generateKillForecast>) {
  return killData.map((w) => {
    const head = w.confirmed > 0 ? w.confirmed : w.projected;
    const killFeeRev = head * KILL_FEE;
    const valueAddRev = head * VALUE_ADD_PER_HEAD;
    return {
      week: w.week,
      "Kill Fee": Math.round(killFeeRev / 1000),   // in $000s
      "Value Add": Math.round(valueAddRev / 1000),
    };
  });
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "Over") {
    return <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">Over</Badge>;
  }
  if (status === "Near Capacity") {
    return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">Near Capacity</Badge>;
  }
  return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">On Track</Badge>;
}

function ConfidenceBadge({ confidence }: { confidence: "High" | "Medium" | "Low" }) {
  const cls =
    confidence === "High"
      ? "bg-green-100 text-green-800 border-green-200"
      : confidence === "Medium"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-slate-100 text-slate-700 border-slate-200";
  return <Badge className={`text-xs ${cls}`}>{confidence}</Badge>;
}

function TrendIcon({ trend }: { trend: "up" | "down" | "stable" }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-slate-400" />;
}

// Custom area shape that turns red when projected > capacity
function CustomProjectedDot() {
  return null;
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Forecasting() {
  const killData = useMemo(() => generateKillForecast(), []);
  const revenueData = useMemo(() => generateRevenueData(killData), [killData]);

  // Revenue summary stats
  const totalRevenue = useMemo(() => {
    return revenueData.reduce((s, w) => s + (w["Kill Fee"] + w["Value Add"]) * 1000, 0);
  }, [revenueData]);

  const avgWeeklyRevenue = Math.round(totalRevenue / 12);

  const bestWeekRevenue = useMemo(() => {
    return Math.max(...revenueData.map((w) => (w["Kill Fee"] + w["Value Add"]) * 1000));
  }, [revenueData]);

  const confirmedWeeks = killData.filter((w) => w.confirmed > 0).length;
  const pipelineConfidence = Math.round((confirmedWeeks / 12) * 40 + 62); // blend confirmed bookings into confidence %

  const formatDollar = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : `$${(n / 1_000).toFixed(0)}k`;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Forecasting</h1>
          <p className="text-muted-foreground mt-1">
            12-week forward view of kill volume, vendor supply, and revenue pipeline
          </p>
        </div>

        {/* ── Section 1: Kill Volume Forecast ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Kill Volume Forecast — 12 Weeks Forward
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={killData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="confirmedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 700]} />
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} head`, name]}
                />
                <Legend />
                <ReferenceLine
                  y={CAPACITY}
                  stroke="#ef4444"
                  strokeDasharray="6 3"
                  label={{ value: `Capacity (${CAPACITY})`, position: "insideTopRight", fontSize: 11, fill: "#ef4444" }}
                />
                <Area
                  type="monotone"
                  dataKey="confirmed"
                  name="Confirmed Bookings"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="url(#confirmedGrad)"
                  dot={{ r: 3, fill: "#2563eb" }}
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="projected"
                  name="Projected"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  fill="url(#projectedGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Week</th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground">Kill Date</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Confirmed</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Projected</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Capacity %</th>
                    <th className="text-right py-2 px-2 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {killData.map((row, i) => (
                    <tr
                      key={i}
                      className={`border-b border-border hover:bg-muted/40 transition-colors ${
                        row.status === "Over" ? "bg-red-50/60" : ""
                      }`}
                    >
                      <td className="py-2 px-2 font-medium text-foreground">{row.week}</td>
                      <td className="py-2 px-2 text-muted-foreground">{row.killDate}</td>
                      <td className="py-2 px-2 text-right">
                        {row.confirmed > 0 ? row.confirmed.toLocaleString() : "—"}
                      </td>
                      <td className="py-2 px-2 text-right text-slate-500">{row.projected.toLocaleString()}</td>
                      <td className="py-2 px-2 text-right font-medium">
                        <span
                          className={
                            row.capacityPct >= 100
                              ? "text-red-600"
                              : row.capacityPct >= 88
                              ? "text-amber-600"
                              : "text-green-700"
                          }
                        >
                          {row.capacityPct}%
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 2: Vendor Supply Forecast ── */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Vendor Supply Forecast
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vendorForecasts.map((vendor) => (
              <Card key={vendor.name} className="border border-border">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-foreground text-base">{vendor.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Last kill: {vendor.lastKill} · {vendor.frequency}
                      </p>
                    </div>
                    <TrendIcon trend={vendor.trend} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-muted-foreground mb-1">Next predicted booking</p>
                      <p className="text-sm font-semibold text-foreground">{vendor.nextDate}</p>
                      <div className="mt-1">
                        <ConfidenceBadge confidence={vendor.confidence} />
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-muted-foreground mb-1">Predicted lot size</p>
                      <p className="text-sm font-semibold text-foreground">{vendor.lotRange}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Section 3: Revenue Projection ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Revenue Projection — 12 Weeks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-xl px-4 py-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Projected 12-week revenue</p>
                <p className="text-2xl font-bold text-foreground">{formatDollar(totalRevenue)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl px-4 py-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Average weekly revenue</p>
                <p className="text-2xl font-bold text-foreground">{formatDollar(avgWeeklyRevenue)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl px-4 py-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Best week</p>
                <p className="text-2xl font-bold text-foreground">{formatDollar(bestWeekRevenue)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl px-4 py-3 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Pipeline confidence</p>
                <p className="text-2xl font-bold text-foreground">{pipelineConfidence}%</p>
              </div>
            </div>

            {/* Bar chart */}
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `$${v}k`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [`$${(value * 1000).toLocaleString()}`, name]}
                />
                <Legend />
                <Bar dataKey="Kill Fee" stackId="a" fill="#2563eb" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Value Add" stackId="a" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <p className="text-xs text-muted-foreground">
              Kill fee at ${KILL_FEE}/head · Value-add (grading, MSA) at ${VALUE_ADD_PER_HEAD}/head avg · HSCW basis {AVG_HSCW}kg
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
