import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format, addDays } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, AlertTriangle, CheckCircle, Clock, Search, ShieldCheck, ShieldAlert, ShieldOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

// ── Types ──────────────────────────────────────────────────────────────────────

interface ComplianceCheck {
  id: string;
  booking_id: string | null;
  nlis_status: string | null;
  nvd_status: string | null;
  pic_status: string | null;
  checked_at: string | null;
  checked_by: string | null;
}

interface BookingComplianceRow {
  id: string;
  species: string | null;
  head_count: number | null;
  requested_kill_date: string | null;
  status: string | null;
  hgp_status: string | null;
  mulesing_status: string | null;
  msa_enrolled: boolean | null;
  lot_id: string | null;
  supplier_id: string | null;
  supplierName?: string;
  hasCheck: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const hasMissing = (c: ComplianceCheck) =>
  c.nlis_status === "missing" || c.nvd_status === "missing" || c.pic_status === "missing";

const hasPending = (c: ComplianceCheck) =>
  !hasMissing(c) && (c.nlis_status === "pending" || c.nvd_status === "pending" || c.pic_status === "pending");

const isAllOk = (c: ComplianceCheck) =>
  ["ok", "complete"].includes((c.nlis_status || "").toLowerCase()) &&
  ["ok", "complete"].includes((c.nvd_status || "").toLowerCase()) &&
  ["ok", "complete"].includes((c.pic_status || "").toLowerCase());

const nlisStatusVariant = (s: string | null): "confirmed" | "cancelled" | "secondary" => {
  if (!s) return "secondary";
  if (["ok", "complete", "pass", "approved", "compliant"].includes(s.toLowerCase())) return "confirmed";
  if (["fail", "rejected", "non-compliant", "missing"].includes(s.toLowerCase())) return "cancelled";
  return "secondary";
};

const hgpBadge = (hgp: string | null) => {
  if (hgp === "nil")               return { text: "No HGP",    cls: "text-emerald-700 bg-emerald-50 border border-emerald-200" };
  if (hgp === "implanted")         return { text: "HGP",       cls: "text-amber-700 bg-amber-50 border border-amber-200" };
  if (hgp === "under_withholding") return { text: "HGP – W/D", cls: "text-orange-700 bg-orange-50 border border-orange-200" };
  return null;
};

const mulesingLabel = (m: string | null) => {
  switch (m) {
    case "mulesed":        return "Mulesed";
    case "unmulesed":      return "Unmulesed";
    case "ctd":            return "CTD";
    case "nm_pain_relief": return "NM w/ pain relief";
    default:               return null;
  }
};

// Bookings with kill dates in the next 14 days that need a check
const isUpcoming = (dateStr: string | null) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d >= now && d <= addDays(now, 14);
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function ComplianceChecks() {
  const { toast } = useToast();

  // compliance_checks data
  const [checks, setChecks]   = useState<ComplianceCheck[]>([]);
  const [loadingChecks, setLoadingChecks] = useState(true);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // bookings compliance data
  const [bookings, setBookings] = useState<BookingComplianceRow[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  const [statusFilter, setStatusFilter] = useState<"all" | "missing" | "pending" | "ok">("all");
  const [search, setSearch] = useState("");

  // dialog
  const [selectedCheck, setSelectedCheck] = useState<ComplianceCheck | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingComplianceRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // create-check form state
  const [createMode, setCreateMode] = useState(false);
  const [newNlis, setNewNlis]       = useState("pending");
  const [newNvd, setNewNvd]         = useState("pending");
  const [newPic, setNewPic]         = useState("pending");
  const [newBy, setNewBy]           = useState("");
  const [saving, setSaving]         = useState(false);

  // ── Fetch compliance_checks ──────────────────────────────────────────────────

  useEffect(() => {
    const fetchChecks = async () => {
      setLoadingChecks(true);
      const { data, error } = await (supabase as any)
        .from("compliance_checks")
        .select("id, booking_id, nlis_status, nvd_status, pic_status, checked_at, checked_by")
        .order("checked_at", { ascending: sortOrder === "asc" });

      if (!error && data) setChecks(data);
      setLoadingChecks(false);
    };
    fetchChecks();
  }, [sortOrder]);

  // ── Fetch bookings with compliance fields ────────────────────────────────────

  useEffect(() => {
    const fetchBookings = async () => {
      setLoadingBookings(true);

      const { data, error } = await supabase
        .from("bookings")
        .select("id, species, head_count, requested_kill_date, status, hgp_status, mulesing_status, msa_enrolled, lot_id, supplier_id")
        .not("status", "eq", "cancelled")
        .order("requested_kill_date", { ascending: true });

      if (error || !data) { setLoadingBookings(false); return; }

      // Enrich with supplier names
      const supplierIds = Array.from(new Set(data.map((b: any) => b.supplier_id).filter(Boolean))) as string[];
      let supplierMap: Record<string, string> = {};
      if (supplierIds.length > 0) {
        const { data: sups } = await supabase.from("suppliers").select("id, name").in("id", supplierIds);
        (sups || []).forEach((s: any) => (supplierMap[s.id] = s.name));
      }

      // Which booking IDs already have a compliance_check record?
      const { data: checkIds } = await supabase
        .from("compliance_checks")
        .select("booking_id");
      const checkedSet = new Set((checkIds || []).map((c: any) => c.booking_id));

      setBookings(data.map((b: any) => ({
        ...b,
        supplierName: b.supplier_id ? (supplierMap[b.supplier_id] || "Unknown") : undefined,
        hasCheck: checkedSet.has(b.id),
      })));
      setLoadingBookings(false);
    };
    fetchBookings();
  }, [checks]); // re-run after checks update so hasCheck stays in sync

  // ── Derived values ───────────────────────────────────────────────────────────

  const missingCount = checks.filter(hasMissing).length;
  const pendingCount = checks.filter(hasPending).length;
  const okCount      = checks.filter(isAllOk).length;

  const filteredChecks = useMemo(() => {
    let list = checks;
    if (statusFilter === "missing") list = list.filter(hasMissing);
    else if (statusFilter === "pending") list = list.filter(hasPending);
    else if (statusFilter === "ok")      list = list.filter(isAllOk);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        (c.booking_id || "").toLowerCase().includes(q) ||
        (c.checked_by || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [checks, statusFilter, search]);

  // Upcoming bookings without a compliance check record
  const needsCheck = useMemo(() =>
    bookings.filter(b => !b.hasCheck && isUpcoming(b.requested_kill_date)),
    [bookings]
  );

  // All bookings with compliance concerns (HGP-treated, no mulesing declared for lamb/sheep, not MSA)
  const complianceIssues = useMemo(() =>
    bookings.filter(b => {
      const isLamb = ["lamb", "sheep", "mutton"].includes((b.species || "").toLowerCase());
      const hgpConcern = b.hgp_status === "implanted" || b.hgp_status === "under_withholding";
      const mulesingConcern = isLamb && !b.mulesing_status;
      return hgpConcern || mulesingConcern;
    }),
    [bookings]
  );

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const openCheckDialog = (check: ComplianceCheck) => {
    setSelectedCheck(check);
    setSelectedBooking(bookings.find(b => b.id === check.booking_id) || null);
    setCreateMode(false);
    setDialogOpen(true);
  };

  const openBookingDialog = (booking: BookingComplianceRow) => {
    setSelectedBooking(booking);
    setSelectedCheck(checks.find(c => c.booking_id === booking.id) || null);
    setCreateMode(false);
    setNewNlis("pending"); setNewNvd("pending"); setNewPic("pending"); setNewBy("");
    setDialogOpen(true);
  };

  const handleCreateCheck = async () => {
    if (!selectedBooking) return;
    setSaving(true);
    const { error, data } = await (supabase as any)
      .from("compliance_checks")
      .insert({
        booking_id:  selectedBooking.id,
        nlis_status: newNlis,
        nvd_status:  newNvd,
        pic_status:  newPic,
        checked_by:  newBy || "Intake",
        checked_at:  new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    setSelectedCheck(data);
    setChecks(prev => [data, ...prev]);
    setCreateMode(false);
    toast({ title: "Check recorded", description: `NLIS: ${newNlis} · NVD: ${newNvd} · PIC: ${newPic}` });
    setSaving(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Compliance Checks</h1>
            <p className="text-muted-foreground">NLIS, NVD, PIC status · HGP sequencing · Mulesing declarations</p>
          </div>
        </div>

        {/* Summary strip */}
        {!loadingChecks && (
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Missing",    count: missingCount,                          icon: ShieldOff,   cls: "bg-red-50 border-red-200 text-red-700",     filter: "missing" as const,  ring: "ring-red-400" },
              { label: "Pending",    count: pendingCount,                          icon: Clock,       cls: "bg-amber-50 border-amber-200 text-amber-700", filter: "pending" as const,  ring: "ring-amber-400" },
              { label: "Clear",      count: okCount,                              icon: CheckCircle, cls: "bg-emerald-50 border-emerald-200 text-emerald-700", filter: "ok" as const, ring: "ring-emerald-400" },
              { label: "Need check", count: needsCheck.length,                   icon: ShieldAlert, cls: "bg-orange-50 border-orange-200 text-orange-700", filter: null,              ring: "" },
              { label: "Issues",     count: complianceIssues.length,              icon: AlertTriangle, cls: "bg-rose-50 border-rose-200 text-rose-700",  filter: null,              ring: "" },
            ].map(({ label, count, icon: Icon, cls, filter, ring }) => (
              <div
                key={label}
                onClick={() => filter && setStatusFilter(s => s === filter ? "all" : filter)}
                className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${cls} ${filter ? "cursor-pointer transition-all" : ""} ${filter && statusFilter === filter ? `ring-2 ${ring}` : ""}`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="font-medium">{label}</span>
                <span className="font-bold">{count}</span>
              </div>
            ))}
            {statusFilter !== "all" && (
              <button className="text-xs text-muted-foreground underline self-center" onClick={() => setStatusFilter("all")}>
                Clear filter
              </button>
            )}
          </div>
        )}

        <Tabs defaultValue="checks">
          <TabsList>
            <TabsTrigger value="checks">Check Records ({checks.length})</TabsTrigger>
            <TabsTrigger value="needscheck">
              Upcoming without check
              {needsCheck.length > 0 && (
                <span className="ml-1.5 bg-orange-100 text-orange-700 rounded-full text-xs px-1.5">{needsCheck.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="issues">
              Compliance flags
              {complianceIssues.length > 0 && (
                <span className="ml-1.5 bg-rose-100 text-rose-700 rounded-full text-xs px-1.5">{complianceIssues.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: compliance_checks table ── */}
          <TabsContent value="checks" className="mt-4 space-y-4">
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search booking ID, checked by…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="missing">Missing</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="ok">All clear</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {loadingChecks ? "Loading…" : `${filteredChecks.length} check${filteredChecks.length !== 1 ? "s" : ""}${statusFilter !== "all" ? " · filtered" : ""}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingChecks ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : filteredChecks.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No compliance checks found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking ID</TableHead>
                        <TableHead>NLIS</TableHead>
                        <TableHead>NVD</TableHead>
                        <TableHead>PIC</TableHead>
                        <TableHead>Overall</TableHead>
                        <TableHead>Checked by</TableHead>
                        <TableHead>
                          <Button variant="ghost" size="sm" onClick={() => setSortOrder(s => s === "asc" ? "desc" : "asc")} className="flex items-center gap-1 hover:bg-transparent p-0">
                            Checked At <ArrowUpDown className="h-3.5 w-3.5" />
                          </Button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredChecks.map(check => (
                        <TableRow
                          key={check.id}
                          onClick={() => openCheckDialog(check)}
                          className={`cursor-pointer ${hasMissing(check) ? "bg-red-50/60 border-l-4 border-l-red-400" : hasPending(check) ? "border-l-4 border-l-amber-400" : isAllOk(check) ? "border-l-4 border-l-emerald-400" : ""}`}
                        >
                          <TableCell className="font-mono text-xs">
                            {check.booking_id ? check.booking_id.slice(-8).toUpperCase() : "—"}
                          </TableCell>
                          <TableCell><Badge variant={nlisStatusVariant(check.nlis_status)}>{check.nlis_status || "Pending"}</Badge></TableCell>
                          <TableCell><Badge variant={nlisStatusVariant(check.nvd_status)}>{check.nvd_status || "Pending"}</Badge></TableCell>
                          <TableCell><Badge variant={nlisStatusVariant(check.pic_status)}>{check.pic_status || "Pending"}</Badge></TableCell>
                          <TableCell>
                            {hasMissing(check) ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 border border-red-200 rounded-full px-2 py-0.5">
                                <AlertTriangle className="h-3 w-3" /> Missing
                              </span>
                            ) : hasPending(check) ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
                                <Clock className="h-3 w-3" /> Pending
                              </span>
                            ) : isAllOk(check) ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 rounded-full px-2 py-0.5">
                                <CheckCircle className="h-3 w-3" /> Clear
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{check.checked_by || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {check.checked_at ? format(new Date(check.checked_at), "dd MMM yyyy HH:mm") : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 2: Upcoming bookings without a compliance check ── */}
          <TabsContent value="needscheck" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-orange-500" />
                  Upcoming bookings (next 14 days) without a compliance check record
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingBookings ? (
                  <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : needsCheck.length === 0 ? (
                  <div className="flex items-center gap-2 py-6 justify-center text-emerald-700">
                    <CheckCircle className="h-5 w-5" />
                    <span>All upcoming bookings have compliance checks recorded.</span>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking ID</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Species</TableHead>
                        <TableHead className="text-right">Head</TableHead>
                        <TableHead>Kill Date</TableHead>
                        <TableHead>HGP</TableHead>
                        <TableHead>Mulesing</TableHead>
                        <TableHead>MSA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {needsCheck.map(b => {
                        const hgp = hgpBadge(b.hgp_status);
                        const ml = mulesingLabel(b.mulesing_status);
                        return (
                          <TableRow
                            key={b.id}
                            onClick={() => openBookingDialog(b)}
                            className="cursor-pointer border-l-4 border-l-orange-400 hover:bg-muted/40"
                          >
                            <TableCell className="font-mono text-xs">{b.id.slice(-8).toUpperCase()}</TableCell>
                            <TableCell className="text-sm">{b.supplierName || "—"}</TableCell>
                            <TableCell>
                              <Badge className="capitalize" variant={(b.species as any) || "secondary"}>{b.species || "—"}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm">{b.head_count?.toLocaleString() || "—"}</TableCell>
                            <TableCell className="text-sm">
                              {b.requested_kill_date ? format(new Date(b.requested_kill_date), "EEE d MMM") : "—"}
                            </TableCell>
                            <TableCell>
                              {hgp ? (
                                <span className={`text-xs font-medium rounded px-1.5 py-0.5 ${hgp.cls}`}>{hgp.text}</span>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-sm">{ml || <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                            <TableCell className="text-sm">
                              {b.msa_enrolled === true ? (
                                <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5">MSA</span>
                              ) : b.msa_enrolled === false ? (
                                <span className="text-xs text-muted-foreground">No</span>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab 3: Compliance flags on bookings ── */}
          <TabsContent value="issues" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500" />
                  Bookings with compliance flags (HGP implanted/W/D, undeclared mulesing for lamb/sheep)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingBookings ? (
                  <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : complianceIssues.length === 0 ? (
                  <div className="flex items-center gap-2 py-6 justify-center text-emerald-700">
                    <ShieldCheck className="h-5 w-5" />
                    <span>No compliance flags detected.</span>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking ID</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Species</TableHead>
                        <TableHead className="text-right">Head</TableHead>
                        <TableHead>Kill Date</TableHead>
                        <TableHead>Flag</TableHead>
                        <TableHead>HGP</TableHead>
                        <TableHead>Mulesing</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {complianceIssues.map(b => {
                        const isLamb = ["lamb", "sheep", "mutton"].includes((b.species || "").toLowerCase());
                        const hgpConcern = b.hgp_status === "implanted" || b.hgp_status === "under_withholding";
                        const mulesingConcern = isLamb && !b.mulesing_status;
                        const hgp = hgpBadge(b.hgp_status);
                        const ml = mulesingLabel(b.mulesing_status);

                        return (
                          <TableRow
                            key={b.id}
                            onClick={() => openBookingDialog(b)}
                            className="cursor-pointer border-l-4 border-l-rose-400 hover:bg-muted/40"
                          >
                            <TableCell className="font-mono text-xs">{b.id.slice(-8).toUpperCase()}</TableCell>
                            <TableCell className="text-sm">{b.supplierName || "—"}</TableCell>
                            <TableCell>
                              <Badge className="capitalize" variant={(b.species as any) || "secondary"}>{b.species || "—"}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm">{b.head_count?.toLocaleString() || "—"}</TableCell>
                            <TableCell className="text-sm">
                              {b.requested_kill_date ? format(new Date(b.requested_kill_date), "EEE d MMM") : "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {hgpConcern && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                    <AlertTriangle className="h-3 w-3" /> HGP kill order
                                  </span>
                                )}
                                {mulesingConcern && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">
                                    <AlertTriangle className="h-3 w-3" /> Mulesing undeclared
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {hgp ? (
                                <span className={`text-xs font-medium rounded px-1.5 py-0.5 ${hgp.cls}`}>{hgp.text}</span>
                              ) : <span className="text-xs text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-sm">
                              {ml ? ml : (
                                isLamb
                                  ? <span className="text-xs font-medium text-rose-600">Not declared</span>
                                  : <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ── Detail Dialog ── */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Compliance detail
                {selectedBooking && (
                  <span className="font-mono text-xs text-muted-foreground ml-1">
                    {selectedBooking.id.slice(-8).toUpperCase()}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              {/* Booking overview */}
              {selectedBooking && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Supplier</p>
                    <p className="font-medium">{selectedBooking.supplierName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Species</p>
                    <p className="capitalize font-medium">{selectedBooking.species || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Head Count</p>
                    <p>{selectedBooking.head_count?.toLocaleString() || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Kill Date</p>
                    <p>{selectedBooking.requested_kill_date ? format(new Date(selectedBooking.requested_kill_date), "EEE d MMM yyyy") : "—"}</p>
                  </div>
                </div>
              )}

              {/* Booking-level compliance fields */}
              {selectedBooking && (
                <div className="border rounded-md p-3 space-y-2 bg-muted/30">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Booking compliance fields</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">HGP</p>
                      {hgpBadge(selectedBooking.hgp_status) ? (
                        <span className={`text-xs font-medium rounded px-1.5 py-0.5 ${hgpBadge(selectedBooking.hgp_status)!.cls}`}>
                          {hgpBadge(selectedBooking.hgp_status)!.text}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Mulesing</p>
                      <p>{mulesingLabel(selectedBooking.mulesing_status) || <span className="text-muted-foreground">—</span>}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">MSA</p>
                      <p>{selectedBooking.msa_enrolled === true ? "Enrolled" : selectedBooking.msa_enrolled === false ? "No" : "—"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* compliance_checks record */}
              {selectedCheck && !createMode ? (
                <div className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">NLIS / NVD / PIC check record</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">NLIS</p>
                      <Badge variant={nlisStatusVariant(selectedCheck.nlis_status)}>{selectedCheck.nlis_status || "Pending"}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">NVD</p>
                      <Badge variant={nlisStatusVariant(selectedCheck.nvd_status)}>{selectedCheck.nvd_status || "Pending"}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">PIC</p>
                      <Badge variant={nlisStatusVariant(selectedCheck.pic_status)}>{selectedCheck.pic_status || "Pending"}</Badge>
                    </div>
                  </div>
                  {selectedCheck.checked_by && (
                    <p className="text-xs text-muted-foreground">
                      Checked by <strong>{selectedCheck.checked_by}</strong>
                      {selectedCheck.checked_at && ` · ${format(new Date(selectedCheck.checked_at), "d MMM yyyy HH:mm")}`}
                    </p>
                  )}
                </div>
              ) : !createMode ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 border rounded-md p-3 text-amber-700 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <p className="text-xs">No NLIS/NVD/PIC check record exists for this booking.</p>
                  </div>
                  <Button size="sm" className="w-full" onClick={() => setCreateMode(true)}>
                    <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                    Record compliance check
                  </Button>
                </div>
              ) : (
                /* ── Create check form ── */
                <div className="border rounded-md p-3 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Record NLIS / NVD / PIC check</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "NLIS",  value: newNlis, set: setNewNlis },
                      { label: "NVD",   value: newNvd,  set: setNewNvd },
                      { label: "PIC",   value: newPic,  set: setNewPic },
                    ].map(({ label, value, set }) => (
                      <div key={label} className="space-y-1">
                        <Label className="text-xs">{label}</Label>
                        <Select value={value} onValueChange={set}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-[200]">
                            <SelectItem value="verified">Verified</SelectItem>
                            <SelectItem value="received">Received</SelectItem>
                            <SelectItem value="valid">Valid</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="missing">Missing</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Checked by</Label>
                    <input
                      className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="e.g. Sam Reece — Intake"
                      value={newBy}
                      onChange={e => setNewBy(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCreateMode(false)} disabled={saving}>Cancel</Button>
                    <Button size="sm" className="flex-1" onClick={handleCreateCheck} disabled={saving}>
                      {saving ? (
                        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving…</>
                      ) : (
                        <><ShieldCheck className="h-3.5 w-3.5 mr-1.5" />Save check</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
