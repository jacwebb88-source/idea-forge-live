import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  TrendingUp, Package, FolderOpen, Upload, CheckCircle2, XCircle,
  Clock, AlertTriangle, Star, RefreshCw, FileText, Shield, Award, Layers
} from "lucide-react";
import { format, addDays } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ExportConsignment {
  id: string;
  consignment_ref: string;
  destination_market: string;
  destination_country: string;
  head_count: number;
  total_hscw_kg: number;
  price_per_kg: number;
  total_value: number;
  halal_cert_number: string | null;
  health_cert_number: string | null;
  status: "pending" | "docs_complete" | "shipped" | "delivered" | "rejected";
  ship_date: string | null;
  delivered_date: string | null;
}

// ── Demo Data ──────────────────────────────────────────────────────────────────

const today = new Date();

const DEMO_CONSIGNMENTS: ExportConsignment[] = [
  {
    id: "1", consignment_ref: "CON-2025-0041",
    destination_market: "Japan", destination_country: "Japan",
    head_count: 95, total_hscw_kg: 28500, price_per_kg: 14.50, total_value: 413250,
    halal_cert_number: null, health_cert_number: "HC-AQIS-8841",
    status: "shipped", ship_date: format(addDays(today, -5), "yyyy-MM-dd"), delivered_date: null,
  },
  {
    id: "2", consignment_ref: "CON-2025-0042",
    destination_market: "EU", destination_country: "Germany",
    head_count: 180, total_hscw_kg: 54000, price_per_kg: 8.85, total_value: 477900,
    halal_cert_number: null, health_cert_number: "HC-AQIS-8842",
    status: "docs_complete", ship_date: format(addDays(today, 8), "yyyy-MM-dd"), delivered_date: null,
  },
  {
    id: "3", consignment_ref: "CON-2025-0043",
    destination_market: "Halal", destination_country: "Malaysia",
    head_count: 310, total_hscw_kg: 93000, price_per_kg: 7.20, total_value: 669600,
    halal_cert_number: "AFIC-2025-0312", health_cert_number: "HC-AQIS-8843",
    status: "pending", ship_date: format(addDays(today, 21), "yyyy-MM-dd"), delivered_date: null,
  },
  {
    id: "4", consignment_ref: "CON-2025-0038",
    destination_market: "USA", destination_country: "United States",
    head_count: 140, total_hscw_kg: 42000, price_per_kg: 8.40, total_value: 352800,
    halal_cert_number: null, health_cert_number: "HC-AQIS-8804",
    status: "delivered", ship_date: format(addDays(today, -28), "yyyy-MM-dd"), delivered_date: format(addDays(today, -10), "yyyy-MM-dd"),
  },
  {
    id: "5", consignment_ref: "CON-2025-0039",
    destination_market: "Korea", destination_country: "South Korea",
    head_count: 80, total_hscw_kg: 24000, price_per_kg: 9.60, total_value: 230400,
    halal_cert_number: null, health_cert_number: "HC-AQIS-8815",
    status: "rejected", ship_date: format(addDays(today, -14), "yyyy-MM-dd"), delivered_date: null,
  },
];

// Market comparison table data
const MARKET_ROWS = [
  { market: "EU",       pricePerKg: 8.85,  estHead: 180, estRevenue: 95580,  premium: "+18%", certs: "DAFF Export + EU Listed",         best: false },
  { market: "Japan",    pricePerKg: 14.50, estHead: 95,  estRevenue: 82650,  premium: "+54%", certs: "DAFF Export + Japan MAFF + GFF",   best: true  },
  { market: "Halal",    pricePerKg: 7.20,  estHead: 310, estRevenue: 156240, premium: "−4%",  certs: "Halal Cert (AFIC/ANIC/HFA)",       best: false },
  { market: "USA",      pricePerKg: 8.40,  estHead: 310, estRevenue: 156240, premium: "+12%", certs: "DAFF Export + FSIS",               best: false },
  { market: "Korea",    pricePerKg: 9.60,  estHead: 140, estRevenue: 80640,  premium: "+28%", certs: "DAFF Export + Korea MFDS",         best: false },
  { market: "Domestic", pricePerKg: 7.50,  estHead: 490, estRevenue: 275625, premium: "baseline", certs: "None",                         best: false },
];

