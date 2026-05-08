import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInDays, parseISO } from "date-fns";
import { Lightbulb, Calendar, Building2, DollarSign, Clock, CheckCircle2, PauseCircle, XCircle } from "lucide-react";

interface Pilot {
  id: number;
  processor_id: string | null;
  partner_name: string | null;
  funding_source: string | null;
  status: string | null;
  start_date: string | null;
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const statusConfig = (status: string | null) => {
  switch ((status || "").toLowerCase()) {
    case "active":
      return { variant: "confirmed" as const, icon: CheckCircle2, label: "Active", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    case "completed":
      return { variant: "secondary" as const, icon: CheckCircle2, label: "Completed", cls: "text-blue-700 bg-blue-50 border-blue-200" };
    case "on hold":
    case "paused":
      return { variant: "changed" as const, icon: PauseCircle, label: "On hold", cls: "text-amber-700 bg-amber-50 border-amber-200" };
    case "cancelled":
      return { variant: "cancelled" as const, icon: XCircle, label: "Cancelled", cls: "text-red-700 bg-red-50 border-red-200" };
    case "planning":
    case "proposed":
      return { variant: "secondary" as const, icon: Clock, label: status || "Planning", cls: "text-gray-600 bg-gray-50 border-gray-200" };
    default:
      return { variant: "secondary" as const, icon: Lightbulb, label: status || "Unknown", cls: "text-gray-600 bg-gray-50 border-gray-200" };
  }
};

const daysRunning = (startDate: string | null) => {
  if (!startDate) return null;
  return differenceInDays(new Date(), parseISO(startDate));
};

const fundingColour = (source: string | null) => {
  if (!source) return "text-muted-foreground";
  const s = source.toLowerCase();
  if (s.includes("mla") || s.includes("meat & livestock")) return "text-emerald-700";
  if (s.includes("ama") || s.includes("government") || s.includes("grant")) return "text-blue-700";
  if (s.includes("internal") || s.includes("self")) return "text-indigo-700";
  return "text-foreground";
};

// Hardcoded pilot context (sourced from field notes and Jacqui's context)
// In production this would be in a `pilot_goals` or `pilot_description` column
const PILOT_CONTEXT: Record<number, { goal: string; focus: string }> = {};

// ── Component ──────────────────────────────────────────────────────────────────

export default function PilotProjects() {
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPilots = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("pilots")
        .select("*")
        .order("start_date", { ascending: false });

      if (!error && data) setPilots(data);
      setLoading(false);
    };
    fetchPilots();
  }, []);

  const activePilots    = pilots.filter(p => (p.status || "").toLowerCase() === "active");
  const completedPilots = pilots.filter(p => (p.status || "").toLowerCase() === "completed");
  const planningPilots  = pilots.filter(p => ["planning", "proposed"].includes((p.status || "").toLowerCase()));
  const otherPilots     = pilots.filter(p => !["active", "completed", "planning", "proposed"].includes((p.status || "").toLowerCase()));

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pilot Projects</h1>
          <p className="text-muted-foreground">
            Commercial partnerships and R&D pilots across the processing supply chain
          </p>
        </div>

        {/* Summary strip */}
        {!loading && pilots.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <p className="text-xs font-medium text-muted-foreground">Active</p>
                </div>
                <p className="text-2xl font-bold text-emerald-700">{activePilots.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <p className="text-xs font-medium text-muted-foreground">In planning</p>
                </div>
                <p className="text-2xl font-bold text-blue-700">{planningPilots.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-gray-400" />
                  <p className="text-xs font-medium text-muted-foreground">Completed</p>
                </div>
                <p className="text-2xl font-bold">{completedPilots.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground">Partners</p>
                </div>
                <p className="text-2xl font-bold">
                  {new Set(pilots.map(p => p.partner_name).filter(Boolean)).size}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pilot cards */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
          </div>
        ) : pilots.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Lightbulb className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-1">No pilot projects found</h3>
              <p className="text-muted-foreground text-sm">Pilot records will appear here when added.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Active pilots */}
            {activePilots.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Active ({activePilots.length})
                </h2>
                <div className="grid gap-4">
                  {activePilots.map(pilot => <PilotCard key={pilot.id} pilot={pilot} />)}
                </div>
              </div>
            )}

            {/* Planning */}
            {planningPilots.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  In planning ({planningPilots.length})
                </h2>
                <div className="grid gap-4">
                  {planningPilots.map(pilot => <PilotCard key={pilot.id} pilot={pilot} />)}
                </div>
              </div>
            )}

            {/* Other (on hold etc) */}
            {otherPilots.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Other ({otherPilots.length})
                </h2>
                <div className="grid gap-4">
                  {otherPilots.map(pilot => <PilotCard key={pilot.id} pilot={pilot} />)}
                </div>
              </div>
            )}

            {/* Completed */}
            {completedPilots.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Completed ({completedPilots.length})
                </h2>
                <div className="grid gap-4">
                  {completedPilots.map(pilot => <PilotCard key={pilot.id} pilot={pilot} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Context note */}
        {!loading && pilots.length > 0 && (
          <Card className="border-dashed">
            <CardContent className="pt-4 pb-4">
              <div className="flex gap-2 text-sm text-muted-foreground">
                <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>
                  Pilot projects track strategic R&D partnerships and commercial trials. Fields for goals,
                  success metrics, and detailed notes are on the product roadmap — contact your Muster
                  account manager to enable extended pilot tracking.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

// ── PilotCard sub-component ────────────────────────────────────────────────────

function PilotCard({ pilot }: { pilot: Pilot }) {
  const cfg = statusConfig(pilot.status);
  const StatusIcon = cfg.icon;
  const days = daysRunning(pilot.start_date);
  const isActive = (pilot.status || "").toLowerCase() === "active";

  return (
    <Card className={`border-l-4 ${isActive ? "border-l-emerald-500" : "border-l-gray-300"} hover:shadow-md transition-shadow`}>
      <CardContent className="pt-5 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="font-semibold text-foreground text-base">
                {pilot.partner_name || "Unnamed pilot"}
              </h3>
              <span className={`inline-flex items-center gap-1 text-xs font-medium border rounded-full px-2 py-0.5 ${cfg.cls}`}>
                <StatusIcon className="h-3 w-3" />
                {cfg.label}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              {pilot.processor_id && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Processor: <span className="text-foreground">{pilot.processor_id}</span></span>
                </div>
              )}
              {pilot.funding_source && (
                <div className="flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span className={fundingColour(pilot.funding_source)}>{pilot.funding_source}</span>
                </div>
              )}
              {pilot.start_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Started {format(parseISO(pilot.start_date), "d MMM yyyy")}</span>
                </div>
              )}
              {days !== null && isActive && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-emerald-700 font-medium">{days} days running</span>
                </div>
              )}
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-xs text-muted-foreground">ID #{pilot.id}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Added {format(new Date(pilot.created_at), "d MMM yy")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
