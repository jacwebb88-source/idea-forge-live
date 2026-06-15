import { useState, useEffect } from "react";
import { LivestockLayout } from "@/components/LivestockLayout";
import { supabase } from "@/integrations/supabase/client";
import { useMobs } from "@/components/on-farm/useMobs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, Truck, Scale, TrendingUp, Info, ChevronRight } from "lucide-react";

interface Grid {
  id: string;
  processor_name: string;
  species: string;
  price_cpkg_cw: number;
  hgp_free_premium_cpkg: number;
  msa_premium_cpkg: number;
  weight_min_kg: number;
  weight_max_kg: number;
  plant_location: string | null;
  state: string | null;
}

interface ProcessorResult {
  processor_name: string;
  base_price: number;
  effective_price: number;
  dressing_pct: number;
  carcaseKg: number;
  grossRevenue: number;
  freightCost: number;
  mlaLevy: number;
  netReturn: number;
  netPerHead: number;
  inSpec: boolean;
  outOfSpecReason: string | null;
  hgpPrem: number;
  msaPrem: number;
  rank: number;
  bestBy: number; // $ advantage over #2
}

const MLA_LEVY_CATTLE = 5;
const MLA_LEVY_SHEEP = 0.70;

export default function ProcessorComparison() {
  const { mobs } = useMobs();
  const [grids, setGrids] = useState<Grid[]>([]);
  const [results, setResults] = useState<ProcessorResult[]>([]);

  // Inputs — can pre-fill from mob
  const [selectedMobId, setSelectedMobId] = useState("");
  const [species, setSpecies] = useState<"cattle" | "sheep">("cattle");
  const [liveWeightKg, setLiveWeightKg] = useState("420");
  const [dressingPct, setDressingPct] = useState("54");
  const [hgpFree, setHgpFree] = useState(true);
  const [msaEligible, setMsaEligible] = useState(true);
  const [freightPerHead, setFreightPerHead] = useState("40");
  const [headCount, setHeadCount] = useState("100");

  useEffect(() => {
    supabase.from("processor_grids" as any).select("*").then(({ data }: any) => {
      setGrids(data ?? []);
    });
  }, []);

  // Pre-fill from mob
  function pickMob(mobId: string) {
    setSelectedMobId(mobId);
    const mob = mobs.find(m => m.id === mobId);
    if (!mob) return;
    setSpecies(mob.species === "sheep" ? "sheep" : "cattle");
    setHgpFree(mob.hgp_free ?? true);
    setMsaEligible(mob.msa_eligible ?? false);
    setHeadCount(String(mob.head_count));
    // Use latest weight from mob if available
    const wt = mob.purchase_weight_avg_kg;
    if (wt) setLiveWeightKg(String(wt));
    setDressingPct(mob.dressing_pct ? String(mob.dressing_pct) : species === "sheep" ? "46" : "54");
  }

  // Compute results whenever inputs change
  useEffect(() => {
    const lwt = parseFloat(liveWeightKg) || 0;
    const dress = parseFloat(dressingPct) || 54;
    const freight = parseFloat(freightPerHead) || 40;
    const heads = parseInt(headCount) || 1;
    const mlaLevy = species === "cattle" ? MLA_LEVY_CATTLE : MLA_LEVY_SHEEP;

    if (!lwt || !grids.length) return;

    const carcaseKg = lwt * (dress / 100);

    // Group grids by processor name, take best matching grid per processor
    const byProcessor = new Map<string, Grid>();
    grids
      .filter(g => g.species === species)
      .forEach(g => {
        const existing = byProcessor.get(g.processor_name);
        // Pick the grid that best fits the weight
        const fits = lwt >= (g.weight_min_kg || 0) && lwt <= (g.weight_max_kg || 9999);
        const existingFits = existing ? lwt >= (existing.weight_min_kg || 0) && lwt <= (existing.weight_max_kg || 9999) : false;
        if (!existing || (fits && !existingFits) || (fits && g.price_cpkg_cw > existing.price_cpkg_cw)) {
          byProcessor.set(g.processor_name, g);
        }
      });

    const computed: ProcessorResult[] = Array.from(byProcessor.values()).map(g => {
      const inSpec = lwt >= (g.weight_min_kg || 0) && lwt <= (g.weight_max_kg || 9999);
      const outOfSpecReason = !inSpec
        ? lwt < (g.weight_min_kg || 0)
          ? `Under spec — min ${g.weight_min_kg}kg`
          : `Over spec — max ${g.weight_max_kg}kg`
        : null;

      const hgpPrem = hgpFree ? (g.hgp_free_premium_cpkg || 0) : 0;
      const msaPrem = msaEligible ? (g.msa_premium_cpkg || 0) : 0;
      const effectivePrice = g.price_cpkg_cw + hgpPrem + msaPrem;
      const grossRevenue = (effectivePrice / 100) * carcaseKg;
      const netReturn = grossRevenue - freight - mlaLevy;
      const netPerHead = netReturn;

      return {
        processor_name: g.processor_name,
        base_price: g.price_cpkg_cw,
        effective_price: effectivePrice,
        dressing_pct: dress,
        carcaseKg,
        grossRevenue,
        freightCost: freight,
        mlaLevy,
        netReturn,
        netPerHead,
        inSpec,
        outOfSpecReason,
        hgpPrem,
        msaPrem,
        rank: 0,
        bestBy: 0,
      };
    });

    // Sort by net return descending, rank
    computed.sort((a, b) => b.netPerHead - a.netPerHead);
    computed.forEach((r, i) => {
      r.rank = i + 1;
      r.bestBy = i === 0 && computed[1] ? r.netPerHead - computed[1].netPerHead : 0;
    });

    setResults(computed);
  }, [liveWeightKg, dressingPct, hgpFree, msaEligible, freightPerHead, headCount, species, grids]);

  const best = results[0];
  const totalMobAdvantage = best && results[1] ? (best.netPerHead - results[1].netPerHead) * parseInt(headCount || "1") : 0;

  return (
    <LivestockLayout>
      <div className="space-y-6 max-w-3xl mx-auto">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Trophy className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-extrabold">Processor Comparison</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Compare net return per head across processors — accounting for grid price, yield, premiums and freight.
          </p>
        </div>

        {/* Inputs */}
        <div className="rounded-2xl border bg-white p-5 space-y-4">
          <p className="font-bold text-sm">Your mob details</p>

          {mobs.filter(m => m.status === "active").length > 0 && (
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Pre-fill from a mob (optional)</Label>
              <Select value={selectedMobId} onValueChange={pickMob}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select mob to pre-fill…" /></SelectTrigger>
                <SelectContent>
                  {mobs.filter(m => m.status === "active").map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.mob_name} — {m.head_count} head</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Species</Label>
              <Select value={species} onValueChange={(v: "cattle" | "sheep") => setSpecies(v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cattle">Cattle</SelectItem>
                  <SelectItem value="sheep">Sheep</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">Live weight (kg)</Label>
              <Input value={liveWeightKg} onChange={e => setLiveWeightKg(e.target.value)} type="number" className="rounded-xl" />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">Dressing % </Label>
              <Input value={dressingPct} onChange={e => setDressingPct(e.target.value)} type="number" className="rounded-xl" />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">Head count</Label>
              <Input value={headCount} onChange={e => setHeadCount(e.target.value)} type="number" className="rounded-xl" />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">Freight per head ($)</Label>
              <Input value={freightPerHead} onChange={e => setFreightPerHead(e.target.value)} type="number" className="rounded-xl" />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={hgpFree} onChange={e => setHgpFree(e.target.checked)} className="h-4 w-4 rounded" />
              HGP free
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={msaEligible} onChange={e => setMsaEligible(e.target.checked)} className="h-4 w-4 rounded" />
              MSA eligible
            </label>
          </div>
        </div>

        {/* Best option callout */}
        {best && (
          <div className="rounded-2xl border-2 border-green-300 bg-green-50 px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-4 w-4 text-green-700" />
              <p className="font-bold text-sm text-green-900">Best option — {best.processor_name}</p>
            </div>
            <p className="text-2xl font-black text-green-900">${best.netPerHead.toFixed(2)}<span className="text-base font-semibold text-green-700"> net/head</span></p>
            <p className="text-xs text-green-700 mt-1">
              {best.effective_price}¢/kg CW · {best.carcaseKg.toFixed(0)}kg CW · ${best.grossRevenue.toFixed(0)} gross − ${best.freightCost} freight − ${best.mlaLevy} MLA
            </p>
            {best.bestBy > 0 && (
              <p className="text-xs font-semibold text-green-800 mt-2">
                +${best.bestBy.toFixed(2)}/head better than next best · <strong>${(totalMobAdvantage).toFixed(0)} total advantage</strong> on {headCount} head
              </p>
            )}
          </div>
        )}

        {/* Results table */}
        <div className="rounded-2xl border bg-white overflow-hidden">
          <div className="px-5 py-4 border-b">
            <p className="font-bold text-sm">All processors ranked by net return</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {parseFloat(liveWeightKg).toFixed(0)}kg LW · {dressingPct}% dress = {(parseFloat(liveWeightKg) * parseFloat(dressingPct) / 100).toFixed(0)}kg CW · ${freightPerHead}/head freight included
            </p>
          </div>
          <div className="divide-y">
            {results.map((r, i) => (
              <div key={r.processor_name} className={`px-5 py-4 ${i === 0 ? "bg-green-50" : r.outOfSpecReason ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${i === 0 ? "bg-green-600 text-white" : "bg-muted text-muted-foreground"}`}>
                      {r.rank}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{r.processor_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.base_price}¢/kg
                        {r.hgpPrem > 0 && <span className="text-green-600"> +{r.hgpPrem}¢ HGP</span>}
                        {r.msaPrem > 0 && <span className="text-blue-600"> +{r.msaPrem}¢ MSA</span>}
                        {" "}= {r.effective_price}¢/kg effective
                      </p>
                      {r.outOfSpecReason && (
                        <p className="text-xs text-amber-600 font-medium mt-0.5">{r.outOfSpecReason}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-black ${i === 0 ? "text-green-700" : ""}`}>${r.netPerHead.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">net/head</p>
                  </div>
                </div>

                {/* Detail row */}
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Scale className="h-3 w-3" />
                    {r.carcaseKg.toFixed(0)}kg CW
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    ${r.grossRevenue.toFixed(0)} gross
                  </div>
                  <div className="flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    −${r.freightCost} freight
                  </div>
                </div>

                {i === 0 && parseInt(headCount) > 1 && (
                  <div className="mt-2 text-xs font-semibold text-green-700">
                    Total mob: ${(r.netPerHead * parseInt(headCount)).toLocaleString(undefined, { maximumFractionDigits: 0 })} net on {headCount} head
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-dashed px-4 py-3 text-xs text-muted-foreground flex items-start gap-2">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p>Grid prices sourced from processor_grids table. Freight entered manually above. MLA levy ${MLA_LEVY_CATTLE}/head cattle, ${MLA_LEVY_SHEEP}/head sheep. Contact processor directly for confirmed grid pricing before booking.</p>
        </div>

      </div>
    </LivestockLayout>
  );
}
