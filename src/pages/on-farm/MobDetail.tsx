import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMob, useMarketBenchmarks } from "@/components/on-farm/useMobs";
import {
  CATEGORY_LABELS, PROGRAM_LABELS, EXIT_PATH_LABELS, COST_TYPE_LABELS, COST_TYPE_GROUPS,
  type CostType, type ExitPath,
} from "@/components/on-farm/types";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft, Plus, DollarSign, Scale, TrendingUp,
  CheckCircle, XCircle, Clock, Beef, Edit3,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt$(n: number) { return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fmtKg(n: number) { return `${n.toFixed(1)} kg`; }

function statusBadge(s: string) {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    sold: "bg-blue-100 text-blue-700",
    slaughtered: "bg-slate-100 text-slate-700",
    transferred: "bg-amber-100 text-amber-700",
  };
  return map[s] ?? "bg-gray-100 text-gray-700";
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mob, costs, weights, loading, refetch, totalCost, totalCostPerHead, latestWeight, adg, projectedTurnOffDate } = useMob(id!);
  const { latest } = useMarketBenchmarks();

  const [showCostDialog, setShowCostDialog] = useState(false);
  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  if (loading) return <DashboardLayout><div className="p-8 text-center text-muted-foreground">Loading…</div></DashboardLayout>;
  if (!mob) return <DashboardLayout><div className="p-8 text-center text-muted-foreground">Mob not found.</div></DashboardLayout>;

  const dof = differenceInDays(new Date(), new Date(mob.purchase_date));

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Back + header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/on-farm")} className="gap-1 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> On Farm
          </Button>
        </div>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Beef className="h-5 w-5 text-primary" />
                {mob.mob_name}
              </h1>
              <Badge className={`text-xs ${statusBadge(mob.status)}`}>{mob.status}</Badge>
              <Badge className="text-xs bg-muted text-muted-foreground">{CATEGORY_LABELS[mob.category]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {mob.head_count} head
              {mob.location_name && ` · ${mob.location_name}`}
              {mob.program_type && ` · ${PROGRAM_LABELS[mob.program_type as keyof typeof PROGRAM_LABELS]}`}
              {` · ${dof} days on feed`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowStatusDialog(true)} className="gap-1">
              <Edit3 className="h-3.5 w-3.5" /> Status
            </Button>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiTile icon={<DollarSign className="h-4 w-4 text-amber-600" />} label="Total Cost" value={fmt$(totalCost)} sub={`${fmt$(totalCostPerHead)}/head`} color="bg-amber-50" />
          <KpiTile icon={<Scale className="h-4 w-4 text-blue-600" />} label="Current Weight" value={latestWeight ? fmtKg(latestWeight.avg_weight_kg) : "—"} sub={latestWeight ? format(new Date(latestWeight.weigh_date), "d MMM") : "No weigh yet"} color="bg-blue-50" />
          <KpiTile icon={<TrendingUp className="h-4 w-4 text-green-600" />} label="Avg Daily Gain" value={adg != null ? `${adg.toFixed(3)} kg/d` : "—"} sub={weights.length > 1 ? `${weights.length} weigh events` : "Need ≥2 weighs"} color="bg-green-50" />
          <KpiTile icon={<Clock className="h-4 w-4 text-purple-600" />} label="Projected Exit" value={projectedTurnOffDate ? format(projectedTurnOffDate, "d MMM yy") : mob.target_exit_date ? format(new Date(mob.target_exit_date), "d MMM yy") : "—"} sub={mob.target_weight_kg ? `Target ${fmtKg(mob.target_weight_kg)}` : "No target set"} color="bg-purple-50" />
        </div>

        {/* Compliance flags */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "hgp_free", label: "HGP Free" },
            { key: "msa_eligible", label: "MSA Eligible" },
            { key: "halal_certified", label: "Halal" },
            { key: "nlis_confirmed", label: "NLIS ✓" },
            { key: "nvd_received", label: "NVD ✓" },
          ].map(({ key, label }) => {
            const ok = mob[key as keyof typeof mob] as boolean;
            return (
              <span key={key} className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${ok ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>
                {ok ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                {label}
              </span>
            );
          })}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="costs">
          <TabsList className="grid grid-cols-3 w-full max-w-lg">
            <TabsTrigger value="costs">Cost Ledger</TabsTrigger>
            <TabsTrigger value="weights">Weight & ADG</TabsTrigger>
            <TabsTrigger value="exit">Exit Decision</TabsTrigger>
          </TabsList>

          {/* ─── COST LEDGER ─────────────────────────────────────────── */}
          <TabsContent value="costs" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">Cost Ledger</h2>
              <Button size="sm" onClick={() => setShowCostDialog(true)} className="gap-1">
                <Plus className="h-4 w-4" /> Add Cost
              </Button>
            </div>

            {costs.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No costs logged yet.</CardContent></Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                          <th className="text-left px-4 py-2.5">Date</th>
                          <th className="text-left px-4 py-2.5">Type</th>
                          <th className="text-left px-4 py-2.5">Description</th>
                          <th className="text-right px-4 py-2.5">Total</th>
                          <th className="text-right px-4 py-2.5">Per Head</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {costs.map(c => (
                          <tr key={c.id} className="hover:bg-muted/20">
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{format(new Date(c.cost_date), "d MMM yy")}</td>
                            <td className="px-4 py-2.5">
                              <span className="bg-muted text-xs px-2 py-0.5 rounded">
                                {COST_TYPE_LABELS[c.cost_type as CostType]}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">{c.description ?? "—"}</td>
                            <td className="px-4 py-2.5 text-right font-medium">{fmt$(c.amount_total)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">{c.per_head ? fmt$(c.per_head) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t bg-muted/20 font-semibold">
                          <td colSpan={3} className="px-4 py-3 text-sm">Total</td>
                          <td className="px-4 py-3 text-right">{fmt$(totalCost)}</td>
                          <td className="px-4 py-3 text-right">{fmt$(totalCostPerHead)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cost breakdown by group */}
            {costs.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {COST_TYPE_GROUPS.map(group => {
                  const groupTotal = costs
                    .filter(c => group.types.includes(c.cost_type as CostType))
                    .reduce((s, c) => s + c.amount_total, 0);
                  return (
                    <div key={group.label} className="bg-muted/30 border rounded-lg px-4 py-3">
                      <p className="text-xs text-muted-foreground">{group.label}</p>
                      <p className="text-base font-bold">{fmt$(groupTotal)}</p>
                      <p className="text-xs text-muted-foreground">{fmt$(groupTotal / mob.head_count)}/head</p>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ─── WEIGHT & ADG ────────────────────────────────────────── */}
          <TabsContent value="weights" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">Weight History</h2>
              <Button size="sm" onClick={() => setShowWeightDialog(true)} className="gap-1">
                <Plus className="h-4 w-4" /> Log Weight
              </Button>
            </div>

            {weights.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No weight records yet. Log the first weigh to start tracking ADG.</CardContent></Card>
            ) : (
              <>
                <Card>
                  <CardContent className="pt-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={weights.map(w => ({
                        date: format(new Date(w.weigh_date), "d MMM"),
                        weight: w.avg_weight_kg,
                        adg: w.adg_since_last ? parseFloat(w.adg_since_last.toFixed(3)) : null,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} unit=" kg" />
                        <Tooltip formatter={(v: number, n: string) => [n === "weight" ? `${v} kg` : `${v} kg/d`, n === "weight" ? "Avg weight" : "ADG"]} />
                        <Line type="monotone" dataKey="weight" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-0">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                          <th className="text-left px-4 py-2.5">Date</th>
                          <th className="text-right px-4 py-2.5">Avg Weight</th>
                          <th className="text-right px-4 py-2.5">ADG since last</th>
                          <th className="text-left px-4 py-2.5">Method</th>
                          <th className="text-left px-4 py-2.5">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {[...weights].reverse().map((w, i) => (
                          <tr key={w.id} className="hover:bg-muted/20">
                            <td className="px-4 py-2.5 whitespace-nowrap">{format(new Date(w.weigh_date), "d MMM yyyy")}</td>
                            <td className="px-4 py-2.5 text-right font-medium">{fmtKg(w.avg_weight_kg)}</td>
                            <td className="px-4 py-2.5 text-right text-muted-foreground">
                              {w.adg_since_last ? `${w.adg_since_last.toFixed(3)} kg/d` : "—"}
                            </td>
                            <td className="px-4 py-2.5 capitalize text-muted-foreground">{w.method ?? "weighbridge"}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{w.notes ?? ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                {/* Projections */}
                {adg != null && mob.target_weight_kg && latestWeight && (
                  <Card className="border-green-200 bg-green-50/30">
                    <CardContent className="pt-4 space-y-2">
                      <h3 className="font-semibold text-sm">Projections</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">Current ADG</p>
                          <p className="font-bold">{adg.toFixed(3)} kg/day</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Kg to target</p>
                          <p className="font-bold">{(mob.target_weight_kg - latestWeight.avg_weight_kg).toFixed(1)} kg</p>
                        </div>
                        {projectedTurnOffDate && (
                          <div>
                            <p className="text-muted-foreground text-xs">Projected turn-off</p>
                            <p className="font-bold">{format(projectedTurnOffDate, "d MMM yyyy")}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-muted-foreground text-xs">Days to target (at current ADG)</p>
                          <p className="font-bold">
                            {adg > 0 ? Math.round((mob.target_weight_kg - latestWeight.avg_weight_kg) / adg) : "∞"} days
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">Cost of gain so far</p>
                          <p className="font-bold">
                            {mob.arrival_weight_avg_kg && latestWeight.avg_weight_kg > mob.arrival_weight_avg_kg
                              ? fmt$((totalCostPerHead) / (latestWeight.avg_weight_kg - mob.arrival_weight_avg_kg)) + "/kg"
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* ─── EXIT DECISION ───────────────────────────────────────── */}
          <TabsContent value="exit" className="space-y-4 mt-4">
            <div>
              <h2 className="font-semibold">Exit Decision Dashboard</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Comparing all exit paths at current weight and market prices. Total cost to date included.
              </p>
            </div>

            <ExitDecisionDashboard mob={mob} totalCostPerHead={totalCostPerHead} latestWeightKg={latestWeight?.avg_weight_kg ?? mob.arrival_weight_avg_kg ?? mob.purchase_weight_avg_kg ?? 0} latest={latest} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <AddCostDialog open={showCostDialog} onClose={() => setShowCostDialog(false)} mobId={mob.id} headCount={mob.head_count} onSaved={() => { setShowCostDialog(false); refetch(); }} toast={toast} />
      <LogWeightDialog open={showWeightDialog} onClose={() => setShowWeightDialog(false)} mobId={mob.id} weights={weights} onSaved={() => { setShowWeightDialog(false); refetch(); }} toast={toast} />
      <StatusDialog open={showStatusDialog} onClose={() => setShowStatusDialog(false)} mobId={mob.id} currentStatus={mob.status} onSaved={() => { setShowStatusDialog(false); refetch(); }} toast={toast} />
    </DashboardLayout>
  );
}

// ─── KPI Tile ─────────────────────────────────────────────────────────────────

function KpiTile({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className={`h-8 w-8 rounded-full ${color} flex items-center justify-center shrink-0`}>{icon}</div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold leading-tight truncate">{value}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Exit Decision Dashboard ──────────────────────────────────────────────────

function ExitDecisionDashboard({ mob, totalCostPerHead, latestWeightKg, latest }: {
  mob: any; totalCostPerHead: number; latestWeightKg: number; latest: (k: string) => any;
}) {
  const [dressingPct, setDressingPct] = useState(58);
  const [saleyardDiscount, setSaleyardDiscount] = useState(0);
  const [mlaLevyExit, setMlaLevyExit] = useState(5);
  const [agentCommExit, setAgentCommExit] = useState(4.5);
  const [freightOut, setFreightOut] = useState(80);
  const [liveExportPremium, setLiveExportPremium] = useState(25);
  const [breedingPremium, setBreedingPremium] = useState(100);
  const [processorMarginPct, setProcessorMarginPct] = useState(10);

  const feederBench = latest("feeder_steer")?.cents_per_kg ?? 0;
  const heavySteerBench = latest("heavy_steer")?.cents_per_kg ?? 0;
  const heavyCowBench = latest("heavy_cow")?.cents_per_kg ?? 0;

  const benchmarkForCategory = () => {
    if (["weaner", "backgrounder", "trade"].includes(mob.category)) return feederBench;
    if (["boner_cow", "cull_cow"].includes(mob.category)) return heavyCowBench;
    return heavySteerBench;
  };

  const saleyardCentsPerKg = benchmarkForCategory() - saleyardDiscount;
  const othCentsPerKg = (() => {
    const stateKey = "oth_vic"; // default; could be user-selected
    return latest(stateKey)?.cents_per_kg ?? 0;
  })();

  // Path A — Saleyard
  const saleyardGross = (saleyardCentsPerKg / 100) * latestWeightKg;
  const saleyardCosts = freightOut + (latestWeightKg * saleyardCentsPerKg / 100) * (agentCommExit / 100) + 18 + mlaLevyExit;
  const saleyardNet = saleyardGross - saleyardCosts;
  const saleyardMargin = saleyardNet - totalCostPerHead;

  // Path B — OTH
  const carcaseKg = latestWeightKg * (dressingPct / 100);
  const hgpPremium = mob.hgp_free ? 50 : 0;
  const msaPremium = mob.msa_eligible ? 24 : 0;
  const othGross = (othCentsPerKg / 100 + (hgpPremium + msaPremium) / 100) * carcaseKg;
  const othCosts = freightOut + mlaLevyExit;
  const othNet = othGross - othCosts;
  const othMargin = othNet - totalCostPerHead;

  // Path C — Live export
  const liveExportEligible = latestWeightKg >= 350 && latestWeightKg <= 550;
  const liveExportGross = liveExportEligible ? (saleyardCentsPerKg + liveExportPremium) / 100 * latestWeightKg : 0;
  const liveExportCosts = liveExportEligible ? freightOut + 40 + mlaLevyExit : 0; // +$40 compliance/cert est.
  const liveExportNet = liveExportGross - liveExportCosts;
  const liveExportMargin = liveExportNet - totalCostPerHead;

  // Path D — Breeding stock
  const breedingGross = saleyardGross + breedingPremium;
  const breedingCosts = freightOut + mlaLevyExit;
  const breedingNet = breedingGross - breedingCosts;
  const breedingMargin = breedingNet - totalCostPerHead;

  // Path E — Kill own
  const killOwnGross = (othCentsPerKg / 100) * carcaseKg * (1 + processorMarginPct / 100);
  const killOwnCosts = mlaLevyExit + 20; // processing/compliance
  const killOwnNet = killOwnGross - killOwnCosts;
  const killOwnMargin = killOwnNet - totalCostPerHead;

  const paths = [
    { key: "saleyard" as ExitPath, label: "A — Sell Store (Saleyard)", gross: saleyardGross, costs: saleyardCosts, net: saleyardNet, margin: saleyardMargin, eligible: true, notes: `${saleyardCentsPerKg}¢/kg lwt · ${latestWeightKg.toFixed(0)}kg` },
    { key: "oth" as ExitPath, label: "B — OTH (Direct to Processor)", gross: othGross, costs: othCosts, net: othNet, margin: othMargin, eligible: true, notes: `${dressingPct}% dress → ${carcaseKg.toFixed(0)}kg CW · ${othCentsPerKg}¢/kg dw${hgpPremium ? ` +${hgpPremium}¢ HGP` : ""}${msaPremium ? ` +${msaPremium}¢ MSA` : ""}` },
    { key: "live_export" as ExitPath, label: "C — Live Export", gross: liveExportGross, costs: liveExportCosts, net: liveExportNet, margin: liveExportMargin, eligible: liveExportEligible, notes: liveExportEligible ? `+${liveExportPremium}¢/kg premium · ESCAS + Halal required` : `Not eligible — weight ${latestWeightKg.toFixed(0)}kg (need 350–550kg)` },
    { key: "breeding" as ExitPath, label: "D — Sell as Breeding Stock", gross: breedingGross, costs: breedingCosts, net: breedingNet, margin: breedingMargin, eligible: true, notes: `+$${breedingPremium}/head premium over store price` },
    { key: "kill_own" as ExitPath, label: "E — Kill Own (Boning Room)", gross: killOwnGross, costs: killOwnCosts, net: killOwnNet, margin: killOwnMargin, eligible: true, notes: `Capture ~${processorMarginPct}% processor margin · ${carcaseKg.toFixed(0)}kg CW` },
  ].sort((a, b) => (b.eligible ? b.margin : -99999) - (a.eligible ? a.margin : -99999));

  const best = paths.find(p => p.eligible);

  return (
    <div className="space-y-4">
      {/* Assumptions */}
      <Card className="border-dashed">
        <CardHeader className="pb-2"><CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Adjust Assumptions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="space-y-1">
              <Label className="text-xs">Dressing % (OTH)</Label>
              <Input type="number" step="0.5" min="50" max="65" value={dressingPct} onChange={e => setDressingPct(+e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Freight out ($/head)</Label>
              <Input type="number" step="5" value={freightOut} onChange={e => setFreightOut(+e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Agent comm exit (%)</Label>
              <Input type="number" step="0.1" value={agentCommExit} onChange={e => setAgentCommExit(+e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Saleyard discount (¢/kg)</Label>
              <Input type="number" step="1" value={saleyardDiscount} onChange={e => setSaleyardDiscount(+e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Live export premium (¢/kg)</Label>
              <Input type="number" step="5" value={liveExportPremium} onChange={e => setLiveExportPremium(+e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Breeding premium ($/head)</Label>
              <Input type="number" step="50" value={breedingPremium} onChange={e => setBreedingPremium(+e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Processor margin % (kill own)</Label>
              <Input type="number" step="1" value={processorMarginPct} onChange={e => setProcessorMarginPct(+e.target.value)} className="h-8 text-sm" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Path cards */}
      <div className="space-y-3">
        {paths.map((path, idx) => (
          <Card key={path.key} className={`${!path.eligible ? "opacity-50" : ""} ${path.key === best?.key ? "border-green-400 bg-green-50/30" : ""}`}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {path.key === best?.key && <Badge className="bg-green-100 text-green-700 text-xs">Best return</Badge>}
                    {!path.eligible && <Badge variant="outline" className="text-xs">Not eligible</Badge>}
                    <span className="font-semibold text-sm">{path.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{path.notes}</p>
                  {path.eligible && (
                    <div className="flex gap-4 mt-2 text-xs flex-wrap">
                      <span className="text-muted-foreground">Gross: <span className="text-foreground font-medium">${path.gross.toFixed(2)}</span></span>
                      <span className="text-muted-foreground">Selling costs: <span className="text-foreground font-medium">${path.costs.toFixed(2)}</span></span>
                      <span className="text-muted-foreground">Net: <span className="text-foreground font-medium">${path.net.toFixed(2)}</span></span>
                    </div>
                  )}
                </div>
                {path.eligible && (
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Margin vs cost</p>
                    <p className={`text-xl font-bold ${path.margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {path.margin >= 0 ? "+" : ""}{path.margin.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">$/head</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Market prices from MLA/NLRS. Margins show net return minus all costs logged to date. Adjust assumptions above to model different scenarios.
        All figures per head.
      </p>
    </div>
  );
}

// ─── Add Cost Dialog ──────────────────────────────────────────────────────────

function AddCostDialog({ open, onClose, mobId, headCount, onSaved, toast }: any) {
  const [form, setForm] = useState({ cost_date: new Date().toISOString().split("T")[0], cost_type: "", description: "", amount_total: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const perHead = form.amount_total && headCount ? (parseFloat(form.amount_total) / headCount).toFixed(2) : "";

  async function save() {
    if (!form.cost_type || !form.amount_total) return;
    setSaving(true);
    const { error } = await supabase.from("mob_costs").insert({
      mob_id: mobId, cost_date: form.cost_date, cost_type: form.cost_type,
      description: form.description || null, amount_total: parseFloat(form.amount_total),
      per_head: perHead ? parseFloat(perHead) : null, head_count: headCount,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Cost added" });
    setForm({ cost_date: new Date().toISOString().split("T")[0], cost_type: "", description: "", amount_total: "", notes: "" });
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Cost</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={form.cost_date} onChange={e => set("cost_date", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Amount ($total)</Label>
              <Input type="number" step="0.01" placeholder="e.g. 480.00" value={form.amount_total} onChange={e => set("amount_total", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Cost Type</Label>
            <Select value={form.cost_type} onValueChange={v => set("cost_type", v)}>
              <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
              <SelectContent>
                {COST_TYPE_GROUPS.map(group => (
                  <div key={group.label}>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">{group.label}</div>
                    {group.types.map(t => <SelectItem key={t} value={t}>{COST_TYPE_LABELS[t]}</SelectItem>)}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Input placeholder="Optional detail" value={form.description} onChange={e => set("description", e.target.value)} />
          </div>
          {perHead && (
            <p className="text-xs text-muted-foreground bg-muted/40 rounded px-3 py-1.5">
              = <strong>${perHead}/head</strong> across {headCount} head
            </p>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={save} disabled={saving || !form.cost_type || !form.amount_total} className="flex-1">
              {saving ? "Saving…" : "Add Cost"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Log Weight Dialog ────────────────────────────────────────────────────────

function LogWeightDialog({ open, onClose, mobId, weights, onSaved, toast }: any) {
  const [form, setForm] = useState({ weigh_date: new Date().toISOString().split("T")[0], avg_weight_kg: "", method: "weighbridge", notes: "" });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const prev = weights.length ? weights[weights.length - 1] : null;
  const adg = prev && form.avg_weight_kg ? (() => {
    const days = Math.max(1, differenceInDays(new Date(form.weigh_date), new Date(prev.weigh_date)));
    return ((parseFloat(form.avg_weight_kg) - prev.avg_weight_kg) / days).toFixed(3);
  })() : null;

  async function save() {
    if (!form.avg_weight_kg) return;
    setSaving(true);
    const { error } = await supabase.from("weight_records").insert({
      mob_id: mobId, weigh_date: form.weigh_date,
      avg_weight_kg: parseFloat(form.avg_weight_kg),
      method: form.method, adg_since_last: adg ? parseFloat(adg) : null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Weight logged" });
    setForm({ weigh_date: new Date().toISOString().split("T")[0], avg_weight_kg: "", method: "weighbridge", notes: "" });
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Log Weight</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Weigh Date</Label>
              <Input type="date" value={form.weigh_date} onChange={e => set("weigh_date", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Avg weight (kg/head)</Label>
              <Input type="number" step="0.1" placeholder="e.g. 385.5" value={form.avg_weight_kg} onChange={e => set("avg_weight_kg", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Method</Label>
            <Select value={form.method} onValueChange={v => set("method", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="weighbridge">Weighbridge</SelectItem>
                <SelectItem value="estimate">Visual estimate</SelectItem>
                <SelectItem value="scan">EID scan / auto-weigh</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {prev && adg && (
            <div className="bg-muted/40 rounded px-3 py-2 text-xs space-y-0.5">
              <p>Previous weigh: <strong>{prev.avg_weight_kg} kg</strong> on {format(new Date(prev.weigh_date), "d MMM")}</p>
              <p>ADG since last weigh: <strong>{adg} kg/day</strong></p>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Input placeholder="Optional" value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={save} disabled={saving || !form.avg_weight_kg} className="flex-1">
              {saving ? "Saving…" : "Log Weight"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Status Dialog ────────────────────────────────────────────────────────────

function StatusDialog({ open, onClose, mobId, currentStatus, onSaved, toast }: any) {
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("mobs").update({ status }).eq("id", mobId);
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Status updated" });
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xs">
        <DialogHeader><DialogTitle>Update Mob Status</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="slaughtered">Slaughtered</SelectItem>
              <SelectItem value="transferred">Transferred</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={save} disabled={saving} className="flex-1">{saving ? "Saving…" : "Update"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
