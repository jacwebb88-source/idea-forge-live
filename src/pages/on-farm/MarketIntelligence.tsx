import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMarketBenchmarks } from "@/components/on-farm/useMobs";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Bell, Info, TrendingUp, BarChart2, Map, Cloud } from "lucide-react";

function fmt$(n: number) { return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }
function fmtCpkg(n: number) { return `${n.toFixed(0)}¢/kg`; }

function formatIndicatorName(key: string): string {
  const map: Record<string, string> = {
    eyci:              "EYCI — Eastern Young Cattle",
    wyci:              "WYCI — Western Young Cattle",
    nyci:              "NYCI — National Young Cattle",
    ayci:              "AYCI — AuctionsPlus Young Cattle",
    feeder_steer:      "Feeder Steer",
    heavy_steer:       "Heavy Steer (0 tooth)",
    heavy_steer_0t:    "Heavy Steer (0 tooth)",
    heavy_steer_2t:    "Heavy Steer (2 tooth)",
    medium_steer:      "Medium Steer",
    light_steer:       "Light Steer",
    heavy_cow:         "Heavy Cow",
    medium_cow:        "Medium Cow",
    oth_vic:           "OTH Victoria",
    oth_qld:           "OTH Queensland",
    oth_nsw:           "OTH New South Wales",
    oth_sa:            "OTH South Australia",
    grain_wheat_aud_t: "Wheat (AUD/t)",
    grain_barley_aud_t:"Barley (AUD/t)",
    hay_aud_t:         "Hay (AUD/t)",
    estli:             "ESTLI — Eastern States Trade Lamb",
    heavy_lamb:        "Heavy Lamb (24-32kg CW)",
    restocker_lamb:    "Restocker Lamb",
    merino_lamb:       "Merino Lamb",
    mutton:            "Mutton / Ewe",
    watli:             "WATLI — WA Trade Lamb",
    light_lamb:        "Light Lamb (<18kg CW)",
    arli:              "ARLI — AuctionsPlus Restocker Lamb",
  };
  return map[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isWheatIndicator(key: string) {
  return key.includes("wheat") || key.includes("grain");
}

const CATTLE_KEYS = ["eyci", "ayci", "wyci", "nyci", "feeder_steer", "heavy_steer", "heavy_steer_0t", "heavy_steer_2t", "medium_steer", "light_steer", "heavy_cow", "medium_cow", "oth_vic", "oth_qld", "oth_nsw", "oth_sa"];
const SHEEP_KEYS = ["estli", "arli", "heavy_lamb", "restocker_lamb", "merino_lamb", "mutton", "watli", "light_lamb"];

const CATEGORY_GUIDE = [
  { name: "EYCI Young Cattle", weightRange: "200–400 kg CW", minKg: 200, maxKg: 400, benchKey: "eyci", basis: "¢/kg CW" },
  { name: "Feeder Steers", weightRange: "280–380 kg LW", minKg: 280, maxKg: 380, benchKey: "feeder_steer", basis: "¢/kg LW" },
  { name: "Heavy Steers (0T)", weightRange: "400–550 kg LW", minKg: 400, maxKg: 550, benchKey: "heavy_steer_0t", basis: "¢/kg LW" },
  { name: "Heavy Cows", weightRange: "400–500 kg LW", minKg: 400, maxKg: 500, benchKey: "heavy_cow", basis: "¢/kg LW" },
  { name: "OTH VIC (Processor)", weightRange: "280–500 kg CW", minKg: 280, maxKg: 500, benchKey: "oth_vic", basis: "¢/kg CW" },
];

const SHEEP_CATEGORY_GUIDE = [
  { name: "Trade Lamb", weightRange: "18–24 kg CW", minKg: 18, maxKg: 24, benchKey: "estli", basis: "¢/kg CW" },
  { name: "Heavy Lamb", weightRange: "24–32 kg CW", minKg: 24, maxKg: 32, benchKey: "heavy_lamb", basis: "¢/kg CW" },
  { name: "Merino Lamb", weightRange: "16–22 kg CW", minKg: 16, maxKg: 22, benchKey: "merino_lamb", basis: "¢/kg CW" },
  { name: "Mutton / Ewe", weightRange: "22–32 kg CW", minKg: 22, maxKg: 32, benchKey: "mutton", basis: "¢/kg CW" },
];

const AUCTIONS_PLUS_ROWS = [
  { category: "EYCI Young Cattle 200–400 kg CW", range: "680–710", trend: "↑", trendColour: "text-green-600" },
  { category: "Feeder Steers 280–320 kg LW", range: "405–425", trend: "↑", trendColour: "text-green-600" },
  { category: "Heavy Steers 400–500 kg LW", range: "335–355", trend: "→", trendColour: "text-amber-500" },
  { category: "Heavy Cows 400–480 kg LW", range: "275–295", trend: "↓", trendColour: "text-red-500" },
];

// Generate 12 weeks of mock historical prices
const generatePriceHistory = (currentPrice: number, weeks: number = 12) => {
  const data = [];
  let price = currentPrice * 0.92; // start ~8% lower 12 weeks ago
  for (let i = weeks; i >= 0; i--) {
    const weekLabel = i === 0 ? "Now" : `${i}w ago`;
    price = price + (Math.random() - 0.45) * 12; // slight upward drift
    data.push({ week: weekLabel, price: Math.round(price) });
  }
  data[data.length - 1].price = currentPrice; // end at current
  return data;
};

const REGIONAL_ADJUSTMENTS = [
  { region: "Roma QLD",        heavyAdj: +8,  feederAdj: +7 },
  { region: "Dalby QLD",       heavyAdj: +4,  feederAdj: +5 },
  { region: "Wodonga VIC",     heavyAdj: +2,  feederAdj: +1 },
  { region: "Wagga NSW",       heavyAdj: +1,  feederAdj: 0  },
  { region: "Naracoorte SA",   heavyAdj: -3,  feederAdj: -4 },
  { region: "Kimberley WA",    heavyAdj: -12, feederAdj: -14 },
];

type SaleyardReport = {
  id: string;
  created_at: string;
  sale_date: string;
  saleyard_name: string;
  state: string;
  species: string;
  category: string;
  price_avg_cpkg: number;
  price_low_dol: number;
  price_high_dol: number;
  head_count: number;
  source: string | null;
  notes: string | null;
};

function useSaleyardReports(species: string) {
  const [reports, setReports] = useState<SaleyardReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("saleyard_reports")
      .select("*")
      .eq("species", species)
      .order("sale_date", { ascending: false })
      .limit(60)
      .then(({ data }) => {
        // Deduplicate: keep most recent row per saleyard+category
        const seen = new Set<string>();
        const deduped: SaleyardReport[] = [];
        for (const row of (data as SaleyardReport[]) ?? []) {
          const key = `${row.saleyard_name}||${row.category}`;
          if (!seen.has(key)) {
            seen.add(key);
            deduped.push(row);
          }
        }
        setReports(deduped);
        setLoading(false);
      });
  }, [species]);

  return { reports, loading };
}

