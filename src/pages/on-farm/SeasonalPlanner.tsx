import { useState, useEffect } from "react";
import { LivestockLayout } from "@/components/LivestockLayout";
import { supabase } from "@/integrations/supabase/client";
import { useMobs } from "@/components/on-farm/useMobs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { format, addMonths, startOfMonth } from "date-fns";
import { AlertTriangle, CheckCircle, TrendingDown, Leaf, Info } from "lucide-react";

// ── DSE ratings per animal type ────────────────────────────────────────────
const DSE_RATINGS: Record<string, number> = {
  lot_fed:      10,  // heavy steer 350-450kg
  backgrounder: 8,   // medium steer
  trade:        8,
  weaner:       5,
  boner_cow:    10,
  cull_cow:     10,
  breeder:      14,  // cow + calf
  bull:         16,
  trade_lamb:   1.0,
  heavy_lamb:   1.2,
  merino_lamb:  1.0,
  ewe:          1.5,
  wether:       1.5,
  hogget:       1.3,
};

const CAT_LABELS: Record<string, string> = {
  lot_fed: "Lot Fed Steer", backgrounder: "Backgrounder", trade: "Trade Steer",
  weaner: "Weaner", boner_cow: "Boner Cow", cull_cow: "Cull Cow",
  breeder: "Breeder/Cow+Calf", bull: "Bull",
  trade_lamb: "Trade Lamb", heavy_lamb: "Heavy Lamb", merino_lamb: "Merino Lamb",
  ewe: "Ewe", wether: "Wether", hogget: "Hogget",
};

// ── Seasonal feed availability by state (% of full carrying capacity) ──────
// Index 0 = January ... 11 = December
const SEASONAL: Record<string, number[]> = {
  VIC: [35, 30, 45, 65, 75, 80, 75, 85, 100, 100, 80, 55],
  NSW: [35, 30, 40, 60, 70, 75, 70, 80, 95,  100, 75, 50],
  SA:  [35, 30, 45, 65, 80, 85, 80, 90, 100, 95,  70, 45],
  WA:  [40, 35, 50, 70, 85, 90, 85, 90, 100, 95,  70, 50],
  QLD: [100,100, 95, 85, 65, 50, 45, 40, 55,  70,  85, 100],
  NT:  [100,100, 90, 80, 55, 40, 35, 35, 50,  65,  80, 100],
  TAS: [45, 40, 55, 70, 75, 80, 75, 85, 100, 100, 85, 65],
  OTHER:[50, 45, 55, 65, 70, 75, 70, 80, 90,  90,  75, 60],
};

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const STATE_CARRYING: Record<string, { min: number; max: number; label: string }> = {
  VIC:   { min: 10, max: 20, label: "High rainfall Victoria" },
  NSW:   { min: 5,  max: 15, label: "Mixed NSW" },
  SA:    { min: 5,  max: 15, label: "South Australia" },
  WA:    { min: 5,  max: 14, label: "Western Australia" },
  QLD:   { min: 1,  max: 8,  label: "Queensland" },
  NT:    { min: 0.5,max: 3,  label: "Northern Territory" },
  TAS:   { min: 12, max: 22, label: "Tasmania" },
  OTHER: { min: 5,  max: 12, label: "Other" },
};

function feedStatus(pct: number): { color: string; bg: string; border: string; label: string; textColor: string } {
  if (pct >= 85) return { color: "bg-green-500", bg: "bg-green-50", border: "border-green-300", label: "Grass only", textColor: "text-green-700" };
  if (pct >= 60) return { color: "bg-amber-400", bg: "bg-amber-50", border: "border-amber-300", label: "Partial supp.", textColor: "text-amber-700" };
  return { color: "bg-red-400", bg: "bg-red-50", border: "border-red-300", label: "Supplement", textColor: "text-red-700" };
}

function fmt$(n: number) { return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }

