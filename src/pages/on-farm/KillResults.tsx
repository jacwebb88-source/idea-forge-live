import { useState, useEffect, useMemo } from "react";
import { LivestockLayout } from "@/components/LivestockLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp, TrendingDown, CheckCircle, AlertTriangle,
  ChevronDown, ChevronUp, Award, Scale, DollarSign,
  Activity, Info, Beef,
} from "lucide-react";
import { format, subDays, parseISO } from "date-fns";

// ─── Benchmarks (industry averages) ─────────────────────────────────────────

const BENCH = {
  hscw_kg: 305,
  ph_pass_rate: 94,      // %
  msa_rate: 88,          // %
  dressing_pct: 57,      // %
};

const PH_FAIL_THRESHOLD = 5.70;

// ─── Types ────────────────────────────────────────────────────────────────────

interface KillGrade {
  id: string;
  booking_id: string;
  hscw_kg: number | null;
  dressing_pct: number | null;
  ph_reading: number | null;
  fat_depth_mm: number | null;
  ema_cm2: number | null;
  marbling_score: number | null;
  msa_grade: string | null;
  msa_index: number | null;
  dentition: string | null;
  price_per_kg: number | null;
  total_value: number | null;
  graded_at: string | null;
  notes: string | null;
}

interface Booking {
  id: string;
  booking_ref: string | null;
  supplier_name: string | null;
  requested_kill_date: string | null;
  species: string | null;
  head_count: number | null;
  plant_id: string | null;
  plant_name?: string | null;
}

interface BookingRollup {
  booking: Booking;
  grades: KillGrade[];
  head: number;
  avgHscw: number;
  avgPh: number | null;
  phPassPct: number | null;
  msaPct: number;
  avgPricePerKg: number | null;
  totalValue: number;
  gradeCounts: Record<string, number>;
  gradeBreakdown: GradeSlice[];
}

interface GradeSlice {
  label: string;
  count: number;
  pct: number;
  color: string;
  bg: string;
}

// ─── Demo data ────────────────────────────────────────────────────────────────

function buildDemoData(): BookingRollup[] {
  const kill1 = buildDemoRollup({
    id: "bk-001",
    booking_ref: "TW-20250515",
    supplier_name: "Webb Pastoral",
    requested_kill_date: "2025-05-15",
    plant_name: "Toowoomba Processing",
    head: 180,
    avgHscw: 318,
    avgPh: 5.51,
    phPassPct: 98,
    msaPct: 94,
    gradePcts: { "MSA 4": 61, "MSA 5": 33, "MSA 3": 6 },
    avgPricePerKg: 8.92,
    totalValue: 181699,
  });

  const kill2 = buildDemoRollup({
    id: "bk-002",
    booking_ref: "TW-20250428",
    supplier_name: "Webb Pastoral",
    requested_kill_date: "2025-04-28",
    plant_name: "Toowoomba Processing",
    head: 220,
    avgHscw: 295,
    avgPh: 5.63,
    phPassPct: 91,
    msaPct: 87,
    gradePcts: { "MSA 4": 70, "MSA 3": 17, "Non-MSA": 13 },
    avgPricePerKg: 8.21,
    totalValue: 140419,
  });

  const kill3 = buildDemoRollup({
    id: "bk-003",
    booking_ref: "TW-20250410",
    supplier_name: "Webb Pastoral",
    requested_kill_date: "2025-04-10",
    plant_name: "Toowoomba Processing",
    head: 95,
    avgHscw: 342,
    avgPh: 5.48,
    phPassPct: 100,
    msaPct: 100,
    gradePcts: { "MSA 6": 75, "MSA 5": 20, "MSA 4": 5 },
    avgPricePerKg: 13.80,
    totalValue: 223689,
  });

  return [kill1, kill2, kill3];
}

