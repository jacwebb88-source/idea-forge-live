import { useState, useEffect } from "react";
import { LivestockLayout } from "@/components/LivestockLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useMobs } from "@/components/on-farm/useMobs";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { CalendarDays, TrendingUp, Edit3, Save, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const YEAR = 2026;

const SEASONAL_TIPS: Record<number, string> = {
  1: "Hot & dry — run lean, high supplementary cost risk",
  2: "Sell down before autumn break",
  3: "Pre-break buy window — forced sellers, best prices",
  4: "Post-break — grass on, buy heavily",
  5: "Peak stocking — maximise pasture utilisation",
  6: "Begin shipping lots to hit kill windows",
  7: "Ship grain-fed lots — optimal weight",
  8: "Sell heifers, reduce ahead of winter",
  9: "Spring — hold breeding stock, watch prices",
  10: "Expensive month — run minimum numbers",
  11: "Opportunity buys if season turns dry",
  12: "Restock pre-summer on good seasons",
};

interface PlanRow { month: number; target_head_count: number; notes: string; id?: string; }

export default function SeasonalPlan() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { mobs } = useMobs();
  const [cattlePlan, setCattlePlan] = useState<PlanRow[]>(MONTHS.map((_, i) => ({ month: i + 1, target_head_count: 0, notes: "" })));
  const [sheepPlan, setSheepPlan] = useState<PlanRow[]>(MONTHS.map((_, i) => ({ month: i + 1, target_head_count: 0, notes: "" })));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [species, setSpecies] = useState<"cattle" | "sheep">("cattle");

  // Compute actual head count per month from active mobs (based on purchase date)
  const actualByMonth: Record<string, number> = {};
  MONTHS.forEach((_, i) => { actualByMonth[i + 1] = 0; });
  mobs.filter(m => m.status === "active").forEach(mob => {
    if (!mob.purchase_date) return;
    const buyMonth = new Date(mob.purchase_date).getMonth() + 1;
    const exitMonth = mob.target_exit_date ? new Date(mob.target_exit_date).getMonth() + 1 : 12;
    const mobSpecies = mob.species === "sheep" ? "sheep" : "cattle";
    for (let m = buyMonth; m <= exitMonth; m++) {
      if (mobSpecies === species) {
        actualByMonth[m] = (actualByMonth[m] || 0) + mob.head_count;
      }
    }
  });

  useEffect(() => {
    async function load() {
      if (!user) return;
      const { data } = await (supabase as any)
        .from("seasonal_plan")
        .select("*")
        .eq("owner_id", user.id)
        .eq("plan_year", YEAR)
        .order("month");
      if (!data?.length) return;
      const cattle = MONTHS.map((_, i) => {
        const row = data.find((d: any) => d.month === i + 1 && d.species === "cattle");
        return { month: i + 1, target_head_count: row?.target_head_count ?? 0, notes: row?.notes ?? "", id: row?.id };
      });
      const sheep = MONTHS.map((_, i) => {
        const row = data.find((d: any) => d.month === i + 1 && d.species === "sheep");
        return { month: i + 1, target_head_count: row?.target_head_count ?? 0, notes: row?.notes ?? "", id: row?.id };
      });
      setCattlePlan(cattle);
      setSheepPlan(sheep);
    }
    load();
  }, [user]);

  const plan = species === "cattle" ? cattlePlan : sheepPlan;
  const setPlan = species === "cattle" ? setCattlePlan : setSheepPlan;

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    for (const row of plan) {
      await (supabase as any).from("seasonal_plan").upsert({
        ...(row.id ? { id: row.id } : {}),
        owner_id: user.id,
        plan_year: YEAR,
        month: row.month,
        species,
        target_head_count: row.target_head_count,
        notes: row.notes,
      }, { onConflict: "owner_id,plan_year,month,species" });
    }
    setSaving(false);
    setEditing(false);
    toast({ title: "Seasonal plan saved ✅" });
  }

  const chartData = MONTHS.map((label, i) => ({
    month: label,
    Target: plan[i].target_head_count,
    Actual: actualByMonth[i + 1] || 0,
  }));

  const currentMonth = new Date().getMonth() + 1;
  const currentTarget = plan[currentMonth - 1]?.target_head_count ?? 0;
  const currentActual = actualByMonth[currentMonth] ?? 0;
  const variance = currentActual - currentTarget;

  return (
    <LivestockLayout>
      <div className="space-y-6 max-w-4xl mx-auto">

        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-extrabold">Seasonal Stocking Plan</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Set your target head count for each month. Compare planned vs actual to stay on strategy.
          </p>
        </div>

        {/* Species toggle */}
        <div className="flex gap-2">
          {(["cattle","sheep"] as const).map(s => (
            <button key={s} onClick={() => setSpecies(s)}
              className={`text-sm font-semibold px-4 py-1.5 rounded-full border transition-colors capitalize ${species === s ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground"}`}>
              {s}
            </button>
          ))}
        </div>

        {/* Current month summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border bg-white p-4 text-center">
            <p className="text-xs text-muted-foreground font-medium mb-1">This month target</p>
            <p className="text-3xl font-black">{currentTarget.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">head</p>
          </div>
          <div className="rounded-2xl border bg-white p-4 text-center">
            <p className="text-xs text-muted-foreground font-medium mb-1">Actual on hand</p>
            <p className="text-3xl font-black">{currentActual.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">head</p>
          </div>
          <div className={`rounded-2xl border p-4 text-center ${variance > 0 ? "bg-amber-50 border-amber-200" : variance < 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
            <p className="text-xs text-muted-foreground font-medium mb-1">Variance</p>
            <p className={`text-3xl font-black ${variance > 0 ? "text-amber-700" : variance < 0 ? "text-red-700" : "text-green-700"}`}>
              {variance > 0 ? "+" : ""}{variance.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{variance > 0 ? "over plan" : variance < 0 ? "under plan" : "on plan"}</p>
          </div>
        </div>

        {/* Seasonal tip */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-2 text-sm text-blue-800">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <p><strong>{MONTHS[currentMonth - 1]}:</strong> {SEASONAL_TIPS[currentMonth]}</p>
        </div>

        {/* Chart */}
        <div className="rounded-2xl border bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-sm">Target vs Actual — {YEAR}</p>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => v.toLocaleString()} />
              <Legend />
              <ReferenceLine x={MONTHS[currentMonth - 1]} stroke="#6366f1" strokeDasharray="4 4" label={{ value: "Now", position: "top", fontSize: 10 }} />
              <Bar dataKey="Target" fill="#e2e8f0" radius={[4,4,0,0]} />
              <Bar dataKey="Actual" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly plan table */}
        <div className="rounded-2xl border bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <p className="font-bold text-sm">Monthly targets — {species}</p>
            {editing ? (
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="h-3.5 w-3.5" />{saving ? "Saving…" : "Save plan"}
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-2">
                <Edit3 className="h-3.5 w-3.5" />Edit targets
              </Button>
            )}
          </div>
          <div className="divide-y">
            {plan.map((row, i) => {
              const actual = actualByMonth[i + 1] || 0;
              const v = actual - row.target_head_count;
              const isCurrent = i + 1 === currentMonth;
              return (
                <div key={i} className={`flex items-center gap-4 px-5 py-3 ${isCurrent ? "bg-indigo-50" : ""}`}>
                  <div className="w-10 text-sm font-bold text-muted-foreground">{MONTHS[i]}</div>
                  {editing ? (
                    <Input
                      type="number"
                      value={row.target_head_count}
                      onChange={e => setPlan(prev => prev.map((r, idx) => idx === i ? { ...r, target_head_count: parseInt(e.target.value) || 0 } : r))}
                      className="w-24 h-8 text-sm rounded-lg"
                    />
                  ) : (
                    <div className="w-24 text-sm font-semibold">{row.target_head_count.toLocaleString()} hd</div>
                  )}
                  <div className="text-xs text-muted-foreground w-24">Actual: {actual.toLocaleString()}</div>
                  {row.target_head_count > 0 && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${v > 50 ? "bg-amber-100 text-amber-700" : v < -50 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {v > 0 ? "+" : ""}{v}
                    </span>
                  )}
                  <div className="flex-1 text-xs text-muted-foreground truncate hidden md:block">{SEASONAL_TIPS[i + 1]}</div>
                  {isCurrent && <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">Now</span>}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </LivestockLayout>
  );
}
