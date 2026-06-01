import {
  LineChart as RechartsLineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, CalendarCheck, DollarSign, Users } from "lucide-react";

// ─── Demo data ───────────────────────────────────────────────────────────────

const WEEKS = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7", "Week 8"];

const PRICE_FORECAST_DATA = [
  { week: "Week 1", angusMSA: 620, wagyuGFF: 780, gff100: 660, brahman: 560 },
  { week: "Week 2", angusMSA: 624, wagyuGFF: 775, gff100: 661, brahman: 558 },
  { week: "Week 3", angusMSA: 627, wagyuGFF: 768, gff100: 663, brahman: 556 },
  { week: "Week 4", angusMSA: 630, wagyuGFF: 762, gff100: 662, brahman: 554 },
  { week: "Week 5", angusMSA: 634, wagyuGFF: 766, gff100: 664, brahman: 552 },
  { week: "Week 6", angusMSA: 638, wagyuGFF: 772, gff100: 663, brahman: 551 },
  { week: "Week 7", angusMSA: 642, wagyuGFF: 778, gff100: 665, brahman: 550 },
  { week: "Week 8", angusMSA: 645, wagyuGFF: 784, gff100: 665, brahman: 549 },
];

const SPEC_CARDS = [
  {
    key: "angusMSA",
    label: "Angus Grassfed MSA",
    current: 620,
    forecast: 645,
    color: "#16a34a",
    confidence: 82,
  },
  {
    key: "wagyuGFF",
    label: "Wagyu Cross GFF 150 day",
    current: 780,
    forecast: 784,
    color: "#d97706",
    confidence: 74,
  },
  {
    key: "gff100",
    label: "Angus GFF 100 day",
    current: 660,
    forecast: 665,
    color: "#2563eb",
    confidence: 79,
  },
  {
    key: "brahman",
    label: "Brahman Cross Grassfed",
    current: 560,
    forecast: 549,
    color: "#64748b",
    confidence: 68,
  },
];

// Mob timing: how many head reach target weight each week
const MOBS = [
  {
    name: "Autumn Drop Angus",
    currentAvgKg: 310,
    targetKg: 360,
    readyWeek: 3,
    forecastCpkg: 627,
    estimatedReturnPerHead: 2050,
    headCount: 220,
    spec: "angusMSA",
    best: false,
  },
  {
    name: "GFF Wagyu Cross",
    currentAvgKg: 385,
    targetKg: 420,
    readyWeek: 5,
    forecastCpkg: 766,
    estimatedReturnPerHead: 3290,
    headCount: 180,
    spec: "wagyuGFF",
    best: true,
  },
  {
    name: "Grassfed Hereford",
    currentAvgKg: 290,
    targetKg: 340,
    readyWeek: 6,
    forecastCpkg: 638,
    estimatedReturnPerHead: 1820,
    headCount: 200,
    spec: "angusMSA",
    best: false,
  },
];

// Cash flow: proceeds per week from mobs reaching target
const CASHFLOW_DATA = WEEKS.map((week, i) => {
  const weekNum = i + 1;
  const mob = MOBS.find((m) => m.readyWeek === weekNum);
  const proceeds = mob ? mob.headCount * mob.estimatedReturnPerHead : 0;
  return { week, proceeds };
});

