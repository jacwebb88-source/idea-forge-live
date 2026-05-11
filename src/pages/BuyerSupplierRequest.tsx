import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, ClipboardList, CheckCircle, AlertTriangle,
  Leaf, Heart, ShieldCheck, FileText
} from "lucide-react";
import { useState, useEffect } from "react";

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

const CATTLE_BREEDS = [
  "Angus", "Hereford", "Charolais", "Simmental", "Brahman",
  "Wagyu", "Murray Grey", "Limousin", "Santa Gertrudis",
  "Droughtmaster", "Belmont Red", "Shorthorn", "Cross-breed / Mixed",
];
const SHEEP_BREEDS = [
  "Merino", "Poll Merino", "Dorper", "White Dorper", "Suffolk",
  "Border Leicester", "Corriedale", "Composite / Mixed",
];
const GOAT_BREEDS = [
  "Boer", "Kalahari Red", "Savanna", "Rangeland / Mixed",
];

const isLambOrSheep = (s: string) => ["lamb", "sheep", "mutton"].includes(s.toLowerCase());
const isCattle = (s: string) => ["beef", "cattle"].includes(s.toLowerCase());
const isGoat = (s: string) => s.toLowerCase() === "goat";

type FormData = {
  // Section A — Your details
  supplier_name: string;
  contact_name: string;
  contact_phone: string;
  pic_number: string;
  lpa_number: string;
  envd_ref: string;
  // Section B — Livestock description
  species: string;
  head_count: string;
  breed: string;
  livestock_sex: string;
  dentition: string;
  est_avg_live_wt: string;
  lot_id: string;
  // Section C — Kill slot
  requested_kill_date: string;
  arrival_slot: string;
  // Section D — Feed declaration
  feed_type: string;
  days_on_feed: string;
  nfas_accreditation: string;
  // Section E — Compliance
  hgp_status: string;
  mulesing_status: string;
  eu_eligible: boolean;
  msa_declaration: boolean;
  // Section F — Health declarations
  notifiable_disease_free: boolean;
  vet_treatment_60d: boolean;
  withholding_compliant: boolean;
  vendor_declaration_signed: boolean;
  // Notes
  notes: string;
};