function buildDemoRollup(d: {
  id: string;
  booking_ref: string;
  supplier_name: string;
  requested_kill_date: string;
  plant_name: string;
  head: number;
  avgHscw: number;
  avgPh: number;
  phPassPct: number;
  msaPct: number;
  gradePcts: Record<string, number>;
  avgPricePerKg: number;
  totalValue: number;
}): BookingRollup {
  const booking: Booking = {
    id: d.id,
    booking_ref: d.booking_ref,
    supplier_name: d.supplier_name,
    requested_kill_date: d.requested_kill_date,
    species: "Cattle",
    head_count: d.head,
    plant_id: "plant-1",
    plant_name: d.plant_name,
  };

  const gradeBreakdown = buildGradeBreakdown(d.gradePcts, d.head);
  const gradeCounts: Record<string, number> = {};
  for (const [label, pct] of Object.entries(d.gradePcts)) {
    gradeCounts[label] = Math.round((pct / 100) * d.head);
  }

  return {
    booking,
    grades: [],
    head: d.head,
    avgHscw: d.avgHscw,
    avgPh: d.avgPh,
    phPassPct: d.phPassPct,
    msaPct: d.msaPct,
    avgPricePerKg: d.avgPricePerKg,
    totalValue: d.totalValue,
    gradeCounts,
    gradeBreakdown,
  };
}

const GRADE_CONFIG: Record<string, { color: string; bg: string; bar: string }> = {
  "MSA 6":   { color: "text-amber-700",  bg: "bg-amber-100",  bar: "bg-amber-400" },
  "MSA 5":   { color: "text-green-700",  bg: "bg-green-100",  bar: "bg-green-500" },
  "MSA 4":   { color: "text-blue-700",   bg: "bg-blue-100",   bar: "bg-blue-500"  },
  "MSA 3":   { color: "text-slate-600",  bg: "bg-slate-100",  bar: "bg-slate-400" },
  "Non-MSA": { color: "text-red-700",    bg: "bg-red-100",    bar: "bg-red-500"   },
};

function buildGradeBreakdown(gradePcts: Record<string, number>, head: number): GradeSlice[] {
  return Object.entries(gradePcts).map(([label, pct]) => ({
    label,
    count: Math.round((pct / 100) * head),
    pct,
    color: GRADE_CONFIG[label]?.color ?? "text-slate-600",
    bg: GRADE_CONFIG[label]?.bg ?? "bg-slate-100",
  }));
}

// ─── Aggregation helpers ──────────────────────────────────────────────────────

