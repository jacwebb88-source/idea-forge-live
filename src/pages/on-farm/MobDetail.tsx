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
import { categoryToken, exitToken, programToken } from "@/components/on-farm/farmTokens";
import {
  COST_TYPE_LABELS, COST_TYPE_GROUPS,
  type CostType, type ExitPath,
} from "@/components/on-farm/types";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  ArrowLeft, Plus, Scale, TrendingUp, Clock,
  CheckCircle, XCircle, DollarSign, Beef, Edit3,
  ChevronRight, Layers,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

function fmt$(n: number) { return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }
function fmtKg(n: number) { return `${n.toFixed(1)} kg`; }
function fmt$fine(n: number) { return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

export default function MobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mob, costs, weights, loading, refetch, totalCost, totalCostPerHead, latestWeight, adg, projectedTurnOffDate } = useMob(id!);
  const { latest } = useMarketBenchmarks();

  const [showCostDialog, setShowCostDialog] = useState(false);
  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  if (loading) return (
    <DashboardLayout>
      <div className="space-y-3 animate-pulse p-4">
        <div className="h-48 rounded-2xl bg-muted/40" />
        <div className="h-24 rounded-xl bg-muted/40" />
        <div className="h-64 rounded-xl bg-muted/40" />
      </div>
    </DashboardLayout>
  );
  if (!mob) return <DashboardLayout><div className="p-8 text-center text-muted-foreground">Mob not found.</div></DashboardLayout>;

  const cat = categoryToken(mob.category);
  const exit = exitToken(mob.target_exit_path);
  const prog = programToken(mob.program_type);
  const dof = differenceInDays(new Date(), new Date(mob.purchase_date));
  const daysToExit = mob.target_exit_date ? differenceInDays(new Date(mob.target_exit_date), new Date()) : null;
  const currentWt = latestWeight?.avg_weight_kg ?? mob.arrival_weight_avg_kg ?? mob.purchase_weight_avg_kg ?? 0;
  const arrivalWt = mob.arrival_weight_avg_kg ?? mob.purchase_weight_avg_kg ?? 0;
  const targetWt = mob.target_weight_kg ?? 0;
  const wtPct = targetWt && arrivalWt ? Math.min(100, Math.round(((currentWt - arrivalWt) / (targetWt - arrivalWt)) * 100)) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-5 pb-10">

        {/* ── Hero header with category colour ─────────────────────────── */}
        <div className={`rounded-2xl overflow-hidden bg-gradient-to-br ${cat.gradient} relative`}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
          />
          <div className="relative px-5 pt-5 pb-5">
            {/* Back + status */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigate("/on-farm")}
                className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> On Farm
              </button>
              <button
                onClick={() => setShowStatusDialog(true)}
                className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20 transition-colors flex items-center gap-1.5"
              >
                <Edit3 className="h-3 w-3" />
                {mob.status.charAt(0).toUpperCase() + mob.status.slice(1)}
              </button>
            </div>

            {/* Mob identity */}
            <div className="mb-1">
              <p className="text-white/60 text-xs uppercase tracking-wider font-medium">{cat.label}</p>
              <h1 className="text-white text-2xl font-bold leading-tight">{mob.mob_name}</h1>
              <p className="text-white/70 text-sm mt-0.5">
                {mob.head_count} head
                {mob.breed_type ? ` · ${mob.breed_type}` : ""}
                {mob.location_name ? ` · ${mob.location_name}` : ""}
              </p>
            </div>

            {/* Big 4 stats */}
            <div className="grid grid-cols-4 gap-3 mt-4">
              <StatBox label="Days on feed" value={String(dof)} />
              <StatBox label="Avg weight" value={currentWt > 0 ? `${currentWt.toFixed(0)}kg` : "—"} />
              <StatBox label="ADG" value={adg != null && adg > 0 ? `${adg.toFixed(2)}kg` : "—"} />
              <StatBox label="Cost/head" value={totalCostPerHead > 0 ? fmt$(totalCostPerHead) : "—"} />
            </div>

            {/* Weight progress bar */}
            {targetWt > 0 && arrivalWt > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-white/70 text-xs mb-1.5">
                  <span>Weight to target: {currentWt.toFixed(0)}kg → {targetWt}kg</span>
                  <span>{wtPct}%</span>
                </div>
                <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${wtPct >= 100 ? "bg-green-400" : "bg-white"}`}
                    style={{ width: `${Math.max(3, wtPct)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Exit + program badges */}
            <div className="flex flex-wrap gap-2 mt-4">
              {prog && <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full font-medium">{prog.label}</span>}
              {exit && <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full font-medium">{exit.label}</span>}
              {mob.hgp_free && <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full font-medium">HGP Free</span>}
              {mob.msa_eligible && <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full font-medium">MSA Eligible</span>}
              {mob.halal_certified && <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full font-medium">Halal</span>}
            </div>
          </div>

          {/* Exit countdown */}
          {daysToExit !== null && (
            <div className={`px-5 py-3 border-t border-white/10 flex items-center justify-between ${daysToExit <= 7 ? "bg-amber-500/30" : "bg-black/20"}`}>
              <span className="text-white/80 text-sm">
                {mob.target_exit_path === "oth" ? "Kill date" : "Exit date"}:&nbsp;
                <strong className="text-white">{format(new Date(mob.target_exit_date!), "EEEE d MMMM yyyy")}</strong>
              </span>
              <span className={`text-sm font-bold ${daysToExit <= 0 ? "text-red-300" : daysToExit <= 7 ? "text-amber-300" : "text-white/70"}`}>
                {daysToExit <= 0 ? "Overdue" : `${daysToExit} days`}
              </span>
            </div>
          )}
        </div>

        {/* ── Quick action buttons ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setShowWeightDialog(true)}
            className={`h-14 rounded-xl text-sm font-bold gap-2 bg-gradient-to-r ${cat.gradient} text-white hover:opacity-90 shadow-sm`}
          >
            <Scale className="h-5 w-5" />
            Log Weight
          </Button>
          <Button
            onClick={() => setShowCostDialog(true)}
            variant="outline"
            className="h-14 rounded-xl text-sm font-bold gap-2 border-2"
          >
            <DollarSign className="h-5 w-5" />
            Add Cost
          </Button>
        </div>

        {/* ── Compliance flags ──────────────────────────────────────────── */}
        <div className={`rounded-xl border ${cat.border} ${cat.bg} px-4 py-3`}>
          <p className={`text-xs font-semibold uppercase tracking-wide ${cat.text} opacity-70 mb-2`}>Compliance status</p>
          <div className="flex flex-wrap gap-3">
            {[
              { key: "nlis_confirmed", label: "NLIS" },
              { key: "nvd_received", label: "NVD" },
              { key: "hgp_free", label: "HGP Free" },
              { key: "msa_eligible", label: "MSA" },
              { key: "halal_certified", label: "Halal" },
            ].map(({ key, label }) => {
              const ok = mob[key as keyof typeof mob] as boolean;
              return (
                <div key={key} className={`flex items-center gap-1.5 text-sm font-medium ${ok ? cat.text : "text-muted-foreground opacity-50"}`}>
                  {ok
                    ? <CheckCircle className={`h-4 w-4 ${cat.icon}`} />
                    : <XCircle className="h-4 w-4 text-muted-foreground/40" />
                  }
                  {label}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <Tabs defaultValue="costs">
          <TabsList className="grid grid-cols-3 w-full rounded-xl h-11">
            <TabsTrigger value="costs" className="rounded-lg text-sm">Cost Ledger</TabsTrigger>
            <TabsTrigger value="weights" className="rounded-lg text-sm">Weight & ADG</TabsTrigger>
            <TabsTrigger value="exit" className="rounded-lg text-sm">Exit</TabsTrigger>
          </TabsList>

          {/* ─── COST LEDGER ─────────────────────────────────────────── */}
          <TabsContent value="costs" className="space-y-4 mt-4">
            {/* Summary tiles */}
            {costs.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {COST_TYPE_GROUPS.map(group => {
                  const groupTotal = costs
                    .filter(c => group.types.includes(c.cost_type as CostType))
                    .reduce((s, c) => s + c.amount_total, 0);
                  if (groupTotal === 0) return null;
                  return (
                    <div key={group.label} className={`rounded-xl border ${cat.border} ${cat.bg} px-4 py-3`}>
                      <p className={`text-xs ${cat.text} opacity-60 font-medium`}>{group.label}</p>
                      <p className={`text-xl font-bold ${cat.text}`}>{fmt$(groupTotal)}</p>
                      <p className={`text-xs ${cat.text} opacity-50`}>{fmt$(groupTotal / mob.head_count)}/head</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total */}
            {costs.length > 0 && (
              <div className="rounded-xl bg-foreground text-background px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-60 font-medium uppercase tracking-wide">Total cost to date</p>
                  <p className="text-3xl font-bold">{fmt$(totalCost)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-60">Per head</p>
                  <p className="text-2xl font-bold">{fmt$(totalCostPerHead)}</p>
                </div>
              </div>
            )}

            {/* Ledger table */}
            {costs.length === 0 ? (
              <EmptyState
                icon={<DollarSign className="h-10 w-10 text-muted-foreground/20" />}
                message="No costs logged yet."
                action={{ label: "Add first cost", onClick: () => setShowCostDialog(true) }}
                cat={cat}
              />
            ) : (
              <Card className="overflow-hidden rounded-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/20 text-xs text-muted-foreground">
                        <th className="text-left px-4 py-3">Date</th>
                        <th className="text-left px-4 py-3">Type</th>
                        <th className="text-left px-4 py-3 hidden md:table-cell">Description</th>
                        <th className="text-right px-4 py-3">Total</th>
                        <th className="text-right px-4 py-3">/Head</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {costs.map(c => (
                        <tr key={c.id} className="hover:bg-muted/10">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">{format(new Date(c.cost_date), "d MMM yy")}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${cat.badge}`}>
                              {COST_TYPE_LABELS[c.cost_type as CostType]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell max-w-48 truncate">{c.description ?? ""}</td>
                          <td className="px-4 py-3 text-right font-bold">{fmt$fine(c.amount_total)}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground text-xs">{c.per_head ? fmt$fine(c.per_head) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={() => setShowCostDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add cost
            </Button>
          </TabsContent>

          {/* ─── WEIGHT & ADG ─────────────────────────────────────────── */}
          <TabsContent value="weights" className="space-y-4 mt-4">
            {weights.length === 0 ? (
              <EmptyState
                icon={<Scale className="h-10 w-10 text-muted-foreground/20" />}
                message="No weight records yet. Log the first weigh to start tracking ADG and projecting your exit date."
                action={{ label: "Log first weight", onClick: () => setShowWeightDialog(true) }}
                cat={cat}
              />
            ) : (
              <>
                {/* ADG + projection strip */}
                {adg != null && (
                  <div className={`rounded-xl border ${cat.border} ${cat.bg} grid grid-cols-2 md:grid-cols-4 divide-x divide-black/10`}>
                    {[
                      { label: "Current ADG", value: `${adg.toFixed(3)} kg/day` },
                      { label: "Current weight", value: latestWeight ? fmtKg(latestWeight.avg_weight_kg) : "—" },
                      { label: "Kg to target", value: targetWt && currentWt ? `${Math.max(0, targetWt - currentWt).toFixed(1)} kg` : "—" },
                      { label: "Projected exit", value: projectedTurnOffDate ? format(projectedTurnOffDate, "d MMM yy") : "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="px-4 py-3 text-center">
                        <p className={`text-xs ${cat.text} opacity-60 font-medium`}>{label}</p>
                        <p className={`font-bold text-lg ${cat.text}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Weight chart */}
                <Card className="rounded-xl overflow-hidden">
                  <CardContent className="pt-4 pb-2">
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={weights.map(w => ({
                        date: format(new Date(w.weigh_date), "d MMM"),
                        weight: w.avg_weight_kg,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} unit="kg" domain={["auto","auto"]} />
                        <Tooltip formatter={(v: number) => [`${v} kg`, "Avg weight"]} />
                        <Line
                          type="monotone" dataKey="weight" stroke="#15803d"
                          strokeWidth={3} dot={{ r: 5, fill: "#15803d" }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Weight log */}
                <Card className="rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/20 text-xs text-muted-foreground">
                          <th className="text-left px-4 py-3">Date</th>
                          <th className="text-right px-4 py-3">Avg Weight</th>
                          <th className="text-right px-4 py-3">ADG</th>
                          <th className="text-left px-4 py-3 hidden md:table-cell">Method</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {[...weights].reverse().map(w => (
                          <tr key={w.id} className="hover:bg-muted/10">
                            <td className="px-4 py-3 font-medium">{format(new Date(w.weigh_date), "d MMM yyyy")}</td>
                            <td className="px-4 py-3 text-right font-bold text-lg">{fmtKg(w.avg_weight_kg)}</td>
                            <td className="px-4 py-3 text-right">
                              {w.adg_since_last ? (
                                <span className={`font-bold ${w.adg_since_last >= 1.5 ? "text-green-600" : w.adg_since_last >= 0.8 ? "text-amber-600" : "text-red-600"}`}>
                                  {w.adg_since_last.toFixed(3)} kg/d
                                </span>
                              ) : <span className="text-muted-foreground">—</span>}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground capitalize hidden md:table-cell text-xs">{w.method ?? "weighbridge"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}

            <Button
              onClick={() => setShowWeightDialog(true)}
              className={`w-full h-12 rounded-xl font-bold gap-2 bg-gradient-to-r ${cat.gradient} text-white hover:opacity-90`}
            >
              <Scale className="h-5 w-5" /> Log Weight
            </Button>
          </TabsContent>

          {/* ─── EXIT DECISION ─────────────────────────────────────────── */}
          <TabsContent value="exit" className="space-y-4 mt-4">
            <ExitDecisionDashboard
              mob={mob} totalCostPerHead={totalCostPerHead}
              latestWeightKg={currentWt} latest={latest} cat={cat}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <AddCostDialog open={showCostDialog} onClose={() => setShowCostDialog(false)} mobId={mob.id} headCount={mob.head_count} onSaved={() => { setShowCostDialog(false); refetch(); }} toast={toast} cat={cat} />
      <LogWeightDialog open={showWeightDialog} onClose={() => setShowWeightDialog(false)} mobId={mob.id} weights={weights} onSaved={() => { setShowWeightDialog(false); refetch(); }} toast={toast} cat={cat} />
      <StatusDialog open={showStatusDialog} onClose={() => setShowStatusDialog(false)} mobId={mob.id} currentStatus={mob.status} onSaved={() => { setShowStatusDialog(false); refetch(); }} toast={toast} />
    </DashboardLayout>
  );
}

// ─── Stat box ─────────────────────────────────────────────────────────────────

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-2.5 text-center">
      <p className="text-white/60 text-xs">{label}</p>
      <p className="text-white font-bold text-xl leading-tight">{value}</p>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ icon, message, action, cat }: any) {
  return (
    <div className={`rounded-xl border-2 border-dashed ${cat.border} ${cat.bg} py-12 text-center`}>
      <div className="flex justify-center mb-3">{icon}</div>
      <p className={`${cat.text} opacity-60 text-sm max-w-xs mx-auto`}>{message}</p>
      {action && (
        <Button variant="outline" size="sm" className="mt-4" onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}

// ─── Exit Decision Dashboard ──────────────────────────────────────────────────

function ExitDecisionDashboard({ mob, totalCostPerHead, latestWeightKg, latest, cat }: any) {
  const [dressingPct, setDressingPct] = useState(58);
  const [freightOut, setFreightOut] = useState(80);
  const [agentCommExit, setAgentCommExit] = useState(4.5);
  const [liveExportPremium, setLiveExportPremium] = useState(25);
  const [breedingPremium, setBreedingPremium] = useState(100);
  const [processorMarginPct, setProcessorMarginPct] = useState(10);

  const heavySteerBench = latest("heavy_steer")?.cents_per_kg ?? 0;
  const heavyCowBench = latest("heavy_cow")?.cents_per_kg ?? 0;
  const feederBench = latest("feeder_steer")?.cents_per_kg ?? 0;
  const othVic = latest("oth_vic")?.cents_per_kg ?? 0;
  const MLA = 5;

  const benchmarkCpkg = ["boner_cow","cull_cow"].includes(mob.category) ? heavyCowBench
    : ["weaner","backgrounder","trade"].includes(mob.category) ? feederBench
    : heavySteerBench;

  const saleyardGross = (benchmarkCpkg / 100) * latestWeightKg;
  const saleyardSellCosts = freightOut + saleyardGross * (agentCommExit / 100) + 18 + MLA;
  const saleyardNet = saleyardGross - saleyardSellCosts;

  const carcaseKg = latestWeightKg * (dressingPct / 100);
  const hgpPrem = mob.hgp_free ? 50 : 0;
  const msaPrem = mob.msa_eligible ? 24 : 0;
  const othGross = ((othVic + hgpPrem + msaPrem) / 100) * carcaseKg;
  const othNet = othGross - freightOut - MLA;

  const exportOk = latestWeightKg >= 350 && latestWeightKg <= 550;
  const exportGross = exportOk ? ((benchmarkCpkg + liveExportPremium) / 100) * latestWeightKg : 0;
  const exportNet = exportOk ? exportGross - freightOut - 40 - MLA : 0;

  const breedingGross = saleyardGross + breedingPremium;
  const breedingNet = breedingGross - freightOut - MLA;

  const killOwnGross = (othVic / 100) * carcaseKg * (1 + processorMarginPct / 100);
  const killOwnNet = killOwnGross - MLA - 20;

  const paths = [
    {
      key: "saleyard", label: "Sell Store — Saleyard",
      sub: `${benchmarkCpkg}¢/kg lwt · ${latestWeightKg.toFixed(0)}kg`,
      net: saleyardNet, eligible: true,
      icon: <ChevronRight className="h-4 w-4" />,
    },
    {
      key: "oth", label: "OTH — Direct to Processor",
      sub: `${dressingPct}% dress → ${carcaseKg.toFixed(0)}kg CW · ${othVic}¢/kg${hgpPrem ? ` +${hgpPrem}¢ HGP` : ""}${msaPrem ? ` +${msaPrem}¢ MSA` : ""}`,
      net: othNet, eligible: true,
      icon: <Layers className="h-4 w-4" />,
    },
    {
      key: "live_export", label: "Live Export",
      sub: exportOk ? `+${liveExportPremium}¢/kg export premium · ESCAS + Halal required` : `Weight ${latestWeightKg.toFixed(0)}kg — need 350–550kg`,
      net: exportNet, eligible: exportOk,
      icon: <TrendingUp className="h-4 w-4" />,
    },
    {
      key: "breeding", label: "Sell as Breeding Stock",
      sub: `+$${breedingPremium}/head premium over store price`,
      net: breedingNet, eligible: true,
      icon: <Beef className="h-4 w-4" />,
    },
    {
      key: "kill_own", label: "Kill Own (Boning Room)",
      sub: `Capture ~${processorMarginPct}% processor margin · ${carcaseKg.toFixed(0)}kg CW`,
      net: killOwnNet, eligible: true,
      icon: <Scale className="h-4 w-4" />,
    },
  ].sort((a, b) => (b.eligible ? b.net : -99999) - (a.eligible ? a.net : -99999));

  const best = paths.find(p => p.eligible);

  return (
    <div className="space-y-4">
      {/* Assumptions */}
      <div className={`rounded-xl border ${cat.border} ${cat.bg} px-4 py-4`}>
        <p className={`text-xs font-semibold uppercase tracking-wide ${cat.text} opacity-60 mb-3`}>Adjust assumptions</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "Dressing % (OTH)", value: dressingPct, set: setDressingPct, step: 0.5 },
            { label: "Freight out ($/hd)", value: freightOut, set: setFreightOut, step: 5 },
            { label: "Agent comm exit (%)", value: agentCommExit, set: setAgentCommExit, step: 0.5 },
            { label: "Export premium (¢/kg)", value: liveExportPremium, set: setLiveExportPremium, step: 5 },
            { label: "Breeding premium ($/hd)", value: breedingPremium, set: setBreedingPremium, step: 50 },
            { label: "Processor margin % (kill own)", value: processorMarginPct, set: setProcessorMarginPct, step: 1 },
          ].map(({ label, value, set, step }) => (
            <div key={label} className="space-y-1">
              <Label className={`text-xs ${cat.text} opacity-60`}>{label}</Label>
              <Input
                type="number" step={step} value={value}
                onChange={e => set(+e.target.value)}
                className="h-9 text-sm rounded-lg"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Path cards */}
      <div className="space-y-3">
        {paths.map(path => {
          const margin = path.net - totalCostPerHead;
          const isBest = path.key === best?.key;
          return (
            <div
              key={path.key}
              className={`rounded-xl border-2 p-4 transition-all ${
                !path.eligible ? "opacity-40 border-muted" :
                isBest ? `${cat.border} ${cat.bg}` :
                "border-muted bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {isBest && path.eligible && (
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${cat.badge}`}>Best return</span>
                    )}
                    {!path.eligible && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">Not eligible</span>
                    )}
                    <span className="font-bold text-sm">{path.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{path.sub}</p>
                  {path.eligible && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Net return: <strong className="text-foreground">{fmt$fine(path.net)}/head</strong>
                    </p>
                  )}
                </div>
                {path.eligible && (
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">vs cost</p>
                    <p className={`text-2xl font-bold leading-tight ${margin >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {margin >= 0 ? "+" : ""}{fmt$(margin)}
                    </p>
                    <p className="text-xs text-muted-foreground">/head</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Market prices from MLA/NLRS · All figures per head · Margins vs. total cost logged to date
      </p>
    </div>
  );
}

// ─── Add Cost Dialog ──────────────────────────────────────────────────────────

function AddCostDialog({ open, onClose, mobId, headCount, onSaved, toast, cat }: any) {
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
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader><DialogTitle className="text-lg">Add Cost</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Date</Label>
              <Input type="date" value={form.cost_date} onChange={e => set("cost_date", e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Total amount ($)</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.amount_total} onChange={e => set("amount_total", e.target.value)} className="rounded-xl text-lg font-bold" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Cost Type</Label>
            <Select value={form.cost_type} onValueChange={v => set("cost_type", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select type…" /></SelectTrigger>
              <SelectContent>
                {COST_TYPE_GROUPS.map(group => (
                  <div key={group.label}>
                    <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase">{group.label}</div>
                    {group.types.map(t => <SelectItem key={t} value={t}>{COST_TYPE_LABELS[t]}</SelectItem>)}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Description</Label>
            <Input placeholder="Optional detail" value={form.description} onChange={e => set("description", e.target.value)} className="rounded-xl" />
          </div>
          {perHead && (
            <div className={`rounded-xl ${cat.bg} border ${cat.border} px-4 py-2.5 text-sm`}>
              <span className={`${cat.text} opacity-60`}>= </span>
              <span className={`${cat.text} font-bold text-base`}>${perHead}/head</span>
              <span className={`${cat.text} opacity-60`}> across {headCount} head</span>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
            <Button
              onClick={save}
              disabled={saving || !form.cost_type || !form.amount_total}
              className={`flex-1 rounded-xl bg-gradient-to-r ${cat.gradient} text-white hover:opacity-90 font-bold`}
            >
              {saving ? "Saving…" : "Add Cost"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Log Weight Dialog ────────────────────────────────────────────────────────

function LogWeightDialog({ open, onClose, mobId, weights, onSaved, toast, cat }: any) {
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
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader><DialogTitle className="text-lg">Log Weight</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Big weight input */}
          <div className={`rounded-2xl bg-gradient-to-br ${cat.gradient} p-5 text-center`}>
            <p className="text-white/70 text-sm mb-2">Average weight (kg/head)</p>
            <input
              type="number" step="0.1"
              placeholder="000.0"
              value={form.avg_weight_kg}
              onChange={e => set("avg_weight_kg", e.target.value)}
              className="bg-transparent text-white text-5xl font-bold text-center w-full outline-none placeholder:text-white/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              autoFocus
            />
            <p className="text-white/50 text-xs mt-1">kg per head</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Weigh Date</Label>
              <Input type="date" value={form.weigh_date} onChange={e => set("weigh_date", e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Method</Label>
              <Select value={form.method} onValueChange={v => set("method", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weighbridge">Weighbridge</SelectItem>
                  <SelectItem value="estimate">Visual estimate</SelectItem>
                  <SelectItem value="scan">EID auto-weigh</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {prev && adg && (
            <div className={`rounded-xl ${cat.bg} border ${cat.border} px-4 py-3`}>
              <div className="flex justify-between text-sm">
                <span className={`${cat.text} opacity-60`}>Prev: {prev.avg_weight_kg}kg ({format(new Date(prev.weigh_date), "d MMM")})</span>
                <span className={`${cat.text} font-bold`}>{adg} kg/day ADG</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-12">Cancel</Button>
            <Button
              onClick={save}
              disabled={saving || !form.avg_weight_kg}
              className={`flex-1 rounded-xl h-12 bg-gradient-to-r ${cat.gradient} text-white hover:opacity-90 font-bold text-base`}
            >
              {saving ? "Saving…" : "Save Weight"}
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
      <DialogContent className="max-w-xs rounded-2xl">
        <DialogHeader><DialogTitle>Update Mob Status</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {(["active","sold","slaughtered","transferred"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 font-semibold capitalize transition-all ${status === s ? "border-foreground bg-foreground text-background" : "border-muted hover:bg-muted/40"}`}
            >
              {s}
            </button>
          ))}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
            <Button onClick={save} disabled={saving} className="flex-1 rounded-xl">{saving ? "Saving…" : "Update"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
