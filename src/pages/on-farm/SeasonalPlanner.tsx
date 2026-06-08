import { useState, useEffect, useCallback } from "react";
import { LivestockLayout } from "@/components/LivestockLayout";
import { supabase } from "@/integrations/supabase/client";
import { useMobs } from "@/components/on-farm/useMobs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, CloudRain, Sun, Cloud, RefreshCw } from "lucide-react";

// ── DSE ratings ────────────────────────────────────────────────────────────
const DSE_RATINGS: Record<string, number> = {
  lot_fed: 10, backgrounder: 8, trade: 8, weaner: 5,
  boner_cow: 10, cull_cow: 10, breeder: 14, bull: 16,
  trade_lamb: 1.0, heavy_lamb: 1.2, merino_lamb: 1.0,
  ewe: 1.5, wether: 1.5, hogget: 1.3,
};

const CAT_LABELS: Record<string, string> = {
  lot_fed: "Lot Fed Steer", backgrounder: "Backgrounder", trade: "Trade Steer",
  weaner: "Weaner", boner_cow: "Boner Cow", cull_cow: "Cull Cow",
  breeder: "Breeder/Cow+Calf", bull: "Bull",
  trade_lamb: "Trade Lamb", heavy_lamb: "Heavy Lamb", merino_lamb: "Merino Lamb",
  ewe: "Ewe", wether: "Wether", hogget: "Hogget",
};

// ── Regions: lat/lon + seasonal curve (% of max carrying by month, Jan=0) ──
interface Region {
  label: string;
  country: string;
  group: string;
  lat: number;
  lon: number;
  timezone: string;
  carryingMin: number;
  carryingMax: number;
  carryingDefault: number;
  seasonal: number[]; // Jan–Dec, 0–100
  notes: string;
}