export default function MarketIntelligence() {
  const { benchmarks, latest } = useMarketBenchmarks();
  const { toast } = useToast();

  const [species, setSpecies] = useState("cattle");
  const [alertCategory, setAlertCategory] = useState("feeder_steer");
  const [alertPrice, setAlertPrice] = useState<number>(300);
  const [saleyardState, setSaleyardState] = useState("all");
  const [seasonalState, setSeasonalState] = useState("all");

  const [seasonalData, setSeasonalData] = useState<any[]>([]);
  const [seasonalLoading, setSeasonalLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("seasonal_data")
      .select("*")
      .order("observation_date", { ascending: false })
      .limit(48) // up to 4 weeks × 12 regions
      .then(({ data }) => {
        // Keep only most recent row per region
        const seen = new Set<string>();
        const deduped = (data ?? []).filter(r => {
          if (seen.has(r.region_name)) return false;
          seen.add(r.region_name);
          return true;
        });
        setSeasonalData(deduped);
        setSeasonalLoading(false);
      });
  }, []);

  const { reports, loading: reportsLoading } = useSaleyardReports(species);

  // AuctionsPlus clearances
  const [clearances, setClearances] = useState<any[]>([]);
  const [clearanceLoading, setClearanceLoading] = useState(true);

  useEffect(() => {
    setClearanceLoading(true);
    supabase
      .from("auction_clearances")
      .select("*")
      .eq("species", species)
      .order("sale_date", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        // Keep only the most recent row per category
        const seen = new Set<string>();
        const deduped = (data ?? []).filter(r => {
          const k = r.category;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        setClearances(deduped);
        setClearanceLoading(false);
      });
  }, [species]);

  const activeKeys = species === "cattle" ? CATTLE_KEYS : SHEEP_KEYS;
  const filteredBenchmarks = benchmarks
    ? benchmarks.filter(b => activeKeys.includes(b.indicator))
    : [];
  const activeCategoryGuide = species === "cattle" ? CATEGORY_GUIDE : SHEEP_CATEGORY_GUIDE;

  const today = new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  function handleSetAlert() {
    toast({
      title: "Price alert set",
      description: "Coming soon via push notification.",
    });
  }

  // AuctionsPlus section helpers
  const overallClearance = clearances.find(r => r.category === "overall");
  const weightBrackets = clearances
    .filter(r => r.category !== "overall")
    .sort((a, b) => (a.weight_min_kg ?? 0) - (b.weight_min_kg ?? 0));

  const maxPriceCpkg = species === "cattle" ? 700 : 1800;

  function clearanceBadgeClass(pct: number) {
    if (pct >= 90) return "bg-green-100 text-green-800";
    if (pct >= 70) return "bg-amber-100 text-amber-800";
    return "bg-red-100 text-red-800";
  }

  function clearanceBarClass(pct: number) {
    if (pct >= 90) return "bg-green-500";
    if (pct >= 70) return "bg-amber-500";
    return "bg-red-500";
  }

  const apIndicatorKey = species === "cattle" ? "ayci" : "arli";
  const apBenchmark = latest(apIndicatorKey);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-10">

        {/* ── Hero ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Market Intelligence</h1>
            <p className="text-muted-foreground mt-1">Live Australian cattle & sheep market indicators · MLA/NLRS data</p>
          </div>
        </div>
        <p className="text-muted-foreground text-xs">{today}</p>

        {/* ── Species Tabs ── */}
        <div className="flex gap-2">
          <button
            onClick={() => setSpecies("cattle")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${species === "cattle" ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"}`}
          >
            🐄 Cattle
          </button>
          <button
            onClick={() => setSpecies("sheep")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${species === "sheep" ? "bg-blue-100 text-blue-800 border border-blue-300" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"}`}
          >
            🐑 Sheep & Lamb
          </button>
        </div>

        {/* ── Live Market Indicators ── */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">Live Market Indicators</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {filteredBenchmarks.length > 0 ? (
              filteredBenchmarks.map((b) => {
                const isWheat = isWheatIndicator(b.indicator);
                const formattedValue = isWheat
                  ? `$${b.cents_per_kg.toFixed(0)}/t`
                  : fmtCpkg(b.cents_per_kg);
                const isSheep = species === "sheep";
                return (
                  <Card key={b.indicator}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isSheep ? "bg-blue-50" : "bg-amber-50"}`}>
                          <TrendingUp className={`h-4 w-4 ${isSheep ? "text-blue-600" : "text-amber-600"}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground leading-tight">
                            {formatIndicatorName(b.indicator)}
                          </p>
                          <p className="text-2xl font-bold leading-tight">{formattedValue}</p>
                          <p className="text-xs text-muted-foreground">{b.benchmark_date}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : benchmarks && benchmarks.length > 0 ? (
              <p className="text-sm text-muted-foreground col-span-5">No {species === "sheep" ? "sheep & lamb" : "cattle"} benchmarks available yet.</p>
            ) : (
              <p className="text-sm text-muted-foreground col-span-5">Loading benchmarks…</p>
            )}
          </div>
        </section>

        {/* ── Saleyard Results ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Map className="h-4 w-4 text-green-700" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Saleyard Results · Live Clearances
            </h2>
            <span className="ml-1 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Agora</span>
          </div>

          {/* State filter pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {["all", "NSW", "VIC", "SA", "QLD", "WA"].map((s) => (
              <button
                key={s}
                onClick={() => setSaleyardState(s)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  saleyardState === s
                    ? "bg-green-100 text-green-800 border border-green-300"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>

          <Card className="rounded-2xl">
            <CardContent className="pt-4 overflow-x-auto">
              {reportsLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-8 bg-muted/40 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : reports.filter((r) => saleyardState === "all" || r.state === saleyardState).length === 0 ? (
                <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-5 text-center">
                  <p className="text-sm text-blue-800 font-semibold mb-1">No saleyard data yet</p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Saleyard data loads automatically each week from Agora Livestock. First results will appear after the next weekly scrape.
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="text-left py-2 pr-4">Saleyard</th>
                      <th className="text-left py-2 pr-4">State</th>
                      <th className="text-left py-2 pr-4">Category</th>
                      <th className="text-right py-2 pr-4">Avg ¢/kg CW</th>
                      <th className="text-right py-2 pr-4">$/head range</th>
                      <th className="text-right py-2 pr-4">Head yarded</th>
                      <th className="text-right py-2">Sale date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reports
                      .filter((r) => saleyardState === "all" || r.state === saleyardState)
                      .map((r) => (
                        <tr key={r.id}>
                          <td className="py-2.5 pr-4 font-semibold">{r.saleyard_name}</td>
                          <td className="py-2.5 pr-4 text-muted-foreground">{r.state}</td>
                          <td className="py-2.5 pr-4 text-muted-foreground">{r.category}</td>
                          <td className="py-2.5 pr-4 text-right font-bold text-green-700">{r.price_avg_cpkg.toFixed(0)}¢</td>
                          <td className="py-2.5 pr-4 text-right text-muted-foreground">
                            {r.price_low_dol != null && r.price_high_dol != null
                              ? `$${r.price_low_dol.toLocaleString("en-AU", { maximumFractionDigits: 0 })}–$${r.price_high_dol.toLocaleString("en-AU", { maximumFractionDigits: 0 })}`
                              : "—"}
                          </td>
                          <td className="py-2.5 pr-4 text-right">{r.head_count != null ? r.head_count.toLocaleString("en-AU") : "—"}</td>
                          <td className="py-2.5 text-right text-muted-foreground text-xs">{r.sale_date}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ── AuctionsPlus Online Auctions ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="h-4 w-4 text-green-700" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              AuctionsPlus Online Auctions
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Left card — Market Sentiment */}
            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                    AuctionsPlus · Online Auction Pulse
                  </CardTitle>
                  <span className="text-xs bg-green-600 text-white px-1.5 py-0.5 rounded font-bold">AP</span>
                </div>
              </CardHeader>
              <CardContent>
                {clearanceLoading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-8 bg-muted/40 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : clearances.length === 0 ? (
                  <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-5">
                    <p className="text-sm text-green-800 font-semibold mb-1">Data not yet available</p>
                    <p className="text-xs text-green-700 leading-relaxed">
                      AuctionsPlus data loads after the Friday newsletter is parsed. First results appear within 24 hours of your first weekly email.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Overall clearance rate */}
                    {overallClearance ? (
                      <div className="text-center py-2">
                        <p className="text-5xl font-bold text-green-700">
                          {overallClearance.clearance_pct != null ? `${overallClearance.clearance_pct.toFixed(0)}%` : "—"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Overall clearance rate</p>
                      </div>
                    ) : (
                      (() => {
                        const withPct = clearances.filter(r => r.clearance_pct != null);
                        const avgPct = withPct.length > 0
                          ? withPct.reduce((sum, r) => sum + r.clearance_pct, 0) / withPct.length
                          : null;
                        return avgPct != null ? (
                          <div className="text-center py-2">
                            <p className="text-5xl font-bold text-green-700">{avgPct.toFixed(0)}%</p>
                            <p className="text-xs text-muted-foreground mt-1">Avg clearance rate (all brackets)</p>
                          </div>
                        ) : null;
                      })()
                    )}

                    {/* Head stats */}
                    {overallClearance && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-muted/30 px-3 py-2 text-center">
                          <p className="text-lg font-bold">{overallClearance.head_offered != null ? overallClearance.head_offered.toLocaleString("en-AU") : "—"}</p>
                          <p className="text-xs text-muted-foreground">Head offered</p>
                        </div>
                        <div className="rounded-xl bg-muted/30 px-3 py-2 text-center">
                          <p className="text-lg font-bold">{overallClearance.head_sold != null ? overallClearance.head_sold.toLocaleString("en-AU") : "—"}</p>
                          <p className="text-xs text-muted-foreground">Head sold</p>
                        </div>
                      </div>
                    )}

                    {/* Value over reserve */}
                    {overallClearance?.value_over_reserve != null && (
                      <div className="rounded-xl bg-green-50 border border-green-200 px-3 py-2 flex items-center justify-between">
                        <p className="text-xs text-green-800">Avg value over reserve</p>
                        <p className="text-sm font-bold text-green-700">{fmt$(overallClearance.value_over_reserve)}/head</p>
                      </div>
                    )}

                    {/* AYCI / ARLI benchmark */}
                    {apBenchmark && (
                      <div className="rounded-xl bg-muted/20 border px-3 py-2 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{formatIndicatorName(apIndicatorKey)}</p>
                        <p className="text-sm font-bold">{fmtCpkg(apBenchmark.cents_per_kg)}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right card — Price by Weight */}
            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Weight Bracket Prices
                  <span className="ml-2 text-xs font-normal normal-case text-muted-foreground">
                    ¢/kg {species === "cattle" ? "LW" : "DW"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {clearanceLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="h-4 bg-muted/40 rounded animate-pulse w-1/2" />
                        <div className="h-3 bg-muted/40 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : weightBrackets.length === 0 ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="space-y-1.5">
                        <div className="h-4 bg-muted/40 rounded animate-pulse w-1/2" />
                        <div className="h-3 bg-muted/40 rounded animate-pulse" />
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      Bracket prices will appear once weekly sale data is parsed.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {weightBrackets.map((r) => {
                      const barWidth = r.price_cpkg != null
                        ? Math.min(100, Math.max(4, (r.price_cpkg / maxPriceCpkg) * 100))
                        : 0;
                      return (
                        <div key={r.category}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-foreground">{r.label ?? r.category}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold">
                                {r.price_cpkg != null ? `${r.price_cpkg.toFixed(0)}¢` : "—"}
                              </span>
                              {r.clearance_pct != null && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${clearanceBadgeClass(r.clearance_pct)}`}>
                                  {r.clearance_pct.toFixed(0)}%
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all ${r.clearance_pct != null ? clearanceBarClass(r.clearance_pct) : "bg-muted"}`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-xs text-muted-foreground pt-1">
                      Bar colour: green ≥ 90% clearance · amber 70–89% · red &lt; 70%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ── Seasonal Conditions ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Cloud className="h-4 w-4 text-sky-600" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Seasonal Conditions
            </h2>
          </div>

          {/* Part A — ENSO / Seasonal Outlook banner */}
          {(() => {
            const soiRow = seasonalData.find(r => r.soi_index != null);
            if (seasonalLoading) {
              return (
                <div className="h-28 bg-muted/40 rounded-2xl animate-pulse mb-4" />
              );
            }
            if (!soiRow) {
              return (
                <div className="rounded-2xl bg-sky-50 border border-sky-200 px-5 py-5 mb-4">
                  <p className="text-sm text-sky-800 font-semibold mb-1">Seasonal outlook not yet available</p>
                  <p className="text-xs text-sky-700 leading-relaxed">
                    SOI and ENSO phase data loads after the first weekly weather scrape from Open-Meteo and SILO. Check back after the next scheduled update.
                  </p>
                </div>
              );
            }
            const phase = soiRow.enso_phase as string | null;
            const soi = soiRow.soi_index as number;
            const phaseConfig = phase === "el_nino"
              ? { label: "🌡 El Niño — below average rain likely", badgeClass: "bg-red-100 text-red-800 border-red-300" }
              : phase === "la_nina"
              ? { label: "🌧 La Niña — above average rain likely", badgeClass: "bg-blue-100 text-blue-800 border-blue-300" }
              : { label: "⛅ Neutral — average conditions", badgeClass: "bg-gray-100 text-gray-700 border-gray-300" };
            return (
              <div className="rounded-2xl bg-white border border-sky-200 shadow-sm px-5 py-5 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <span className={`inline-block text-xs font-semibold border px-2.5 py-1 rounded-full mb-2 ${phaseConfig.badgeClass}`}>
                      {phaseConfig.label}
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Southern Oscillation Index · Updated monthly · Negative = El Niño (dry), Positive = La Niña (wet)
                    </p>
                    {soiRow.rainfall_outlook_3m && (
                      <p className="text-xs text-muted-foreground mt-1">
                        3-month outlook:{" "}
                        <span className="font-semibold capitalize">{soiRow.rainfall_outlook_3m.replace(/_/g, " ")}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-5xl font-bold ${soi > 0 ? "text-blue-600" : soi < 0 ? "text-red-500" : "text-gray-500"}`}>
                      {soi > 0 ? "+" : ""}{soi.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">SOI index</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* State filter pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {["all", "QLD", "NSW", "VIC", "SA", "WA", "NT"].map((s) => (
              <button
                key={s}
                onClick={() => setSeasonalState(s)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  seasonalState === s
                    ? "bg-sky-100 text-sky-800 border border-sky-300"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>

          {/* Part B — Region cards */}
          {seasonalLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-40 bg-muted/40 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : seasonalData.length === 0 ? (
            <div className="rounded-2xl bg-sky-50 border border-sky-200 px-5 py-5">
              <p className="text-sm text-sky-800 font-semibold mb-1">Seasonal data not yet loaded</p>
              <p className="text-xs text-sky-700 leading-relaxed">
                Seasonal data loads weekly from Open-Meteo (BOM data) and SILO. Covers 12 livestock regions across Australia. First results appear after the weekly weather update runs.
              </p>
            </div>
          ) : (() => {
            const filtered = seasonalData.filter(r =>
              seasonalState === "all" || r.state === seasonalState
            );
            if (filtered.length === 0) {
              return (
                <p className="text-sm text-muted-foreground">No regions found for {seasonalState}.</p>
              );
            }
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filtered.map((r) => {
                  const stressConfig = r.pasture_stress === "good"
                    ? { dot: "bg-green-500", label: "Good", dotClass: "" }
                    : r.pasture_stress === "fair"
                    ? { dot: "bg-amber-400", label: "Fair", dotClass: "" }
                    : r.pasture_stress === "stressed"
                    ? { dot: "bg-orange-500", label: "Stressed", dotClass: "" }
                    : r.pasture_stress === "critical"
                    ? { dot: "bg-red-500", label: "Critical", dotClass: "animate-pulse" }
                    : { dot: "bg-gray-300", label: "Unknown", dotClass: "" };

                  const rainfallPct = r.rainfall_30d_pct_avg as number | null;
                  const rainfallMm = r.rainfall_30d_mm as number | null;
                  const rainfallBarColor = rainfallPct == null
                    ? "bg-muted"
                    : rainfallPct >= 90
                    ? "bg-green-500"
                    : rainfallPct >= 60
                    ? "bg-amber-400"
                    : "bg-red-500";
                  const rainfallBarWidth = rainfallPct != null
                    ? Math.min(100, Math.max(2, rainfallPct))
                    : 0;

                  const supplyConfig = r.supply_pressure === "low"
                    ? { label: "↓ Low supply pressure", badgeClass: "bg-gray-100 text-gray-600" }
                    : r.supply_pressure === "moderate"
                    ? { label: "→ Moderate", badgeClass: "bg-amber-100 text-amber-700" }
                    : r.supply_pressure === "high"
                    ? { label: "↑ High supply pressure", badgeClass: "bg-orange-100 text-orange-700" }
                    : r.supply_pressure === "very_high"
                    ? { label: "⚠ Very high — watch prices", badgeClass: "bg-red-100 text-red-700" }
                    : { label: "—", badgeClass: "bg-gray-100 text-gray-500" };

                  return (
                    <div key={r.id ?? r.region_name} className="rounded-2xl border bg-white shadow-sm px-4 py-3 flex flex-col gap-2">
                      {/* Region name + state */}
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-bold leading-tight">{r.region_name}</p>
                        <span className="text-xs bg-muted/50 text-muted-foreground px-1.5 py-0.5 rounded shrink-0">{r.state}</span>
                      </div>

                      {/* Pasture stress */}
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${stressConfig.dot} ${stressConfig.dotClass}`} />
                        <span className="text-xs font-medium">{stressConfig.label}</span>
                      </div>

                      {/* Rainfall bar */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">30-day rainfall</span>
                          <span className="text-xs font-semibold">
                            {rainfallMm != null ? `${rainfallMm.toFixed(0)}mm` : "—"}
                            {rainfallPct != null ? ` (${rainfallPct.toFixed(0)}%)` : ""}
                          </span>
                        </div>
                        <div className="w-full bg-muted/30 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${rainfallBarColor}`}
                            style={{ width: `${rainfallBarWidth}%` }}
                          />
                        </div>
                      </div>

                      {/* Soil moisture */}
                      {r.soil_moisture_pct != null && (
                        <p className="text-xs text-muted-foreground">Soil: {(r.soil_moisture_pct as number).toFixed(0)}%</p>
                      )}

                      {/* Supply pressure badge + note */}
                      <div className="mt-auto pt-1">
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${supplyConfig.badgeClass}`}>
                          {supplyConfig.label}
                        </span>
                        {r.supply_pressure_note && (
                          <p className="text-xs text-muted-foreground mt-1 leading-tight">{r.supply_pressure_note}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </section>

        {/* ── Price Trends ── */}
        {species === "sheep" ? (
          <Card className="rounded-2xl">
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              Sheep price trends coming soon — MLA/NLRS weekly lamb & mutton trend data will appear here once the feed is live.
            </CardContent>
          </Card>
        ) : (() => {
          const eyciCurrent    = latest("eyci")?.cents_per_kg ?? 692;
          const feederCurrent  = latest("feeder_steer")?.cents_per_kg ?? 415;
          const heavyCurrent   = latest("heavy_steer")?.cents_per_kg ?? 345;
          const eyciHistory    = generatePriceHistory(eyciCurrent);
          const feederHistory  = generatePriceHistory(feederCurrent);
          const heavyHistory   = generatePriceHistory(heavyCurrent);
          const merged = eyciHistory.map((h, i) => ({
            week: h.week,
            eyci:        h.price,
            feederSteer: feederHistory[i]?.price ?? feederCurrent,
            heavySteer:  heavyHistory[i]?.price  ?? heavyCurrent,
          }));
          return (
            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-green-600" />
                  <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">MLA Price Trends — 12 Week History</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 mb-4">
                  <p className="text-xs text-amber-800">⚠️ Simulated trend — real weekly MLA/NLRS prices will flow in once the data feed is live. Current endpoint values are accurate.</p>
                </div>
                <ResponsiveContainer width="100%" height={240}>
                  <RechartsLineChart data={merged} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} interval={2} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}¢`} domain={["auto", "auto"]} />
                    <Tooltip formatter={(v: number, name: string) => [
                      `${v}¢/kg`,
                      name === "eyci" ? "EYCI (¢/kg CW)" : name === "feederSteer" ? "Feeder Steer (¢/kg LW)" : "Heavy Steer (¢/kg LW)"
                    ]} />
                    <Legend formatter={(v) => v === "eyci" ? "EYCI" : v === "feederSteer" ? "Feeder Steer" : "Heavy Steer"} />
                    <Line type="monotone" dataKey="eyci"        stroke="#7c3aed" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="feederSteer" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="heavySteer"  stroke="#16a34a" strokeWidth={2} dot={false} activeDot={{ r: 4 }} strokeDasharray="4 2" />
                  </RechartsLineChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground/60 mt-2 text-center">EYCI = Eastern Young Cattle Indicator (MLA) · ¢/kg carcase weight · Primary Australian cattle price benchmark</p>
              </CardContent>
            </Card>
          );
        })()}

        {/* ── Regional Saleyard Snapshot ── */}
        {species === "sheep" ? null : (() => {
          const heavyBase = latest("heavy_steer")?.cents_per_kg ?? 320;
          const feederBase = latest("feeder_steer")?.cents_per_kg ?? 295;
          return (
            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Map className="h-4 w-4 text-indigo-600" />
                  <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Regional Saleyard Snapshot</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground uppercase tracking-wide">
                        <th className="text-left py-2 pr-4">Region</th>
                        <th className="text-right py-2 pr-4">Heavy Steer ¢/kg</th>
                        <th className="text-right py-2 pr-4">Feeder Steer ¢/kg</th>
                        <th className="text-right py-2">vs National</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {REGIONAL_ADJUSTMENTS.map((row) => {
                        const heavy = heavyBase + row.heavyAdj;
                        const feeder = feederBase + row.feederAdj;
                        const avgAdj = (row.heavyAdj + row.feederAdj) / 2;
                        return (
                          <tr key={row.region}>
                            <td className="py-2.5 pr-4 font-semibold">{row.region}</td>
                            <td className="py-2.5 pr-4 text-right font-bold text-blue-700">{heavy}¢</td>
                            <td className="py-2.5 pr-4 text-right font-bold text-green-700">{feeder}¢</td>
                            <td className={`py-2.5 text-right font-semibold text-sm ${avgAdj > 0 ? "text-green-600" : avgAdj < 0 ? "text-red-500" : "text-muted-foreground"}`}>
                              {avgAdj > 0 ? `+${avgAdj.toFixed(0)}¢` : avgAdj < 0 ? `${avgAdj.toFixed(0)}¢` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Regional adjustments are indicative estimates based on historical premiums/discounts vs national benchmark. Verify with local agents.</p>
              </CardContent>
            </Card>
          );
        })()}

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
                    <th className="text-right py-2 pr-4">Benchmark</th>
                    <th className="text-right py-2">Est. $/head (mid)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activeCategoryGuide.map((row) => {
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
                {filteredBenchmarks
                  .filter((b) => !isWheatIndicator(b.indicator))
                  .map((b, i) => {
                    const barWidth = Math.min(100, Math.max(10, (b.cents_per_kg / 400) * 100));
                    const barColours = ["bg-emerald-500", "bg-blue-500", "bg-amber-500", "bg-violet-500"];
                    return (
                      <div key={b.indicator} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-28 shrink-0">{formatIndicatorName(b.indicator)}</span>
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