const TOTAL_PROCEEDS = MOBS.reduce((sum, m) => sum + m.headCount * m.estimatedReturnPerHead, 0);
const TOTAL_HEAD = MOBS.reduce((sum, m) => sum + m.headCount, 0);
const AVG_PER_HEAD = Math.round(TOTAL_PROCEEDS / TOTAL_HEAD);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtCpkg(n: number) {
  return `${n.toFixed(0)}¢/kg`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnFarmForecasting() {
  const today = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const bestMob = MOBS.find((m) => m.best);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-10">

        {/* ── Hero ── */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">On-Farm Forecasting</h1>
          <p className="text-muted-foreground mt-1">
            8-week price outlook, optimal sell timing, and cash flow projection · Muster Intelligence
          </p>
        </div>
        <p className="text-muted-foreground text-xs">{today}</p>

        {/* ══════════════════════════════════════════════════════════════════════
            Section 1 — Market Price Forecast
        ══════════════════════════════════════════════════════════════════════ */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">
            Market Price Forecast — 8-Week Grid Outlook
          </h2>

          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Forecast Grid Prices · ¢/kg HSCW
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <RechartsLineChart
                  data={PRICE_FORECAST_DATA}
                  margin={{ top: 8, right: 20, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `${v}¢`}
                    domain={[520, 820]}
                  />
                  <Tooltip
                    formatter={(v: number, name: string) => {
                      const spec = SPEC_CARDS.find((s) => s.key === name);
                      return [`${v}¢/kg HSCW`, spec?.label ?? name];
                    }}
                  />
                  <Legend
                    formatter={(v) => {
                      const spec = SPEC_CARDS.find((s) => s.key === v);
                      return spec?.label ?? v;
                    }}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="angusMSA"
                    stroke="#16a34a"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="wagyuGFF"
                    stroke="#d97706"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="gff100"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="brahman"
                    stroke="#64748b"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    strokeDasharray="4 2"
                  />
                </RechartsLineChart>
              </ResponsiveContainer>

              {/* Spec cards strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
                {SPEC_CARDS.map((spec) => {
                  const change = spec.forecast - spec.current;
                  const isUp = change >= 0;
                  return (
                    <div
                      key={spec.key}
                      className="rounded-xl border bg-white shadow-sm px-4 py-3 space-y-1.5"
                      style={{ borderLeftWidth: 4, borderLeftColor: spec.color }}
                    >
                      <p className="text-xs font-semibold text-muted-foreground leading-tight">
                        {spec.label}
                      </p>
                      <p className="text-2xl font-bold leading-none" style={{ color: spec.color }}>
                        {fmtCpkg(spec.current)}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {isUp ? (
                          <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                        )}
                        <span
                          className={`text-xs font-semibold ${isUp ? "text-green-600" : "text-red-500"}`}
                        >
                          {isUp ? "+" : ""}
                          {change}¢ by wk 8
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Confidence</span>
                        <span className="text-xs font-bold">{spec.confidence}%</span>
                      </div>
                      <div className="w-full bg-muted/30 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${spec.confidence}%`,
                            backgroundColor: spec.color,
                            opacity: 0.7,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            Section 2 — Best Time to Sell
        ══════════════════════════════════════════════════════════════════════ */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">
            Best Time to Sell
          </h2>

          {bestMob && (
            <div className="rounded-2xl bg-green-50 border border-green-200 px-5 py-4 mb-4">
              <p className="text-sm font-semibold text-green-800 mb-1">
                Muster Recommendation
              </p>
              <p className="text-sm text-green-700 leading-relaxed">
                Based on current mob weights and projected daily gain of 1.2–1.5 kg/day, the optimal
                kill window for your <span className="font-bold">{bestMob.name}</span> mob is{" "}
                <span className="font-bold">Week {bestMob.readyWeek}</span>. At that point the
                forecast grid price is{" "}
                <span className="font-bold">{fmtCpkg(bestMob.forecastCpkg)}</span> HSCW and
                average carcase weight should hit target — maximising your return per head at{" "}
                <span className="font-bold">{fmt$(bestMob.estimatedReturnPerHead)}</span>.
              </p>
            </div>
          )}

          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-green-600" />
                <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Mob Readiness &amp; Projected Returns
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="text-left py-2 pr-4">Mob</th>
                      <th className="text-right py-2 pr-4">Current avg wt</th>
                      <th className="text-right py-2 pr-4">Target wt</th>
                      <th className="text-right py-2 pr-4">Ready</th>
                      <th className="text-right py-2 pr-4">Forecast grid</th>
                      <th className="text-right py-2 pr-4">Est. return/head</th>
                      <th className="text-right py-2">Head</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {MOBS.map((mob) => (
                      <tr key={mob.name} className={mob.best ? "bg-green-50" : ""}>
                        <td className="py-3 pr-4 font-semibold">
                          <div className="flex items-center gap-2">
                            {mob.name}
                            {mob.best && (
                              <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-bold shrink-0">
                                Best Window
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right">{mob.currentAvgKg} kg</td>
                        <td className="py-3 pr-4 text-right">{mob.targetKg} kg</td>
                        <td className="py-3 pr-4 text-right font-semibold text-green-700">
                          Week {mob.readyWeek}
                        </td>
                        <td className="py-3 pr-4 text-right font-bold text-blue-700">
                          {fmtCpkg(mob.forecastCpkg)}
                        </td>
                        <td className="py-3 pr-4 text-right font-bold text-green-700">
                          {fmt$(mob.estimatedReturnPerHead)}
                        </td>
                        <td className="py-3 text-right text-muted-foreground">{mob.headCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Projections assume 1.2–1.5 kg/day average daily gain. Grid prices are Muster Intelligence
                8-week forecast — verify with your processor before committing. Estimated return per
                head based on target carcase weight × forecast grid price.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            Section 3 — Cash Flow Projection
        ══════════════════════════════════════════════════════════════════════ */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">
            Cash Flow Projection
          </h2>

          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card className="rounded-2xl">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total proceeds · 8 weeks</p>
                    <p className="text-2xl font-bold text-green-700">{fmt$(TOTAL_PROCEEDS)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Average per head</p>
                    <p className="text-2xl font-bold text-blue-700">{fmt$(AVG_PER_HEAD)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Head due to kill</p>
                    <p className="text-2xl font-bold text-amber-700">{TOTAL_HEAD.toLocaleString("en-AU")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Estimated Kill Proceeds by Week
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={CASHFLOW_DATA}
                  margin={{ top: 8, right: 20, left: 0, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) =>
                      v === 0 ? "$0" : `$${(v / 1000).toFixed(0)}k`
                    }
                  />
                  <Tooltip
                    formatter={(v: number) => [
                      fmt$(v),
                      "Estimated proceeds",
                    ]}
                  />
                  <Bar dataKey="proceeds" radius={[6, 6, 0, 0]}>
                    {CASHFLOW_DATA.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.proceeds > 0 ? "#16a34a" : "#e5e7eb"}
                        opacity={entry.proceeds > 0 ? 1 : 0.3}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Bars represent kill proceeds for mobs reaching target weight in that week.
                Empty weeks indicate no mobs scheduled. Estimates only — confirm with processor.
              </p>
            </CardContent>
          </Card>
        </section>

      </div>
    </DashboardLayout>
  );
}
