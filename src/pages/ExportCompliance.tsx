import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Shield, Moon, Star, Flag, CheckCircle2, AlertTriangle, XCircle, Clock,
  Upload, RefreshCw, TrendingUp, FileText, Award
} from "lucide-react";
import { format, addDays, differenceInDays } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────────

interface EstabCert {
  id: string;
  plant_id: string;
  cert_type: string;
  cert_number: string;
  issuing_body: string;
  issued_date: string;
  expiry_date: string;
  status: "current" | "expiring_soon" | "expired" | "pending_renewal";
  notes: string | null;
}

interface Booking {
  id: string;
  hgp_status: string | null;
  eu_eligible: boolean | null;
  msa_enrolled: boolean | null;
  nvd_received: boolean | null;
  requested_kill_date: string | null;
  species: string | null;
  head_count: number | null;
  halal_certified?: boolean | null;
  supplier_id?: string | null;
}

interface ComplianceCheck {
  booking_id: string;
  nlis_status: string | null;
  nvd_status: string | null;
  pic_status: string | null;
  checked_at: string | null;
}

// ── Demo Data ──────────────────────────────────────────────────────────────────

const today = new Date();

const DEMO_CERTS: EstabCert[] = [
  {
    id: "1", plant_id: "p1", cert_type: "DAFF Export", cert_number: "EA-3471",
    issuing_body: "DAFF Australia", issued_date: "2022-01-15",
    expiry_date: format(addDays(today, 210), "yyyy-MM-dd"),
    status: "current", notes: null,
  },
  {
    id: "2", plant_id: "p1", cert_type: "Halal-AFIC", cert_number: "AFIC-2024-0089",
    issuing_body: "Australian Fatwa and Islamic Council", issued_date: "2024-03-01",
    expiry_date: format(addDays(today, 45), "yyyy-MM-dd"),
    status: "expiring_soon", notes: "Renewal application submitted",
  },
  {
    id: "3", plant_id: "p1", cert_type: "EU Listed", cert_number: "AU-3471-EC",
    issuing_body: "DAFF / European Commission", issued_date: "2023-05-10",
    expiry_date: format(addDays(today, 340), "yyyy-MM-dd"),
    status: "current", notes: null,
  },
  {
    id: "4", plant_id: "p1", cert_type: "USA FSIS", cert_number: "FSIS-AUS-0082",
    issuing_body: "USDA Food Safety & Inspection Service", issued_date: "2022-11-20",
    expiry_date: format(addDays(today, 20), "yyyy-MM-dd"),
    status: "expiring_soon", notes: "Contact USDA liaison",
  },
  {
    id: "5", plant_id: "p1", cert_type: "HACCP", cert_number: "HACCP-QLD-118",
    issuing_body: "SAI Global", issued_date: "2023-08-01",
    expiry_date: format(addDays(today, 430), "yyyy-MM-dd"),
    status: "current", notes: null,
  },
  {
    id: "6", plant_id: "p1", cert_type: "Japan MAFF", cert_number: "JPN-MAFF-AUS-059",
    issuing_body: "Ministry of Agriculture, Forestry and Fisheries", issued_date: "2024-01-10",
    expiry_date: format(addDays(today, 190), "yyyy-MM-dd"),
    status: "current", notes: null,
  },
];

