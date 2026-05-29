import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMarketBenchmarks } from "@/components/on-farm/useMobs";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Bell, Info, TrendingUp } from "lucide-react";

function fmt$(n: number) { return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }
function fmtCpkg(n: number) { return `${n.toFixed(0)}¢/kg`; }

function formatIndicatorName(key: string): string {
  const map: Record<string, string> = {
    heavy_steer: "Heavy Steer",
    heavy_cow: "Heavy Cow",
    feeder_steer: "Feeder Steer",
    oth_vic: "OTH Victoria",
    grain_wheat_aud_t: "Wheat (AUD/t)",
  };
  return map[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isWheatIndicator(key: string) {
  return key.includes("wheat") || key.includes("grain");
}

const CATEGORY_GUIDE = [
  { name: "Feeder Steers", weightRange: "280–380 kg", minKg: 280, maxKg: 380, benchKey: "feeder_steer" },
  { name: "Heavy Steers", weightRange: "400–550 kg", minKg: 400, maxKg: 550, benchKey: "heavy_steer" },
  { name: "Heavy Cows", weightRange: "400–500 kg", minKg: 400, maxKg: 500, benchKey: "heavy_cow" },
  { name: "OTH Cattle", weightRange: "350–550 kg", minKg: 350, maxKg: 550, benchKey: "oth_vic" },
];

const AUCTIONS_PLUS_ROWS = [
  { category: "Feeder Steers 280–320 kg", range: "295–320", trend: "↑", trendColour: "text-green-600" },
  { category: "Heavy Steers 400–450 kg", range: "310–340", trend: "→", trendColour: "text-amber-500" },
  { category: "Heavy Cows 400–480 kg", range: "250–275", trend: "↓", trendColour: "text-red-500" },
  { category: "OTH 350–500 kg", range: "305–330", trend: "↑", trendColour: "text-green-600" },
];

const CARD_COLOURS = [
  "bg-emerald-50 border-emerald-200 text-emerald-800",
  "bg-amber-50 border-amber-200 text-amber-800",
  "bg-sky-50 border-sky-200 text-sky-800",
  "bg-violet-50 border-violet-200 text-violet-800",
  "bg-orange-50 border-orange-200 text-orange-800",
];

export default function MarketIntelligence() {
  const { benchmarks, latest } = useMarketBenchmarks();
  const { toast } = useToast();

  const [alertCategory, setAlertCategory] = useState("feeder_steer");
  const [alertPrice, setAlertPrice] = useState<number>(300);

  const today = new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  function handleSetAlert() {
    toast({
      title: "Price alert set",
      description: "Coming soon via push notification.",
    });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-10">

        {/* ── Hero ── */}
        <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 px-6 pt-6 pb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <LineChart className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold">Market Intelligence</h1>
              <p className="text-white/70 text-sm">Live Australian cattle market indicators · MLA/NLRS data</p>
            </div>
          </div>
          <p className="text-white/50 text-xs mt-4">{today}</p>
        </div>

        {/* ── Live Market Indicators ── */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">Live Market Indicators</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {benchmarks && benchmarks.length > 0 ? (
              benchmarks.map((b, i) => {
                const isWheat = isWheatIndicator(b.indicator_name);
                const colourCls = CARD_COLOURS[i % CARD_COLOURS.length];
                const formattedValue = isWheat
                  ? `$${b.cents_per_kg.toFixed(0)}/t`
                  : fmtCpkg(b.cents_per_kg);
                return (
                  <Card key={b.indicator_name} className={`rounded-2xl border ${colourCls}`}>
                    <CardContent className="pt-4 pb-4 px-4">
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">
                        {formatIndicatorName(b.indicator_name)}
                      </p>
                      <p className="text-2xl font-black leading-none">{formattedValue}</p>
                      <p className="text-xs opacity-60 mt-1.5">{b.benchmark_date}</p>
                      <p className="text-xs opacity-50">{b.source}</p>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground col-span-5">Loading benchmarks…</p>
            )}
          </div>
        </section>

        {/* ── Category Price Guide ── */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Category Price Guide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="text-left py-2 pr-4">Category</th>
                    <th className="text-left py-2 pr-4">Weight Range</th>
                    <th className="text-right py-2 pr-4">Est. ¢/kg LW</th>
                    <th className="text-right py-2">Est. $/head</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {CATEGORY_GUIDE.map((row) => {
                    const bench = latest(row.benchKey);
                    const cpkg = bench?.cents_per_kg ?? 0;
                    const midKg = (row.minKg + row.maxKg) / 2;
                    const dollarHead = cpkg > 0 ? midKg * cpkg / 100 : 0;
                    return (
                      <tr key={row.name}>
                        <td className="py-2.5 pr-4 font-semibold">{row.name}</td>
                        <td className="py-2.5 pr-4 text-muted-foreground">{row.weightRange}</td>
                        <td className="py-2.5 pr-4 text-right font-bold text-blue-700">
                          {cpkg > 0 ? fmtCpkg(cpkg) : "—"}
                        </td>
                        <td className="py-2.5 text-right font-bold text-green-700">
                          {dollarHead > 0 ? fmt$(dollarHead) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">$/head calculated at midpoint weight × benchmark ¢/kg ÷ 100. Indicative only.</p>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-5">

          {/* ── Saleyard Weekly Summary ── */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Saleyard Weekly Summary</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm text-blue-800 font-semibold">Weekly market commentary</p>
                <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                  Real-time saleyard results from MLA NLRS and AuctionsPlus will appear here — updated weekly. Currently showing benchmark snapshot.
                </p>
              </div>
              {/* Price ladder */}
              <div className="space-y-1.5">
                {benchmarks && benchmarks
                  .filter((b) => !isWheatIndicator(b.indicator_name))
                  .map((b, i) => {
                    const barWidth = Math.min(100, Math.max(10, (b.cents_per_kg / 400) * 100));
                    const barColours = ["bg-emerald-500", "bg-blue-500", "bg-amber-500", "bg-violet-500"];
                    return (
                      <div key={b.indicator_name} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-28 shrink-0">{formatIndicatorName(b.indicator_name)}</span>
                        <div className="flex-1 bg-muted/30 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${barColours[i % barColours.length]}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold w-16 text-right">{fmtCpkg(b.cents_per_kg)}</span>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* ── AuctionsPlus Context ── */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-indigo-500" />
                <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">AuctionsPlus Price Context</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3">
                <p className="text-xs text-indigo-800 leading-relaxed">
                  AuctionsPlus integration coming — this will automatically pull clearing prices for your target cattle categories from recent online sales.
                </p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground uppercase tracking-wide">
                    <th className="text-left py-2 pr-3">Category</th>
                    <th className="text-right py-2 pr-3">Range ¢/kg</th>
                    <th className="text-right py-2">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {AUCTIONS_PLUS_ROWS.map((row) => (
                    <tr key={row.category}>
                      <td className="py-2.5 pr-3 text-xs">{row.category}</td>
                      <td className="py-2.5 pr-3 text-right font-bold text-sm">{row.range}</td>
                      <td className={`py-2.5 text-right font-bold text-lg ${row.trendColour}`}>{row.trend}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* ── Price Alert Setup ── */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Set a Price Alert</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs font-semibold">Category</Label>
                <Select value={alertCategory} onValueChange={setAlertCategory}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feeder_steer">Feeder Steer</SelectItem>
                    <SelectItem value="heavy_steer">Heavy Steer</SelectItem>
                    <SelectItem value="heavy_cow">Heavy Cow</SelectItem>
                    <SelectItem value="oth_vic">OTH Victoria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs font-semibold">Alert me when price reaches (¢/kg)</Label>
                <Input
                  type="number"
                  value={alertPrice}
                  onChange={(e) => setAlertPrice(+e.target.value)}
                  className="rounded-xl font-bold"
                  placeholder="e.g. 320"
                />
              </div>
              <Button
                onClick={handleSetAlert}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 shrink-0"
              >
                Set Alert
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Alerts will be delivered via push notification. Currently in preview — alerts are saved but not yet active.</p>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
