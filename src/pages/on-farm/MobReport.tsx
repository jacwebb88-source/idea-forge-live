import { useParams, Link } from "react-router-dom";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import {
  useMob,
  useFeedPlan,
  useKillRecords,
  useProcessorGrids,
  useMarketBenchmarks,
} from "@/components/on-farm/useMobs";
import {
  CATEGORY_LABELS,
  PROGRAM_LABELS,
  EXIT_PATH_LABELS,
  COST_TYPE_LABELS,
} from "@/components/on-farm/types";

function fmt$(n: number) {
  return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function fmtKg(n: number) {
  return `${n.toFixed(1)} kg`;
}

const STATUS_COLOURS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  sold: "bg-blue-100 text-blue-800",
  slaughtered: "bg-red-100 text-red-800",
  transferred: "bg-amber-100 text-amber-800",
};

export default function MobReport() {
  const { id } = useParams<{ id: string }>();
  const mobId = id ?? "";

  const { mob, costs, weights, loading, totalCost, totalCostPerHead, latestWeight, adg, projectedTurnOffDate } =
    useMob(mobId);
  const { current: feedPlan } = useFeedPlan(mobId);
  const { records: killRecords } = useKillRecords(mobId);
  const { grids } = useProcessorGrids();
  const { latest } = useMarketBenchmarks();

  const today = new Date().toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (loading || !mob) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">Loading report…</div>
      </DashboardLayout>
    );
  }

  // Days on feed
  const purchaseDate = mob.purchase_date ? new Date(mob.purchase_date) : null;
  const daysOnFeed = purchaseDate
    ? Math.floor((Date.now() - purchaseDate.getTime()) / 86400000)
    : null;

  // Recharts weight data
  const weightChartData = weights.map((w) => ({
    date: new Date(w.weigh_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
    weight: w.avg_weight_kg,
  }));

  // Exit path analysis
  const bestGrid = grids.length > 0 ? grids[0] : null;
  const DRESS_PCT = 0.54;
  const currentWeightKg = latestWeight?.avg_weight_kg ?? mob.arrival_weight_avg_kg ?? 0;

  const heavySteerBench = latest("heavy_steer");
  const feederBench = latest("feeder_steer");

  const processorCpkg = bestGrid?.price_cpkg_cw ?? 615;
  const processorNetPerHead = currentWeightKg * DRESS_PCT * processorCpkg / 100 - totalCostPerHead;

  const saleyardHeavyCpkg = heavySteerBench?.cents_per_kg ?? 310;
  const saleyardNetPerHead = currentWeightKg * saleyardHeavyCpkg / 100 - totalCostPerHead;

  const saleyardFeederCpkg = feederBench?.cents_per_kg ?? 295;
  const saleyardFeederNetPerHead = currentWeightKg * saleyardFeederCpkg / 100 - totalCostPerHead;

  const exitOptions = [
    {
      label: "OTH / Processor",
      detail: bestGrid ? `${bestGrid.processor_name} @ ${processorCpkg}¢/kg CW` : `615¢/kg CW (fallback)`,
      basis: `${fmtKg(currentWeightKg)} × ${DRESS_PCT * 100}% dress × ${processorCpkg}¢`,
      netPerHead: processorNetPerHead,
    },
    {
      label: "Saleyard — Heavy Steer",
      detail: `${saleyardHeavyCpkg}¢/kg LW benchmark`,
      basis: `${fmtKg(currentWeightKg)} × ${saleyardHeavyCpkg}¢/kg`,
      netPerHead: saleyardNetPerHead,
    },
    {
      label: "Saleyard — Feeder Steer",
      detail: `${saleyardFeederCpkg}¢/kg LW benchmark`,
      basis: `${fmtKg(currentWeightKg)} × ${saleyardFeederCpkg}¢/kg`,
      netPerHead: saleyardFeederNetPerHead,
    },
  ].sort((a, b) => b.netPerHead - a.netPerHead);

  const bestOptionLabel = exitOptions[0].label;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-16 print:pb-4 print:max-w-none">

        {/* ── Header ── */}
        <div className="flex items-start justify-between print:hidden">
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              <Link to={`/on-farm/mobs/${mobId}`} className="underline hover:text-foreground">
                ← Back to {mob.mob_name}
              </Link>
            </p>
          </div>
          <Button
            onClick={() => window.print()}
            className="rounded-xl bg-green-700 hover:bg-green-800 text-white gap-2 print:hidden"
          >
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </Button>
        </div>

        {/* ── Report Title ── */}
        <div className="border-b pb-4 print:pb-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-black text-green-700">Muster</span>
              <p className="text-sm text-muted-foreground font-medium">Mob Analysis Report</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Generated</p>
              <p className="text-sm font-semibold">{today}</p>
            </div>
          </div>
        </div>

        {/* ── Mob Identity ── */}
        <Card className="rounded-2xl print:shadow-none print:border print:rounded-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-black">{mob.mob_name}</CardTitle>
              <Badge className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOURS[mob.status] ?? "bg-gray-100 text-gray-700"}`}>
                {mob.status.charAt(0).toUpperCase() + mob.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Category</p>
                <p className="font-semibold">{CATEGORY_LABELS[mob.category] ?? mob.category}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Breed</p>
                <p className="font-semibold">{mob.breed_type ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Head Count</p>
                <p className="font-semibold">{mob.head_count}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Location</p>
                <p className="font-semibold">{mob.location_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Program</p>
                <p className="font-semibold">{mob.program_type ? PROGRAM_LABELS[mob.program_type] : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Exit Path</p>
                <p className="font-semibold">{mob.target_exit_path ? EXIT_PATH_LABELS[mob.target_exit_path] : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Purchase Date</p>
                <p className="font-semibold">
                  {mob.purchase_date
                    ? new Date(mob.purchase_date).toLocaleDateString("en-AU")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Target Exit</p>
                <p className="font-semibold">
                  {mob.target_exit_date
                    ? new Date(mob.target_exit_date).toLocaleDateString("en-AU")
                    : projectedTurnOffDate
                    ? projectedTurnOffDate.toLocaleDateString("en-AU") + " (projected)"
                    : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Key Performance Metrics ── */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">Key Performance Metrics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Days on Feed", value: daysOnFeed != null ? `${daysOnFeed} days` : "—", colour: "bg-emerald-50 border-emerald-200 text-emerald-800" },
              { label: "Current Avg Weight", value: latestWeight ? fmtKg(latestWeight.avg_weight_kg) : "—", colour: "bg-blue-50 border-blue-200 text-blue-800" },
              { label: "ADG", value: adg != null ? `${adg.toFixed(2)} kg/day` : "—", colour: "bg-amber-50 border-amber-200 text-amber-800" },
              { label: "Total Cost / Head", value: totalCostPerHead > 0 ? fmt$(totalCostPerHead) : "—", colour: "bg-red-50 border-red-200 text-red-800" },
            ].map(({ label, value, colour }) => (
              <Card key={label} className={`rounded-2xl border ${colour} print:rounded-none print:shadow-none`}>
                <CardContent className="pt-4 pb-4 px-4">
                  <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">{label}</p>
                  <p className="text-xl font-black leading-none">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Financial Ledger ── */}
        <Card className="rounded-2xl print:shadow-none print:border print:rounded-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Financial Ledger</CardTitle>
          </CardHeader>
          <CardContent>
            {costs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No costs recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="text-left py-2 pr-3">Date</th>
                      <th className="text-left py-2 pr-3">Type</th>
                      <th className="text-left py-2 pr-3">Description</th>
                      <th className="text-right py-2 pr-3">Total</th>
                      <th className="text-right py-2">Per Head</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {costs.map((c) => (
                      <tr key={c.id}>
                        <td className="py-2 pr-3 text-muted-foreground">
                          {new Date(c.cost_date).toLocaleDateString("en-AU")}
                        </td>
                        <td className="py-2 pr-3">{COST_TYPE_LABELS[c.cost_type] ?? c.cost_type}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{c.description ?? "—"}</td>
                        <td className="py-2 pr-3 text-right font-semibold">{fmt$(c.amount_total)}</td>
                        <td className="py-2 text-right text-muted-foreground">
                          {c.per_head != null ? fmt$(c.per_head) : fmt$(c.amount_total / mob.head_count)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-foreground/20">
                      <td colSpan={3} className="py-2.5 pr-3 font-black uppercase text-xs tracking-wide">Total</td>
                      <td className="py-2.5 pr-3 text-right font-black">{fmt$(totalCost)}</td>
                      <td className="py-2.5 text-right font-black">{fmt$(totalCostPerHead)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Weight Record & ADG ── */}
        <Card className="rounded-2xl print:shadow-none print:border print:rounded-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Weight Record &amp; ADG</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {weightChartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={200}>
                <RechartsLineChart data={weightChartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}kg`} />
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)} kg`, "Avg Weight"]} />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Insufficient weight records for chart (need 2+).</p>
            )}

            {weights.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="text-left py-2 pr-3">Date</th>
                      <th className="text-right py-2 pr-3">Avg Weight</th>
                      <th className="text-right py-2 pr-3">Head</th>
                      <th className="text-right py-2">ADG since last</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {weights.map((w) => (
                      <tr key={w.id}>
                        <td className="py-2 pr-3">{new Date(w.weigh_date).toLocaleDateString("en-AU")}</td>
                        <td className="py-2 pr-3 text-right font-semibold">{fmtKg(w.avg_weight_kg)}</td>
                        <td className="py-2 pr-3 text-right text-muted-foreground">{w.head_count ?? mob.head_count}</td>
                        <td className="py-2 text-right text-muted-foreground">
                          {w.adg_since_last != null ? `${w.adg_since_last.toFixed(2)} kg/day` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Feed Plan ── */}
        {feedPlan && (
          <Card className="rounded-2xl print:shadow-none print:border print:rounded-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Current Feed Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Feed Source</p>
                  <p className="font-semibold">{feedPlan.feed_source}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Daily Cost / Head</p>
                  <p className="font-semibold">{fmt$(feedPlan.daily_feed_cost_per_head)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Expected ADG</p>
                  <p className="font-semibold">{feedPlan.expected_adg_kg_day.toFixed(2)} kg/day</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Projected Ready</p>
                  <p className="font-semibold">
                    {feedPlan.projected_ready_date
                      ? new Date(feedPlan.projected_ready_date).toLocaleDateString("en-AU")
                      : "—"}
                  </p>
                </div>
              </div>
              {feedPlan.notes && (
                <p className="text-xs text-muted-foreground mt-3 italic">{feedPlan.notes}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Exit Path Analysis ── */}
        <Card className="rounded-2xl print:shadow-none print:border print:rounded-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Exit Path Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Based on current avg weight of {fmtKg(currentWeightKg)} and total cost/head of {fmt$(totalCostPerHead)}.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="text-left py-2 pr-4">Exit Option</th>
                    <th className="text-left py-2 pr-4">Basis</th>
                    <th className="text-right py-2">Net Return / Head</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {exitOptions.map((opt) => {
                    const isBest = opt.label === bestOptionLabel;
                    return (
                      <tr key={opt.label} className={isBest ? "bg-green-50" : ""}>
                        <td className="py-2.5 pr-4">
                          <p className={`font-semibold ${isBest ? "text-green-800" : ""}`}>{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.detail}</p>
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-muted-foreground">{opt.basis}</td>
                        <td className={`py-2.5 text-right font-black text-base ${opt.netPerHead >= 0 ? (isBest ? "text-green-700" : "text-green-600") : "text-red-600"}`}>
                          {fmt$(opt.netPerHead)}
                          {isBest && <span className="ml-1.5 text-xs font-semibold bg-green-200 text-green-800 px-1.5 py-0.5 rounded-full">Best</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Processor price uses {DRESS_PCT * 100}% dressing percentage. Saleyard uses live weight. All estimates only.</p>
          </CardContent>
        </Card>

        {/* ── Kill Records ── */}
        {killRecords.length > 0 && (
          <Card className="rounded-2xl print:shadow-none print:border print:rounded-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Kill Records</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {killRecords.map((kr) => {
                const projectedPayment =
                  kr.avg_carcase_weight_kg && kr.price_cpkg_cw
                    ? kr.avg_carcase_weight_kg * kr.price_cpkg_cw / 100
                    : null;
                return (
                  <div
                    key={kr.id}
                    className="rounded-xl border bg-muted/20 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Kill Date</p>
                      <p className="font-semibold">{new Date(kr.kill_date).toLocaleDateString("en-AU")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Processor</p>
                      <p className="font-semibold">{kr.processor_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Head</p>
                      <p className="font-semibold">{kr.head_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Avg Carcase Wt</p>
                      <p className="font-semibold">{kr.avg_carcase_weight_kg ? fmtKg(kr.avg_carcase_weight_kg) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Price ¢/kg CW</p>
                      <p className="font-semibold">{kr.price_cpkg_cw ? `${kr.price_cpkg_cw}¢` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Grade / Fat</p>
                      <p className="font-semibold">{[kr.grade, kr.fat_score].filter(Boolean).join(" / ") || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Actual Payment</p>
                      <p className="font-black text-green-700">{kr.total_payment ? fmt$(kr.total_payment) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Projected Payment</p>
                      <p className="font-semibold text-muted-foreground">{projectedPayment ? fmt$(projectedPayment) : "—"}</p>
                    </div>
                    {kr.notes && (
                      <div className="col-span-2 sm:col-span-4">
                        <p className="text-xs italic text-muted-foreground">{kr.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* ── Disclaimer ── */}
        <div className="border-t pt-4 text-xs text-muted-foreground leading-relaxed">
          This report is generated by Muster. All projections are estimates based on inputs provided.
          Market prices sourced from MLA/NLRS benchmarks. Not financial advice.
        </div>

      </div>
    </DashboardLayout>
  );
}