const initialForm: FormData = {
  supplier_name: "", contact_name: "", contact_phone: "",
  pic_number: "", lpa_number: "", envd_ref: "",
  species: "", head_count: "", breed: "", livestock_sex: "",
  dentition: "", est_avg_live_wt: "", lot_id: "",
  requested_kill_date: "", arrival_slot: "",
  feed_type: "", days_on_feed: "", nfas_accreditation: "",
  hgp_status: "", mulesing_status: "",
  eu_eligible: false, msa_declaration: false,
  notifiable_disease_free: false, vet_treatment_60d: false,
  withholding_compliant: false, vendor_declaration_signed: false,
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

  const setField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
  };

  const breedOptions = isCattle(formData.species)
    ? CATTLE_BREEDS
    : isLambOrSheep(formData.species)
    ? SHEEP_BREEDS
    : isGoat(formData.species)
    ? GOAT_BREEDS
    : [];

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!formData.supplier_name.trim())    e.supplier_name = "Required";
    if (!formData.pic_number.trim())       e.pic_number = "PIC number is required";
    if (!formData.species)                 e.species = "Required";
    if (!formData.head_count || parseInt(formData.head_count) <= 0) e.head_count = "Must be > 0";
    if (!formData.requested_kill_date)     e.requested_kill_date = "Required";
    if (!formData.hgp_status)             e.hgp_status = "Required";
    if (isLambOrSheep(formData.species) && !formData.mulesing_status)
      e.mulesing_status = "Required for lamb/sheep";
    if (!formData.feed_type)              e.feed_type = "Required";
    if (!formData.notifiable_disease_free) e.notifiable_disease_free = "You must confirm disease-free status";
    if (!formData.withholding_compliant)  e.withholding_compliant = "You must confirm withholding compliance";
    if (!formData.vendor_declaration_signed) e.vendor_declaration_signed = "You must sign the declaration to submit";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast({ title: "Please complete all required fields", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("bookings").insert({
        species:                  formData.species,
        head_count:               parseInt(formData.head_count),
        requested_kill_date:      formData.requested_kill_date,
        arrival_slot:             formData.arrival_slot || null,
        hgp_status:               formData.hgp_status,
        mulesing_status:          isLambOrSheep(formData.species) ? (formData.mulesing_status || null) : null,
        lot_id:                   formData.lot_id || null,
        agent_ref:                formData.envd_ref || null,
        plant_id:                 selectedPlant || null,
        status:                   "requested",
        breed:                    formData.breed || null,
        livestock_sex:            formData.livestock_sex || null,
        dentition:                formData.dentition || null,
        est_avg_live_wt:          formData.est_avg_live_wt ? parseFloat(formData.est_avg_live_wt) : null,
        feed_type:                formData.feed_type || null,
        days_on_feed:             formData.days_on_feed ? parseInt(formData.days_on_feed) : null,
        nfas_accreditation:       formData.nfas_accreditation || null,
        lpa_number:               formData.lpa_number || null,
        eu_eligible:              formData.eu_eligible,
        msa_declaration:          formData.msa_declaration,
        msa_enrolled:             formData.msa_declaration,
        notifiable_disease_free:  formData.notifiable_disease_free,
        vet_treatment_60d:        formData.vet_treatment_60d,
        withholding_compliant:    formData.withholding_compliant,
        vendor_declaration_signed: formData.vendor_declaration_signed,
        vendor_declaration_date:  formData.vendor_declaration_signed ? new Date().toISOString().slice(0, 10) : null,
      });

      if (error) {
        toast({ title: "Submission failed", description: error.message, variant: "destructive" });
        return;
      }

      setSubmitted(true);
      toast({ title: "Declaration submitted ✅", description: "Your eNVD and booking request have been received." });
    } catch {
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
          <h2 className="text-2xl font-bold text-foreground">Declaration received</h2>
          <p className="text-muted-foreground">
            Your booking request and vendor declaration have been submitted. The plant team will
            confirm your kill slot within 1–2 business days.
          </p>
          <div className="text-sm text-left bg-muted rounded-lg px-4 py-3 space-y-1">
            <p className="font-semibold text-foreground">What happens next</p>
            <p className="text-muted-foreground">1. Plant reviews and approves your slot</p>
            <p className="text-muted-foreground">2. You receive confirmation with kill date and arrival time</p>
            <p className="text-muted-foreground">3. Your declaration is attached to the kill chain record</p>
            <p className="text-muted-foreground">4. NLIS movement is prepared from your PIC to plant</p>
          </div>
          <Button variant="outline" onClick={() => { setSubmitted(false); setFormData(initialForm); }}>
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
          <h1 className="text-3xl font-bold text-foreground">Supplier Booking Request</h1>
          <p className="text-muted-foreground">
            Complete your booking request and livestock declaration. This replaces your paper NVD.
            Fields marked * are required.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {["eNVD", "LPA", "NLIS", "MSA", "EU Eligible"].map(tag => (
              <span key={tag} className="text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── SECTION A: Your details ────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                Section A — Your details
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
                  <Input id="contact_name" value={formData.contact_name}
                    onChange={e => setField("contact_name", e.target.value)} placeholder="Your name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact_phone">Contact phone</Label>
                  <Input id="contact_phone" value={formData.contact_phone}
                    onChange={e => setField("contact_phone", e.target.value)} placeholder="0400 000 000" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pic_number">PIC number *</Label>
                  <Input
                    id="pic_number"
                    value={formData.pic_number}
                    onChange={e => setField("pic_number", e.target.value)}
                    placeholder="QA123456"
                    className={`font-mono ${errors.pic_number ? "border-destructive" : ""}`}
                  />
                  <p className="text-xs text-muted-foreground">Property Identification Code — required for NLIS</p>
                  {errors.pic_number && <p className="text-xs text-destructive">{errors.pic_number}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lpa_number">LPA accreditation number</Label>
                  <Input id="lpa_number" value={formData.lpa_number}
                    onChange={e => setField("lpa_number", e.target.value)}
                    placeholder="LPA-XXXXXXX" className="font-mono" />
                  <p className="text-xs text-muted-foreground">Required for EU market &amp; premium programs</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="envd_ref">eNVD reference</Label>
                  <Input id="envd_ref" value={formData.envd_ref}
                    onChange={e => setField("envd_ref", e.target.value)}
                    placeholder="eNVD-XXXXXXXX" className="font-mono" />
                  <p className="text-xs text-muted-foreground">If already raised in the IS portal</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── SECTION B: Livestock description ──────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Section B — Livestock description
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Species *</Label>
                  <Select value={formData.species} onValueChange={v => {
                    setField("species", v);
                    setField("breed", "");
                    setField("livestock_sex", "");
                    setField("dentition", "");
                    setField("mulesing_status", "");
                  }}>
                    <SelectTrigger className={errors.species ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select species" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="beef">Beef / Cattle</SelectItem>
                      <SelectItem value="lamb">Lamb</SelectItem>
                      <SelectItem value="sheep">Sheep / Mutton</SelectItem>
                      <SelectItem value="goat">Goat</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.species && <p className="text-xs text-destructive">{errors.species}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Head count *</Label>
                  <Input
                    type="number" min={1}
                    value={formData.head_count}
                    onChange={e => setField("head_count", e.target.value)}
                    placeholder="e.g. 80"
                    className={errors.head_count ? "border-destructive" : ""}
                  />
                  {errors.head_count && <p className="text-xs text-destructive">{errors.head_count}</p>}
                </div>

                {/* Breed — only show once species selected */}
                {breedOptions.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Breed</Label>
                    <Select value={formData.breed} onValueChange={v => setField("breed", v)}>
                      <SelectTrigger><SelectValue placeholder="Select breed" /></SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {breedOptions.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Sex / class */}
                {formData.species && (
                  <div className="space-y-1.5">
                    <Label>Sex / class</Label>
                    <Select value={formData.livestock_sex} onValueChange={v => setField("livestock_sex", v)}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {isCattle(formData.species) && <>
                          <SelectItem value="steers">Steers</SelectItem>
                          <SelectItem value="heifers">Heifers</SelectItem>
                          <SelectItem value="cows">Cows</SelectItem>
                          <SelectItem value="bulls">Bulls</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </>}
                        {isLambOrSheep(formData.species) && <>
                          <SelectItem value="wethers">Wethers</SelectItem>
                          <SelectItem value="ewes">Ewes</SelectItem>
                          <SelectItem value="rams">Rams</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </>}
                        {isGoat(formData.species) && <>
                          <SelectItem value="wethers">Wethers</SelectItem>
                          <SelectItem value="does">Does</SelectItem>
                          <SelectItem value="bucks">Bucks</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </>}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Dentition */}
                {formData.species && (
                  <div className="space-y-1.5">
                    <Label>Age / dentition</Label>
                    <Select value={formData.dentition} onValueChange={v => setField("dentition", v)}>
                      <SelectTrigger><SelectValue placeholder="Select dentition" /></SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {isCattle(formData.species) && <>
                          <SelectItem value="milk_teeth">Milk teeth (0 tooth)</SelectItem>
                          <SelectItem value="2_tooth">2 tooth</SelectItem>
                          <SelectItem value="4_tooth">4 tooth</SelectItem>
                          <SelectItem value="6_tooth">6 tooth</SelectItem>
                          <SelectItem value="full_mouth">Full mouth (8 tooth)</SelectItem>
                          <SelectItem value="mixed">Mixed ages</SelectItem>
                        </>}
                        {isLambOrSheep(formData.species) && <>
                          <SelectItem value="lamb">Lamb (milk teeth)</SelectItem>
                          <SelectItem value="hogget">Hogget (2 tooth)</SelectItem>
                          <SelectItem value="2_tooth">2 tooth</SelectItem>
                          <SelectItem value="4_tooth">4 tooth</SelectItem>
                          <SelectItem value="6_tooth">6 tooth</SelectItem>
                          <SelectItem value="full_mouth">Full mouth</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </>}
                        {isGoat(formData.species) && <>
                          <SelectItem value="kid">Kid</SelectItem>
                          <SelectItem value="yearling">Yearling</SelectItem>
                          <SelectItem value="adult">Adult</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </>}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Est. average live weight (kg)</Label>
                  <Input
                    type="number" min={1}
                    value={formData.est_avg_live_wt}
                    onChange={e => setField("est_avg_live_wt", e.target.value)}
                    placeholder="e.g. 520"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Lot ID</Label>
                  <Input value={formData.lot_id}
                    onChange={e => setField("lot_id", e.target.value)}
                    placeholder="Optional lot identifier" />
                </div>
                {plants.length > 1 && (
                  <div className="space-y-1.5">
                    <Label>Plant</Label>
                    <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                      <SelectTrigger><SelectValue placeholder="Select plant" /></SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {plants.map(p => <SelectItem key={p.id} value={p.id}>{p.plant_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── SECTION C: Kill slot ───────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Section C — Requested kill slot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Requested kill date *</Label>
                  <Input
                    type="date"
                    value={formData.requested_kill_date}
                    onChange={e => setField("requested_kill_date", e.target.value)}
                    className={errors.requested_kill_date ? "border-destructive" : ""}
                  />
                  {errors.requested_kill_date && <p className="text-xs text-destructive">{errors.requested_kill_date}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Preferred arrival slot</Label>
                  <Select value={formData.arrival_slot} onValueChange={v => setField("arrival_slot", v)}>
                    <SelectTrigger><SelectValue placeholder="Select slot (optional)" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50 max-h-48 overflow-y-auto">
                      {ARRIVAL_SLOTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Plant will confirm or adjust</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── SECTION D: Feed declaration ───────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Leaf className="h-4 w-4 text-emerald-600" />
                Section D — Feed &amp; production declaration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Feed type *</Label>
                  <Select value={formData.feed_type} onValueChange={v => {
                    setField("feed_type", v);
                    if (v !== "grain") { setField("days_on_feed", ""); setField("nfas_accreditation", ""); }
                  }}>
                    <SelectTrigger className={errors.feed_type ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select feed type" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="pasture">Pasture / grass fed</SelectItem>
                      <SelectItem value="grain">Grain fed (feedlot)</SelectItem>
                      <SelectItem value="mixed">Mixed — pasture and grain</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.feed_type && <p className="text-xs text-destructive">{errors.feed_type}</p>}
                </div>
                {formData.feed_type === "grain" && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Days on feed</Label>
                      <Input type="number" min={0}
                        value={formData.days_on_feed}
                        onChange={e => setField("days_on_feed", e.target.value)}
                        placeholder="e.g. 100" />
                      <p className="text-xs text-muted-foreground">Required for grain-fed program eligibility</p>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>NFAS feedlot accreditation number</Label>
                      <Input value={formData.nfas_accreditation}
                        onChange={e => setField("nfas_accreditation", e.target.value)}
                        placeholder="NFAS-XXXXX" className="font-mono" />
                      <p className="text-xs text-muted-foreground">National Feedlot Accreditation Scheme — required for grain-fed certification</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── SECTION E: Compliance declarations ────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Section E — Compliance declarations *
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* HGP */}
              <div className="space-y-1.5">
                <Label>HGP (Hormone Growth Promotant) status *</Label>
                <Select value={formData.hgp_status} onValueChange={v => setField("hgp_status", v)}>
                  <SelectTrigger className={errors.hgp_status ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select HGP status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="nil">HGP-Free — no hormone treatments ever</SelectItem>
                    <SelectItem value="implanted">HGP-Treated — implants used, withholding complete</SelectItem>
                    <SelectItem value="under_withholding">HGP-Treated — currently in withholding period</SelectItem>
                  </SelectContent>
                </Select>
                {errors.hgp_status && <p className="text-xs text-destructive">{errors.hgp_status}</p>}
                {formData.hgp_status === "under_withholding" && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                    <strong>Note:</strong> Animals in withholding must kill after HGP-free animals on the same chain. Your slot may be adjusted.
                  </div>
                )}
                {formData.hgp_status === "nil" && (
                  <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
                    HGP-free status supports EU market eligibility and premium programs.
                  </div>
                )}
              </div>

              {/* Mulesing — sheep/lamb only */}
              {isLambOrSheep(formData.species) && (
                <div className="space-y-1.5">
                  <Label>Mulesing status * <span className="font-normal text-muted-foreground">(lamb/sheep)</span></Label>
                  <Select value={formData.mulesing_status} onValueChange={v => setField("mulesing_status", v)}>
                    <SelectTrigger className={errors.mulesing_status ? "border-destructive" : ""}>
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
                  <p className="text-xs text-muted-foreground">Required for EU/UK market access and MSA eligibility</p>
                </div>
              )}

              {/* Program eligibility checkboxes */}
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium text-foreground">Program eligibility</p>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="eu_eligible"
                    checked={formData.eu_eligible}
                    onCheckedChange={v => setField("eu_eligible", !!v)}
                  />
                  <div>
                    <Label htmlFor="eu_eligible" className="font-normal cursor-pointer">
                      EU market eligible
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Animals are HGP-free, LPA accredited, and meet EU residue requirements
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="msa_declaration"
                    checked={formData.msa_declaration}
                    onCheckedChange={v => setField("msa_declaration", !!v)}
                  />
                  <div>
                    <Label htmlFor="msa_declaration" className="font-normal cursor-pointer">
                      MSA vendor declaration
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Animals meet MSA eligibility — I declare the MSA Producer Vendor Declaration conditions
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── SECTION F: Health declarations ────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-500" />
                Section F — Health declarations *
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="notifiable_disease_free"
                    checked={formData.notifiable_disease_free}
                    onCheckedChange={v => setField("notifiable_disease_free", !!v)}
                  />
                  <div>
                    <Label htmlFor="notifiable_disease_free" className={`font-normal cursor-pointer ${errors.notifiable_disease_free ? "text-destructive" : ""}`}>
                      I declare these animals are free from notifiable diseases *
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Including Johne's disease, footrot, ovine brucellosis, bovine brucellosis, and other declared diseases
                    </p>
                    {errors.notifiable_disease_free && <p className="text-xs text-destructive mt-0.5">{errors.notifiable_disease_free}</p>}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="vet_treatment_60d"
                    checked={formData.vet_treatment_60d}
                    onCheckedChange={v => setField("vet_treatment_60d", !!v)}
                  />
                  <div>
                    <Label htmlFor="vet_treatment_60d" className="font-normal cursor-pointer">
                      These animals have received veterinary treatment in the past 60 days
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      If checked, provide details in the notes section below
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="withholding_compliant"
                    checked={formData.withholding_compliant}
                    onCheckedChange={v => setField("withholding_compliant", !!v)}
                  />
                  <div>
                    <Label htmlFor="withholding_compliant" className={`font-normal cursor-pointer ${errors.withholding_compliant ? "text-destructive" : ""}`}>
                      All chemical and veterinary withholding periods are complete *
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      All drenches, dips, vaccines, and treatments have met their withholding period
                    </p>
                    {errors.withholding_compliant && <p className="text-xs text-destructive mt-0.5">{errors.withholding_compliant}</p>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Notes ─────────────────────────────────────────────────── */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-1.5">
                <Label>Additional notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={e => setField("notes", e.target.value)}
                  placeholder="Vet treatment details, special requirements, health declarations, or other relevant information…"
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Vendor declaration sign-off ───────────────────────────── */}
          <Card className={errors.vendor_declaration_signed ? "border-destructive" : "border-primary/30 bg-primary/5"}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="vendor_declaration_signed"
                  checked={formData.vendor_declaration_signed}
                  onCheckedChange={v => setField("vendor_declaration_signed", !!v)}
                />
                <div>
                  <Label htmlFor="vendor_declaration_signed" className={`font-semibold cursor-pointer ${errors.vendor_declaration_signed ? "text-destructive" : ""}`}>
                    <ShieldCheck className="h-4 w-4 inline mr-1.5 text-primary" />
                    I sign this vendor declaration *
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    I declare that the information provided in this form is true and correct to the best of my
                    knowledge. I understand this declaration forms part of the electronic National Vendor
                    Declaration (eNVD) and that providing false information is an offence under state and
                    territory livestock legislation. I authorise Muster to submit this declaration to the
                    plant on my behalf and to record the associated NLIS movement.
                  </p>
                  {errors.vendor_declaration_signed && <p className="text-xs text-destructive mt-1">{errors.vendor_declaration_signed}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting declaration…</>
            ) : (
              "Submit booking request & vendor declaration"
            )}
          </Button>

        </form>
      </div>
    </DashboardLayout>
  );
}
