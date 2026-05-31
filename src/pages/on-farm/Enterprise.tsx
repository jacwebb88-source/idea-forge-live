import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProperties, useAllPens, useKillPipeline } from "@/components/on-farm/useEnterprise";
import { useMobs } from "@/components/on-farm/useMobs";
import {
  PROPERTY_TYPE_LABELS, PEN_PROGRAM_LABELS, PEN_PROGRAM_DOF,
  PEN_STATUS_LABELS, PEN_STATUS_COLORS, STATE_OPTIONS,
  type PropertyType, type PenProgram, type PenStatus, type Property, type FeedlotPen,
} from "@/components/on-farm/enterpriseTypes";
import { CATEGORY_LABELS } from "@/components/on-farm/types";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, ReferenceLine, Legend,
} from "recharts";
import {
  Plus, Building2, MapPin, Users, TrendingUp, AlertTriangle,
  ChevronDown, ChevronRight, Scale, DollarSign, Activity,
  CheckCircle, LayoutGrid, Layers, Bell,
  Wallet,
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { PieChart as RechartsPie, Pie, Cell, Tooltip as RechartsTooltip } from "recharts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pctFill(current: number, capacity: number) {
  if (!capacity) return 0;
  return Math.min(100, Math.round((current / capacity) * 100));
}

