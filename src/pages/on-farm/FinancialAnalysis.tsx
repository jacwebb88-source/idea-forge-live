import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Upload,
  Eye,
  Download,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  Camera,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EnterpriseRow {
  mob: string;
  species: string;
  head: number;
  revenue: number;
  costs: Record<string, number>;
  totalCost: number;
  grossProfit: number;
  profitPerHead: number;
  marginPct: number;
}

interface MonthlyFlow {
  month: string;
  revenue: number;
  costs: number;
  net: number;
}

interface FMDDeposit {
  id: number;
  depositDate: string;
  amount: number;
  institution: string;
  maturityDate: string;
  status: "active" | "matured" | "withdrawn";
  withdrawalDate?: string;
  taxYear: string;
}

interface FinancialDocument {
  id: number;
  date: string;
  fileName: string;
  fileType: "pdf" | "csv" | "image";
  category: string;
  amount: number;
  mobLinked?: string;
  processed: "extracted" | "pending" | "review";
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_ENTERPRISES: EnterpriseRow[] = [
  {
    mob: "Lot Fed Yearlings",
    species: "Cattle",
    head: 180,
    revenue: 182000,
    costs: {
      feed: 42000,
      freight: 8200,
      vet: 3400,
      levy: 900,
      interest: 6800,
      overhead: 4500,
    },
    totalCost: 65800,
    grossProfit: 116200,
    profitPerHead: 645.6,
    marginPct: 63.8,
  },
  {
    mob: "Grassfed Backgrounders",
    species: "Cattle",
    head: 220,
    revenue: 156000,
    costs: {
      agistment: 18000,
      freight: 6400,
      vet: 2800,
      levy: 1100,
      interest: 5200,
    },
    totalCost: 33500,
    grossProfit: 122500,
    profitPerHead: 556.8,
    marginPct: 78.5,
  },
  {
    mob: "Boner Cows",
    species: "Cattle",
    head: 310,
    revenue: 198000,
    costs: {
      purchase: 142000,
      freight: 12400,
      vet: 4200,
      levy: 1550,
      interest: 8900,
    },
    totalCost: 169050,
    grossProfit: 28950,
    profitPerHead: 93.4,
    marginPct: 14.6,
  },
];

const DEMO_MONTHLY: MonthlyFlow[] = [
  { month: "Jul", revenue: 0, costs: 28000, net: -28000 },
  { month: "Aug", revenue: 0, costs: 24000, net: -24000 },
  { month: "Sep", revenue: 42000, costs: 22000, net: 20000 },
  { month: "Oct", revenue: 38000, costs: 19000, net: 19000 },
  { month: "Nov", revenue: 0, costs: 26000, net: -26000 },
  { month: "Dec", revenue: 72000, costs: 18000, net: 54000 },
  { month: "Jan", revenue: 0, costs: 21000, net: -21000 },
  { month: "Feb", revenue: 58000, costs: 24000, net: 34000 },
  { month: "Mar", revenue: 68000, costs: 22000, net: 46000 },
  { month: "Apr", revenue: 0, costs: 19000, net: -19000 },
  { month: "May", revenue: 112000, costs: 26000, net: 86000 },
  { month: "Jun", revenue: 146000, costs: 52000, net: 94000 },
];

const DEMO_FMD: FMDDeposit[] = [
  {
    id: 1,
    depositDate: "28 Jun 2023",
    amount: 80000,
    institution: "ANZ Bank",
    maturityDate: "28 Jun 2024",
    status: "withdrawn",
    withdrawalDate: "15 Jul 2024",
    taxYear: "2022-23",
  },
  {
    id: 2,
    depositDate: "29 Jun 2024",
    amount: 120000,
    institution: "Rabobank",
    maturityDate: "29 Jun 2025",
    status: "matured",
    taxYear: "2023-24",
  },
  {
    id: 3,
    depositDate: "27 Jun 2025",
    amount: 120000,
    institution: "Rabobank",
    maturityDate: "27 Jun 2026",
    status: "active",
    taxYear: "2024-25",
  },
];

const DEMO_DOCUMENTS: FinancialDocument[] = [
  {
    id: 1,
    date: "12 May 2025",
    fileName: "Rabobank_Invoice_May25.pdf",
    fileType: "pdf",
    category: "Interest",
    amount: 2266,
    mobLinked: "Lot Fed Yearlings",
    processed: "extracted",
  },
  {
    id: 2,
    date: "4 Apr 2025",
    fileName: "Elders_Freight_Apr25.pdf",
    fileType: "pdf",
    category: "Freight",
    amount: 4200,
    mobLinked: "Boner Cows",
    processed: "extracted",
  },
  {
    id: 3,
    date: "1 Mar 2025",
    fileName: "FeedInvoice_Marchdata.csv",
    fileType: "csv",
    category: "Feed",
    amount: 14000,
    mobLinked: "Lot Fed Yearlings",
    processed: "review",
  },
  {
    id: 4,
    date: "18 Feb 2025",
    fileName: "VetReceipt_Feb.jpg",
    fileType: "image",
    category: "Vet",
    amount: 840,
    mobLinked: "Grassfed Backgrounders",
    processed: "pending",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, showSign = false) {
  const abs = Math.abs(n);
  const str =
    "$" +
    abs.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (showSign && n < 0) return `(${str})`;
  if (showSign && n > 0) return str;
  return n < 0 ? `(${str})` : str;
}

function fmtK(n: number) {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}k`;
  return fmt(n);
}

const CATEGORY_COLORS: Record<string, string> = {
  feed: "#f59e0b",
  freight: "#3b82f6",
  vet: "#10b981",
  agistment: "#8b5cf6",
  levy: "#ec4899",
  insurance: "#06b6d4",
  interest: "#f97316",
  labour: "#6366f1",
  overhead: "#84cc16",
  purchase: "#ef4444",
  other: "#9ca3af",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  sub,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
        <p
          className={`text-2xl font-bold ${
            positive === undefined
              ? "text-gray-900"
              : positive
              ? "text-green-700"
              : "text-red-600"
          }`}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ProcessedBadge({ status }: { status: FinancialDocument["processed"] }) {
  if (status === "extracted")
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
        <CheckCircle2 className="w-3 h-3" /> Extracted
      </Badge>
    );
  if (status === "review")
    return (
      <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1">
        <AlertCircle className="w-3 h-3" /> Needs Review
      </Badge>
    );
  return (
    <Badge className="bg-gray-100 text-gray-500 border-gray-200 gap-1">
      <Clock className="w-3 h-3" /> Pending
    </Badge>
  );
}

function FileIcon({ type }: { type: FinancialDocument["fileType"] }) {
  if (type === "pdf") return <FileText className="w-4 h-4 text-red-500" />;
  if (type === "csv") return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
  return <Camera className="w-4 h-4 text-blue-500" />;
}

// ─── Tab 1: P&L Summary ───────────────────────────────────────────────────────

function PLSummaryTab({ financialYear }: { financialYear: string }) {
  const enterprises = DEMO_ENTERPRISES;
  const totalRevenue = enterprises.reduce((s, e) => s + e.revenue, 0);
  const totalCosts = enterprises.reduce((s, e) => s + e.totalCost, 0);
  const grossProfit = totalRevenue - totalCosts;
  const marginPct = totalRevenue ? (grossProfit / totalRevenue) * 100 : 0;
  const totalHead = enterprises.reduce((s, e) => s + e.head, 0);
  const costPerHead = totalHead ? totalCosts / totalHead : 0;

  // Aggregate category costs
  const categoryTotals: Record<string, number> = {};
  enterprises.forEach((e) => {
    Object.entries(e.costs).forEach(([k, v]) => {
      categoryTotals[k] = (categoryTotals[k] ?? 0) + v;
    });
  });
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

  const bestIdx = enterprises.reduce(
    (best, e, i) => (e.grossProfit > enterprises[best].grossProfit ? i : best),
    0
  );
  const worstIdx = enterprises.reduce(
    (worst, e, i) => (e.grossProfit < enterprises[worst].grossProfit ? i : worst),
    0
  );

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard label="Total Revenue" value={fmt(totalRevenue)} />
        <KPICard label="Total Costs" value={fmt(totalCosts)} positive={false} />
        <KPICard
          label="Gross Profit"
          value={fmt(grossProfit)}
          positive={grossProfit >= 0}
        />
        <KPICard
          label="Gross Margin"
          value={`${marginPct.toFixed(1)}%`}
          positive={marginPct >= 20}
        />
        <KPICard
          label="Cost Per Head"
          value={`$${costPerHead.toFixed(0)}`}
          sub={`across ${totalHead} head`}
        />
      </div>

      {/* Enterprise Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enterprise Breakdown — {financialYear}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {["Mob", "Species", "Head", "Revenue", "Total Cost", "Gross Profit", "$/Head Profit", "Margin %"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {[...enterprises]
                  .sort((a, b) => b.grossProfit - a.grossProfit)
                  .map((e, i) => {
                    const origIdx = enterprises.indexOf(e);
                    const isBest = origIdx === bestIdx;
                    const isWorst = origIdx === worstIdx;
                    return (
                      <tr
                        key={e.mob}
                        className={`border-b border-gray-100 ${
                          isBest
                            ? "bg-green-50"
                            : isWorst
                            ? "bg-amber-50"
                            : "bg-white"
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {e.mob}
                          {isBest && (
                            <Badge className="ml-2 bg-green-100 text-green-700 text-xs">
                              Best
                            </Badge>
                          )}
                          {isWorst && (
                            <Badge className="ml-2 bg-amber-100 text-amber-700 text-xs">
                              Watch
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{e.species}</td>
                        <td className="px-4 py-3 text-gray-700">{e.head}</td>
                        <td className="px-4 py-3 text-gray-900">{fmt(e.revenue)}</td>
                        <td className="px-4 py-3 text-gray-900">{fmt(e.totalCost)}</td>
                        <td
                          className={`px-4 py-3 font-semibold ${
                            e.grossProfit >= 0 ? "text-green-700" : "text-red-600"
                          }`}
                        >
                          {fmt(e.grossProfit)}
                        </td>
                        <td
                          className={`px-4 py-3 ${
                            e.profitPerHead >= 0 ? "text-green-700" : "text-red-600"
                          }`}
                        >
                          ${e.profitPerHead.toFixed(0)}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{e.marginPct.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Cost Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Stacked bar */}
          <div className="flex h-10 rounded-md overflow-hidden mb-4">
            {sortedCategories.map(([cat, amt]) => {
              const pct = (amt / totalCosts) * 100;
              return (
                <div
                  key={cat}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: CATEGORY_COLORS[cat] ?? "#9ca3af",
                  }}
                  title={`${cat}: ${fmt(amt)} (${pct.toFixed(1)}%)`}
                />
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
            {sortedCategories.map(([cat, amt]) => {
              const pct = (amt / totalCosts) * 100;
              return (
                <div key={cat} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <span
                    className="inline-block w-3 h-3 rounded-sm"
                    style={{ backgroundColor: CATEGORY_COLORS[cat] ?? "#9ca3af" }}
                  />
                  <span className="capitalize font-medium">{cat}</span>
                  <span className="text-gray-400">
                    {fmt(amt)} · {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Cash Flow */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Cash Flow — {financialYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={DEMO_MONTHLY} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => fmtK(v)} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number) => [fmt(value), "Net Flow"]}
                labelFormatter={(l) => `Month: ${l}`}
              />
              <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                {DEMO_MONTHLY.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.net >= 0 ? "#16a34a" : "#dc2626"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 text-center mt-1">
            Green = net inflow · Red = net outflow
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab 2: Livestock Trading Account ─────────────────────────────────────────

function LedgerRow({
  label,
  value,
  bold,
  indent,
  negative,
  total,
}: {
  label: string;
  value?: string;
  bold?: boolean;
  indent?: boolean;
  negative?: boolean;
  total?: boolean;
}) {
  return (
    <div
      className={`flex justify-between items-baseline py-1 ${
        total ? "border-t border-gray-300 mt-1 pt-2" : ""
      }`}
    >
      <span
        className={`text-sm ${indent ? "pl-6" : ""} ${
          bold || total ? "font-semibold text-gray-900" : "text-gray-700"
        }`}
      >
        {label}
      </span>
      {value !== undefined && (
        <span
          className={`text-sm tabular-nums ${
            total ? "font-bold" : bold ? "font-semibold" : ""
          } ${negative ? "text-red-600" : "text-gray-900"}`}
        >
          {value}
        </span>
      )}
    </div>
  );
}

function Section({ title }: { title: string }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mt-6 mb-2 border-b border-gray-200 pb-1">
      {title}
    </p>
  );
}

function LivestockTradingTab() {
  const [openingModal, setOpeningModal] = useState(false);
  const [openingCount, setOpeningCount] = useState("");
  const [openingUnit, setOpeningUnit] = useState("");

  const openingTotal =
    openingCount && openingUnit
      ? (parseFloat(openingCount) * parseFloat(openingUnit)).toLocaleString("en-AU", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
      : "";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-mono">
            LIVESTOCK TRADING ACCOUNT — 2024-25 Financial Year
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xl font-mono">
            <Section title="Receipts" />
            <LedgerRow label="Opening Stock Value" value="$  284,500" indent />
            <LedgerRow
              label="Add: Purchases (180 head @ avg $269/hd)"
              value="$   48,420"
              indent
            />
            <LedgerRow label="Add: Natural Increase" value="$        0" indent />
            <LedgerRow label="Total Receipts" value="$  332,920" bold total />

            <Section title="Payments" />
            <LedgerRow label="Less: Sales (180 head)" value="$  182,000" indent />
            <LedgerRow label="Less: Closing Stock Value" value="$   98,400" indent />
            <LedgerRow label="Total Payments" value="$  280,400" bold total />

            <div className="mt-4 mb-2 border-t-2 border-gray-800 pt-3">
              <LedgerRow label="NET LIVESTOCK INCOME" value="$   52,520" bold />
            </div>

            <Section title="Direct Costs" />
            <LedgerRow label="Feed & Fodder" value="$   42,000" indent />
            <LedgerRow label="Veterinary & Animal Health" value="$    3,400" indent />
            <LedgerRow label="Freight & Cartage" value="$    8,200" indent />
            <LedgerRow label="MLA Levies" value="$      900" indent />
            <LedgerRow label="Agistment" value="$        0" indent />
            <LedgerRow label="Insurance" value="$    2,100" indent />
            <LedgerRow label="Interest on Capital" value="$    6,800" indent />
            <LedgerRow label="Labour (attributed)" value="$    4,200" indent />
            <LedgerRow label="Overhead (attributed)" value="$    3,800" indent />
            <LedgerRow label="Total Direct Costs" value="$   71,400" bold total />

            <div className="mt-4 border-t-2 border-gray-800 pt-3">
              <LedgerRow
                label="NET ENTERPRISE RESULT"
                value="$ (18,880)"
                bold
                negative
              />
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-6 italic">
            Closing stock valued at market selling value per ATO requirements. Based on
            current market benchmarks of 425¢/kg liveweight.
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <Button variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />
              Export PDF
            </Button>
            <Button variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              Send to Accountant
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setOpeningModal(true)}
            >
              <Plus className="w-4 h-4" />
              Import Opening Stock Values
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Opening Stock Modal */}
      <Dialog open={openingModal} onOpenChange={setOpeningModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Import Opening Stock Values</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Opening Stock Count (head)</Label>
              <Input
                type="number"
                placeholder="e.g. 710"
                value={openingCount}
                onChange={(e) => setOpeningCount(e.target.value)}
              />
            </div>
            <div>
              <Label>Unit Value ($ per head)</Label>
              <Input
                type="number"
                placeholder="e.g. 401"
                value={openingUnit}
                onChange={(e) => setOpeningUnit(e.target.value)}
              />
            </div>
            <div>
              <Label>Total Value</Label>
              <Input
                readOnly
                value={openingTotal ? `$${openingTotal}` : ""}
                placeholder="Auto-calculated"
                className="bg-gray-50"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={() => setOpeningModal(false)}
              >
                Save Opening Stock
              </Button>
              <Button
                variant="outline"
                onClick={() => setOpeningModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 3: Document Vault ─────────────────────────────────────────────────────

function DocumentVaultTab() {
  const [docs, setDocs] = useState<FinancialDocument[]>(DEMO_DOCUMENTS);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);

  const categories = Array.from(new Set(docs.map((d) => d.category)));
  const filtered = docs.filter((d) => {
    const matchSearch =
      !search ||
      d.fileName.toLowerCase().includes(search.toLowerCase()) ||
      d.category.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || d.category === categoryFilter;
    return matchSearch && matchCat;
  });

  function handleDelete(id: number) {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex gap-2 flex-1">
          <Input
            placeholder="Search filename or supplier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="gap-2 shrink-0" onClick={() => setUploadOpen(true)}>
          <Upload className="w-4 h-4" />
          Upload Document
        </Button>
      </div>

      {filtered.length === 0 ? (
        /* Empty state */
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium mb-1">No documents yet</p>
            <p className="text-gray-400 text-sm mb-6">
              Upload invoices, receipts and statements to keep your records in one place.
            </p>
            {/* Example ghost tiles */}
            <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto opacity-40">
              {[
                { icon: <FileText className="w-6 h-6 text-red-400" />, name: "Feed_Invoice.pdf" },
                {
                  icon: <FileSpreadsheet className="w-6 h-6 text-green-500" />,
                  name: "Cost_Data.csv",
                },
                { icon: <Camera className="w-6 h-6 text-blue-400" />, name: "Receipt_photo.jpg" },
              ].map((ex) => (
                <div
                  key={ex.name}
                  className="border border-gray-200 rounded-lg p-4 flex flex-col items-center gap-2"
                >
                  {ex.icon}
                  <p className="text-xs text-gray-500 truncate w-full text-center">{ex.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Date", "File Name", "Type", "Category", "Amount", "Mob Linked", "Processed", "Actions"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((doc) => (
                    <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{doc.date}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">
                        {doc.fileName}
                      </td>
                      <td className="px-4 py-3">
                        <FileIcon type={doc.fileType} />
                      </td>
                      <td className="px-4 py-3 text-gray-700">{doc.category}</td>
                      <td className="px-4 py-3 text-gray-900">{fmt(doc.amount)}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{doc.mobLinked ?? "—"}</td>
                      <td className="px-4 py-3">
                        <ProcessedBadge status={doc.processed} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            title="View"
                          >
                            <Eye className="w-3.5 h-3.5 text-gray-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5 text-gray-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            title="Re-process"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            title="Delete"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog (inline DocumentUpload) */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Financial Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              onDragOver={(e) => e.preventDefault()}
            >
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">
                Drop files here or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-1">PDF, CSV, Excel, JPEG, PNG up to 25MB</p>
              <input type="file" className="hidden" accept=".pdf,.csv,.xlsx,.jpg,.png" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {["Feed", "Freight", "Vet", "Interest", "Agistment", "Levy", "Insurance", "Labour", "Overhead", "Other"].map(
                      (c) => (
                        <SelectItem key={c} value={c.toLowerCase()}>
                          {c}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mob (optional)</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Link to mob…" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEMO_ENTERPRISES.map((e) => (
                      <SelectItem key={e.mob} value={e.mob}>
                        {e.mob}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => setUploadOpen(false)}>
                Upload &amp; Process
              </Button>
              <Button variant="outline" onClick={() => setUploadOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 4: FMD Tracker ───────────────────────────────────────────────────────

function FMDStatusBadge({ status }: { status: FMDDeposit["status"] }) {
  if (status === "active")
    return <Badge className="bg-green-100 text-green-700">Active</Badge>;
  if (status === "matured")
    return <Badge className="bg-blue-100 text-blue-700">Matured</Badge>;
  return <Badge className="bg-gray-100 text-gray-500">Withdrawn</Badge>;
}

function FMDTrackerTab() {
  const [deposits, setDeposits] = useState<FMDDeposit[]>(DEMO_FMD);
  const [addOpen, setAddOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const [newAmount, setNewAmount] = useState("");
  const [newInstitution, setNewInstitution] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newMaturity, setNewMaturity] = useState("");

  const MAX_FMD = 800000;
  const activeBalance = deposits
    .filter((d) => d.status === "active" || d.status === "matured")
    .reduce((s, d) => s + d.amount, 0);
  const pct = Math.round((activeBalance / MAX_FMD) * 100);
  const additional = 100000;
  const taxSaving = Math.round(additional * 0.47);

  function handleAddDeposit() {
    if (!newAmount || !newInstitution) return;
    const dep: FMDDeposit = {
      id: Date.now(),
      depositDate: newDate || "27 Jun 2025",
      amount: parseFloat(newAmount),
      institution: newInstitution,
      maturityDate: newMaturity || "27 Jun 2026",
      status: "active",
      taxYear: "2025-26",
    };
    setDeposits((prev) => [...prev, dep]);
    setAddOpen(false);
    setNewAmount("");
    setNewInstitution("");
    setNewDate("");
    setNewMaturity("");
  }

  return (
    <div className="space-y-6">
      {/* Balance card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Current FMD Balance
            </p>
            <p className="text-4xl font-bold text-gray-900 mb-1">
              {fmt(activeBalance)}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              of {fmt(MAX_FMD)} maximum allowed
            </p>
            <Progress value={pct} className="h-3 mb-2" />
            <p className="text-xs text-gray-400">{pct}% utilised</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6 flex flex-col justify-center">
            <p className="text-sm font-medium text-blue-800 mb-2">Tax Saving Opportunity</p>
            <p className="text-sm text-blue-700">
              Depositing an additional{" "}
              <span className="font-semibold">{fmt(additional)}</span> would save approximately{" "}
              <span className="font-bold text-blue-900">{fmt(taxSaving)}</span> in tax at 47%
              marginal rate.
            </p>
            <p className="text-xs text-blue-500 mt-3">
              You have {fmt(MAX_FMD - activeBalance)} remaining deposit capacity.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <Button className="gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Deposit
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => setWithdrawOpen(true)}>
          <Minus className="w-4 h-4" />
          Record Withdrawal
        </Button>
      </div>

      {/* History table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">FMD History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {["Deposit Date", "Amount", "Institution", "Maturity Date", "Status", "Withdrawal Date", "Tax Year"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {deposits.map((dep) => (
                  <tr key={dep.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{dep.depositDate}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{fmt(dep.amount)}</td>
                    <td className="px-4 py-3 text-gray-700">{dep.institution}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{dep.maturityDate}</td>
                    <td className="px-4 py-3">
                      <FMDStatusBadge status={dep.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">{dep.withdrawalDate ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{dep.taxYear}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400 italic">
        FMD decisions should be made in consultation with your tax advisor. Muster provides
        estimates only.
      </p>

      {/* Add Deposit Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add FMD Deposit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Amount ($)</Label>
              <Input
                type="number"
                placeholder="e.g. 80000"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Financial Institution</Label>
              <Input
                placeholder="e.g. ANZ Bank"
                value={newInstitution}
                onChange={(e) => setNewInstitution(e.target.value)}
              />
            </div>
            <div>
              <Label>Deposit Date</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Maturity Date</Label>
              <Input
                type="date"
                value={newMaturity}
                onChange={(e) => setNewMaturity(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleAddDeposit}>
                Save Deposit
              </Button>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Modal */}
      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record FMD Withdrawal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Select Deposit</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose deposit…" />
                </SelectTrigger>
                <SelectContent>
                  {deposits
                    .filter((d) => d.status !== "withdrawn")
                    .map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.institution} — {fmt(d.amount)} ({d.depositDate})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Withdrawal Date</Label>
              <Input type="date" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={() => setWithdrawOpen(false)}>
                Record Withdrawal
              </Button>
              <Button variant="outline" onClick={() => setWithdrawOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FinancialAnalysis() {
  const [financialYear, setFinancialYear] = useState("2024-25");

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financial Analysis</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Enterprise P&amp;L · Livestock Trading Account · Document Vault · FMD Tracker
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Financial Year</span>
            <Select value={financialYear} onValueChange={setFinancialYear}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024-25">2024-25</SelectItem>
                <SelectItem value="2025-26">2025-26</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pl">
          <TabsList className="mb-4">
            <TabsTrigger value="pl">P&amp;L Summary</TabsTrigger>
            <TabsTrigger value="trading">Livestock Trading Account</TabsTrigger>
            <TabsTrigger value="documents">Document Vault</TabsTrigger>
            <TabsTrigger value="fmd">FMD Tracker</TabsTrigger>
          </TabsList>

          <TabsContent value="pl">
            <PLSummaryTab financialYear={financialYear} />
          </TabsContent>

          <TabsContent value="trading">
            <LivestockTradingTab />
          </TabsContent>

          <TabsContent value="documents">
            <DocumentVaultTab />
          </TabsContent>

          <TabsContent value="fmd">
            <FMDTrackerTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
