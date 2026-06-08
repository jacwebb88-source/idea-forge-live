import { useState, useEffect, useRef } from "react";
import { LivestockLayout } from "@/components/LivestockLayout";
import { supabase } from "@/integrations/supabase/client";
import { useMobs, useMarketBenchmarks } from "@/components/on-farm/useMobs";
import { Button } from "@/components/ui/button";
import { differenceInDays, format } from "date-fns";
import { Printer, Download } from "lucide-react";

const MARKET_KEY: Record<string, string> = {
  lot_fed: "heavy_steer", backgrounder: "feeder_steer", trade: "feeder_steer",
  weaner: "feeder_steer", boner_cow: "heavy_cow", cull_cow: "heavy_cow",
  breeder: "heavy_cow", bull: "heavy_bull",
  trade_lamb: "estli", heavy_lamb: "heavy_lamb", merino_lamb: "merino_lamb",
  ewe: "mutton", wether: "estli", hogget: "estli",
};

const CAT_LABELS: Record<string, string> = {
  lot_fed: "Lot Fed", backgrounder: "Backgrounder", trade: "Trade", weaner: "Weaner",
  boner_cow: "Boner Cow", cull_cow: "Cull Cow", breeder: "Breeder", bull: "Bull",
  trade_lamb: "Trade Lamb", heavy_lamb: "Heavy Lamb", merino_lamb: "Merino Lamb",
  ewe: "Ewe", wether: "Wether", hogget: "Hogget",
};