const REGIONS: Record<string, Region> = {
  // ── AUSTRALIA ─────────────────────────────────────────────────────────────
  aus_gippsland: {
    label: "Gippsland, VIC", country: "Australia", group: "Victoria",
    lat: -37.8, lon: 147.1, timezone: "Australia/Melbourne",
    carryingMin: 14, carryingMax: 22, carryingDefault: 16,
    seasonal: [40, 35, 50, 70, 80, 85, 80, 90, 100, 100, 85, 60],
    notes: "High rainfall dairy and beef. Peak Sept–Oct, summer trough Feb–Mar.",
  },
  aus_western_district: {
    label: "Western District, VIC", country: "Australia", group: "Victoria",
    lat: -37.7, lon: 142.8, timezone: "Australia/Melbourne",
    carryingMin: 12, carryingMax: 20, carryingDefault: 14,
    seasonal: [35, 30, 45, 65, 78, 82, 78, 88, 100, 100, 82, 55],
    notes: "Sheep and beef. Reliable autumn break. Good spring flush.",
  },
  aus_wimmera: {
    label: "Wimmera / Mallee, VIC", country: "Australia", group: "Victoria",
    lat: -36.5, lon: 142.0, timezone: "Australia/Melbourne",
    carryingMin: 5, carryingMax: 10, carryingDefault: 7,
    seasonal: [25, 20, 35, 55, 70, 75, 70, 78, 90, 90, 70, 40],
    notes: "Drier zone. Summer very dry. Winter grain stubble supplements grass.",
  },
  aus_northern_vic: {
    label: "Northern VIC / Riverina", country: "Australia", group: "Victoria",
    lat: -36.1, lon: 145.4, timezone: "Australia/Melbourne",
    carryingMin: 6, carryingMax: 12, carryingDefault: 9,
    seasonal: [30, 25, 40, 60, 72, 78, 72, 82, 95, 95, 75, 45],
    notes: "Mixed dryland and irrigation. Hot dry summers.",
  },
  aus_new_england: {
    label: "New England, NSW", country: "Australia", group: "New South Wales",
    lat: -30.5, lon: 151.5, timezone: "Australia/Sydney",
    carryingMin: 8, carryingMax: 16, carryingDefault: 10,
    seasonal: [65, 70, 65, 60, 55, 50, 45, 55, 70, 80, 80, 70],
    notes: "Tablelands beef. Summer dominant rainfall. Good year-round but hot-dry winters.",
  },
  aus_south_west_slopes: {
    label: "South West Slopes, NSW", country: "Australia", group: "New South Wales",
    lat: -35.5, lon: 148.0, timezone: "Australia/Sydney",
    carryingMin: 7, carryingMax: 14, carryingDefault: 10,
    seasonal: [35, 30, 45, 60, 70, 75, 70, 80, 90, 90, 75, 50],
    notes: "Winter dominant rainfall. Good spring. Dry summer.",
  },
  aus_western_plains: {
    label: "Western Plains, NSW", country: "Australia", group: "New South Wales",
    lat: -32.0, lon: 147.0, timezone: "Australia/Sydney",
    carryingMin: 2, carryingMax: 6, carryingDefault: 4,
    seasonal: [40, 45, 40, 45, 40, 35, 30, 40, 55, 60, 60, 50],
    notes: "Variable rainfall. Relies on summer storms and winter breaks.",
  },
  aus_darling_downs: {
    label: "Darling Downs, QLD", country: "Australia", group: "Queensland",
    lat: -27.5, lon: 151.5, timezone: "Australia/Brisbane",
    carryingMin: 5, carryingMax: 12, carryingDefault: 8,
    seasonal: [80, 80, 70, 60, 50, 40, 40, 50, 60, 70, 75, 80],
    notes: "Major feedlot region. Summer dominant rainfall. Winter often requires supplement.",
  },
  aus_central_qld: {
    label: "Central Queensland", country: "Australia", group: "Queensland",
    lat: -23.5, lon: 148.0, timezone: "Australia/Brisbane",
    carryingMin: 1, carryingMax: 5, carryingDefault: 3,
    seasonal: [90, 95, 85, 65, 45, 30, 30, 35, 50, 65, 75, 85],
    notes: "Mitchell grass country. Great wet season grass, very dry winter.",
  },
  aus_northern_qld: {
    label: "Northern Queensland", country: "Australia", group: "Queensland",
    lat: -18.0, lon: 144.0, timezone: "Australia/Brisbane",
    carryingMin: 0.5, carryingMax: 3, carryingDefault: 1.5,
    seasonal: [100, 100, 90, 75, 50, 35, 30, 35, 50, 65, 80, 95],
    notes: "Tropical beef. Monsoonal wet season. Very long dry season.",
  },
  aus_se_qld: {
    label: "South East Queensland", country: "Australia", group: "Queensland",
    lat: -27.5, lon: 152.5, timezone: "Australia/Brisbane",
    carryingMin: 5, carryingMax: 12, carryingDefault: 8,
    seasonal: [75, 75, 65, 55, 45, 35, 35, 45, 60, 70, 72, 75],
    notes: "Coastal to inland transition. Summer dominant. Improved pastures.",
  },
  aus_top_end: {
    label: "Top End / Darwin, NT", country: "Australia", group: "Northern Territory",
    lat: -13.0, lon: 131.0, timezone: "Australia/Darwin",
    carryingMin: 0.3, carryingMax: 1.5, carryingDefault: 0.8,
    seasonal: [100, 100, 95, 75, 45, 25, 20, 25, 45, 65, 80, 95],
    notes: "Monsoonal. Excellent wet season grass, near zero dry season. Long dry supplement period.",
  },
  aus_barkly: {
    label: "Barkly Tablelands, NT", country: "Australia", group: "Northern Territory",
    lat: -19.5, lon: 136.0, timezone: "Australia/Darwin",
    carryingMin: 0.5, carryingMax: 2, carryingDefault: 1,
    seasonal: [100, 100, 90, 70, 40, 20, 15, 20, 40, 60, 75, 90],
    notes: "Mitchell grass country. Outstanding wet season, very dry dry season.",
  },
  aus_se_sa: {
    label: "South East SA / Limestone Coast", country: "Australia", group: "South Australia",
    lat: -37.1, lon: 140.8, timezone: "Australia/Adelaide",
    carryingMin: 10, carryingMax: 18, carryingDefault: 13,
    seasonal: [35, 30, 45, 65, 80, 88, 85, 92, 100, 95, 72, 48],
    notes: "Dairy and beef. Winter dominant. Good spring flush.",
  },
  aus_eyre_peninsula: {
    label: "Eyre Peninsula, SA", country: "Australia", group: "South Australia",
    lat: -33.5, lon: 135.5, timezone: "Australia/Adelaide",
    carryingMin: 3, carryingMax: 8, carryingDefault: 5,
    seasonal: [25, 20, 35, 55, 72, 80, 75, 82, 92, 85, 65, 38],
    notes: "Sheep and cereal. Winter dominant. Very dry summer.",
  },
  aus_sw_wa: {
    label: "South West WA (wheat belt)", country: "Australia", group: "Western Australia",
    lat: -32.0, lon: 118.0, timezone: "Australia/Perth",
    carryingMin: 4, carryingMax: 10, carryingDefault: 7,
    seasonal: [30, 25, 40, 60, 78, 88, 85, 90, 100, 95, 72, 42],
    notes: "Mediterranean climate. Excellent June–Sep, very dry Dec–Feb.",
  },
  aus_great_southern_wa: {
    label: "Great Southern, WA", country: "Australia", group: "Western Australia",
    lat: -34.5, lon: 118.5, timezone: "Australia/Perth",
    carryingMin: 8, carryingMax: 16, carryingDefault: 11,
    seasonal: [32, 28, 45, 65, 80, 90, 88, 92, 100, 96, 75, 45],
    notes: "High rainfall WA. Beef, sheep, dairy. Strong winter-spring.",
  },
  aus_kimberley: {
    label: "Kimberley, WA", country: "Australia", group: "Western Australia",
    lat: -17.0, lon: 124.0, timezone: "Australia/Perth",
    carryingMin: 0.2, carryingMax: 1, carryingDefault: 0.5,
    seasonal: [100, 100, 90, 65, 35, 15, 10, 15, 35, 60, 80, 95],
    notes: "Monsoonal tropical. Very long dry season — may need supplement 5–6 months.",
  },
  aus_tasmania: {
    label: "Tasmania", country: "Australia", group: "Tasmania",
    lat: -42.0, lon: 146.5, timezone: "Australia/Hobart",
    carryingMin: 14, carryingMax: 24, carryingDefault: 18,
    seasonal: [60, 55, 65, 75, 78, 80, 78, 82, 92, 95, 88, 70],
    notes: "High rainfall, all-year grass. Best carrying capacity in Australia.",
  },
  // ── NEW ZEALAND ────────────────────────────────────────────────────────────
  nz_north_island: {
    label: "North Island, NZ", country: "New Zealand", group: "New Zealand",
    lat: -38.5, lon: 175.5, timezone: "Pacific/Auckland",
    carryingMin: 12, carryingMax: 25, carryingDefault: 18,
    seasonal: [75, 70, 78, 85, 88, 85, 82, 85, 90, 95, 95, 82],
    notes: "Reliable year-round grass. Best spring Oct–Nov. Slight summer trough in dry years.",
  },
  nz_south_island_coastal: {
    label: "South Island Coastal, NZ", country: "New Zealand", group: "New Zealand",
    lat: -44.0, lon: 171.5, timezone: "Pacific/Auckland",
    carryingMin: 10, carryingMax: 20, carryingDefault: 14,
    seasonal: [70, 65, 72, 80, 82, 78, 72, 78, 88, 95, 95, 80],
    notes: "Canterbury plains. Strong spring. Cold winters may need supplement in high country.",
  },
  nz_south_island_high: {
    label: "South Island High Country, NZ", country: "New Zealand", group: "New Zealand",
    lat: -44.5, lon: 169.0, timezone: "Pacific/Auckland",
    carryingMin: 4, carryingMax: 10, carryingDefault: 6,
    seasonal: [65, 60, 65, 70, 65, 55, 50, 55, 70, 85, 88, 72],
    notes: "Merino and beef. Cold winters, dry summers, strong spring flush.",
  },
  // ── SOUTH AMERICA ─────────────────────────────────────────────────────────
  arg_pampas: {
    label: "Pampas, Argentina", country: "Argentina", group: "South America",
    lat: -34.0, lon: -63.0, timezone: "America/Argentina/Buenos_Aires",
    carryingMin: 8, carryingMax: 18, carryingDefault: 12,
    seasonal: [80, 80, 75, 65, 55, 45, 45, 55, 70, 80, 85, 85],
    notes: "Southern hemisphere. Best Oct–Feb (spring/summer). Cooler May–Aug.",
  },
  arg_patagonia: {
    label: "Patagonia, Argentina", country: "Argentina", group: "South America",
    lat: -45.0, lon: -69.0, timezone: "America/Argentina/Buenos_Aires",
    carryingMin: 1, carryingMax: 4, carryingDefault: 2,
    seasonal: [75, 70, 65, 50, 35, 25, 25, 35, 55, 70, 80, 80],
    notes: "Merino sheep country. Short summer, cold dry winter.",
  },
  bra_cerrado: {
    label: "Cerrado, Brazil", country: "Brazil", group: "South America",
    lat: -15.0, lon: -47.0, timezone: "America/Sao_Paulo",
    carryingMin: 2, carryingMax: 8, carryingDefault: 5,
    seasonal: [100, 95, 90, 70, 45, 30, 25, 35, 55, 75, 90, 100],
    notes: "Tropical savanna. Summer wet season grass, long dry season supplement.",
  },
  // ── NORTH AMERICA ─────────────────────────────────────────────────────────
  usa_great_plains: {
    label: "Great Plains, USA", country: "USA", group: "North America",
    lat: -39.0, lon: -98.0, timezone: "America/Chicago",
    carryingMin: 3, carryingMax: 8, carryingDefault: 5,
    seasonal: [25, 25, 40, 65, 85, 95, 90, 85, 70, 55, 35, 22],
    notes: "Northern hemisphere. May–Aug peak. Winter hay/supplement required.",
  },
  usa_southeast: {
    label: "South East USA", country: "USA", group: "North America",
    lat: 33.0, lon: -86.0, timezone: "America/New_York",
    carryingMin: 5, carryingMax: 14, carryingDefault: 9,
    seasonal: [50, 55, 65, 80, 90, 90, 85, 85, 80, 75, 62, 52],
    notes: "Year-round grass. Summer dominant. Bermudagrass/bahia warm season.",
  },
  usa_pacific_northwest: {
    label: "Pacific Northwest, USA", country: "USA", group: "North America",
    lat: 45.0, lon: -120.0, timezone: "America/Los_Angeles",
    carryingMin: 4, carryingMax: 12, carryingDefault: 7,
    seasonal: [40, 45, 60, 78, 90, 88, 80, 78, 78, 70, 52, 38],
    notes: "Spring dominant. Dry summers in eastern areas. Good cool-season grass.",
  },
  // ── EUROPE / UK ────────────────────────────────────────────────────────────
  uk_ireland: {
    label: "UK / Ireland", country: "UK", group: "Europe",
    lat: 53.0, lon: -2.0, timezone: "Europe/London",
    carryingMin: 10, carryingMax: 22, carryingDefault: 15,
    seasonal: [40, 45, 58, 75, 88, 90, 88, 85, 78, 68, 52, 40],
    notes: "Excellent year-round grass. Peak May–Jun. Winter can require supplement in hard years.",
  },
  uk_scotland: {
    label: "Scotland / Northern UK", country: "UK", group: "Europe",
    lat: 57.0, lon: -4.0, timezone: "Europe/London",
    carryingMin: 6, carryingMax: 15, carryingDefault: 10,
    seasonal: [30, 35, 48, 65, 80, 85, 82, 80, 72, 58, 40, 28],
    notes: "Cold winters. Good summer. Highland areas often winter-housed.",
  },
  // ── AFRICA ────────────────────────────────────────────────────────────────
  sa_karoo: {
    label: "Karoo, South Africa", country: "South Africa", group: "Africa",
    lat: -32.0, lon: 22.0, timezone: "Africa/Johannesburg",
    carryingMin: 0.5, carryingMax: 3, carryingDefault: 1.5,
    seasonal: [50, 55, 55, 50, 40, 30, 28, 32, 45, 55, 55, 52],
    notes: "Semi-arid. Merino sheep country. Variable — drought risk significant.",
  },
  sa_highveld: {
    label: "Highveld, South Africa", country: "South Africa", group: "Africa",
    lat: -26.5, lon: 28.0, timezone: "Africa/Johannesburg",
    carryingMin: 4, carryingMax: 10, carryingDefault: 7,
    seasonal: [90, 90, 85, 65, 40, 25, 22, 30, 50, 70, 82, 90],
    notes: "Summer dominant rainfall. Very dry winter. Frost risk Jul–Aug.",
  },
};

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function feedStatus(pct: number) {
  if (pct >= 85) return { color: "bg-green-500", bg: "bg-green-50", border: "border-green-300", label: "Grass only", textColor: "text-green-700" };
  if (pct >= 60) return { color: "bg-amber-400", bg: "bg-amber-50", border: "border-amber-300", label: "Partial supp.", textColor: "text-amber-700" };
  return { color: "bg-red-400", bg: "bg-red-50", border: "border-red-300", label: "Supplement", textColor: "text-red-700" };
}

