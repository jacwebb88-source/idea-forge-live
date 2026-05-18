import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, parseISO, startOfToday, isToday } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  CalendarDays, Plus, CheckCircle, Clock, AlertTriangle, XCircle,
  Truck, Package, ChevronRight, LogOut, ClipboardCheck, BarChart2,
  Leaf, ShieldAlert, FileText, Layers, Scale, ArrowRight, Info,
  Square, MessageSquare, Send, DollarSign, User, Building2,
  CheckSquare, TrendingUp,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type SlotDay = {
  date: string; label: string; totalBooked: number;
  capacity: number; available: number; status: "open" | "filling" | "full";
};

type Dispatch = {
  id: string;
  requested_kill_date: string | null;
  species: string;
  head_count: number | null;
  status: string | null;
  lot_id: string | null;
  hgp_status: string | null;
  est_avg_hscw: number | null;
  est_avg_live_wt: number | null;
  agent_ref: string | null;
  created_at: string;
  truck_departed_at: string | null;
  estimated_arrival: string | null;
  nvd_received: boolean | null;
};

type GridSpec = {
  id: string;
  species: string;
  min_hscw: number;
  max_hscw: number;
  fat_code: string;
  dentition_or_age: string | null;
  base_price_per_kg: number | null;
  effective_from: string;
  effective_to: string;
  notes: string | null;
};

