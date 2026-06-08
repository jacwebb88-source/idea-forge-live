import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LivestockLayout } from "@/components/LivestockLayout";
import { supabase } from "@/integrations/supabase/client";
import { useMobs } from "@/components/on-farm/useMobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, ArrowLeft, Send, Building2 } from "lucide-react";
import { format, addDays } from "date-fns";

const SPECIES_OPTIONS = ["Cattle", "Sheep", "Lamb", "Goat"];
const HGP_OPTIONS = ["HGP Free", "Implanted", "Unknown"];

export default function BookKillSlot() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mobs } = useMobs();
  const [processors, setProcessors] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const [form, setForm] = useState({
    plant_id: "",
    processor_name: "",
    mob_id: "",
    species: "Cattle",
    head_count: "",
    requested_kill_date: format(addDays(new Date(), 14), "yyyy-MM-dd"),
    hgp_status: "HGP Free",
    msa_eligible: false,
    halal: false,
    avg_weight_kg: "",
    notes: "",
    supplier_name: "",
    supplier_contact: "",
    pic_number: "",
  });

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    // Load processor grids to get processor names
    supabase.from("processor_grids" as any).select("processor_name").then(({ data }: any) => {
      const unique = [...new Set((data ?? []).map((g: any) => g.processor_name))];
      setProcessors(unique as string[]);
    });

    // Load plants for the booking
    supabase.from("plants").select("id, plant_name, company_name").then(({ data }) => {
      setPlants(data ?? []);
      if (data?.length) set("plant_id", data[0].id);
    });

    // Load user profile
    supabase.from("user_profiles" as any).select("*").single().then(({ data }: any) => {
      if (data) {
        setProfile(data);
        if (data.display_name) set("supplier_name", data.display_name);
      }
    });
  }, []);

  // Pre-fill from mob selection
  function pickMob(mobId: string) {
    set("mob_id", mobId);
    const mob = mobs.find(m => m.id === mobId);
    if (!mob) return;
    set("species", mob.species === "sheep" ? "Sheep" : "Cattle");
    set("head_count", String(mob.head_count));
    set("hgp_status", mob.hgp_free ? "HGP Free" : "Implanted");
    set("msa_eligible", mob.msa_eligible ?? false);
    if (mob.purchase_weight_avg_kg) set("avg_weight_kg", String(mob.purchase_weight_avg_kg));
  }

  async function handleSubmit() {
    if (!form.processor_name || !form.head_count || !form.requested_kill_date) {
      toast({ title: "Missing fields", description: "Processor, head count and kill date are required.", variant: "destructive" });
      return;
    }
    setSaving(true);

    const plantId = form.plant_id || (plants[0]?.id ?? null);

    const { error } = await supabase.from("bookings").insert({
      plant_id: plantId,
      supplier_name: form.supplier_name || "Livestock Supplier",
      species: form.species,
      head_count: parseInt(form.head_count),
      requested_kill_date: form.requested_kill_date,
      status: "requested",
      hgp_status: form.hgp_status,
      notes: [
        form.notes,
        form.avg_weight_kg ? `Est. avg weight: ${form.avg_weight_kg}kg` : "",
        form.msa_eligible ? "MSA eligible" : "",
        form.halal ? "Halal certified" : "",
        form.pic_number ? `PIC: ${form.pic_number}` : "",
        form.supplier_contact ? `Contact: ${form.supplier_contact}` : "",
        `Processor requested: ${form.processor_name}`,
      ].filter(Boolean).join(" · ") || null,
    } as any);

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // Send notification email
    try {
      await supabase.functions.invoke("pitch-access-log", {
        body: {
          viewer: `KILL SLOT REQUEST — ${form.supplier_name} → ${form.processor_name}`,
          accessed_at: new Date().toISOString(),
        },
      });
    } catch { /* non-blocking */ }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <LivestockLayout>
        <div className="max-w-xl mx-auto pt-20 text-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">Request submitted</h1>
            <p className="text-muted-foreground mt-2">
              Your kill slot request for <strong>{form.head_count} head</strong> with <strong>{form.processor_name}</strong> on <strong>{format(new Date(form.requested_kill_date), "d MMM yyyy")}</strong> has been sent.
            </p>
          </div>
          <div className="rounded-xl border bg-amber-50 border-amber-200 px-5 py-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">What happens next</p>
            <p>The processor will review your request and confirm the booking. You'll receive confirmation — typically within 24 hours. Once confirmed it will appear in your Booking Board.</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate("/on-farm")} variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Livestock
            </Button>
            <Button onClick={() => { setSubmitted(false); setForm(f => ({ ...f, head_count: "", notes: "" })); }}>
              Submit another request
            </Button>
          </div>
        </div>
      </LivestockLayout>
    );
  }

  return (
    <LivestockLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Booking</p>
            <h1 className="text-2xl font-extrabold">Request a kill slot</h1>
          </div>
        </div>

        <p className="text-muted-foreground text-sm">
          Submit a kill slot request directly to a processor. Your details and stock description are sent automatically — no phone call needed.
        </p>

        {/* Pre-fill from mob */}
        {mobs.filter(m => m.status === "active").length > 0 && (
          <div className="rounded-xl border bg-muted/20 p-4">
            <Label className="text-xs font-semibold mb-2 block">Pre-fill from a mob (optional)</Label>
            <Select onValueChange={pickMob}>
              <SelectTrigger className="rounded-xl bg-white"><SelectValue placeholder="Select a mob to pre-fill details…" /></SelectTrigger>
              <SelectContent>
                {mobs.filter(m => m.status === "active").map(mob => (
                  <SelectItem key={mob.id} value={mob.id}>
                    {mob.mob_name} — {mob.head_count} head
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Processor */}
        <div className="rounded-2xl border bg-white p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <p className="font-bold text-sm">Processor</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Processor name</Label>
            {processors.length > 0 ? (
              <Select value={form.processor_name} onValueChange={v => set("processor_name", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select processor…" /></SelectTrigger>
                <SelectContent>
                  {processors.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  <SelectItem value="__other">Other / enter manually</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input value={form.processor_name} onChange={e => set("processor_name", e.target.value)} placeholder="e.g. JBS Dinmore, Teys Rockhampton" className="rounded-xl" />
            )}
            {form.processor_name === "__other" && (
              <Input value="" onChange={e => set("processor_name", e.target.value)} placeholder="Enter processor name" className="rounded-xl mt-2" />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Requested kill date</Label>
            <Input type="date" value={form.requested_kill_date} onChange={e => set("requested_kill_date", e.target.value)} className="rounded-xl" />
          </div>
        </div>

        {/* Stock details */}
        <div className="rounded-2xl border bg-white p-6 space-y-4">
          <p className="font-bold text-sm">Stock details</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Species</Label>
              <Select value={form.species} onValueChange={v => set("species", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{SPECIES_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Head count</Label>
              <Input type="number" value={form.head_count} onChange={e => set("head_count", e.target.value)} placeholder="e.g. 120" className="rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">HGP status</Label>
              <Select value={form.hgp_status} onValueChange={v => set("hgp_status", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{HGP_OPTIONS.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Est. avg weight (kg)</Label>
              <Input type="number" value={form.avg_weight_kg} onChange={e => set("avg_weight_kg", e.target.value)} placeholder="e.g. 380" className="rounded-xl" />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.msa_eligible} onChange={e => set("msa_eligible", e.target.checked)} className="h-4 w-4 rounded" />
              MSA eligible
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.halal} onChange={e => set("halal", e.target.checked)} className="h-4 w-4 rounded" />
              Halal certified
            </label>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">PIC number</Label>
            <Input value={form.pic_number} onChange={e => set("pic_number", e.target.value)} placeholder="e.g. 3ABCD001" className="rounded-xl" />
          </div>
        </div>

        {/* Your details */}
        <div className="rounded-2xl border bg-white p-6 space-y-4">
          <p className="font-bold text-sm">Your details</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Name / operation</Label>
              <Input value={form.supplier_name} onChange={e => set("supplier_name", e.target.value)} placeholder="e.g. Jumbunna Pastoral" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Contact number</Label>
              <Input value={form.supplier_contact} onChange={e => set("supplier_contact", e.target.value)} placeholder="e.g. 0400 000 000" className="rounded-xl" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Notes to processor</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} placeholder="Breed, background, program details, any specific requirements…" className="rounded-xl" />
          </div>
        </div>

        {/* What gets sent */}
        <div className="rounded-xl border border-dashed border-muted px-4 py-3 text-xs text-muted-foreground">
          <p className="font-semibold mb-1">What the processor receives</p>
          <p>{form.supplier_name || "Your name"} · {form.head_count || "—"} head {form.species} · Kill date {form.requested_kill_date ? format(new Date(form.requested_kill_date), "d MMM yyyy") : "—"} · {form.hgp_status}{form.msa_eligible ? " · MSA" : ""}{form.halal ? " · Halal" : ""}{form.avg_weight_kg ? ` · ${form.avg_weight_kg}kg avg` : ""}{form.pic_number ? ` · PIC ${form.pic_number}` : ""}</p>
        </div>

        <Button onClick={handleSubmit} disabled={saving} className="w-full gap-2 py-5 text-base font-bold bg-amber-500 hover:bg-amber-600 text-white">
          <Send className="h-5 w-5" />
          {saving ? "Submitting…" : `Send request to ${form.processor_name || "processor"}`}
        </Button>

      </div>
    </LivestockLayout>
  );
}
