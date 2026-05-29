import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMobs, useMarketBenchmarks } from "@/components/on-farm/useMobs";
import { CATEGORY_LABELS, EXIT_PATH_LABELS } from "@/components/on-farm/types";
import type { Mob } from "@/components/on-farm/types";
import {
  Plus, TrendingUp, DollarSign, Scale, AlertTriangle,
  ArrowRight, Activity, Beef,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

function daysOnFeed(purchaseDate: string) {
  return differenceInDays(new Date(), new Date(purchaseDate));
}

function mobCategoryColor(cat: string) {
  const map: Record<string, string> = {
    lot_fed: "bg-amber-100 text-amber-800",
    backgrounder: "bg-green-100 text-green-800",
    boner_cow: "bg-rose-100 text-rose-800",
    weaner: "bg-blue-100 text-blue-800",
    breeder: "bg-purple-100 text-purple-800",
    trade: "bg-slate-100 text-slate-700",
    bull: "bg-orange-100 text-orange-800",
    cull_cow: "bg-red-100 text-red-800",
  };
  return map[cat] ?? "bg-gray-100 text-gray-700";
}

export default function OnFarm() {
  const navigate = useNavigate();
  const { mobs, loading } = useMobs();
  const { latest } = useMarketBenchmarks();

  const activeMobs = mobs.filter(m => m.status === "active");
  const totalHead = activeMobs.reduce((s, m) => s + m.head_count, 0);
  const totalCapital = activeMobs.reduce((s, m) => {
    const pp = m.purchase_price_per_head
      ? m.purchase_price_per_head * m.head_count
      : m.purchase_cents_per_kg && m.purchase_weight_avg_kg
        ? (m.purchase_cents_per_kg / 100) * m.purchase_weight_avg_kg * m.head_count
        : 0;
    return s + pp;
  }, 0);

  const feederBenchmark = latest("feeder_steer");
  const othVic = latest("oth_vic");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Beef className="h-6 w-6 text-primary" />
              On Farm
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Per-animal cost tracking, weight gain, and exit decision modelling
            </p>
          </div>
          <Button onClick={() => navigate("/on-farm/mobs/new")} className="gap-2">
            <Plus className="h-4 w-4" />
            New Mob
          </Button>
        </div>

        {/* Market strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Feeder Steer", indicator: "feeder_steer", basis: "lwt" },
            { label: "Heavy Steer", indicator: "heavy_steer", basis: "lwt" },
            { label: "Heavy Cow", indicator: "heavy_cow", basis: "lwt" },
            { label: "OTH VIC", indicator: "oth_vic", basis: "dw" },
          ].map(({ label, indicator, basis }) => {
            const b = latest(indicator);
            return (
              <div key={indicator} className="bg-muted/40 border rounded-lg px-4 py-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold text-foreground">
                  {b ? `${b.cents_per_kg}¢` : "—"}
                </p>
                <p className="text-xs text-muted-foreground">¢/kg {basis}</p>
              </div>
            );
          })}
        </div>
        {feederBenchmark && (
          <p className="text-xs text-muted-foreground -mt-3">
            Market indicators as at {format(new Date(feederBenchmark.benchmark_date), "d MMM yyyy")} — MLA/NLRS
          </p>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeMobs.length}</p>
                  <p className="text-xs text-muted-foreground">Active Mobs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center">
                  <Scale className="h-4 w-4 text-green-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalHead.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Head</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-amber-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold">${(totalCapital / 1000).toFixed(0)}k</p>
                  <p className="text-xs text-muted-foreground">Capital at Risk</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-rose-100 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {activeMobs.filter(m => m.target_exit_date && differenceInDays(new Date(m.target_exit_date), new Date()) <= 14).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Exit Due ≤14 days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mob list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active Mobs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
            ) : activeMobs.length === 0 ? (
              <div className="p-8 text-center">
                <Beef className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No active mobs yet.</p>
                <Button
                  variant="outline" size="sm" className="mt-3"
                  onClick={() => navigate("/on-farm/mobs/new")}
                >
                  Add your first mob
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {activeMobs.map(mob => (
                  <MobRow key={mob.id} mob={mob} onOpen={() => navigate(`/on-farm/mobs/${mob.id}`)} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completed mobs */}
        {mobs.filter(m => m.status !== "active").length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-muted-foreground">Completed Mobs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {mobs.filter(m => m.status !== "active").map(mob => (
                  <MobRow key={mob.id} mob={mob} onOpen={() => navigate(`/on-farm/mobs/${mob.id}`)} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function MobRow({ mob, onOpen }: { mob: Mob; onOpen: () => void }) {
  const dof = daysOnFeed(mob.purchase_date);
  const exitSoon = mob.target_exit_date &&
    differenceInDays(new Date(mob.target_exit_date), new Date()) <= 14 &&
    mob.status === "active";

  return (
    <button
      onClick={onOpen}
      className="w-full text-left px-5 py-4 hover:bg-muted/40 transition-colors flex items-center gap-4"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-foreground">{mob.mob_name}</span>
          <Badge className={`text-xs px-2 py-0 ${mobCategoryColor(mob.category)}`}>
            {CATEGORY_LABELS[mob.category]}
          </Badge>
          {mob.status !== "active" && (
            <Badge variant="outline" className="text-xs capitalize">{mob.status}</Badge>
          )}
          {exitSoon && (
            <Badge className="text-xs bg-rose-100 text-rose-700">Exit due soon</Badge>
          )}
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
          <span>{mob.head_count} head</span>
          {mob.location_name && <span>{mob.location_name}</span>}
          {mob.program_type && <span className="capitalize">{mob.program_type}</span>}
          <span>{dof}d on feed</span>
          {mob.target_exit_date && (
            <span>Exit: {format(new Date(mob.target_exit_date), "d MMM yy")}</span>
          )}
          {mob.target_exit_path && (
            <span>{EXIT_PATH_LABELS[mob.target_exit_path]}</span>
          )}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}
