import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, parseISO, startOfToday } from "date-fns";
import {
  CalendarDays, Plus, CheckCircle, Clock, AlertTriangle,
  Truck, Package, ChevronRight, LogOut,
} from "lucide-react";

type SlotDay = {
  date: string;        // yyyy-MM-dd
  label: string;       // "Mon 12 May"
  totalBooked: number;
  capacity: number;
  available: number;
  status: "open" | "filling" | "full";
};

type MyBooking = {
  id: string;
  requested_kill_date: string | null;
  species: string | null;
  head_count: number | null;
  status: string | null;
  lot_id: string | null;
  notes: string | null;
  created_at: string;
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  requested:   { label: "Awaiting approval", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  confirmed:   { label: "Confirmed",         cls: "bg-blue-100 text-blue-800 border-blue-200" },
  pending:     { label: "Pending",           cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  high:        { label: "High confidence",   cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  cancelled:   { label: "Cancelled",         cls: "bg-red-100 text-red-800 border-red-200" },
};

const SPECIES_OPTIONS = ["cattle", "lamb", "sheep", "goat"];

export default function BuyerPortal() {
  const { profile, signOut }  = useAuth();
  const { toast }             = useToast();

  const [slots, setSlots]           = useState<SlotDay[]>([]);
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [loadingSlots, setLoadingSlots]       = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // New booking form state
  const [species, setSpecies]       = useState("cattle");
  const [headCount, setHeadCount]   = useState("");
  const [picNumber, setPicNumber]   = useState("");
  const [hgpStatus, setHgpStatus]   = useState("nil");
  const [notes, setNotes]           = useState("");

  // ── Fetch slot availability for next 14 days ──
  const fetchSlots = async () => {
    setLoadingSlots(true);
    const today    = startOfToday();
    const dates    = Array.from({ length: 14 }, (_, i) =>
      format(addDays(today, i + 1), "yyyy-MM-dd")
    );

    // Get all bookings in that range
    const { data: bookings } = await supabase
      .from("bookings")
      .select("requested_kill_date, head_count, status")
      .in("requested_kill_date", dates)
      .neq("status", "cancelled");

    // Get plant capacity (use first plant as default capacity reference)
    const { data: plants } = await supabase
      .from("plants")
      .select("daily_capacity")
      .limit(1);
    const cap = (plants as any[])?.[0]?.daily_capacity ?? 500;

    const bkList = (bookings as any[]) ?? [];

    const slotDays: SlotDay[] = dates.map(date => {
      const dayBks  = bkList.filter((b: any) => b.requested_kill_date === date);
      const booked  = dayBks.reduce((s: number, b: any) => s + (b.head_count || 0), 0);
      const avail   = Math.max(0, cap - booked);
      const pct     = cap > 0 ? booked / cap : 0;
      return {
        date,
        label:       format(parseISO(date), "EEE d MMM"),
        totalBooked: booked,
        capacity:    cap,
        available:   avail,
        status:      pct >= 1 ? "full" : pct >= 0.8 ? "filling" : "open",
      };
    });

    setSlots(slotDays);
    setLoadingSlots(false);
  };

  // ── Fetch this buyer's own bookings ──
  const fetchMyBookings = async () => {
    if (!profile) return;
    setLoadingBookings(true);
    // Bookings created by this user — match on submitted_by (buyer's display name or id)
    const { data } = await supabase
      .from("bookings")
      .select("id, requested_kill_date, species, head_count, status, lot_id, notes, created_at")
      .eq("submitted_by", profile.id)
      .order("requested_kill_date", { ascending: true });
    setMyBookings((data as MyBooking[]) ?? []);
    setLoadingBookings(false);
  };

  useEffect(() => { fetchSlots(); }, []);
  useEffect(() => { fetchMyBookings(); }, [profile]);

  const openBookingDialog = (date: string) => {
    setSelectedDate(date);
    setSpecies("cattle");
    setHeadCount("");
    setPicNumber("");
    setHgpStatus("nil");
    setNotes("");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headCount || parseInt(headCount) < 1) {
      toast({ title: "Head count required", variant: "destructive" });
      return;
    }
    if (!picNumber.trim()) {
      toast({ title: "PIC number required", description: "Required for NLIS compliance", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const { error } = await supabase.from("bookings").insert({
      requested_kill_date: selectedDate,
      species,
      head_count:  parseInt(headCount),
      hgp_status:  hgpStatus,
      notes:       notes || null,
      status:      "requested",
      submitted_by: profile?.id ?? null,
      supplier_name: profile?.display_name ?? null,
    });

    if (error) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Booking request submitted",
        description: `${headCount} head ${species} for ${format(parseISO(selectedDate), "d MMM yyyy")} — awaiting approval`,
      });
      setDialogOpen(false);
      fetchMyBookings();
      fetchSlots();
    }
    setSubmitting(false);
  };

  const slotStatusMeta = {
    open:    { cls: "bg-emerald-50 border-emerald-200", badge: "bg-emerald-100 text-emerald-800", label: "Open" },
    filling: { cls: "bg-amber-50 border-amber-200",    badge: "bg-amber-100 text-amber-800",    label: "Filling fast" },
    full:    { cls: "bg-red-50 border-red-200",        badge: "bg-red-100 text-red-800",        label: "Full" },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Buyer Portal</h1>
            <p className="text-muted-foreground mt-1">
              {profile?.display_name ? `Welcome, ${profile.display_name}` : "Field buyer view"} — check slot availability and lodge bookings
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut} className="shrink-0">
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>

        {/* Slot availability grid */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Slot Availability — Next 14 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSlots ? (
              <p className="text-sm text-muted-foreground animate-pulse">Loading availability…</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {slots.map(slot => {
                  const meta = slotStatusMeta[slot.status];
                  const pct  = slot.capacity > 0
                    ? Math.round((slot.totalBooked / slot.capacity) * 100)
                    : 0;
                  return (
                    <button
                      key={slot.date}
                      disabled={slot.status === "full"}
                      onClick={() => openBookingDialog(slot.date)}
                      className={`
                        rounded-lg border p-3 text-left space-y-1.5 transition-all
                        ${meta.cls}
                        ${slot.status !== "full"
                          ? "hover:shadow-md hover:scale-[1.02] cursor-pointer"
                          : "opacity-60 cursor-not-allowed"}
                      `}
                    >
                      <p className="text-xs font-semibold text-foreground">{slot.label}</p>
                      <div className="w-full bg-white/60 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            slot.status === "full" ? "bg-red-400" :
                            slot.status === "filling" ? "bg-amber-400" : "bg-emerald-400"
                          }`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium rounded px-1.5 py-0.5 ${meta.badge}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {slot.available.toLocaleString()} head free
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-3">
              Click an open date to lodge a booking request. Ops team will confirm within 24 hours.
            </p>
          </CardContent>
        </Card>

        {/* My bookings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              My Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingBookings ? (
              <p className="text-sm text-muted-foreground animate-pulse">Loading your bookings…</p>
            ) : myBookings.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <CalendarDays className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">No bookings yet — click a date above to get started.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myBookings.map(b => {
                  const meta = STATUS_META[b.status ?? ""] ?? { label: b.status ?? "Unknown", cls: "bg-muted text-muted-foreground border-border" };
                  return (
                    <div
                      key={b.id}
                      className="flex items-center gap-3 rounded-lg border px-4 py-3 bg-muted/20"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold capitalize">
                            {(b.head_count ?? 0).toLocaleString()} head {b.species}
                          </p>
                          <span className={`text-xs font-medium rounded-full border px-2 py-0.5 ${meta.cls}`}>
                            {meta.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Kill date:{" "}
                          {b.requested_kill_date
                            ? format(parseISO(b.requested_kill_date), "EEE d MMM yyyy")
                            : "—"}
                          {b.lot_id ? ` · Lot ${b.lot_id}` : ""}
                        </p>
                        {b.notes && (
                          <p className="text-xs text-muted-foreground truncate">{b.notes}</p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {b.status === "confirmed" ? (
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                        ) : b.status === "requested" ? (
                          <Clock className="h-5 w-5 text-amber-500" />
                        ) : b.status === "cancelled" ? (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* What happens next info box */}
        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <Truck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-blue-800">What happens after you submit?</p>
                <ol className="text-xs text-blue-700 space-y-0.5 list-decimal list-inside">
                  <li>Kill floor ops reviews your request (usually within a business day)</li>
                  <li>You'll receive email confirmation once approved</li>
                  <li>Arrange transport to arrive in the confirmed time slot</li>
                  <li>Animals are logged in on arrival by the intake team</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New booking dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Book a kill slot
              {selectedDate && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  — {format(parseISO(selectedDate), "EEE d MMM yyyy")}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Species *</Label>
                <Select value={species} onValueChange={setSpecies}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIES_OPTIONS.map(s => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="headCount">Head count *</Label>
                <Input
                  id="headCount"
                  type="number"
                  min={1}
                  placeholder="e.g. 200"
                  value={headCount}
                  onChange={e => setHeadCount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="picNumber">Supplier PIC number *</Label>
              <Input
                id="picNumber"
                placeholder="e.g. QA123456"
                value={picNumber}
                onChange={e => setPicNumber(e.target.value.toUpperCase())}
                required
              />
              <p className="text-xs text-muted-foreground">Required for NLIS compliance</p>
            </div>

            <div className="space-y-1.5">
              <Label>HGP status *</Label>
              <Select value={hgpStatus} onValueChange={setHgpStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nil">HGP free</SelectItem>
                  <SelectItem value="implanted">HGP implanted</SelectItem>
                  <SelectItem value="under_withholding">Under withholding period</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="e.g. Mixed age, some dry cows, delivering from Dalby"
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit booking request"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
