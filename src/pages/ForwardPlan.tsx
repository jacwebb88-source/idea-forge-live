import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, addWeeks, endOfWeek, parseISO, isSameWeek } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Customized,
} from "recharts";
import { TrendingUp, Calendar, AlertTriangle, CheckCircle } from "lucide-react";

type Booking = {
  id: string;
  head_count: number | null;
  requested_kill_date: string | null;
  status: string | null;
  species: string | null;
  supplier_id: string | null;
  plant_id: string | null;
};

type DayPlan = {
  date: string;
  species: string;
  planned_head: number;
  plant_id: string | null;
};

type WeekBucket = {
  weekLabel: string;
  weekStart: string;
  confirmed: number;
  high: number;
  medium: number;
  low: number;
  placeholder: number;
  total: number;
  capacity: number;
  fillRate: number;
};

const statusToBucket = (status: string | null): keyof Omit<WeekBucket, "weekLabel" | "weekStart" | "total" | "capacity" | "fillRate"> => {
  switch ((status || "").toLowerCase()) {
    case "confirmed":   return "confirmed";
    case "high":        return "high";
    case "medium":      return "medium";
    case "low":
    case "pending":
    case "requested":   return "low";
    default:            return "placeholder";
  }
};

// Overlay that draws a dashed red capacity line for each week bar
// Uses Recharts' Customized component so it gets the actual pixel scales
const CapacityOverlay = ({ xAxisMap, yAxisMap, data }: any) => {
  const xAxis = xAxisMap?.[0];
  const yAxis = yAxisMap?.[0];
  if (!xAxis?.scale || !yAxis?.scale || !data) return null;

  return (
    <g>
      {(data as WeekBucket[]).map((entry, i) => {
        if (!entry.capacity || entry.capacity === 0) return null;
        const bandSize = xAxis.bandSize ?? 0;
        const x = xAxis.scale(entry.weekLabel) ?? 0;
        const y = yAxis.scale(entry.capacity);
        const pad = 6;
        return (
          <g key={i}>
            <line
              x1={x + pad}
              x2={x + bandSize - pad}
              y1={y}
              y2={y}
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="6 3"
              strokeLinecap="round"
            />
            {/* end ticks */}
            <line x1={x + pad} x2={x + pad} y1={y - 4} y2={y + 4} stroke="#ef4444" strokeWidth={1.5} />
            <line x1={x + bandSize - pad} x2={x + bandSize - pad} y1={y - 4} y2={y + 4} stroke="#ef4444" strokeWidth={1.5} />
          </g>
        );
      })}
    </g>
  );
};

// Custom tooltip for the stacked bar chart
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
  const capacity = payload[0]?.payload?.capacity ?? 0;
  const fillRate = capacity > 0 ? ((total / capacity) * 100).toFixed(0) : "—";
  return (
    <div className="rounded-md border border-border bg-background shadow-md px-3 py-2.5 text-xs space-y-1">
      <p className="font-semibold text-foreground text-sm">{label}</p>
      {payload.map((p: any) => p.value > 0 && (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: p.fill }} />
          <span className="text-muted-foreground capitalize">{p.name}</span>
          <span className="font-semibold ml-auto">{p.value.toLocaleString()} hd</span>
        </div>
      ))}
      <div className="border-t border-border pt-1 mt-1 flex justify-between gap-4">
        <span className="text-muted-foreground">Total</span>
        <span className="font-bold">{total.toLocaleString()}</span>
      </div>
      {capacity > 0 && (
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Capacity</span>
          <span>{capacity.toLocaleString()}</span>
        </div>
      )}
      {capacity > 0 && (
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Fill rate</span>
          <span className={Number(fillRate) > 100 ? "text-destructive font-bold" : "font-semibold"}>{fillRate}%</span>
        </div>
      )}
    </div>
  );
};