function fmt$(n: number, sign = false) {
  const abs = `$${Math.abs(n).toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (!sign) return n < 0 ? `(${abs})` : abs;
  return (n >= 0 ? "+" : "-") + abs;
}

export default function LivestockStatement() {
  const { mobs } = useMobs();
  const { latest } = useMarketBenchmarks();
  const [enriched, setEnriched] = useState<any[]>([]);
  const [operationName, setOperationName] = useState("Livestock Operation");
  const statementDate = format(new Date(), "d MMMM yyyy");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("enterprise_settings").select("operation_name").single().then(({ data }) => {
      if (data?.operation_name) setOperationName(data.operation_name);
    });
  }, []);

  useEffect(() => {
    if (!mobs.length) return;

    async function enrich() {
      const ids = mobs.map(m => m.id);
      const [wRes, cRes, krRes] = await Promise.all([
        supabase.from("weight_records").select("*").in("mob_id", ids).order("weigh_date", { ascending: true }),
        supabase.from("mob_costs").select("*").in("mob_id", ids),
        supabase.from("kill_records").select("*").in("mob_id", ids),
      ]);

      const weightsByMob: Record<string, any[]> = {};
      for (const w of (wRes.data ?? []) as any[]) {
        if (!weightsByMob[w.mob_id]) weightsByMob[w.mob_id] = [];
        weightsByMob[w.mob_id].push(w);
      }
      const costsByMob: Record<string, any[]> = {};
      for (const c of (cRes.data ?? []) as any[]) {
        if (!costsByMob[c.mob_id]) costsByMob[c.mob_id] = [];
        costsByMob[c.mob_id].push(c);
      }
      const killsByMob: Record<string, any[]> = {};
      for (const k of (krRes.data ?? []) as any[]) {
        if (!killsByMob[k.mob_id]) killsByMob[k.mob_id] = [];
        killsByMob[k.mob_id].push(k);
      }

      const rows = mobs.map(mob => {
        const weights = weightsByMob[mob.id] ?? [];
        const costs = costsByMob[mob.id] ?? [];
        const kills = killsByMob[mob.id] ?? [];
        const latestWt = weights.length ? weights[weights.length - 1] : null;
        const currentWt = latestWt?.avg_weight_kg ?? mob.arrival_weight_avg_kg ?? mob.purchase_weight_avg_kg ?? 0;

        const totalCost = costs.reduce((s: number, c: any) => s + c.amount_total, 0);
        const totalCostPerHead = mob.head_count > 0 ? totalCost / mob.head_count : 0;

        // Purchase value
        const purchaseValue = mob.purchase_price_per_head
          ? mob.purchase_price_per_head * mob.head_count
          : mob.purchase_cents_per_kg && mob.purchase_weight_avg_kg
            ? (mob.purchase_cents_per_kg / 100) * mob.purchase_weight_avg_kg * mob.head_count
            : 0;

        // Current market value
        const marketKey = MARKET_KEY[mob.category];
        const marketCpkg = marketKey ? (latest(marketKey)?.cents_per_kg ?? null) : null;
        const currentMarketValuePerHead = marketCpkg && currentWt ? (currentWt * marketCpkg) / 100 : null;
        const currentMarketValueTotal = currentMarketValuePerHead ? currentMarketValuePerHead * mob.head_count : null;

        // Realised revenue (from kill records)
        const realisedRevenue = kills.reduce((s: number, k: any) => s + (k.total_value ?? 0), 0);

        // Unrealised P&L
        const unrealisedPL = currentMarketValueTotal != null ? currentMarketValueTotal - (purchaseValue + totalCost) : null;

        // Realised P&L (sold mobs)
        const realisedPL = realisedRevenue > 0 ? realisedRevenue - (purchaseValue + totalCost) : null;

        return {
          mob, currentWt, totalCost, totalCostPerHead, purchaseValue,
          currentMarketValuePerHead, currentMarketValueTotal, marketCpkg,
          realisedRevenue, unrealisedPL, realisedPL,
          isSold: mob.status === "sold",
          costs,
        };
      });

      setEnriched(rows.sort((a, b) => {
        const order = ["active", "sold", "deceased"];
        return order.indexOf(a.mob.status) - order.indexOf(b.mob.status);
      }));
    }

    enrich();
  }, [mobs, latest]);

  const activeMobs = enriched.filter(e => e.mob.status === "active");
  const soldMobs = enriched.filter(e => e.mob.status === "sold");

  const totalPurchaseCost = enriched.reduce((s, e) => s + e.purchaseValue, 0);
  const totalOngoingCost = enriched.reduce((s, e) => s + e.totalCost, 0);
  const totalInvested = totalPurchaseCost + totalOngoingCost;
  const totalCurrentValue = activeMobs.reduce((s, e) => s + (e.currentMarketValueTotal ?? 0), 0);
  const totalUnrealisedPL = totalCurrentValue - activeMobs.reduce((s, e) => s + e.purchaseValue + e.totalCost, 0);
  const totalRealisedRevenue = soldMobs.reduce((s, e) => s + e.realisedRevenue, 0);
  const totalRealisedPL = soldMobs.reduce((s, e) => s + (e.realisedPL ?? 0), 0);
  const totalHead = activeMobs.reduce((s, e) => s + e.mob.head_count, 0);

  function handlePrint() {
    window.print();
  }

  return (
    <LivestockLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Controls — hidden on print */}
        <div className="flex items-center justify-between print:hidden">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Financial Statement</p>
            <h1 className="text-2xl font-extrabold">Livestock Trading Statement</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Statement — print-ready */}
        <div ref={printRef} className="bg-white rounded-2xl border shadow-sm p-8 space-y-8 print:shadow-none print:rounded-none print:border-0 print:p-0">

          {/* Header */}
          <div className="flex items-start justify-between border-b pb-6">
            <div>
              <p className="text-2xl font-extrabold tracking-tight">{operationName}</p>
              <p className="text-lg font-semibold text-muted-foreground mt-0.5">Livestock Trading Statement</p>
              <p className="text-sm text-muted-foreground mt-1">Prepared by Muster Livestock · Confidential</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">Statement Date</p>
              <p className="text-sm text-muted-foreground">{statementDate}</p>
              <p className="text-sm font-bold mt-2">Market prices</p>
              <p className="text-xs text-muted-foreground">MLA/NLRS benchmarks · lwt</p>
            </div>
          </div>

          {/* Summary KPIs */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Portfolio Summary</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Active head", value: totalHead.toLocaleString(), sub: `${activeMobs.length} mobs` },
                { label: "Total invested", value: fmt$(totalInvested), sub: "purchase + costs" },
                { label: "Current market value", value: totalCurrentValue > 0 ? fmt$(totalCurrentValue) : "—", sub: "at benchmark prices" },
                { label: "Unrealised P&L", value: totalCurrentValue > 0 ? fmt$(totalUnrealisedPL, true) : "—", sub: "vs total cost", highlight: totalUnrealisedPL > 0 ? "green" : totalUnrealisedPL < 0 ? "red" : "" },
              ].map(k => (
                <div key={k.label} className="rounded-xl border px-4 py-4">
                  <p className="text-xs text-muted-foreground font-medium">{k.label}</p>
                  <p className={`text-xl font-black leading-tight mt-1 ${
                    k.highlight === "green" ? "text-green-600" :
                    k.highlight === "red" ? "text-red-600" : ""
                  }`}>{k.value}</p>
                  <p className="text-xs text-muted-foreground">{k.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Active mobs table */}
          {activeMobs.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Active Livestock — Current Position</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-t bg-muted/30">
                      {["Mob", "Category", "Head", "Purchase Cost", "Ongoing Costs", "Total Cost", "Curr. Wt", "Mkt Price", "Mkt Value", "Unrealised P&L"].map(h => (
                        <th key={h} className="text-left text-xs font-bold text-muted-foreground py-2.5 px-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeMobs.map((e, i) => (
                      <tr key={e.mob.id} className={`border-b ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                        <td className="py-2.5 px-3 font-semibold">{e.mob.mob_name}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{CAT_LABELS[e.mob.category] ?? e.mob.category}</td>
                        <td className="py-2.5 px-3 text-right">{e.mob.head_count}</td>
                        <td className="py-2.5 px-3 text-right">{e.purchaseValue > 0 ? fmt$(e.purchaseValue) : "—"}</td>
                        <td className="py-2.5 px-3 text-right">{e.totalCost > 0 ? fmt$(e.totalCost) : "—"}</td>
                        <td className="py-2.5 px-3 text-right font-semibold">{fmt$(e.purchaseValue + e.totalCost)}</td>
                        <td className="py-2.5 px-3 text-right">{e.currentWt > 0 ? `${e.currentWt.toFixed(0)}kg` : "—"}</td>
                        <td className="py-2.5 px-3 text-right">{e.marketCpkg ? `${e.marketCpkg}¢/kg` : "—"}</td>
                        <td className="py-2.5 px-3 text-right">{e.currentMarketValueTotal ? fmt$(e.currentMarketValueTotal) : "—"}</td>
                        <td className={`py-2.5 px-3 text-right font-bold ${
                          e.unrealisedPL == null ? "" : e.unrealisedPL >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {e.unrealisedPL != null ? fmt$(e.unrealisedPL, true) : "—"}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-foreground bg-muted/20 font-bold">
                      <td className="py-2.5 px-3" colSpan={2}>Total</td>
                      <td className="py-2.5 px-3 text-right">{totalHead}</td>
                      <td className="py-2.5 px-3 text-right">{fmt$(totalPurchaseCost)}</td>
                      <td className="py-2.5 px-3 text-right">{fmt$(totalOngoingCost)}</td>
                      <td className="py-2.5 px-3 text-right">{fmt$(totalInvested)}</td>
                      <td className="py-2.5 px-3" colSpan={2} />
                      <td className="py-2.5 px-3 text-right">{totalCurrentValue > 0 ? fmt$(totalCurrentValue) : "—"}</td>
                      <td className={`py-2.5 px-3 text-right ${totalUnrealisedPL >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {totalCurrentValue > 0 ? fmt$(totalUnrealisedPL, true) : "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sold mobs */}
          {soldMobs.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Sold / Completed — Realised P&L</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-t bg-muted/30">
                      {["Mob", "Category", "Head", "Total Cost", "Revenue", "Realised P&L", "P&L / Head"].map(h => (
                        <th key={h} className="text-left text-xs font-bold text-muted-foreground py-2.5 px-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {soldMobs.map((e, i) => (
                      <tr key={e.mob.id} className={`border-b ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                        <td className="py-2.5 px-3 font-semibold">{e.mob.mob_name}</td>
                        <td className="py-2.5 px-3 text-muted-foreground">{CAT_LABELS[e.mob.category] ?? e.mob.category}</td>
                        <td className="py-2.5 px-3 text-right">{e.mob.head_count}</td>
                        <td className="py-2.5 px-3 text-right">{fmt$(e.purchaseValue + e.totalCost)}</td>
                        <td className="py-2.5 px-3 text-right">{e.realisedRevenue > 0 ? fmt$(e.realisedRevenue) : "—"}</td>
                        <td className={`py-2.5 px-3 text-right font-bold ${
                          e.realisedPL == null ? "" : e.realisedPL >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {e.realisedPL != null ? fmt$(e.realisedPL, true) : "—"}
                        </td>
                        <td className={`py-2.5 px-3 text-right ${
                          e.realisedPL == null ? "" : e.realisedPL >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {e.realisedPL != null ? fmt$(e.realisedPL / e.mob.head_count, true) : "—"}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-foreground bg-muted/20 font-bold">
                      <td className="py-2.5 px-3" colSpan={3}>Total realised</td>
                      <td className="py-2.5 px-3 text-right">{fmt$(soldMobs.reduce((s, e) => s + e.purchaseValue + e.totalCost, 0))}</td>
                      <td className="py-2.5 px-3 text-right">{totalRealisedRevenue > 0 ? fmt$(totalRealisedRevenue) : "—"}</td>
                      <td className={`py-2.5 px-3 text-right ${totalRealisedPL >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {totalRealisedRevenue > 0 ? fmt$(totalRealisedPL, true) : "—"}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="border-t pt-6 text-xs text-muted-foreground space-y-1">
            <p><strong>Notes:</strong> Market values based on MLA/NLRS benchmark prices as at {statementDate}. Unrealised P&L is indicative only — actual sale price will vary based on individual animal assessment, grid premiums, transport and market conditions at time of sale.</p>
            <p>This statement is prepared for management purposes and does not constitute a formal financial report. For tax and borrowing purposes, verify cost allocations against your accounting records (Xero, MYOB, QuickBooks).</p>
            <p>Prepared by Muster Livestock · Webb Muster Pty Ltd · {format(new Date(), "yyyy")}</p>
          </div>
        </div>

      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          [data-print-target], [data-print-target] * { visibility: visible; }
        }
      `}</style>
    </LivestockLayout>
  );
}
