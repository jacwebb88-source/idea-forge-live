import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Property, FeedlotPen, PipelineWeek } from "./enterpriseTypes";
import type { Mob, WeightRecord } from "./types";
import { addDays, format, startOfWeek, addWeeks } from "date-fns";

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from("properties")
      .select("*")
      .eq("active", true)
      .order("name");
    setProperties((data as Property[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { properties, loading, refetch: fetch };
}

export function usePens(propertyId?: string) {
  const [pens, setPens] = useState<FeedlotPen[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    let q = supabase.from("feedlot_pens").select("*").order("pen_number");
    if (propertyId) q = q.eq("property_id", propertyId);
    const { data } = await q;
    setPens((data as FeedlotPen[]) ?? []);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { pens, loading, refetch: fetch };
}

export function useAllPens() {
  return usePens(undefined);
}

// Kill Pipeline — projects which mobs will be at spec weight in weeks 1–12
export function useKillPipeline(properties: Property[]) {
  const [pipeline, setPipeline] = useState<PipelineWeek[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function compute() {
      // Fetch all active mobs with their latest weight records
      const { data: mobs } = await supabase
        .from("mobs")
        .select("*")
        .eq("status", "active")
        .not("target_weight_kg", "is", null);

      if (!mobs || mobs.length === 0) {
        setPipeline([]);
        setLoading(false);
        return;
      }

      // Fetch latest weight for each mob
      const mobIds = mobs.map((m: any) => m.id);
      const { data: weightRows } = await supabase
        .from("weight_records")
        .select("*")
        .in("mob_id", mobIds)
        .order("weigh_date", { ascending: true });

      const weightsByMob: Record<string, WeightRecord[]> = {};
      for (const w of (weightRows as WeightRecord[]) ?? []) {
        if (!weightsByMob[w.mob_id]) weightsByMob[w.mob_id] = [];
        weightsByMob[w.mob_id].push(w);
      }

      // Build property name map
      const propMap: Record<string, string> = {};
      for (const p of properties) propMap[p.id] = p.name;

      // For each mob, calculate days until target weight
      const mobProjections = (mobs as Mob[]).map(mob => {
        const weights = weightsByMob[mob.id] ?? [];
        const latest = weights.length ? weights[weights.length - 1] : null;
        const arrival = mob.arrival_weight_avg_kg ?? mob.purchase_weight_avg_kg ?? 0;
        const targetWt = mob.target_weight_kg ?? 0;

        // Calculate ADG
        let adg = 1.2; // default assumption if no weigh records
        if (latest && weights.length >= 2) {
          const first = weights[0];
          const days = Math.max(1,
            (new Date(latest.weigh_date).getTime() - new Date(first.weigh_date).getTime()) / 86400000
          );
          adg = (latest.avg_weight_kg - (arrival || first.avg_weight_kg)) / days;
        } else if (latest && arrival) {
          const days = Math.max(1,
            (new Date(latest.weigh_date).getTime() - new Date(mob.purchase_date).getTime()) / 86400000
          );
          adg = (latest.avg_weight_kg - arrival) / days;
        }

        const currentWt = latest?.avg_weight_kg ?? arrival;
        const kgToTarget = Math.max(0, targetWt - currentWt);
        const daysToTarget = adg > 0 ? kgToTarget / adg : 999;
        const readyDate = addDays(new Date(), Math.round(daysToTarget));

        const propertyName = mob.property_id ? (propMap[mob.property_id] ?? "Unassigned") : "Unassigned";
        const program = mob.program_type ?? "unknown";

        return {
          mob,
          adg: Math.max(0, adg),
          projectedWeight: currentWt + adg * Math.round(daysToTarget),
          readyDate,
          propertyName,
          program,
          daysToTarget: Math.round(daysToTarget),
        };
      }).filter(p => p.adg > 0 && p.daysToTarget < 100);

      // Bucket into 12 weekly slots
      const today = new Date();
      const weeks: PipelineWeek[] = Array.from({ length: 12 }, (_, i) => {
        const weekStart = addWeeks(today, i);
        const weekEnd = addWeeks(today, i + 1);
        const label = `Wk ${i + 1} — ${format(weekStart, "d MMM")}`;

        const mobsReady = mobProjections.filter(
          p => p.readyDate >= weekStart && p.readyDate < weekEnd
        );

        return {
          weekLabel: label,
          weekStart,
          headReady: mobsReady.reduce((s, p) => s + p.mob.head_count, 0),
          mobsReady: mobsReady.map(p => ({
            mobName: p.mob.mob_name,
            headCount: p.mob.head_count,
            property: p.propertyName,
            program: p.program,
            adg: p.adg,
            projectedWeight: Math.round(p.projectedWeight * 10) / 10,
          })),
          cumulativeHead: 0, // filled below
        };
      });

      // Fill cumulative
      let running = 0;
      for (const w of weeks) {
        running += w.headReady;
        w.cumulativeHead = running;
      }

      setPipeline(weeks);
      setLoading(false);
    }

    if (properties !== undefined) compute();
  }, [properties]);

  return { pipeline, loading };
}
