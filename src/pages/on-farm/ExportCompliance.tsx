import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LivestockLayout } from "@/components/LivestockLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2, XCircle, AlertTriangle, Info, Bell,
  FileText, ClipboardList, Globe, Plus, ChevronRight,
  AlertCircle, Clock, RefreshCw, Shield,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Mob {
  id: string;
  mob_name: string;
  species: string;
  head_count: number;
  breed: string;
  hgp_treated?: boolean;
  avg_weight?: number;
}

interface ExportEligibility {
  mob_id: string;
  market: string;
  eligible: boolean;
  reason: string;
  checked_at: string;
}

interface ExportProgram {
  mob_id: string;
  program_name: string;
  enrolled_date: string;
  accreditation_number: string;
  days_on_feed: number;
  target_dof: number;
  status: string;
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_MOBS: Mob[] = [
  { id: "demo-1", mob_name: "Angus Backgrounders", species: "Cattle", head_count: 240, breed: "Angus", hgp_treated: false, avg_weight: 380 },
  { id: "demo-2", mob_name: "Bos Indicus Boners", species: "Cattle", head_count: 185, breed: "Brahman Cross", hgp_treated: true, avg_weight: 420 },
  { id: "demo-3", mob_name: "Lot Fed Yearlings", species: "Cattle", head_count: 320, breed: "Hereford x Angus", hgp_treated: false, avg_weight: 290 },
];

const DEMO_ELIGIBILITY: ExportEligibility[] = [
  // Angus Backgrounders — broadly eligible
  { mob_id: "demo-1", market: "EU", eligible: true, reason: "HGP free, NLIS current, EU residue tested", checked_at: "2026-05-20" },
  { mob_id: "demo-1", market: "Japan", eligible: true, reason: "GFF accredited, within age limit", checked_at: "2026-05-20" },
  { mob_id: "demo-1", market: "USA", eligible: true, reason: "Meets USDA import requirements", checked_at: "2026-05-20" },
  { mob_id: "demo-1", market: "Halal", eligible: true, reason: "Halal certified abattoir confirmed", checked_at: "2026-05-20" },
  { mob_id: "demo-1", market: "Korea", eligible: true, reason: "KFDA approved, breed verified", checked_at: "2026-05-20" },
  { mob_id: "demo-1", market: "Domestic", eligible: true, reason: "MSA enrolled, NVD current", checked_at: "2026-05-20" },
  // Bos Indicus Boners — HGP treated
  { mob_id: "demo-2", market: "EU", eligible: false, reason: "HGP treated — EU bans hormone-treated beef", checked_at: "2026-05-20" },
  { mob_id: "demo-2", market: "Japan", eligible: false, reason: "HGP treated — Japan requires hormone-free certification", checked_at: "2026-05-20" },
  { mob_id: "demo-2", market: "USA", eligible: true, reason: "USA permits HGP treated beef", checked_at: "2026-05-20" },
  { mob_id: "demo-2", market: "Halal", eligible: true, reason: "Halal cert not affected by HGP status", checked_at: "2026-05-20" },
  { mob_id: "demo-2", market: "Korea", eligible: false, reason: "HGP treated — Korea requires hormone-free for most cuts", checked_at: "2026-05-20" },
  { mob_id: "demo-2", market: "Domestic", eligible: true, reason: "Domestic market permits HGP", checked_at: "2026-05-20" },
  // Lot Fed Yearlings — age/DOF constraints
  { mob_id: "demo-3", market: "EU", eligible: true, reason: "HGP free, EU residue program enrolled", checked_at: "2026-05-20" },
  { mob_id: "demo-3", market: "Japan", eligible: true, reason: "GFF qualified, 100-day DOF target on track", checked_at: "2026-05-20" },
  { mob_id: "demo-3", market: "USA", eligible: true, reason: "Meets USDA import requirements", checked_at: "2026-05-20" },
  { mob_id: "demo-3", market: "Halal", eligible: false, reason: "Pre-slaughter halal audit not yet scheduled", checked_at: "2026-05-20" },
  { mob_id: "demo-3", market: "Korea", eligible: true, reason: "KFDA approved breed and residue status", checked_at: "2026-05-20" },
  { mob_id: "demo-3", market: "Domestic", eligible: true, reason: "MSA enrolled and compliant", checked_at: "2026-05-20" },
];

const DEMO_PROGRAMS: ExportProgram[] = [
  { mob_id: "demo-1", program_name: "GFF", enrolled_date: "2026-01-10", accreditation_number: "GFF-QLD-00441", days_on_feed: 68, target_dof: 100, status: "active" },
  { mob_id: "demo-1", program_name: "MSA", enrolled_date: "2025-09-01", accreditation_number: "MSA-2094733", days_on_feed: 68, target_dof: 100, status: "active" },
  { mob_id: "demo-1", program_name: "EU Residue", enrolled_date: "2026-02-14", accreditation_number: "EU-RES-QLD-1187", days_on_feed: 68, target_dof: 100, status: "active" },
  { mob_id: "demo-2", program_name: "PCAS", enrolled_date: "2025-11-20", accreditation_number: "PCAS-NT-00228", days_on_feed: 45, target_dof: 60, status: "active" },
  { mob_id: "demo-2", program_name: "MSA", enrolled_date: "2025-11-20", accreditation_number: "MSA-3019844", days_on_feed: 45, target_dof: 60, status: "active" },
  { mob_id: "demo-3", program_name: "GFF", enrolled_date: "2026-03-01", accreditation_number: "GFF-QLD-00512", days_on_feed: 91, target_dof: 100, status: "active" },
  { mob_id: "demo-3", program_name: "NFAS", enrolled_date: "2026-01-05", accreditation_number: "NFAS-QLD-0874", days_on_feed: 91, target_dof: 100, status: "expiring_soon" },
  { mob_id: "demo-3", program_name: "MSA", enrolled_date: "2026-03-01", accreditation_number: "MSA-4102991", days_on_feed: 91, target_dof: 100, status: "active" },
];

const MARKETS = ["EU", "Japan", "USA", "Halal", "Korea", "Domestic"] as const;
type Market = typeof MARKETS[number];

// ─── Document Checklist Data ──────────────────────────────────────────────────

interface DocItem {
  label: string;
  complete: boolean;
}

const DOCUMENT_CHECKLIST: Record<string, DocItem[]> = {
  EU: [
    { label: "NLIS transfer complete", complete: true },
    { label: "Vendor declaration (NVD) signed", complete: true },
    { label: "No HGP declaration", complete: true },
    { label: "EU residue test result (within 30 days)", complete: false },
    { label: "Health certificate from accredited vet", complete: false },
  ],
  Japan: [
    { label: "GFF accreditation current", complete: true },
    { label: "Days on feed verified (≥100 days)", complete: true },
    { label: "JMAF grading program enrollment", complete: false },
    { label: "Export health certificate", complete: true },
    { label: "NLIS declaration", complete: true },
  ],
  Halal: [
    { label: "Halal certification confirmed (abattoir)", complete: true },
    { label: "Pre-slaughter halal audit scheduled", complete: false },
    { label: "Certifying body letter of compliance", complete: true },
    { label: "No non-halal feed ingredients declaration", complete: true },
  ],
  "ESCAS (Live Export)": [
    { label: "ESCAS supply chain approval from importer", complete: false },
    { label: "Importer agreement signed", complete: false },
    { label: "Animal welfare audit (departure country)", complete: true },
    { label: "Vessel inspection complete", complete: false },
    { label: "Consignment approval from DAFF", complete: false },
  ],
  Korea: [
    { label: "KFDA import approval", complete: true },
    { label: "Residue monitoring certificate", complete: true },
    { label: "Country of origin declaration", complete: true },
    { label: "Foot-and-mouth disease free zone cert", complete: false },
  ],
  USA: [
    { label: "USDA export health certificate", complete: true },
    { label: "Residue compliance declaration", complete: true },
    { label: "Ante-mortem inspection records", complete: false },
    { label: "COOL (Country of Origin Labeling) docs", complete: true },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function EligibilityCell({ eligible, reason }: { eligible: boolean; reason: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center justify-center w-full h-full py-1 cursor-pointer hover:opacity-80 transition-opacity">
          {eligible
            ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            : <XCircle className="w-5 h-5 text-red-500" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 text-sm p-3 bg-gray-900 border-gray-700 text-gray-100">
        <div className="flex items-start gap-2">
          {eligible
            ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            : <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />}
          <span>{reason}</span>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SeverityBadge({ level }: { level: "critical" | "warning" | "notice" | "info" }) {
  const map = {
    critical: "bg-red-500/20 text-red-400 border-red-500/40",
    warning: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    notice: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    info: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${map[level]}`}>
      {level.toUpperCase()}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExportCompliance() {
  const navigate = useNavigate();
  const [mobs, setMobs] = useState<Mob[]>([]);
  const [eligibility, setEligibility] = useState<ExportEligibility[]>([]);
  const [programs, setPrograms] = useState<ExportProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      // Fall back to demo data after 2 seconds if still loading
      setMobs(prev => prev.length === 0 ? DEMO_MOBS : prev);
      setEligibility(prev => prev.length === 0 ? DEMO_ELIGIBILITY : prev);
      setPrograms(prev => prev.length === 0 ? DEMO_PROGRAMS : prev);
      setLoading(false);
    }, 2000);

    async function load() {
      try {
        const [mobsRes, eligRes, progRes] = await Promise.all([
          supabase.from("mobs").select("id, mob_name, species, head_count, breed, avg_weight").limit(50),
          supabase.from("mob_export_eligibility").select("*"),
          supabase.from("export_programs").select("*"),
        ]);

        clearTimeout(timeout);
        setMobs(mobsRes.data?.length ? (mobsRes.data as Mob[]) : DEMO_MOBS);
        setEligibility(eligRes.data?.length ? (eligRes.data as ExportEligibility[]) : DEMO_ELIGIBILITY);
        setPrograms(progRes.data?.length ? (progRes.data as ExportProgram[]) : DEMO_PROGRAMS);
      } catch {
        clearTimeout(timeout);
        setMobs(DEMO_MOBS);
        setEligibility(DEMO_ELIGIBILITY);
        setPrograms(DEMO_PROGRAMS);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => clearTimeout(timeout);
  }, []);

  // ── Derived Data ──────────────────────────────────────────────────────────

  function getEligibility(mobId: string, market: string): ExportEligibility | undefined {
    return eligibility.find(e => e.mob_id === mobId && e.market === market);
  }

  function marketSummary(market: string) {
    const eligible = mobs.filter(m => getEligibility(m.id, market)?.eligible === true).length;
    return { eligible, total: mobs.length };
  }

  // ── Alerts ────────────────────────────────────────────────────────────────

  interface Alert {
    id: string;
    severity: "critical" | "warning" | "notice" | "info";
    title: string;
    description: string;
    mob?: string;
    action: string;
  }

  const alerts: Alert[] = [];

  // Critical: HGP treated mobs booked into EU/Japan
  mobs.forEach(mob => {
    if (mob.hgp_treated) {
      const euElig = getEligibility(mob.id, "EU");
      const jpElig = getEligibility(mob.id, "Japan");
      if (euElig && !euElig.eligible) {
        alerts.push({
          id: `hgp-eu-${mob.id}`,
          severity: "critical",
          title: `${mob.mob_name} — HGP treated, ineligible for EU`,
          description: "This mob has been treated with a hormone growth promotant. EU market prohibits HGP beef. Remove from EU booking or source replacement mob.",
          mob: mob.mob_name,
          action: "Review Mob",
        });
      }
      if (jpElig && !jpElig.eligible) {
        alerts.push({
          id: `hgp-jp-${mob.id}`,
          severity: "critical",
          title: `${mob.mob_name} — HGP treated, ineligible for Japan`,
          description: "Japan requires hormone-free certification. This mob cannot be processed for the Japanese market. Review alternative markets (USA, Domestic).",
          mob: mob.mob_name,
          action: "Review Mob",
        });
      }
    }
  });

  // Warning: approaching 30-month age limit for EU/Japan (demo warning for Bos Indicus)
  alerts.push({
    id: "age-limit-demo",
    severity: "warning",
    title: "Bos Indicus Boners — approaching 30-month age limit",
    description: "EU and Japan markets require cattle to be under 30 months at slaughter. Current estimated age: 27 months. Book within 8 weeks to remain eligible.",
    mob: "Bos Indicus Boners",
    action: "Contact Agent",
  });

  // Notice: expiring accreditations
  programs
    .filter(p => p.status === "expiring_soon")
    .forEach(p => {
      const mob = mobs.find(m => m.id === p.mob_id);
      alerts.push({
        id: `expire-${p.mob_id}-${p.program_name}`,
        severity: "notice",
        title: `${p.program_name} accreditation renewal due — ${mob?.mob_name ?? "Unknown Mob"}`,
        description: `Accreditation #${p.accreditation_number} expires within 60 days. Renew before expiry to maintain program eligibility and avoid market exclusions.`,
        mob: mob?.mob_name,
        action: "Review Mob",
      });
    });

  // Info: DOF targets approaching completion
  programs
    .filter(p => p.target_dof > 0 && p.days_on_feed / p.target_dof >= 0.85 && p.status === "active")
    .slice(0, 2)
    .forEach(p => {
      const mob = mobs.find(m => m.id === p.mob_id);
      const remaining = p.target_dof - p.days_on_feed;
      if (remaining > 0) {
        alerts.push({
          id: `dof-exit-${p.mob_id}-${p.program_name}`,
          severity: "info",
          title: `${mob?.mob_name ?? "Mob"} — ${p.program_name} exit window approaching`,
          description: `${remaining} days remain to reach ${p.target_dof}-day target (currently ${p.days_on_feed} days). Confirm kill booking with processor to align exit date.`,
          mob: mob?.mob_name,
          action: "Contact Agent",
        });
      }
    });

  const severityOrder = { critical: 0, warning: 1, notice: 2, info: 3 };
  const sortedAlerts = [...alerts].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <LivestockLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Globe className="w-6 h-6 text-teal-400" />
              Export Compliance
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Market eligibility, program enrollment, and document readiness for your mobs
            </p>
          </div>
          <div className="flex items-center gap-2">
            {sortedAlerts.filter(a => a.severity === "critical").length > 0 && (
              <Badge className="bg-red-500/20 text-red-400 border border-red-500/40 gap-1">
                <AlertCircle className="w-3 h-3" />
                {sortedAlerts.filter(a => a.severity === "critical").length} Critical
              </Badge>
            )}
            <Badge className="bg-gray-800 text-gray-300 border border-gray-700">
              {mobs.length} Mobs
            </Badge>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400 gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Loading compliance data…
          </div>
        ) : (
          <Tabs defaultValue="eligibility" className="space-y-4">
            <TabsList className="bg-gray-800 border border-gray-700">
              <TabsTrigger value="eligibility" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                Eligibility Matrix
              </TabsTrigger>
              <TabsTrigger value="alerts" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                Alerts & Actions
                {sortedAlerts.filter(a => a.severity === "critical" || a.severity === "warning").length > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {sortedAlerts.filter(a => a.severity === "critical" || a.severity === "warning").length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="programs" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                Program Enrollment
              </TabsTrigger>
              <TabsTrigger value="documents" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                Document Checklist
              </TabsTrigger>
            </TabsList>

            {/* ── Tab 1: Eligibility Matrix ──────────────────────────────────── */}
            <TabsContent value="eligibility" className="space-y-4">
              {/* Summary bar */}
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {MARKETS.map(market => {
                  const { eligible, total } = marketSummary(market);
                  const allGood = eligible === total;
                  const none = eligible === 0;
                  return (
                    <Card key={market} className={`bg-gray-900 border ${allGood ? "border-emerald-500/40" : none ? "border-red-500/40" : "border-orange-500/40"}`}>
                      <CardContent className="p-3 text-center">
                        <div className={`text-lg font-bold ${allGood ? "text-emerald-400" : none ? "text-red-400" : "text-orange-400"}`}>
                          {eligible}/{total}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{market} eligible</div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Matrix table */}
              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left px-4 py-3 text-gray-400 font-medium w-48">Mob</th>
                        <th className="text-center px-2 py-3 text-gray-400 font-medium text-xs">Head</th>
                        {MARKETS.map(m => (
                          <th key={m} className="text-center px-3 py-3 text-gray-400 font-medium text-xs">{m}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mobs.map((mob, i) => (
                        <tr
                          key={mob.id}
                          className={`border-b border-gray-800 ${i % 2 === 0 ? "bg-gray-900" : "bg-gray-850"} hover:bg-gray-800/60 transition-colors`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-white">{mob.mob_name}</div>
                            <div className="text-xs text-gray-500">{mob.breed}</div>
                          </td>
                          <td className="text-center px-2 py-3 text-gray-300 text-sm">{mob.head_count}</td>
                          {MARKETS.map(market => {
                            const elig = getEligibility(mob.id, market);
                            if (!elig) {
                              return (
                                <td key={market} className="text-center px-3 py-3">
                                  <span className="text-gray-600 text-xs">—</span>
                                </td>
                              );
                            }
                            return (
                              <td key={market} className="text-center px-3 py-3">
                                <EligibilityCell eligible={elig.eligible} reason={elig.reason} />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Click any cell to see eligibility details. Data reflects current mob status and program enrollment.
              </p>
            </TabsContent>

            {/* ── Tab 2: Alerts & Actions ────────────────────────────────────── */}
            <TabsContent value="alerts" className="space-y-3">
              {sortedAlerts.length === 0 ? (
                <Card className="bg-gray-900 border-gray-700">
                  <CardContent className="py-12 text-center text-gray-400">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
                    <p className="font-medium text-white">All clear — no compliance issues detected</p>
                    <p className="text-sm mt-1">Your mobs are on track across all export markets.</p>
                  </CardContent>
                </Card>
              ) : (
                sortedAlerts.map(alert => {
                  const borderColor = {
                    critical: "border-l-red-500",
                    warning: "border-l-orange-500",
                    notice: "border-l-yellow-500",
                    info: "border-l-emerald-500",
                  }[alert.severity];
                  const Icon = {
                    critical: AlertCircle,
                    warning: AlertTriangle,
                    notice: Clock,
                    info: Info,
                  }[alert.severity];
                  const iconColor = {
                    critical: "text-red-400",
                    warning: "text-orange-400",
                    notice: "text-yellow-400",
                    info: "text-emerald-400",
                  }[alert.severity];

                  return (
                    <Card key={alert.id} className={`bg-gray-900 border-gray-700 border-l-4 ${borderColor}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <SeverityBadge level={alert.severity} />
                                <span className="font-semibold text-white text-sm">{alert.title}</span>
                              </div>
                              <p className="text-sm text-gray-400">{alert.description}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-600 text-gray-300 hover:bg-gray-700 flex-shrink-0"
                          >
                            {alert.action}
                            <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            {/* ── Tab 3: Program Enrollment ──────────────────────────────────── */}
            <TabsContent value="programs" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  {programs.length} active program enrollments across {mobs.length} mobs
                </p>
                <Button size="sm" className="bg-teal-600 hover:bg-teal-500 text-white gap-1">
                  <Plus className="w-4 h-4" />
                  Enroll Mob
                </Button>
              </div>

              <Card className="bg-gray-900 border-gray-700">
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left px-4 py-3 text-gray-400 font-medium">Mob</th>
                        <th className="text-left px-4 py-3 text-gray-400 font-medium">Program</th>
                        <th className="text-left px-4 py-3 text-gray-400 font-medium">Accreditation #</th>
                        <th className="text-left px-4 py-3 text-gray-400 font-medium">Enrolled</th>
                        <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                        <th className="text-left px-4 py-3 text-gray-400 font-medium min-w-[180px]">Days on Feed Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {programs.map((prog, i) => {
                        const mob = mobs.find(m => m.id === prog.mob_id);
                        const pct = prog.target_dof > 0 ? Math.min(100, Math.round((prog.days_on_feed / prog.target_dof) * 100)) : null;
                        const statusStyle = {
                          active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                          expiring_soon: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
                          expired: "bg-red-500/20 text-red-400 border-red-500/30",
                          pending: "bg-gray-500/20 text-gray-400 border-gray-500/30",
                        }[prog.status] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30";

                        return (
                          <tr key={`${prog.mob_id}-${prog.program_name}-${i}`} className={`border-b border-gray-800 ${i % 2 === 0 ? "" : "bg-gray-800/30"} hover:bg-gray-800/50 transition-colors`}>
                            <td className="px-4 py-3 text-white font-medium">{mob?.mob_name ?? prog.mob_id}</td>
                            <td className="px-4 py-3">
                              <Badge className="bg-teal-500/20 text-teal-300 border border-teal-500/30 font-mono text-xs">
                                {prog.program_name}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-gray-300 font-mono text-xs">{prog.accreditation_number}</td>
                            <td className="px-4 py-3 text-gray-400 text-xs">
                              {new Date(prog.enrolled_date).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded border font-medium ${statusStyle}`}>
                                {prog.status === "expiring_soon" ? "Expiring Soon" : prog.status.charAt(0).toUpperCase() + prog.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {pct !== null ? (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs text-gray-400">
                                    <span>{prog.days_on_feed} / {prog.target_dof} days</span>
                                    <span>{pct}%</span>
                                  </div>
                                  <Progress
                                    value={pct}
                                    className="h-1.5 bg-gray-700"
                                  />
                                </div>
                              ) : (
                                <span className="text-gray-600 text-xs">N/A</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Tab 4: Document Checklist ──────────────────────────────────── */}
            <TabsContent value="documents" className="space-y-4">
              <p className="text-sm text-gray-400">
                Required documentation status by export market. Keep all docs current before booking.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(DOCUMENT_CHECKLIST).map(([market, docs]) => {
                  const complete = docs.filter(d => d.complete).length;
                  const total = docs.length;
                  const pct = Math.round((complete / total) * 100);
                  const allGood = complete === total;
                  const borderColor = allGood ? "border-emerald-500/40" : complete === 0 ? "border-red-500/40" : "border-orange-500/40";
                  const scoreColor = allGood ? "text-emerald-400" : complete === 0 ? "text-red-400" : "text-orange-400";

                  return (
                    <Card key={market} className={`bg-gray-900 border ${borderColor}`}>
                      <CardHeader className="pb-3 pt-4 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                            <FileText className="w-4 h-4 text-teal-400" />
                            {market}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${scoreColor}`}>{complete}/{total}</span>
                            <span className="text-xs text-gray-500">docs complete</span>
                          </div>
                        </div>
                        <Progress value={pct} className="h-1.5 bg-gray-700 mt-2" />
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-2">
                        {docs.map((doc, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            {doc.complete
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                            <span className={doc.complete ? "text-gray-300" : "text-gray-500"}>
                              {doc.label}
                            </span>
                            {!doc.complete && (
                              <span className="ml-auto text-xs text-orange-400 font-medium">Action required</span>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
                <Shield className="w-3.5 h-3.5" />
                Document status is indicative only. Always verify with your export agent or accreditation body before booking.
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </LivestockLayout>
  );
}