export default function SeasonalPlanner() {
  const { mobs } = useMobs();
  const [state, setState] = useState("VIC");
  const [hectares, setHectares] = useState(500);
  const [dsePerhHa, setDsePerHa] = useState(10);
  const [balePrice, setBalePrice] = useState(80);
  const [tractorCost, setTractorCost] = useState(200);
  const [feedRunsPerWeek, setFeedRunsPerWeek] = useState(2);

  // Buy scenario inputs
  const [buyCategory, setBuyCategory] = useState("backgrounder");
  const [buyHeadCount, setBuyHeadCount] = useState(120);
  const [buyMonth, setBuyMonth] = useState(new Date().getMonth()); // 0-indexed

  // Load enterprise state
  useEffect(() => {
    supabase.from("enterprise_settings" as any).select("state, hectares, dse_per_ha").single().then(({ data }: any) => {
      if (data?.state) setState(data.state);
      if (data?.hectares) setHectares(data.hectares);
      if (data?.dse_per_ha) setDsePerHa(data.dse_per_ha);
    });
  }, []);

  const seasonal = SEASONAL[state] ?? SEASONAL.OTHER;
  const carrying = STATE_CARRYING[state] ?? STATE_CARRYING.OTHER;
  const totalDseCapacity = hectares * dsePerhHa;

  // Current DSE load from active mobs
  const activeMobs = mobs.filter(m => m.status === "active");
  const currentDseLoad = activeMobs.reduce((sum, mob) => {
    const dse = DSE_RATINGS[mob.category] ?? 8;
    return sum + dse * mob.head_count;
  }, 0);
  const currentHeadEquiv = Math.round(currentDseLoad / (DSE_RATINGS[buyCategory] ?? 8));

  // Headroom at full carrying capacity
  const headroomDse = totalDseCapacity - currentDseLoad;
  const headroomHead = Math.floor(headroomDse / (DSE_RATINGS[buyCategory] ?? 8));

  // ── Buy scenario ────────────────────────────────────────────────────────
  const buyDseLoad = buyHeadCount * (DSE_RATINGS[buyCategory] ?? 8);
  const totalDseAfterBuy = currentDseLoad + buyDseLoad;

  // Cost per feed run
  const feedRunCost = tractorCost * 1.5 + 20; // ~1.5hrs + fuel/labour
  const weeklyFeedRunCost = feedRunCost * feedRunsPerWeek;
  const dailySuppCostPerHead = (weeklyFeedRunCost / 7 + (balePrice * 2 / 7)) / buyHeadCount;

  // For each of 12 months starting from buyMonth, calculate grass vs supplement
  const months12 = Array.from({ length: 12 }, (_, i) => {
    const monthIdx = (buyMonth + i) % 12;
    const availPct = seasonal[monthIdx] / 100;
    const dseAvailable = totalDseCapacity * availPct;
    const dseNeeded = totalDseAfterBuy;
    const grassCoverPct = Math.min(100, Math.round((dseAvailable / dseNeeded) * 100));
    const suppRequired = dseAvailable < dseNeeded;
    const suppFraction = suppRequired ? Math.min(1, (dseNeeded - dseAvailable) / buyDseLoad) : 0;
    const suppCostPerHead = suppFraction * dailySuppCostPerHead;
    const status = feedStatus(seasonal[monthIdx]);
    return {
      monthIdx,
      name: MONTH_NAMES[monthIdx],
      availPct: seasonal[monthIdx],
      grassCoverPct,
      suppRequired,
      suppFraction,
      suppCostPerHead,
      status,
      isCurrentMonth: monthIdx === new Date().getMonth(),
      monthNumber: i + 1,
    };
  });

  const grassOnlyMonths = months12.filter(m => !m.suppRequired);
  const suppMonths = months12.filter(m => m.suppRequired);
  const totalSuppCost = suppMonths.reduce((s, m) => s + m.suppCostPerHead * 30.4 * buyHeadCount, 0);
  const totalSuppCostPerHead = suppMonths.reduce((s, m) => s + m.suppCostPerHead * 30.4, 0);

  // Compare: buy now vs buy in 3 months (Jan scenario)
  const janIdx = 0; // January
  const janSuppMonths = Array.from({ length: 12 }, (_, i) => {
    const monthIdx = (janIdx + i) % 12;
    const availPct = seasonal[monthIdx] / 100;
    const dseAvailable = totalDseCapacity * availPct;
    const dseNeeded = totalDseAfterBuy;
    const suppRequired = dseAvailable < dseNeeded;
    const suppFraction = suppRequired ? Math.min(1, (dseNeeded - dseAvailable) / buyDseLoad) : 0;
    return suppRequired ? suppFraction * dailySuppCostPerHead * 30.4 : 0;
  });
  const janTotalSuppPerHead = janSuppMonths.reduce((s, n) => s + n, 0);
  const buyNowAdvantagePerHead = janTotalSuppPerHead - totalSuppCostPerHead;

  // Best buy window (months with highest grass availability within 6 months)
  const currentMonth = new Date().getMonth();
  const next6 = Array.from({ length: 6 }, (_, i) => ({
    idx: (currentMonth + i) % 12,
    name: MONTH_NAMES[(currentMonth + i) % 12],
    pct: seasonal[(currentMonth + i) % 12],
  }));
  const bestWindow = next6.filter(m => m.pct >= 85);
  const worstWindow = next6.filter(m => m.pct < 60);

  return (
    <LivestockLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Feed Planning</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Seasonal Grazing Planner</h1>
          <p className="text-muted-foreground mt-1">
            Know when grass covers the mob — and when you'll need to supplement. Based on your property and seasonal feed profile.
          </p>
        </div>

        {/* Property setup */}
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-sm font-bold mb-4">Your property</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">State / region</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATE_CARRYING).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Property size (ha)</Label>
              <Input type="number" value={hectares} onChange={e => setHectares(+e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Carrying capacity (DSE/ha)</Label>
              <Input type="number" step={0.5} value={dsePerhHa} onChange={e => setDsePerHa(+e.target.value)} className="rounded-xl" />
              <p className="text-xs text-muted-foreground">Typical for {carrying.label}: {carrying.min}–{carrying.max} DSE/ha</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Total DSE capacity</Label>
              <div className="rounded-xl border bg-muted/20 px-4 py-2.5 text-lg font-black">
                {totalDseCapacity.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">{hectares}ha × {dsePerhHa} DSE/ha</p>
            </div>
          </div>
        </div>

        {/* Current stocking position */}
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-sm font-bold mb-4">Current position</p>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="rounded-xl border px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">Current DSE load</p>
              <p className="text-2xl font-black">{Math.round(currentDseLoad).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">from {activeMobs.length} active mobs</p>
            </div>
            <div className="rounded-xl border px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">DSE capacity</p>
              <p className="text-2xl font-black">{totalDseCapacity.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">at full carry</p>
            </div>
            <div className={`rounded-xl border px-4 py-3 text-center ${headroomDse > 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <p className="text-xs text-muted-foreground">Headroom</p>
              <p className={`text-2xl font-black ${headroomDse > 0 ? "text-green-600" : "text-red-600"}`}>
                {headroomDse > 0 ? `+${Math.round(headroomDse)}` : Math.round(headroomDse)} DSE
              </p>
              <p className="text-xs text-muted-foreground">
                ≈ {headroomHead > 0 ? `room for ${headroomHead} more ${CAT_LABELS[buyCategory]}` : "over capacity"}
              </p>
            </div>
          </div>

          {/* Capacity bar */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>0</span>
              <span>Current load: {Math.round((currentDseLoad / totalDseCapacity) * 100)}% of capacity</span>
              <span>{totalDseCapacity.toLocaleString()} DSE</span>
            </div>
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${currentDseLoad / totalDseCapacity > 1 ? "bg-red-500" : currentDseLoad / totalDseCapacity > 0.8 ? "bg-amber-400" : "bg-green-500"}`}
                style={{ width: `${Math.min(100, (currentDseLoad / totalDseCapacity) * 100)}%` }}
              />
            </div>
          </div>

          {/* Active mobs DSE breakdown */}
          {activeMobs.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {activeMobs.map(mob => {
                const dse = DSE_RATINGS[mob.category] ?? 8;
                const totalDse = dse * mob.head_count;
                return (
                  <div key={mob.id} className="flex items-center gap-3 text-xs">
                    <span className="font-medium w-48 truncate">{mob.mob_name}</span>
                    <span className="text-muted-foreground">{mob.head_count} head × {dse} DSE = <strong>{totalDse.toLocaleString()} DSE</strong></span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, (totalDse / totalDseCapacity) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Seasonal calendar — full year */}
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-sm font-bold mb-1">Seasonal feed calendar — {state}</p>
          <p className="text-xs text-muted-foreground mb-4">Estimated grass availability as % of full carrying capacity. Based on historical seasonal patterns.</p>
          <div className="grid grid-cols-12 gap-1.5">
            {MONTH_NAMES.map((name, i) => {
              const pct = seasonal[i];
              const status = feedStatus(pct);
              const isNow = i === new Date().getMonth();
              return (
                <div key={name} className={`rounded-xl border-2 p-2 text-center ${isNow ? "border-amber-400" : status.border} ${status.bg}`}>
                  <p className={`text-[10px] font-bold ${isNow ? "text-amber-700" : status.textColor}`}>{name}</p>
                  <p className={`text-base font-black leading-tight ${status.textColor}`}>{pct}%</p>
                  <p className={`text-[9px] font-medium leading-tight ${status.textColor}`}>{status.label}</p>
                  {isNow && <p className="text-[9px] font-bold text-amber-600 mt-0.5">NOW</p>}
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-full bg-green-500" /> 85%+ Grass only</div>
            <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-full bg-amber-400" /> 60–85% Partial supplement</div>
            <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-full bg-red-400" /> Below 60% Supplement required</div>
          </div>
        </div>

        {/* Supplementary feed costs */}
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-sm font-bold mb-4">Supplementary feed costs</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Bale / baleage price ($)</Label>
              <Input type="number" step={5} value={balePrice} onChange={e => setBalePrice(+e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tractor cost ($/hr depreciation)</Label>
              <Input type="number" step={10} value={tractorCost} onChange={e => setTractorCost(+e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Feed runs per week</Label>
              <Input type="number" step={1} value={feedRunsPerWeek} onChange={e => setFeedRunsPerWeek(+e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-muted/20 px-4 py-3 text-sm">
            Cost per feed run: <strong>{fmt$(feedRunCost)}</strong> · Weekly: <strong>{fmt$(weeklyFeedRunCost)}</strong> · Per head/day (at {buyHeadCount} head): <strong>${dailySuppCostPerHead.toFixed(2)}</strong>
          </div>
        </div>

        {/* Buy scenario */}
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-bold text-amber-900 mb-1">Buy scenario — what does it cost?</p>
          <p className="text-xs text-amber-700 mb-4">Model the supplementary feed cost of buying a mob at a specific time of year.</p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-amber-800">Animal type</Label>
              <Select value={buyCategory} onValueChange={setBuyCategory}>
                <SelectTrigger className="rounded-xl bg-white border-amber-300"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CAT_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v} ({DSE_RATINGS[k] ?? 8} DSE)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-amber-800">Head count</Label>
              <Input type="number" step={10} value={buyHeadCount} onChange={e => setBuyHeadCount(+e.target.value)} className="rounded-xl bg-white border-amber-300" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-amber-800">Buy in month</Label>
              <Select value={String(buyMonth)} onValueChange={v => setBuyMonth(+v)}>
                <SelectTrigger className="rounded-xl bg-white border-amber-300"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i} value={String(i)}>{name}{i === new Date().getMonth() ? " (now)" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Month by month grid */}
          <div className="grid grid-cols-12 gap-1.5 mb-5">
            {months12.map(m => (
              <div key={m.monthNumber} className={`rounded-xl border-2 p-2 text-center ${m.isCurrentMonth ? "border-amber-400" : m.suppRequired ? "border-red-300 bg-red-50" : "border-green-200 bg-green-50"}`}>
                <p className="text-[10px] font-bold text-muted-foreground">{m.name}</p>
                {m.suppRequired ? (
                  <>
                    <p className="text-red-600 font-black text-sm leading-tight">Supp</p>
                    <p className="text-[9px] text-red-500">${(m.suppCostPerHead * 30.4).toFixed(0)}/hd</p>
                  </>
                ) : (
                  <>
                    <p className="text-green-600 font-black text-sm leading-tight">Grass</p>
                    <p className="text-[9px] text-green-600">$0</p>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="rounded-xl bg-green-100 border border-green-200 px-4 py-3 text-center">
              <p className="text-xs text-green-700 font-medium">Months on grass</p>
              <p className="text-3xl font-black text-green-700">{grassOnlyMonths.length}</p>
              <p className="text-xs text-green-600">free feed</p>
            </div>
            <div className="rounded-xl bg-red-100 border border-red-200 px-4 py-3 text-center">
              <p className="text-xs text-red-700 font-medium">Months supplementing</p>
              <p className="text-3xl font-black text-red-700">{suppMonths.length}</p>
              <p className="text-xs text-red-600">at ${dailySuppCostPerHead.toFixed(2)}/hd/day</p>
            </div>
            <div className={`rounded-xl border px-4 py-3 text-center ${totalSuppCost > 0 ? "bg-amber-100 border-amber-200" : "bg-green-100 border-green-200"}`}>
              <p className="text-xs text-muted-foreground font-medium">Total supplement cost</p>
              <p className={`text-3xl font-black ${totalSuppCost > 0 ? "text-amber-700" : "text-green-700"}`}>
                {totalSuppCost > 0 ? fmt$(totalSuppCostPerHead) : "$0"}
              </p>
              <p className="text-xs text-muted-foreground">per head over 12 months</p>
            </div>
          </div>

          {/* Hugh's insight — comparison vs buying in Jan */}
          {buyMonth !== 0 && (
            <div className={`rounded-xl border-2 px-5 py-4 ${buyNowAdvantagePerHead > 0 ? "border-green-300 bg-green-50" : "border-amber-300 bg-amber-50"}`}>
              <div className="flex items-start gap-3">
                <div className="text-2xl">{buyNowAdvantagePerHead > 100 ? "📈" : buyNowAdvantagePerHead > 0 ? "✅" : "⚠️"}</div>
                <div>
                  <p className="font-bold text-sm">
                    {buyNowAdvantagePerHead > 0
                      ? `Buying in ${MONTH_NAMES[buyMonth]} saves ${fmt$(buyNowAdvantagePerHead)}/head vs January`
                      : `Buying in January would save ${fmt$(Math.abs(buyNowAdvantagePerHead))}/head in feed costs vs ${MONTH_NAMES[buyMonth]}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    January start = {fmt$(janTotalSuppPerHead)}/head supplement cost over 12 months.
                    {MONTH_NAMES[buyMonth]} start = {fmt$(totalSuppCostPerHead)}/head.
                    {buyNowAdvantagePerHead > 0
                      ? ` That's ${fmt$(buyNowAdvantagePerHead * buyHeadCount)} total saved across ${buyHeadCount} head.`
                      : " Buy earlier to reduce feed exposure."}
                  </p>
                  {buyNowAdvantagePerHead > 100 && (
                    <p className="text-xs text-green-700 font-semibold mt-1.5">
                      This is Hugh's point — buying ahead of the break captures cheap stock AND free feed. The combination is where the margin comes from.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Best buy window */}
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-sm font-bold mb-3">Best buy window — next 6 months</p>
          <div className="grid grid-cols-6 gap-2 mb-4">
            {next6.map(m => {
              const status = feedStatus(m.pct);
              return (
                <div key={m.idx} className={`rounded-xl border-2 p-3 text-center ${status.border} ${status.bg}`}>
                  <p className={`text-xs font-bold ${status.textColor}`}>{m.name}</p>
                  <p className={`text-xl font-black ${status.textColor}`}>{m.pct}%</p>
                  <p className={`text-[10px] ${status.textColor}`}>{status.label}</p>
                </div>
              );
            })}
          </div>

          {bestWindow.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">
                <strong>Best buying months:</strong> {bestWindow.map(m => m.name).join(", ")} —
                grass will cover your mob without supplementary feeding. This is your cost-free hold period.
              </p>
            </div>
          )}

          {worstWindow.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">
                <strong>Avoid buying in:</strong> {worstWindow.map(m => m.name).join(", ")} —
                you'll be supplementary feeding from day one. At {fmt$(dailySuppCostPerHead * 30)}/head/month, 5 months costs {fmt$(dailySuppCostPerHead * 150)}/head before you sell.
              </p>
            </div>
          )}
        </div>

        {/* DSE reference */}
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-sm font-bold mb-3">DSE reference — dry sheep equivalents</p>
          <p className="text-xs text-muted-foreground mb-3">DSE is the industry standard unit of feed demand. 1 DSE = a 50kg Merino ewe maintaining weight. Everything is relative to that.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(DSE_RATINGS).map(([cat, dse]) => (
              <div key={cat} className="rounded-lg border bg-muted/10 px-3 py-2 flex items-center justify-between text-xs">
                <span className="font-medium">{CAT_LABELS[cat]}</span>
                <span className="font-black text-sm">{dse} DSE</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </LivestockLayout>
  );
}
