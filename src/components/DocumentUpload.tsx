import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import {
  Upload, FileText, ImageIcon, FileSpreadsheet,
  Trash2, Sparkles, Check, AlertCircle, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadedDoc {
  id: string;
  fileName: string;
  fileType: string;
  amount?: number;
  date?: string;
  category?: string;
}

interface DocumentUploadProps {
  mobId?: string;
  bookingId?: string;
  onUploadComplete?: (doc: UploadedDoc) => void;
}

interface DocDetails {
  docType: string;
  date: string;
  amount: string;
  supplier: string;
  category: string;
  description: string;
  attachToMob: boolean;
}

interface RecentDoc {
  id: string;
  file_name: string;
  document_date: string | null;
  amount: number | null;
  category: string | null;
  mime_type: string;
}

const DOC_TYPES = [
  "Receipt", "Invoice", "Bank Statement", "Tax Return",
  "Agistment Agreement", "Vet Report", "Freight Invoice", "Feed Invoice", "Other",
];

const CATEGORIES = [
  "Feed", "Freight", "Vet", "Agistment", "Purchase", "Sale",
  "Levy", "Insurance", "Interest", "Labour", "Other",
];

const CATEGORY_COLOURS: Record<string, string> = {
  Feed:      "bg-green-100 text-green-800",
  Freight:   "bg-orange-100 text-orange-800",
  Vet:       "bg-blue-100 text-blue-800",
  Agistment: "bg-purple-100 text-purple-800",
  Purchase:  "bg-red-100 text-red-800",
  Sale:      "bg-teal-100 text-teal-800",
  Levy:      "bg-yellow-100 text-yellow-800",
  Insurance: "bg-indigo-100 text-indigo-800",
  Interest:  "bg-pink-100 text-pink-800",
  Labour:    "bg-cyan-100 text-cyan-800",
  Other:     "bg-gray-100 text-gray-700",
};

function fileIcon(mime: string) {
  if (mime.startsWith("image/")) return <ImageIcon className="w-4 h-4 text-purple-500" />;
  if (mime === "application/pdf") return <FileText className="w-4 h-4 text-red-500" />;
  return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
}

const EMPTY_DETAILS: DocDetails = {
  docType: "", date: "", amount: "", supplier: "", category: "", description: "", attachToMob: true,
};

// ─── Simulated AI extraction banner ───────────────────────────────────────────

const AI_RESULT = {
  amount: "3420",
  supplier: "Riverina Stockfeeds",
  date: "2025-05-14",
  category: "Feed",
  docType: "Feed Invoice",
};

// ─── Main component ───────────────────────────────────────────────────────────

export function DocumentUpload({ mobId, bookingId, onUploadComplete }: DocumentUploadProps) {
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [details, setDetails] = useState<DocDetails>(EMPTY_DETAILS);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [aiVisible, setAiVisible] = useState(false);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load recent docs when component mounts or mobId changes
  useEffect(() => {
    fetchRecentDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobId]);

  async function fetchRecentDocs() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase as any).from("financial_documents").select("id, file_name, document_date, amount, category, mime_type").order("created_at", { ascending: false }).limit(5);
    if (mobId) q = q.eq("mob_id", mobId);
    const { data } = await q;
    if (data) setRecentDocs(data as RecentDoc[]);
  }

  // ── File handling ──────────────────────────────────────────────────────────

  const acceptFile = useCallback((f: File) => {
    setFile(f);
    setUploadDone(false);
    setUploadError(null);
    setProgress(0);
    setAiVisible(false);
    setDetails(EMPTY_DETAILS);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) acceptFile(f);
  }, [acceptFile]);

  function applyAI() {
    setDetails(prev => ({
      ...prev,
      amount: AI_RESULT.amount,
      supplier: AI_RESULT.supplier,
      date: AI_RESULT.date,
      category: AI_RESULT.category,
      docType: AI_RESULT.docType,
    }));
    setAiVisible(false);
  }

  // ── Upload ─────────────────────────────────────────────────────────────────

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setUploadError(null);

    try {
      const timestamp = Date.now();
      const folder = mobId ?? "general";
      const path = `${folder}/${timestamp}-${file.name}`;

      // Simulate progress
      let prog = 0;
      const ticker = setInterval(() => {
        prog = Math.min(prog + 15, 85);
        setProgress(prog);
      }, 150);

      const { error: storageError } = await supabase.storage
        .from("financial-docs")
        .upload(path, file, { contentType: file.type });

      clearInterval(ticker);

      if (storageError) throw storageError;

      setProgress(90);

      // Insert metadata row
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: inserted, error: dbError } = await (supabase as any)
        .from("financial_documents")
        .insert({
          file_path: path,
          file_name: file.name,
          mime_type: file.type,
          document_date: details.date || null,
          amount: details.amount ? parseFloat(details.amount) : null,
          supplier_name: details.supplier || null,
          category: details.category || null,
          mob_id: details.attachToMob && mobId ? mobId : null,
          booking_id: bookingId ?? null,
          document_type: details.docType || null,
          description: details.description || null,
        })
        .select("id")
        .single();

      if (dbError) throw dbError;

      setProgress(100);
      setUploadDone(true);
      setUploading(false);

      // Trigger AI extraction banner after short delay for PDF/image
      if (file.type === "application/pdf" || file.type.startsWith("image/")) {
        setTimeout(() => setAiVisible(true), 500);
      }

      onUploadComplete?.({
        id: inserted?.id ?? "",
        fileName: file.name,
        fileType: file.type,
        amount: details.amount ? parseFloat(details.amount) : undefined,
        date: details.date || undefined,
        category: details.category || undefined,
      });

      fetchRecentDocs();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setUploading(false);
      setProgress(0);
    }
  }

  async function deleteDoc(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("financial_documents").delete().eq("id", id);
    setRecentDocs(prev => prev.filter(d => d.id !== id));
    toast({ title: "Document deleted" });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const set = (key: keyof DocDetails) => (val: string | boolean) =>
    setDetails(prev => ({ ...prev, [key]: val }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">

      {/* AI extraction banner */}
      {aiVisible && (
        <div className="flex items-center gap-3 px-4 py-3 bg-teal-50 border-b border-teal-200 text-sm text-teal-900 animate-in slide-in-from-top-2">
          <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
          <span className="flex-1">
            <span className="font-medium">Muster extracted:</span> ${AI_RESULT.amount} — {AI_RESULT.supplier} — {AI_RESULT.date} — {AI_RESULT.category}
          </span>
          <Button size="sm" className="h-7 bg-teal-600 hover:bg-teal-700 text-white" onClick={applyAI}>Apply</Button>
          <Button size="sm" variant="ghost" className="h-7 text-teal-700" onClick={() => setAiVisible(false)}>Edit</Button>
          <button onClick={() => setAiVisible(false)}><X className="w-4 h-4 text-teal-500" /></button>
        </div>
      )}

      <div className="p-4 space-y-4">

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-5 flex flex-col items-center gap-2 cursor-pointer transition-colors",
            isDragging ? "border-teal-400 bg-teal-50"
              : uploadDone ? "border-green-400 bg-green-50"
              : file ? "border-teal-300 bg-teal-50/40"
              : "border-gray-200 hover:border-teal-300 hover:bg-gray-50"
          )}
          onClick={() => !file && fileRef.current?.click()}
        >
          {uploadDone ? (
            <div className="flex items-center gap-2 text-green-700">
              <Check className="w-5 h-5" />
              <span className="font-medium">Attached ✓</span>
            </div>
          ) : file ? (
            <div className="flex items-center gap-2 w-full">
              {fileIcon(file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                className="text-gray-400 hover:text-red-500"
                onClick={e => { e.stopPropagation(); setFile(null); setDetails(EMPTY_DETAILS); }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-300" />
              <p className="text-sm text-gray-500 text-center">Drop receipt, invoice or document here</p>
              <p className="text-xs text-gray-400">PDF, CSV, Excel, JPG, PNG</p>
              <button
                className="text-xs text-teal-600 hover:underline mt-1"
                onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
              >
                Browse files
              </button>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.csv,.xlsx,.xls,.jpg,.jpeg,.png"
            className="hidden"
            onChange={e => e.target.files?.[0] && acceptFile(e.target.files[0])}
          />
        </div>

        {/* Progress bar */}
        {uploading && (
          <Progress value={progress} className="h-1.5" />
        )}

        {/* Upload error */}
        {uploadError && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {uploadError}
            <Button size="sm" variant="ghost" className="ml-auto h-6 text-red-600" onClick={handleUpload}>Retry</Button>
          </div>
        )}

        {/* Details form — shown once file is selected */}
        {file && !uploadDone && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Document Type</Label>
                <Select value={details.docType} onValueChange={set("docType")}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select type…" /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Date</Label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={details.date}
                  onChange={e => set("date")(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Amount</Label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="h-8 text-sm pl-6"
                    value={details.amount}
                    onChange={e => set("amount")(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Supplier / Payee</Label>
                <Input
                  placeholder="e.g. Riverina Stockfeeds"
                  className="h-8 text-sm"
                  value={details.supplier}
                  onChange={e => set("supplier")(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Category</Label>
              <Select value={details.category} onValueChange={set("category")}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select category…" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Description <span className="text-gray-400">(optional)</span></Label>
              <Textarea
                placeholder="Any additional notes…"
                className="text-sm resize-none"
                rows={2}
                value={details.description}
                onChange={e => set("description")(e.target.value)}
              />
            </div>

            {mobId && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="attachMob"
                  checked={details.attachToMob}
                  onCheckedChange={v => set("attachToMob")(!!v)}
                />
                <label htmlFor="attachMob" className="text-sm text-gray-600 cursor-pointer">Attach to Mob</label>
              </div>
            )}

            <Button
              className="w-full bg-teal-600 hover:bg-teal-700 text-white gap-2"
              disabled={uploading}
              onClick={handleUpload}
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </Button>
          </div>
        )}

        {/* Recent attachments */}
        {recentDocs.length > 0 && (
          <div className="pt-2 space-y-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Recent Attachments</p>
            {recentDocs.map(doc => (
              <div key={doc.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 group">
                {fileIcon(doc.mime_type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{doc.file_name}</p>
                  <p className="text-xs text-gray-400">
                    {doc.document_date ? format(new Date(doc.document_date), "d MMM yyyy") : "—"}
                    {doc.amount != null && ` · $${doc.amount.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`}
                  </p>
                </div>
                {doc.category && (
                  <Badge className={cn("text-xs border-0 shrink-0", CATEGORY_COLOURS[doc.category] ?? "bg-gray-100 text-gray-700")}>
                    {doc.category}
                  </Badge>
                )}
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                  onClick={() => deleteDoc(doc.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
