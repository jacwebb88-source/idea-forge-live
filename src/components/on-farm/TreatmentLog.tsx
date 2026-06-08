import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays, format, parseISO, addDays } from "date-fns";
import { AlertTriangle, CheckCircle, Plus, ShieldAlert, Syringe, Bug, Pill } from "lucide-react";

// ── Australian product library with registered WHP / ESI ──────────────────
export interface Product {
  name: string;
  activeIngredient: string;
  type: "antibiotic" | "vaccine" | "parasite" | "vitamin";
  whpDays: number;  // domestic withholding period (meat)
  esiDays: number;  // export slaughter interval
  notes?: string;
}

export const PRODUCT_LIBRARY: Product[] = [
  // Antibiotics
  { name: "Draxxin (tulathromycin)",   activeIngredient: "Tulathromycin",    type: "antibiotic", whpDays: 49, esiDays: 49, notes: "Single injection. Common metaphylaxis at feedlot induction." },
  { name: "Nuflor (florfenicol)",       activeIngredient: "Florfenicol",      type: "antibiotic", whpDays: 21, esiDays: 28 },
  { name: "Micotil (tilmicosin)",       activeIngredient: "Tilmicosin",       type: "antibiotic", whpDays: 42, esiDays: 42, notes: "Vet prescription only. Fatal to humans — care required." },
  { name: "Excede (ceftiofur)",         activeIngredient: "Ceftiofur",        type: "antibiotic", whpDays: 0,  esiDays: 0,  notes: "Short WHP. Often used at induction." },
  { name: "Engemycin (oxytetracycline)",activeIngredient: "Oxytetracycline",  type: "antibiotic", whpDays: 28, esiDays: 35 },
  { name: "Biomycin (oxytetracycline)", activeIngredient: "Oxytetracycline",  type: "antibiotic", whpDays: 28, esiDays: 35 },
  { name: "Procaine Penicillin",        activeIngredient: "Penicillin G",     type: "antibiotic", whpDays: 28, esiDays: 35 },
  { name: "Tylan 200 (tylosin)",        activeIngredient: "Tylosin",          type: "antibiotic", whpDays: 21, esiDays: 21 },
  { name: "Zactran (gamithromycin)",    activeIngredient: "Gamithromycin",    type: "antibiotic", whpDays: 42, esiDays: 56 },
  { name: "Zuprevo (tildipirosin)",     activeIngredient: "Tildipirosin",     type: "antibiotic", whpDays: 42, esiDays: 56 },
  { name: "Lincocin (lincomycin)",      activeIngredient: "Lincomycin",       type: "antibiotic", whpDays: 14, esiDays: 28 },
  // Parasiticides
  { name: "Ivomec Pour-On (ivermectin)",activeIngredient: "Ivermectin",       type: "parasite",   whpDays: 28, esiDays: 35 },
  { name: "Dectomax Pour-On (doramectin)",activeIngredient: "Doramectin",     type: "parasite",   whpDays: 28, esiDays: 42 },
  { name: "Cydectin Pour-On (moxidectin)",activeIngredient: "Moxidectin",     type: "parasite",   whpDays: 14, esiDays: 28 },
  { name: "Arrest ME (levamisole)",     activeIngredient: "Levamisole",       type: "parasite",   whpDays: 14, esiDays: 28 },
  { name: "Genesis Pour-On",            activeIngredient: "Abamectin",        type: "parasite",   whpDays: 28, esiDays: 35 },
  { name: "Coopers Blowfly Pour-On",    activeIngredient: "Cyromazine",       type: "parasite",   whpDays: 0,  esiDays: 0 },
  // Vaccines
  { name: "Botulinum 3 in 1",          activeIngredient: "Clostridial",      type: "vaccine",    whpDays: 0, esiDays: 0 },
  { name: "5 in 1 Vaccine",            activeIngredient: "Clostridial",      type: "vaccine",    whpDays: 0, esiDays: 0 },
  { name: "7 in 1 Vaccine",            activeIngredient: "Clostridial",      type: "vaccine",    whpDays: 0, esiDays: 0 },
  { name: "Bovilis MH+IBR",            activeIngredient: "IBR/PI3/BVD/BRSV",type: "vaccine",    whpDays: 0, esiDays: 0 },
  { name: "Pestigard (BVD)",           activeIngredient: "BVD",              type: "vaccine",    whpDays: 0, esiDays: 0 },
  { name: "Bovivac S (Leptospirosis)", activeIngredient: "Leptospira",       type: "vaccine",    whpDays: 0, esiDays: 0 },
  // Vitamins / minerals
  { name: "Multimin (copper/zinc/selenium)",activeIngredient: "Trace minerals",type: "vitamin",  whpDays: 0, esiDays: 0 },
  { name: "Vitamin ADE injection",     activeIngredient: "Vitamins A, D, E", type: "vitamin",    whpDays: 0, esiDays: 0 },
  { name: "Selenium injection",        activeIngredient: "Selenium",         type: "vitamin",    whpDays: 28, esiDays: 28 },
];