type DispatchMessage = {
  id: string;
  booking_id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  created_at: string;
  read_by_supplier: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SPECIES_OPTIONS = [
  { value: "cattle", label: "Cattle" },
  { value: "lamb",   label: "Lamb" },
  { value: "sheep",  label: "Sheep" },
  { value: "goat",   label: "Goat" },
];
const HGP_OPTIONS = [
  { value: "nil",               label: "HGP free" },
  { value: "implanted",         label: "HGP implanted" },
  { value: "under_withholding", label: "Under withholding period" },
];
const MULESING_OPTIONS = [
  { value: "nm", label: "Not mulesed (NM)" },
  { value: "m",  label: "Mulesed (M)" },
  { value: "np", label: "NLIS progeny (NP)" },
];
const FAT_OPTIONS = [
  { value: "1", label: "1 — 0–5 mm (very lean)" },
  { value: "2", label: "2 — 5–10 mm (ideal)" },
  { value: "3", label: "3 — 10–15 mm (moderate)" },
  { value: "4", label: "4 — 15–20 mm (excess fat)" },
  { value: "5", label: "5 — >20 mm (heavy cover)" },
];

const STATUS_META: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  requested: { label: "Awaiting approval", cls: "bg-amber-100 text-amber-800 border-amber-200",    icon: Clock },
  confirmed: { label: "Confirmed",         cls: "bg-blue-100 text-blue-800 border-blue-200",       icon: CheckCircle },
  pending:   { label: "Pending",           cls: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  high:      { label: "Confirmed",         cls: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle },
  medium:    { label: "Tentative",         cls: "bg-sky-100 text-sky-800 border-sky-200",          icon: Clock },
  low:       { label: "Pencilled",         cls: "bg-slate-100 text-slate-700 border-slate-200",    icon: Clock },
  cancelled: { label: "Cancelled",         cls: "bg-red-100 text-red-800 border-red-200",          icon: XCircle },
};
const SLOT_STYLE = {
  open:    { card: "bg-emerald-50 border-emerald-200 hover:shadow-md hover:scale-[1.02]", badge: "bg-emerald-100 text-emerald-800", bar: "bg-emerald-400", label: "Open" },
  filling: { card: "bg-amber-50 border-amber-200 hover:shadow-md hover:scale-[1.02]",    badge: "bg-amber-100 text-amber-800",    bar: "bg-amber-400",   label: "Filling" },
  full:    { card: "bg-red-50 border-red-200 opacity-60 cursor-not-allowed",              badge: "bg-red-100 text-red-800",        bar: "bg-red-400",     label: "Full" },
};

// ─── Compliance row ───────────────────────────────────────────────────────────

function ComplianceRow({ checked, label, detail, warning, onClick }: {
  checked: boolean; label: string; detail: string; warning?: boolean; onClick?: () => void;
}) {
  return (
    <button className="w-full text-left" onClick={onClick}>
      <div className={`flex items-start gap-3 rounded-lg border p-3 ${
        warning ? "bg-amber-50 border-amber-200" :
        checked  ? "bg-emerald-50 border-emerald-200" : "bg-muted/30 border-border"
      }`}>
        {warning ? <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" /> :
         checked  ? <CheckSquare  className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> :
                    <Square       className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
        <div>
          <p className={`text-sm font-medium ${warning ? "text-amber-800" : checked ? "text-emerald-800" : "text-foreground"}`}>{label}</p>
          <p className={`text-xs mt-0.5 ${warning ? "text-amber-700" : "text-muted-foreground"}`}>{detail}</p>
        </div>
      </div>
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SupplierPortal() {
  const { profile, signOut } = useAuth();
  const { toast: showToast } = useToast();

  // Core data
  const [slots,      setSlots]      = useState<SlotDay[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [gridSpecs,  setGridSpecs]  = useState<GridSpec[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loadingSlots,     setLoadingSlots]     = useState(true);
  const [loadingDispatches,setLoadingDispatches]= useState(true);

  // New dispatch dialog
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [species,          setSpecies]          = useState("cattle");
  const [headCount,        setHeadCount]        = useState("");
  const [picNumber,        setPicNumber]        = useState("");
  const [hgpStatus,        setHgpStatus]        = useState("nil");
  const [mulesingStatus,   setMulesingStatus]   = useState("nm");
  const [nvdNumber,        setNvdNumber]        = useState("");
  const [carrierName,      setCarrierName]      = useState("");
  const [vehicleRego,      setVehicleRego]      = useState("");
  const [estimatedLiveWt,  setEstimatedLiveWt]  = useState("");
  const [lotRef,           setLotRef]           = useState("");
  const [dispatchNotes,    setDispatchNotes]    = useState("");

  // Truck departed dialog
  const [truckOpen,          setTruckOpen]          = useState(false);
  const [truckDispatch,      setTruckDispatch]      = useState<Dispatch | null>(null);
  const [etaInput,           setEtaInput]           = useState("");
  const [submittingTruck,    setSubmittingTruck]    = useState(false);

  // Messages dialog
  const [msgOpen,       setMsgOpen]       = useState(false);
  const [msgDispatch,   setMsgDispatch]   = useState<Dispatch | null>(null);
  const [messages,      setMessages]      = useState<DispatchMessage[]>([]);
  const [msgText,       setMsgText]       = useState("");
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);
  const [sendingMsg,    setSendingMsg]    = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  // Grid & price calculator
  const [gridSpecies,   setGridSpecies]   = useState("cattle");
  const [calcHscw,      setCalcHscw]      = useState("");
  const [calcFat,       setCalcFat]       = useState("2");
  const [calcResult,    setCalcResult]    = useState<{ pricePerKg: number; pricePerHead: number; row: GridSpec } | null>(null);

  // Compliance checklist
  const [nvdSigned,         setNvdSigned]         = useState(false);
  const [nlisTransferred,   setNlisTransferred]   = useState(false);
  const [withholdingClear,  setWithholdingClear]  = useState(false);
  const [animalsFasted,     setAnimalsFasted]     = useState(false);

  // My property
  const [propName,      setPropName]      = useState("");
  const [propPic,       setPropPic]       = useState("");
  const [propAbn,       setPropAbn]       = useState("");
  const [savingProp,    setSavingProp]    = useState(false);
  const [propLoaded,    setPropLoaded]    = useState(false);

  // ── Fetch slots ──────────────────────────────────────────────────────────
  const fetchSlots = async () => {
    setLoadingSlots(true);
    const today = startOfToday();
    const dates = Array.from({ length: 14 }, (_, i) => format(addDays(today, i + 1), "yyyy-MM-dd"));
    const { data: bk } = await supabase.from("bookings")
      .select("requested_kill_date, head_count, status")
      .in("requested_kill_date", dates).neq("status", "cancelled");
    const { data: pl } = await supabase.from("plants").select("daily_capacity").limit(1);
    const cap = (pl as any[])?.[0]?.daily_capacity ?? 500;
    const bkList = (bk as any[]) ?? [];
    setSlots(dates.map(date => {
      const booked = bkList.filter((b: any) => b.requested_kill_date === date)
        .reduce((s: number, b: any) => s + (b.head_count || 0), 0);
      const avail = Math.max(0, cap - booked);
      const pct   = cap > 0 ? booked / cap : 0;
      return { date, label: format(parseISO(date), "EEE d MMM"), totalBooked: booked, capacity: cap, available: avail,
        status: pct >= 1 ? "full" : pct >= 0.75 ? "filling" : "open" };
    }));
    setLoadingSlots(false);
  };

  // ── Fetch dispatches + unread counts ─────────────────────────────────────
  const fetchDispatches = async () => {
    setLoadingDispatches(true);
    const { data } = await supabase.from("bookings")
      .select("id,requested_kill_date,species,head_count,status,lot_id,hgp_status,est_avg_hscw,est_avg_live_wt,agent_ref,created_at,truck_departed_at,estimated_arrival,nvd_received")
      .order("requested_kill_date", { ascending: false }).limit(50);
    const list = (data as Dispatch[]) ?? [];
    setDispatches(list);
    if (list.length > 0) {
      const ids = list.map(d => d.id);
      const { data: msgs } = await supabase.from("dispatch_messages")
        .select("booking_id, read_by_supplier, sender_role")
        .in("booking_id", ids);
      const counts: Record<string, number> = {};
      (msgs ?? []).forEach((m: any) => {
        if (!m.read_by_supplier && m.sender_role === "ops") {
          counts[m.booking_id] = (counts[m.booking_id] ?? 0) + 1;
        }
      });
      setUnreadCounts(counts);
    }
    setLoadingDispatches(false);
  };

  // ── Fetch grid specs ──────────────────────────────────────────────────────
  const fetchGridSpecs = async () => {
    const { data } = await supabase.from("gridspecs")
      .select("id,species,min_hscw,max_hscw,fat_code,dentition_or_age,base_price_per_kg,effective_from,effective_to,notes")
      .order("species").order("min_hscw");
    setGridSpecs((data as GridSpec[]) ?? []);
  };

  // ── Fetch property profile ────────────────────────────────────────────────
  const fetchProperty = async () => {
    if (!profile) return;
    const { data } = await supabase.from("user_profiles")
      .select("supplier_property_name, supplier_pic, supplier_abn")
      .eq("id", profile.id).single();
    if (data) {
      setPropName((data as any).supplier_property_name ?? "");
      setPropPic((data as any).supplier_pic ?? "");
      setPropAbn((data as any).supplier_abn ?? "");
    }
    setPropLoaded(true);
  };

  useEffect(() => { fetchSlots(); fetchGridSpecs(); }, []);
  useEffect(() => { fetchDispatches(); }, [profile]);
  useEffect(() => { fetchProperty(); }, [profile]);

  // ── Open messages dialog ──────────────────────────────────────────────────
  const openMessages = async (d: Dispatch) => {
    setMsgDispatch(d);
    setMsgOpen(true);
    setMsgText("");
    setLoadingMsgs(true);
    const { data } = await supabase.from("dispatch_messages")
      .select("*").eq("booking_id", d.id).order("created_at");
    setMessages((data as DispatchMessage[]) ?? []);
    setLoadingMsgs(false);
    // Mark all ops messages as read
    await supabase.from("dispatch_messages")
      .update({ read_by_supplier: true })
      .eq("booking_id", d.id).eq("sender_role", "ops");
    setUnreadCounts(prev => ({ ...prev, [d.id]: 0 }));
    setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const sendMessage = async () => {
    if (!msgText.trim() || !msgDispatch) return;
    setSendingMsg(true);
    const { data: newMsg, error } = await supabase.from("dispatch_messages").insert({
      booking_id:  msgDispatch.id,
      sender_name: profile?.display_name ?? "Supplier",
      sender_role: "supplier",
      message:     msgText.trim(),
      read_by_ops: false,
    }).select().single();
    if (!error && newMsg) {
      setMessages(prev => [...prev, newMsg as DispatchMessage]);
      setMsgText("");
      setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
    setSendingMsg(false);
  };

  // ── Truck departed ────────────────────────────────────────────────────────
  const openTruckDialog = (d: Dispatch) => {
    setTruckDispatch(d);
    setEtaInput("");
    setTruckOpen(true);
  };

  const submitTruck = async () => {
    if (!truckDispatch) return;
    setSubmittingTruck(true);
    const now = new Date().toISOString();
    const arrivalDate = truckDispatch.requested_kill_date
      ? `${truckDispatch.requested_kill_date}T${etaInput || "07:00"}:00+10:00`
      : null;
    const { error } = await supabase.from("bookings")
      .update({ truck_departed_at: now, estimated_arrival: arrivalDate })
      .eq("id", truckDispatch.id);
    if (!error) {
      showToast({ title: "Truck status updated", description: "Intake team can now see your ETA." });
      setTruckOpen(false);
      fetchDispatches();
    }
    setSubmittingTruck(false);
  };

  // ── Price calculator ──────────────────────────────────────────────────────
  const runCalculator = () => {
    const hscw = parseFloat(calcHscw);
    if (!hscw || hscw < 1) return;
    const match = gridSpecs.find(g =>
      g.species === gridSpecies &&
      g.fat_code === calcFat &&
      hscw >= g.min_hscw &&
      hscw <= g.max_hscw
    );
    if (match && match.base_price_per_kg) {
      setCalcResult({ pricePerKg: match.base_price_per_kg, pricePerHead: Math.round(match.base_price_per_kg * hscw), row: match });
    } else {
      setCalcResult(null);
      showToast({ title: "No matching grid row", description: "HSCW may be outside grid range for that fat code and species.", variant: "destructive" });
    }
  };

  // ── New dispatch submit ───────────────────────────────────────────────────
  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!headCount || parseInt(headCount) < 1) { showToast({ title: "Head count required", variant: "destructive" }); return; }
    if (!picNumber.trim()) { showToast({ title: "PIC required", variant: "destructive" }); return; }
    setSubmitting(true);
    const agentRefStr = [picNumber.trim(), nvdNumber.trim() ? `NVD:${nvdNumber.trim()}` : null, carrierName.trim() || null].filter(Boolean).join(" | ");
    const { error } = await supabase.from("bookings").insert({
      requested_kill_date: selectedDate,
      species,
      head_count:      parseInt(headCount),
      hgp_status:      hgpStatus,
      mulesing_status: (species === "sheep" || species === "lamb") ? mulesingStatus : null,
      est_avg_live_wt: estimatedLiveWt ? parseFloat(estimatedLiveWt) : null,
      lot_id:          lotRef.trim() || null,
      agent_ref:       agentRefStr || null,
      notes:           [dispatchNotes, vehicleRego ? `Vehicle: ${vehicleRego}` : null].filter(Boolean).join(" | ") || null,
      status:          "requested",
      transport_status: carrierName.trim() ? "booked" : "pending",
    });
    if (error) {
      showToast({ title: "Submission failed", description: error.message, variant: "destructive" });
    } else {
      showToast({ title: "Pre-advice sent", description: `${headCount} head ${species} for ${format(parseISO(selectedDate), "d MMM")} — awaiting confirmation.` });
      setDispatchOpen(false);
      fetchDispatches(); fetchSlots();
    }
    setSubmitting(false);
  };

  // ── Save property profile ─────────────────────────────────────────────────
  const saveProperty = async () => {
    if (!profile) return;
    setSavingProp(true);
    const { error } = await supabase.from("user_profiles")
      .update({ supplier_property_name: propName || null, supplier_pic: propPic || null, supplier_abn: propAbn || null })
      .eq("id", profile.id);
    if (!error) showToast({ title: "Property details saved" });
    setSavingProp(false);
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const killResults = dispatches.filter(d => d.est_avg_hscw && ["high","confirmed","killed"].includes(d.status ?? ""));
  const chartData   = [...killResults].reverse().map(d => ({
    date:     d.requested_kill_date ? format(parseISO(d.requested_kill_date), "d MMM") : "—",
    hscw:     d.est_avg_hscw,
    dressing: d.est_avg_live_wt && d.est_avg_hscw ? parseFloat(((d.est_avg_hscw / d.est_avg_live_wt) * 100).toFixed(1)) : null,
  }));
  const filteredGrid = gridSpecs.filter(g => g.species === gridSpecies);
  const totalUnread  = Object.values(unreadCounts).reduce((s, n) => s + n, 0);
  const complianceScore = [nvdSigned, nlisTransferred, withholdingClear, animalsFasted].filter(Boolean).length;

  const openDispatchDialog = (date: string) => {
    setSelectedDate(date); setSpecies("cattle"); setHeadCount(""); setPicNumber("");
    setHgpStatus("nil"); setMulesingStatus("nm"); setNvdNumber(""); setCarrierName("");
    setVehicleRego(""); setEstimatedLiveWt(""); setLotRef(""); setDispatchNotes("");
    // Pre-fill PIC from saved property
    if (propPic) setPicNumber(propPic);
    setDispatchOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center">
                <Leaf className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Muster Supplier</h1>
              {totalUnread > 0 && (
                <Badge className="bg-red-500 text-white text-xs">{totalUnread} new</Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {profile?.display_name ? `Welcome back, ${profile.display_name}` : "Supplier portal"}
              {(propPic || (profile as any)?.supplier_pic) && (
                <span className="ml-2 text-xs text-muted-foreground/70">· PIC: {propPic || (profile as any)?.supplier_pic}</span>
              )}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut} className="shrink-0">
            <LogOut className="h-4 w-4 mr-2" />Sign out
          </Button>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Pending dispatches", value: dispatches.filter(d => ["requested","pending","medium"].includes(d.status ?? "")).length, icon: Clock, cls: "text-amber-600" },
            { label: "Confirmed kills", value: dispatches.filter(d => ["confirmed","high"].includes(d.status ?? "")).length, icon: CheckCircle, cls: "text-emerald-600" },
            { label: "Head this month", value: dispatches.filter(d => d.requested_kill_date?.startsWith(format(new Date(),"yyyy-MM"))).reduce((s,d) => s+(d.head_count??0),0).toLocaleString(), icon: Package, cls: "text-blue-600" },
            { label: "Unread messages", value: totalUnread, icon: MessageSquare, cls: totalUnread > 0 ? "text-red-500" : "text-muted-foreground" },
          ].map(stat => (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className={`h-4 w-4 ${stat.cls}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dispatch" className="space-y-4">
          <TabsList className="flex w-full max-w-2xl h-auto flex-wrap gap-1">
            <TabsTrigger value="dispatch"   className="flex items-center gap-1.5"><Truck           className="h-3.5 w-3.5" /><span className="hidden sm:inline">Dispatch</span></TabsTrigger>
            <TabsTrigger value="lots"       className="flex items-center gap-1.5"><Layers          className="h-3.5 w-3.5" /><span className="hidden sm:inline">My Lots</span></TabsTrigger>
            <TabsTrigger value="grid"       className="flex items-center gap-1.5"><DollarSign      className="h-3.5 w-3.5" /><span className="hidden sm:inline">Grid & Prices</span></TabsTrigger>
            <TabsTrigger value="compliance" className="flex items-center gap-1.5"><ClipboardCheck  className="h-3.5 w-3.5" /><span className="hidden sm:inline">Compliance</span></TabsTrigger>
            <TabsTrigger value="results"    className="flex items-center gap-1.5"><BarChart2       className="h-3.5 w-3.5" /><span className="hidden sm:inline">Kill Results</span></TabsTrigger>
            <TabsTrigger value="property"   className="flex items-center gap-1.5"><Building2      className="h-3.5 w-3.5" /><span className="hidden sm:inline">My Property</span></TabsTrigger>
          </TabsList>

          {/* ── DISPATCH ──────────────────────────────────────────────────── */}
          <TabsContent value="dispatch" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Kill Slot Availability — Next 14 Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingSlots ? (
                  <p className="text-sm text-muted-foreground animate-pulse">Checking availability…</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                    {slots.map(slot => {
                      const style = SLOT_STYLE[slot.status];
                      const pct   = slot.capacity > 0 ? Math.round((slot.totalBooked / slot.capacity) * 100) : 0;
                      return (
                        <button key={slot.date} disabled={slot.status === "full"}
                          onClick={() => openDispatchDialog(slot.date)}
                          className={`rounded-lg border p-3 text-left space-y-1.5 transition-all ${style.card}`}>
                          <p className="text-xs font-semibold text-foreground">{slot.label}</p>
                          <div className="w-full bg-white/60 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${style.bar}`} style={{ width: `${Math.min(pct,100)}%` }} />
                          </div>
                          <span className={`text-xs font-medium rounded px-1.5 py-0.5 ${style.badge}`}>{style.label}</span>
                          <p className="text-xs text-muted-foreground">{slot.available.toLocaleString()} head free</p>
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                  <Info className="h-3 w-3" /> Click an open date to lodge a dispatch pre-advice.
                </p>
              </CardContent>
            </Card>

            {/* Dispatch list */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />My Dispatches
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDispatches ? (
                  <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
                ) : dispatches.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <Truck className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">No dispatches yet — click a date above.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dispatches.slice(0,15).map(d => {
                      const meta     = STATUS_META[d.status ?? ""] ?? { label: d.status ?? "—", cls: "bg-muted text-muted-foreground border-border", icon: ChevronRight };
                      const Icon     = meta.icon;
                      const unread   = unreadCounts[d.id] ?? 0;
                      const departed = !!d.truck_departed_at;
                      const nvdOk    = !!d.nvd_received;
                      const killDate = d.requested_kill_date;
                      const isKillDay= killDate ? isToday(parseISO(killDate)) : false;
                      return (
                        <div key={d.id} className={`rounded-lg border px-4 py-3 bg-card ${isKillDay ? "border-emerald-300 bg-emerald-50/30" : ""}`}>
                          <div className="flex items-start gap-3">
                            <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${
                              ["confirmed","high"].includes(d.status ?? "") ? "text-emerald-500" :
                              ["requested","pending"].includes(d.status ?? "") ? "text-amber-500" :
                              d.status === "cancelled" ? "text-red-500" : "text-muted-foreground"
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold capitalize">
                                  {(d.head_count ?? 0).toLocaleString()} head {d.species}
                                </p>
                                <span className={`text-xs font-medium rounded-full border px-2 py-0.5 ${meta.cls}`}>{meta.label}</span>
                                {d.lot_id && <span className="text-xs bg-slate-100 text-slate-700 rounded px-1.5 py-0.5">Lot {d.lot_id}</span>}
                                {isKillDay && <span className="text-xs bg-emerald-100 text-emerald-700 rounded px-1.5 py-0.5 font-semibold">Kill day</span>}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {killDate ? format(parseISO(killDate), "EEE d MMM yyyy") : "—"}
                                {d.hgp_status && d.hgp_status !== "nil" ? ` · HGP: ${d.hgp_status}` : " · HGP free"}
                                {d.est_avg_live_wt ? ` · ~${d.est_avg_live_wt} kg LW` : ""}
                              </p>
                              {/* Status badges */}
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {/* NVD status */}
                                <span className={`text-xs rounded px-1.5 py-0.5 ${nvdOk ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                                  {nvdOk ? "✓ NVD received" : "⏳ NVD pending"}
                                </span>
                                {/* Truck status */}
                                {departed ? (
                                  <span className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">
                                    🚛 Departed {format(parseISO(d.truck_departed_at!), "h:mma")}
                                    {d.estimated_arrival ? ` · ETA ${format(parseISO(d.estimated_arrival), "h:mma")}` : ""}
                                  </span>
                                ) : ["confirmed","high","requested"].includes(d.status ?? "") && killDate && !isToday(parseISO(killDate)) ? null : (
                                  ["confirmed","high"].includes(d.status ?? "") ? (
                                    <button onClick={() => openTruckDialog(d)}
                                      className="text-xs bg-teal-100 text-teal-700 rounded px-1.5 py-0.5 hover:bg-teal-200 transition-colors">
                                      🚛 Log truck departure
                                    </button>
                                  ) : null
                                )}
                              </div>
                            </div>
                            {/* Message button */}
                            <button onClick={() => openMessages(d)}
                              className="relative shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              {unread > 0 && (
                                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                                  {unread}
                                </span>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── MY LOTS ───────────────────────────────────────────────────── */}
          <TabsContent value="lots" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />Lot Summary
                  </CardTitle>
                  <Button size="sm" onClick={() => openDispatchDialog(format(addDays(startOfToday(),7),"yyyy-MM-dd"))}>
                    <Plus className="h-3.5 w-3.5 mr-1" />New dispatch
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(() => {
                  const lotMap: Record<string, Dispatch[]> = {};
                  dispatches.forEach(d => {
                    const key = d.lot_id ?? `ADHOC-${d.id.slice(0,8)}`;
                    if (!lotMap[key]) lotMap[key] = [];
                    lotMap[key].push(d);
                  });
                  const lots = Object.entries(lotMap).sort((a,b) => {
                    const aDate = a[1][0]?.requested_kill_date ?? "";
                    const bDate = b[1][0]?.requested_kill_date ?? "";
                    return bDate.localeCompare(aDate);
                  });
                  if (lots.length === 0) return (
                    <div className="text-center py-10 space-y-3">
                      <Layers className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                      <p className="text-sm text-muted-foreground">Submit a dispatch with a Lot reference to track here.</p>
                    </div>
                  );
                  return (
                    <div className="space-y-3">
                      {lots.map(([lotId, ds]) => {
                        const sorted = [...ds].sort((a,b) => (a.requested_kill_date ?? "").localeCompare(b.requested_kill_date ?? ""));
                        const killDate = sorted[0]?.requested_kill_date ?? "";
                        const totalHead = ds.reduce((s,d) => s+(d.head_count??0),0);
                        const allOk  = ds.every(d => ["confirmed","high"].includes(d.status ?? ""));
                        const anyKilled = ds.every(d => d.est_avg_hscw);
                        const statusCls = anyKilled ? "bg-purple-100 text-purple-800 border-purple-200"
                          : allOk ? "bg-blue-100 text-blue-800 border-blue-200"
                          : "bg-emerald-100 text-emerald-800 border-emerald-200";
                        return (
                          <div key={lotId} className="rounded-lg border bg-card p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-sm">{lotId.startsWith("ADHOC-") ? "Ad-hoc dispatch" : `Lot ${lotId}`}</p>
                                  <span className={`text-xs font-medium rounded-full border px-2 py-0.5 ${statusCls}`}>
                                    {anyKilled ? "Processed" : allOk ? "Confirmed" : "Active"}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                                  {totalHead.toLocaleString()} head {ds[0]?.species}
                                  {killDate ? ` · Kill ${format(parseISO(killDate), "d MMM yyyy")}` : ""}
                                </p>
                              </div>
                              {ds[0]?.est_avg_hscw && (
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-muted-foreground">Avg HSCW</p>
                                  <p className="text-sm font-bold">{ds[0].est_avg_hscw} kg</p>
                                </div>
                              )}
                            </div>
                            <Separator />
                            {ds.map(d => {
                              const m = STATUS_META[d.status ?? ""] ?? { label: d.status ?? "—", cls: "bg-muted text-muted-foreground border-border" };
                              return (
                                <div key={d.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${["confirmed","high"].includes(d.status??"") ? "bg-emerald-500" : d.status==="cancelled" ? "bg-red-400" : "bg-amber-400"}`} />
                                  <span className="flex-1">{(d.head_count??0).toLocaleString()} head {d.species}{d.requested_kill_date ? ` — ${format(parseISO(d.requested_kill_date),"d MMM")}` : ""}</span>
                                  <span className={`rounded-full border px-1.5 py-0 ${m.cls}`}>{m.label}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50/40">
              <CardContent className="pt-4 pb-4">
                <div className="flex gap-3">
                  <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">Feedlot tip — use Lot references</p>
                    <p className="text-xs text-blue-700 mt-0.5">Enter your internal lot/pen number when submitting. All drafts from that lot group here so you can track HSCW, dressing % and status across multiple kill dates.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── GRID & PRICES ─────────────────────────────────────────────── */}
          <TabsContent value="grid" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Kill grid table */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      This Week's Kill Grid
                      {gridSpecs.length > 0 && (
                        <span className="text-xs font-normal text-muted-foreground">
                          Effective {format(parseISO(gridSpecs[0].effective_from), "d MMM")}–{format(parseISO(gridSpecs[0].effective_to), "d MMM yyyy")}
                        </span>
                      )}
                    </CardTitle>
                    <Select value={gridSpecies} onValueChange={setGridSpecies}>
                      <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SPECIES_OPTIONS.filter(s => s.value !== "goat").map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredGrid.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">No grid data for this species.</p>
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/60">
                          <tr>
                            <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Category</th>
                            <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">HSCW range</th>
                            <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">Fat score</th>
                            <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">$/kg HSCW</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {filteredGrid.map((g, i) => (
                            <tr key={g.id} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                              <td className="px-3 py-2 text-xs">
                                <p className="font-medium">{g.dentition_or_age ?? "—"}</p>
                                {g.notes && <p className="text-muted-foreground text-[11px]">{g.notes}</p>}
                              </td>
                              <td className="px-3 py-2 text-xs text-center text-muted-foreground">
                                {g.min_hscw}–{g.max_hscw} kg
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="text-xs bg-slate-100 text-slate-700 rounded px-1.5 py-0.5">{g.fat_code}</span>
                              </td>
                              <td className="px-3 py-2 text-right">
                                <span className={`text-sm font-bold ${g.base_price_per_kg && g.base_price_per_kg >= 6 ? "text-emerald-600" : g.base_price_per_kg && g.base_price_per_kg >= 5 ? "text-blue-600" : "text-foreground"}`}>
                                  ${g.base_price_per_kg?.toFixed(2) ?? "—"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">
                    Prices are indicative only. Final payment calculated on actual kill data. Contact your account manager for MSA or EU premium queries.
                  </p>
                </CardContent>
              </Card>

              {/* Price calculator */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />Price Calculator
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Species</Label>
                    <Select value={gridSpecies} onValueChange={v => { setGridSpecies(v); setCalcResult(null); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SPECIES_OPTIONS.filter(s => s.value !== "goat").map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="calcHscw">Estimated HSCW (kg)</Label>
                    <Input id="calcHscw" type="number" min={1} placeholder={gridSpecies === "cattle" ? "e.g. 320" : "e.g. 22"} value={calcHscw} onChange={e => { setCalcHscw(e.target.value); setCalcResult(null); }} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fat score</Label>
                    <Select value={calcFat} onValueChange={v => { setCalcFat(v); setCalcResult(null); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FAT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={runCalculator} disabled={!calcHscw}>
                    Calculate
                  </Button>

                  {calcResult && (
                    <div className="rounded-lg border bg-emerald-50 border-emerald-200 p-4 space-y-2 mt-2">
                      <p className="text-xs text-emerald-700 font-medium">{calcResult.row.dentition_or_age}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">$/kg HSCW</p>
                          <p className="text-2xl font-bold text-emerald-700">${calcResult.pricePerKg.toFixed(2)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Est. $/head</p>
                          <p className="text-2xl font-bold text-emerald-700">${calcResult.pricePerHead.toLocaleString()}</p>
                        </div>
                      </div>
                      <p className="text-xs text-emerald-700 text-center">
                        Based on {calcHscw} kg HSCW · Fat {calcFat}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">Indicative only. Final price determined by actual kill data and any applicable premiums or discounts.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── COMPLIANCE & DOCS ─────────────────────────────────────────── */}
          <TabsContent value="compliance" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-primary" />Pre-dispatch Checklist
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ComplianceRow checked={nvdSigned} label="NVD completed and signed" detail="National Vendor Declaration — required for every consignment. Keep a copy." onClick={() => setNvdSigned(v => !v)} />
                  <ComplianceRow checked={nlisTransferred} label="NLIS transfer initiated" detail="Transfer registered animals to the processor's PIC before departure." onClick={() => setNlisTransferred(v => !v)} />
                  <ComplianceRow checked={withholdingClear} label="Withholding periods clear" detail="All chemical treatments must be past their WHP on kill date." onClick={() => setWithholdingClear(v => !v)} />
                  <ComplianceRow checked={animalsFasted} label="Animals off water for transit" detail="Typically 12–24 hrs before loading to reduce gut fill and bruising." onClick={() => setAnimalsFasted(v => !v)} />
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">Progress</p>
                    <p className="text-xs text-muted-foreground">{complianceScore} / 4</p>
                  </div>
                  <Progress value={complianceScore * 25} className="h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />NVD / Document Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dispatches.filter(d => ["requested","confirmed","high","pending","medium"].includes(d.status ?? "")).slice(0,8).map(d => (
                      <div key={d.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate capitalize">{(d.head_count??0).toLocaleString()} {d.species} · {d.requested_kill_date ? format(parseISO(d.requested_kill_date),"d MMM") : "—"}</p>
                          {d.lot_id && <p className="text-[11px] text-muted-foreground">Lot {d.lot_id}</p>}
                        </div>
                        <span className={`shrink-0 text-xs rounded-full border px-2 py-0.5 ${d.nvd_received ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                          {d.nvd_received ? "✓ Received" : "Pending"}
                        </span>
                      </div>
                    ))}
                    {dispatches.filter(d => ["requested","confirmed","high","pending","medium"].includes(d.status ?? "")).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No active dispatches.</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">Processor marks NVD as received when your paperwork is in hand. Pending means follow up is needed.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-primary" />Withholding Period Reference
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {[
                    ["Ivermectin pour-on (cattle)", "28 days"],
                    ["Closantel (sheep — lamb meat)", "28 days"],
                    ["Naphthalophos (sheep drench)", "7 days"],
                    ["Monensin feed additive", "5 days"],
                    ["Erythromycin injection", "28 days"],
                    ["Oxytetracycline (LA)", "21 days"],
                    ["Chlortetracycline (feed)", "7 days"],
                    ["Albendazole (oral)", "10 days"],
                  ].map(([product, whp]) => (
                    <div key={product} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
                      <p className="text-xs">{product}</p>
                      <Badge variant="outline" className="text-xs shrink-0 ml-2">{whp}</Badge>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground pt-2">Always check the product label. Reference guide only.</p>
                </CardContent>
              </Card>

              <Card className="border-amber-200 bg-amber-50/40">
                <CardContent className="pt-4 pb-4">
                  <div className="flex gap-3">
                    <FileText className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-amber-800">eNVD — Digital Vendor Declaration</p>
                      <p className="text-xs text-amber-700">
                        Complete your NVD electronically via the ISC eNVD platform. Digital NVDs are accepted at most processors and are faster and more traceable than paper.
                      </p>
                      <p className="text-xs text-amber-700 font-medium">integrity.animalhealthaustralia.com.au</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── KILL RESULTS ──────────────────────────────────────────────── */}
          <TabsContent value="results" className="space-y-4">
            {/* Performance chart */}
            {chartData.length > 1 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />Performance Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="hscw" domain={["auto","auto"]} tick={{ fontSize: 11 }} unit=" kg" width={50} />
                      <YAxis yAxisId="dress" orientation="right" domain={[45, 65]} tick={{ fontSize: 11 }} unit="%" width={40} />
                      <Tooltip formatter={(val: number, name: string) => [name === "Avg HSCW" ? `${val} kg` : `${val}%`, name]} />
                      <Legend />
                      <Line yAxisId="hscw" type="monotone" dataKey="hscw" name="Avg HSCW" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                      <Line yAxisId="dress" type="monotone" dataKey="dressing" name="Dressing %" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Result cards */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Scale className="h-4 w-4 text-primary" />Kill Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {killResults.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <BarChart2 className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">Kill results appear here once your consignments are processed and data entered by the floor team.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {killResults.map(d => {
                      const dressingPct = d.est_avg_live_wt && d.est_avg_hscw
                        ? ((d.est_avg_hscw / d.est_avg_live_wt) * 100).toFixed(1) : null;
                      return (
                        <div key={d.id} className="rounded-lg border bg-card p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-sm capitalize">{(d.head_count??0).toLocaleString()} head {d.species}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {d.requested_kill_date ? format(parseISO(d.requested_kill_date),"EEE d MMM yyyy") : "—"}
                                {d.lot_id ? ` · Lot ${d.lot_id}` : ""}
                              </p>
                            </div>
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200 shrink-0">Results in</Badge>
                          </div>
                          <Separator className="my-3" />
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground">Avg HSCW</p>
                              <p className="text-lg font-bold">{d.est_avg_hscw} kg</p>
                            </div>
                            {d.est_avg_live_wt && (
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Avg live wt</p>
                                <p className="text-lg font-bold">{d.est_avg_live_wt} kg</p>
                              </div>
                            )}
                            {dressingPct && (
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Dressing %</p>
                                <p className={`text-lg font-bold ${parseFloat(dressingPct) >= 52 ? "text-emerald-600" : "text-amber-600"}`}>{dressingPct}%</p>
                              </div>
                            )}
                          </div>
                          {d.head_count && d.est_avg_hscw && (
                            <div className="mt-3 rounded-md bg-muted/40 px-3 py-2 flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">Total HSCW this consignment</p>
                              <p className="text-sm font-bold">{(d.head_count * d.est_avg_hscw).toLocaleString()} kg</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── MY PROPERTY ───────────────────────────────────────────────── */}
          <TabsContent value="property" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />Property Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!propLoaded ? (
                    <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="propName">Property / business name</Label>
                        <Input id="propName" placeholder="e.g. Yarramundi Pastoral Co" value={propName} onChange={e => setPropName(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="propPic">Property Identification Code (PIC)</Label>
                        <Input id="propPic" placeholder="e.g. QA111001" value={propPic} onChange={e => setPropPic(e.target.value.toUpperCase())} />
                        <p className="text-xs text-muted-foreground">Your PIC will auto-fill on new dispatch forms.</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="propAbn">ABN</Label>
                        <Input id="propAbn" placeholder="e.g. 12 345 678 901" value={propAbn} onChange={e => setPropAbn(e.target.value)} />
                      </div>
                      <Button className="w-full" onClick={saveProperty} disabled={savingProp}>
                        {savingProp ? "Saving…" : "Save property details"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />Account
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-muted/40 p-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary">
                          {(profile?.display_name ?? profile?.email ?? "?")[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{profile?.display_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{profile?.email ?? "—"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-muted-foreground">Role</span>
                      <span className="font-medium capitalize">{profile?.role ?? "—"}</span>
                    </div>
                    {propPic && (
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-muted-foreground">PIC on file</span>
                        <span className="font-medium">{propPic}</span>
                      </div>
                    )}
                    {propAbn && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">ABN</span>
                        <span className="font-medium">{propAbn}</span>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" className="w-full" onClick={signOut}>
                    <LogOut className="h-4 w-4 mr-2" />Sign out
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── New dispatch dialog ─────────────────────────────────────────────── */}
      <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />Dispatch Pre-advice
              {selectedDate && <span className="text-sm font-normal text-muted-foreground">— {format(parseISO(selectedDate),"EEE d MMM yyyy")}</span>}
            </DialogTitle>
            <DialogDescription>Notify the processor of your upcoming consignment. They will confirm within 1 business day.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDispatchSubmit} className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Species *</Label>
                <Select value={species} onValueChange={v => { setSpecies(v); if (!["sheep","lamb"].includes(v)) setMulesingStatus("nm"); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SPECIES_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hc">Head count *</Label>
                <Input id="hc" type="number" min={1} placeholder="e.g. 150" value={headCount} onChange={e => setHeadCount(e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pic">Property PIC *</Label>
                <Input id="pic" placeholder="e.g. QA111001" value={picNumber} onChange={e => setPicNumber(e.target.value.toUpperCase())} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nvd">NVD / eNVD number</Label>
                <Input id="nvd" placeholder="e.g. eNVD-123456" value={nvdNumber} onChange={e => setNvdNumber(e.target.value)} />
              </div>
            </div>
            <div className={`grid gap-3 ${["sheep","lamb"].includes(species) ? "grid-cols-2" : "grid-cols-1"}`}>
              <div className="space-y-1.5">
                <Label>HGP status *</Label>
                <Select value={hgpStatus} onValueChange={setHgpStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{HGP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {["sheep","lamb"].includes(species) && (
                <div className="space-y-1.5">
                  <Label>Mulesing status</Label>
                  <Select value={mulesingStatus} onValueChange={setMulesingStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MULESING_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lw">Est. avg live wt (kg)</Label>
                <Input id="lw" type="number" min={1} placeholder={species === "cattle" ? "e.g. 580" : "e.g. 48"} value={estimatedLiveWt} onChange={e => setEstimatedLiveWt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lot">Lot / pen reference</Label>
                <Input id="lot" placeholder="e.g. LOT-24-B" value={lotRef} onChange={e => setLotRef(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="carrier">Carrier</Label>
                <Input id="carrier" placeholder="e.g. Burns Transport" value={carrierName} onChange={e => setCarrierName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rego">Vehicle rego</Label>
                <Input id="rego" placeholder="e.g. 123 ABC" value={vehicleRego} onChange={e => setVehicleRego(e.target.value.toUpperCase())} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dnotes">Notes</Label>
              <Textarea id="dnotes" placeholder="e.g. Mixed age, delivering from Roma — expect arrival ~7am" rows={2} value={dispatchNotes} onChange={e => setDispatchNotes(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setDispatchOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={submitting}>{submitting ? "Sending…" : "Send pre-advice"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Truck departed dialog ───────────────────────────────────────────── */}
      <Dialog open={truckOpen} onOpenChange={setTruckOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />Log Truck Departure
            </DialogTitle>
            <DialogDescription>
              {truckDispatch && (
                <span>
                  {(truckDispatch.head_count ?? 0).toLocaleString()} head {truckDispatch.species}
                  {truckDispatch.requested_kill_date ? ` · Kill ${format(parseISO(truckDispatch.requested_kill_date),"d MMM")}` : ""}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="rounded-lg bg-teal-50 border border-teal-200 p-3 text-sm text-teal-800">
              🚛 Truck is now loaded and departing. The intake team will be notified.
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eta">Expected arrival time</Label>
              <Input id="eta" type="time" value={etaInput} onChange={e => setEtaInput(e.target.value)} />
              <p className="text-xs text-muted-foreground">Shown to the intake team on their screen.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setTruckOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={submitTruck} disabled={submittingTruck}>
                {submittingTruck ? "Updating…" : "Confirm departure"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Messages dialog ─────────────────────────────────────────────────── */}
      <Dialog open={msgOpen} onOpenChange={setMsgOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              {msgDispatch && (
                <span className="capitalize">
                  {(msgDispatch.head_count ?? 0).toLocaleString()} head {msgDispatch.species}
                  {msgDispatch.requested_kill_date ? ` · ${format(parseISO(msgDispatch.requested_kill_date),"d MMM")}` : ""}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>Direct messages with the processor's ops team.</DialogDescription>
          </DialogHeader>

          {/* Message thread */}
          <div className="flex-1 overflow-y-auto space-y-3 py-2 min-h-[200px]">
            {loadingMsgs ? (
              <p className="text-sm text-muted-foreground text-center py-8 animate-pulse">Loading messages…</p>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <MessageSquare className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">No messages yet. Start a conversation with ops.</p>
              </div>
            ) : (
              messages.map(m => {
                const isSupplier = m.sender_role === "supplier";
                return (
                  <div key={m.id} className={`flex ${isSupplier ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${isSupplier ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                      <p className="text-xs font-semibold mb-0.5 opacity-70">{m.sender_name}</p>
                      <p className="text-sm leading-snug">{m.message}</p>
                      <p className="text-[10px] opacity-60 mt-1 text-right">{format(parseISO(m.created_at),"h:mma d MMM")}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={msgEndRef} />
          </div>

          {/* Send input */}
          <div className="shrink-0 flex gap-2 pt-2 border-t">
            <Input
              placeholder="Message ops team…"
              value={msgText}
              onChange={e => setMsgText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            />
            <Button size="icon" onClick={sendMessage} disabled={!msgText.trim() || sendingMsg}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