const DEMO_KILL_DAYS = [
  { date: format(addDays(today, 1), "yyyy-MM-dd"), species: "Cattle", head: 320, hgp: false, eu: true, halal: false, nvd: true, msa: true, hgpConflict: false },
  { date: format(addDays(today, 2), "yyyy-MM-dd"), species: "Cattle", head: 180, hgp: true, eu: true, halal: false, nvd: true, msa: false, hgpConflict: true },
  { date: format(addDays(today, 4), "yyyy-MM-dd"), species: "Sheep", head: 450, hgp: false, eu: false, halal: true, nvd: true, msa: true, hgpConflict: false },
  { date: format(addDays(today, 7), "yyyy-MM-dd"), species: "Cattle", head: 260, hgp: false, eu: true, halal: false, nvd: false, msa: true, hgpConflict: false },
  { date: format(addDays(today, 8), "yyyy-MM-dd"), species: "Cattle", head: 140, hgp: false, eu: false, halal: true, nvd: true, msa: true, hgpConflict: false },
  { date: format(addDays(today, 10), "yyyy-MM-dd"), species: "Sheep", head: 380, hgp: false, eu: true, halal: false, nvd: true, msa: false, hgpConflict: false },
  { date: format(addDays(today, 12), "yyyy-MM-dd"), species: "Cattle", head: 210, hgp: false, eu: true, halal: false, nvd: true, msa: true, hgpConflict: false },
];

