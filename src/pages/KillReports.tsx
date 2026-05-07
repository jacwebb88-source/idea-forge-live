import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, startOfDay } from "date-fns";
import {
  FileText,
  Send,
  CheckCircle,
  Users,
  ChevronDown,
  ChevronUp,
  Mail,
  Download,
  Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type KillBooking = {
  id: string;
  supplier_id: string | null;
  species: string | null;
  head_count: number | null;
  slot_time: string | null;
  status: string | null;
  lot_id: string | null;
  agent_ref: string | null;
  transport_status: string | null;
  requested_kill_date: string | null;
};

type SupplierGroup = {
  supplier_id: string;
  supplierName: string;
  bookings: KillBooking[];
  totalHead: number;
  species: string[];
  allConfirmed: boolean;
};

// Mock recipient list — in production this would be fetched from a recipients config table
const MOCK_RECIPIENTS = [
  { id: "r1", name: "Dave Watts — ACC Operations",        email: "d.watts@acc.com.au",       type: "Processor" },
  { id: "r2", name: "Sally Chen — Woolworths Greenstock", email: "s.chen@woolworths.com.au",  type: "Buyer" },
  { id: "r3", name: "Tom Briggs — Rangers Valley",        email: "t.briggs@rangers.com.au",   type: "Supplier" },
  { id: "r4", name: "BVF Feedlot Desk",                   email: "kills@brisbanevf.com.au",   type: "Supplier" },
  { id: "r5", name: "ACC QA Manager",                     email: "qa@acc.com.au",             type: "Processor" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function KillReports() {
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [bookings, setBookings] = useState<KillBooking[]>([]);
  const [suppliers, setSuppliers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);
  const [expandedSupplier, setExpandedSupplier] = useState<string | null>(null);
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(
    new Set(MOCK_RECIPIENTS.map((r) => r.id))
  );

  // ── Fetch bookings for selected date ──────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setSentCount(null);

      const { data: bks } = await supabase
        .from("bookings")
        .select(
          "id, supplier_id, species, head_count, slot_time, status, lot_id, agent_ref, transport_status, requested_kill_date"
        )
        .eq("requested_kill_date", selectedDate)
        .neq("status", "cancelled");

      const bookingList = (bks as KillBooking[]) || [];
      setBookings(bookingList);

      // Enrich supplier names
      const supplierIds = Array.from(
        new Set(bookingList.map((b) => b.supplier_id).filter(Boolean) as string[])
      );
      if (supplierIds.length) {
        const { data: sups } = await supabase
          .from("suppliers")
          .select("id, name")
          .in("id", supplierIds);
        const map: Record<string, string> = {};
        (sups as any[] | null)?.forEach((s) => (map[s.id] = s.name));
        setSuppliers(map);
      } else {
        setSuppliers({});
      }

      setLoading(false);
    };

    load();
  }, [selectedDate]);

  // ── Group bookings by supplier ────────────────────────────────────────────
  const supplierGroups = useMemo<SupplierGroup[]>(() => {
    const map: Record<string, KillBooking[]> = {};
    bookings.forEach((b) => {
      const key = b.supplier_id || "unknown";
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });

    return Object.entries(map).map(([sid, bks]) => ({
      supplier_id: sid,
      supplierName: suppliers[sid] || "Unknown Supplier",
      bookings: bks,
      totalHead: bks.reduce((sum, b) => sum + (b.head_count || 0), 0),
      species: Array.from(new Set(bks.map((b) => b.species).filter(Boolean))) as string[],
      allConfirmed: bks.every((b) => (b.status || "").toLowerCase() === "confirmed"),
    })).sort((a, b) => b.totalHead - a.totalHead);
  }, [bookings, suppliers]);

  // ── Summary stats ──────────────────────────────────────────────────────────
  const totalHead      = bookings.reduce((sum, b) => sum + (b.head_count || 0), 0);
  const confirmedHead  = bookings
    .filter((b) => (b.status || "").toLowerCase() === "confirmed")
    .reduce((sum, b) => sum + (b.head_count || 0), 0);
  const speciesBreak   = bookings.reduce<Record<string, number>>((acc, b) => {
    const sp = (b.species || "Other").toLowerCase();
    acc[sp] = (acc[sp] || 0) + (b.head_count || 0);
    return acc;
  }, {});

  // ── Toggle recipient selection ─────────────────────────────────────────────
  const toggleRecipient = (id: string) => {
    setSelectedRecipients((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Simulate send ──────────────────────────────────────────────────────────
  const handleSendReports = async () => {
    if (selectedRecipients.size === 0) {
      toast({ title: "No recipients selected", variant: "destructive" });
      return;
    }
    setSending(true);
    // Simulate a short delay per recipient
    await new Promise((r) => setTimeout(r, 1200));
    const count = selectedRecipients.size;
    setSentCount(count);
    setSending(false);
    toast({
      title: `Kill reports sent ✅`,
      description: `${count} recipient${count !== 1 ? "s" : ""} notified for ${format(parseISO(selectedDate), "d MMM yyyy")}`,
    });
  };

  const dateLabel = format(parseISO(selectedDate), "EEEE d MMMM yyyy");

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Kill Reports</h1>
            <p className="text-muted-foreground">
              Generate and distribute kill day reports — replaces 50+ manual emails
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="kill-date" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                Kill date
              </label>
              <input
                id="kill-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* ── Day summary ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Total head</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "—" : totalHead.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">{dateLabel}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Confirmed head</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{loading ? "—" : confirmedHead.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalHead > 0 ? `${((confirmedHead / totalHead) * 100).toFixed(0)}% of total` : "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Vendors on kill</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "—" : supplierGroups.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-medium">Species</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0.5">
                {loading ? (
                  <div className="text-2xl font-bold">—</div>
                ) : Object.entries(speciesBreak).length === 0 ? (
                  <div className="text-sm text-muted-foreground italic">No bookings</div>
                ) : (
                  Object.entries(speciesBreak).map(([sp, head]) => (
                    <div key={sp} className="flex justify-between text-sm">
                      <span className="capitalize text-muted-foreground">{sp}</span>
                      <span className="font-semibold">{head.toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Vendor breakdown ── */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-base font-semibold">
              Vendor kill schedule — {dateLabel}
            </h2>

            {loading ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground animate-pulse">
                  Loading bookings…
                </CardContent>
              </Card>
            ) : supplierGroups.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground italic">
                  No bookings for this date
                </CardContent>
              </Card>
            ) : (
              supplierGroups.map((group) => {
                const isExpanded = expandedSupplier === group.supplier_id;
                return (
                  <Card key={group.supplier_id} className={group.allConfirmed ? "border-blue-200" : "border-amber-200"}>
                    <CardHeader
                      className="pb-2 cursor-pointer"
                      onClick={() => setExpandedSupplier(isExpanded ? null : group.supplier_id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${group.allConfirmed ? "bg-blue-500" : "bg-amber-400"}`} />
                          <CardTitle className="text-sm font-semibold">{group.supplierName}</CardTitle>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold">{group.totalHead.toLocaleString()} head</span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {group.species.join(", ")}
                          </span>
                          {group.allConfirmed ? (
                            <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-200">Confirmed</Badge>
                          ) : (
                            <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>
                          )}
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="pt-0">
                        <div className="border-t pt-3 space-y-2">
                          {group.bookings.map((b) => (
                            <div key={b.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                              <div>
                                <span className="font-mono text-xs text-muted-foreground mr-2">
                                  {b.id.slice(-8).toUpperCase()}
                                </span>
                                <span className="capitalize">{b.species || "—"}</span>
                                {b.lot_id && <span className="text-muted-foreground ml-2">· Lot {b.lot_id}</span>}
                              </div>
                              <div className="flex items-center gap-3">
                                {b.slot_time && (
                                  <span className="text-xs text-muted-foreground">{b.slot_time}</span>
                                )}
                                <span className="font-semibold">{(b.head_count || 0).toLocaleString()} hd</span>
                                <span className={`text-xs capitalize rounded px-1.5 py-0.5 border ${
                                  (b.transport_status || "").toLowerCase() === "confirmed"
                                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                    : "bg-gray-50 border-gray-200 text-gray-500"
                                }`}>
                                  {b.transport_status || "transport ?"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })
            )}
          </div>

          {/* ── Recipient list + send ── */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold">Report recipients</h2>

            <Card>
              <CardContent className="pt-4 space-y-2">
                {MOCK_RECIPIENTS.map((r) => {
                  const checked = selectedRecipients.has(r.id);
                  return (
                    <label
                      key={r.id}
                      className={`flex items-start gap-3 p-2 rounded-md cursor-pointer transition-colors ${checked ? "bg-accent" : "hover:bg-muted/50"}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRecipient(r.id)}
                        className="mt-0.5 h-4 w-4 accent-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                      </div>
                      <span className={`shrink-0 text-xs rounded-full px-1.5 py-0.5 border ${
                        r.type === "Processor" ? "bg-blue-50 border-blue-200 text-blue-700"
                        : r.type === "Buyer"    ? "bg-purple-50 border-purple-200 text-purple-700"
                        : "bg-gray-50 border-gray-200 text-gray-600"
                      }`}>
                        {r.type}
                      </span>
                    </label>
                  );
                })}
              </CardContent>
            </Card>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground px-1">
                <span>{selectedRecipients.size} of {MOCK_RECIPIENTS.length} selected</span>
                <button
                  className="underline"
                  onClick={() =>
                    setSelectedRecipients(
                      selectedRecipients.size === MOCK_RECIPIENTS.length
                        ? new Set()
                        : new Set(MOCK_RECIPIENTS.map((r) => r.id))
                    )
                  }
                >
                  {selectedRecipients.size === MOCK_RECIPIENTS.length ? "Deselect all" : "Select all"}
                </button>
              </div>

              {sentCount !== null && (
                <div className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>Sent to {sentCount} recipient{sentCount !== 1 ? "s" : ""}</span>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleSendReports}
                disabled={sending || loading || bookings.length === 0 || selectedRecipients.size === 0}
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending reports…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send kill reports ({selectedRecipients.size})
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground px-2">
                Each vendor receives only their own kill data. Processor summary goes to Processor recipients.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