function propertyTypeColor(t: string) {
  const m: Record<string, string> = {
    feedlot: "bg-amber-100 text-amber-800",
    pastoral: "bg-green-100 text-green-700",
    agistment: "bg-blue-100 text-blue-700",
    backgrounding: "bg-purple-100 text-purple-700",
    mixed: "bg-slate-100 text-slate-700",
  };
  return m[t] ?? "bg-gray-100 text-gray-700";
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Enterprise() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { properties, loading: propsLoading, refetch: refetchProps } = useProperties();
  const { pens, loading: pensLoading, refetch: refetchPens } = useAllPens();
  const { mobs } = useMobs();
  const { pipeline, loading: pipelineLoading } = useKillPipeline(properties);

  const [showPropertyDialog, setShowPropertyDialog] = useState(false);
  const [showPenDialog, setShowPenDialog] = useState(false);
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);

  // Aggregate stats
  const totalCapacity = properties.reduce((s, p) => s + (p.capacity_head ?? 0), 0);
  const totalCurrentHead = properties.reduce((s, p) => s + (p.current_head ?? 0), 0);
  const activePens = pens.filter(p => p.pen_status === "active" || p.pen_status === "filling");
  const readyPens = pens.filter(p => p.pen_status === "ready");
  const wk4Head = pipeline.slice(0, 4).reduce((s, w) => s + w.headReady, 0);
  const wk12Head = pipeline.reduce((s, w) => s + w.headReady, 0);

  // Financial estimates
  const activeMobs = mobs.filter(m => m.status === "active");
  const estimatedValueOnFeed = activeMobs.reduce((s, m) => {
    const avgWeight = (m.current_avg_weight_kg ?? m.purchase_weight_kg ?? 0);
    const price = 4.5; // $/kg CW estimate
    const dressingPct = 0.54;
    return s + (m.head_count * avgWeight * dressingPct * price);
  }, 0);
  const totalFeedCostToDate = activeMobs.reduce((s, m) => {
    const dof = differenceInDays(new Date(), new Date(m.purchase_date));
    const dailyCost = 6; // $6/hd/day default estimate
    return s + (m.head_count * dof * dailyCost);
  }, 0);
  const estimatedGrossMargin = estimatedValueOnFeed - totalFeedCostToDate - activeMobs.reduce((s, m) => s + (m.total_purchase_cost ?? 0), 0);

  // Alerts
  const alerts: { level: "warning" | "info"; text: string }[] = [];
  if (readyPens.length > 0) alerts.push({ level: "warning", text: `${readyPens.length} pen${readyPens.length > 1 ? "s" : ""} ready to ship — book a kill slot now` });
  const staleWeightMobs = activeMobs.filter(m => {
    const lastWeight = m.updated_at ? differenceInDays(new Date(), new Date(m.updated_at)) : 999;
    return lastWeight > 21;
  });
  if (staleWeightMobs.length > 0) alerts.push({ level: "info", text: `${staleWeightMobs.length} mob${staleWeightMobs.length > 1 ? "s" : ""} haven't had a weight update in 21+ days` });
  const overCapacity = properties.filter(p => (p.current_head ?? 0) > (p.capacity_head ?? 999999));
  if (overCapacity.length > 0) alerts.push({ level: "warning", text: `${overCapacity.map(p => p.name).join(", ")} showing over-capacity — check head counts` });

  // Program mix for donut
  const programCounts: Record<string, number> = {};
  pens.forEach(pen => {
    const key = pen.program ?? "unspecified";
    programCounts[key] = (programCounts[key] ?? 0) + (pen.capacity ?? 0);
  });
  const programMixData = Object.entries(programCounts).map(([name, value]) => ({
    name: PEN_PROGRAM_LABELS[name as PenProgram] ?? "Unspecified",
    value,
  })).filter(d => d.value > 0);
  const PIE_COLORS = ["#16a34a","#f59e0b","#6366f1","#0ea5e9","#ec4899","#94a3b8"];

  const fillPctTotal = pctFill(totalCurrentHead, totalCapacity);

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Livestock Enterprise</h1>
            <p className="text-muted-foreground mt-1">
              Multi-property portfolio, pen management &amp; forward kill pipeline
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowPenDialog(true)} className="gap-1">
              <LayoutGrid className="h-4 w-4" /> Add Pen
            </Button>
            <Button size="sm" onClick={() => setShowPropertyDialog(true)} className="gap-1">
              <Plus className="h-4 w-4" /> Add Property
            </Button>
          </div>
        </div>

        {/* ── Alerts ───────────────────────────────────────────────────── */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm border ${
                a.level === "warning"
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-blue-50 border-blue-200 text-blue-800"
              }`}>
                {a.level === "warning"
                  ? <AlertTriangle className="h-4 w-4 shrink-0" />
                  : <Bell className="h-4 w-4 shrink-0" />}
                <span>{a.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── KPI strip ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={<Building2 className="h-4 w-4 text-primary" />} label="Properties" value={String(properties.length)} color="bg-primary/10" />
          <KpiCard icon={<Scale className="h-4 w-4 text-green-600" />} label="Head on Feed" value={totalCurrentHead.toLocaleString()} sub={totalCapacity ? `${fillPctTotal}% of ${totalCapacity.toLocaleString()} cap` : undefined} color="bg-green-50" />
          <KpiCard icon={<Wallet className="h-4 w-4 text-blue-600" />} label="Est. Gross Margin" value={estimatedGrossMargin > 0 ? `$${(estimatedGrossMargin/1000).toFixed(0)}k` : "—"} sub="across active mobs" color="bg-blue-50" />
          <KpiCard icon={<Activity className="h-4 w-4 text-amber-600" />} label="Pens Ready to Ship" value={String(readyPens.length)} sub={`${activePens.length} pens active · ${wk4Head} head ≤4 wks`} color="bg-amber-50" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="portfolio">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            <TabsTrigger value="pens">Pens</TabsTrigger>
            <TabsTrigger value="pipeline">Kill Pipeline</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
          </TabsList>

          {/* ─── PROPERTY PORTFOLIO ───────────────────────────────────── */}
          <TabsContent value="portfolio" className="mt-4 space-y-4">
            {propsLoading ? (
              <div className="text-center py-10 text-muted-foreground text-sm">Loading…</div>
            ) : properties.length === 0 ? (
              <EmptyState
                icon={<Building2 className="h-10 w-10 text-muted-foreground/30" />}
                message="No properties added yet."
                action={{ label: "Add first property", onClick: () => setShowPropertyDialog(true) }}
              />
            ) : (
              <>
                {/* Utilisation overview chart */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Utilisation by Property</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={properties.map(p => ({
                        name: p.name.length > 16 ? p.name.slice(0, 15) + "…" : p.name,
                        capacity: p.capacity_head ?? 0,
                        onFeed: p.current_head ?? 0,
                        available: Math.max(0, (p.capacity_head ?? 0) - (p.current_head ?? 0)),
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="onFeed" name="On Feed" stackId="a" fill="#16a34a" radius={[0,0,0,0]} />
                        <Bar dataKey="available" name="Available" stackId="a" fill="#e5e7eb" radius={[4,4,0,0]} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Property cards */}
                <div className="space-y-3">
                  {properties.map(prop => {
                    const propPens = pens.filter(p => p.property_id === prop.id);
                    const propMobs = mobs.filter(m => m.property_id === prop.id && m.status === "active");
                    const isExpanded = expandedProperty === prop.id;
                    const fillPct = pctFill(prop.current_head ?? 0, prop.capacity_head ?? 0);

                    return (
                      <Card key={prop.id} className={prop.nfas_accredited ? "border-amber-200" : ""}>
                        <CardContent className="pt-4">
                          <div
                            className="flex items-start justify-between gap-3 cursor-pointer"
                            onClick={() => setExpandedProperty(isExpanded ? null : prop.id)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{prop.name}</span>
                                <Badge className={`text-xs ${propertyTypeColor(prop.property_type)}`}>
                                  {PROPERTY_TYPE_LABELS[prop.property_type as PropertyType]}
                                </Badge>
                                {prop.nfas_accredited && (
                                  <Badge className="text-xs bg-amber-100 text-amber-800">
                                    <CheckCircle className="h-3 w-3 mr-1" />NFAS Accredited
                                  </Badge>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                                {prop.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{prop.location}{prop.state ? `, ${prop.state}` : ""}</span>}
                                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{(prop.current_head ?? 0).toLocaleString()} head on feed</span>
                                {prop.capacity_head && <span>Capacity: {prop.capacity_head.toLocaleString()}</span>}
                                {propPens.length > 0 && <span>{propPens.length} pens</span>}
                              </div>
                              {/* Utilisation bar */}
                              {prop.capacity_head ? (
                                <div className="mt-2 flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${fillPct > 85 ? "bg-amber-500" : "bg-green-500"}`}
                                      style={{ width: `${fillPct}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground w-8 text-right">{fillPct}%</span>
                                </div>
                              ) : null}
                            </div>
                            <div className="shrink-0 text-muted-foreground">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </div>
                          </div>

                          {/* Expanded: pens and mobs */}
                          {isExpanded && (
                            <div className="mt-4 border-t pt-4 space-y-3">
                              {propMobs.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Active Mobs</p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {propMobs.map(m => (
                                      <div
                                        key={m.id}
                                        className="bg-muted/30 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-muted/50"
                                        onClick={e => { e.stopPropagation(); navigate(`/on-farm/mobs/${m.id}`); }}
                                      >
                                        <p className="font-medium">{m.mob_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {m.head_count} head · {CATEGORY_LABELS[m.category]} · {differenceInDays(new Date(), new Date(m.purchase_date))}d on feed
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {propPens.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Pens</p>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {propPens.map(pen => (
                                      <PenChip key={pen.id} pen={pen} />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {propMobs.length === 0 && propPens.length === 0 && (
                                <p className="text-xs text-muted-foreground italic">No mobs or pens linked to this property yet.</p>
                              )}
                              {prop.contact_name && (
                                <p className="text-xs text-muted-foreground">Contact: {prop.contact_name}{prop.contact_phone ? ` · ${prop.contact_phone}` : ""}</p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>

          {/* ─── PEN MANAGEMENT ──────────────────────────────────────── */}
          <TabsContent value="pens" className="mt-4 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">Feedlot Pen Management</h2>
              <Button size="sm" onClick={() => setShowPenDialog(true)} className="gap-1">
                <Plus className="h-4 w-4" /> Add Pen
              </Button>
            </div>

            {/* Status summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {(["empty","filling","active","ready","resting"] as PenStatus[]).map(s => {
                const count = pens.filter(p => p.pen_status === s).length;
                return (
                  <div key={s} className={`rounded-lg px-3 py-2 text-center ${PEN_STATUS_COLORS[s]}`}>
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-xs">{PEN_STATUS_LABELS[s]}</p>
                  </div>
                );
              })}
            </div>

            {pensLoading ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Loading…</div>
            ) : pens.length === 0 ? (
              <EmptyState
                icon={<LayoutGrid className="h-10 w-10 text-muted-foreground/30" />}
                message="No pens configured yet. Add properties first, then add pens."
                action={{ label: "Add first pen", onClick: () => setShowPenDialog(true) }}
              />
            ) : (
              <>
                {/* Group by property */}
                {properties.map(prop => {
                  const propPens = pens.filter(p => p.property_id === prop.id);
                  if (propPens.length === 0) return null;
                  return (
                    <div key={prop.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold text-sm">{prop.name}</h3>
                        {prop.nfas_accredited && <Badge className="text-xs bg-amber-100 text-amber-700">NFAS</Badge>}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {propPens.map(pen => {
                          const mob = mobs.find(m => m.id === pen.current_mob_id);
                          const dof = pen.date_entered ? differenceInDays(new Date(), new Date(pen.date_entered)) : null;
                          const dofTarget = pen.target_days_on_feed;
                          const dofPct = dof && dofTarget ? Math.min(100, Math.round((dof / dofTarget) * 100)) : null;
                          const dailyCost = pen.ration_cost_per_tonne && pen.daily_intake_kg_head
                            ? (pen.ration_cost_per_tonne / 1000) * pen.daily_intake_kg_head
                            : null;

                          return (
                            <Card key={pen.id} className={pen.pen_status === "ready" ? "border-amber-400" : ""}>
                              <CardContent className="pt-4 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-semibold text-sm">Pen {pen.pen_number}</p>
                                    {pen.program && (
                                      <p className="text-xs text-muted-foreground">{PEN_PROGRAM_LABELS[pen.program as PenProgram]}</p>
                                    )}
                                  </div>
                                  <Badge className={`text-xs ${PEN_STATUS_COLORS[pen.pen_status as PenStatus]}`}>
                                    {PEN_STATUS_LABELS[pen.pen_status as PenStatus]}
                                  </Badge>
                                </div>

                                {mob ? (
                                  <div
                                    className="bg-muted/30 rounded px-2.5 py-1.5 text-xs cursor-pointer hover:bg-muted/50"
                                    onClick={() => navigate(`/on-farm/mobs/${mob.id}`)}
                                  >
                                    <p className="font-medium">{mob.mob_name}</p>
                                    <p className="text-muted-foreground">{mob.head_count} head · {CATEGORY_LABELS[mob.category]}</p>
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">
                                    {pen.capacity ? `${pen.capacity} head capacity — empty` : "Empty"}
                                  </p>
                                )}

                                {dof !== null && dofTarget && (
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                      <span>Day {dof} of {dofTarget}</span>
                                      <span>{dofPct}%</span>
                                    </div>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${dofPct! >= 100 ? "bg-amber-500" : "bg-green-500"}`}
                                        style={{ width: `${Math.min(100, dofPct!)}%` }}
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                  {pen.target_weight_kg && <span>Target: {pen.target_weight_kg}kg</span>}
                                  {dailyCost && <span>Feed: ${dailyCost.toFixed(2)}/hd/day</span>}
                                  {pen.estimated_exit_date && (
                                    <span>Exit: {format(new Date(pen.estimated_exit_date), "d MMM yy")}</span>
                                  )}
                                </div>

                                {pen.pen_status === "ready" && (
                                  <div className="bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5 text-xs text-amber-800 font-medium">
                                    Ready to ship — book a kill slot
                                  </div>
                                )}

                                <Button
                                  variant="ghost" size="sm"
                                  className="h-7 text-xs w-full text-muted-foreground"
                                  onClick={() => updatePenStatus(pen, refetchPens, toast)}
                                >
                                  Update status
                                </Button>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Pens with no property */}
                {pens.filter(p => !properties.find(pr => pr.id === p.property_id)).length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-2">Unassigned</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {pens.filter(p => !properties.find(pr => pr.id === p.property_id)).map(pen => (
                        <PenChip key={pen.id} pen={pen} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ─── KILL PIPELINE ────────────────────────────────────────── */}
          <TabsContent value="pipeline" className="mt-4 space-y-4">
            <div>
              <h2 className="font-semibold">Forward Kill Pipeline</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Projects which mobs will reach target weight each week over the next 12 weeks, based on current ADG. Use this to fill your kill plan with own supply.
              </p>
            </div>

            {pipelineLoading ? (
              <div className="text-center py-10 text-muted-foreground text-sm">Calculating projections…</div>
            ) : pipeline.every(w => w.headReady === 0) ? (
              <EmptyState
                icon={<TrendingUp className="h-10 w-10 text-muted-foreground/30" />}
                message="No mobs have enough weight data to project a kill pipeline yet. Log weight records against active mobs to see projections here."
              />
            ) : (
              <>
                {/* Bar chart — weekly head */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Head reaching target weight by week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={pipeline.map(w => ({
                        week: w.weekLabel.split("—")[0].trim(),
                        head: w.headReady,
                        cumulative: w.cumulativeHead,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar yAxisId="left" dataKey="head" name="Head this week" fill="#16a34a" radius={[4,4,0,0]} />
                        <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Cumulative head" stroke="#6366f1" strokeWidth={2} dot={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Weekly breakdown table */}
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                            <th className="text-left px-4 py-2.5">Week</th>
                            <th className="text-right px-4 py-2.5">Head ready</th>
                            <th className="text-right px-4 py-2.5">Cumulative</th>
                            <th className="text-left px-4 py-2.5">Mobs</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {pipeline.map((week, i) => (
                            <PipelineRow key={i} week={week} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <div className="bg-muted/30 border rounded-lg px-4 py-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground text-sm">How to use this</p>
                  <p>Compare head ready each week against your weekly kill plan capacity. Weeks where your own supply falls short = weeks where you need to buy in cattle.</p>
                  <p>Projections are based on each mob's current average daily gain. Accuracy improves with more frequent weight records.</p>
                  <p>When a mob is ready, go to On Farm → mob detail → book a kill slot directly into the Muster booking system.</p>
                </div>
              </>
            )}
          </TabsContent>
          {/* ─── FINANCIALS ───────────────────────────────────────────── */}
          <TabsContent value="financials" className="mt-4 space-y-4">
            <div>
              <h2 className="font-semibold">Enterprise Financial Snapshot</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Estimated figures based on current mobs, purchase costs, and default feed cost assumptions. Update mob records for more accurate numbers.
              </p>
            </div>

            {/* Top-line P&L */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground mb-1">Estimated Sale Value</p>
                  <p className="text-3xl font-extrabold text-green-700">
                    {estimatedValueOnFeed > 0 ? `$${(estimatedValueOnFeed / 1000).toFixed(1)}k` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Based on current avg weight × 54% dressing × $4.50/kg CW</p>
                </CardContent>
              </Card>
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground mb-1">Total Cost In (est.)</p>
                  <p className="text-3xl font-extrabold text-amber-700">
                    {(totalFeedCostToDate + activeMobs.reduce((s, m) => s + (m.total_purchase_cost ?? 0), 0)) > 0
                      ? `$${((totalFeedCostToDate + activeMobs.reduce((s, m) => s + (m.total_purchase_cost ?? 0), 0)) / 1000).toFixed(1)}k`
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Purchase cost + feed cost to date ($6/hd/day est.)</p>
                </CardContent>
              </Card>
              <Card className={`${estimatedGrossMargin > 0 ? "border-blue-200 bg-blue-50" : "border-red-200 bg-red-50"}`}>
                <CardContent className="pt-5">
                  <p className="text-xs text-muted-foreground mb-1">Est. Gross Margin</p>
                  <p className={`text-3xl font-extrabold ${estimatedGrossMargin > 0 ? "text-blue-700" : "text-red-700"}`}>
                    {estimatedGrossMargin !== 0 ? `${estimatedGrossMargin > 0 ? "+" : ""}$${(estimatedGrossMargin / 1000).toFixed(1)}k` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Before overheads, transport & processing</p>
                </CardContent>
              </Card>
            </div>

            {/* Per-mob breakdown */}
            {activeMobs.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Mob-level Breakdown</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                          <th className="text-left px-4 py-2.5">Mob</th>
                          <th className="text-right px-4 py-2.5">Head</th>
                          <th className="text-right px-4 py-2.5">DOF</th>
                          <th className="text-right px-4 py-2.5">Purchase cost</th>
                          <th className="text-right px-4 py-2.5">Feed cost est.</th>
                          <th className="text-right px-4 py-2.5">Sale value est.</th>
                          <th className="text-right px-4 py-2.5">Margin est.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {activeMobs.map(m => {
                          const dof = differenceInDays(new Date(), new Date(m.purchase_date));
                          const feedCost = m.head_count * dof * 6;
                          const purchaseCost = m.total_purchase_cost ?? 0;
                          const avgWeight = m.current_avg_weight_kg ?? m.purchase_weight_kg ?? 0;
                          const saleValue = m.head_count * avgWeight * 0.54 * 4.5;
                          const margin = saleValue - feedCost - purchaseCost;
                          return (
                            <tr key={m.id} className="hover:bg-muted/20 cursor-pointer"
                              onClick={() => navigate(`/on-farm/mobs/${m.id}`)}>
                              <td className="px-4 py-2.5 font-medium">{m.mob_name}</td>
                              <td className="px-4 py-2.5 text-right">{m.head_count}</td>
                              <td className="px-4 py-2.5 text-right">{dof}d</td>
                              <td className="px-4 py-2.5 text-right">{purchaseCost > 0 ? `$${(purchaseCost/1000).toFixed(1)}k` : "—"}</td>
                              <td className="px-4 py-2.5 text-right text-amber-700">${(feedCost/1000).toFixed(1)}k</td>
                              <td className="px-4 py-2.5 text-right text-green-700">{saleValue > 0 ? `$${(saleValue/1000).toFixed(1)}k` : "—"}</td>
                              <td className={`px-4 py-2.5 text-right font-semibold ${margin > 0 ? "text-green-700" : "text-red-600"}`}>
                                {saleValue > 0 ? `${margin > 0 ? "+" : ""}$${(margin/1000).toFixed(1)}k` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Program mix */}
            {programMixData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Program Mix (by pen capacity)</CardTitle></CardHeader>
                  <CardContent className="flex items-center justify-center py-2">
                    <RechartsPie width={220} height={180}>
                      <Pie data={programMixData} cx={110} cy={80} innerRadius={40} outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                        {programMixData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip />
                    </RechartsPie>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Program Breakdown</CardTitle></CardHeader>
                  <CardContent className="space-y-2 pt-2">
                    {programMixData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-sm flex-1">{d.name}</span>
                        <span className="text-sm font-semibold">{d.value.toLocaleString()} head cap</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t text-xs text-muted-foreground">
                      These are estimated values only. Update pen and mob records with actual costs for accurate projections.
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeMobs.length === 0 && (
              <EmptyState
                icon={<Wallet className="h-10 w-10 text-muted-foreground/30" />}
                message="No active mobs yet. Add mobs via On Farm to see financial projections here."
              />
            )}
          </TabsContent>
        </Tabs>

        {/* ── Related Tools ────────────────────────────────────────────── */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Related tools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                title: "Market Intelligence",
                desc: "Live EYCI, feeder and heavy steer indicators. Know what the market is doing before you decide to buy or sell.",
                url: "/on-farm/market",
                icon: <TrendingUp className="h-5 w-5 text-blue-600" />,
                color: "bg-blue-50 border-blue-100",
              },
              {
                title: "Processor Grids",
                desc: "Current processor grid prices by category and state. See what your finished cattle are worth at the gate.",
                url: "/on-farm/grids",
                icon: <Layers className="h-5 w-5 text-purple-600" />,
                color: "bg-purple-50 border-purple-100",
              },
              {
                title: "Bid Calculator",
                desc: "Work out the maximum you should pay for a pen of cattle to hit your target margin, based on grid and costs.",
                url: "/on-farm/bid-calculator",
                icon: <DollarSign className="h-5 w-5 text-green-600" />,
                color: "bg-green-50 border-green-100",
              },
              {
                title: "Livestock Finance",
                desc: "Model finance scenarios for cattle purchases — interest, term, repayments and breakeven grid price.",
                url: "/on-farm/finance",
                icon: <Wallet className="h-5 w-5 text-amber-600" />,
                color: "bg-amber-50 border-amber-100",
              },
            ].map(tool => (
              <button
                key={tool.url}
                onClick={() => navigate(tool.url)}
                className={`text-left rounded-xl border px-4 py-4 ${tool.color} hover:shadow-sm transition-shadow group`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {tool.icon}
                  <span className="font-semibold text-sm text-foreground">{tool.title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{tool.desc}</p>
                <p className="text-xs font-medium text-primary mt-2 group-hover:underline">Open →</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AddPropertyDialog
        open={showPropertyDialog}
        onClose={() => setShowPropertyDialog(false)}
        onSaved={() => { setShowPropertyDialog(false); refetchProps(); }}
        toast={toast}
      />
      <AddPenDialog
        open={showPenDialog}
        onClose={() => setShowPenDialog(false)}
        properties={properties}
        mobs={mobs.filter(m => m.status === "active")}
        onSaved={() => { setShowPenDialog(false); refetchPens(); }}
        toast={toast}
      />
    </DashboardLayout>
  );
}

// ─── Pen status quick-update ──────────────────────────────────────────────────

async function updatePenStatus(pen: FeedlotPen, refetch: () => void, toast: any) {
  const order: PenStatus[] = ["empty","filling","active","ready","resting"];
  const current = order.indexOf(pen.pen_status as PenStatus);
  const next = order[(current + 1) % order.length];
  await supabase.from("feedlot_pens").update({ pen_status: next }).eq("id", pen.id);
  toast({ title: `Pen ${pen.pen_number} → ${PEN_STATUS_LABELS[next]}` });
  refetch();
}

// ─── Small components ─────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className={`h-8 w-8 rounded-full ${color} flex items-center justify-center shrink-0`}>{icon}</div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold leading-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PenChip({ pen }: { pen: FeedlotPen }) {
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs ${PEN_STATUS_COLORS[pen.pen_status as PenStatus]}`}>
      <p className="font-semibold">Pen {pen.pen_number}</p>
      <p>{PEN_STATUS_LABELS[pen.pen_status as PenStatus]}</p>
      {pen.capacity && <p>{pen.capacity} cap</p>}
    </div>
  );
}

function EmptyState({ icon, message, action }: { icon: React.ReactNode; message: string; action?: { label: string; onClick: () => void } }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <div className="flex justify-center mb-3">{icon}</div>
        <p className="text-muted-foreground text-sm">{message}</p>
        {action && (
          <Button variant="outline" size="sm" className="mt-3" onClick={action.onClick}>{action.label}</Button>
        )}
      </CardContent>
    </Card>
  );
}

function PipelineRow({ week }: { week: any }) {
  const [expanded, setExpanded] = useState(false);
  const hasHead = week.headReady > 0;
  return (
    <>
      <tr
        className={`${hasHead ? "cursor-pointer hover:bg-muted/20" : "opacity-50"}`}
        onClick={() => hasHead && setExpanded(e => !e)}
      >
        <td className="px-4 py-2.5 font-medium">{week.weekLabel}</td>
        <td className="px-4 py-2.5 text-right">
          {hasHead ? <span className="font-bold text-green-700">{week.headReady}</span> : <span className="text-muted-foreground">—</span>}
        </td>
        <td className="px-4 py-2.5 text-right text-muted-foreground">{week.cumulativeHead}</td>
        <td className="px-4 py-2.5 text-muted-foreground text-xs">
          {hasHead ? `${week.mobsReady.length} mob${week.mobsReady.length > 1 ? "s" : ""}` : ""}
        </td>
      </tr>
      {expanded && week.mobsReady.map((mob: any, i: number) => (
        <tr key={i} className="bg-muted/10 text-xs">
          <td className="px-8 py-2 text-muted-foreground" colSpan={1}>{mob.mobName}</td>
          <td className="px-4 py-2 text-right">{mob.headCount}</td>
          <td className="px-4 py-2 text-right text-muted-foreground">{mob.projectedWeight}kg</td>
          <td className="px-4 py-2 text-muted-foreground">{mob.property} · {mob.adg.toFixed(3)}kg/d ADG</td>
        </tr>
      ))}
    </>
  );
}

// ─── Add Property Dialog ──────────────────────────────────────────────────────

function AddPropertyDialog({ open, onClose, onSaved, toast }: any) {
  const [form, setForm] = useState({
    name: "", property_type: "" as PropertyType | "",
    location: "", state: "", capacity_head: "",
    nfas_accredited: false, nfas_number: "",
    contact_name: "", contact_phone: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    if (!form.name || !form.property_type) return;
    setSaving(true);
    const { error } = await supabase.from("properties").insert({
      name: form.name, property_type: form.property_type,
      location: form.location || null, state: form.state || null,
      capacity_head: form.capacity_head ? parseInt(form.capacity_head) : null,
      nfas_accredited: form.nfas_accredited, nfas_number: form.nfas_number || null,
      contact_name: form.contact_name || null, contact_phone: form.contact_phone || null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${form.name} added` });
    setForm({ name: "", property_type: "", location: "", state: "", capacity_head: "", nfas_accredited: false, nfas_number: "", contact_name: "", contact_phone: "", notes: "" });
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Property / Location</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Property Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Killarook Feedlot, Dunolly Station" value={form.name} onChange={e => set("name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type <span className="text-destructive">*</span></Label>
              <Select value={form.property_type} onValueChange={v => set("property_type", v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PROPERTY_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">State</Label>
              <Select value={form.state} onValueChange={v => set("state", v)}>
                <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                <SelectContent>
                  {STATE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Location / Town</Label>
              <Input placeholder="e.g. Dunolly, Seymour corridor" value={form.location} onChange={e => set("location", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max Capacity (head)</Label>
              <Input type="number" placeholder="e.g. 5000" value={form.capacity_head} onChange={e => set("capacity_head", e.target.value)} />
            </div>
            <div className="space-y-1 flex flex-col justify-end">
              <div className="flex items-center gap-2 pb-2">
                <Checkbox id="nfas" checked={form.nfas_accredited} onCheckedChange={v => set("nfas_accredited", !!v)} />
                <Label htmlFor="nfas" className="text-sm font-normal cursor-pointer">NFAS Accredited</Label>
              </div>
            </div>
            {form.nfas_accredited && (
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">NFAS Accreditation Number</Label>
                <Input placeholder="e.g. NFAS-VIC-0001" value={form.nfas_number} onChange={e => set("nfas_number", e.target.value)} />
              </div>
            )}
            <Separator className="col-span-2" />
            <div className="space-y-1">
              <Label className="text-xs">Site Contact</Label>
              <Input placeholder="Name" value={form.contact_name} onChange={e => set("contact_name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contact Phone</Label>
              <Input placeholder="0400 000 000" value={form.contact_phone} onChange={e => set("contact_phone", e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={save} disabled={saving || !form.name || !form.property_type} className="flex-1">
              {saving ? "Saving…" : "Add Property"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Pen Dialog ───────────────────────────────────────────────────────────

function AddPenDialog({ open, onClose, properties, mobs, onSaved, toast }: any) {
  const [form, setForm] = useState({
    property_id: "", pen_number: "", capacity: "",
    program: "" as PenProgram | "", current_mob_id: "",
    target_days_on_feed: "", target_weight_kg: "",
    date_entered: new Date().toISOString().split("T")[0],
    pen_status: "empty" as PenStatus,
    current_ration: "", ration_cost_per_tonne: "",
    daily_intake_kg_head: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // Auto-fill DOF when program selected
  const handleProgramChange = (v: string) => {
    const dof = PEN_PROGRAM_DOF[v as PenProgram];
    setForm(f => ({ ...f, program: v as PenProgram, target_days_on_feed: String(dof) }));
  };

  async function save() {
    if (!form.property_id || !form.pen_number) return;
    setSaving(true);
    const { error } = await supabase.from("feedlot_pens").insert({
      property_id: form.property_id,
      pen_number: form.pen_number,
      capacity: form.capacity ? parseInt(form.capacity) : null,
      program: form.program || null,
      current_mob_id: form.current_mob_id || null,
      target_days_on_feed: form.target_days_on_feed ? parseInt(form.target_days_on_feed) : null,
      target_weight_kg: form.target_weight_kg ? parseFloat(form.target_weight_kg) : null,
      date_entered: form.date_entered || null,
      pen_status: form.pen_status,
      current_ration: form.current_ration || null,
      ration_cost_per_tonne: form.ration_cost_per_tonne ? parseFloat(form.ration_cost_per_tonne) : null,
      daily_intake_kg_head: form.daily_intake_kg_head ? parseFloat(form.daily_intake_kg_head) : null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Pen ${form.pen_number} added` });
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add Feedlot Pen</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Property <span className="text-destructive">*</span></Label>
              <Select value={form.property_id} onValueChange={v => set("property_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select property…" /></SelectTrigger>
                <SelectContent>
                  {properties.map((p: Property) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pen Number <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. 14A, Pen 3" value={form.pen_number} onChange={e => set("pen_number", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Capacity (head)</Label>
              <Input type="number" placeholder="e.g. 200" value={form.capacity} onChange={e => set("capacity", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Program</Label>
              <Select value={form.program} onValueChange={handleProgramChange}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PEN_PROGRAM_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Target DOF (days)</Label>
              <Input type="number" placeholder="e.g. 90" value={form.target_days_on_feed} onChange={e => set("target_days_on_feed", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Target weight (kg/head)</Label>
              <Input type="number" step="0.1" placeholder="e.g. 400" value={form.target_weight_kg} onChange={e => set("target_weight_kg", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date entered</Label>
              <Input type="date" value={form.date_entered} onChange={e => set("date_entered", e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Assign Mob (optional)</Label>
              <Select value={form.current_mob_id} onValueChange={v => set("current_mob_id", v)}>
                <SelectTrigger><SelectValue placeholder="Link to mob…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {mobs.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.mob_name} ({m.head_count} head)</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Separator className="col-span-2" />
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Current ration</Label>
              <Input placeholder="e.g. Finisher HE, Barley/Sorghum 70:30" value={form.current_ration} onChange={e => set("current_ration", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ration cost ($/tonne)</Label>
              <Input type="number" step="0.01" placeholder="e.g. 475" value={form.ration_cost_per_tonne} onChange={e => set("ration_cost_per_tonne", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Daily intake (kg DM/head)</Label>
              <Input type="number" step="0.1" placeholder="e.g. 15" value={form.daily_intake_kg_head} onChange={e => set("daily_intake_kg_head", e.target.value)} />
            </div>
          </div>
          {form.ration_cost_per_tonne && form.daily_intake_kg_head && (
            <div className="bg-muted/40 rounded px-3 py-2 text-xs text-muted-foreground">
              Feed cost: <strong>${((parseFloat(form.ration_cost_per_tonne) / 1000) * parseFloat(form.daily_intake_kg_head)).toFixed(2)}/head/day</strong>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={save} disabled={saving || !form.property_id || !form.pen_number} className="flex-1">
              {saving ? "Saving…" : "Add Pen"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