export interface Treatment {
  id: string;
  mob_id: string;
  treatment_date: string;
  treatment_type: string;
  product_name: string;
  active_ingredient: string | null;
  dose_ml_per_head: number | null;
  head_count_treated: number;
  whp_days: number;
  esi_days: number;
  clearance_date_domestic: string;
  clearance_date_export: string;
  treated_by: string | null;
  vet_name: string | null;
  notes: string | null;
}

// ── Clearance status for a mob given target exit date ─────────────────────
export function getClearanceStatus(treatments: Treatment[], targetExitDate: string | null) {
  if (!treatments.length) return { clear: true, blockers: [] };
  const exitDate = targetExitDate ? parseISO(targetExitDate) : new Date();
  const blockers: { product: string; clearanceDomestic: string; clearanceExport: string; daysToGo: number }[] = [];
  for (const t of treatments) {
    if (t.whp_days === 0 && t.esi_days === 0) continue;
    const domesticClear = parseISO(t.clearance_date_domestic);
    const daysToGo = differenceInDays(domesticClear, exitDate);
    if (daysToGo > 0) {
      blockers.push({
        product: t.product_name,
        clearanceDomestic: t.clearance_date_domestic,
        clearanceExport: t.clearance_date_export,
        daysToGo,
      });
    }
  }
  return { clear: blockers.length === 0, blockers };
}

// ── Type icons ────────────────────────────────────────────────────────────
function TypeIcon({ type }: { type: string }) {
  if (type === "antibiotic") return <ShieldAlert className="h-4 w-4 text-red-500" />;
  if (type === "parasite")   return <Bug className="h-4 w-4 text-orange-500" />;
  if (type === "vaccine")    return <Syringe className="h-4 w-4 text-blue-500" />;
  return <Pill className="h-4 w-4 text-purple-500" />;
}

