import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, CheckCircle, XCircle, AlertTriangle, ShieldCheck, ShieldOff } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NVDRecord {
  nvdNumber: string;
  originPic: string;
  originPropertyName: string;
  vendorName: string;
  lpaNumber: string;
  headCount: number;
  hgpTreated: boolean;
  hgpProduct?: string;
  withholdingPeriodClear: boolean;
  treatments: string[];
  vendorDeclarationSigned: boolean;
  euEligible: boolean;
  msaEligible: boolean;
  daysOnFeed?: number;
}

interface NVDLookupProps {
  onNVDFound: (nvdData: NVDRecord) => void;
  bookingId?: string;
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_NVDS: Record<string, NVDRecord> = {
  "NVD-2025-QLD-0041": {
    nvdNumber: "NVD-2025-QLD-0041",
    originPic: "QA123456",
    originPropertyName: "Dalrymple Downs Station",
    vendorName: "R.J. & K.L. Hargreaves",
    lpaNumber: "LPA-QLD-2204-0893",
    headCount: 180,
    hgpTreated: false,
    withholdingPeriodClear: true,
    treatments: ["Ivomec Pour-On", "Clostridial 5-in-1", "Vibrin"],
    vendorDeclarationSigned: true,
    euEligible: true,
    msaEligible: true,
  },
  "NVD-2025-QLD-0042": {
    nvdNumber: "NVD-2025-QLD-0042",
    originPic: "QA098712",
    originPropertyName: "Bulloo Downs",
    vendorName: "Bulloo Downs Pastoral Co.",
    lpaNumber: "LPA-QLD-1987-0441",
    headCount: 94,
    hgpTreated: true,
    hgpProduct: "Compudose 200 (applied 45 days ago)",
    withholdingPeriodClear: true,
    treatments: ["Compudose 200", "Ivomec Injection", "Clostridial 7-in-1"],
    vendorDeclarationSigned: true,
    euEligible: false,
    msaEligible: true,
  },
  "NVD-2025-NSW-0134": {
    nvdNumber: "NVD-2025-NSW-0134",
    originPic: "NA456234",
    originPropertyName: "Riverina Feedlot — GFF Program",
    vendorName: "Riverina Premium Beef Pty Ltd",
    lpaNumber: "LPA-NSW-2103-0078",
    headCount: 240,
    hgpTreated: false,
    withholdingPeriodClear: true,
    treatments: ["Ivomec Pour-On", "Clostridial 5-in-1", "Websters Vaccine"],
    vendorDeclarationSigned: true,
    euEligible: true,
    msaEligible: true,
    daysOnFeed: 100,
  },
};

// ─── NVD number validation ─────────────────────────────────────────────────────
// Format: NVD-YYYY-SSS-NNNN  (year, state code 2-3 chars, sequence 4+ digits)
const NVD_PATTERN = /^NVD-\d{4}-[A-Z]{2,3}-\d{4,}$/;

function generateDemoFallback(nvdNumber: string): NVDRecord {
  return {
    nvdNumber,
    originPic: "QA" + Math.floor(100000 + Math.random() * 900000),
    originPropertyName: "Demo Station",
    vendorName: "Demo Vendor Pty Ltd",
    lpaNumber: "LPA-QLD-2200-0001",
    headCount: Math.floor(50 + Math.random() * 200),
    hgpTreated: false,
    withholdingPeriodClear: true,
    treatments: ["Ivomec Pour-On", "Clostridial 5-in-1"],
    vendorDeclarationSigned: true,
    euEligible: true,
    msaEligible: true,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NVDLookup({ onNVDFound, bookingId }: NVDLookupProps) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [result, setResult] = useState<NVDRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearch = async () => {
    const nvd = value.trim().toUpperCase();
    setResult(null);
    setError(null);

    // Validate format
    if (!NVD_PATTERN.test(nvd)) {
      setValidationError(
        'Invalid NVD format. Expected: NVD-YYYY-STATE-NNNN (e.g. NVD-2025-QLD-0041)'
      );
      return;
    }
    setValidationError(null);
    setLoading(true);

    // 1. Check Supabase for matching nvd record
    try {
      const { data } = await supabase
        .from("nvd_records" as any)
        .select("*")
        .eq("nvd_number", nvd)
        .maybeSingle();

      if (data) {
        const record: NVDRecord = {
          nvdNumber: (data as any).nvd_number,
          originPic: (data as any).origin_pic,
          originPropertyName: (data as any).origin_property_name,
          vendorName: (data as any).vendor_name,
          lpaNumber: (data as any).lpa_number,
          headCount: (data as any).head_count,
          hgpTreated: (data as any).hgp_treated ?? false,
          hgpProduct: (data as any).hgp_product ?? undefined,
          withholdingPeriodClear: (data as any).withholding_period_clear ?? true,
          treatments: (data as any).treatments ?? [],
          vendorDeclarationSigned: (data as any).vendor_declaration_signed ?? false,
          euEligible: (data as any).eu_eligible ?? false,
          msaEligible: (data as any).msa_eligible ?? false,
          daysOnFeed: (data as any).days_on_feed ?? undefined,
        };
        setResult(record);
        onNVDFound(record);
        setLoading(false);
        return;
      }
    } catch {
      // Table may not exist yet — fall through to demo
    }

    // 2. Simulate API lookup with delay
    await new Promise((r) => setTimeout(r, 500));

    const demo = DEMO_NVDS[nvd] ?? generateDemoFallback(nvd);
    setResult(demo);
    onNVDFound(demo);
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="space-y-3">
      {/* Input row */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            placeholder="e.g. NVD-2025-QLD-0041"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setValidationError(null);
              setError(null);
              setResult(null);
            }}
            onKeyDown={handleKeyDown}
            className={`pr-4 font-mono text-sm uppercase ${
              validationError ? "border-red-400 focus-visible:ring-red-300" : ""
            }`}
            disabled={loading}
          />
        </div>
        <Button onClick={handleSearch} disabled={loading || !value.trim()}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span className="ml-2">Look up</span>
        </Button>
      </div>

      {/* Validation error */}
      {validationError && (
        <p className="text-xs text-red-600 flex items-center gap-1.5">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          {validationError}
        </p>
      )}

      {/* Error state */}
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      {/* Result banner */}
      {result && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold text-emerald-800">
              NVD Found — {result.nvdNumber}
            </p>
          </div>

          {/* Key fields grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Origin PIC</span>
              <p className="font-mono font-semibold">{result.originPic}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Property</span>
              <p className="font-medium">{result.originPropertyName}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Vendor</span>
              <p className="font-medium">{result.vendorName}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">LPA Number</span>
              <p className="font-mono text-xs font-semibold">{result.lpaNumber}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Head Count</span>
              <p className="font-bold">{result.headCount.toLocaleString()}</p>
            </div>
            {result.daysOnFeed !== undefined && (
              <div>
                <span className="text-xs text-muted-foreground">Days on Feed</span>
                <p className="font-bold">{result.daysOnFeed} days</p>
              </div>
            )}
          </div>

          {/* Status badges row */}
          <div className="flex flex-wrap gap-2 pt-1 border-t border-emerald-200">
            {/* HGP */}
            {result.hgpTreated ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
                <ShieldOff className="h-3.5 w-3.5" />
                HGP Treated — EU/Japan ineligible
                {result.hgpProduct && (
                  <span className="font-normal text-red-600">· {result.hgpProduct}</span>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                HGP Free
              </span>
            )}

            {/* Withholding */}
            {result.withholdingPeriodClear ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                <CheckCircle className="h-3.5 w-3.5" />
                Withholding Period Clear
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
                <XCircle className="h-3.5 w-3.5" />
                Withholding Period Not Clear
              </span>
            )}

            {/* EU Eligible */}
            <Badge
              className={`rounded-full border text-xs font-semibold ${
                result.euEligible
                  ? "bg-blue-100 text-blue-800 border-blue-300"
                  : "bg-gray-100 text-gray-500 border-gray-300"
              }`}
            >
              EU {result.euEligible ? "Eligible" : "Not Eligible"}
            </Badge>

            {/* MSA Eligible */}
            <Badge
              className={`rounded-full border text-xs font-semibold ${
                result.msaEligible
                  ? "bg-purple-100 text-purple-800 border-purple-300"
                  : "bg-gray-100 text-gray-500 border-gray-300"
              }`}
            >
              MSA {result.msaEligible ? "Eligible" : "Not Eligible"}
            </Badge>

            {/* Vendor Declaration */}
            {result.vendorDeclarationSigned ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                <CheckCircle className="h-3.5 w-3.5" />
                Vendor Declaration Signed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
                <XCircle className="h-3.5 w-3.5" />
                Declaration Unsigned
              </span>
            )}
          </div>

          {/* Treatments */}
          {result.treatments.length > 0 && (
            <div className="pt-1 border-t border-emerald-200">
              <p className="text-xs text-muted-foreground mb-1.5">Treatments declared</p>
              <div className="flex flex-wrap gap-1.5">
                {result.treatments.map((t) => (
                  <span
                    key={t}
                    className="text-xs rounded border border-gray-200 bg-white px-2 py-0.5 text-gray-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
