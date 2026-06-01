import { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMarketBenchmarks } from "@/components/on-farm/useMobs";
import { Calculator, RefreshCw, AlertTriangle } from "lucide-react";

const CATTLE_DEFAULTS = {
  exitWeight: 420,
  exitPath: "oth",
  processorPrice: 620,
  dressingPct: 58,
  targetMargin: 100,
  daysToFeed: 90,
  dailyCost: 3.50,
  freightIn: 45,
  agentCommIn: 2.5,
  mlaLevy: 5,
  inductionCosts: 25,
  arrivalWeight: 350,
};

const SHEEP_DEFAULTS = {
  exitWeight: 24,
  exitPath: "oth",
  processorPrice: 1100,
  dressingPct: 48,
  targetMargin: 20,
  daysToFeed: 60,
  dailyCost: 1.80,
  freightIn: 20,
  agentCommIn: 2.5,
  mlaLevy: 2,
  inductionCosts: 10,
  arrivalWeight: 36,
};

export default function BidCalculator() {
  const { latest } = useMarketBenchmarks();
  const heavySteerBench = latest("heavy_steer")?.cents_per_kg ?? 620;
  const estliBench = latest("estli")?.cents_per_kg ?? 1100;

  const [species, setSpecies] = useState<"cattle" | "sheep">("cattle");

  const [exitWeight, setExitWeight] = useState(CATTLE_DEFAULTS.exitWeight);
  const [exitPath, setExitPath] = useState(CATTLE_DEFAULTS.exitPath);
  const [processorPrice, setProcessorPrice] = useState(heavySteerBench || CATTLE_DEFAULTS.processorPrice);
  const [dressingPct, setDressingPct] = useState(CATTLE_DEFAULTS.dressingPct);
  const [targetMargin, setTargetMargin] = useState(CATTLE_DEFAULTS.targetMargin);
  const [daysToFeed, setDaysToFeed] = useState(CATTLE_DEFAULTS.daysToFeed);
  const [dailyCost, setDailyCost] = useState(CATTLE_DEFAULTS.dailyCost);
  const [freightIn, setFreightIn] = useState(CATTLE_DEFAULTS.freightIn);
  const [agentCommIn, setAgentCommIn] = useState(CATTLE_DEFAULTS.agentCommIn);
  const [inductionCosts, setInductionCosts] = useState(CATTLE_DEFAULTS.inductionCosts);
  const [arrivalWeight, setArrivalWeight] = useState(CATTLE_DEFAULTS.arrivalWeight);

  const applyDefaults = useCallback((s: "cattle" | "sheep") => {
    const D = s === "cattle" ? CATTLE_DEFAULTS : SHEEP_DEFAULTS;
    const benchPrice = s === "cattle" ? (heavySteerBench || D.processorPrice) : (estliBench || D.processorPrice);
    setExitWeight(D.exitWeight);
    setExitPath(D.exitPath);
    setProcessorPrice(benchPrice);
    setDressingPct(D.dressingPct);
    setTargetMargin(D.targetMargin);
    setDaysToFeed(D.daysToFeed);
    setDailyCost(D.dailyCost);
    setFreightIn(D.freightIn);
    setAgentCommIn(D.agentCommIn);
    setInductionCosts(D.inductionCosts);
    setArrivalWeight(D.arrivalWeight);
  }, [heavySteerBench, estliBench]);

  const switchSpecies = useCallback((s: "cattle" | "sheep") => {
    setSpecies(s);
    applyDefaults(s);
  }, [applyDefaults]);

  const reset = useCallback(() => {
    applyDefaults(species);
  }, [species, applyDefaults]);

  // ── Calculations ──────────────────────────────────────────────────────────
  const MLA = species === "sheep" ? 2 : 5;
  const feedingCost = dailyCost * daysToFeed;

  let projectedSaleValue: number;
  if (exitPath === "oth") {
    const carcaseKg = exitWeight * (dressingPct / 100);
    projectedSaleValue = (processorPrice / 100) * carcaseKg;
  } else if (exitPath === "saleyard") {
    projectedSaleValue = (processorPrice / 100) * exitWeight;
  } else {
    // live export — rough estimate using liveweight price
    projectedSaleValue = (processorPrice / 100) * exitWeight;
  }

  // placeholder purchase price for agent commission calc — we'll iterate
  // agent comm is on purchase price so we need to solve algebraically:
  // maxBid = saleValue - freightIn - agentCommIn%*maxBid - MLA - induction - feeding - targetMargin
  // maxBid(1 + agentCommIn%) = saleValue - freightIn - MLA - induction - feeding - targetMargin
  const fixedCosts = freightIn + MLA + inductionCosts + feedingCost;
  const maxBid = (projectedSaleValue - fixedCosts - targetMargin) / (1 + agentCommIn / 100);
  const agentCommDollar = maxBid * (agentCommIn / 100);
  const totalCosts = freightIn + agentCommDollar + MLA + inductionCosts + feedingCost;

  const maxCpkgLwt = arrivalWeight > 0 ? (maxBid / arrivalWeight) * 100 : 0;
  const marginCheck = projectedSaleValue - totalCosts - maxBid;
  const isNegative = maxBid < 0;

  const activeBench = species === "cattle" ? heavySteerBench : estliBench;
  const benchLabel = species === "cattle" ? "Market benchmark:" : "ESTLI benchmark:";

  const exitWeightLabel = species === "sheep"
    ? (exitPath === "oth" ? "Target Exit Weight (kg CW)" : "Target Exit Weight (kg)")
    : "Target Exit Weight (kg):";

  const resultCardClass = isNegative
    ? "bg-gradient-to-br from-red-500 to-rose-600"
    : species === "sheep"
      ? "bg-gradient-to-br from-green-500 to-emerald-600"
      : "bg-gradient-to-br from-amber-500 to-orange-600";

  function fmt$(n: number) { return `$${Math.abs(n).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }
  function fmt$dec(n: number) { return `$${n.toFixed(2)}`; }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-10">
        {/* Hero */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Purchase Bid Calculator</h1>
            <p className="text-muted-foreground mt-1">Calculate your maximum safe bid — Cattle &amp; Sheep</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Species toggle */}
            <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
              <button
                onClick={() => switchSpecies("cattle")}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${species === "cattle" ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                🐄 Cattle
              </button>
              <button
                onClick={() => switchSpecies("sheep")}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${species === "sheep" ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                🐑 Sheep &amp; Lamb
              </button>
            </div>
            <Button
              onClick={reset}
              variant="outline"
              className="gap-2 rounded-xl"
            >
              <RefreshCw className="h-4 w-4" /> Reset
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* ── Inputs ── */}
          <div className="space-y-4">
            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Exit Parameters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">
                    {exitWeightLabel} <span className="text-blue-600 font-bold">{exitWeight}{species === "sheep" && exitPath === "oth" ? "kg CW" : "kg"}</span>
                  </Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={species === "sheep" ? 14 : 300}
                      max={species === "sheep" ? 36 : 600}
                      step={species === "sheep" ? 1 : 5}
                      value={exitWeight}
                      onChange={e => setExitWeight(+e.target.value)}
                      className="flex-1 accent-blue-600"
                    />
                    <Input
                      type="number" value={exitWeight}
                      onChange={e => setExitWeight(+e.target.value)}
                      className="w-20 rounded-xl text-center font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    {species === "sheep" ? "Arrival Weight (kg LW)" : "Arrival Weight (kg)"}
                  </Label>
                  <Input
                    type="number" value={arrivalWeight}
                    onChange={e => setArrivalWeight(+e.target.value)}
                    className="rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Target Exit Path</Label>
                  <Select value={exitPath} onValueChange={setExitPath}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="saleyard">Saleyard (¢/kg liveweight)</SelectItem>
                      <SelectItem value="oth">OTH — Direct to Processor (¢/kg CW)</SelectItem>
                      {species === "cattle" && (
                        <SelectItem value="live_export">Live Export (¢/kg liveweight)</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    {exitPath === "oth" ? "Processor Grid Price (¢/kg CW)" : "Benchmark Price (¢/kg lwt)"}
                  </Label>
                  <Input
                    type="number" step="0.5" value={processorPrice}
                    onChange={e => setProcessorPrice(+e.target.value)}
                    className="rounded-xl font-bold text-lg"
                  />
                  {activeBench > 0 && (
                    <p className="text-xs text-muted-foreground">{benchLabel} {activeBench}¢/kg</p>
                  )}
                </div>

                {exitPath === "oth" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Dressing % ({dressingPct}%)</Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={species === "sheep" ? 44 : 52}
                        max={species === "sheep" ? 54 : 62}
                        step={0.5}
                        value={dressingPct}
                        onChange={e => setDressingPct(+e.target.value)}
                        className="flex-1 accent-blue-600"
                      />
                      <Input
                        type="number" step="0.5" value={dressingPct}
                        onChange={e => setDressingPct(+e.target.value)}
                        className="w-20 rounded-xl text-center font-bold"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Cost Inputs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Days to feed</Label>
                    <Input type="number" value={daysToFeed} onChange={e => setDaysToFeed(+e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Daily cost/head ($/hd/day)</Label>
                    <Input type="number" step="0.10" value={dailyCost} onChange={e => setDailyCost(+e.target.value)} className="rounded-xl" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Freight in ($/hd)</Label>
                    <Input type="number" step="5" value={freightIn} onChange={e => setFreightIn(+e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Agent commission in (%)</Label>
                    <Input type="number" step="0.5" value={agentCommIn} onChange={e => setAgentCommIn(+e.target.value)} className="rounded-xl" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Induction costs ($/hd)</Label>
                    <Input type="number" step="5" value={inductionCosts} onChange={e => setInductionCosts(+e.target.value)} className="rounded-xl" />
                    <p className="text-xs text-muted-foreground">vet, drenching, tags</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">MLA levy ($/hd)</Label>
                    <Input type="number" value={MLA} disabled className="rounded-xl bg-muted/30 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">fixed</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Target margin per head ($)</Label>
                  <Input type="number" step="10" value={targetMargin} onChange={e => setTargetMargin(+e.target.value)} className="rounded-xl font-bold text-lg" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Output ── */}
          <div className="space-y-4">
            {/* Main result */}
            <div className={`rounded-2xl p-6 ${resultCardClass}`}>
              <p className="text-white/70 text-sm font-semibold uppercase tracking-wide mb-1">Maximum bid price</p>
              <p className="text-white text-6xl font-black leading-none">
                {isNegative ? "-" : ""}{fmt$(maxBid)}
              </p>
              <p className="text-white/80 text-lg font-bold mt-1">/head</p>

              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-white/70 text-sm">
                  = <span className="text-white font-bold text-xl">{maxCpkgLwt.toFixed(1)}¢/kg liveweight</span>
                  {" "}at {arrivalWeight}kg arrival weight
                </p>
              </div>

              {isNegative && (
                <div className="mt-4 flex items-start gap-2 bg-white/20 rounded-xl p-3">
                  <AlertTriangle className="h-4 w-4 text-white shrink-0 mt-0.5" />
                  <p className="text-white text-xs font-semibold">
                    Cannot achieve target margin at these parameters. Reduce costs, increase exit price, or lower target margin.
                  </p>
                </div>
              )}
            </div>

            {/* Breakdown */}
            <Card className="rounded-2xl overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Breakdown per head</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    <tr className="py-2">
                      <td className="py-2.5 text-muted-foreground">Projected sale value</td>
                      <td className="py-2.5 text-right font-bold text-green-700">+{fmt$(projectedSaleValue)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-muted-foreground pl-3 text-xs">Freight in</td>
                      <td className="py-2.5 text-right text-xs text-red-600">-{fmt$dec(freightIn)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-muted-foreground pl-3 text-xs">Agent commission ({agentCommIn}%)</td>
                      <td className="py-2.5 text-right text-xs text-red-600">-{fmt$dec(agentCommDollar)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-muted-foreground pl-3 text-xs">MLA levy</td>
                      <td className="py-2.5 text-right text-xs text-red-600">-{fmt$dec(MLA)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-muted-foreground pl-3 text-xs">Induction costs</td>
                      <td className="py-2.5 text-right text-xs text-red-600">-{fmt$dec(inductionCosts)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-muted-foreground pl-3 text-xs">Feeding ({daysToFeed} days × {fmt$dec(dailyCost)}/day)</td>
                      <td className="py-2.5 text-right text-xs text-red-600">-{fmt$(feedingCost)}</td>
                    </tr>
                    <tr className="border-t-2 border-muted">
                      <td className="py-2.5 text-muted-foreground pl-3 text-xs">Target margin</td>
                      <td className="py-2.5 text-right text-xs text-red-600">-{fmt$(targetMargin)}</td>
                    </tr>
                    <tr className="border-t-2 border-foreground/20 bg-muted/20">
                      <td className="py-3 font-bold">Maximum bid</td>
                      <td className={`py-3 text-right font-black text-xl ${isNegative ? "text-red-600" : species === "sheep" ? "text-green-700" : "text-amber-700"}`}>
                        {isNegative ? "-" : ""}{fmt$(maxBid)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-4 pt-4 border-t space-y-2 text-xs text-muted-foreground">
                  {exitPath === "oth" && (
                    <p>Projected carcase weight: <strong className="text-foreground">{(exitWeight * dressingPct / 100).toFixed(1)}kg</strong> ({dressingPct}% dressing)</p>
                  )}
                  <p>Total costs to finish: <strong className="text-foreground">{fmt$(totalCosts)}/head</strong></p>
                  <p>Margin at bid: <strong className={`${marginCheck >= targetMargin - 1 ? "text-green-700" : "text-amber-700"}`}>{fmt$(targetMargin)}/head</strong></p>
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground text-center px-4">
              All figures indicative only. Agent commission is calculated on the bid price. Verify freight, grid prices, and levies with your agent before bidding.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
