import { useState, useEffect } from "react";
import { LivestockLayout } from "@/components/LivestockLayout";
import { supabase } from "@/integrations/supabase/client";
import { useMobs, useMarketBenchmarks } from "@/components/on-farm/useMobs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { differenceInDays, format } from "date-fns";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Sparkles, RefreshCw, ArrowRight, Scale, DollarSign,
} from "lucide-react";

const DRESSING: Record<string, number> = {
  lot_fed: 0.58, backgrounder: 0.56, boner_cow: 0.52, trade: 0.56,
  weaner: 0.54, breeder: 0.52, bull: 0.56, cull_cow: 0.50,
  trade_lamb: 0.48, heavy_lamb: 0.50, merino_lamb: 0.46,
  ewe: 0.44, wether: 0.46, hogget: 0.46,
};

const MARKET_KEY: Record<string, string> = {
  lot_fed: "heavy_steer", backgrounder: "feeder_steer", trade: "feeder_steer",
  weaner: "feeder_steer", boner_cow: "heavy_cow", cull_cow: "heavy_cow",
  breeder: "heavy_cow", bull: "heavy_bull",
  trade_lamb: "estli", heavy_lamb: "heavy_lamb", merino_lamb: "merino_lamb",
  ewe: "mutton", wether: "estli", hogget: "estli",
};

function fmt$(n: number) { return `$${Math.abs(n).toFixed(0)}`; }

