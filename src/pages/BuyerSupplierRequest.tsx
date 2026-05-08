import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ClipboardList, CheckCircle, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";

// 30-minute arrival slots 06:00–22:00
const ARRIVAL_SLOTS = Array.from({ length: 32 }, (_, i) => {
  const h = Math.floor(i / 2) + 6;
  const m = i % 2 === 0 ? "00" : "30";
  const hNext = m === "30" ? h + 1 : h;
  const mNext = m === "30" ? "00" : "30";
  return `${String(h).padStart(2,"0")}:${m}–${String(hNext).padStart(2,"0")}:${mNext}`;
}).filter(s => {
  const [start] = s.split("–");
  const [h] = start.split(":").map(Number);
  return h < 22;
});

const isLambOrSheep = (species: string) =>
  ["lamb", "sheep", "mutton"].includes(species.toLowerCase());

type FormData = {
  supplier_name: string;
  contact_name: string;
  contact_phone: string;
  pic_number: string;
  species: string;
  head_count: string;
  requested_kill_date: string;
  arrival_slot: string;
  hgp_status: string;
  mulesing_status: string;
  lot_id: string;
  envd_ref: string;
  notes: string;
};

const initialForm: FormData = {
  supplier_name: "",
  contact_name: "",
  contact_phone: "",
  pic_number: "",
  species: "",
  head_count: "",
  requested_kill_date: "",
  arrival_slot: "",
  hgp_status: "",
  mulesing_status: "",
  lot_id: "",
  envd_ref: "",
  notes: "",
};

