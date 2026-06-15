import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { Inbox, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Beef, ShieldCheck } from "lucide-react";

interface KillInterest {
  id: string;
  created_at: string;
  supplier_name: string;
  supplier_contact: string | null;
  pic_number: string | null;
  species: string;
  head_count: number;
  hgp_status: string;
  msa_eligible: boolean;
  halal: boolean;
  avg_weight_kg: number | null;
  preferred_processor: string | null;
  requested_kill_date: string;
  notes: string | null;
  status: string;
  resulting_booking_id: string | null;
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  new:       { label: "New",       className: "bg-blue-100 text-blue-700 border-blue-200" },
  reviewing: { label: "Reviewing", className: "bg-amber-100 text-amber-700 border-amber-200" },
  matched:   { label: "Matched",   className: "bg-purple-100 text-purple-700 border-purple-200" },
  accepted:  { label: "Accepted",  className: "bg-green-100 text-green-700 border-green-200" },
  declined:  { label: "Declined",  className: "bg-red-100 text-red-700 border-red-200" },
  withdrawn: { label: "Withdrawn", className: "bg-slate-100 text-slate-500 border-slate-200" },
};

function LeadCard({ lead, onAccept, onDecline }: { lead: KillInterest; onAccept: (id: string) => void; onDecline: (id: string) => void }) {
  const [expanded, setExpanded] = useState(lead.status === "new");
  const s = STATUS_LABELS[lead.status] ?? STATUS_LABELS.new;
  const isActive = ["new", "reviewing"].includes(lead.status);

  return (
    <div className={`rounded-2xl border bg-white ${lead.status === "new" ? "border-blue-200 shadow-sm" : "border-border"}`}>
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${lead.status === "new" ? "bg-blue-100" : "bg-muted"}`}>
            <Beef className={`h-4 w-4 ${lead.status === "new" ? "text-blue-600" : "text-muted-foreground"}`} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{lead.supplier_name}</p>
            <p className="text-xs text-muted-foreground">
              {lead.head_count} head {lead.species} · Kill {format(parseISO(lead.requested_kill_date), "d MMM yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${s.className}`}>{s.label}</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Species</p>
              <p className="font-semibold">{lead.species}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Head count</p>
              <p className="font-semibold">{lead.head_count}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-0.5">Kill date requested</p>
              <p className="font-semibold">{format(parseISO(lead.requested_kill_date), "d MMM yyyy")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-0.5">HGP status</p>
              <p className="font-semibold">{lead.hgp_status}</p>
            </div>
            {lead.avg_weight_kg && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-0.5">Est. avg weight</p>
                <p className="font-semibold">{lead.avg_weight_kg}kg</p>
              </div>
            )}
            {lead.pic_number && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-0.5">PIC</p>
                <p className="font-semibold font-mono">{lead.pic_number}</p>
              </div>
            )}
            {lead.supplier_contact && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-0.5">Contact</p>
                <p className="font-semibold">{lead.supplier_contact}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {lead.msa_eligible && (
              <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                <ShieldCheck className="h-3 w-3" /> MSA eligible
              </span>
            )}
            {lead.halal && (
              <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
                Halal
              </span>
            )}
            {lead.preferred_processor && (
              <span className="text-xs bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
                Requested: {lead.preferred_processor}
              </span>
            )}
          </div>

          {lead.notes && (
            <div className="rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {lead.notes}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Received {format(parseISO(lead.created_at), "d MMM yyyy, h:mm a")}
          </p>

          {isActive && (
            <div className="flex gap-3 pt-1">
              <Button
                onClick={() => onAccept(lead.id)}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                <CheckCircle2 className="h-4 w-4" /> Accept — create booking
              </Button>
              <Button
                onClick={() => onDecline(lead.id)}
                variant="outline"
                size="sm"
                className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" /> Decline
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function KillLeads() {
  const { toast } = useToast();
  const [leads, setLeads] = useState<KillInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "all">("active");

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("kill_interests")
      .select("*")
      .order("created_at", { ascending: false });
    setLeads(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAccept(id: string) {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;

    // Create a booking from the lead
    const { data: booking, error: bookingErr } = await supabase.from("bookings").insert({
      supplier_name: lead.supplier_name,
      species: lead.species,
      head_count: lead.head_count,
      requested_kill_date: lead.requested_kill_date,
      hgp_status: lead.hgp_status,
      msa_enrolled: lead.msa_eligible,
      status: "requested",
      notes: [
        lead.notes,
        lead.avg_weight_kg ? `Est. avg weight: ${lead.avg_weight_kg}kg` : "",
        lead.halal ? "Halal certified" : "",
        lead.pic_number ? `PIC: ${lead.pic_number}` : "",
        lead.supplier_contact ? `Contact: ${lead.supplier_contact}` : "",
      ].filter(Boolean).join(" · ") || null,
    } as any).select("id").single();

    if (bookingErr) {
      toast({ title: "Error creating booking", description: bookingErr.message, variant: "destructive" });
      return;
    }

    // Mark lead as accepted and link the booking
    await (supabase as any).from("kill_interests").update({
      status: "accepted",
      resulting_booking_id: booking.id,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    toast({ title: "Lead accepted", description: `Booking created for ${lead.supplier_name} — ${lead.head_count} head on ${format(parseISO(lead.requested_kill_date), "d MMM yyyy")}.` });
    load();
  }

  async function handleDecline(id: string) {
    await (supabase as any).from("kill_interests").update({
      status: "declined",
      updated_at: new Date().toISOString(),
    }).eq("id", id);
    toast({ title: "Lead declined" });
    load();
  }

  const displayed = filter === "active"
    ? leads.filter(l => ["new", "reviewing"].includes(l.status))
    : leads;

  const newCount = leads.filter(l => l.status === "new").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Inbox className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-extrabold">Kill Slot Leads</h1>
            {newCount > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{newCount} new</span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">
            Supplier expressions of interest in a kill slot — reviewed and accepted by your team. Accepting creates a booking on the board.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter("active")}
            className={`text-sm font-semibold px-4 py-1.5 rounded-full border transition-colors ${filter === "active" ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground"}`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`text-sm font-semibold px-4 py-1.5 rounded-full border transition-colors ${filter === "all" ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground"}`}
          >
            All leads
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground text-sm">Loading…</div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Clock className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
            <p className="text-muted-foreground text-sm">
              {filter === "active" ? "No active leads — all caught up." : "No leads yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(lead => (
              <LeadCard key={lead.id} lead={lead} onAccept={handleAccept} onDecline={handleDecline} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