export default function LivestockBriefing() {
  const { mobs, loading } = useMobs();
  const { latest } = useMarketBenchmarks();

  const [enriched, setEnriched] = useState<any[]>([]);
  const [briefingText, setBriefingText] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const today = format(new Date(), "EEEE d MMMM yyyy");

  useEffect(() => {
    if (!mobs.length) return;
    const active = mobs.filter(m => m.status === "active");
    if (!active.length) { setEnriched([]); return; }

    async function enrich() {
      const ids = active.map(m => m.id);
      const [wRes, cRes] = await Promise.all([
        supabase.from("weight_records").select("*").in("mob_id", ids).order("weigh_date", { ascending: true }),
        supabase.from("mob_costs").select("mob_id, amount_total").in("mob_id", ids),
      ]);

      const weightsByMob: Record<string, any[]> = {};
      for (const w of (wRes.data ?? []) as any[]) {
        if (!weightsByMob[w.mob_id]) weightsByMob[w.mob_id] = [];
        weightsByMob[w.mob_id].push(w);
      }
      const costsByMob: Record<string, number> = {};
      for (const c of (cRes.data ?? []) as any[]) {
        costsByMob[c.mob_id] = (costsByMob[c.mob_id] ?? 0) + c.amount_total;
      }

      const rows = active.map(mob => {
        const weights = weightsByMob[mob.id] ?? [];
        const latestWt = weights.length ? weights[weights.length - 1] : null;
        const firstWt = weights.length ? weights[0] : null;
        const currentWt = latestWt?.avg_weight_kg ?? mob.arrival_weight_avg_kg ?? mob.purchase_weight_avg_kg ?? 0;
        const totalCostPerHead = mob.head_count > 0 ? (costsByMob[mob.id] ?? 0) / mob.head_count : 0;
        const dof = differenceInDays(new Date(), new Date(mob.purchase_date));

        let adg: number | null = null;
        if (latestWt && firstWt && latestWt.id !== firstWt.id) {
          const days = Math.max(1, (new Date(latestWt.weigh_date).getTime() - new Date(mob.purchase_date).getTime()) / 86400000);
          adg = (latestWt.avg_weight_kg - (mob.arrival_weight_avg_kg ?? firstWt.avg_weight_kg)) / days;
        }

        const marketKey = MARKET_KEY[mob.category];
        const marketCpkg = marketKey ? (latest(marketKey)?.cents_per_kg ?? null) : null;
        const marketValuePerHead = marketCpkg && currentWt ? (currentWt * marketCpkg) / 100 : null;
        const marginPerHead = marketValuePerHead && totalCostPerHead > 0 ? marketValuePerHead - totalCostPerHead : null;

        const daysToExit = mob.target_exit_date ? differenceInDays(new Date(mob.target_exit_date), new Date()) : null;
        const wtToTarget = mob.target_weight_kg && currentWt ? mob.target_weight_kg - currentWt : null;
        const daysToTargetWt = wtToTarget && adg && adg > 0 ? Math.ceil(wtToTarget / adg) : null;

        return { mob, currentWt, totalCostPerHead, adg, marketCpkg, marginPerHead, dof, daysToExit, daysToTargetWt, weights };
      });

      setEnriched(rows.sort((a, b) => (b.marginPerHead ?? -9999) - (a.marginPerHead ?? -9999)));
    }

    enrich();
  }, [mobs, latest]);

  // Derived summary
  const active = enriched;
  const totalHead = active.reduce((s, e) => s + e.mob.head_count, 0);
  const inTheMoney = active.filter(e => (e.marginPerHead ?? 0) > 0);
  const underwater = active.filter(e => e.marginPerHead != null && e.marginPerHead < 0);
  const readyToSell = active.filter(e => e.daysToExit != null && e.daysToExit <= 7);
  const overdue = active.filter(e => e.daysToExit != null && e.daysToExit < 0);
  const noWeights = active.filter(e => e.weights.length === 0);

  async function generateBriefing() {
    setBriefingLoading(true);
    setBriefingText(null);
    try {
      const payload = {
        date: today,
        summary: {
          total_mobs: active.length,
          total_head: totalHead,
          in_the_money: inTheMoney.length,
          underwater: underwater.length,
          ready_to_sell: readyToSell.length,
          overdue: overdue.length,
        },
        mobs: active.map(e => ({
          name: e.mob.mob_name,
          category: e.mob.category,
          head_count: e.mob.head_count,
          days_on_feed: e.dof,
          current_weight_kg: e.currentWt,
          target_weight_kg: e.mob.target_weight_kg,
          adg: e.adg,
          cost_per_head: e.totalCostPerHead,
          market_price_cpkg: e.marketCpkg,
          margin_per_head: e.marginPerHead,
          days_to_exit: e.daysToExit,
          days_to_target_weight: e.daysToTargetWt,
          hgp_free: e.mob.hgp_free,
          msa_eligible: e.mob.msa_eligible,
          program_type: e.mob.program_type,
        })),
        market: {
          eyci: latest("eyci")?.cents_per_kg,
          feeder_steer: latest("feeder_steer")?.cents_per_kg,
          heavy_steer: latest("heavy_steer")?.cents_per_kg,
          heavy_cow: latest("heavy_cow")?.cents_per_kg,
          estli: latest("estli")?.cents_per_kg,
        },
      };

      const { data, error } = await supabase.functions.invoke("livestock-recommendation", {
        body: {
          ...payload,
          mob: payload.mobs[0],
          costs: { total_cost_per_head: payload.mobs[0]?.cost_per_head },
          market: payload.market,
          mode: "morning_briefing",
          briefing_context: payload,
        },
      });

      if (error) throw error;
      setBriefingText(data?.recommendation ?? null);
    } catch (e: any) {
      setBriefingText("Unable to generate briefing — " + (e?.message ?? "unknown error"));
    }
    setBriefingLoading(false);
  }

  return (
    <LivestockLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Morning Briefing</p>
            <h1 className="text-3xl font-extrabold tracking-tight">{today}</h1>
            <p className="text-muted-foreground mt-1">{active.length} active mobs · {totalHead.toLocaleString()} head</p>
          </div>
          <Button
            onClick={generateBriefing}
            disabled={briefingLoading || active.length === 0}
            className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"
          >
            {briefingLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {briefingText ? "Regenerate" : "Generate AI Briefing"}
          </Button>
        </div>

        {/* AI Briefing */}
        {(briefingText || briefingLoading) && (
          <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-sm text-violet-900">AI Morning Briefing</p>
                <p className="text-xs text-violet-600">Powered by Claude · your operation, today</p>
              </div>
            </div>
            {briefingLoading ? (
              <div className="flex items-center gap-2 text-violet-700 text-sm">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Analysing your mobs and market conditions…
              </div>
            ) : (
              <p className="text-sm text-violet-900 leading-relaxed whitespace-pre-wrap">{briefingText}</p>
            )}
          </div>
        )}

        {/* Alert flags */}
        {(overdue.length > 0 || underwater.length > 0 || readyToSell.length > 0 || noWeights.length > 0) && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Action needed</p>
            {overdue.map(e => (
              <div key={e.mob.id} className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-800">{e.mob.mob_name} — exit date overdue</p>
                  <p className="text-xs text-red-600">{e.mob.head_count} head · {Math.abs(e.daysToExit!)} days past target exit date</p>
                </div>
              </div>
            ))}
            {underwater.map(e => (
              <div key={e.mob.id} className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <TrendingDown className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-800">{e.mob.mob_name} — underwater</p>
                  <p className="text-xs text-amber-600">
                    {e.mob.head_count} head · {fmt$(e.marginPerHead!)} loss/head at current market ·
                    Total exposure {fmt$(e.marginPerHead! * e.mob.head_count)}
                  </p>
                </div>
              </div>
            ))}
            {readyToSell.filter(e => e.daysToExit! >= 0).map(e => (
              <div key={e.mob.id} className="flex items-start gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-800">{e.mob.mob_name} — ready to sell</p>
                  <p className="text-xs text-green-600">
                    {e.mob.head_count} head · {e.daysToExit} days to target ·
                    {e.marginPerHead != null ? ` ${e.marginPerHead >= 0 ? "+" : ""}${fmt$(e.marginPerHead)}/head margin` : ""}
                  </p>
                </div>
              </div>
            ))}
            {noWeights.map(e => (
              <div key={e.mob.id} className="flex items-start gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                <Scale className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-slate-700">{e.mob.mob_name} — no weight records</p>
                  <p className="text-xs text-slate-500">{e.mob.head_count} head · log a weight to track ADG and margin</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Market snapshot */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Market today</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "EYCI", key: "eyci" },
              { label: "Feeder Steer", key: "feeder_steer" },
              { label: "Heavy Steer", key: "heavy_steer" },
              { label: "Heavy Cow", key: "heavy_cow" },
              { label: "ESTLI Lamb", key: "estli" },
            ].map(({ label, key }) => {
              const b = latest(key);
              return (
                <div key={key} className="rounded-xl border bg-white px-4 py-3 text-center">
                  <p className="text-xs text-muted-foreground font-medium">{label}</p>
                  <p className="text-xl font-black leading-tight mt-0.5">
                    {b ? `${b.cents_per_kg}¢` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">c/kg lwt</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mob by mob */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">All active mobs</p>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : active.length === 0 ? (
            <p className="text-muted-foreground text-sm">No active mobs.</p>
          ) : (
            <div className="space-y-2">
              {active.map(e => {
                const inMoney = (e.marginPerHead ?? 0) > 0;
                return (
                  <div key={e.mob.id} className="rounded-xl border bg-white px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-base">{e.mob.mob_name}</p>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            {e.mob.head_count} head · {e.dof}d on feed
                          </span>
                          {e.daysToExit != null && e.daysToExit <= 7 && (
                            <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                              {e.daysToExit <= 0 ? "OVERDUE" : `${e.daysToExit}d to exit`}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                          {e.currentWt > 0 && <span>{e.currentWt.toFixed(0)}kg avg</span>}
                          {e.adg != null && <span>ADG {e.adg.toFixed(2)}kg/d</span>}
                          {e.mob.target_weight_kg && <span>target {e.mob.target_weight_kg}kg</span>}
                          {e.daysToTargetWt != null && <span>~{e.daysToTargetWt}d to weight</span>}
                          <span>cost ${e.totalCostPerHead.toFixed(0)}/hd</span>
                        </div>
                      </div>
                      {e.marginPerHead != null && (
                        <div className={`text-right shrink-0 rounded-xl px-3 py-2 ${
                          inMoney ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                        }`}>
                          <div className="flex items-center gap-1 justify-end">
                            {inMoney
                              ? <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                              : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                            <p className={`text-lg font-black leading-tight ${inMoney ? "text-green-600" : "text-red-600"}`}>
                              {inMoney ? "+" : "-"}{fmt$(e.marginPerHead)}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">/head</p>
                          <p className={`text-xs font-semibold ${inMoney ? "text-green-700" : "text-red-600"}`}>
                            {inMoney ? "In the money" : "Underwater"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </LivestockLayout>
  );
}