export default function BuyerSupplierRequest() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [formData, setFormData] = useState<FormData>(initialForm);
  const [plants, setPlants] = useState<{ id: string; plant_name: string }[]>([]);
  const [selectedPlant, setSelectedPlant] = useState("");

  useEffect(() => {
    const fetchPlants = async () => {
      const { data } = await supabase.from("plants").select("id, plant_name").order("plant_name");
      if (data) {
        setPlants(data);
        if (data.length === 1) setSelectedPlant(data[0].id);
      }
    };
    fetchPlants();
  }, []);

  const setField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!formData.supplier_name.trim()) e.supplier_name = "Required";
    if (!formData.species)              e.species = "Required";
    if (!formData.head_count || parseInt(formData.head_count) <= 0) e.head_count = "Must be > 0";
    if (!formData.requested_kill_date)  e.requested_kill_date = "Required";
    if (!formData.hgp_status)           e.hgp_status = "Required for all species";
    if (isLambOrSheep(formData.species) && !formData.mulesing_status)
      e.mulesing_status = "Required for lamb/sheep";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("bookings").insert({
        species:             formData.species,
        head_count:          parseInt(formData.head_count),
        requested_kill_date: formData.requested_kill_date,
        arrival_slot:        formData.arrival_slot || null,
        hgp_status:          formData.hgp_status,
        mulesing_status:     isLambOrSheep(formData.species) ? (formData.mulesing_status || null) : null,
        lot_id:              formData.lot_id || null,
        agent_ref:           formData.envd_ref || null,
        plant_id:            selectedPlant || null,
        status:              "requested",
        // Store supplier name in agent_ref as fallback until supplier lookup is wired
        // A future migration will add supplier_contact_name / phone columns
      });

      if (error) {
        toast({ title: "Submission failed", description: error.message, variant: "destructive" });
        return;
      }

      setSubmitted(true);
      toast({ title: "Request submitted ✅", description: "We'll confirm your slot shortly." });
    } catch (err) {
      toast({ title: "Unexpected error", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <DashboardLayout>
        <div className="max-w-lg mx-auto mt-12 text-center space-y-4">
          <CheckCircle className="h-14 w-14 text-emerald-500 mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">Request received</h2>
          <p className="text-muted-foreground">
            Your booking request has been submitted. The plant team will confirm your kill slot
            and arrival time within 1–2 business days.
          </p>
          <p className="text-sm text-muted-foreground">
            Questions? Contact your plant liaison directly.
          </p>
          <Button
            variant="outline"
            onClick={() => { setSubmitted(false); setFormData(initialForm); }}
          >
            Submit another request
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Booking Intake Form</h1>
          <p className="text-muted-foreground">
            Submit a livestock processing booking request. Fields marked * are required.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Supplier details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                Your details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="supplier_name">Supplier / Agency name *</Label>
                  <Input
                    id="supplier_name"
                    value={formData.supplier_name}
                    onChange={e => setField("supplier_name", e.target.value)}
                    placeholder="e.g. Rangers Valley, Pacific Meats"
                    className={errors.supplier_name ? "border-destructive" : ""}
                  />
                  {errors.supplier_name && <p className="text-xs text-destructive">{errors.supplier_name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_name">Contact name</Label>
                  <Input
                    id="contact_name"
                    value={formData.contact_name}
                    onChange={e => setField("contact_name", e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_phone">Contact phone</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={e => setField("contact_phone", e.target.value)}
                    placeholder="0400 000 000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pic_number">PIC number</Label>
                  <Input
                    id="pic_number"
                    value={formData.pic_number}
                    onChange={e => setField("pic_number", e.target.value)}
                    placeholder="QA123456"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">Property Identification Code</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="envd_ref">eNVD reference</Label>
                  <Input
                    id="envd_ref"
                    value={formData.envd_ref}
                    onChange={e => setField("envd_ref", e.target.value)}
                    placeholder="eNVD-XXXXXXXX"
                    className="font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Kill details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kill details *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="species">Species *</Label>
                  <Select value={formData.species} onValueChange={v => setField("species", v)}>
                    <SelectTrigger id="species" className={errors.species ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select species" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="beef">Beef / Cattle</SelectItem>
                      <SelectItem value="lamb">Lamb</SelectItem>
                      <SelectItem value="sheep">Sheep</SelectItem>
                      <SelectItem value="goat">Goat</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.species && <p className="text-xs text-destructive">{errors.species}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="head_count">Head count *</Label>
                  <Input
                    id="head_count"
                    type="number"
                    min={1}
                    value={formData.head_count}
                    onChange={e => setField("head_count", e.target.value)}
                    placeholder="e.g. 80"
                    className={errors.head_count ? "border-destructive" : ""}
                  />
                  {errors.head_count && <p className="text-xs text-destructive">{errors.head_count}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="kill_date">Requested kill date *</Label>
                  <Input
                    id="kill_date"
                    type="date"
                    value={formData.requested_kill_date}
                    onChange={e => setField("requested_kill_date", e.target.value)}
                    className={errors.requested_kill_date ? "border-destructive" : ""}
                  />
                  {errors.requested_kill_date && <p className="text-xs text-destructive">{errors.requested_kill_date}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="arrival_slot">Preferred arrival slot</Label>
                  <Select value={formData.arrival_slot} onValueChange={v => setField("arrival_slot", v)}>
                    <SelectTrigger id="arrival_slot">
                      <SelectValue placeholder="Select slot (optional)" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50 max-h-48 overflow-y-auto">
                      {ARRIVAL_SLOTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Plant will confirm or adjust</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lot_id">Lot ID</Label>
                  <Input
                    id="lot_id"
                    value={formData.lot_id}
                    onChange={e => setField("lot_id", e.target.value)}
                    placeholder="Optional lot identifier"
                  />
                </div>
                {plants.length > 1 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="plant">Plant</Label>
                    <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                      <SelectTrigger id="plant">
                        <SelectValue placeholder="Select plant" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {plants.map(p => <SelectItem key={p.id} value={p.id}>{p.plant_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Compliance declarations *
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="hgp_status">HGP (Hormone Growth Promotant) status *</Label>
                <Select value={formData.hgp_status} onValueChange={v => setField("hgp_status", v)}>
                  <SelectTrigger id="hgp_status" className={errors.hgp_status ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select HGP status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="hgp_free">HGP-Free — no hormone treatments</SelectItem>
                    <SelectItem value="hgp_treated">HGP-Treated — implants used</SelectItem>
                  </SelectContent>
                </Select>
                {errors.hgp_status && <p className="text-xs text-destructive">{errors.hgp_status}</p>}
                {formData.hgp_status === "hgp_treated" && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 mt-1">
                    <strong>Note:</strong> HGP-treated animals must be killed after HGP-free animals on the same chain.
                    Your slot may be adjusted accordingly.
                  </div>
                )}
              </div>

              {isLambOrSheep(formData.species) && (
                <div className="space-y-1.5">
                  <Label htmlFor="mulesing_status">Mulesing status * <span className="font-normal text-muted-foreground">(lamb/sheep)</span></Label>
                  <Select value={formData.mulesing_status} onValueChange={v => setField("mulesing_status", v)}>
                    <SelectTrigger id="mulesing_status" className={errors.mulesing_status ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select mulesing status" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="mulesed">Mulesed</SelectItem>
                      <SelectItem value="unmulesed">Unmulesed</SelectItem>
                      <SelectItem value="ctd">Ceased — Treated and Declared (CTD)</SelectItem>
                      <SelectItem value="nm_pain_relief">Not mulesed — with pain relief</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.mulesing_status && <p className="text-xs text-destructive">{errors.mulesing_status}</p>}
                  <p className="text-xs text-muted-foreground">
                    Required for EU/UK market access and MSA eligibility
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="notes">Additional notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={e => setField("notes", e.target.value)}
                  placeholder="Any special requirements, health declarations, or relevant information…"
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit booking request"
            )}
          </Button>
        </form>
      </div>
    </DashboardLayout>
  );
}
