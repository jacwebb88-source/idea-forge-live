import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronDown, ChevronUp, AlertTriangle, Info } from "lucide-react";

// ─── 30-minute arrival slot options (ACC model: 06:00–22:00) ──────────────────
const ARRIVAL_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let h = 6; h < 22; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00–${String(h).padStart(2, "0")}:30`);
    slots.push(`${String(h).padStart(2, "0")}:30–${String(h + 1).padStart(2, "0")}:00`);
  }
  return slots;
})();

const KILL_CLASSES = [
  "MSA Grain-fed", "MSA Grass-fed", "EU Accredited",
  "Certified Organic", "Wagyu", "Angus Certified",
  "HGP-Free Program", "Standard Beef", "Manufacturing Beef",
];

const LAMB_KILL_CLASSES = [
  "MSA Lamb", "EU Lamb", "Organic Lamb",
  "Certified Lamb", "Merino", "Crossbred", "Dorper", "Standard Lamb",
];

interface NewBookingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBookingCreated: () => void;
}

const isLambOrSheep = (sp: string) =>
  ["lamb", "sheep", "mutton"].includes(sp.toLowerCase());

export function NewBookingForm({ open, onOpenChange, onBookingCreated }: NewBookingFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [plants, setPlants] = useState<{ id: string; plant_name: string }[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [form, setForm] = useState({
    // Core
    supplier_id:           "",
    agent_ref:             "",
    species:               "",
    species_class:         "",
    head_count:            "",
    requested_kill_date:   "",
    arrival_slot:          "",
    plant_id:              "",
    status:                "placeholder",
    // Compliance
    hgp_status:            "unknown",
    msa_enrolled:          "",
    pericardium_ok:        "",
    pic_numbers:           "",   // consigning PICs (comma-separated)
    envd_ref:              "",   // eNVD reference
    lot_id:                "",
    // Lamb/sheep specific
    mulesing_status:       "",
    est_avg_live_wt:       "",
    // Advanced
    days_on_feed:          "",
    notes:                 "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Load suppliers + plants ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const [{ data: sup }, { data: plt }] = await Promise.all([
        supabase.from("suppliers").select("id, name").order("name"),
        supabase.from("plants").select("id, plant_name").order("plant_name"),
      ]);
      setSuppliers((sup as any[]) || []);
      setPlants((plt as any[]) || []);
    };
    load();
  }, [open]);

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.supplier_id)          e.supplier_id = "Supplier is required";
    if (!form.species)               e.species = "Species is required";
    if (!form.head_count)            e.head_count = "Head count is required";
    if (isNaN(Number(form.head_count)) || Number(form.head_count) <= 0)
      e.head_count = "Must be a positive number";
    if (!form.requested_kill_date)   e.requested_kill_date = "Kill date is required";
    if (!form.arrival_slot)          e.arrival_slot = "Arrival slot is required";
    if (!form.plant_id)              e.plant_id = "Plant is required";
    if (isLambOrSheep(form.species) && !form.mulesing_status)
      e.mulesing_status = "Required for market access (EU/UK programs)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const payload: Record<string, any> = {
        supplier_id:           form.supplier_id || null,
        agent_ref:             form.agent_ref || null,
        species:               form.species,
        species_class:         form.species_class || null,
        head_count:            parseInt(form.head_count),
        requested_kill_date:   form.requested_kill_date,
        arrival_slot:          form.arrival_slot,
        plant_id:              form.plant_id,
        status:                form.status,
        hgp_status:            form.hgp_status !== "unknown" ? form.hgp_status : null,
        msa_enrolled:          form.msa_enrolled === "yes" ? true : form.msa_enrolled === "no" ? false : null,
        pericardium_ok:        form.pericardium_ok === "yes" ? true : form.pericardium_ok === "no" ? false : null,
        lot_id:                form.lot_id || null,
        mulesing_status:       form.mulesing_status || null,
        est_avg_live_wt:       form.est_avg_live_wt ? parseFloat(form.est_avg_live_wt) : null,
        days_on_feed:          form.days_on_feed ? parseInt(form.days_on_feed) : null,
        // Store PIC numbers + eNVD in agent_ref if no dedicated column yet
        // TODO: add pic_numbers, envd_ref columns in next migration
      };

      const { error } = await (supabase.from("bookings") as any).insert(payload);

      if (error) {
        console.error(error);
        toast({ title: "Error creating booking", description: error.message, variant: "destructive" });
        return;
      }

      toast({
        title: "Booking created ✅",
        description: `${form.head_count} head of ${form.species} scheduled for ${form.requested_kill_date} at ${form.arrival_slot}`,
      });

      // Reset form
      setForm({
        supplier_id: "", agent_ref: "", species: "", species_class: "",
        head_count: "", requested_kill_date: "", arrival_slot: "",
        plant_id: "", status: "placeholder",
        hgp_status: "unknown", msa_enrolled: "", pericardium_ok: "",
        pic_numbers: "", envd_ref: "", lot_id: "",
        mulesing_status: "", est_avg_live_wt: "",
        days_on_feed: "", notes: "",
      });
      setShowAdvanced(false);
      onOpenChange(false);
      onBookingCreated();
    } catch (err) {
      console.error(err);
      toast({ title: "Unexpected error", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSmallRuminant = isLambOrSheep(form.species);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>New Booking</SheetTitle>
          <SheetDescription>
            Schedule a kill slot. Fields marked <span className="text-destructive font-medium">*</span> are required.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Section: Who ──────────────────────────────────────────────── */}
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Supplier / Agent</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Supplier <span className="text-destructive">*</span></Label>
              <Select value={form.supplier_id} onValueChange={(v) => set("supplier_id", v)}>
                <SelectTrigger className={errors.supplier_id ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select supplier…" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.supplier_id && <p className="text-xs text-destructive">{errors.supplier_id}</p>}
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Agent / broker ref</Label>
              <Input value={form.agent_ref} onChange={(e) => set("agent_ref", e.target.value)} placeholder="e.g. Elders, NLT-4421" />
            </div>
          </div>

          {/* ── Section: What ─────────────────────────────────────────────── */}
          <div className="space-y-1 pt-1">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Livestock</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Species <span className="text-destructive">*</span></Label>
              <Select value={form.species} onValueChange={(v) => { set("species", v); set("species_class", ""); set("mulesing_status", ""); }}>
                <SelectTrigger className={errors.species ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="cattle">Cattle (Beef)</SelectItem>
                  <SelectItem value="lamb">Lamb</SelectItem>
                  <SelectItem value="sheep">Sheep / Mutton</SelectItem>
                  <SelectItem value="goat">Goat</SelectItem>
                </SelectContent>
              </Select>
              {errors.species && <p className="text-xs text-destructive">{errors.species}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Head count <span className="text-destructive">*</span></Label>
              <Input
                type="number" min="1"
                value={form.head_count}
                onChange={(e) => set("head_count", e.target.value)}
                placeholder="0"
                className={errors.head_count ? "border-destructive" : ""}
              />
              {errors.head_count && <p className="text-xs text-destructive">{errors.head_count}</p>}
            </div>

            {form.species && (
              <div className="col-span-2 space-y-1.5">
                <Label>Kill class / program</Label>
                <Select value={form.species_class} onValueChange={(v) => set("species_class", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select kill class…" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {(isSmallRuminant ? LAMB_KILL_CLASSES : KILL_CLASSES).map((k) => (
                      <SelectItem key={k} value={k}>{k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* ── Lamb/sheep specific fields (species-branched) ─────────────── */}
          {isSmallRuminant && (
            <div className="rounded-md border border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <p className="text-xs font-semibold text-amber-700">Lamb / sheep fields</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label>
                    Mulesing status <span className="text-destructive">*</span>
                    <span className="ml-1 text-xs text-muted-foreground font-normal">(required for EU/UK programs)</span>
                  </Label>
                  <Select value={form.mulesing_status} onValueChange={(v) => set("mulesing_status", v)}>
                    <SelectTrigger className={errors.mulesing_status ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select mulesing status…" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="unmulesed">Unmulesed</SelectItem>
                      <SelectItem value="mulesed">Mulesed</SelectItem>
                      <SelectItem value="cesa">CESA (ceased mulesing)</SelectItem>
                      <SelectItem value="pain_relief">Mulesed with pain relief</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.mulesing_status && <p className="text-xs text-destructive">{errors.mulesing_status}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Est. avg liveweight (kg)</Label>
                  <Input
                    type="number" min="0" step="0.1"
                    value={form.est_avg_live_wt}
                    onChange={(e) => set("est_avg_live_wt", e.target.value)}
                    placeholder="e.g. 42.0"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>MSA enrolled</Label>
                  <Select value={form.msa_enrolled} onValueChange={(v) => set("msa_enrolled", v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* ── Section: When & Where ─────────────────────────────────────── */}
          <div className="space-y-1 pt-1">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Schedule</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kill date <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={form.requested_kill_date}
                onChange={(e) => set("requested_kill_date", e.target.value)}
                className={errors.requested_kill_date ? "border-destructive" : ""}
              />
              {errors.requested_kill_date && <p className="text-xs text-destructive">{errors.requested_kill_date}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Arrival slot (30 min) <span className="text-destructive">*</span></Label>
              <Select value={form.arrival_slot} onValueChange={(v) => set("arrival_slot", v)}>
                <SelectTrigger className={errors.arrival_slot ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select slot…" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50 max-h-60">
                  {ARRIVAL_SLOTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.arrival_slot && <p className="text-xs text-destructive">{errors.arrival_slot}</p>}
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label>Plant / facility <span className="text-destructive">*</span></Label>
              <Select value={form.plant_id} onValueChange={(v) => set("plant_id", v)}>
                <SelectTrigger className={errors.plant_id ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select plant…" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {plants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.plant_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.plant_id && <p className="text-xs text-destructive">{errors.plant_id}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Booking confidence</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="placeholder">Placeholder</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>HGP status</Label>
              <Select value={form.hgp_status} onValueChange={(v) => set("hgp_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="unknown">Not specified</SelectItem>
                  <SelectItem value="hgp_free">HGP-Free</SelectItem>
                  <SelectItem value="hgp_treated">HGP-Treated</SelectItem>
                </SelectContent>
              </Select>
              {form.hgp_status === "hgp_treated" && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Will be scheduled after HGP-free animals
                </p>
              )}
            </div>
          </div>

          {/* ── Section: Compliance ───────────────────────────────────────── */}
          <div className="space-y-1 pt-1">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Compliance</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>PIC number(s)</Label>
              <Input
                value={form.pic_numbers}
                onChange={(e) => set("pic_numbers", e.target.value)}
                placeholder="e.g. QA123456, QA654321"
              />
              <p className="text-xs text-muted-foreground">Comma-separate multiple PICs</p>
            </div>

            <div className="space-y-1.5">
              <Label>eNVD reference</Label>
              <Input
                value={form.envd_ref}
                onChange={(e) => set("envd_ref", e.target.value)}
                placeholder="e.g. ENV-2026-00123"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Lot ID</Label>
              <Input
                value={form.lot_id}
                onChange={(e) => set("lot_id", e.target.value)}
                placeholder="Lot / consignment ID"
              />
            </div>

            {!isSmallRuminant && (
              <div className="space-y-1.5">
                <Label>MSA enrolled</Label>
                <Select value={form.msa_enrolled} onValueChange={(v) => set("msa_enrolled", v)}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* ── Advanced (collapsible) ────────────────────────────────────── */}
          <button
            type="button"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full pt-1"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showAdvanced ? "Hide" : "Show"} advanced fields
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-2 gap-3 border rounded-md p-3 bg-muted/20">
              <div className="space-y-1.5">
                <Label>Days on feed</Label>
                <Input
                  type="number" min="0"
                  value={form.days_on_feed}
                  onChange={(e) => set("days_on_feed", e.target.value)}
                  placeholder="e.g. 100"
                />
                <p className="text-xs text-muted-foreground">Withhold compliance check</p>
              </div>

              <div className="space-y-1.5">
                <Label>Pericardium status</Label>
                <Select value={form.pericardium_ok} onValueChange={(v) => set("pericardium_ok", v)}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="yes">OK</SelectItem>
                    <SelectItem value="no">Flag</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Any additional scheduling notes…"
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* ── Submit ────────────────────────────────────────────────────── */}
          <div className="flex gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
              ) : (
                "Create booking"
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