const DEMO_BOOKINGS = [
  { id: "B001", supplier: "Longreach Grazing Co", species: "Cattle", nvd: true, nlis: true, pic: true, vd: true },
  { id: "B002", supplier: "Southern Cross Pastoral", species: "Cattle", nvd: true, nlis: true, pic: true, vd: false },
  { id: "B003", supplier: "Brigalow Station", species: "Sheep", nvd: false, nlis: true, pic: true, vd: true },
  { id: "B004", supplier: "Mt Garnet Enterprise", species: "Cattle", nvd: true, nlis: false, pic: true, vd: true },
  { id: "B005", supplier: "Diamantina Downs", species: "Cattle", nvd: true, nlis: true, pic: true, vd: true },
  { id: "B006", supplier: "Cloncurry Station", species: "Cattle", nvd: true, nlis: true, pic: false, vd: true },
  { id: "B007", supplier: "Winton Grazing Trust", species: "Sheep", nvd: true, nlis: true, pic: true, vd: true },
  { id: "B008", supplier: "Capricorn Feeders", species: "Cattle", nvd: true, nlis: true, pic: true, vd: true },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const CERT_ICONS: Record<string, React.ReactNode> = {
  "DAFF Export": <Shield className="w-5 h-5 text-blue-600" />,
  "Halal-AFIC":  <Moon className="w-5 h-5 text-emerald-600" />,
  "Halal-ANIC":  <Moon className="w-5 h-5 text-emerald-600" />,
  "Halal-HFA":   <Moon className="w-5 h-5 text-emerald-600" />,
  "EU Listed":   <Star className="w-5 h-5 text-yellow-500" />,
  "USA FSIS":    <Flag className="w-5 h-5 text-red-500" />,
  "Japan MAFF":  <Flag className="w-5 h-5 text-red-400" />,
  "Korea MFDS":  <Flag className="w-5 h-5 text-blue-500" />,
  "HACCP":       <CheckCircle2 className="w-5 h-5 text-purple-600" />,
};

const getCertIcon = (type: string) => CERT_ICONS[type] ?? <Award className="w-5 h-5 text-slate-500" />;

function certStatusBadge(cert: EstabCert) {
  const days = differenceInDays(new Date(cert.expiry_date), today);
  switch (cert.status) {
    case "current":
      return <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">Current</Badge>;
    case "expiring_soon":
      return <Badge className="bg-amber-100 text-amber-700 border border-amber-200">Expiring Soon</Badge>;
    case "expired":
      return <Badge className="bg-red-100 text-red-700 border border-red-200">Expired</Badge>;
    case "pending_renewal":
      return <Badge className="bg-blue-100 text-blue-700 border border-blue-200">Pending Renewal</Badge>;
  }
}

function killDayStatus(day: typeof DEMO_KILL_DAYS[0]) {
  if (day.hgpConflict) return { label: "HGP CONFLICT", cls: "bg-red-100 text-red-700 border border-red-300" };
  if (!day.nvd) return { label: "Warning", cls: "bg-amber-100 text-amber-700 border border-amber-300" };
  return { label: "Clear", cls: "bg-emerald-100 text-emerald-700 border border-emerald-200" };
}

function tick(val: boolean | null) {
  if (val === null || val === undefined) return <span className="text-slate-300">—</span>;
  return val
    ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
    : <XCircle className="w-4 h-4 text-red-500 inline" />;
}

function bookingCompliant(b: typeof DEMO_BOOKINGS[0]) {
  return b.nvd && b.nlis && b.pic && b.vd;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ExportCompliance() {
  const [certs, setCerts] = useState<EstabCert[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [certsRes, bookingsRes, checksRes] = await Promise.all([
          supabase.from("export_establishment_certs").select("*"),
          supabase.from("bookings").select(
            "id, hgp_status, eu_eligible, msa_enrolled, nvd_received, requested_kill_date, species, head_count"
          ).gte("requested_kill_date", format(today, "yyyy-MM-dd"))
            .lte("requested_kill_date", format(addDays(today, 14), "yyyy-MM-dd")),
          supabase.from("compliance_checks").select("booking_id, nlis_status, nvd_status, pic_status, checked_at"),
        ]);
        setCerts((certsRes.data && certsRes.data.length > 0) ? certsRes.data as EstabCert[] : DEMO_CERTS);
        setBookings(bookingsRes.data ?? []);
        setChecks(checksRes.data ?? []);
      } catch {
        setCerts(DEMO_CERTS);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const certSummary = useMemo(() => ({
    current: certs.filter(c => c.status === "current").length,
    expiring: certs.filter(c => c.status === "expiring_soon").length,
    expired: certs.filter(c => c.status === "expired").length,
    pending: certs.filter(c => c.status === "pending_renewal").length,
  }), [certs]);

  // Kill day rows — use demo if no bookings
  const killDayRows = useMemo(() => {
    if (bookings.length === 0) return DEMO_KILL_DAYS;
    // Group bookings by date
    const grouped: Record<string, Booking[]> = {};
    for (const b of bookings) {
      const d = b.requested_kill_date ?? "unknown";
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(b);
    }
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, bkgs]) => {
      const head = bkgs.reduce((s, b) => s + (b.head_count ?? 0), 0);
      const hgpTreated = bkgs.some(b => b.hgp_status === "treated");
      const euEligible = bkgs.some(b => b.eu_eligible);
      const hgpConflict = hgpTreated && euEligible;
      const halalHead = bkgs.filter(b => (b as any).halal_certified).reduce((s, b) => s + (b.head_count ?? 0), 0);
      const nvdOk = bkgs.every(b => b.nvd_received);
      const msaOk = bkgs.every(b => b.msa_enrolled);
      return {
        date, species: bkgs[0].species ?? "Cattle", head,
        hgp: hgpTreated, eu: euEligible, halal: halalHead / head > 0.5,
        nvd: nvdOk, msa: msaOk, hgpConflict,
      };
    });
  }, [bookings]);

  // NVD compliance
  const checkMap = useMemo(() => {
    const m: Record<string, ComplianceCheck> = {};
    for (const c of checks) m[c.booking_id] = c;
    return m;
  }, [checks]);

  const nvdRate = Math.round((DEMO_BOOKINGS.filter(b => b.nvd).length / DEMO_BOOKINGS.length) * 100);
  const nlisRate = Math.round((DEMO_BOOKINGS.filter(b => b.nlis).length / DEMO_BOOKINGS.length) * 100);
  const picRate = Math.round((DEMO_BOOKINGS.filter(b => b.pic).length / DEMO_BOOKINGS.length) * 100);
  const overallRate = Math.round((DEMO_BOOKINGS.filter(bookingCompliant).length / DEMO_BOOKINGS.length) * 100);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Export Compliance</h1>
            <p className="text-sm text-slate-500 mt-0.5">Establishment certifications, kill-day eligibility and NVD/NLIS status</p>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="certs">
          <TabsList className="mb-4">
            <TabsTrigger value="certs">Establishment Certificates</TabsTrigger>
            <TabsTrigger value="killday">Kill Day Compliance</TabsTrigger>
            <TabsTrigger value="nvd">NVD &amp; NLIS</TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Certs ── */}
          <TabsContent value="certs" className="space-y-4">
            {/* Summary strip */}
            <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-sm font-medium text-slate-700">
                <span className="font-semibold text-emerald-700">{certSummary.current}</span> current
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-sm font-medium text-slate-700">
                <span className="font-semibold text-amber-600">{certSummary.expiring}</span> expiring soon
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-sm font-medium text-slate-700">
                <span className="font-semibold text-red-600">{certSummary.expired}</span> expired
              </span>
              {certSummary.pending > 0 && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="text-sm font-medium text-slate-700">
                    <span className="font-semibold text-blue-600">{certSummary.pending}</span> pending renewal
                  </span>
                </>
              )}
            </div>

            {/* Cert cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {certs.map(cert => {
                const daysLeft = differenceInDays(new Date(cert.expiry_date), today);
                const needsAction = cert.status === "expiring_soon" || cert.status === "expired";
                return (
                  <Card
                    key={cert.id}
                    className={`border ${cert.status === "expired" ? "border-red-200 bg-red-50/30" : cert.status === "expiring_soon" ? "border-amber-200 bg-amber-50/20" : "border-slate-200"}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {getCertIcon(cert.cert_type)}
                          <CardTitle className="text-base font-semibold text-slate-800">{cert.cert_type}</CardTitle>
                        </div>
                        {certStatusBadge(cert)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm text-slate-600">
                        <span className="font-medium">{cert.cert_number}</span>
                        <span className="text-slate-400"> · {cert.issuing_body}</span>
                      </div>
                      <div className="flex gap-4 text-xs text-slate-500">
                        <span>Issued: {format(new Date(cert.issued_date), "dd MMM yyyy")}</span>
                        <span>Expires: {format(new Date(cert.expiry_date), "dd MMM yyyy")}</span>
                      </div>
                      {daysLeft < 90 && daysLeft > 0 && (
                        <div className="flex items-center gap-1 text-xs text-amber-700 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {daysLeft} days until expiry
                        </div>
                      )}
                      {daysLeft <= 0 && (
                        <div className="flex items-center gap-1 text-xs text-red-700 font-medium">
                          <XCircle className="w-3.5 h-3.5" />
                          Expired {Math.abs(daysLeft)} days ago
                        </div>
                      )}
                      {cert.notes && (
                        <p className="text-xs text-slate-500 italic">{cert.notes}</p>
                      )}
                      {needsAction && (
                        <Button size="sm" variant="outline" className="w-full gap-2 mt-1 text-xs">
                          <Upload className="w-3.5 h-3.5" />
                          Upload Renewal
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Tab 2: Kill Day ── */}
          <TabsContent value="killday" className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0" />
              Showing kill days for the next 14 days. HGP conflicts indicate treated cattle booked against EU-eligible days.
            </div>
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Kill Date</TableHead>
                    <TableHead>Species</TableHead>
                    <TableHead className="text-right">Head</TableHead>
                    <TableHead>HGP Status</TableHead>
                    <TableHead>EU Eligible</TableHead>
                    <TableHead>Halal Day</TableHead>
                    <TableHead>NVD Complete</TableHead>
                    <TableHead>MSA Enrolled</TableHead>
                    <TableHead>Overall</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {killDayRows.map((row, i) => {
                    const status = killDayStatus(row);
                    return (
                      <TableRow key={i} className={row.hgpConflict ? "bg-red-50" : ""}>
                        <TableCell className="font-medium text-slate-800">
                          {format(new Date(row.date), "EEE dd MMM")}
                        </TableCell>
                        <TableCell>{row.species}</TableCell>
                        <TableCell className="text-right">{row.head.toLocaleString()}</TableCell>
                        <TableCell>
                          {row.hgp
                            ? <Badge className="bg-amber-100 text-amber-700 border border-amber-200 text-xs">Treated</Badge>
                            : <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs">NIL HGP</Badge>}
                        </TableCell>
                        <TableCell>{tick(row.eu)}</TableCell>
                        <TableCell>
                          {row.halal
                            ? <Badge className="bg-teal-100 text-teal-700 border border-teal-200 text-xs">Halal Day</Badge>
                            : <span className="text-slate-400 text-sm">—</span>}
                        </TableCell>
                        <TableCell>{tick(row.nvd)}</TableCell>
                        <TableCell>{tick(row.msa)}</TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${status.cls}`}>{status.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ── Tab 3: NVD & NLIS ── */}
          <TabsContent value="nvd" className="space-y-6">
            {/* KPI strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "NVD Received Rate", value: `${nvdRate}%`, icon: <FileText className="w-5 h-5 text-blue-600" />, color: "text-blue-700" },
                { label: "NLIS Transfer Rate", value: `${nlisRate}%`, icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, color: "text-emerald-700" },
                { label: "Avg Pre-arrival Lead Time", value: "3.2 days", icon: <Clock className="w-5 h-5 text-amber-600" />, color: "text-amber-700" },
                { label: "Vendor Declaration Rate", value: `${Math.round((DEMO_BOOKINGS.filter(b => b.vd).length / DEMO_BOOKINGS.length) * 100)}%`, icon: <Shield className="w-5 h-5 text-purple-600" />, color: "text-purple-700" },
              ].map(kpi => (
                <Card key={kpi.label} className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-slate-500 font-medium">{kpi.label}</p>
                      {kpi.icon}
                    </div>
                    <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Overall compliance score */}
            <div className="flex items-center gap-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex flex-col items-center justify-center w-24 h-24 rounded-full border-4 border-emerald-300 bg-white shrink-0">
                <span className="text-3xl font-bold text-emerald-700">{overallRate}%</span>
                <span className="text-xs text-slate-500 text-center leading-tight">Overall Score</span>
              </div>
              <div>
                <p className="text-base font-semibold text-slate-800">Compliance Summary</p>
                <p className="text-sm text-slate-600 mt-1">
                  {DEMO_BOOKINGS.filter(bookingCompliant).length} of {DEMO_BOOKINGS.length} bookings fully compliant across all documentation requirements.
                </p>
                {overallRate < 100 && (
                  <p className="text-sm text-amber-700 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {DEMO_BOOKINGS.filter(b => !bookingCompliant(b)).length} bookings require attention before kill.
                  </p>
                )}
              </div>
            </div>

            {/* Bookings table */}
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Booking Ref</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Species</TableHead>
                    <TableHead className="text-center">NVD</TableHead>
                    <TableHead className="text-center">NLIS</TableHead>
                    <TableHead className="text-center">PIC</TableHead>
                    <TableHead className="text-center">Vendor Dec</TableHead>
                    <TableHead className="text-center">Compliant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DEMO_BOOKINGS.map(b => (
                    <TableRow key={b.id} className={!bookingCompliant(b) ? "bg-amber-50/50" : ""}>
                      <TableCell className="font-mono text-sm text-slate-700">{b.id}</TableCell>
                      <TableCell className="text-slate-800">{b.supplier}</TableCell>
                      <TableCell>{b.species}</TableCell>
                      <TableCell className="text-center">{tick(b.nvd)}</TableCell>
                      <TableCell className="text-center">{tick(b.nlis)}</TableCell>
                      <TableCell className="text-center">{tick(b.pic)}</TableCell>
                      <TableCell className="text-center">{tick(b.vd)}</TableCell>
                      <TableCell className="text-center">
                        {bookingCompliant(b)
                          ? <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs">Yes</Badge>
                          : <Badge className="bg-red-100 text-red-700 border border-red-200 text-xs">No</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