// Document vault data keyed by consignment_ref
const VAULT_DOCS: Record<string, { name: string; status: "uploaded" | "missing" | "pending"; uploadDate?: string }[]> = {
  "CON-2025-0041": [
    { name: "Health Certificate (AQIS)", status: "uploaded", uploadDate: format(addDays(today, -8), "dd MMM yyyy") },
    { name: "Grading Report (AUS-MEAT)", status: "uploaded", uploadDate: format(addDays(today, -7), "dd MMM yyyy") },
    { name: "Vendor Declaration copies", status: "uploaded", uploadDate: format(addDays(today, -6), "dd MMM yyyy") },
    { name: "NLIS Transfer Confirmation", status: "uploaded", uploadDate: format(addDays(today, -6), "dd MMM yyyy") },
    { name: "Export Entry (ACS)", status: "uploaded", uploadDate: format(addDays(today, -5), "dd MMM yyyy") },
  ],
  "CON-2025-0042": [
    { name: "Health Certificate (AQIS)", status: "uploaded", uploadDate: format(addDays(today, -2), "dd MMM yyyy") },
    { name: "Grading Report (AUS-MEAT)", status: "uploaded", uploadDate: format(addDays(today, -2), "dd MMM yyyy") },
    { name: "Vendor Declaration copies", status: "pending" },
    { name: "NLIS Transfer Confirmation", status: "uploaded", uploadDate: format(addDays(today, -1), "dd MMM yyyy") },
    { name: "Export Entry (ACS)", status: "missing" },
  ],
  "CON-2025-0043": [
    { name: "Health Certificate (AQIS)", status: "missing" },
    { name: "Halal Certificate (AFIC)", status: "uploaded", uploadDate: format(addDays(today, -3), "dd MMM yyyy") },
    { name: "Grading Report (AUS-MEAT)", status: "missing" },
    { name: "Vendor Declaration copies", status: "pending" },
    { name: "NLIS Transfer Confirmation", status: "missing" },
    { name: "Export Entry (ACS)", status: "missing" },
  ],
  "CON-2025-0038": [
    { name: "Health Certificate (AQIS)", status: "uploaded", uploadDate: format(addDays(today, -30), "dd MMM yyyy") },
    { name: "Grading Report (AUS-MEAT)", status: "uploaded", uploadDate: format(addDays(today, -29), "dd MMM yyyy") },
    { name: "Vendor Declaration copies", status: "uploaded", uploadDate: format(addDays(today, -29), "dd MMM yyyy") },
    { name: "NLIS Transfer Confirmation", status: "uploaded", uploadDate: format(addDays(today, -29), "dd MMM yyyy") },
    { name: "Export Entry (ACS)", status: "uploaded", uploadDate: format(addDays(today, -28), "dd MMM yyyy") },
  ],
  "CON-2025-0039": [
    { name: "Health Certificate (AQIS)", status: "uploaded", uploadDate: format(addDays(today, -16), "dd MMM yyyy") },
    { name: "Grading Report (AUS-MEAT)", status: "uploaded", uploadDate: format(addDays(today, -15), "dd MMM yyyy") },
    { name: "Vendor Declaration copies", status: "missing" },
    { name: "NLIS Transfer Confirmation", status: "uploaded", uploadDate: format(addDays(today, -15), "dd MMM yyyy") },
    { name: "Export Entry (ACS)", status: "uploaded", uploadDate: format(addDays(today, -14), "dd MMM yyyy") },
  ],
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  return `$${n.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function statusBadge(status: ExportConsignment["status"]) {
  switch (status) {
    case "pending":      return <Badge className="bg-slate-100 text-slate-600 border border-slate-300 text-xs">Pending</Badge>;
    case "docs_complete":return <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-xs">Docs Complete</Badge>;
    case "shipped":      return <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-xs">Shipped</Badge>;
    case "delivered":    return <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs">Delivered</Badge>;
    case "rejected":     return <Badge className="bg-red-100 text-red-700 border border-red-200 text-xs">Rejected</Badge>;
  }
}

function docStatusIcon(status: "uploaded" | "missing" | "pending") {
  if (status === "uploaded") return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
  if (status === "missing")  return <XCircle className="w-4 h-4 text-red-500" />;
  return <Clock className="w-4 h-4 text-amber-500" />;
}

function docStatusBadge(status: "uploaded" | "missing" | "pending") {
  if (status === "uploaded") return <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs">Uploaded</Badge>;
  if (status === "missing")  return <Badge className="bg-red-100 text-red-700 border border-red-200 text-xs">Missing</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-xs">Pending</Badge>;
}

function completenessScore(docs: { status: string }[]) {
  const done = docs.filter(d => d.status === "uploaded").length;
  return Math.round((done / docs.length) * 100);
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function EnterpriseExport() {
  const [consignments, setConsignments] = useState<ExportConsignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data } = await supabase.from("export_consignments").select("*").order("ship_date", { ascending: false });
        setConsignments((data && data.length > 0) ? data as ExportConsignment[] : DEMO_CONSIGNMENTS);
      } catch {
        setConsignments(DEMO_CONSIGNMENTS);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalRevenue = consignments.reduce((s, c) => s + c.total_value, 0);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Enterprise Export</h1>
            <p className="text-sm text-slate-500 mt-0.5">Market comparison, consignment tracking, and export documentation</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="market">
          <TabsList className="mb-4">
            <TabsTrigger value="market" className="gap-1.5"><TrendingUp className="w-4 h-4" />Market Comparison</TabsTrigger>
            <TabsTrigger value="consignments" className="gap-1.5"><Package className="w-4 h-4" />Consignment Tracker</TabsTrigger>
            <TabsTrigger value="vault" className="gap-1.5"><FolderOpen className="w-4 h-4" />Document Vault</TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Market Comparison ── */}
          <TabsContent value="market" className="space-y-4">
            {/* Recommended callout */}
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <Star className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Recommended: Japan (highest $/kg carcase)</p>
                <p className="text-xs text-emerald-700">At $14.50/kg, Japan commands a 54% premium over domestic pricing. Ensure DAFF Export, Japan MAFF, and GFF certifications are current.</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Market</TableHead>
                    <TableHead className="text-right">$/kg Carcase</TableHead>
                    <TableHead className="text-right">Est. Head Eligible</TableHead>
                    <TableHead className="text-right">Est. Revenue</TableHead>
                    <TableHead className="text-right">Premium vs Domestic</TableHead>
                    <TableHead>Cert Required</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MARKET_ROWS.map(row => (
                    <TableRow
                      key={row.market}
                      className={row.best ? "bg-emerald-50 font-medium" : ""}
                    >
                      <TableCell className="font-semibold text-slate-800 flex items-center gap-2">
                        {row.best && <Star className="w-3.5 h-3.5 text-emerald-600" />}
                        {row.market}
                      </TableCell>
                      <TableCell className={`text-right font-mono ${row.best ? "text-emerald-700 font-bold" : ""}`}>
                        ${row.pricePerKg.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">{row.estHead.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">{fmt$(row.estRevenue)}</TableCell>
                      <TableCell className="text-right">
                        {row.premium === "baseline"
                          ? <span className="text-slate-500 text-sm">Baseline</span>
                          : <span className={`text-sm font-medium ${row.premium.startsWith("−") ? "text-red-600" : "text-emerald-700"}`}>{row.premium}</span>}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{row.certs}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <p className="text-xs text-slate-400">
              Prices indicative based on current market benchmarks. Head-eligible estimates based on current mob inventory and eligibility criteria.
            </p>
          </TabsContent>

          {/* ── Tab 2: Consignment Tracker ── */}
          <TabsContent value="consignments" className="space-y-4">
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Ref</TableHead>
                    <TableHead>Market</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead className="text-right">Head</TableHead>
                    <TableHead className="text-right">HSCW (kg)</TableHead>
                    <TableHead className="text-right">$/kg</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead>Cert #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ship Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consignments.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-sm text-slate-700">{c.consignment_ref}</TableCell>
                      <TableCell className="font-medium text-slate-800">{c.destination_market}</TableCell>
                      <TableCell className="text-slate-600">{c.destination_country}</TableCell>
                      <TableCell className="text-right">{c.head_count.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{c.total_hscw_kg.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono">${c.price_per_kg.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold text-slate-800">{fmt$(c.total_value)}</TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">
                        {c.halal_cert_number ?? c.health_cert_number ?? "—"}
                      </TableCell>
                      <TableCell>{statusBadge(c.status)}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {c.ship_date ? format(new Date(c.ship_date), "dd MMM yyyy") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Total row */}
            <div className="flex justify-end">
              <div className="text-right bg-slate-50 border border-slate-200 rounded-lg px-6 py-3">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total Pipeline Revenue</p>
                <p className="text-2xl font-bold text-slate-800">{fmt$(totalRevenue)}</p>
              </div>
            </div>
          </TabsContent>

          {/* ── Tab 3: Document Vault ── */}
          <TabsContent value="vault" className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <Shield className="w-4 h-4 text-blue-600 shrink-0" />
              All export documents are stored per consignment. Ensure all required documents are uploaded before ship date.
            </div>

            {consignments.map(c => {
              const docs = VAULT_DOCS[c.consignment_ref] ?? [
                { name: "Health Certificate (AQIS)", status: "missing" as const },
                { name: "Grading Report (AUS-MEAT)", status: "missing" as const },
                { name: "Vendor Declaration copies", status: "missing" as const },
                { name: "NLIS Transfer Confirmation", status: "missing" as const },
                { name: "Export Entry (ACS)", status: "missing" as const },
              ];
              const score = completenessScore(docs);
              const scoreColor = score === 100 ? "text-emerald-700" : score >= 60 ? "text-amber-700" : "text-red-600";
              const scoreBg   = score === 100 ? "border-emerald-300" : score >= 60 ? "border-amber-300" : "border-red-300";

              return (
                <Card key={c.id} className="border-slate-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-base font-semibold text-slate-800">
                          {c.consignment_ref}
                          <span className="ml-2 text-sm font-normal text-slate-500">
                            · {c.destination_market} ({c.destination_country})
                          </span>
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-0.5">
                          {c.head_count} head · {fmt$(c.total_value)} · Ship: {c.ship_date ? format(new Date(c.ship_date), "dd MMM yyyy") : "TBC"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {statusBadge(c.status)}
                        <div className={`flex flex-col items-center justify-center w-16 h-16 rounded-full border-4 ${scoreBg} bg-white`}>
                          <span className={`text-lg font-bold ${scoreColor}`}>{score}%</span>
                          <span className="text-[10px] text-slate-500 leading-tight text-center">Complete</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="divide-y divide-slate-100">
                      {docs.map((doc, i) => (
                        <div key={i} className="flex items-center justify-between py-2.5 gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            {docStatusIcon(doc.status)}
                            <span className="text-sm text-slate-700 truncate">{doc.name}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {doc.uploadDate && (
                              <span className="text-xs text-slate-400">{doc.uploadDate}</span>
                            )}
                            {docStatusBadge(doc.status)}
                            {doc.status !== "uploaded" && (
                              <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs">
                                <Upload className="w-3 h-3" />
                                Upload
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
