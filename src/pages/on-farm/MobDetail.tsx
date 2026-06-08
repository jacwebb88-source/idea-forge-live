import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LivestockLayout } from "@/components/LivestockLayout";
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
import { useMob, useMarketBenchmarks, useFeedPlan, useProcessorGrids, useKillRecords, type FeedPlan } from "@/components/on-farm/useMobs";
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
  ChevronRight, Layers, Wheat, Sparkles, RefreshCw,
  Leaf, Flame, CloudRain, Sun, Droplets,
  Activity, Target, Award, BarChart3,
  Satellite, Wind, X, Thermometer, Zap,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { DocumentScanner } from "@/components/on-farm/DocumentScanner";
import { TreatmentList, AddTreatmentDialog } from "@/components/on-farm/TreatmentLog";

function fmt$(n: number) { return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }
function fmtKg(n: number) { return `${n.toFixed(1)} kg`; }
function fmt$fine(n: number) { return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }

export default function MobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mob, costs, weights, loading, refetch, totalCost, totalCostPerHead, latestWeight, adg, projectedTurnOffDate } = useMob(id!);
  const { latest, benchmarks } = useMarketBenchmarks();
  const { current: feedPlan, plans: feedPlans, loading: feedLoading, refetch: refetchFeed } = useFeedPlan(id!);

  const { grids: processorGrids } = useProcessorGrids();
  const { records: killRecords, loading: killLoading, refetch: refetchKill } = useKillRecords(id!);

  const [showCostDialog, setShowCostDialog] = useState(false);
  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showFeedDialog, setShowFeedDialog] = useState(false);
  const [showKillDialog, setShowKillDialog] = useState(false);
  const [showTreatmentDialog, setShowTreatmentDialog] = useState(false);

  if (loading) return (
    <LivestockLayout>
      <div className="space-y-3 animate-pulse p-4">
        <div className="h-48 rounded-2xl bg-muted/40" />
        <div className="h-24 rounded-xl bg-muted/40" />
        <div className="h-64 rounded-xl bg-muted/40" />
      </div>
    </LivestockLayout>
  );
  if (!mob) return <LivestockLayout><div className="p-8 text-center text-muted-foreground">Mob not found.</div></LivestockLayout>;

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
    <LivestockLayout>
      <div className="space-y-5 pb-10">

        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <button onClick={() => navigate("/on-farm")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-1 transition-colors">
              <ArrowLeft className="h-4 w-4" /> On Farm
            </button>
            <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">{cat.label}</p>
            <h1 className="text-3xl font-bold text-foreground leading-tight">{mob.mob_name}</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {mob.head_count} head
              {mob.breed_type ? ` · ${mob.breed_type}` : ""}
              {mob.location_name ? ` · ${mob.location_name}` : ""}
            </p>
          </div>
          <button onClick={() => setShowStatusDialog(true)} className="shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-border bg-muted hover:bg-muted/80 transition-colors">
            <Edit3 className="h-3 w-3" />
            {mob.status.charAt(0).toUpperCase() + mob.status.slice(1)}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Days on feed", value: String(dof) },
            { label: "Avg weight", value: currentWt > 0 ? `${currentWt.toFixed(0)}kg` : "—" },
            { label: "ADG", value: adg != null && adg > 0 ? `${adg.toFixed(2)}kg` : "—" },
            { label: "Cost/head", value: totalCostPerHead > 0 ? fmt$(totalCostPerHead) : "—" },
          ].map(s => (
            <Card key={s.label}><CardContent className="pt-4"><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold">{s.value}</p></CardContent></Card>
          ))}
        </div>

        {(targetWt > 0 && arrivalWt > 0) || prog || exit || mob.hgp_free || mob.msa_eligible || mob.halal_certified ? (
          <Card><CardContent className="pt-4 space-y-3">
            {targetWt > 0 && arrivalWt > 0 && (
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Weight to target: {currentWt.toFixed(0)}kg → {targetWt}kg</span>
                  <span>{wtPct}%</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${wtPct >= 100 ? "bg-green-500" : "bg-primary"}`} style={{ width: `${Math.max(3, wtPct)}%` }} />
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {prog && <Badge variant="secondary">{prog.label}</Badge>}
              {exit && <Badge variant="secondary">{exit.label}</Badge>}
              {mob.hgp_free && <Badge variant="secondary">HGP Free</Badge>}
              {mob.msa_eligible && <Badge variant="secondary">MSA Eligible</Badge>}
              {mob.halal_certified && <Badge variant="secondary">Halal</Badge>}
            </div>
          </CardContent></Card>
        ) : null}

        {daysToExit !== null && (
          <div className={`rounded-lg px-4 py-3 border flex items-center justify-between text-sm ${
            daysToExit <= 0 ? "bg-red-50 border-red-200 text-red-800"
            : daysToExit <= 7 ? "bg-amber-50 border-amber-200 text-amber-800"
            : "bg-muted/40 border-border text-foreground"
          }`}>
            <span>{mob.target_exit_path === "oth" ? "Kill date" : "Exit date"}:&nbsp;<strong>{format(new Date(mob.target_exit_date!), "EEEE d MMMM yyyy")}</strong></span>
            <span className="font-bold">{daysToExit <= 0 ? "Overdue" : `${daysToExit} days`}</span>
          </div>
        )}

        {/* ── Quick action buttons ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setShowWeightDialog(true)}
            className={`h-14 rounded-xl text-sm font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm`}
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

        {/* ── Weather-triggered alert ───────────────────────────────────── */}
        <WeatherAlert mob={mob} feedPlan={feedPlan} adg={adg} totalCostPerHead={totalCostPerHead} />

        {/* ── Margin Clock ──────────────────────────────────────────────── */}
        <MarginClock
          mob={mob}
          totalCostPerHead={totalCostPerHead}
          currentWt={currentWt}
          arrivalWt={arrivalWt}
          adg={adg}
          feedPlan={feedPlan}
          processorGrids={processorGrids}
          cat={cat}
        />

        {/* ── Tabs ─────────────────────────────────────────────────────── */}
        <Tabs defaultValue="costs">
          <TabsList className="grid grid-cols-6 w-full rounded-xl h-11">
            <TabsTrigger value="costs" className="rounded-lg text-xs">Costs</TabsTrigger>
            <TabsTrigger value="weights" className="rounded-lg text-xs">Weight</TabsTrigger>
            <TabsTrigger value="feed" className="rounded-lg text-xs">Feed</TabsTrigger>
            <TabsTrigger value="decision" className="rounded-lg text-xs">Decision</TabsTrigger>
            <TabsTrigger value="kill" className="rounded-lg text-xs">Kill</TabsTrigger>
            <TabsTrigger value="treatments" className="rounded-lg text-xs">Treatments</TabsTrigger>
            <TabsTrigger value="carbon" className="rounded-lg text-xs">Carbon</TabsTrigger>
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
              className={`w-full h-12 rounded-xl font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90`}
            >
              <Scale className="h-5 w-5" /> Log Weight
            </Button>
          </TabsContent>

          {/* ─── FEED PLAN ───────────────────────────────────────────────── */}
          <TabsContent value="feed" className="space-y-4 mt-4">
            <FeedPlanTab
              mob={mob} feedPlan={feedPlan} feedPlans={feedPlans}
              totalCostPerHead={totalCostPerHead} adg={adg}
              currentWt={currentWt} cat={cat}
              onEdit={() => setShowFeedDialog(true)}
            />
          </TabsContent>

          {/* ─── DECISION ENGINE ─────────────────────────────────────────── */}
          <TabsContent value="decision" className="space-y-4 mt-4">
            <DecisionEngine
              mob={mob} totalCostPerHead={totalCostPerHead}
              latestWeightKg={currentWt} latest={latest} benchmarks={benchmarks}
              feedPlan={feedPlan} adg={adg} cat={cat}
              processorGrids={processorGrids}
            />
          </TabsContent>

          {/* ─── KILL SHEET ──────────────────────────────────────────────── */}
          <TabsContent value="kill" className="space-y-4 mt-4">
            <KillSheetTab
              mob={mob} killRecords={killRecords} killLoading={killLoading}
              cat={cat} latest={latest}
              onAdd={() => setShowKillDialog(true)}
            />
          </TabsContent>

          {/* ─── TREATMENTS ──────────────────────────────────────────────── */}
          <TabsContent value="treatments" className="space-y-4 mt-4">
            <TreatmentList
              mobId={mob.id}
              targetExitDate={mob.target_exit_date ?? null}
              onAddClick={() => setShowTreatmentDialog(true)}
            />
          </TabsContent>

          {/* ─── CARBON & METHANE ────────────────────────────────────────── */}
          <TabsContent value="carbon" className="space-y-4 mt-4">
            <CarbonTab mob={mob} dof={dof} feedPlan={feedPlan} cat={cat} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <AddTreatmentDialog open={showTreatmentDialog} onClose={() => setShowTreatmentDialog(false)} mobId={mob.id} headCount={mob.head_count} targetExitDate={mob.target_exit_date ?? null} onSaved={() => setShowTreatmentDialog(false)} />
      <AddCostDialog open={showCostDialog} onClose={() => setShowCostDialog(false)} mobId={mob.id} headCount={mob.head_count} onSaved={() => { setShowCostDialog(false); refetch(); }} toast={toast} cat={cat} />
      <LogWeightDialog open={showWeightDialog} onClose={() => setShowWeightDialog(false)} mobId={mob.id} weights={weights} onSaved={() => { setShowWeightDialog(false); refetch(); }} toast={toast} cat={cat} />
      <StatusDialog open={showStatusDialog} onClose={() => setShowStatusDialog(false)} mobId={mob.id} currentStatus={mob.status} onSaved={() => { setShowStatusDialog(false); refetch(); }} toast={toast} />
      <EditFeedPlanDialog open={showFeedDialog} onClose={() => setShowFeedDialog(false)} mobId={mob.id} current={feedPlan} targetWt={mob.target_weight_kg} currentWt={currentWt} onSaved={() => { setShowFeedDialog(false); refetchFeed(); }} toast={toast} cat={cat} />
      <AddKillRecordDialog open={showKillDialog} onClose={() => setShowKillDialog(false)} mobId={mob.id} onSaved={() => { setShowKillDialog(false); refetchKill(); }} toast={toast} cat={cat} />
    </LivestockLayout>
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

// ─── Weather-Triggered Turnoff Alert ─────────────────────────────────────────

type AlertType = "heat" | "rain" | "dry" | null;

function WeatherAlert({ mob, feedPlan, adg, totalCostPerHead }: any) {
  const [alertType, setAlertType] = useState<AlertType>(null);
  const [alertText, setAlertText] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const loc = mob.location_name;
    if (!loc) return;
    const analyze = async () => {
      try {
        let lat = -23.38, lon = 150.51;
        const geo = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc)}&count=1&language=en&format=json`
        ).then(r => r.json());
        if (geo.results?.[0]) { lat = geo.results[0].latitude; lon = geo.results[0].longitude; }

        const w = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,temperature_2m_max&timezone=auto&forecast_days=7`
        ).then(r => r.json());

        const temps: number[] = w.daily.temperature_2m_max;
        const precips: number[] = w.daily.precipitation_sum;
        const totalRain = precips.reduce((s, p) => s + (p ?? 0), 0);
        const hotDays = temps.filter(t => t > 35).length;
        const feedSource = feedPlan?.feed_source;

        if (hotDays >= 3) {
          setAlertType("heat");
          setAlertText(`${hotDays} days above 35°C forecast for ${loc} — heat stress reduces ADG by 15–25%. Consider advancing your turnoff booking.`);
        } else if (totalRain >= 20 && feedSource === "grass") {
          setAlertType("rain");
          setAlertText(`${totalRain.toFixed(0)}mm forecast over 7 days — excellent pasture conditions near ${loc}. Consider extending your grass program.`);
        } else if (totalRain < 5 && feedSource === "grass" && totalCostPerHead > 0) {
          setAlertType("dry");
          setAlertText(`Only ${totalRain.toFixed(1)}mm forecast over 7 days — dry outlook near ${loc}. Monitor pasture availability and consider booking turnoff or moving to supplementary feeding.`);
        }
      } catch { /* silent */ }
    };
    analyze();
  }, [mob.location_name, feedPlan?.feed_source, totalCostPerHead]);

  if (!alertType || dismissed) return null;

  const styles: Record<NonNullable<AlertType>, { bg: string; border: string; text: string; iconEl: React.ReactNode; label: string }> = {
    heat:  { bg: "bg-red-50",    border: "border-red-300",    text: "text-red-800",    iconEl: <Thermometer className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />, label: "Heat stress alert" },
    rain:  { bg: "bg-green-50",  border: "border-green-300",  text: "text-green-800",  iconEl: <CloudRain className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />, label: "Good rain forecast" },
    dry:   { bg: "bg-amber-50",  border: "border-amber-300",  text: "text-amber-800",  iconEl: <Sun className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />, label: "Dry outlook" },
  };
  const s = styles[alertType];

  return (
    <div className={`rounded-xl border-2 ${s.bg} ${s.border} px-4 py-3 flex items-start justify-between gap-3`}>
      <div className="flex items-start gap-2.5">
        {s.iconEl}
        <div>
          <p className={`text-xs font-bold uppercase tracking-wide ${s.text} mb-0.5`}>{s.label}</p>
          <p className={`text-sm ${s.text}`}>{alertText}</p>
        </div>
      </div>
      <button onClick={() => setDismissed(true)} className={`${s.text} opacity-40 hover:opacity-70 shrink-0 mt-0.5`}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Carbon & Methane Tracker ─────────────────────────────────────────────────

const RATION_CH4_FACTOR: Record<string, number> = {
  grass: 1.10, hay: 1.05, silage: 0.95, mixed: 1.00, grain: 0.80,
};
const BASE_CH4_KG_HEAD_YEAR = 86;   // IPCC Tier 2 beef cattle
const GWP100_CH4 = 27.9;            // AR6 IPCC
const ACCU_PRICE = 35;              // AUD/tonne CO2-e (approx current)
const BOVAER_COST_PER_HEAD_DAY = 0.20;
const BOVAER_REDUCTION = 0.30;

function CarbonTab({ mob, dof, feedPlan, cat }: any) {
  const rFactor = RATION_CH4_FACTOR[feedPlan?.feed_source ?? "mixed"];
  const ch4PerHeadYear = BASE_CH4_KG_HEAD_YEAR * rFactor;
  const ch4Total_kg = (dof / 365) * ch4PerHeadYear * mob.head_count;
  const co2e_tonnes = (ch4Total_kg * GWP100_CH4) / 1000;
  const accuValue = co2e_tonnes * ACCU_PRICE;

  const isGrainFed = feedPlan?.feed_source === "grain" || feedPlan?.feed_source === "mixed";
  const bovaerCost = BOVAER_COST_PER_HEAD_DAY * dof * mob.head_count;
  const bovaerCH4Saved = ch4Total_kg * BOVAER_REDUCTION;
  const bovaerCO2eSaved = (bovaerCH4Saved * GWP100_CH4) / 1000;
  const bovaerACCUValue = bovaerCO2eSaved * ACCU_PRICE;
  const bovaerROI = bovaerACCUValue - bovaerCost;

  const perHeadCH4 = ch4Total_kg / mob.head_count;

  return (
    <div className="space-y-4">
      {/* Emission summary */}
      <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-xl bg-emerald-700 flex items-center justify-center">
            <Wind className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-emerald-900">Carbon & Methane Estimate</p>
            <p className="text-xs text-emerald-600">IPCC Tier 2 · {feedPlan?.feed_source ?? "mixed"} ration · {dof} days on feed</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "Total CH₄ emitted", value: `${ch4Total_kg.toFixed(0)} kg`, sub: `${perHeadCH4.toFixed(1)} kg/head` },
            { label: "CO₂-e (GWP100)", value: `${co2e_tonnes.toFixed(2)} t`, sub: "AR6 factor: 27.9" },
            { label: "ACCU indicative value", value: `$${accuValue.toFixed(0)}`, sub: `~$35/t CO₂-e` },
            { label: "Per head carbon cost", value: `$${(accuValue / mob.head_count).toFixed(2)}`, sub: "voluntary market" },
          ].map(item => (
            <div key={item.label} className="bg-white/60 rounded-xl px-3 py-2.5">
              <p className="text-xs text-emerald-700 opacity-70 font-medium">{item.label}</p>
              <p className="font-black text-lg text-emerald-900">{item.value}</p>
              <p className="text-xs text-emerald-600 opacity-60">{item.sub}</p>
            </div>
          ))}
        </div>

        <div className="bg-emerald-800/10 rounded-xl px-3 py-2.5 text-xs text-emerald-800">
          <strong>About these numbers:</strong> Based on IPCC Tier 2 enteric methane emission factors for beef cattle (86 kg CH₄/head/year baseline), adjusted for ration type. Australian Carbon Credit Units (ACCUs) priced at ~$35/tonne CO₂-e.
        </div>
      </div>

      {/* Bovaer / 3-NOP modelling */}
      <div className={`rounded-2xl border-2 p-5 ${isGrainFed ? "border-violet-200 bg-violet-50" : "border-muted bg-muted/20"}`}>
        <div className="flex items-center gap-2 mb-3">
          <Zap className={`h-5 w-5 ${isGrainFed ? "text-violet-600" : "text-muted-foreground"}`} />
          <div>
            <p className={`font-bold text-sm ${isGrainFed ? "text-violet-900" : "text-muted-foreground"}`}>Bovaer / 3-NOP Methane Additive</p>
            <p className={`text-xs ${isGrainFed ? "text-violet-600" : "text-muted-foreground"}`}>
              {isGrainFed ? "Applicable to your current ration — modelling active" : "Best suited to grain/mixed rations — set feed plan to model"}
            </p>
          </div>
        </div>

        {isGrainFed && (
          <div className="space-y-2">
            {[
              { label: "Methane reduction", value: `${(bovaerCH4Saved).toFixed(0)} kg CH₄ saved`, sub: "30% reduction (DSM/Bovaer trial data)" },
              { label: "CO₂-e saved", value: `${bovaerCO2eSaved.toFixed(2)} tonnes`, sub: "ACCU-eligible under ERF" },
              { label: "ACCU value of savings", value: `$${bovaerACCUValue.toFixed(0)}`, sub: "@$35/t" },
              { label: "Bovaer additive cost", value: `$${bovaerCost.toFixed(0)}`, sub: `~$${BOVAER_COST_PER_HEAD_DAY}/head/day × ${dof} days × ${mob.head_count} head` },
              { label: "Net ROI", value: `${bovaerROI >= 0 ? "+" : ""}$${bovaerROI.toFixed(0)}`, sub: bovaerROI >= 0 ? "ACCU value exceeds additive cost" : "Additive cost currently exceeds ACCU value at $35/t", positive: bovaerROI >= 0 },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-violet-900">{item.label}</p>
                  <p className="text-xs text-violet-600 opacity-60">{item.sub}</p>
                </div>
                <p className={`font-bold text-sm ${item.positive === false ? "text-red-600" : item.positive ? "text-green-600" : "text-violet-900"}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {!isGrainFed && (
          <p className="text-xs text-muted-foreground">
            Bovaer is currently approved for use in cattle on grain/mixed rations in Australia. Update your feed plan to grain or mixed to model the ROI of adding Bovaer to your ration.
          </p>
        )}
      </div>

      {/* Processor sustainability context */}
      <div className="rounded-xl border bg-muted/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
          <Satellite className="h-3.5 w-3.5" /> Processor net-zero context
        </p>
        <div className="space-y-2 text-xs text-muted-foreground">
          {[
            { name: "JBS Australia", target: "Net zero by 2040", premium: "Actively piloting Bovaer + carbon measurement programs" },
            { name: "NH Foods (Oakey)", target: "Carbon neutral by 2030", premium: "MSA + sustainability premiums in development" },
            { name: "Teys Australia", target: "Net zero by 2030", premium: "BMS genetics program with sustainability overlay" },
          ].map(p => (
            <div key={p.name} className="flex items-start justify-between rounded-lg bg-white border px-3 py-2 gap-3">
              <div>
                <p className="font-semibold text-foreground">{p.name}</p>
                <p className="text-muted-foreground">{p.premium}</p>
              </div>
              <span className="text-green-600 font-medium whitespace-nowrap shrink-0">{p.target}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground/50 mt-2">Verified carbon documentation will increasingly command premiums from these processors — Muster will help you generate it automatically.</p>
      </div>
    </div>
  );
}

// ─── Mob Margin Clock ─────────────────────────────────────────────────────────

function MarginClock({ mob, totalCostPerHead, currentWt, arrivalWt, adg, feedPlan, processorGrids, cat }: any) {
  const DEFAULT_DRESSING = 54;
  const FREIGHT = 80;
  const MLA_LEVY = 5;

  const bestGrid = processorGrids?.length > 0
    ? [...processorGrids].sort((a: any, b: any) => b.price_cpkg_cw - a.price_cpkg_cw)[0]
    : null;
  const gridPrice = bestGrid?.price_cpkg_cw ?? 615;

  const weightGained = currentWt && arrivalWt ? currentWt - arrivalWt : 0;
  const costPerKgGain = weightGained > 2 && totalCostPerHead > 0 ? totalCostPerHead / weightGained : null;
  const dailyFeedCost = feedPlan?.daily_feed_cost_per_head ?? 0;

  const scenarios = [0, 7, 14, 21].map(days => {
    const projWt = currentWt + (adg ?? 0) * days;
    const totalCost = totalCostPerHead + dailyFeedCost * days;
    const carcaseKg = projWt * (DEFAULT_DRESSING / 100);
    const grossRevenue = (gridPrice / 100) * carcaseKg;
    const netReturn = grossRevenue - FREIGHT - MLA_LEVY;
    const marginPerHead = netReturn - totalCost;
    return { days, projWt, totalCost, netReturn, marginPerHead };
  });

  const peakScenario = [...scenarios].sort((a, b) => b.marginPerHead - a.marginPerHead)[0];
  const isAlreadyPeak = peakScenario.days === 0;

  if (!currentWt || totalCostPerHead <= 0) return null;

  return (
    <div className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-emerald-600 flex items-center justify-center">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-emerald-900">Mob Margin Clock</p>
            <p className="text-xs text-emerald-600">
              {bestGrid ? `Best grid: ${bestGrid.processor_name} @ ${gridPrice}¢/kg CW` : `${gridPrice}¢/kg CW benchmark · ${DEFAULT_DRESSING}% dress`}
            </p>
          </div>
        </div>
        {costPerKgGain != null && (
          <div className="text-right">
            <p className="text-xs text-emerald-600 opacity-70">Cost/kg gain</p>
            <p className="text-xl font-black text-emerald-900">${costPerKgGain.toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* Turnoff scenario comparison */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {scenarios.map(sc => {
          const isBest = sc.days === peakScenario.days;
          const isNeg = sc.marginPerHead < 0;
          return (
            <div
              key={sc.days}
              className={`rounded-xl p-2.5 text-center transition-all ${
                isBest ? "bg-emerald-600 text-white shadow-md" :
                isNeg ? "bg-red-50 border border-red-200" : "bg-white/70 border border-white"
              }`}
            >
              <p className={`text-xs font-semibold ${isBest ? "text-white/80" : "text-muted-foreground"}`}>
                {sc.days === 0 ? "Today" : `+${sc.days}d`}
              </p>
              <p className={`text-xs mt-0.5 ${isBest ? "text-white/70" : "text-muted-foreground"}`}>
                {sc.projWt.toFixed(0)}kg
              </p>
              <p className={`font-black text-base leading-tight mt-1 ${
                isBest ? "text-white" : isNeg ? "text-red-600" : "text-emerald-700"
              }`}>
                {sc.marginPerHead >= 0 ? "+" : ""}{fmt$(sc.marginPerHead)}
              </p>
              <p className={`text-xs ${isBest ? "text-white/60" : "text-muted-foreground"}`}>/head</p>
              {isBest && <p className="text-xs text-white font-bold mt-0.5">★ Peak</p>}
            </div>
          );
        })}
      </div>

      {/* Insight banner */}
      <div className="flex items-start gap-2 bg-white/60 rounded-xl px-3 py-2.5">
        <Target className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-xs text-emerald-800 leading-relaxed">
          {isAlreadyPeak
            ? <><strong>Sell now for best margin.</strong> Each extra day adds ${dailyFeedCost.toFixed(2)}/head in feed cost at current ADG.</>
            : <><strong>Margin peaks at +{peakScenario.days} days</strong> ({fmt$(peakScenario.marginPerHead)}/head). {
                dailyFeedCost > 0 && adg && adg > 0
                  ? `Daily feed cost of $${dailyFeedCost.toFixed(2)}/head is covered by ${adg.toFixed(2)}kg/day ADG.`
                  : "Add a feed plan to refine this projection."
              }</>
          }
        </p>
      </div>

      {/* Mob total at peak */}
      {mob.head_count > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-emerald-200/60 pt-3">
          <p className="text-xs text-emerald-700 opacity-70">Mob total at peak · {mob.head_count} head</p>
          <p className="text-xl font-black text-emerald-900">{fmt$(peakScenario.marginPerHead * mob.head_count)}</p>
        </div>
      )}
    </div>
  );
}

// ─── Feed Plan Tab ────────────────────────────────────────────────────────────

const FEED_SOURCE_META: Record<string, { icon: React.ReactNode; label: string; color: string; bgColor: string }> = {
  grass:  { icon: <Leaf className="h-4 w-4" />,  label: "Grass / Pasture",  color: "text-green-700",  bgColor: "bg-green-50 border-green-200" },
  grain:  { icon: <Wheat className="h-4 w-4" />, label: "Grain",            color: "text-amber-700",  bgColor: "bg-amber-50 border-amber-200" },
  silage: { icon: <Layers className="h-4 w-4" />,label: "Silage",           color: "text-emerald-700",bgColor: "bg-emerald-50 border-emerald-200" },
  hay:    { icon: <Flame className="h-4 w-4" />, label: "Hay",              color: "text-orange-700", bgColor: "bg-orange-50 border-orange-200" },
  mixed:  { icon: <TrendingUp className="h-4 w-4" />, label: "Mixed",       color: "text-slate-700",  bgColor: "bg-slate-50 border-slate-200" },
};

interface WeatherDay {
  date: string;
  precip: number;
  tempMax: number;
  tempMin: number;
}

function WeatherStrip({ feedSource, locationName }: { feedSource: string | null; locationName?: string | null }) {
  const [weather, setWeather] = useState<WeatherDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [resolvedLocation, setResolvedLocation] = useState<string>("Rockhampton");

  useEffect(() => {
    const DEFAULT_LAT = -23.38;
    const DEFAULT_LON = 150.51;
    const DEFAULT_LABEL = "Rockhampton";

    const loadWeather = async (lat: number, lon: number, label: string) => {
      setResolvedLocation(label);
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`
        );
        const data = await res.json();
        const days: WeatherDay[] = (data.daily.time as string[]).map((d: string, i: number) => ({
          date: d,
          precip: data.daily.precipitation_sum[i] ?? 0,
          tempMax: data.daily.temperature_2m_max[i] ?? 0,
          tempMin: data.daily.temperature_2m_min[i] ?? 0,
        }));
        setWeather(days);
        setLoading(false);
      } catch {
        setError(true);
        setLoading(false);
      }
    };

    if (locationName && locationName.trim()) {
      fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(locationName.trim())}&count=1&language=en&format=json`)
        .then(r => r.json())
        .then(data => {
          if (data.results && data.results.length > 0) {
            const { latitude, longitude, name, admin1 } = data.results[0];
            const label = admin1 ? `${name}, ${admin1}` : name;
            loadWeather(latitude, longitude, label);
          } else {
            loadWeather(DEFAULT_LAT, DEFAULT_LON, DEFAULT_LABEL);
          }
        })
        .catch(() => loadWeather(DEFAULT_LAT, DEFAULT_LON, DEFAULT_LABEL));
    } else {
      loadWeather(DEFAULT_LAT, DEFAULT_LON, DEFAULT_LABEL);
    }
  }, [locationName]);

  if (loading) return (
    <div className="rounded-xl border bg-sky-50 border-sky-200 px-4 py-3 animate-pulse">
      <div className="h-4 bg-sky-200/40 rounded w-32 mb-2" />
      <div className="flex gap-2">{[1,2,3,4,5,6,7].map(i => <div key={i} className="h-16 w-12 bg-sky-200/40 rounded-xl flex-1" />)}</div>
    </div>
  );

  if (error || weather.length === 0) return null;

  const totalRain = weather.reduce((sum, d) => sum + d.precip, 0);
  const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  return (
    <div className="rounded-xl border bg-sky-50 border-sky-200 px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">7-day weather — {resolvedLocation}</p>
        <p className="text-xs text-sky-600/70">Open-Meteo forecast</p>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-3">
        {weather.map((day) => {
          const d = new Date(day.date + "T00:00:00");
          const dayName = DAY_NAMES[d.getDay()];
          const hasRain = day.precip > 2;
          return (
            <div key={day.date} className="flex flex-col items-center text-center bg-white/60 rounded-xl py-2 px-1">
              <p className="text-xs font-semibold text-sky-700">{dayName}</p>
              {hasRain
                ? <CloudRain className="h-4 w-4 text-blue-500 my-1" />
                : <Sun className="h-4 w-4 text-amber-500 my-1" />
              }
              <p className="text-xs font-bold text-sky-900">{day.tempMax.toFixed(0)}°</p>
              <p className="text-xs text-sky-600/70">{day.tempMin.toFixed(0)}°</p>
              {hasRain && <p className="text-xs text-blue-600 font-semibold mt-0.5">{day.precip.toFixed(1)}mm</p>}
            </div>
          );
        })}
      </div>

      {totalRain > 20 && (
        <div className="flex items-start gap-2 bg-green-100 border border-green-300 rounded-lg px-3 py-2">
          <Droplets className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
          <p className="text-xs text-green-800">
            <strong>Good rainfall forecast ({totalRain.toFixed(0)}mm over 7 days)</strong> — pasture conditions improving. Consider extending grass program.
          </p>
        </div>
      )}
      {totalRain < 5 && feedSource === "grass" && (
        <div className="flex items-start gap-2 bg-amber-100 border border-amber-300 rounded-lg px-3 py-2">
          <Sun className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <strong>Dry outlook ({totalRain.toFixed(0)}mm forecast)</strong> — monitor pasture availability. Consider supplementary feeding.
          </p>
        </div>
      )}
    </div>
  );
}

function FeedPlanTab({ mob, feedPlan, feedPlans, totalCostPerHead, adg, currentWt, cat, onEdit }: any) {
  if (!feedPlan) return (
    <EmptyState
      icon={<Wheat className="h-10 w-10 text-muted-foreground/20" />}
      message="No feed plan set. Add one to track ration costs and model different finishing scenarios."
      action={{ label: "Set feed plan", onClick: onEdit }}
      cat={cat}
    />
  );

  const meta = FEED_SOURCE_META[feedPlan.feed_source] ?? FEED_SOURCE_META.mixed;
  const daysRunning = Math.max(1, differenceInDays(new Date(), new Date(feedPlan.start_date)));
  const feedCostToDate = feedPlan.daily_feed_cost_per_head * daysRunning;
  const daysToTarget = feedPlan.projected_ready_date
    ? differenceInDays(new Date(feedPlan.projected_ready_date), new Date())
    : mob.target_weight_kg && feedPlan.expected_adg_kg_day > 0 && currentWt
      ? Math.round((mob.target_weight_kg - currentWt) / feedPlan.expected_adg_kg_day)
      : null;
  const feedCostToFinish = daysToTarget != null && daysToTarget > 0
    ? feedPlan.daily_feed_cost_per_head * daysToTarget
    : 0;

  const scenarios = [
    { source: "grass",  adg: 0.9,  dailyCost: 1.20, label: "Pasture only" },
    { source: "mixed",  adg: 1.3,  dailyCost: 2.80, label: "Grass + supplement" },
    { source: "grain",  adg: 1.8,  dailyCost: 4.80, label: "Full grain ration" },
    { source: "silage", adg: 1.1,  dailyCost: 2.20, label: "Silage ration" },
  ].map(sc => {
    const days = mob.target_weight_kg && currentWt && sc.adg > 0
      ? Math.round((mob.target_weight_kg - currentWt) / sc.adg)
      : null;
    const totalFeedCost = days ? sc.dailyCost * days : null;
    return { ...sc, days, totalFeedCost };
  });

  return (
    <div className="space-y-4">
      {/* Weather strip */}
      <WeatherStrip feedSource={feedPlan.feed_source} locationName={mob.location_name} />

      {/* Current plan hero */}
      <div className={`rounded-2xl border-2 p-5 ${meta.bgColor}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${meta.bgColor} border ${meta.color}`}>
              {meta.icon}
            </div>
            <div>
              <p className={`text-xs font-semibold uppercase tracking-wide ${meta.color} opacity-70`}>Current feed plan</p>
              <p className={`font-bold text-lg ${meta.color}`}>{meta.label}</p>
              {feedPlan.ration_type && <p className={`text-xs ${meta.color} opacity-70`}>{feedPlan.ration_type}</p>}
            </div>
          </div>
          <button
            onClick={onEdit}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${meta.color} ${meta.bgColor} hover:opacity-80 transition-opacity`}
          >
            Edit plan
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center">
            <p className={`text-xs ${meta.color} opacity-60 font-medium`}>Daily cost/head</p>
            <p className={`text-2xl font-bold ${meta.color}`}>${feedPlan.daily_feed_cost_per_head.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className={`text-xs ${meta.color} opacity-60 font-medium`}>Expected ADG</p>
            <p className={`text-2xl font-bold ${meta.color}`}>{feedPlan.expected_adg_kg_day.toFixed(2)}<span className="text-sm font-normal">kg/d</span></p>
          </div>
          <div className="text-center">
            <p className={`text-xs ${meta.color} opacity-60 font-medium`}>Feed cost to date</p>
            <p className={`text-2xl font-bold ${meta.color}`}>${feedCostToDate.toFixed(0)}</p>
          </div>
          <div className="text-center">
            <p className={`text-xs ${meta.color} opacity-60 font-medium`}>Days remaining</p>
            <p className={`text-2xl font-bold ${meta.color}`}>{daysToTarget != null && daysToTarget > 0 ? daysToTarget : "—"}</p>
          </div>
        </div>

        {feedCostToFinish > 0 && (
          <div className={`mt-4 pt-4 border-t border-current/10 flex items-center justify-between`}>
            <span className={`text-sm ${meta.color} opacity-70`}>Estimated feed cost to finish target weight</span>
            <span className={`text-lg font-bold ${meta.color}`}>${feedCostToFinish.toFixed(0)}/head</span>
          </div>
        )}
      </div>

      {/* Scenario comparison */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Scenario comparison — cost to reach target weight</p>
        <div className="space-y-2">
          {scenarios.map(sc => {
            const scMeta = FEED_SOURCE_META[sc.source];
            const isCurrent = sc.source === feedPlan.feed_source;
            return (
              <div
                key={sc.source}
                className={`rounded-xl border px-4 py-3 flex items-center justify-between ${isCurrent ? `${scMeta.bgColor} border-2` : "bg-white border-muted"}`}
              >
                <div className="flex items-center gap-3">
                  <span className={scMeta.color}>{scMeta.icon}</span>
                  <div>
                    <p className={`font-semibold text-sm ${isCurrent ? scMeta.color : "text-foreground"}`}>
                      {sc.label}
                      {isCurrent && <span className="ml-2 text-xs font-normal opacity-60">(current)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">${sc.dailyCost.toFixed(2)}/hd/day · {sc.adg.toFixed(1)}kg ADG · {sc.days ?? "?"} days to target</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-lg ${isCurrent ? scMeta.color : "text-foreground"}`}>
                    {sc.totalFeedCost != null ? `$${sc.totalFeedCost.toFixed(0)}` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">feed cost</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Satellite Pasture Intelligence */}
      <div className="rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Satellite className="h-4 w-4 text-emerald-600" />
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Satellite Pasture Intelligence</p>
          <span className="text-xs bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">Coming soon</span>
        </div>
        <p className="text-xs text-emerald-700 mb-3 leading-relaxed">
          Daily satellite biomass readings for {mob.location_name ? `paddocks near ${mob.location_name}` : "your paddocks"} will appear here — showing estimated days of carry remaining, projected supplementary feeding trigger date, and automatic cost model update when pasture falls below threshold.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Pasture biomass", value: "— kg DM/ha", sub: "Daily satellite reading" },
            { label: "Days of carry", value: "— days", sub: "At current stocking rate" },
            { label: "Supp. trigger", value: "— days", sub: "Below 1,200 kg DM/ha" },
          ].map(item => (
            <div key={item.label} className="bg-white/60 rounded-lg px-2 py-2 text-center">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="font-bold text-sm text-muted-foreground/60">{item.value}</p>
              <p className="text-xs text-muted-foreground/40">{item.sub}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-emerald-600/60 mt-2">Data source: DPIRD Pastures from Space · Pasture.io · Planet Labs</p>
      </div>

      {/* Plan history */}
      {feedPlans.length > 1 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Plan history</p>
          <div className="space-y-1.5">
            {feedPlans.filter((_: FeedPlan, i: number) => i > 0).map((p: FeedPlan) => (
              <div key={p.id} className="rounded-lg border bg-muted/20 px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{FEED_SOURCE_META[p.feed_source]?.label ?? p.feed_source} · {p.ration_type ?? "—"}</span>
                <span>{format(new Date(p.start_date), "d MMM yy")}{p.end_date ? ` → ${format(new Date(p.end_date), "d MMM yy")}` : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Edit Feed Plan Dialog ────────────────────────────────────────────────────

function EditFeedPlanDialog({ open, onClose, mobId, current, targetWt, currentWt, onSaved, toast, cat }: any) {
  const [form, setForm] = useState({
    feed_source: current?.feed_source ?? "grass",
    ration_type: current?.ration_type ?? "",
    daily_feed_cost_per_head: String(current?.daily_feed_cost_per_head ?? ""),
    expected_adg_kg_day: String(current?.expected_adg_kg_day ?? ""),
    start_date: current?.start_date ?? new Date().toISOString().split("T")[0],
    notes: current?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const adgVal = parseFloat(form.expected_adg_kg_day);
  const costVal = parseFloat(form.daily_feed_cost_per_head);
  const daysToTarget = targetWt && currentWt && adgVal > 0
    ? Math.round((targetWt - currentWt) / adgVal) : null;
  const projectedReadyDate = daysToTarget != null
    ? (() => { const d = new Date(); d.setDate(d.getDate() + daysToTarget); return d.toISOString().split("T")[0]; })()
    : null;
  const projectedExitWt = adgVal > 0 && daysToTarget != null && currentWt
    ? currentWt + adgVal * daysToTarget : null;

  async function save() {
    if (!form.feed_source || !form.daily_feed_cost_per_head || !form.expected_adg_kg_day) return;
    setSaving(true);
    // Mark all previous plans as not current
    await supabase.from("feed_plans").update({ is_current: false }).eq("mob_id", mobId);
    // Insert new plan
    const { error } = await supabase.from("feed_plans").insert({
      mob_id: mobId,
      feed_source: form.feed_source,
      ration_type: form.ration_type || null,
      daily_feed_cost_per_head: costVal,
      expected_adg_kg_day: adgVal,
      start_date: form.start_date,
      projected_ready_date: projectedReadyDate,
      projected_exit_weight_kg: projectedExitWt,
      is_current: true,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Feed plan updated" });
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader><DialogTitle className="text-lg">Edit Feed Plan</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Feed Source</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["grass","grain","silage","hay","mixed"] as const).map(src => {
                const m = FEED_SOURCE_META[src];
                return (
                  <button
                    key={src}
                    onClick={() => set("feed_source", src)}
                    className={`rounded-xl border-2 py-2 text-xs font-semibold flex flex-col items-center gap-1 transition-all ${form.feed_source === src ? `${m.bgColor} ${m.color}` : "border-muted text-muted-foreground"}`}
                  >
                    {m.icon}{m.label.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Ration description</Label>
            <Input placeholder="e.g. High energy grain ration, MSA grass fed…" value={form.ration_type} onChange={e => set("ration_type", e.target.value)} className="rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Daily cost/head ($)</Label>
              <Input type="number" step="0.10" placeholder="0.00" value={form.daily_feed_cost_per_head} onChange={e => set("daily_feed_cost_per_head", e.target.value)} className="rounded-xl font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Expected ADG (kg/day)</Label>
              <Input type="number" step="0.05" placeholder="0.0" value={form.expected_adg_kg_day} onChange={e => set("expected_adg_kg_day", e.target.value)} className="rounded-xl font-bold" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Plan start date</Label>
            <Input type="date" value={form.start_date} onChange={e => set("start_date", e.target.value)} className="rounded-xl" />
          </div>

          {daysToTarget != null && adgVal > 0 && (
            <div className={`rounded-xl ${cat.bg} border ${cat.border} px-4 py-3 text-xs`}>
              <div className="flex justify-between">
                <span className={`${cat.text} opacity-60`}>Days to target ({targetWt}kg)</span>
                <span className={`${cat.text} font-bold`}>{daysToTarget} days</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className={`${cat.text} opacity-60`}>Feed cost to finish</span>
                <span className={`${cat.text} font-bold`}>${(costVal * daysToTarget).toFixed(0)}/head</span>
              </div>
              {projectedReadyDate && (
                <div className="flex justify-between mt-1">
                  <span className={`${cat.text} opacity-60`}>Projected ready date</span>
                  <span className={`${cat.text} font-bold`}>{format(new Date(projectedReadyDate), "d MMM yyyy")}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
            <Button
              onClick={save}
              disabled={saving || !form.daily_feed_cost_per_head || !form.expected_adg_kg_day}
              className={`flex-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold`}
            >
              {saving ? "Saving…" : "Save Plan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Decision Engine ──────────────────────────────────────────────────────────

function DecisionEngine({ mob, totalCostPerHead, latestWeightKg, latest, benchmarks, feedPlan, adg, cat, processorGrids }: any) {
  // ── Hold vs Sell state ───────────────────────────────────────────────────
  const [holdWeeks, setHoldWeeks] = useState(8);
  const [holdAdg, setHoldAdg] = useState<number>(adg ?? 1.2);
  const [holdDailyCost, setHoldDailyCost] = useState<number>(feedPlan?.daily_feed_cost_per_head ?? 3.50);

  const [dressingPct, setDressingPct] = useState(58);
  const [freightOut, setFreightOut] = useState(80);
  const [agentCommExit, setAgentCommExit] = useState(4.5);
  const [liveExportPremium, setLiveExportPremium] = useState(25);
  const [breedingPremium, setBreedingPremium] = useState(100);
  const [processorMarginPct, setProcessorMarginPct] = useState(10);
  const [aiRec, setAiRec] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const eyci             = latest("eyci")?.cents_per_kg ?? 0;
  const heavySteerBench  = latest("heavy_steer")?.cents_per_kg ?? latest("heavy_steer_0t")?.cents_per_kg ?? 0;
  const heavyCowBench    = latest("heavy_cow")?.cents_per_kg ?? 0;
  const feederBench      = latest("feeder_steer")?.cents_per_kg ?? 0;
  const othVic           = latest("oth_vic")?.cents_per_kg ?? 0;
  const othQld           = latest("oth_qld")?.cents_per_kg ?? 0;
  const grainPriceAudT   = latest("grain_wheat_aud_t")?.cents_per_kg ?? 370;
  const MLA = 5;

  async function generateRecommendation() {
    setAiLoading(true);
    setAiRec(null);
    try {
      const payload = {
        mob: {
          name: mob.mob_name,
          category: mob.category,
          head_count: mob.head_count,
          breed: mob.breed_type,
          days_on_feed: differenceInDays(new Date(), new Date(mob.purchase_date)),
          current_weight_kg: latestWeightKg,
          target_weight_kg: mob.target_weight_kg,
          adg_kg_day: adg,
          hgp_free: mob.hgp_free,
          msa_eligible: mob.msa_eligible,
          program_type: mob.program_type,
          target_exit_path: mob.target_exit_path,
        },
        costs: {
          total_cost_per_head: totalCostPerHead,
          daily_feed_cost: feedPlan?.daily_feed_cost_per_head ?? null,
          feed_source: feedPlan?.feed_source ?? null,
        },
        market: {
          eyci_cpkg: eyci,
          heavy_steer_bench_cpkg: heavySteerBench,
          oth_vic_cpkg: othVic,
          oth_qld_cpkg: othQld,
          feeder_steer_cpkg: feederBench,
          grain_wheat_aud_t: grainPriceAudT,
        },
        dressing_pct: dressingPct,
        freight_out: freightOut,
      };
      const { data, error } = await supabase.functions.invoke("livestock-recommendation", { body: payload });
      if (error) throw error;
      setAiRec(data?.recommendation ?? "No recommendation returned.");
    } catch (e: any) {
      setAiRec("Unable to generate recommendation — " + (e?.message ?? "unknown error"));
    }
    setAiLoading(false);
  }

  const benchmarkCpkg = ["boner_cow","cull_cow"].includes(mob.category) ? heavyCowBench
    : ["weaner","backgrounder","trade"].includes(mob.category) ? feederBench
    : heavySteerBench;

  const saleyardGross = (benchmarkCpkg / 100) * latestWeightKg;
  const saleyardSellCosts = freightOut + saleyardGross * (agentCommExit / 100) + 18 + MLA;
  const saleyardNet = saleyardGross - saleyardSellCosts;

  const carcaseKg = latestWeightKg * (dressingPct / 100);
  const hgpPrem = mob.hgp_free ? 50 : 0;
  const msaPrem = mob.msa_eligible ? 24 : 0;
  const othVicFallback = othVic || 615;

  const exportOk = latestWeightKg >= 350 && latestWeightKg <= 550;
  const exportGross = exportOk ? ((benchmarkCpkg + liveExportPremium) / 100) * latestWeightKg : 0;
  const exportNet = exportOk ? exportGross - freightOut - 40 - MLA : 0;

  const breedingGross = saleyardGross + breedingPremium;
  const breedingNet = breedingGross - freightOut - MLA;

  const killOwnGross = (othVicFallback / 100) * carcaseKg * (1 + processorMarginPct / 100);
  const killOwnNet = killOwnGross - MLA - 20;

  // Build processor paths from grid data (top 3 by effective price including premiums)
  const topProcessors: Array<{ key: string; label: string; sub: string; net: number; eligible: boolean; icon: React.ReactNode; isBestProcessor?: boolean }> =
    (processorGrids?.length > 0
      ? [...processorGrids]
          .map((g: any) => {
            const effectivePrice = g.price_cpkg_cw + (mob.hgp_free ? (g.hgp_free_premium_cpkg ?? 0) : 0) + (mob.msa_eligible ? (g.msa_premium_cpkg ?? 0) : 0);
            const gross = (effectivePrice / 100) * carcaseKg;
            const net = gross - freightOut - MLA;
            return { g, effectivePrice, gross, net };
          })
          .sort((a, b) => b.effectivePrice - a.effectivePrice)
          .slice(0, 3)
          .map((item, idx) => ({
            key: `processor_${item.g.id}`,
            label: `OTH — ${item.g.processor_name}`,
            sub: `${dressingPct}% dress → ${carcaseKg.toFixed(0)}kg CW · ${item.g.price_cpkg_cw}¢/kg${mob.hgp_free && item.g.hgp_free_premium_cpkg > 0 ? ` +${item.g.hgp_free_premium_cpkg}¢ HGP` : ""}${mob.msa_eligible && item.g.msa_premium_cpkg > 0 ? ` +${item.g.msa_premium_cpkg}¢ MSA` : ""} · ${item.g.description ?? ""}`,
            net: item.net,
            eligible: true,
            icon: <Layers className="h-4 w-4" />,
            isBestProcessor: idx === 0,
          }))
      : [{
          key: "oth",
          label: "OTH — Direct to Processor",
          sub: `${dressingPct}% dress → ${carcaseKg.toFixed(0)}kg CW · ${othVicFallback}¢/kg${hgpPrem ? ` +${hgpPrem}¢ HGP` : ""}${msaPrem ? ` +${msaPrem}¢ MSA` : ""}`,
          net: ((othVicFallback + hgpPrem + msaPrem) / 100) * carcaseKg - freightOut - MLA,
          eligible: true,
          icon: <Layers className="h-4 w-4" />,
        }]
    );

  const paths = [
    {
      key: "saleyard", label: "Sell Store — Saleyard",
      sub: `${benchmarkCpkg}¢/kg lwt · ${latestWeightKg.toFixed(0)}kg`,
      net: saleyardNet, eligible: true,
      icon: <ChevronRight className="h-4 w-4" />,
    },
    ...topProcessors,
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

  // ── Hold vs Sell calculations ───────────────────────────────────────────
  const holdDays = holdWeeks * 7;
  const projectedWt = latestWeightKg + holdAdg * holdDays;
  const additionalCost = holdDailyCost * holdDays;
  const totalCostAtExit = totalCostPerHead + additionalCost;

  // Sell today — best net across all paths (calculate below after paths are defined)
  const sellTodayNet = (() => {
    const cw = latestWeightKg * (dressingPct / 100);
    const hgpPrem = mob.hgp_free ? 50 : 0;
    const msaPrem = mob.msa_eligible ? 24 : 0;
    const othV = latest("oth_vic")?.cents_per_kg ?? 615;
    const oTH = ((othV + hgpPrem + msaPrem) / 100) * cw - freightOut - 5;
    const saleyard = (benchmarkCpkg / 100) * latestWeightKg - freightOut - (((benchmarkCpkg / 100) * latestWeightKg) * (agentCommExit / 100)) - 23;
    return Math.max(oTH, saleyard);
  })();

  // Hold to exit — same exit path logic but with projected weight
  const holdNet = (() => {
    const cw = projectedWt * (dressingPct / 100);
    const hgpPrem = mob.hgp_free ? 50 : 0;
    const msaPrem = mob.msa_eligible ? 24 : 0;
    const othV = latest("oth_vic")?.cents_per_kg ?? 615;
    const oTH = ((othV + hgpPrem + msaPrem) / 100) * cw - freightOut - 5;
    const saleyard = (benchmarkCpkg / 100) * projectedWt - freightOut - (((benchmarkCpkg / 100) * projectedWt) * (agentCommExit / 100)) - 23;
    return Math.max(oTH, saleyard);
  })();

  const sellTodayMargin = sellTodayNet - totalCostPerHead;
  const holdMargin = holdNet - totalCostAtExit;
  const holdAdvantage = holdMargin - sellTodayMargin;
  const sellIsBetter = sellTodayMargin > holdMargin;
  const holdIsWorthIt = holdAdvantage > 0;

  return (
    <div className="space-y-4">

      {/* ── Hold vs Sell Scenario ─────────────────────────────────────────── */}
      <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-8 w-8 rounded-xl bg-amber-500 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-amber-900">Hold vs Sell Scenario</p>
            <p className="text-xs text-amber-700">Model the decision before you make it</p>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-amber-800 font-semibold">Hold period</Label>
            <div className="flex rounded-lg overflow-hidden border border-amber-300 bg-white">
              {[4, 6, 8, 12, 16].map(w => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setHoldWeeks(w)}
                  className={`flex-1 text-xs py-2 font-bold transition-colors ${
                    holdWeeks === w ? "bg-amber-500 text-white" : "text-amber-700 hover:bg-amber-100"
                  }`}
                >
                  {w}w
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-amber-800 font-semibold">Expected ADG (kg/day)</Label>
            <Input
              type="number" step={0.05} value={holdAdg}
              onChange={e => setHoldAdg(+e.target.value)}
              className="h-9 text-sm rounded-lg border-amber-300"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-amber-800 font-semibold">Daily feed cost ($/head)</Label>
            <Input
              type="number" step={0.25} value={holdDailyCost}
              onChange={e => setHoldDailyCost(+e.target.value)}
              className="h-9 text-sm rounded-lg border-amber-300"
            />
          </div>
        </div>

        {/* Result cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Sell today */}
          <div className={`rounded-xl p-4 border-2 ${sellIsBetter ? "border-green-400 bg-green-50" : "border-slate-200 bg-white"}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Sell today</p>
              {sellIsBetter && <span className="text-xs font-bold bg-green-500 text-white px-2 py-0.5 rounded-full">Better now</span>}
            </div>
            <p className="text-xs text-muted-foreground mb-1">{latestWeightKg.toFixed(0)}kg · cost ${totalCostPerHead.toFixed(0)}/hd</p>
            <p className={`text-3xl font-black leading-tight ${sellTodayMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
              {sellTodayMargin >= 0 ? "+" : ""}{fmt$(sellTodayMargin)}
            </p>
            <p className="text-xs text-muted-foreground">margin / head</p>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {sellTodayMargin >= 0 ? "+" : ""}{fmt$(sellTodayMargin * mob.head_count)} across {mob.head_count} head
            </p>
          </div>

          {/* Hold */}
          <div className={`rounded-xl p-4 border-2 ${holdIsWorthIt && !sellIsBetter ? "border-green-400 bg-green-50" : "border-slate-200 bg-white"}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Hold {holdWeeks} weeks</p>
              {holdIsWorthIt && !sellIsBetter && <span className="text-xs font-bold bg-green-500 text-white px-2 py-0.5 rounded-full">Better to hold</span>}
            </div>
            <p className="text-xs text-muted-foreground mb-1">
              {projectedWt.toFixed(0)}kg proj · cost ${totalCostAtExit.toFixed(0)}/hd (+${additionalCost.toFixed(0)} feed)
            </p>
            <p className={`text-3xl font-black leading-tight ${holdMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
              {holdMargin >= 0 ? "+" : ""}{fmt$(holdMargin)}
            </p>
            <p className="text-xs text-muted-foreground">margin / head</p>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {holdMargin >= 0 ? "+" : ""}{fmt$(holdMargin * mob.head_count)} across {mob.head_count} head
            </p>
          </div>
        </div>

        {/* Verdict */}
        <div className={`rounded-xl px-4 py-3 flex items-start gap-3 ${
          holdAdvantage > 50 ? "bg-green-100 border border-green-300" :
          holdAdvantage < -50 ? "bg-red-100 border border-red-300" :
          "bg-slate-100 border border-slate-200"
        }`}>
          <div className="text-lg">{holdAdvantage > 50 ? "📈" : holdAdvantage < -50 ? "📉" : "⚖️"}</div>
          <div>
            <p className={`text-sm font-bold ${holdAdvantage > 50 ? "text-green-800" : holdAdvantage < -50 ? "text-red-800" : "text-slate-700"}`}>
              {holdAdvantage > 50
                ? `Hold ${holdWeeks} weeks — ${fmt$(holdAdvantage)}/head advantage`
                : holdAdvantage < -50
                  ? `Sell now — holding costs ${fmt$(Math.abs(holdAdvantage))}/head more than it returns`
                  : `Marginal — ${fmt$(Math.abs(holdAdvantage))}/head difference. Comes down to market outlook and risk.`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              At {holdAdg}kg ADG · ${holdDailyCost}/hd/day · {projectedWt.toFixed(0)}kg projected exit weight · current {benchmarkCpkg}¢/kg benchmark
            </p>
          </div>
        </div>
      </div>

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
                    {(path as any).isBestProcessor && !isBest && (
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">Best processor</span>
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
        EYCI {eyci > 0 ? `${eyci}¢/kg CW` : "—"} · MLA/NLRS benchmarks · All figures per head · Margins vs. total cost logged to date
      </p>

      {/* ── Industry Benchmarks ───────────────────────────────────────── */}
      <div className="rounded-xl border bg-muted/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" /> How this mob compares — industry benchmarks
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "ADG",
              value: adg != null ? `${adg.toFixed(2)}` : "—",
              unit: "kg/day",
              industry: "1.20 kg/d",
              better: adg != null && adg > 1.20,
              hasData: adg != null,
            },
            {
              label: "Cost/head",
              value: totalCostPerHead > 0 ? fmt$(totalCostPerHead) : "—",
              unit: "all-in",
              industry: "$780/hd",
              better: totalCostPerHead > 0 && totalCostPerHead < 780,
              hasData: totalCostPerHead > 0,
            },
            {
              label: "Dressing %",
              value: `${dressingPct}%`,
              unit: "assumed",
              industry: "54% avg",
              better: dressingPct >= 54,
              hasData: true,
            },
          ].map(b => (
            <div key={b.label} className="rounded-xl bg-white border px-3 py-3 text-center">
              <p className="text-xs text-muted-foreground font-medium">{b.label}</p>
              <p className="font-black text-xl leading-tight mt-0.5">{b.value}</p>
              <p className="text-xs text-muted-foreground">{b.unit}</p>
              {b.hasData && (
                <div className={`text-xs mt-1.5 font-semibold px-2 py-0.5 rounded-full inline-block ${
                  b.better ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {b.better ? "↑" : "↓"} ind. avg {b.industry}
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground/50 mt-2.5 text-center">
          Australian backgrounder/feedlot averages · indicative · benchmarks will update as more Muster users contribute data
        </p>
      </div>

      {/* ── AI Recommendation ─────────────────────────────────────────── */}
      <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-violet-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm text-violet-900">AI Decision Recommendation</p>
              <p className="text-xs text-violet-600">Powered by Claude · analyses mob, costs & markets</p>
            </div>
          </div>
          <button
            onClick={generateRecommendation}
            disabled={aiLoading}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
          >
            {aiLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {aiLoading ? "Analysing…" : aiRec ? "Regenerate" : "Get recommendation"}
          </button>
        </div>

        {aiRec ? (
          <div className="bg-white/70 rounded-xl p-4 text-sm text-violet-900 leading-relaxed whitespace-pre-wrap">
            {aiRec}
          </div>
        ) : !aiLoading && (
          <p className="text-xs text-violet-500 text-center py-2">
            Tap "Get recommendation" to analyse this mob against current market conditions and costs.
          </p>
        )}
        {aiLoading && (
          <div className="flex items-center justify-center gap-2 py-4 text-violet-600 text-sm">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Analysing mob data, costs, and market conditions…
          </div>
        )}
      </div>
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
              className={`flex-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold`}
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
          {/* Weighbridge docket scanner */}
          <DocumentScanner
            documentType="weighbridge"
            onExtracted={(fields) => {
              if (fields.weigh_date)    set("weigh_date",    String(fields.weigh_date));
              if (fields.avg_weight_kg) set("avg_weight_kg", String(fields.avg_weight_kg));
              if (fields.notes)         set("notes",         String(fields.notes));
            }}
          />

          {/* Big weight input */}
          <div className={`rounded-2xl bg-primary/10 border border-primary/20 p-5 text-center`}>
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
              className={`flex-1 rounded-xl h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-base`}
            >
              {saving ? "Saving…" : "Save Weight"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Kill Sheet Tab ───────────────────────────────────────────────────────────

function KillSheetTab({ mob, killRecords, killLoading, cat, latest, onAdd }: any) {
  const othVic = latest("oth_vic")?.cents_per_kg ?? 615;
  const DRESSING = 58;

  if (killLoading) return (
    <div className="space-y-3 animate-pulse">
      {[1,2].map(i => <div key={i} className="h-24 rounded-xl bg-muted/40" />)}
    </div>
  );

  if (killRecords.length === 0) return (
    <div className="space-y-4">
      <EmptyState
        icon={<Scale className="h-10 w-10 text-muted-foreground/20" />}
        message="No kill records yet. Record a kill sheet to reconcile actual vs projected returns."
        action={{ label: "Record kill sheet", onClick: onAdd }}
        cat={cat}
      />
    </div>
  );

  const projCarcaseKg = mob.target_weight_kg ? mob.target_weight_kg * (DRESSING / 100) : null;
  const projPayment = projCarcaseKg ? (othVic / 100) * projCarcaseKg : null;

  return (
    <div className="space-y-4">
      {killRecords.map((kr: any) => {
        const carcaseKg = kr.avg_carcase_weight_kg;
        const carcaseVariance = projCarcaseKg && carcaseKg ? carcaseKg - projCarcaseKg : null;
        const priceVariance = kr.price_cpkg_cw ? kr.price_cpkg_cw - othVic : null;
        const paymentVariance = projPayment && kr.total_payment && kr.head_count
          ? (kr.total_payment / kr.head_count) - projPayment
          : null;
        const totalProjected = projPayment ? projPayment * kr.head_count : null;
        const totalVariance = totalProjected && kr.total_payment ? kr.total_payment - totalProjected : null;

        return (
          <Card key={kr.id} className="rounded-2xl overflow-hidden">
            <div className={`px-5 py-4 border-b ${cat.bg} ${cat.border}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={`font-bold text-base ${cat.text}`}>{kr.processor_name}</p>
                  <p className={`text-sm ${cat.text} opacity-70`}>
                    Kill date: {format(new Date(kr.kill_date), "EEEE d MMMM yyyy")} · {kr.head_count} head
                  </p>
                </div>
                <div className="text-right">
                  {kr.total_payment != null && (
                    <>
                      <p className={`text-2xl font-black ${cat.text}`}>${kr.total_payment.toLocaleString("en-AU", { maximumFractionDigits: 0 })}</p>
                      <p className={`text-xs ${cat.text} opacity-60`}>total payment</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <CardContent className="pt-4 space-y-3">
              {/* Specs row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Avg carcase wt", value: carcaseKg ? `${carcaseKg.toFixed(1)} kg` : "—" },
                  { label: "Grade / Fat score", value: [kr.grade, kr.fat_score].filter(Boolean).join(" / ") || "—" },
                  { label: "Price", value: kr.price_cpkg_cw ? `${kr.price_cpkg_cw.toFixed(0)}¢/kg CW` : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-xs text-muted-foreground font-medium">{label}</p>
                    <p className="font-bold text-sm">{value}</p>
                  </div>
                ))}
              </div>

              {/* Variance comparison */}
              {(carcaseVariance !== null || priceVariance !== null || totalVariance !== null) && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Actual vs Projected</p>
                  <div className="space-y-2">
                    {carcaseVariance !== null && (
                      <VarianceRow
                        label="Carcase weight"
                        actual={`${carcaseKg?.toFixed(1)}kg`}
                        projected={`${projCarcaseKg?.toFixed(1)}kg`}
                        variance={carcaseVariance}
                        unit="kg"
                      />
                    )}
                    {priceVariance !== null && (
                      <VarianceRow
                        label="Price ¢/kg CW"
                        actual={`${kr.price_cpkg_cw?.toFixed(0)}¢`}
                        projected={`${othVic.toFixed(0)}¢ (OTH bench)`}
                        variance={priceVariance}
                        unit="¢"
                      />
                    )}
                    {paymentVariance !== null && carcaseKg && (
                      <VarianceRow
                        label="Payment per head"
                        actual={`$${(kr.total_payment / kr.head_count).toFixed(2)}`}
                        projected={`$${projPayment?.toFixed(2)}`}
                        variance={paymentVariance}
                        unit="$/hd"
                      />
                    )}
                    {totalVariance !== null && (
                      <VarianceRow
                        label="Total payment"
                        actual={`$${kr.total_payment?.toLocaleString("en-AU", { maximumFractionDigits: 0 })}`}
                        projected={`$${totalProjected?.toLocaleString("en-AU", { maximumFractionDigits: 0 })}`}
                        variance={totalVariance}
                        unit="$"
                        bold
                      />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Projected based on {mob.target_weight_kg}kg target × {DRESSING}% dress × {othVic}¢/kg OTH bench</p>
                </div>
              )}

              {kr.notes && (
                <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">{kr.notes}</p>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* ── Processor Scorecard ──────────────────────────────────────── */}
      {killRecords.length >= 2 && (() => {
        const byProcessor: Record<string, { runs: number; payTotal: number; payCount: number }> = {};
        killRecords.forEach((kr: any) => {
          if (!byProcessor[kr.processor_name]) byProcessor[kr.processor_name] = { runs: 0, payTotal: 0, payCount: 0 };
          byProcessor[kr.processor_name].runs++;
          if (kr.total_payment && kr.head_count) {
            byProcessor[kr.processor_name].payTotal += kr.total_payment / kr.head_count;
            byProcessor[kr.processor_name].payCount++;
          }
        });
        const ranked = Object.entries(byProcessor)
          .map(([name, d]) => ({ name, avgPayment: d.payCount > 0 ? d.payTotal / d.payCount : 0, runs: d.runs }))
          .sort((a, b) => b.avgPayment - a.avgPayment);

        return (
          <div className="rounded-xl border bg-muted/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5" /> Processor Scorecard — actual $/hd achieved
            </p>
            <div className="space-y-2">
              {ranked.map((p, i) => (
                <div
                  key={p.name}
                  className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
                    i === 0 ? "bg-green-50 border border-green-200" : "bg-white border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {i === 0 && <span className="text-xs font-bold bg-green-600 text-white px-1.5 py-0.5 rounded-full">Best</span>}
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.runs} kill{p.runs > 1 ? "s" : ""}</span>
                  </div>
                  <span className={`text-base font-bold ${i === 0 ? "text-green-700" : ""}`}>
                    {p.avgPayment > 0 ? fmt$(p.avgPayment) : "—"}
                    <span className="text-xs font-normal text-muted-foreground">/hd avg</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/60 mt-2">Ranked by average actual payment per head across all kill runs</p>
          </div>
        );
      })()}

      <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={onAdd}>
        <Plus className="h-4 w-4 mr-2" /> Add Kill Record
      </Button>
    </div>
  );
}

function VarianceRow({ label, actual, projected, variance, unit, bold }: any) {
  const isPos = variance >= 0;
  return (
    <div className={`rounded-lg px-3 py-2 flex items-center justify-between ${bold ? "bg-muted/30" : ""}`}>
      <div>
        <p className={`text-xs font-medium ${bold ? "font-bold" : ""}`}>{label}</p>
        <p className="text-xs text-muted-foreground">actual: {actual} · projected: {projected}</p>
      </div>
      <span className={`text-sm font-bold ml-3 whitespace-nowrap ${isPos ? "text-green-600" : "text-red-600"}`}>
        {isPos ? "+" : ""}{typeof variance === "number" ? variance.toFixed(unit === "$" || unit === "$/hd" ? 0 : 1) : variance}{unit}
      </span>
    </div>
  );
}

// ─── Add Kill Record Dialog ───────────────────────────────────────────────────

function AddKillRecordDialog({ open, onClose, mobId, onSaved, toast, cat }: any) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    kill_date: today,
    processor_name: "",
    head_count: "",
    avg_carcase_weight_kg: "",
    grade: "A",
    fat_score: "",
    price_cpkg_cw: "",
    total_payment: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Auto-calc total payment
  const autoPayment = form.avg_carcase_weight_kg && form.price_cpkg_cw && form.head_count
    ? (parseFloat(form.price_cpkg_cw) / 100) * parseFloat(form.avg_carcase_weight_kg) * parseFloat(form.head_count)
    : null;

  async function save() {
    if (!form.kill_date || !form.processor_name || !form.head_count) return;
    setSaving(true);
    const payment = form.total_payment ? parseFloat(form.total_payment) : autoPayment;
    const { error } = await supabase.from("kill_records").insert({
      mob_id: mobId,
      kill_date: form.kill_date,
      processor_name: form.processor_name,
      head_count: parseInt(form.head_count),
      avg_carcase_weight_kg: form.avg_carcase_weight_kg ? parseFloat(form.avg_carcase_weight_kg) : null,
      grade: form.grade || null,
      fat_score: form.fat_score || null,
      price_cpkg_cw: form.price_cpkg_cw ? parseFloat(form.price_cpkg_cw) : null,
      total_payment: payment,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Kill record saved" });
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader><DialogTitle>Record Kill Sheet</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Kill Date</Label>
              <Input type="date" value={form.kill_date} onChange={e => set("kill_date", e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Head Count</Label>
              <Input type="number" placeholder="0" value={form.head_count} onChange={e => set("head_count", e.target.value)} className="rounded-xl font-bold" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Processor Name</Label>
            <Input placeholder="e.g. JBS Australia" value={form.processor_name} onChange={e => set("processor_name", e.target.value)} className="rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Avg carcase weight (kg/head)</Label>
              <Input type="number" step="0.1" placeholder="0.0" value={form.avg_carcase_weight_kg} onChange={e => set("avg_carcase_weight_kg", e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Price (¢/kg CW)</Label>
              <Input type="number" step="0.5" placeholder="620" value={form.price_cpkg_cw} onChange={e => set("price_cpkg_cw", e.target.value)} className="rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Grade</Label>
              <Input placeholder="A" value={form.grade} onChange={e => set("grade", e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Fat score</Label>
              <Input placeholder="2-4" value={form.fat_score} onChange={e => set("fat_score", e.target.value)} className="rounded-xl" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Total Payment ($)</Label>
            <Input
              type="number" step="0.01"
              placeholder={autoPayment ? autoPayment.toFixed(2) : "0.00"}
              value={form.total_payment}
              onChange={e => set("total_payment", e.target.value)}
              className="rounded-xl font-bold text-lg"
            />
            {autoPayment && !form.total_payment && (
              <p className="text-xs text-muted-foreground">Auto-calculated: ${autoPayment.toFixed(2)}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Notes</Label>
            <Input placeholder="Optional" value={form.notes} onChange={e => set("notes", e.target.value)} className="rounded-xl" />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
            <Button
              onClick={save}
              disabled={saving || !form.kill_date || !form.processor_name || !form.head_count}
              className={`flex-1 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold`}
            >
              {saving ? "Saving…" : "Save Record"}
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