function rollupFromDb(booking: Booking, grades: KillGrade[]): BookingRollup {
  const head = grades.length;
  const hscws = grades.map((g) => g.hscw_kg).filter(Boolean) as number[];
  const avgHscw = hscws.length ? hscws.reduce((a, b) => a + b, 0) / hscws.length : 0;

  const phs = grades.map((g) => g.ph_reading).filter(Boolean) as number[];
  const avgPh = phs.length ? phs.reduce((a, b) => a + b, 0) / phs.length : null;
  const phPasses = phs.filter((p) => p <= PH_FAIL_THRESHOLD).length;
  const phPassPct = phs.length ? (phPasses / phs.length) * 100 : null;

  const msaGrades = grades.map((g) => g.msa_grade).filter(Boolean) as string[];
  const msaCount = msaGrades.filter((g) => g !== "Non-MSA").length;
  const msaPct = grades.length ? (msaCount / grades.length) * 100 : 0;

  const prices = grades.map((g) => g.price_per_kg).filter(Boolean) as number[];
  const avgPricePerKg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;

  const totalValue = grades
    .map((g) => g.total_value ?? 0)
    .reduce((a, b) => a + b, 0);

  const gradeCounts: Record<string, number> = {};
  for (const grade of msaGrades) {
    gradeCounts[grade] = (gradeCounts[grade] ?? 0) + 1;
  }

  const gradePcts: Record<string, number> = {};
  for (const [label, count] of Object.entries(gradeCounts)) {
    gradePcts[label] = grades.length ? (count / grades.length) * 100 : 0;
  }

  const gradeBreakdown = buildGradeBreakdown(gradePcts, head);

  return {
    booking,
    grades,
    head,
    avgHscw,
    avgPh,
    phPassPct,
    msaPct,
    avgPricePerKg,
    totalValue,
    gradeCounts,
    gradeBreakdown,
  };
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function fmt$(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  try { return format(parseISO(s), "d MMM yyyy"); } catch { return s; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="bg-white border border-slate-200 shadow-sm">
      <CardContent className="pt-5 pb-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function GradeBar({ breakdown }: { breakdown: GradeSlice[] }) {
  const order = ["MSA 6", "MSA 5", "MSA 4", "MSA 3", "Non-MSA"];
  const sorted = [...breakdown].sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-8 rounded-lg overflow-hidden w-full gap-px">
        {sorted.map((s) =>
          s.pct > 0 ? (
            <div
              key={s.label}
              style={{ width: `${s.pct}%` }}
              className={`${GRADE_CONFIG[s.label]?.bar ?? "bg-slate-400"} transition-all`}
              title={`${s.label}: ${s.pct.toFixed(0)}%`}
            />
          ) : null
        )}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {sorted.map((s) =>
          s.pct > 0 ? (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-sm ${GRADE_CONFIG[s.label]?.bar ?? "bg-slate-400"}`} />
              <span className="text-xs text-slate-600 font-medium">
                {s.label} — {s.count} head ({s.pct.toFixed(0)}%)
              </span>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

function BenchmarkCard({
  label,
  yours,
  benchmark,
  unit,
  higherIsBetter = true,
  formatFn,
}: {
  label: string;
  yours: number;
  benchmark: number;
  unit: string;
  higherIsBetter?: boolean;
  formatFn?: (n: number) => string;
}) {
  const fmt = formatFn ?? ((n: number) => `${n.toFixed(1)}${unit}`);
  const diff = yours - benchmark;
  const isGood = higherIsBetter ? diff >= 0 : diff <= 0;

  return (
    <Card className={`border ${isGood ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"} shadow-sm`}>
      <CardContent className="pt-5 pb-4">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{label}</p>
        <div className="flex items-end gap-3">
          <span className="text-2xl font-bold text-slate-900">{fmt(yours)}</span>
          <div className={`flex items-center gap-1 text-sm font-semibold mb-0.5 ${isGood ? "text-green-600" : "text-red-600"}`}>
            {isGood ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {diff >= 0 ? "+" : ""}{fmt(diff)}
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-1.5">Industry benchmark: <span className="font-medium">{fmt(benchmark)}</span></p>
        <div className="mt-2">
          <Progress value={Math.min(100, (yours / (benchmark * 1.3)) * 100)} className="h-1.5" />
        </div>
      </CardContent>
    </Card>
  );
}

function InsightCard({
  icon,
  title,
  body,
  type,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  type: "ok" | "warn" | "info";
}) {
  const styles = {
    ok: "border-green-200 bg-green-50",
    warn: "border-amber-200 bg-amber-50",
    info: "border-blue-200 bg-blue-50",
  };
  const iconStyles = {
    ok: "text-green-600",
    warn: "text-amber-600",
    info: "text-blue-600",
  };

  return (
    <Card className={`border ${styles[type]} shadow-sm`}>
      <CardContent className="pt-5 pb-4 flex gap-3">
        <div className={`mt-0.5 ${iconStyles[type]}`}>{icon}</div>
        <div>
          <p className="text-sm font-semibold text-slate-800 mb-1">{title}</p>
          <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Kill History Row ─────────────────────────────────────────────────────────

function KillRow({ rollup }: { rollup: BookingRollup }) {
  const [expanded, setExpanded] = useState(false);
  const { booking: bk } = rollup;

  const phColor = rollup.phPassPct != null
    ? rollup.phPassPct >= BENCH.ph_pass_rate ? "text-green-600" : "text-red-600"
    : "text-slate-400";

  const msaColor = rollup.msaPct >= BENCH.msa_rate ? "text-green-600" : "text-amber-600";
  const hscwColor = rollup.avgHscw >= BENCH.hscw_kg ? "text-green-600" : "text-amber-600";

  return (
    <>
      <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
        <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">{fmtDate(bk.requested_kill_date)}</td>
        <td className="py-3 px-4 text-sm text-slate-700">{bk.plant_name ?? "—"}</td>
        <td className="py-3 px-4 text-sm font-mono text-slate-600">{bk.booking_ref ?? "—"}</td>
        <td className="py-3 px-4 text-sm text-slate-700 text-right">{rollup.head}</td>
        <td className={`py-3 px-4 text-sm font-semibold text-right ${hscwColor}`}>
          {rollup.avgHscw.toFixed(0)} kg
        </td>
        <td className="py-3 px-4 text-sm text-slate-700 text-right">
          {rollup.avgPh != null ? rollup.avgPh.toFixed(2) : "—"}
        </td>
        <td className={`py-3 px-4 text-sm font-semibold text-right ${phColor}`}>
          {rollup.phPassPct != null ? `${rollup.phPassPct.toFixed(0)}%` : "—"}
        </td>
        <td className={`py-3 px-4 text-sm font-semibold text-right ${msaColor}`}>
          {rollup.msaPct.toFixed(0)}%
        </td>
        <td className="py-3 px-4 text-sm text-slate-700 text-right">
          {rollup.avgPricePerKg != null ? `$${rollup.avgPricePerKg.toFixed(2)}` : "—"}
        </td>
        <td className="py-3 px-4 text-sm font-semibold text-slate-900 text-right">
          {fmt$(rollup.totalValue)}
        </td>
        <td className="py-3 px-4 text-right">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-slate-500 hover:text-slate-800"
            onClick={() => setExpanded((v) => !v)}
          >
            Details {expanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
          </Button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-slate-100">
          <td colSpan={11} className="bg-slate-50 px-4 py-4">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Grade Breakdown</p>
              <GradeBar breakdown={rollup.gradeBreakdown} />
              {rollup.grades.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="text-xs w-full border-collapse">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-200">
                        <th className="py-1.5 pr-4">HSCW (kg)</th>
                        <th className="py-1.5 pr-4">Dress %</th>
                        <th className="py-1.5 pr-4">pH</th>
                        <th className="py-1.5 pr-4">Fat (mm)</th>
                        <th className="py-1.5 pr-4">EMA (cm²)</th>
                        <th className="py-1.5 pr-4">MSA Grade</th>
                        <th className="py-1.5 pr-4">MSA Index</th>
                        <th className="py-1.5 pr-4">Dentition</th>
                        <th className="py-1.5 pr-4">$/kg</th>
                        <th className="py-1.5">Total Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rollup.grades.map((g) => (
                        <tr key={g.id} className="border-b border-slate-100 text-slate-700">
                          <td className="py-1.5 pr-4">{g.hscw_kg ?? "—"}</td>
                          <td className="py-1.5 pr-4">{g.dressing_pct != null ? `${g.dressing_pct}%` : "—"}</td>
                          <td className={`py-1.5 pr-4 font-medium ${g.ph_reading != null && g.ph_reading > PH_FAIL_THRESHOLD ? "text-red-600" : "text-green-600"}`}>
                            {g.ph_reading ?? "—"}
                          </td>
                          <td className="py-1.5 pr-4">{g.fat_depth_mm ?? "—"}</td>
                          <td className="py-1.5 pr-4">{g.ema_cm2 ?? "—"}</td>
                          <td className="py-1.5 pr-4">
                            {g.msa_grade ? (
                              <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${GRADE_CONFIG[g.msa_grade]?.bg ?? "bg-slate-100"} ${GRADE_CONFIG[g.msa_grade]?.color ?? "text-slate-600"}`}>
                                {g.msa_grade}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="py-1.5 pr-4">{g.msa_index ?? "—"}</td>
                          <td className="py-1.5 pr-4">{g.dentition ?? "—"}</td>
                          <td className="py-1.5 pr-4">{g.price_per_kg != null ? `$${g.price_per_kg.toFixed(2)}` : "—"}</td>
                          <td className="py-1.5">{g.total_value != null ? fmt$(g.total_value) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function KillResults() {
  const [dayRange, setDayRange] = useState<number | null>(90);
  const [rollups, setRollups] = useState<BookingRollup[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const cutoff = dayRange ? subDays(new Date(), dayRange).toISOString() : null;

        // Fetch bookings
        let bookingQuery = supabase
          .from("bookings")
          .select("id, booking_ref, supplier_name, requested_kill_date, species, head_count, plant_id");
        if (cutoff) {
          bookingQuery = bookingQuery.gte("requested_kill_date", cutoff.slice(0, 10));
        }
        const { data: bookingsRaw } = await bookingQuery;

        if (!bookingsRaw || bookingsRaw.length === 0) {
          setRollups(buildDemoData());
          setUsingDemo(true);
          setLoading(false);
          return;
        }

        // Fetch plants for names
        const plantIds = [...new Set(bookingsRaw.map((b) => b.plant_id).filter(Boolean))];
        let plantMap: Record<string, string> = {};
        if (plantIds.length > 0) {
          const { data: plants } = await supabase
            .from("plants")
            .select("id, plant_name")
            .in("id", plantIds as string[]);
          if (plants) {
            for (const p of plants) {
              plantMap[p.id] = p.plant_name;
            }
          }
        }

        const bookings: Booking[] = bookingsRaw.map((b) => ({
          ...b,
          plant_name: b.plant_id ? (plantMap[b.plant_id] ?? null) : null,
        }));

        // Fetch kill grades for these bookings
        const bookingIds = bookings.map((b) => b.id);
        const { data: grades } = await supabase
          .from("kill_grades")
          .select("*")
          .in("booking_id", bookingIds);

        if (!grades || grades.length === 0) {
          setRollups(buildDemoData());
          setUsingDemo(true);
          setLoading(false);
          return;
        }

        // Group grades by booking
        const gradesByBooking: Record<string, KillGrade[]> = {};
        for (const g of grades) {
          if (!gradesByBooking[g.booking_id]) gradesByBooking[g.booking_id] = [];
          gradesByBooking[g.booking_id].push(g as KillGrade);
        }

        const computed = bookings
          .filter((b) => gradesByBooking[b.id]?.length > 0)
          .map((b) => rollupFromDb(b, gradesByBooking[b.id]))
          .sort((a, b) =>
            (b.booking.requested_kill_date ?? "").localeCompare(a.booking.requested_kill_date ?? "")
          );

        if (computed.length === 0) {
          setRollups(buildDemoData());
          setUsingDemo(true);
        } else {
          setRollups(computed);
          setUsingDemo(false);
        }
      } catch (err) {
        console.error("KillResults load error:", err);
        setRollups(buildDemoData());
        setUsingDemo(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dayRange]);

  // ── Aggregate KPIs across all rollups ──────────────────────────────────────

  const totalHead = rollups.reduce((s, r) => s + r.head, 0);

  const avgHscw = useMemo(() => {
    const total = rollups.reduce((s, r) => s + r.avgHscw * r.head, 0);
    return totalHead > 0 ? total / totalHead : 0;
  }, [rollups, totalHead]);

  const avgMsaIndex = useMemo(() => {
    const all = rollups.flatMap((r) =>
      r.grades.map((g) => g.msa_index).filter((x) => x != null) as number[]
    );
    return all.length > 0 ? all.reduce((a, b) => a + b, 0) / all.length : null;
  }, [rollups]);

  const totalRevenue = rollups.reduce((s, r) => s + r.totalValue, 0);

  const overallPhPassPct = useMemo(() => {
    const weighted = rollups
      .filter((r) => r.phPassPct != null)
      .reduce((s, r) => s + (r.phPassPct! / 100) * r.head, 0);
    const headWithPh = rollups.filter((r) => r.phPassPct != null).reduce((s, r) => s + r.head, 0);
    return headWithPh > 0 ? (weighted / headWithPh) * 100 : null;
  }, [rollups]);

  const overallMsaPct = useMemo(() => {
    const weighted = rollups.reduce((s, r) => s + (r.msaPct / 100) * r.head, 0);
    return totalHead > 0 ? (weighted / totalHead) * 100 : 0;
  }, [rollups, totalHead]);

  // ── Combined grade breakdown across all rollups ─────────────────────────────

  const combinedGradeBreakdown = useMemo((): GradeSlice[] => {
    const counts: Record<string, number> = {};
    for (const r of rollups) {
      for (const [label, count] of Object.entries(r.gradeCounts)) {
        counts[label] = (counts[label] ?? 0) + count;
      }
    }
    return Object.entries(counts).map(([label, count]) => ({
      label,
      count,
      pct: totalHead > 0 ? (count / totalHead) * 100 : 0,
      color: GRADE_CONFIG[label]?.color ?? "text-slate-600",
      bg: GRADE_CONFIG[label]?.bg ?? "bg-slate-100",
    }));
  }, [rollups, totalHead]);

  // ── Grading insights ────────────────────────────────────────────────────────

  const phFails = useMemo(() => {
    return rollups.flatMap((r) =>
      r.grades.filter((g) => g.ph_reading != null && g.ph_reading > PH_FAIL_THRESHOLD)
    ).length;
  }, [rollups]);

  const oldDentitionCount = useMemo(() => {
    const OLD = ["4-tooth", "6-tooth", "8-tooth", "Full mouth", "4T", "6T", "8T", "FM"];
    return rollups.flatMap((r) =>
      r.grades.filter((g) => g.dentition && OLD.some((d) => g.dentition!.toLowerCase().includes(d.toLowerCase())))
    ).length;
  }, [rollups]);

  const avgFat = useMemo(() => {
    const vals = rollups.flatMap((r) =>
      r.grades.map((g) => g.fat_depth_mm).filter((x) => x != null) as number[]
    );
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }, [rollups]);

  // Demo-mode insight flags (when no individual grade records)
  const demoPhFails = usingDemo
    ? rollups
        .filter((r) => r.phPassPct != null && r.phPassPct < 100)
        .reduce((s, r) => s + Math.round(((100 - r.phPassPct!) / 100) * r.head), 0)
    : phFails;

  const showPhInsight = demoPhFails > 0 || phFails > 0;
  const showDentitionInsight = oldDentitionCount > 0;
  const showFatInsight = avgFat != null && avgFat < 8;
  const demoAvgFat = usingDemo ? 6.8 : avgFat;
  const showDemoFatInsight = usingDemo || showFatInsight;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <LivestockLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Beef className="w-6 h-6 text-green-600" />
              <h1 className="text-2xl font-bold text-slate-900">Kill Results</h1>
              {usingDemo && (
                <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                  Demo Data
                </Badge>
              )}
            </div>
            <p className="text-slate-500 text-sm">Your grading outcomes — direct from the processor</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Period:</span>
            <Select
              value={dayRange?.toString() ?? "all"}
              onValueChange={(v) => setDayRange(v === "all" ? null : parseInt(v))}
            >
              <SelectTrigger className="w-36 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 180 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-slate-400 text-sm animate-pulse">Loading kill results…</div>
          </div>
        ) : (
          <>
            {/* KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                label="Total Head Killed"
                value={totalHead.toLocaleString()}
                sub={`across ${rollups.length} kill run${rollups.length !== 1 ? "s" : ""}`}
              />
              <KPICard
                label="Avg HSCW"
                value={avgHscw > 0 ? `${avgHscw.toFixed(0)} kg` : "—"}
                sub={`Benchmark: ${BENCH.hscw_kg} kg`}
              />
              <KPICard
                label="Avg MSA Index"
                value={avgMsaIndex != null ? avgMsaIndex.toFixed(1) : usingDemo ? "64.2" : "—"}
                sub="Higher = more tender"
              />
              <KPICard
                label="Total Revenue"
                value={totalRevenue > 0 ? fmt$(totalRevenue) : "—"}
                sub="All kill runs in period"
              />
            </div>

            {/* MSA Grade Breakdown */}
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  MSA Grade Breakdown — {totalHead} head
                </CardTitle>
              </CardHeader>
              <CardContent>
                {combinedGradeBreakdown.length > 0 ? (
                  <GradeBar breakdown={combinedGradeBreakdown} />
                ) : (
                  <p className="text-sm text-slate-400">No grade data available.</p>
                )}
              </CardContent>
            </Card>

            {/* Performance vs Benchmark */}
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Performance vs Industry Benchmark
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <BenchmarkCard
                  label="Avg HSCW"
                  yours={avgHscw > 0 ? avgHscw : usingDemo ? 315 : 0}
                  benchmark={BENCH.hscw_kg}
                  unit=" kg"
                  higherIsBetter
                  formatFn={(n) => `${n.toFixed(0)} kg`}
                />
                <BenchmarkCard
                  label="pH Pass Rate"
                  yours={overallPhPassPct ?? (usingDemo ? 96.8 : BENCH.ph_pass_rate)}
                  benchmark={BENCH.ph_pass_rate}
                  unit="%"
                  higherIsBetter
                  formatFn={(n) => `${n.toFixed(1)}%`}
                />
                <BenchmarkCard
                  label="MSA Compliance"
                  yours={overallMsaPct > 0 ? overallMsaPct : usingDemo ? 93.5 : 0}
                  benchmark={BENCH.msa_rate}
                  unit="%"
                  higherIsBetter
                  formatFn={(n) => `${n.toFixed(1)}%`}
                />
              </div>
            </div>

            {/* Kill History Table */}
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-500" />
                  Kill History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        <th className="py-3 px-4">Kill Date</th>
                        <th className="py-3 px-4">Plant</th>
                        <th className="py-3 px-4">Booking Ref</th>
                        <th className="py-3 px-4 text-right">Head</th>
                        <th className="py-3 px-4 text-right">Avg HSCW</th>
                        <th className="py-3 px-4 text-right">Avg pH</th>
                        <th className="py-3 px-4 text-right">pH Pass %</th>
                        <th className="py-3 px-4 text-right">MSA %</th>
                        <th className="py-3 px-4 text-right">Avg $/kg</th>
                        <th className="py-3 px-4 text-right">Total Value</th>
                        <th className="py-3 px-4" />
                      </tr>
                    </thead>
                    <tbody>
                      {rollups.map((r) => (
                        <KillRow key={r.booking.id} rollup={r} />
                      ))}
                    </tbody>
                  </table>
                  {rollups.length === 0 && (
                    <div className="py-16 text-center text-slate-400 text-sm">
                      No kill results found for this period.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Grading Insights */}
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Grading Insights
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* pH */}
                {showPhInsight ? (
                  <InsightCard
                    icon={<AlertTriangle className="w-5 h-5" />}
                    title="pH Management"
                    body={`${demoPhFails} animal${demoPhFails !== 1 ? "s" : ""} failed pH (>${PH_FAIL_THRESHOLD.toFixed(2)}). Consider reducing pre-slaughter stress — allow 24 hr lairage rest before kill.`}
                    type="warn"
                  />
                ) : (
                  <InsightCard
                    icon={<CheckCircle className="w-5 h-5" />}
                    title="pH Management"
                    body="All animals passed pH threshold. Good lairage and low-stress handling is maintaining carcase quality."
                    type="ok"
                  />
                )}

                {/* Dentition */}
                {showDentitionInsight ? (
                  <InsightCard
                    icon={<AlertTriangle className="w-5 h-5" />}
                    title="Dentition Alert"
                    body={`${oldDentitionCount} animal${oldDentitionCount !== 1 ? "s" : ""} were 4-tooth or older. EU market requires 0–2 tooth. Consider earlier turn-off to preserve export eligibility.`}
                    type="warn"
                  />
                ) : (
                  <InsightCard
                    icon={<CheckCircle className="w-5 h-5" />}
                    title="Dentition"
                    body="Dentition profile is within EU market spec. Animals are being turned off at appropriate weights and ages."
                    type="ok"
                  />
                )}

                {/* Fat score */}
                {showDemoFatInsight ? (
                  <InsightCard
                    icon={<Scale className="w-5 h-5" />}
                    title="Fat Score Optimisation"
                    body={`Avg fat depth ${(demoAvgFat ?? avgFat ?? 0).toFixed(1)} mm — below grid target of 8 mm. Consider extending feeding program by 2–3 weeks to improve MSA compliance and $/kg.`}
                    type="warn"
                  />
                ) : (
                  <InsightCard
                    icon={<CheckCircle className="w-5 h-5" />}
                    title="Fat Score"
                    body={`Avg fat depth ${avgFat?.toFixed(1)} mm — within grid target range. Animals are finishing to specification.`}
                    type="ok"
                  />
                )}
              </div>
            </div>

            {/* Footer note */}
            <p className="text-xs text-slate-400 text-center pb-4">
              Grading data sourced directly from processing plant — Muster Intelligence.
              {usingDemo && " Showing representative demo data — connect your processor integration to see live results."}
            </p>
          </>
        )}
      </div>
    </LivestockLayout>
  );
}
