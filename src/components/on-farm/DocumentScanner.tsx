import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, CheckCircle, AlertTriangle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type DocumentType = "nvd" | "weighbridge" | "kill_sheet" | "invoice";

interface DocumentScannerProps {
  documentType: DocumentType;
  onExtracted: (fields: Record<string, unknown>) => void;
  label?: string;
}

const DOC_LABELS: Record<DocumentType, string> = {
  nvd:         "NVD",
  weighbridge: "Weighbridge Docket",
  kill_sheet:  "Kill Sheet",
  invoice:     "Purchase Invoice",
};

export function DocumentScanner({ documentType, onExtracted, label }: DocumentScannerProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const docLabel = label ?? DOC_LABELS[documentType];

  async function processFile(file: File) {
    setError(null);
    setDone(false);
    setScanning(true);

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          const result = r.result as string;
          // Strip the data:image/xxx;base64, prefix
          resolve(result.split(",")[1]);
        };
        r.onerror = reject;
        r.readAsDataURL(file);
      });

      const mimeType = file.type || "image/jpeg";

      const { data, error: fnError } = await supabase.functions.invoke("scan-document", {
        body: { imageBase64: base64, mimeType, documentType },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.ok) throw new Error(data?.error ?? "Scan failed");

      const fields = data.fields as Record<string, unknown>;
      onExtracted(fields);
      setDone(true);

      // Count non-null fields
      const found = Object.values(fields).filter(v => v !== null && v !== undefined && v !== "").length;
      toast({
        title: `${docLabel} scanned`,
        description: `${found} field${found !== 1 ? "s" : ""} extracted. Review and confirm below.`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast({ title: "Scan failed", description: msg, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset so same file can be re-scanned
    e.target.value = "";
  }

  function reset() {
    setPreview(null);
    setDone(false);
    setError(null);
  }

  return (
    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-900">Scan {docLabel}</p>
          <p className="text-xs text-amber-700 mt-0.5">Take a photo or upload an image — fields will auto-fill</p>
        </div>
        {(preview || done) && (
          <button onClick={reset} className="text-amber-600 hover:text-amber-900">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <div className="relative">
          <img src={preview} alt="Document preview" className="w-full max-h-48 object-contain rounded-lg border border-amber-200" />
          {scanning && (
            <div className="absolute inset-0 bg-amber-50/80 flex items-center justify-center rounded-lg">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                <p className="text-xs font-medium text-amber-800">Reading document…</p>
              </div>
            </div>
          )}
          {done && !scanning && (
            <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
              <CheckCircle className="h-4 w-4" />
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <p className="text-xs">{error}</p>
        </div>
      )}

      {/* Action buttons */}
      {!scanning && (
        <div className="flex gap-2">
          {/* Camera — mobile opens camera directly */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={() => cameraRef.current?.click()}
          >
            <Camera className="h-4 w-4 mr-1.5" />
            Take photo
          </Button>

          {/* File upload */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-1.5" />
            Upload image
          </Button>
        </div>
      )}

      {scanning && (
        <div className="flex items-center justify-center gap-2 py-1">
          <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
          <span className="text-sm text-amber-800">Scanning with AI…</span>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