export default function ForwardPlan() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [speciesFilter, setSpeciesFilter] = useState("all");
  const [horizon, setHorizon] = useState("12");

  const today = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const weeks = parseInt(horizon);
      const startStr = format(today, "yyyy-MM-dd");
      const endStr   = format(addWeeks(today, weeks), "yyyy-MM-dd");

      const [{ data: bks }, { data: dps }] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, head_count, requested_kill_date, status, species, supplier_id, plant_id")
          .gte("requested_kill_date", startStr)
          .lte("requested_kill_date", endStr)
          .neq("status", "cancelled"),
        supabase
          .from("day_plans")
          .select("date, species, planned_head, plant_id")
          .gte("date", startStr)
          .lte("date", endStr),
      ]);

      setBookings((bks as Booking[]) || []);
      setDayPlans((dps as DayPlan[]) || []);
      setLoading(false);
    };
    fetchAll();
  }, [horizon, today]);

  // Build week buckets
  const weeks = useMemo(() => {
    const count = parseInt(horizon);
    return Array.from({ length: count }, (_, i) => {
      const ws = addWeeks(today, i);
      const we = endOfWeek(ws, { weekStartsOn: 1 });
      return { ws, we, label: format(ws, "d MMM") };
    });
  }, [horizon, today]);

  const chartData = useMemo((): WeekBucket[] => {
    if (loading) return [];
    const matchSpecies = (s: string | null) => {
      if (speciesFilter === "all") return true;
      const v = (s || "").toLowerCase();
      if (speciesFilter === "cattle") return v === "cattle" || v === "beef";
      return v === speciesFilter;
    };

    return weeks.map(({ ws, we, label }) => {
      const weekBks = bookings.filter(b => {
        if (!b.requested_kill_date) return false;
        const d = parseISO(b.requested_kill_date);
        return d >= ws && d <= we && matchSpecies(b.species);
      });

      const weekDps = dayPlans.filter(p => {
        const d = parseISO(p.date);
        return d >= ws && d <= we && matchSpecies(p.species);
      });

      const capacity = weekDps.reduce((sum, p) => sum + (p.planned_head || 0), 0);

      const bucket: WeekBucket = {
        weekLabel: label,
        weekStart: format(ws, "yyyy-MM-dd"),
        confirmed: 0,
        high: 0,
        medium: 0,
        low: 0,
        placeholder: 0,
        total: 0,
        capacity,
        fillRate: 0,
      };

      for (const b of weekBks) {
        const key = statusToBucket(b.status);
        bucket[key] += b.head_count || 0;
        bucket.total += b.head_count || 0;
      }

      bucket.fillRate = capacity > 0 ? (bucket.total / capacity) * 100 : 0;
      return bucket;
    });
  }, [bookings, dayPlans, weeks, loading, speciesFilter]);

  // Summary stats
  const totalBooked  = chartData.reduce((s, w) => s + w.total, 0);
  const totalCap     = chartData.reduce((s, w) => s + w.capacity, 0);
  const confirmedHd  = chartData.reduce((s, w) => s + w.confirmed, 0);
  const placeholderHd = chartData.reduce((s, w) => s + w.placeholder, 0);
  const overWeeks    = chartData.filter(w => w.capacity > 0 && w.total > w.capacity).length;
  const avgFill      = totalCap > 0 ? (totalBooked / totalCap) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Forward Volume Plan</h1>
            <p className="text-muted-foreground">
              Rolling volume by confidence level vs planned capacity — {horizon}-week horizon
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Species" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All species</SelectItem>
                <SelectItem value="cattle">Cattle</SelectItem>
                <SelectItem value="sheep">Sheep</SelectItem>
                <SelectItem value="lamb">Lamb</SelectItem>
              </SelectContent>
            </Select>
            <Select value={horizon} onValueChange={setHorizon}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Horizon" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="6">6 weeks</SelectItem>
                <SelectItem value="12">12 weeks</SelectItem>
                <SelectItem value="26">26 weeks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4" />
                Total booked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "—" : totalBooked.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-0.5">head across {horizon} weeks</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-blue-500" />
                Confirmed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700">{loading ? "—" : confirmedHd.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalBooked > 0 ? `${((confirmedHd / totalBooked) * 100).toFixed(0)}% of total` : "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Avg fill rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${avgFill > 100 ? "text-destructive" : avgFill >= 80 ? "text-emerald-600" : ""}`}>
                {loading || totalCap === 0 ? "—" : `${avgFill.toFixed(0)}%`}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">vs planned capacity</p>
            </CardContent>
          </Card>
          <Card className={overWeeks > 0 ? "border-destructive/50" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                {overWeeks > 0 && <AlertTriangle className="h-4 w-4 text-destructive" />}
                Over-capacity weeks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${overWeeks > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {loading ? "—" : overWeeks}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {placeholderHd.toLocaleString()} placeholder head to confirm
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stacked bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Head count by confidence level — {horizon}-week rolling
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Capacity legend note */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
              <svg width="24" height="10" className="shrink-0">
                <line x1="0" y1="5" x2="24" y2="5" stroke="#ef4444" strokeWidth="2" strokeDasharray="5 3" />
              </svg>
              <span>Dashed red line = planned capacity limit for that week</span>
            </div>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm animate-pulse">
                Loading volume data…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="weekLabel"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => v.toLocaleString()}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="square"
                    iconSize={10}
                    wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                    formatter={(val) => val.charAt(0).toUpperCase() + val.slice(1)}
                  />
                  <Bar dataKey="confirmed"   stackId="a" fill="#3b82f6" name="confirmed"   radius={[0,0,0,0]} />
                  <Bar dataKey="high"        stackId="a" fill="#10b981" name="high"        />
                  <Bar dataKey="medium"      stackId="a" fill="#f59e0b" name="medium"      />
                  <Bar dataKey="low"         stackId="a" fill="#facc15" name="low"         />
                  <Bar dataKey="placeholder" stackId="a" fill="#d1d5db" name="placeholder" radius={[4,4,0,0]} />
                  {/* Dashed red capacity line drawn per-bar using pixel-accurate scales */}
                  <Customized component={CapacityOverlay} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Week-by-week table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Week-by-week breakdown</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">Week of</th>
                  <th className="text-right py-2 px-3 font-medium text-blue-700">Confirmed</th>
                  <th className="text-right py-2 px-3 font-medium text-emerald-700">High</th>
                  <th className="text-right py-2 px-3 font-medium text-amber-700">Medium</th>
                  <th className="text-right py-2 px-3 font-medium text-yellow-700">Low</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Placeholder</th>
                  <th className="text-right py-2 px-3 font-medium">Total</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">Capacity</th>
                  <th className="text-right py-2 px-3 font-medium">Fill %</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="py-8 text-center text-muted-foreground">Loading…</td></tr>
                ) : chartData.map(w => {
                  const isOver = w.capacity > 0 && w.total > w.capacity;
                  return (
                    <tr
                      key={w.weekStart}
                      className={`border-b border-border/50 cursor-pointer hover:bg-muted/40 transition-colors ${isOver ? "bg-destructive/5 hover:bg-destructive/10" : ""}`}
                      onClick={() => navigate(`/bookings?week=${w.weekStart}`)}
                    >
                      <td className="py-2 px-3 font-medium">{w.weekLabel}</td>
                      <td className="py-2 px-3 text-right text-blue-700">{w.confirmed > 0 ? w.confirmed.toLocaleString() : "—"}</td>
                      <td className="py-2 px-3 text-right text-emerald-700">{w.high > 0 ? w.high.toLocaleString() : "—"}</td>
                      <td className="py-2 px-3 text-right text-amber-700">{w.medium > 0 ? w.medium.toLocaleString() : "—"}</td>
                      <td className="py-2 px-3 text-right text-yellow-700">{w.low > 0 ? w.low.toLocaleString() : "—"}</td>
                      <td className="py-2 px-3 text-right text-gray-500">{w.placeholder > 0 ? w.placeholder.toLocaleString() : "—"}</td>
                      <td className="py-2 px-3 text-right font-semibold">{w.total > 0 ? w.total.toLocaleString() : "—"}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{w.capacity > 0 ? w.capacity.toLocaleString() : "—"}</td>
                      <td className={`py-2 px-3 text-right font-bold ${isOver ? "text-destructive" : w.fillRate >= 80 ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {w.capacity > 0 ? `${w.fillRate.toFixed(0)}%` : "—"}
                        {isOver && " ⚠"}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span className="text-xs font-semibold text-primary underline whitespace-nowrap">
                          {isOver ? "Resolve →" : "View →"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {!loading && chartData.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-border font-semibold bg-muted/30">
                    <td className="py-2 px-3">Total</td>
                    <td className="py-2 px-3 text-right text-blue-700">{chartData.reduce((s,w)=>s+w.confirmed,0).toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-emerald-700">{chartData.reduce((s,w)=>s+w.high,0).toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-amber-700">{chartData.reduce((s,w)=>s+w.medium,0).toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-yellow-700">{chartData.reduce((s,w)=>s+w.low,0).toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-gray-500">{chartData.reduce((s,w)=>s+w.placeholder,0).toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">{totalBooked.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">{totalCap > 0 ? totalCap.toLocaleString() : "—"}</td>
                    <td className={`py-2 px-3 text-right ${avgFill > 100 ? "text-destructive" : avgFill >= 80 ? "text-emerald-600" : ""}`}>
                      {totalCap > 0 ? `${avgFill.toFixed(0)}%` : "—"}
                    </td>
                    <td className="py-2 px-3"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