function fmt$(n: number) { return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }

// Group regions for select
const GROUPS = Object.entries(
  Object.entries(REGIONS).reduce((acc, [key, r]) => {
    if (!acc[r.group]) acc[r.group] = [];
    acc[r.group].push({ key, label: r.label });
    return acc;
  }, {} as Record<string, { key: string; label: string }[]>)
);

export default function SeasonalPlanner() {
  const { mobs } = useMobs();
  const [regionKey, setRegionKey] = useState("aus_western_district");
  const [hectares, setHectares] = useState(500);
  const [balePrice, setBalePrice] = useState(80);
  const [tractorCost, setTractorCost] = useState(200);
  const [feedRunsPerWeek, setFeedRunsPerWeek] = useState(2);
  const [buyCategory, setBuyCategory] = useState("backgrounder");
  const [buyHeadCount, setBuyHeadCount] = useState(120);
  const [buyMonth, setBuyMonth] = useState(new Date().getMonth());

  // Live weather state
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherModifier, setWeatherModifier] = useState(0); // -20 to +20 adjustment
  const [weatherSummary, setWeatherSummary] = useState<string | null>(null);
  const [weatherIcon, setWeatherIcon] = useState<"wet" | "dry" | "normal" | null>(null);
  const [recentRainfall, setRecentRainfall] = useState<number | null>(null);

  const region = REGIONS[regionKey] ?? REGIONS.aus_western_district;

  useEffect(() => {
    supabase.from("enterprise_settings" as any).select("state, hectares").single().then(({ data }: any) => {
      if (data?.hectares) setHectares(data.hectares);
    });
  }, []);

  // Fetch live weather when region changes
  const fetchWeather = useCallback(async () => {
    setWeatherLoading(true);
    setWeatherSummary(null);
    setWeatherModifier(0);
    setWeatherIcon(null);
    setRecentRainfall(null);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${region.lat}&longitude=${region.lon}&daily=precipitation_sum&timezone=${encodeURIComponent(region.timezone)}&past_days=30&forecast_days=7`;
      const res = await fetch(url);
      const data = await res.json();
      const daily: number[] = data.daily?.precipitation_sum ?? [];
      const past30 = daily.slice(0, 30);
      const totalMm = past30.reduce((s: number, v: number) => s + (v ?? 0), 0);
      setRecentRainfall(Math.round(totalMm));

      // Compare to expected monthly average for this region/month
      const currentMonth = new Date().getMonth();
      const seasonalPct = region.seasonal[currentMonth] / 100;
      // Rough expected monthly mm based on region type
      const expectedMm = regionKey.includes("gippsland") ? 60
        : regionKey.includes("kimberley") || regionKey.includes("top_end") ? 150
        : regionKey.includes("tasmania") || regionKey.includes("uk") ? 80
        : regionKey.includes("wimmera") || regionKey.includes("karoo") ? 20
        : 40;
      const adjustedExpected = expectedMm * seasonalPct;

      const ratio = adjustedExpected > 0 ? totalMm / adjustedExpected : 1;

      let modifier = 0;
      let summary = "";
      let icon: "wet" | "dry" | "normal" = "normal";

      if (ratio >= 1.5) {
        modifier = 15;
        summary = `Above average — ${Math.round(totalMm)}mm in the last 30 days vs ~${Math.round(adjustedExpected)}mm expected. Conditions are wetter than seasonal average. Grass availability adjusted up.`;
        icon = "wet";
      } else if (ratio >= 1.15) {
        modifier = 7;
        summary = `Slightly above average — ${Math.round(totalMm)}mm in the last 30 days. Good recent rainfall.`;
        icon = "wet";
      } else if (ratio <= 0.5) {
        modifier = -15;
        summary = `Below average — ${Math.round(totalMm)}mm in the last 30 days vs ~${Math.round(adjustedExpected)}mm expected. Drier than seasonal average. Supplementary feeding may be needed earlier than the calendar suggests.`;
        icon = "dry";
      } else if (ratio <= 0.75) {
        modifier = -7;
        summary = `Slightly below average — ${Math.round(totalMm)}mm in the last 30 days. Watch conditions closely.`;
        icon = "dry";
      } else {
        modifier = 0;
        summary = `Near normal — ${Math.round(totalMm)}mm in the last 30 days, close to seasonal average for this area and time of year.`;
        icon = "normal";
      }

      setWeatherModifier(modifier);
      setWeatherSummary(summary);
      setWeatherIcon(icon);
    } catch {
      setWeatherSummary("Could not fetch live weather data. Seasonal averages shown.");
    }
    setWeatherLoading(false);
  }, [region.lat, region.lon, region.timezone, region.seasonal, regionKey]);

  useEffect(() => { fetchWeather(); }, [fetchWeather]);

  // Adjusted seasonal (base + weather modifier, clamped 0–100)
  const adjustedSeasonal = region.seasonal.map(v => Math.min(100, Math.max(0, v + weatherModifier)));

  const totalDseCapacity = hectares * region.carryingDefault;
  const activeMobs = mobs.filter(m => m.status === "active");
  const currentDseLoad = activeMobs.reduce((sum, mob) => sum + (DSE_RATINGS[mob.category] ?? 8) * mob.head_count, 0);
  const headroomDse = totalDseCapacity - currentDseLoad;
  const headroomHead = Math.floor(headroomDse / (DSE_RATINGS[buyCategory] ?? 8));

  const buyDseLoad = buyHeadCount * (DSE_RATINGS[buyCategory] ?? 8);
  const totalDseAfterBuy = currentDseLoad + buyDseLoad;

  const feedRunCost = tractorCost * 1.5 + 20;
  const weeklyFeedRunCost = feedRunCost * feedRunsPerWeek;
  const dailySuppCostPerHead = buyHeadCount > 0 ? (weeklyFeedRunCost / 7 + (balePrice * 2 / 7)) / buyHeadCount : 0;

  // 12 months from buy month
  const months12 = Array.from({ length: 12 }, (_, i) => {
    const monthIdx = (buyMonth + i) % 12;
    const availPct = adjustedSeasonal[monthIdx] / 100;
    const dseAvailable = totalDseCapacity * availPct;
    const suppRequired = dseAvailable < totalDseAfterBuy;
    const suppFraction = suppRequired ? Math.min(1, (totalDseAfterBuy - dseAvailable) / Math.max(1, buyDseLoad)) : 0;
    return {
      monthIdx, name: MONTH_NAMES[monthIdx],
      availPct: adjustedSeasonal[monthIdx],
      suppRequired, suppFraction,
      suppCostPerHead: suppFraction * dailySuppCostPerHead,
      status: feedStatus(adjustedSeasonal[monthIdx]),
      isCurrentMonth: monthIdx === new Date().getMonth(),
    };
  });

  const grassMonths = months12.filter(m => !m.suppRequired);
  const suppMonths = months12.filter(m => m.suppRequired);
  const totalSuppCostPerHead = suppMonths.reduce((s, m) => s + m.suppCostPerHead * 30.4, 0);

  // Jan comparison
  const janSuppCostPerHead = Array.from({ length: 12 }, (_, i) => {
    const monthIdx = i;
    const availPct = adjustedSeasonal[monthIdx] / 100;
    const dseAvailable = totalDseCapacity * availPct;
    const suppRequired = dseAvailable < totalDseAfterBuy;
    const suppFraction = suppRequired ? Math.min(1, (totalDseAfterBuy - dseAvailable) / Math.max(1, buyDseLoad)) : 0;
    return suppRequired ? suppFraction * dailySuppCostPerHead * 30.4 : 0;
  }).reduce((s, n) => s + n, 0);

  const buyNowAdvantage = janSuppCostPerHead - totalSuppCostPerHead;

  const next6 = Array.from({ length: 6 }, (_, i) => ({
    idx: (new Date().getMonth() + i) % 12,
    name: MONTH_NAMES[(new Date().getMonth() + i) % 12],
    pct: adjustedSeasonal[(new Date().getMonth() + i) % 12],
  }));
  const bestWindow = next6.filter(m => m.pct >= 85);
  const worstWindow = next6.filter(m => m.pct < 60);

  return (
    <LivestockLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Feed Planning</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Seasonal Grazing Planner</h1>
          <p className="text-muted-foreground mt-1">
            Live weather data + regional seasonal curves. Know when grass covers your mob and when you'll need to supplement.
          </p>
        </div>

        {/* Region + property */}
        <div className="rounded-2xl border bg-white p-6 space-y-4">
          <p className="text-sm font-bold">Your property</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold">Region</Label>
              <Select value={regionKey} onValueChange={setRegionKey}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-96">
                  {GROUPS.map(([group, items]) => (
                    <div key={group}>
                      <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wide border-t first:border-0">{group}</div>
                      {items.map(({ key, label }) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
              {region.notes && <p className="text-xs text-muted-foreground">{region.notes}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Property size (ha)</Label>
              <Input type="number" step={50} value={hectares} onChange={e => setHectares(+e.target.value)} className="rounded-xl" />
              <p className="text-xs text-muted-foreground">Typical carrying: {region.carryingMin}–{region.carryingMax} DSE/ha · Using {region.carryingDefault} DSE/ha</p>
            </div>
          </div>
        </div>

        {/* Live weather */}
        <div className={`rounded-2xl border-2 p-5 ${
          weatherIcon === "wet" ? "border-blue-200 bg-blue-50" :
          weatherIcon === "dry" ? "border-orange-200 bg-orange-50" :
          "border-border bg-white"
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                weatherIcon === "wet" ? "bg-blue-500" :
                weatherIcon === "dry" ? "bg-orange-500" :
                "bg-slate-400"
              }`}>
                {weatherLoading ? <RefreshCw className="h-5 w-5 text-white animate-spin" /> :
                  weatherIcon === "wet" ? <CloudRain className="h-5 w-5 text-white" /> :
                  weatherIcon === "dry" ? <Sun className="h-5 w-5 text-white" /> :
                  <Cloud className="h-5 w-5 text-white" />}
              </div>
              <div>
                <p className="font-bold text-sm">Live conditions — {region.label}</p>
                {recentRainfall !== null && (
                  <p className="text-xs text-muted-foreground">{recentRainfall}mm in last 30 days · Open-Meteo</p>
                )}
                {weatherSummary && (
                  <p className="text-sm mt-1 leading-relaxed max-w-xl">{weatherSummary}</p>
                )}
                {weatherModifier !== 0 && (
                  <p className="text-xs font-semibold mt-1">
                    Seasonal curve adjusted {weatherModifier > 0 ? `+${weatherModifier}%` : `${weatherModifier}%`} from baseline
                  </p>
                )}
              </div>
            </div>
            <button onClick={fetchWeather} disabled={weatherLoading} className="shrink-0 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <RefreshCw className={`h-3.5 w-3.5 ${weatherLoading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Seasonal calendar */}
        <div className="rounded-2xl border bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold">{region.label} — seasonal feed calendar</p>
              <p className="text-xs text-muted-foreground">Adjusted for current conditions</p>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-1.5">
            {MONTH_NAMES.map((name, i) => {
              const pct = adjustedSeasonal[i];
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
            <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-full bg-amber-400" /> 60–85% Partial supp.</div>
            <div className="flex items-center gap-1"><div className="h-3 w-3 rounded-full bg-red-400" /> Below 60% Supplement</div>
          </div>
        </div>

        {/* Current DSE position */}
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-sm font-bold mb-4">Current stocking position</p>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="rounded-xl border px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">DSE load</p>
              <p className="text-2xl font-black">{Math.round(currentDseLoad).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{activeMobs.length} active mobs</p>
            </div>
            <div className="rounded-xl border px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">DSE capacity</p>
              <p className="text-2xl font-black">{Math.round(totalDseCapacity).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{hectares}ha × {region.carryingDefault} DSE/ha</p>
            </div>
            <div className={`rounded-xl border px-4 py-3 text-center ${headroomDse > 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <p className="text-xs text-muted-foreground">Headroom</p>
              <p className={`text-2xl font-black ${headroomDse > 0 ? "text-green-600" : "text-red-600"}`}>
                {headroomDse > 0 ? `+${Math.round(headroomDse)}` : Math.round(headroomDse)} DSE
              </p>
              <p className="text-xs text-muted-foreground">
                ≈ {headroomHead > 0 ? `${headroomHead} more ${CAT_LABELS[buyCategory]}` : "over capacity"}
              </p>
            </div>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${currentDseLoad / totalDseCapacity > 1 ? "bg-red-500" : currentDseLoad / totalDseCapacity > 0.8 ? "bg-amber-400" : "bg-green-500"}`}
              style={{ width: `${Math.min(100, (currentDseLoad / totalDseCapacity) * 100)}%` }}
            />
          </div>
        </div>

        {/* Feed costs */}
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
          <p className="text-xs text-muted-foreground mt-3">
            Cost per run: {fmt$(feedRunCost)} · Weekly: {fmt$(weeklyFeedRunCost)} · At {buyHeadCount} head: ${dailySuppCostPerHead.toFixed(2)}/hd/day
          </p>
        </div>

        {/* Buy scenario */}
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-bold text-amber-900 mb-1">Buy scenario</p>
          <p className="text-xs text-amber-700 mb-4">When should you buy? Model the feed cost of buying at different times of year.</p>

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

          <div className="grid grid-cols-12 gap-1.5 mb-5">
            {months12.map(m => (
              <div key={m.monthIdx} className={`rounded-xl border-2 p-2 text-center ${m.isCurrentMonth ? "border-amber-400" : m.suppRequired ? "border-red-300 bg-red-50" : "border-green-200 bg-green-50"}`}>
                <p className="text-[10px] font-bold text-muted-foreground">{m.name}</p>
                {m.suppRequired ? (
                  <><p className="text-red-600 font-black text-sm">Supp</p><p className="text-[9px] text-red-500">${(m.suppCostPerHead * 30.4).toFixed(0)}/hd</p></>
                ) : (
                  <><p className="text-green-600 font-black text-sm">Grass</p><p className="text-[9px] text-green-600">$0</p></>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="rounded-xl bg-green-100 border border-green-200 px-4 py-3 text-center">
              <p className="text-xs text-green-700">Months on grass</p>
              <p className="text-3xl font-black text-green-700">{grassMonths.length}</p>
              <p className="text-xs text-green-600">free feed</p>
            </div>
            <div className="rounded-xl bg-red-100 border border-red-200 px-4 py-3 text-center">
              <p className="text-xs text-red-700">Months supplementing</p>
              <p className="text-3xl font-black text-red-700">{suppMonths.length}</p>
              <p className="text-xs text-red-600">at ${dailySuppCostPerHead.toFixed(2)}/hd/day</p>
            </div>
            <div className={`rounded-xl border px-4 py-3 text-center ${totalSuppCostPerHead > 0 ? "bg-amber-100 border-amber-200" : "bg-green-100 border-green-200"}`}>
              <p className="text-xs text-muted-foreground">Supplement cost</p>
              <p className={`text-3xl font-black ${totalSuppCostPerHead > 0 ? "text-amber-700" : "text-green-700"}`}>
                {totalSuppCostPerHead > 0 ? fmt$(totalSuppCostPerHead) : "$0"}
              </p>
              <p className="text-xs text-muted-foreground">per head / 12 months</p>
            </div>
          </div>

          {buyMonth !== 0 && (
            <div className={`rounded-xl border-2 px-5 py-4 ${buyNowAdvantage > 0 ? "border-green-300 bg-green-50" : "border-amber-300 bg-white"}`}>
              <div className="flex items-start gap-3">
                <div className="text-2xl">{buyNowAdvantage > 100 ? "📈" : buyNowAdvantage > 0 ? "✅" : "⚠️"}</div>
                <div>
                  <p className="font-bold text-sm">
                    {buyNowAdvantage > 0
                      ? `Buying in ${MONTH_NAMES[buyMonth]} saves ${fmt$(buyNowAdvantage)}/head in feed vs buying in January`
                      : `Buying in January saves ${fmt$(Math.abs(buyNowAdvantage))}/head vs ${MONTH_NAMES[buyMonth]}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    January: {fmt$(janSuppCostPerHead)}/head supplement · {MONTH_NAMES[buyMonth]}: {fmt$(totalSuppCostPerHead)}/head.
                    {buyNowAdvantage > 0 ? ` Total saving across ${buyHeadCount} head: ${fmt$(buyNowAdvantage * buyHeadCount)}.` : ""}
                    {weatherModifier !== 0 ? ` (Adjusted for current ${weatherIcon === "wet" ? "wet" : "dry"} conditions.)` : ""}
                  </p>
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
                <strong>Best buying months for {region.label}:</strong> {bestWindow.map(m => m.name).join(", ")} — grass will cover your mob without supplementary feeding.
              </p>
            </div>
          )}
          {worstWindow.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">
                <strong>Avoid buying in {region.label} in:</strong> {worstWindow.map(m => m.name).join(", ")} — supplementary feeding from day one.
                At {fmt$(dailySuppCostPerHead * 30)}/head/month, {worstWindow.length} months costs {fmt$(dailySuppCostPerHead * 30 * worstWindow.length)}/head.
              </p>
            </div>
          )}
        </div>

      </div>
    </LivestockLayout>
  );
}
