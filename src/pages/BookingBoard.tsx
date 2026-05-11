import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { NewBookingForm } from "@/components/NewBookingForm";
import { BookingCalendar } from "@/components/BookingCalendar";
import { useToast } from "@/hooks/use-toast";
import { buildBookingChangeRows, resolveAuditActor } from "@/lib/bookingAudit";
import { Search, Plus, Filter, Download, Edit2, Save, X, Loader2, History, Bell, CheckCircle, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, addDays } from "date-fns";

// 30-minute arrival slots 06:00–22:00
const ARRIVAL_SLOTS = Array.from({ length: 32 }, (_, i) => {
  const h = Math.floor(i / 2) + 6;
  const m = i % 2 === 0 ? "00" : "30";
  const hNext = m === "30" ? h + 1 : h;
  const mNext = m === "30" ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}–${String(hNext).padStart(2, "0")}:${mNext}`;
}).filter(s => {
  const [start] = s.split("–");
  const [h] = start.split(":").map(Number);
  return h < 22;
});

// Type definition for booking data from public.bookings
type BookingData = {
  id: string;
  species: string | null;
  head_count: number | null;
  requested_kill_date: string | null;
  status: string | null;
  fill_rate: number | null;
  plant_id: string | null;
  supplier_id: string | null;
  arrival_slot: string | null;
  hgp_status: string | null;
  mulesing_status: string | null;
  lot_id: string | null;
  agent_ref: string | null;
  kill_order_seq: number | null;
  transport_status: string | null;
  msa_enrolled: boolean | null;
  // enriched
  supplierName?: string;
};

type EditFields = {
  status: string;
  head_count: string;
  arrival_slot: string;
  hgp_status: string;
  transport_status: string;
  kill_order_seq: string;
  change_note: string;
};

const getSpeciesVariant = (species: string): "beef" | "lamb" | "mutton" | "goat" | "secondary" => {
  switch (species?.toLowerCase()) {
    case "beef":
    case "cattle": return "beef";
    case "lamb": return "lamb";
    case "mutton":
    case "sheep": return "mutton";
    case "goat": return "goat";
    default: return "secondary";
  }
};

const getStatusVariant = (status: string): "confirmed" | "requested" | "changed" | "cancelled" | "secondary" => {
  switch (status) {
    case "confirmed": return "confirmed";
    case "requested":
    case "pending":
    case "low":       return "requested";
    case "changed":   return "changed";
    case "cancelled": return "cancelled";
    default:          return "secondary";
  }
};

/** Left border colour on table rows — mirrors Kill Plan confidence colours */
const confidenceRowStyle = (status: string | null): string => {
  switch ((status || "").toLowerCase()) {
    case "confirmed":   return "border-l-4 border-l-blue-500";
    case "high":        return "border-l-4 border-l-emerald-500";
    case "medium":      return "border-l-4 border-l-amber-500";
    case "low":
    case "pending":
    case "requested":   return "border-l-4 border-l-yellow-400";
    case "cancelled":   return "border-l-4 border-l-red-400 opacity-60";
    default:            return "border-l-4 border-l-gray-300";
  }
};

const hgpLabel = (hgp: string | null) => {
  if (hgp === "nil")               return { text: "No HGP",    cls: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  if (hgp === "implanted")         return { text: "HGP",       cls: "text-amber-700 bg-amber-50 border-amber-200" };
  if (hgp === "under_withholding") return { text: "HGP – W/D", cls: "text-orange-700 bg-orange-50 border-orange-200" };
  return null;
};

const transportLabel = (ts: string | null) => {
  switch (ts) {
    case "confirmed":       return { text: "Confirmed",   cls: "text-blue-700 bg-blue-50 border-blue-200" };
    case "arranged":        return { text: "Arranged",    cls: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    case "arrived":         return { text: "Arrived",     cls: "text-purple-700 bg-purple-50 border-purple-200" };
    case "in_transit":      return { text: "In transit",  cls: "text-indigo-700 bg-indigo-50 border-indigo-200" };
    case "pending":         return { text: "Pending",     cls: "text-amber-700 bg-amber-50 border-amber-200" };
    case "not_required":    return { text: "Not req.",    cls: "text-gray-600 bg-gray-50 border-gray-200" };
    default: return null;
  }
};

export default function BookingBoard() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const weekParam = searchParams.get("week"); // ISO date string = Monday of that week
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [selectedProcessor, setSelectedProcessor] = useState("all");
  const [selectedPlant, setSelectedPlant] = useState("all");
  const [plants, setPlants] = useState<any[]>([]);
  const [processors, setProcessors] = useState<string[]>([]);

  // Dialog state
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState<EditFields>({
    status: "", head_count: "", arrival_slot: "", hgp_status: "",
    transport_status: "", kill_order_seq: "", change_note: "",
  });
  const [saving, setSaving] = useState(false);

  // Track when plants have finished loading (even if empty)
  const [plantsLoaded, setPlantsLoaded] = useState(false);

  // Fetch plants and processors
  useEffect(() => {
    const fetchPlants = async () => {
      const { data } = await supabase
        .from('plants')
        .select('*')
        .order('plant_name');
      if (data) {
        setPlants(data);
        const uniqueProcessors = [...new Set(data.map((p: any) => p.company_name).filter(Boolean))] as string[];
        setProcessors(uniqueProcessors);
      }
      setPlantsLoaded(true); // always mark done, even if no plants
    };
    fetchPlants();
  }, []);

  // Reset plant selection when processor changes
  useEffect(() => {
    setSelectedPlant("all");
  }, [selectedProcessor]);

  // Filter plants based on selected processor
  const filteredPlants = selectedProcessor === "all"
    ? plants
    : plants.filter((p: any) => p.company_name === selectedProcessor);

  const getFilteredPlantIds = () => {
    if (selectedPlant !== "all") return [selectedPlant];
    if (selectedProcessor !== "all") return filteredPlants.map((p: any) => p.id);
    return plants.map((p: any) => p.id);
  };

  // Fetch bookings once plants are loaded (or immediately if no plant filter needed)
  useEffect(() => {
    if (plantsLoaded) fetchBookings();
  }, [selectedProcessor, selectedPlant, plantsLoaded]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const plantIds = getFilteredPlantIds();

      let query = supabase
        .from('bookings')
        .select(`id, species, head_count, requested_kill_date, status, fill_rate,
                 plant_id, supplier_id, arrival_slot, hgp_status, mulesing_status,
                 lot_id, agent_ref, kill_order_seq, transport_status, msa_enrolled`)
        .order('requested_kill_date', { ascending: true });

      // Only apply plant filter if a specific plant or processor is selected
      // (when "all" with no processor filter, don't restrict by plant — include unassigned bookings too)
      if (selectedPlant !== "all") {
        query = query.eq('plant_id', selectedPlant);
      } else if (selectedProcessor !== "all" && plantIds.length > 0) {
        query = query.in('plant_id', plantIds);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching bookings:', error);
        toast({ title: "Error", description: "Failed to fetch bookings.", variant: "destructive" });
        return;
      }

      const raw = (data || []) as BookingData[];

      // Enrich with supplier names
      const supplierIds = Array.from(new Set(raw.map(b => b.supplier_id).filter(Boolean))) as string[];
      let supplierMap: Record<string, string> = {};
      if (supplierIds.length > 0) {
        const { data: sups } = await supabase
          .from('suppliers').select('id, name').in('id', supplierIds);
        (sups || []).forEach((s: any) => (supplierMap[s.id] = s.name));
      }

      setBookings(raw.map(b => ({
        ...b,
        supplierName: b.supplier_id ? (supplierMap[b.supplier_id] || "Unknown supplier") : undefined,
      })));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Dialog helpers ──────────────────────────────────────────────────────────

  const openBooking = (booking: BookingData) => {
    setSelectedBooking(booking);
    setEditMode(false);
    setEditFields({
      status:           booking.status || "",
      head_count:       booking.head_count?.toString() || "",
      arrival_slot:     booking.arrival_slot || "",
      hgp_status:       booking.hgp_status || "",
      transport_status: booking.transport_status || "",
      kill_order_seq:   booking.kill_order_seq?.toString() || "",
      change_note:      "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditMode(false);
    setSelectedBooking(null);
  };

  // ── Quick confirm (no dialog needed) ───────────────────────────────────────
  const quickConfirm = async (e: React.MouseEvent, booking: BookingData) => {
    e.stopPropagation();
    const { error } = await supabase.from("bookings").update({ status: "confirmed" }).eq("id", booking.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: "confirmed" } : b));
    toast({ title: "Booking confirmed", description: `${booking.supplierName || "Booking"} · ${(booking.head_count || 0).toLocaleString()} head` });
  };

  const approveRequest = async (e: React.MouseEvent, booking: BookingData) => {
    e.stopPropagation();
    const { error } = await supabase.from("bookings").update({ status: "confirmed" }).eq("id", booking.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: "confirmed" } : b));
    toast({ title: "Booking request approved", description: `${booking.supplierName || "Booking"} · ${(booking.head_count || 0).toLocaleString()} head confirmed.` });
  };

  const declineRequest = async (e: React.MouseEvent, booking: BookingData) => {
    e.stopPropagation();
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: "cancelled" } : b));
    toast({ title: "Request declined", description: `${booking.supplierName || "Booking"} request has been declined.`, variant: "destructive" });
  };

  const saveEdit = async () => {
    if (!selectedBooking) return;
    setSaving(true);

    const diffable: Array<{ key: keyof EditFields; dbKey: string; oldVal: string }> = [
      { key: "status",           dbKey: "status",           oldVal: selectedBooking.status || "" },
      { key: "head_count",       dbKey: "head_count",       oldVal: selectedBooking.head_count?.toString() || "" },
      { key: "arrival_slot",     dbKey: "arrival_slot",     oldVal: selectedBooking.arrival_slot || "" },
      { key: "hgp_status",       dbKey: "hgp_status",       oldVal: selectedBooking.hgp_status || "" },
      { key: "transport_status", dbKey: "transport_status", oldVal: selectedBooking.transport_status || "" },
      { key: "kill_order_seq",   dbKey: "kill_order_seq",   oldVal: selectedBooking.kill_order_seq?.toString() || "" },
    ];

    const changed = diffable.filter(f => (editFields[f.key] || "").trim() !== f.oldVal.trim());

    if (changed.length === 0) {
      toast({ title: "No changes", description: "Nothing was modified." });
      setEditMode(false);
      setSaving(false);
      return;
    }

    try {
      const actor = await resolveAuditActor("Booking Board");

      // 1. Write to booking_changes (audit trail)
      const changeRows = buildBookingChangeRows(changed.map((f) => ({
        bookingId: selectedBooking.id,
        fieldName: f.dbKey,
        oldValue: f.oldVal,
        newValue: editFields[f.key] || "",
        changeNote: editFields.change_note,
        actor,
      })));
      const { error: auditErr } = await supabase.from("booking_changes").insert(changeRows);
      if (auditErr) throw auditErr;

      // 2. Update bookings table
      const updatePayload: Record<string, any> = {};
      for (const f of changed) {
        if (f.dbKey === "head_count")     updatePayload[f.dbKey] = parseInt(editFields.head_count) || null;
        else if (f.dbKey === "kill_order_seq") updatePayload[f.dbKey] = parseInt(editFields.kill_order_seq) || null;
        else updatePayload[f.dbKey] = editFields[f.key] || null;
      }
      const { error: updateErr } = await supabase.from("bookings").update(updatePayload).eq("id", selectedBooking.id);
      if (updateErr) throw updateErr;

      // 3. Update local state
      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, ...updatePayload } : b));
      setSelectedBooking(prev => prev ? { ...prev, ...updatePayload } : prev);

      toast({ title: `${changed.length} change${changed.length > 1 ? "s" : ""} saved`, description: "Booking updated and audit trail written." });
      setEditMode(false);
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── CSV export ──────────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    if (filteredBookings.length === 0) return;
    const headers = [
      "Booking ID", "Supplier", "Species", "Head Count",
      "Kill Date", "Arrival Slot", "Status", "HGP Status",
      "Transport", "Kill Order", "Fill Rate %"
    ];
    const rows = filteredBookings.map(b => [
      b.id.slice(-8).toUpperCase(),
      b.supplierName || "",
      b.species || "",
      b.head_count ?? "",
      b.requested_kill_date || "",
      b.arrival_slot || "",
      b.status || "",
      b.hgp_status || "",
      b.transport_status || "",
      b.kill_order_seq ?? "",
      b.fill_rate != null ? b.fill_rate.toFixed(1) : "",
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `muster-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filteredBookings = bookings.filter(booking => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      (booking.species || "").toLowerCase().includes(q) ||
      (booking.supplierName || "").toLowerCase().includes(q) ||
      booking.id.toLowerCase().includes(q) ||
      (booking.lot_id || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    let matchesWeek = true;
    if (weekParam && booking.requested_kill_date) {
      const weekStart = parseISO(weekParam);
      const weekEnd = addDays(weekStart, 6);
      const killDate = parseISO(booking.requested_kill_date);
      matchesWeek = killDate >= weekStart && killDate <= weekEnd;
    }
    return matchesSearch && matchesStatus && matchesWeek;
  });

  // Confidence summary counts
  const confidenceCounts = {
    Confirmed:   bookings.filter(b => (b.status || "").toLowerCase() === "confirmed").length,
    High:        bookings.filter(b => (b.status || "").toLowerCase() === "high").length,
    Medium:      bookings.filter(b => (b.status || "").toLowerCase() === "medium").length,
    Low:         bookings.filter(b => ["low", "pending", "requested"].includes((b.status || "").toLowerCase())).length,
    Placeholder: bookings.filter(b => !b.status || (b.status || "").toLowerCase() === "placeholder").length,
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Booking Board</h1>
            <p className="text-muted-foreground">Manage kill slot bookings — click any row to view or edit</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV} disabled={filteredBookings.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => setIsNewBookingOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          </div>
        </div>

        {/* Week filter banner (when navigated from Forward Plan) */}
        {weekParam && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <span className="text-sm font-semibold text-blue-800">
              Showing bookings for week of {format(parseISO(weekParam), "d MMM yyyy")}
            </span>
            <a href="/bookings" className="ml-auto text-xs font-semibold text-blue-700 underline whitespace-nowrap">
              Clear filter
            </a>
          </div>
        )}

        {/* Supplier booking requests alert */}
        {!loading && bookings.filter(b => b.status === "requested").length > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <Bell className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                {bookings.filter(b => b.status === "requested").length} supplier booking request{bookings.filter(b => b.status === "requested").length !== 1 ? "s" : ""} awaiting approval
              </p>
              <p className="text-xs text-amber-700">Review each request below — approve to confirm the slot or decline to reject it</p>
            </div>
            <button
              onClick={() => setStatusFilter("requested")}
              className="text-xs font-semibold text-amber-700 underline whitespace-nowrap"
            >
              View requests
            </button>
          </div>
        )}

        {/* Confidence summary strip */}
        {!loading && bookings.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Confirmed",   count: confidenceCounts.Confirmed,   colour: "bg-blue-500",    text: "text-blue-700",    bg: "bg-blue-50   border-blue-200",   filter: "confirmed" },
              { label: "High",        count: confidenceCounts.High,        colour: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", filter: "high" },
              { label: "Medium",      count: confidenceCounts.Medium,      colour: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50  border-amber-200",   filter: "medium" },
              { label: "Low",         count: confidenceCounts.Low,         colour: "bg-yellow-400",  text: "text-yellow-700",  bg: "bg-yellow-50 border-yellow-200",  filter: "low" },
              { label: "Placeholder", count: confidenceCounts.Placeholder, colour: "bg-gray-300",    text: "text-gray-600",    bg: "bg-gray-50   border-gray-200",    filter: "placeholder" },
            ].map(({ label, count, colour, text, bg, filter }) => (
              <button
                key={label}
                onClick={() => setStatusFilter(prev => prev === filter ? "all" : filter)}
                className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-all cursor-pointer ${bg} ${statusFilter === filter ? "ring-2 ring-offset-1 ring-current" : ""}`}
              >
                <div className={`w-2.5 h-2.5 rounded-full ${colour}`} />
                <span className={`font-medium ${text}`}>{label}</span>
                <span className={`font-bold ${text}`}>{count}</span>
              </button>
            ))}
            {statusFilter !== "all" && (
              <button className="text-xs text-muted-foreground underline self-center" onClick={() => setStatusFilter("all")}>
                Clear filter
              </button>
            )}
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <Select value={selectedProcessor} onValueChange={setSelectedProcessor}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select processor" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All Processors</SelectItem>
                  {processors.map((processor) => (
                    <SelectItem key={processor} value={processor}>{processor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select plant" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All Plants</SelectItem>
                  {filteredPlants.map((plant: any) => (
                    <SelectItem key={plant.id} value={plant.id}>{plant.plant_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by supplier, species, ID, lot…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Confidence" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="placeholder">Placeholder</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bookings Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {loading ? "Loading bookings…" : `Current Bookings (${filteredBookings.length}${statusFilter !== "all" ? " · filtered" : ""})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="table-header">
                    <th className="text-left py-3 px-3 text-sm font-medium">Booking ID</th>
                    <th className="text-left py-3 px-3 text-sm font-medium">Supplier</th>
                    <th className="text-left py-3 px-3 text-sm font-medium">Species</th>
                    <th className="text-right py-3 px-3 text-sm font-medium">Head</th>
                    <th className="text-left py-3 px-3 text-sm font-medium">Kill Date</th>
                    <th className="text-left py-3 px-3 text-sm font-medium">Slot</th>
                    <th className="text-left py-3 px-3 text-sm font-medium">Status</th>
                    <th className="text-left py-3 px-3 text-sm font-medium">HGP</th>
                    <th className="text-left py-3 px-3 text-sm font-medium">Transport</th>
                    <th className="text-right py-3 px-3 text-sm font-medium">Fill %</th>
                    <th className="py-3 px-3 w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-muted-foreground">Loading bookings…</td>
                    </tr>
                  ) : filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-muted-foreground">No bookings found</td>
                    </tr>
                  ) : (
                    filteredBookings.map((booking) => {
                      const hgp = hgpLabel(booking.hgp_status);
                      const transport = transportLabel(booking.transport_status);
                      return (
                        <tr
                          key={booking.id}
                          onClick={() => openBooking(booking)}
                          className={`table-row-hover border-b border-border transition-colors cursor-pointer hover:bg-muted/40 ${confidenceRowStyle(booking.status)}`}
                        >
                          <td className="py-3 px-3 text-sm font-medium font-mono">{booking.id.slice(-8).toUpperCase()}</td>
                          <td className="py-3 px-3 text-sm max-w-[150px] truncate" title={booking.supplierName}>
                            {booking.supplierName || <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant={getSpeciesVariant(booking.species || "")} className="capitalize">
                              {booking.species || "—"}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-sm text-right table-cell-numeric">
                            {(booking.head_count || 0).toLocaleString() || "—"}
                          </td>
                          <td className="py-3 px-3 text-sm">
                            {booking.requested_kill_date
                              ? format(new Date(booking.requested_kill_date), "EEE d MMM")
                              : "—"}
                          </td>
                          <td className="py-3 px-3 text-sm text-muted-foreground">
                            {booking.arrival_slot || "—"}
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant={getStatusVariant(booking.status || "")}>
                              {booking.status || "—"}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-sm">
                            {hgp ? (
                              <span className={`text-xs font-medium border rounded px-1.5 py-0.5 ${hgp.cls}`}>{hgp.text}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-sm">
                            {transport ? (
                              <span className={`text-xs font-medium border rounded px-1.5 py-0.5 ${transport.cls}`}>{transport.text}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-sm text-right table-cell-numeric">
                            {booking.fill_rate != null ? `${booking.fill_rate.toFixed(1)}%` : "—"}
                          </td>
                          <td className="py-2 px-2">
                            {(booking.status || "").toLowerCase() === "requested" ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={e => approveRequest(e, booking)}
                                  title="Approve request"
                                  className="flex items-center gap-0.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1 hover:bg-emerald-100 transition-colors whitespace-nowrap"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Approve
                                </button>
                                <button
                                  onClick={e => declineRequest(e, booking)}
                                  title="Decline request"
                                  className="flex items-center gap-0.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 hover:bg-red-100 transition-colors whitespace-nowrap"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Decline
                                </button>
                              </div>
                            ) : ["pending", "low"].includes((booking.status || "").toLowerCase()) ? (
                              <button
                                onClick={e => quickConfirm(e, booking)}
                                className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1 hover:bg-blue-100 transition-colors whitespace-nowrap"
                              >
                                ✓ Confirm
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Calendar View */}
        <BookingCalendar />

        {/* New Booking Form */}
        <NewBookingForm
          open={isNewBookingOpen}
          onOpenChange={setIsNewBookingOpen}
          onBookingCreated={fetchBookings}
        />

        {/* Booking Detail / Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={open => { if (!open) closeDialog(); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between pr-6">
                <span>
                  Booking{" "}
                  <span className="font-mono text-sm text-muted-foreground ml-1">
                    {selectedBooking?.id.slice(-8).toUpperCase()}
                  </span>
                </span>
                {!editMode && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditMode(true)}
                    className="ml-4"
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>

            {selectedBooking && !editMode && (
              <div className="space-y-5">
                {/* Booking overview */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Supplier</p>
                    <p className="font-medium">{selectedBooking.supplierName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Species</p>
                    <Badge variant={getSpeciesVariant(selectedBooking.species || "")} className="capitalize">
                      {selectedBooking.species || "—"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Head Count</p>
                    <p className="font-medium">{selectedBooking.head_count?.toLocaleString() || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Kill Date</p>
                    <p className="font-medium">
                      {selectedBooking.requested_kill_date
                        ? format(new Date(selectedBooking.requested_kill_date), "EEE d MMM yyyy")
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Arrival Slot</p>
                    <p>{selectedBooking.arrival_slot || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Kill Order</p>
                    <p>{selectedBooking.kill_order_seq != null ? `#${selectedBooking.kill_order_seq}` : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Status</p>
                    <Badge variant={getStatusVariant(selectedBooking.status || "")}>
                      {selectedBooking.status || "—"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Fill Rate</p>
                    <p>{selectedBooking.fill_rate != null ? `${selectedBooking.fill_rate.toFixed(1)}%` : "—"}</p>
                  </div>
                </div>

                {/* Compliance fields */}
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Compliance</p>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">HGP Status</p>
                      {hgpLabel(selectedBooking.hgp_status) ? (
                        <span className={`text-xs font-medium border rounded px-1.5 py-0.5 ${hgpLabel(selectedBooking.hgp_status)!.cls}`}>
                          {hgpLabel(selectedBooking.hgp_status)!.text}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Mulesing</p>
                      <p className="capitalize">{selectedBooking.mulesing_status?.replace(/_/g, " ") || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">MSA Enrolled</p>
                      <p>{selectedBooking.msa_enrolled === true ? "Yes" : selectedBooking.msa_enrolled === false ? "No" : "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Logistics */}
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Logistics</p>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Transport</p>
                      {transportLabel(selectedBooking.transport_status) ? (
                        <span className={`text-xs font-medium border rounded px-1.5 py-0.5 ${transportLabel(selectedBooking.transport_status)!.cls}`}>
                          {transportLabel(selectedBooking.transport_status)!.text}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Lot ID</p>
                      <p className="font-mono text-xs">{selectedBooking.lot_id || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Agent Ref / eNVD</p>
                      <p className="font-mono text-xs">{selectedBooking.agent_ref || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Change history link hint */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground border-t pt-3">
                  <History className="h-3.5 w-3.5" />
                  Full audit trail available in Change History
                </div>
              </div>
            )}

            {selectedBooking && editMode && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Status / Confidence</Label>
                    <Select value={editFields.status} onValueChange={v => setEditFields(p => ({ ...p, status: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="placeholder">Placeholder</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Head Count</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editFields.head_count}
                      onChange={e => setEditFields(p => ({ ...p, head_count: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Arrival Slot</Label>
                    <Select value={editFields.arrival_slot} onValueChange={v => setEditFields(p => ({ ...p, arrival_slot: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select slot" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50 max-h-48 overflow-y-auto">
                        <SelectItem value="">No slot</SelectItem>
                        {ARRIVAL_SLOTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Kill Order Seq</Label>
                    <Input
                      type="number"
                      min={1}
                      value={editFields.kill_order_seq}
                      onChange={e => setEditFields(p => ({ ...p, kill_order_seq: e.target.value }))}
                      placeholder="e.g. 1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>HGP Status</Label>
                    <Select value={editFields.hgp_status} onValueChange={v => setEditFields(p => ({ ...p, hgp_status: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select HGP status" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="">Not set</SelectItem>
                        <SelectItem value="nil">No HGP</SelectItem>
                        <SelectItem value="implanted">HGP — W/D complete</SelectItem>
                        <SelectItem value="under_withholding">HGP — in W/D period</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Transport Status</Label>
                    <Select value={editFields.transport_status} onValueChange={v => setEditFields(p => ({ ...p, transport_status: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select transport status" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="arranged">Arranged</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="arrived">Arrived</SelectItem>
                        <SelectItem value="not_required">Not Required</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Change note <span className="font-normal text-muted-foreground">(optional — added to audit trail)</span></Label>
                  <Textarea
                    value={editFields.change_note}
                    onChange={e => setEditFields(p => ({ ...p, change_note: e.target.value }))}
                    placeholder="Reason for change, e.g. 'Supplier requested additional 20 head'"
                    className="min-h-[72px]"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="flex gap-2 justify-end pt-2">
              {editMode ? (
                <>
                  <Button variant="outline" onClick={() => setEditMode(false)} disabled={saving}>
                    <X className="h-4 w-4 mr-1.5" />
                    Cancel
                  </Button>
                  <Button onClick={saveEdit} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1.5" />
                        Save changes
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={closeDialog}>Close</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
