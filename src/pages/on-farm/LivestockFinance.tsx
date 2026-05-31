import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote, TrendingUp } from "lucide-react";

function fmt$(n: number) { return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; }
function fmtCpkg(n: number) { return `${n.toFixed(0)}¢/kg`; }
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }

const LENDERS = [
  "Rural Bank",
  "Rabobank",
  "ANZ Agribusiness",
  "NAB AgriLending",
  "Other",
];

export default function LivestockFinance() {
  // Finance inputs
  const [purchasePrice, setPurchasePrice] = useState(120000);
  const [depositPct, setDepositPct] = useState(20);
  const [interestRate, setInterestRate] = useState(7.5);
  const [loanTermWeeks, setLoanTermWeeks] = useState(16);
  const [lender, setLender] = useState("Rural Bank");
  const [headCount, setHeadCount] = useState(200);

  // P&L inputs
  const [purchaseWeightAvg, setPurchaseWeightAvg] = useState(350);
  const [targetExitWeight, setTargetExitWeight] = useState(420);
  const [adg, setAdg] = useState(1.2);
  const [dailyFeedCost, setDailyFeedCost] = useState(3.5);
  const [dressingPct, setDressingPct] = useState(54);
  const [gridPrice, setGridPrice] = useState(615);
  const [freightIn, setFreightIn] = useState(45);
  const [freightOut, setFreightOut] = useState(80);

  // ── Finance calculations ──
  const loanAmount = purchasePrice * (1 - depositPct / 100);
  const weeklyInterest = (loanAmount * (interestRate / 100)) / 52;
  const totalInterest = weeklyInterest * loanTermWeeks;
  const interestPerHead = headCount > 0 ? totalInterest / headCount : 0;
  const interestAsPctOfPurchase = purchasePrice > 0 ? (totalInterest / purchasePrice) * 100 : 0;

  // ── P&L calculations ──
  const daysOnFeed = adg > 0 ? (targetExitWeight - purchaseWeightAvg) / adg : loanTermWeeks * 7;
  const feedCostPerHead = dailyFeedCost * daysOnFeed;
  const purchaseCostPerHead = headCount > 0 ? loanAmount / headCount : 0;
  const MLA = 5;
  const totalCostPerHead =
    purchaseCostPerHead + interestPerHead + feedCostPerHead + freightIn + MLA;
  const carcaseKg = targetExitWeight * (dressingPct / 100);
  const grossRevenuePerHead = (gridPrice / 100) * carcaseKg;
  const netMarginPerHead = grossRevenuePerHead - freightOut - totalCostPerHead;
  const netMarginTotal = netMarginPerHead * headCount;
  const roi = totalCostPerHead > 0 ? (netMarginPerHead / totalCostPerHead) * 100 : 0;

  const marginPositive = netMarginPerHead >= 0;

  // ── Sensitivity table ──
  function marginAtRate(r: number) {
    const loan = purchasePrice * (1 - depositPct / 100);
    const intPerHead = headCount > 0 ? ((loan * (r / 100)) / 52) * loanTermWeeks / headCount : 0;
    const tc = purchaseCostPerHead + intPerHead + feedCostPerHead + freightIn + MLA;
    return grossRevenuePerHead - freightOut - tc;
  }

  const sensitivityRows = [
    { label: fmtPct(Math.max(0, interestRate - 2)), rate: Math.max(0, interestRate - 2) },
    { label: fmtPct(interestRate) + " (current)", rate: interestRate },
    { label: fmtPct(interestRate + 2), rate: interestRate + 2 },
    { label: fmtPct(interestRate + 4), rate: interestRate + 4 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-10">

        {/* ── Hero ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Livestock Finance Modeller</h1>
            <p className="text-muted-foreground mt-1">Model purchase finance costs and their impact on your mob margin</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">

          {/* ── Finance Inputs ── */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Finance Inputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Purchase price total ($)</Label>
                <Input
                  type="number"
                  step="1000"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(+e.target.value)}
                  className="rounded-xl font-bold text-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Head count</Label>
                  <Input
                    type="number"
                    value={headCount}
                    onChange={(e) => setHeadCount(+e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Deposit / equity (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={depositPct}
                    onChange={(e) => setDepositPct(+e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Interest rate (% p.a.)</Label>
                  <Input
                    type="number"
                    step="0.25"
                    value={interestRate}
                    onChange={(e) => setInterestRate(+e.target.value)}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Loan term (weeks)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={loanTermWeeks}
                    onChange={(e) => setLoanTermWeeks(+e.target.value)}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Lender</Label>
                <Select value={lender} onValueChange={setLender}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LENDERS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* ── Live Finance Summary ── */}
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Live Finance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  <tr>
                    <td className="py-2.5 text-muted-foreground">Loan amount</td>
                    <td className="py-2.5 text-right font-bold">{fmt$(loanAmount)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-muted-foreground">Weekly interest cost</td>
                    <td className="py-2.5 text-right font-bold">{fmt$(weeklyInterest)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-muted-foreground">Total interest over term</td>
                    <td className="py-2.5 text-right font-bold text-amber-700">{fmt$(totalInterest)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-muted-foreground">Interest cost per head</td>
                    <td className="py-2.5 text-right font-bold">{fmt$(interestPerHead)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-muted-foreground">Interest as % of purchase</td>
                    <td className="py-2.5 text-right font-bold text-rose-600">{fmtPct(interestAsPctOfPurchase)}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* ── P&L Inputs + Breakdown ── */}
        <div className="grid md:grid-cols-2 gap-5">
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Mob P&L Inputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Purchase weight avg (kg)</Label>
                  <Input type="number" value={purchaseWeightAvg} onChange={(e) => setPurchaseWeightAvg(+e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Target exit weight (kg)</Label>
                  <Input type="number" value={targetExitWeight} onChange={(e) => setTargetExitWeight(+e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Expected ADG (kg/day)</Label>
                  <Input type="number" step="0.1" value={adg} onChange={(e) => setAdg(+e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Daily feed cost/head ($)</Label>
                  <Input type="number" step="0.10" value={dailyFeedCost} onChange={(e) => setDailyFeedCost(+e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Dressing % ({dressingPct}%)</Label>
                  <Input type="number" step="0.5" value={dressingPct} onChange={(e) => setDressingPct(+e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Grid price (¢/kg CW)</Label>
                  <Input type="number" value={gridPrice} onChange={(e) => setGridPrice(+e.target.value)} className="rounded-xl font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Freight in ($/head)</Label>
                  <Input type="number" step="5" value={freightIn} onChange={(e) => setFreightIn(+e.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Freight out ($/head)</Label>
                  <Input type="number" step="5" value={freightOut} onChange={(e) => setFreightOut(+e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground bg-muted/30 rounded-xl px-3 py-2">
                Days on feed: <strong className="text-foreground">{daysOnFeed.toFixed(0)} days</strong> at {adg}kg/day ADG
              </div>
            </CardContent>
          </Card>

          {/* Cost breakdown */}
          <Card className="rounded-2xl overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Cost Breakdown per Head</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  <tr>
                    <td className="py-2.5 text-muted-foreground text-xs pl-2">Purchase cost/head</td>
                    <td className="py-2.5 text-right text-xs text-red-600">{fmt$(purchaseCostPerHead)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-muted-foreground text-xs pl-2">Interest cost/head</td>
                    <td className="py-2.5 text-right text-xs text-red-600">{fmt$(interestPerHead)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-muted-foreground text-xs pl-2">Feed cost/head ({daysOnFeed.toFixed(0)} days)</td>
                    <td className="py-2.5 text-right text-xs text-red-600">{fmt$(feedCostPerHead)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-muted-foreground text-xs pl-2">Freight in/head</td>
                    <td className="py-2.5 text-right text-xs text-red-600">{fmt$(freightIn)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-muted-foreground text-xs pl-2">MLA levy</td>
                    <td className="py-2.5 text-right text-xs text-red-600">{fmt$(MLA)}</td>
                  </tr>
                  <tr className="bg-muted/20">
                    <td className="py-2.5 font-bold text-xs pl-2">Total cost/head</td>
                    <td className="py-2.5 text-right font-bold text-xs">{fmt$(totalCostPerHead)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-muted-foreground text-xs pl-2">Gross revenue/head ({carcaseKg.toFixed(1)}kg CW × {fmtCpkg(gridPrice)})</td>
                    <td className="py-2.5 text-right text-xs text-green-700 font-bold">+{fmt$(grossRevenuePerHead)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-muted-foreground text-xs pl-2">Freight out/head</td>
                    <td className="py-2.5 text-right text-xs text-red-600">-{fmt$(freightOut)}</td>
                  </tr>
                  <tr className={`border-t-2 border-foreground/20 ${marginPositive ? "bg-green-50" : "bg-red-50"}`}>
                    <td className={`py-3 font-bold pl-2 ${marginPositive ? "text-green-800" : "text-red-800"}`}>Net margin/head</td>
                    <td className={`py-3 text-right font-black text-xl ${marginPositive ? "text-green-700" : "text-red-700"}`}>
                      {netMarginPerHead < 0 ? "-" : "+"}{fmt$(Math.abs(netMarginPerHead))}
                    </td>
                  </tr>
                  <tr className={marginPositive ? "bg-green-50/50" : "bg-red-50/50"}>
                    <td className={`py-2.5 font-semibold pl-2 text-xs ${marginPositive ? "text-green-700" : "text-red-700"}`}>Net margin TOTAL ({headCount} head)</td>
                    <td className={`py-2.5 text-right font-bold ${marginPositive ? "text-green-700" : "text-red-700"}`}>{netMarginTotal < 0 ? "-" : "+"}{fmt$(Math.abs(netMarginTotal))}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 text-muted-foreground text-xs pl-2">ROI</td>
                    <td className={`py-2.5 text-right font-bold text-xs ${roi >= 0 ? "text-green-700" : "text-red-600"}`}>{fmtPct(roi)}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* ── Sensitivity Analysis ── */}
        <Card className="rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-600" />
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Sensitivity Analysis — Interest Rate</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">How does net margin/head change if the interest rate moves?</p>
            <div className="grid grid-cols-4 gap-3">
              {sensitivityRows.map((row) => {
                const m = marginAtRate(row.rate);
                const positive = m >= 0;
                return (
                  <div
                    key={row.label}
                    className={`rounded-xl p-4 border text-center ${row.rate === interestRate ? "ring-2 ring-teal-500 border-teal-300 bg-teal-50" : positive ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
                  >
                    <p className="text-xs font-semibold text-muted-foreground mb-1">{row.label}</p>
                    <p className={`text-xl font-black ${positive ? "text-green-700" : "text-red-700"}`}>
                      {m < 0 ? "-" : "+"}{fmt$(Math.abs(m))}
                    </p>
                    <p className="text-xs text-muted-foreground">/head</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* ── Lender Comparison ── */}
        <Card className="rounded-2xl border-dashed border-2 border-muted">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
                <Banknote className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground mb-1">Lender Contact Details — Coming Soon</p>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                  Muster will integrate with Rural Bank, Rabobank, and ANZ Agribusiness to enable in-app finance pre-approval linked to your purchase bid. You will be able to submit a finance request directly from the Bid Calculator with your mob details pre-filled.
                </p>
                <div className="flex gap-2 mt-3">
                  {["Rural Bank", "Rabobank", "ANZ Agribusiness"].map((name) => (
                    <span key={name} className="text-xs bg-muted rounded-full px-3 py-1 text-muted-foreground font-medium">{name}</span>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
