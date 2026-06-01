import { useState, useCallback, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Upload, FileSpreadsheet, ChevronRight, Check,
  AlertTriangle, Plus, X, DollarSign, FileText,
  Building2, CreditCard, TableIcon, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type SourceType = "xero" | "myob" | "agrimaster" | "bank" | "custom" | null;

interface ParsedRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  mobId: string;
  include: boolean;
  needsReview: boolean;
}

interface CategoryRule {
  id: string;
  keywords: string[];
  category: string;
  enabled: boolean;
}

interface ColumnMapping {
  date: string;
  amount: string;
  description: string;
  category: string;
  reference: string;
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_ROWS: ParsedRow[] = [
  { id: "1",  date: "2025-05-14", description: "Riverina Stockfeeds – Barley delivery", amount: -3420.00, category: "Feed",      mobId: "", include: true, needsReview: false },
  { id: "2",  date: "2025-05-12", description: "Barwon Valley Vets – herd treatment",   amount: -820.00,  category: "Vet",       mobId: "", include: true, needsReview: false },
  { id: "3",  date: "2025-05-10", description: "Nutrien Ag Solutions – mineral lick",    amount: -640.50,  category: "Feed",      mobId: "", include: true, needsReview: false },
  { id: "4",  date: "2025-05-08", description: "Lachlan Freight Services – cattle move", amount: -2100.00, category: "Freight",   mobId: "", include: true, needsReview: false },
  { id: "5",  date: "2025-05-06", description: "MLA Levy – producer levy Q2",            amount: -475.20,  category: "Levy",      mobId: "", include: true, needsReview: false },
  { id: "6",  date: "2025-05-05", description: "Hillview Station – agistment May",       amount: -4800.00, category: "Agistment", mobId: "", include: true, needsReview: false },
  { id: "7",  date: "2025-05-03", description: "Castlereagh Stockfeeds – lupins",        amount: -1875.00, category: "Feed",      mobId: "", include: true, needsReview: false },
  { id: "8",  date: "2025-05-01", description: "ANZ Agri Finance – loan interest",       amount: -1200.00, category: "Interest",  mobId: "", include: true, needsReview: false },
  { id: "9",  date: "2025-04-30", description: "Dubbo Saleyards – purchase 42 steers",   amount: -58400.00,category: "Purchase",  mobId: "", include: true, needsReview: true  },
  { id: "10", date: "2025-04-28", description: "CRT Rural – drenching supplies",         amount: -390.00,  category: "Vet",       mobId: "", include: true, needsReview: false },
  { id: "11", date: "2025-04-25", description: "Orana Grain Co – oats delivery",         amount: -2640.00, category: "Feed",      mobId: "", include: true, needsReview: false },
  { id: "12", date: "2025-04-22", description: "Coonamble Freight – empty run",          amount: -850.00,  category: "Freight",   mobId: "", include: true, needsReview: false },
  { id: "13", date: "2025-04-20", description: "AgriMaster subscription – annual",       amount: -990.00,  category: "Other",     mobId: "", include: true, needsReview: false },
  { id: "14", date: "2025-04-18", description: "Elders Insurance – livestock policy",    amount: -3200.00, category: "Insurance", mobId: "", include: true, needsReview: false },
  { id: "15", date: "2025-04-15", description: "AACo – sale 38 head R2 steers",          amount: 47500.00, category: "Sale",      mobId: "", include: true, needsReview: true  },
  { id: "16", date: "2025-04-12", description: "Vet Clinic – preg testing",              amount: -660.00,  category: "Vet",       mobId: "", include: true, needsReview: false },
  { id: "17", date: "2025-04-10", description: "Local Grain Store – hay bales x40",     amount: -1960.00, category: "Feed",      mobId: "", include: true, needsReview: false },
  { id: "18", date: "2025-04-08", description: "Dubbo Freight – transport to agist",     amount: -1700.00, category: "Freight",   mobId: "", include: true, needsReview: false },
  { id: "19", date: "2025-04-05", description: "Labour hire – mustering crew",           amount: -2400.00, category: "Labour",    mobId: "", include: true, needsReview: false },
  { id: "20", date: "2025-04-01", description: "Unknown payment ref 39821",              amount: -320.00,  category: "Unknown",   mobId: "", include: true, needsReview: true  },
];

const DEFAULT_RULES: CategoryRule[] = [
  { id: "r1", keywords: ["grain", "feed", "hay", "lupins", "oats", "barley", "silage", "stockfeed"], category: "Feed",      enabled: true  },
  { id: "r2", keywords: ["vet", "animal health", "clinic", "drench", "preg testing"],                category: "Vet",       enabled: true  },
  { id: "r3", keywords: ["freight", "transport", "haulage", "trucking"],                             category: "Freight",   enabled: true  },
  { id: "r4", keywords: ["agistment", "agist", "lease"],                                             category: "Agistment", enabled: true  },
  { id: "r5", keywords: ["mla", "levy"],                                                             category: "Levy",      enabled: true  },
];

const SOURCE_MAPPINGS: Record<string, Partial<ColumnMapping>> = {
  xero:        { date: "Date",             amount: "Amount",        description: "Description", reference: "Reference" },
  myob:        { date: "Date",             amount: "Amount (Debit)",description: "Description", reference: "Invoice Number" },
  agrimaster:  { date: "Date",             amount: "Value",         description: "Details" },
  bank:        { date: "Transaction Date", amount: "Debit Amount",  description: "Narration" },
  custom:      {},
};

const CATEGORY_COLOURS: Record<string, string> = {
  Feed:      "bg-green-100 text-green-800",
  Vet:       "bg-blue-100 text-blue-800",
  Freight:   "bg-orange-100 text-orange-800",
  Agistment: "bg-purple-100 text-purple-800",
  Levy:      "bg-yellow-100 text-yellow-800",
  Purchase:  "bg-red-100 text-red-800",
  Sale:      "bg-teal-100 text-teal-800",
  Insurance: "bg-indigo-100 text-indigo-800",
  Interest:  "bg-pink-100 text-pink-800",
  Labour:    "bg-cyan-100 text-cyan-800",
  Other:     "bg-gray-100 text-gray-700",
  Unknown:   "bg-amber-100 text-amber-800",
};

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  const steps = ["Upload", "Map Columns", "Review & Confirm"];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const idx = i + 1;
        const isComplete = step > idx;
        const isActive = step === idx;
        return (
          <div key={idx} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors",
                isComplete ? "bg-teal-600 border-teal-600 text-white"
                  : isActive ? "border-teal-600 text-teal-600 bg-white"
                  : "border-gray-300 text-gray-400 bg-white"
              )}>
                {isComplete ? <Check className="w-4 h-4" /> : idx}
              </div>
              <span className={cn("text-sm font-medium", isActive ? "text-teal-700" : isComplete ? "text-teal-600" : "text-gray-400")}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight className="w-5 h-5 mx-3 text-gray-300" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FinancialImport() {
  const { toast } = useToast();

  // Wizard state
  const [step, setStep] = useState(1);
  const [sourceType, setSourceType] = useState<SourceType>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>(["Date", "Description", "Amount", "Reference", "Category"]);
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ date: "", amount: "", description: "", category: "", reference: "" });
  const [rules, setRules] = useState<CategoryRule[]>(DEFAULT_RULES);
  const [newKeyword, setNewKeyword] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mobs, setMobs] = useState<{ id: string; name: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Step 1: file handling ──────────────────────────────────────────────────

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) acceptFile(f);
  }, []);

  function acceptFile(f: File) {
    setFile(f);
    // Simulate parsing CSV headers + preview rows
    const demoHeaders = ["Date", "Description", "Amount", "Reference", "Category"];
    const demoPreview = [
      { Date: "14/05/2025", Description: "Riverina Stockfeeds", Amount: "-3420.00", Reference: "INV-001", Category: "" },
      { Date: "12/05/2025", Description: "Barwon Valley Vets", Amount: "-820.00",   Reference: "REC-002", Category: "" },
      { Date: "10/05/2025", Description: "Nutrien Ag Solutions", Amount: "-640.50",  Reference: "INV-003", Category: "" },
      { Date: "08/05/2025", Description: "Lachlan Freight",     Amount: "-2100.00", Reference: "FRT-004", Category: "" },
      { Date: "06/05/2025", Description: "MLA Levy Q2",         Amount: "-475.20",  Reference: "MLA-005", Category: "" },
    ];
    setCsvHeaders(demoHeaders);
    setCsvPreview(demoPreview);
  }

  function handleSourceSelect(src: SourceType) {
    setSourceType(src);
    if (src && SOURCE_MAPPINGS[src]) {
      const m = SOURCE_MAPPINGS[src];
      setMapping(prev => ({ ...prev, ...m }));
    }
  }

  function loadDemoData() {
    setRows(DEMO_ROWS);
    setMobs([{ id: "mob-1", name: "Feeder Steers – Hillview" }, { id: "mob-2", name: "R2 Heifers – Home" }, { id: "mob-3", name: "Weaners – Paddock 3" }]);
    setStep(3);
  }

  // ── Step 2: rules ──────────────────────────────────────────────────────────

  function addRule() {
    if (!newKeyword || !newCategory) return;
    setRules(prev => [...prev, { id: `r${Date.now()}`, keywords: [newKeyword], category: newCategory, enabled: true }]);
    setNewKeyword("");
    setNewCategory("");
  }

  function removeRule(id: string) {
    setRules(prev => prev.filter(r => r.id !== id));
  }

  function applyMappingAndRules() {
    // Apply rules to demo preview rows → generate parsed rows
    const generated: ParsedRow[] = DEMO_ROWS.map(r => {
      const activeRules = rules.filter(rl => rl.enabled);
      let cat = r.category;
      for (const rule of activeRules) {
        if (rule.keywords.some(kw => r.description.toLowerCase().includes(kw.toLowerCase()))) {
          cat = rule.category;
          break;
        }
      }
      return { ...r, category: cat };
    });
    setRows(generated);
    setMobs([{ id: "mob-1", name: "Feeder Steers – Hillview" }, { id: "mob-2", name: "R2 Heifers – Home" }, { id: "mob-3", name: "Weaners – Paddock 3" }]);
    setStep(3);
  }

  // ── Step 3: review & import ────────────────────────────────────────────────

  function toggleRow(id: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, include: !r.include } : r));
  }

  function setRowMob(id: string, mobId: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, mobId } : r));
  }

  async function doImport() {
    setImporting(true);
    try {
      const toImport = rows.filter(r => r.include);

      // Insert into cost_entries (using any cast since table may not be in generated types yet)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("cost_entries").insert(
        toImport.map(r => ({
          entry_date: r.date,
          description: r.description,
          amount: r.amount,
          category: r.category,
          mob_id: r.mobId || null,
          source: "import",
        }))
      );
      if (error) throw error;

      toast({ title: "Import complete", description: `${toImport.length} transactions imported successfully.` });
      setStep(1);
      setFile(null);
      setRows([]);
    } catch {
      toast({ title: "Import failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }

  const included = rows.filter(r => r.include);
  const totalAmt = included.reduce((s, r) => s + r.amount, 0);
  const needsReview = rows.filter(r => r.include && r.needsReview).length;
  const categories = new Set(included.map(r => r.category)).size;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Import Financial Transactions</h1>
          <p className="text-gray-500 mt-1">Import from Xero, MYOB, bank statements or custom spreadsheets</p>
        </div>

        <StepIndicator step={step} />

        {/* ── STEP 1: UPLOAD ── */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-colors",
                isDragging ? "border-teal-500 bg-teal-50" : file ? "border-teal-400 bg-teal-50/50" : "border-gray-300 hover:border-teal-400 hover:bg-gray-50"
              )}
            >
              {file ? (
                <>
                  <FileSpreadsheet className="w-12 h-12 text-teal-600" />
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Badge className="bg-teal-100 text-teal-700 border-0">Ready to map</Badge>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-300" />
                  <div className="text-center">
                    <p className="font-semibold text-gray-700">Drop your file here</p>
                    <p className="text-sm text-gray-400">Accepts .csv, .xlsx, .xls</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>
                    Browse files
                  </Button>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={e => e.target.files?.[0] && acceptFile(e.target.files[0])}
              />
            </div>

            {/* Source buttons */}
            <div>
              <p className="text-sm font-medium text-gray-600 mb-3">Or select your data source to pre-fill column mapping:</p>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: "xero",       label: "Xero Export",       colour: "border-teal-300 text-teal-700 hover:bg-teal-50",     icon: <FileText className="w-4 h-4" /> },
                  { key: "myob",       label: "MYOB Export",        colour: "border-purple-300 text-purple-700 hover:bg-purple-50", icon: <FileText className="w-4 h-4" /> },
                  { key: "agrimaster", label: "AgriMaster Export",  colour: "border-green-300 text-green-700 hover:bg-green-50",   icon: <TableIcon className="w-4 h-4" /> },
                  { key: "bank",       label: "Bank Statement CSV", colour: "border-blue-300 text-blue-700 hover:bg-blue-50",      icon: <CreditCard className="w-4 h-4" /> },
                  { key: "custom",     label: "Custom Spreadsheet", colour: "border-gray-300 text-gray-600 hover:bg-gray-50",      icon: <FileSpreadsheet className="w-4 h-4" /> },
                ].map(s => (
                  <Button
                    key={s.key}
                    variant="outline"
                    className={cn("gap-2", s.colour, sourceType === s.key && "ring-2 ring-offset-1 ring-current")}
                    onClick={() => handleSourceSelect(s.key as SourceType)}
                  >
                    {s.icon}
                    {s.label}
                    {sourceType === s.key && <Check className="w-3 h-3" />}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-600"
                onClick={loadDemoData}
              >
                Load Demo Data
              </Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
                disabled={!file}
                onClick={() => setStep(2)}
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: MAP COLUMNS ── */}
        {step === 2 && (
          <div className="space-y-6">
            {/* CSV preview */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">File Preview — first 5 rows</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {csvHeaders.map(h => <TableHead key={h} className="text-xs">{h}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvPreview.map((row, i) => (
                      <TableRow key={i}>
                        {csvHeaders.map(h => <TableCell key={h} className="text-xs">{row[h]}</TableCell>)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Column mapping */}
            <Card>
              <CardHeader><CardTitle className="text-base">Map Columns</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([
                    { key: "date",        label: "Date column",              required: true  },
                    { key: "amount",      label: "Amount column",            required: true  },
                    { key: "description", label: "Description / Payee",      required: true  },
                    { key: "category",    label: "Category column",          required: false },
                    { key: "reference",   label: "Reference column",         required: false },
                  ] as { key: keyof ColumnMapping; label: string; required: boolean }[]).map(f => (
                    <div key={f.key} className="space-y-1">
                      <Label className="text-sm">
                        {f.label} {f.required && <span className="text-red-500">*</span>}
                        {!f.required && <span className="text-gray-400 text-xs ml-1">(optional)</span>}
                      </Label>
                      <Select value={mapping[f.key]} onValueChange={v => setMapping(prev => ({ ...prev, [f.key]: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select column…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">— skip —</SelectItem>
                          {csvHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category rules */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Category Rules</CardTitle>
                <p className="text-sm text-gray-500">Auto-categorise transactions based on keywords in the description.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {rules.map(rule => (
                  <div key={rule.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={v => setRules(prev => prev.map(r => r.id === rule.id ? { ...r, enabled: v } : r))}
                    />
                    <span className="text-sm flex-1 text-gray-700">
                      If description contains <span className="font-medium text-gray-900">{rule.keywords.join(", ")}</span> → category = <Badge className={cn("ml-1 border-0 text-xs", CATEGORY_COLOURS[rule.category] ?? "bg-gray-100 text-gray-700")}>{rule.category}</Badge>
                    </span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-red-500" onClick={() => removeRule(rule.id)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}

                {/* Add rule */}
                <div className="flex gap-2 pt-2">
                  <Input
                    placeholder="Keyword (e.g. grain)"
                    value={newKeyword}
                    onChange={e => setNewKeyword(e.target.value)}
                    className="flex-1 h-8 text-sm"
                  />
                  <Input
                    placeholder="Category"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="flex-1 h-8 text-sm"
                  />
                  <Button size="sm" variant="outline" className="h-8 gap-1" onClick={addRule}>
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2" onClick={applyMappingAndRules}>
                Preview Import <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: REVIEW & CONFIRM ── */}
        {step === 3 && (
          <div className="space-y-5">
            {/* Summary bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Transactions",  value: included.length.toString(),                          icon: <FileText className="w-4 h-4 text-teal-600" /> },
                { label: "Total",         value: `$${Math.abs(totalAmt).toLocaleString("en-AU", { minimumFractionDigits: 2 })}`, icon: <DollarSign className="w-4 h-4 text-teal-600" /> },
                { label: "Categories",    value: categories.toString(),                               icon: <TableIcon className="w-4 h-4 text-teal-600" /> },
                { label: "Need Review",   value: needsReview.toString(),                              icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> },
              ].map(s => (
                <Card key={s.label} className="p-3">
                  <div className="flex items-center gap-2">
                    {s.icon}
                    <div>
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className="font-semibold text-gray-900">{s.value}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {needsReview > 0 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {needsReview} transaction{needsReview > 1 ? "s" : ""} flagged for review — large amounts or unrecognised categories are highlighted below.
              </div>
            )}

            {/* Review table */}
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">
                        <Checkbox
                          checked={rows.every(r => r.include)}
                          onCheckedChange={v => setRows(prev => prev.map(r => ({ ...r, include: !!v })))}
                        />
                      </TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Mob</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(row => (
                      <TableRow
                        key={row.id}
                        className={cn(
                          row.needsReview && row.include ? Math.abs(row.amount) >= 10000 ? "bg-red-50" : "bg-amber-50" : ""
                        )}
                      >
                        <TableCell>
                          <Checkbox checked={row.include} onCheckedChange={() => toggleRow(row.id)} />
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{row.date}</TableCell>
                        <TableCell className="text-sm max-w-[220px] truncate">{row.description}</TableCell>
                        <TableCell className={cn("text-sm text-right font-medium whitespace-nowrap", row.amount < 0 ? "text-red-600" : "text-green-600")}>
                          {row.amount < 0 ? "-" : "+"}${Math.abs(row.amount).toLocaleString("en-AU", { minimumFractionDigits: 2 })}
                          {Math.abs(row.amount) >= 10000 && <AlertTriangle className="inline w-3 h-3 ml-1 text-amber-500" />}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs border-0", CATEGORY_COLOURS[row.category] ?? "bg-gray-100 text-gray-700")}>
                            {row.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select value={row.mobId} onValueChange={v => setRowMob(row.id, v)}>
                            <SelectTrigger className="h-7 text-xs w-44">
                              <SelectValue placeholder="Assign mob…" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">— none —</SelectItem>
                              {mobs.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(file ? 2 : 1)}>← Back</Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
                disabled={importing || included.length === 0}
                onClick={doImport}
              >
                {importing ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</> : `Import ${included.length} Transactions`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
