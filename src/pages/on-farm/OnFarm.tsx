import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMobs, useMarketBenchmarks } from "@/components/on-farm/useMobs";
import { supabase } from "@/integrations/supabase/client";
import { MobCard } from "@/components/on-farm/MobCard";
import { categoryToken } from "@/components/on-farm/farmTokens";
import { CATEGORY_LABELS } from "@/components/on-farm/types";
import type { Mob, WeightRecord, MobCost } from "@/components/on-farm/types";
import {
  Plus, Search, SlidersHorizontal, TrendingUp,
  DollarSign, Scale, AlertTriangle, Beef, Building2,
  ChevronRight, ArrowUpRight, LineChart, Calculator,
  Grid3X3, Banknote, Wind, Presentation,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

// ─── Types for enriched mob data ──────────────────────────────────────────────

interface MobEnriched {
  mob: Mob;
  latestWeightKg: number | null;
  adg: number | null;
  totalCostPerHead: number;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function OnFarm() {
  const navigate = useNavigate();
  const { mobs, loading } = useMobs();
  const { latest, benchmarks } = useMarketBenchmarks();
  const [enriched, setEnriched] = useState<MobEnriched[]>([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");

  // Enrich mobs with weight + cost data
  useEffect(() => {
    if (!mobs.length) { setEnriched([]); return; }

    async function enrich() {
      const ids = mobs.map(m => m.id);
      const [wRes, cRes] = await Promise.all([
        supabase.from("weight_records").select("*").in("mob_id", ids).order("weigh_date", { ascending: true }),
        supabase.from("mob_costs").select("mob_id, amount_total").in("mob_id", ids),
      ]);

      const weightsByMob: Record<string, WeightRecord[]> = {};
      for (const w of (wRes.data as WeightRecord[]) ?? []) {
        if (!weightsByMob[w.mob_id]) weightsByMob[w.mob_id] = [];
        weightsByMob[w.mob_id].push(w);
      }
      const costsByMob: Record<string, number> = {};
      for (const c of (cRes.data as any[]) ?? []) {
        costsByMob[c.mob_id] = (costsByMob[c.mob_id] ?? 0) + c.amount_total;
      }

      setEnriched(mobs.map(mob => {
        const weights = weightsByMob[mob.id] ?? [];
        const latest = weights.length ? weights[weights.length - 1] : null;
        const first = weights.length ? weights[0] : null;
        const arrival = mob.arrival_weight_avg_kg ?? mob.purchase_weight_avg_kg ?? 0;

        let adg: number | null = null;
        if (latest && first && latest.id !== first.id) {
          const days = Math.max(1,
            (new Date(latest.weigh_date).getTime() - new Date(mob.purchase_date).getTime()) / 86400000
          );
          adg = (latest.avg_weight_kg - arrival) / days;
        }

        const totalCost = costsByMob[mob.id] ?? 0;
        return {
          mob,
          latestWeightKg: latest?.avg_weight_kg ?? null,
          adg,
          totalCostPerHead: mob.head_count > 0 ? totalCost / mob.head_count : 0,
        };
      }));
    }

    enrich();
  }, [mobs]);

  // Filter
  const visible = enriched.filter(e => {
    if (filterStatus !== "all" && e.mob.status !== filterStatus) return false;
    if (filterCat !== "all" && e.mob.category !== filterCat) return false;
    if (search && !e.mob.mob_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Aggregate KPIs (active only)
  const active = enriched.filter(e => e.mob.status === "active");
  const totalHead = active.reduce((s, e) => s + e.mob.head_count, 0);
  const totalCapital = active.reduce((s, e) => s + e.totalCostPerHead * e.mob.head_count, 0);
  const exiting = active.filter(e =>
    e.mob.target_exit_date && differenceInDays(new Date(e.mob.target_exit_date), new Date()) <= 14
  );
  const avgAdg = (() => {
    const withAdg = active.filter(e => e.adg != null && e.adg > 0);
    return withAdg.length ? withAdg.reduce((s, e) => s + e.adg!, 0) / withAdg.length : null;
  })();

  const feederBench = latest("feeder_steer");
  const benchDate = benchmarks.length ? format(new Date(benchmarks[0].benchmark_date), "d MMM yyyy") : null;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-10">

        {/* ── Hero header ──────────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-green-800 via-green-700 to-emerald-600 relative">
          {/* Subtle texture overlay */}
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
          />
          <div className="relative px-6 pt-6 pb-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Beef className="h-5 w-5 text-white/80" />
                  <span className="text-white/70 text-sm font-medium uppercase tracking-wider">On Farm</span>
                </div>
                <h1 className="text-white text-2xl font-bold">Livestock Tracker</h1>
                <p className="text-white/70 text-sm mt-0.5">Per-animal cost, weight, and exit decision</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => navigate("/on-farm/pitch")}
                  className="text-white/70 hover:text-white text-xs font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/20 hover:border-white/40 transition-colors"
                >
                  <Presentation className="h-3.5 w-3.5" />
                  Platform Overview
                </button>
                <Button
                  onClick={() => navigate("/on-farm/mobs/new")}
                  className="bg-white text-green-800 hover:bg-green-50 font-bold gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  New Mob
                </Button>
              </div>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-4 gap-3 mt-5">
              {[
                { label: "Active mobs", value: String(active.length), sub: null },
                { label: "Total head", value: totalHead.toLocaleString(), sub: null },
                { label: "Capital at risk", value: `$${(totalCapital / 1000).toFixed(0)}k`, sub: null },
                { label: "Exit ≤14 days", value: String(exiting.length), sub: exiting.length > 0 ? "action needed" : "clear", alert: exiting.length > 0 },
              ].map(k => (
                <div key={k.label} className="bg-white/15 backdrop-blur rounded-xl px-3 py-2.5 text-center">
                  <p className={`text-2xl font-bold ${k.alert ? "text-amber-300" : "text-white"}`}>{k.value}</p>
                  <p className="text-white/60 text-xs mt-0.5">{k.label}</p>
                  {k.sub && <p className={`text-xs font-medium mt-0.5 ${k.alert ? "text-amber-300" : "text-white/50"}`}>{k.sub}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Market strip */}
          <div className="bg-green-900/40 border-t border-white/10 px-6 py-3 flex gap-5 overflow-x-auto scrollbar-none">
            {[
              { key: "feeder_steer", label: "Feeder Steer" },
              { key: "heavy_steer",  label: "Heavy Steer" },
              { key: "heavy_cow",    label: "Heavy Cow" },
              { key: "oth_vic",      label: "OTH VIC" },
              { key: "oth_qld",      label: "OTH QLD" },
            ].map(({ key, label }) => {
              const b = latest(key);
              return (
                <div key={key} className="shrink-0 text-center">
                  <p className="text-white/50 text-xs whitespace-nowrap">{label}</p>
                  <p className="text-white font-bold text-base">{b ? `${b.cents_per_kg}¢` : "—"}</p>
                  <p className="text-white/40 text-xs">{b?.basis === "dressed_weight" ? "dw" : "lwt"}</p>
                </div>
              );
            })}
            {benchDate && (
              <div className="ml-auto shrink-0 text-right self-center">
                <p className="text-white/30 text-xs">MLA/NLRS · {benchDate}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Enterprise shortcut ───────────────────────────────────────── */}
        <button
          onClick={() => navigate("/on-farm/enterprise")}
          className="w-full flex items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 hover:bg-amber-100 transition-colors text-left"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-amber-900 text-sm">Livestock Enterprise</p>
            <p className="text-amber-700 text-xs">Multi-property portfolio · Feedlot pen management · Forward kill pipeline</p>
          </div>
          <ChevronRight className="h-5 w-5 text-amber-400 shrink-0" />
        </button>

        {/* ── Tools & Intelligence strip ───────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tools & Intelligence</p>
          <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
            {[
              { icon: LineChart, color: "text-blue-600", border: "border-l-blue-400", label: "Market Intelligence", desc: "Live benchmark prices", route: "/on-farm/market" },
              { icon: Calculator, color: "text-amber-600", border: "border-l-amber-400", label: "Bid Calculator", desc: "Max bid per head", route: "/on-farm/bid-calculator" },
              { icon: Grid3X3, color: "text-violet-600", border: "border-l-violet-400", label: "Processor Grids", desc: "Kill grid comparison", route: "/on-farm/grids" },
              { icon: Banknote, color: "text-green-600", border: "border-l-green-400", label: "Finance", desc: "Finance cost modelling", route: "/on-farm/finance" },
              { icon: Wind, color: "text-teal-600", border: "border-l-teal-400", label: "Carbon", desc: "ACCU & methane tracker", route: "/on-farm" },
            ].map(tool => (
              <button
                key={tool.label}
                onClick={() => navigate(tool.route)}
                className={`shrink-0 flex items-center gap-3 bg-white border border-l-4 ${tool.border} rounded-xl px-4 py-3 hover:shadow-sm transition-all text-left min-w-[160px]`}
              >
                <tool.icon className={`h-4 w-4 ${tool.color} shrink-0`} />
                <div>
                  <p className="text-xs font-bold text-foreground whitespace-nowrap">{tool.label}</p>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">{tool.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Exit alerts ───────────────────────────────────────────────── */}
        {exiting.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Action needed — exits due within 14 days
            </p>
            {exiting.map(e => {
              const daysLeft = differenceInDays(new Date(e.mob.target_exit_date!), new Date());
              const cat = categoryToken(e.mob.category);
              return (
                <button
                  key={e.mob.id}
                  onClick={() => navigate(`/on-farm/mobs/${e.mob.id}`)}
                  className={`w-full flex items-center gap-3 rounded-xl border ${cat.border} ${cat.bg} px-4 py-3 hover:shadow-sm transition-all text-left`}
                >
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${daysLeft <= 3 ? "bg-red-500 animate-pulse" : "bg-amber-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{e.mob.mob_name}</p>
                    <p className="text-xs text-muted-foreground">{e.mob.head_count} head · {cat.label}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${daysLeft <= 3 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                    {daysLeft <= 0 ? "Overdue" : `${daysLeft}d`}
                  </span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        )}

        {/* ── Search + filter ───────────────────────────────────────────── */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 rounded-xl"
              placeholder="Search mobs…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-36 rounded-xl">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                <SelectItem key={v} value={v}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="slaughtered">Slaughtered</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ── Mob cards grid ────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-2xl bg-muted/40 h-52 animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-muted py-16 text-center">
            <Beef className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">
              {search || filterCat !== "all" ? "No mobs match your filter." : "No active mobs. Add your first mob to get started."}
            </p>
            {!search && filterCat === "all" && (
              <Button
                onClick={() => navigate("/on-farm/mobs/new")}
                className="mt-4 gap-1.5"
              >
                <Plus className="h-4 w-4" /> Add first mob
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visible.map(e => (
              <MobCard
                key={e.mob.id}
                mob={e.mob}
                latestWeightKg={e.latestWeightKg}
                adg={e.adg}
                totalCostPerHead={e.totalCostPerHead}
                onClick={() => navigate(`/on-farm/mobs/${e.mob.id}`)}
              />
            ))}
          </div>
        )}

        {/* ── Category legend ───────────────────────────────────────────── */}
        {visible.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Mob categories</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                const t = categoryToken(key);
                const count = visible.filter(e => e.mob.category === key).length;
                if (count === 0) return null;
                return (
                  <button
                    key={key}
                    onClick={() => setFilterCat(filterCat === key ? "all" : key)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                      filterCat === key ? `${t.badge} border-transparent font-bold` : "bg-white border-muted text-muted-foreground hover:bg-muted/40"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${t.dot}`} />
                    {label}
                    <span className="opacity-60">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
