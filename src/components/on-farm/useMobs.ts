import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Mob, MobCost, WeightRecord, MarketBenchmark } from "./types";

export function useMobs() {
  const [mobs, setMobs] = useState<Mob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMobs = useCallback(async () => {
    const { data } = await supabase
      .from("mobs")
      .select("*")
      .order("created_at", { ascending: false });
    setMobs((data as Mob[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMobs(); }, [fetchMobs]);

  return { mobs, loading, refetch: fetchMobs };
}

export function useMob(id: string) {
  const [mob, setMob] = useState<Mob | null>(null);
  const [costs, setCosts] = useState<MobCost[]>([]);
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    const [mobRes, costsRes, weightsRes] = await Promise.all([
      supabase.from("mobs").select("*").eq("id", id).single(),
      supabase.from("mob_costs").select("*").eq("mob_id", id).order("cost_date", { ascending: true }),
      supabase.from("weight_records").select("*").eq("mob_id", id).order("weigh_date", { ascending: true }),
    ]);
    setMob(mobRes.data as Mob);
    setCosts((costsRes.data as MobCost[]) ?? []);
    setWeights((weightsRes.data as WeightRecord[]) ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const totalCost = costs.reduce((sum, c) => sum + c.amount_total, 0);
  const totalCostPerHead = mob ? totalCost / mob.head_count : 0;

  const latestWeight = weights.length ? weights[weights.length - 1] : null;
  const firstWeight = weights.length ? weights[0] : null;

  const adg = latestWeight && firstWeight && latestWeight.id !== firstWeight.id
    ? (() => {
        const days = Math.max(1,
          (new Date(latestWeight.weigh_date).getTime() - new Date(firstWeight.weigh_date).getTime())
          / 86400000
        );
        return (latestWeight.avg_weight_kg - (mob?.arrival_weight_avg_kg ?? firstWeight.avg_weight_kg)) / days;
      })()
    : null;

  const projectedTurnOffDate = mob?.target_weight_kg && adg && latestWeight && adg > 0
    ? (() => {
        const daysNeeded = (mob.target_weight_kg - latestWeight.avg_weight_kg) / adg;
        const d = new Date(latestWeight.weigh_date);
        d.setDate(d.getDate() + Math.round(daysNeeded));
        return d;
      })()
    : null;

  return {
    mob, costs, weights, loading, refetch: fetchAll,
    totalCost, totalCostPerHead,
    latestWeight, adg, projectedTurnOffDate,
  };
}

export interface FeedPlan {
  id: string;
  mob_id: string;
  ration_type: string | null;
  feed_source: string;
  daily_feed_cost_per_head: number;
  expected_adg_kg_day: number;
  start_date: string;
  end_date: string | null;
  projected_exit_weight_kg: number | null;
  projected_ready_date: string | null;
  is_current: boolean;
  notes: string | null;
  created_at: string;
}

export function useFeedPlan(mobId: string) {
  const [plans, setPlans] = useState<FeedPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    const { data } = await supabase
      .from("feed_plans")
      .select("*")
      .eq("mob_id", mobId)
      .order("start_date", { ascending: false });
    setPlans((data as FeedPlan[]) ?? []);
    setLoading(false);
  }, [mobId]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const current = plans.find(p => p.is_current) ?? plans[0] ?? null;
  return { plans, current, loading, refetch: fetchPlans };
}

export function useMarketBenchmarks() {
  const [benchmarks, setBenchmarks] = useState<MarketBenchmark[]>([]);

  useEffect(() => {
    supabase
      .from("market_benchmarks")
      .select("*")
      .order("benchmark_date", { ascending: false })
      .limit(20)
      .then(({ data }) => setBenchmarks((data as MarketBenchmark[]) ?? []));
  }, []);

  const latest = (indicator: string) =>
    benchmarks.find(b => b.indicator === indicator);

  return { benchmarks, latest };
}

export interface ProcessorGrid {
  id: string;
  processor_name: string;
  species: string;
  description: string | null;
  weight_min_kg: number | null;
  weight_max_kg: number | null;
  grade: string | null;
  fat_score: string | null;
  price_cpkg_cw: number;
  hgp_free_premium_cpkg: number;
  msa_premium_cpkg: number;
  effective_date: string;
  notes: string | null;
  created_at: string;
}

export function useProcessorGrids() {
  const [grids, setGrids] = useState<ProcessorGrid[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGrids = useCallback(async () => {
    const { data } = await supabase
      .from("processor_grids")
      .select("*")
      .order("price_cpkg_cw", { ascending: false });
    setGrids((data as ProcessorGrid[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchGrids(); }, [fetchGrids]);

  return { grids, loading, refetch: fetchGrids };
}

export interface KillRecord {
  id: string;
  mob_id: string;
  kill_date: string;
  processor_name: string;
  head_count: number;
  avg_carcase_weight_kg: number | null;
  grade: string | null;
  fat_score: string | null;
  price_cpkg_cw: number | null;
  total_payment: number | null;
  notes: string | null;
  created_at: string;
}

export function useKillRecords(mobId: string) {
  const [records, setRecords] = useState<KillRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    const { data } = await supabase
      .from("kill_records")
      .select("*")
      .eq("mob_id", mobId)
      .order("kill_date", { ascending: false });
    setRecords((data as KillRecord[]) ?? []);
    setLoading(false);
  }, [mobId]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  return { records, loading, refetch: fetchRecords };
}