// ── Add Treatment Dialog ──────────────────────────────────────────────────
export function AddTreatmentDialog({ open, onClose, mobId, headCount, targetExitDate, onSaved }: {
  open: boolean; onClose: () => void; mobId: string;
  headCount: number; targetExitDate: string | null; onSaved: () => void;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [useLibrary, setUseLibrary] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [form, setForm] = useState({
    treatment_date: new Date().toISOString().split("T")[0],
    treatment_type: "antibiotic",
    product_name: "",
    active_ingredient: "",
    dose_ml_per_head: "",
    head_count_treated: String(headCount),
    whp_days: "0",
    esi_days: "0",
    treated_by: "",
    vet_name: "",
    notes: "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  function pickProduct(name: string) {
    const p = PRODUCT_LIBRARY.find(x => x.name === name);
    if (!p) return;
    setSelectedProduct(p);
    setForm(f => ({
      ...f,
      product_name: p.name,
      active_ingredient: p.activeIngredient,
      treatment_type: p.type,
      whp_days: String(p.whpDays),
      esi_days: String(p.esiDays),
    }));
  }

  // Preview clearance dates
  const domesticClear = form.treatment_date && form.whp_days
    ? format(addDays(parseISO(form.treatment_date), parseInt(form.whp_days) || 0), "d MMM yyyy")
    : null;
  const exportClear = form.treatment_date && form.esi_days
    ? format(addDays(parseISO(form.treatment_date), parseInt(form.esi_days) || 0), "d MMM yyyy")
    : null;

  const exitConflict = targetExitDate && domesticClear
    ? differenceInDays(addDays(parseISO(form.treatment_date), parseInt(form.whp_days) || 0), parseISO(targetExitDate)) > 0
    : false;

  async function handleSave() {
    if (!form.product_name || !form.treatment_date) {
      toast({ title: "Missing fields", description: "Product name and date are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("mob_treatments").insert({
      mob_id: mobId,
      treatment_date: form.treatment_date,
      treatment_type: form.treatment_type,
      product_name: form.product_name,
      active_ingredient: form.active_ingredient || null,
      dose_ml_per_head: form.dose_ml_per_head ? parseFloat(form.dose_ml_per_head) : null,
      head_count_treated: parseInt(form.head_count_treated) || headCount,
      whp_days: parseInt(form.whp_days) || 0,
      esi_days: parseInt(form.esi_days) || 0,
      treated_by: form.treated_by || null,
      vet_name: form.vet_name || null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Treatment logged", description: `${form.product_name} recorded.` });
      onSaved();
      onClose();
    }
  }

  const antibiotics = PRODUCT_LIBRARY.filter(p => p.type === "antibiotic");
  const parasites   = PRODUCT_LIBRARY.filter(p => p.type === "parasite");
  const vaccines    = PRODUCT_LIBRARY.filter(p => p.type === "vaccine");
  const vitamins    = PRODUCT_LIBRARY.filter(p => p.type === "vitamin");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Log Treatment</DialogTitle></DialogHeader>

        <div className="space-y-4">
          {/* Library vs manual */}
          <div className="flex rounded-lg overflow-hidden border w-fit">
            <button type="button" onClick={() => setUseLibrary(true)}
              className={`px-4 py-1.5 text-sm font-semibold transition-colors ${useLibrary ? "bg-primary text-primary-foreground" : "bg-white text-muted-foreground"}`}>
              Product library
            </button>
            <button type="button" onClick={() => setUseLibrary(false)}
              className={`px-4 py-1.5 text-sm font-semibold transition-colors ${!useLibrary ? "bg-primary text-primary-foreground" : "bg-white text-muted-foreground"}`}>
              Enter manually
            </button>
          </div>

          {useLibrary && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select product</Label>
              <Select onValueChange={pickProduct}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Search products…" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <div className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wide">Antibiotics</div>
                  {antibiotics.map(p => <SelectItem key={p.name} value={p.name}>{p.name} — WHP {p.whpDays}d</SelectItem>)}
                  <div className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wide border-t mt-1">Parasiticides</div>
                  {parasites.map(p => <SelectItem key={p.name} value={p.name}>{p.name} — WHP {p.whpDays}d</SelectItem>)}
                  <div className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wide border-t mt-1">Vaccines</div>
                  {vaccines.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                  <div className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wide border-t mt-1">Vitamins / Minerals</div>
                  {vitamins.map(p => <SelectItem key={p.name} value={p.name}>{p.name} — WHP {p.whpDays}d</SelectItem>)}
                </SelectContent>
              </Select>
              {selectedProduct?.notes && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠️ {selectedProduct.notes}
                </p>
              )}
            </div>
          )}

          {!useLibrary && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Product name</Label>
              <Input value={form.product_name} onChange={e => set("product_name", e.target.value)} placeholder="e.g. Draxxin" className="rounded-xl" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Treatment date</Label>
              <Input type="date" value={form.treatment_date} onChange={e => set("treatment_date", e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Head count treated</Label>
              <Input type="number" value={form.head_count_treated} onChange={e => set("head_count_treated", e.target.value)} className="rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">WHP — domestic (days)</Label>
              <Input type="number" value={form.whp_days} onChange={e => set("whp_days", e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">ESI — export (days)</Label>
              <Input type="number" value={form.esi_days} onChange={e => set("esi_days", e.target.value)} className="rounded-xl" />
            </div>
          </div>

          {/* Clearance date preview */}
          {(domesticClear || exportClear) && (parseInt(form.whp_days) > 0 || parseInt(form.esi_days) > 0) && (
            <div className={`rounded-xl border-2 px-4 py-3 space-y-1 ${exitConflict ? "border-red-300 bg-red-50" : "border-green-200 bg-green-50"}`}>
              {exitConflict && (
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-xs font-bold text-red-700">WHP conflict — not clear by target exit date</p>
                </div>
              )}
              {domesticClear && parseInt(form.whp_days) > 0 && (
                <p className="text-xs"><span className="font-semibold">Domestic clearance:</span> {domesticClear} ({form.whp_days} days)</p>
              )}
              {exportClear && parseInt(form.esi_days) > 0 && (
                <p className="text-xs"><span className="font-semibold">Export clearance (ESI):</span> {exportClear} ({form.esi_days} days)</p>
              )}
              {targetExitDate && (
                <p className="text-xs text-muted-foreground">Target exit: {format(parseISO(targetExitDate), "d MMM yyyy")}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Dose (ml/head)</Label>
              <Input type="number" step={0.1} value={form.dose_ml_per_head} onChange={e => set("dose_ml_per_head", e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Treated by</Label>
              <Input value={form.treated_by} onChange={e => set("treated_by", e.target.value)} placeholder="Stockman / vet" className="rounded-xl" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} className="rounded-xl" placeholder="Batch number, reason for treatment, observations…" />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving…" : "Log treatment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Treatment list for mob detail ─────────────────────────────────────────
export function TreatmentList({ mobId, targetExitDate, onAddClick }: {
  mobId: string; targetExitDate: string | null; onAddClick: () => void;
}) {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchTreatments() {
    const { data } = await (supabase as any)
      .from("mob_treatments")
      .select("*")
      .eq("mob_id", mobId)
      .order("treatment_date", { ascending: false });
    setTreatments((data ?? []) as Treatment[]);
    setLoading(false);
  }

  useEffect(() => { fetchTreatments(); }, [mobId]);

  const { clear, blockers } = getClearanceStatus(treatments, targetExitDate);
  const today = new Date();

  return (
    <div className="space-y-4">
      {/* Clearance status banner */}
      {treatments.some(t => t.whp_days > 0 || t.esi_days > 0) && (
        <div className={`rounded-xl border-2 px-4 py-3 flex items-start gap-3 ${clear ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
          {clear
            ? <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            : <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
          <div>
            {clear ? (
              <p className="text-sm font-bold text-green-800">All treatments cleared — mob is eligible for sale</p>
            ) : (
              <>
                <p className="text-sm font-bold text-red-800">WHP not cleared — {blockers.length} treatment{blockers.length > 1 ? "s" : ""} outstanding</p>
                {blockers.map(b => (
                  <p key={b.product} className="text-xs text-red-700 mt-1">
                    {b.product} — domestic clear {format(parseISO(b.clearanceDomestic), "d MMM")} · export clear {format(parseISO(b.clearanceExport), "d MMM")} · {b.daysToGo}d overdue at target exit
                  </p>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Add button */}
      <Button variant="outline" onClick={onAddClick} className="gap-2 w-full">
        <Plus className="h-4 w-4" /> Log treatment / induction event
      </Button>

      {/* Treatment list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : treatments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No treatments logged yet.</p>
      ) : (
        <div className="space-y-2">
          {treatments.map(t => {
            const domesticClear = parseISO(t.clearance_date_domestic);
            const exportClear = parseISO(t.clearance_date_export);
            const domesticDaysLeft = differenceInDays(domesticClear, today);
            const isActive = domesticDaysLeft > 0;

            return (
              <div key={t.id} className={`rounded-xl border px-4 py-3 ${isActive && t.whp_days > 0 ? "border-amber-200 bg-amber-50" : "bg-white"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <TypeIcon type={t.treatment_type} />
                    <div>
                      <p className="font-semibold text-sm">{t.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(t.treatment_date), "d MMM yyyy")} · {t.head_count_treated} head
                        {t.active_ingredient ? ` · ${t.active_ingredient}` : ""}
                        {t.dose_ml_per_head ? ` · ${t.dose_ml_per_head}ml/hd` : ""}
                      </p>
                      {t.notes && <p className="text-xs text-muted-foreground mt-0.5">{t.notes}</p>}
                    </div>
                  </div>
                  {t.whp_days > 0 && (
                    <div className="text-right shrink-0">
                      {isActive ? (
                        <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          {domesticDaysLeft}d to clear
                        </span>
                      ) : (
                        <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Cleared
                        </span>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Dom. {format(domesticClear, "d MMM")} · ESI {format(exportClear, "d MMM")}
                      </p>
                    </div>
                  )}
                  {t.whp_days === 0 && (
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">No WHP</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
