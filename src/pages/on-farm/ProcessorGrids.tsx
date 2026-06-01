import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProcessorGrids, type ProcessorGrid } from "@/components/on-farm/useMobs";
import { Plus, Trash2, Grid3X3, Star, Building2, TrendingUp } from "lucide-react";
import { format } from "date-fns";

function fmt(n: number) { return n.toFixed(0); }

export default function ProcessorGrids() {
  const { grids, loading, refetch } = useProcessorGrids();
  const [showAdd, setShowAdd] = useState(false);
  const [activeSpecies, setActiveSpecies] = useState("Beef");
  const { toast } = useToast();

  async function deleteGrid(id: string) {
    const { error } = await supabase.from("processor_grids").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Grid deleted" });
    refetch();
  }

  const filteredGrids = grids.filter(g => (g as any).species === activeSpecies || (!((g as any).species) && activeSpecies === "Beef"));

  // Group by processor name
  const grouped: Record<string, ProcessorGrid[]> = {};
  filteredGrids.forEach(g => {
    if (!grouped[g.processor_name]) grouped[g.processor_name] = [];
    grouped[g.processor_name].push(g);
  });

  const bestPrice = filteredGrids.length ? Math.max(...filteredGrids.map(g => g.price_cpkg_cw)) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Processor Grids</h1>
            <p className="text-muted-foreground mt-1">Weekly kill grid prices from Australian processors</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowAdd(true)}
              className="bg-white text-green-800 hover:bg-white/90 font-bold rounded-xl gap-2"
            >
              <Plus className="h-4 w-4" /> Add Grid
            </Button>
          </div>
        </div>

        {/* Species tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSpecies("Beef")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeSpecies === "Beef" ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"}`}
          >
            🐄 Cattle
          </button>
          <button
            onClick={() => setActiveSpecies("Sheep")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${activeSpecies === "Sheep" ? "bg-blue-100 text-blue-800 border border-blue-300" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"}`}
          >
            🐑 Sheep & Lamb
          </button>
        </div>

        {activeSpecies === "Sheep" && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-800">
            Dressing percentage for lambs is typically 46–50% (vs 52–56% for cattle). Grid prices shown are ¢/kg carcase weight (CW).
          </div>
        )}

        {/* Summary strip */}
        {filteredGrids.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Processors</p>
                    <p className="text-2xl font-bold leading-tight">{Object.keys(grouped).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                    <Grid3X3 className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Grid entries</p>
                    <p className="text-2xl font-bold leading-tight">{filteredGrids.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Best price (¢/kg CW)</p>
                    <p className="text-2xl font-bold leading-tight">{bestPrice}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Grid table */}
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted/40" />)}
          </div>
        ) : filteredGrids.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-green-200 bg-green-50 py-12 text-center">
            <Grid3X3 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-green-900/60 text-sm">No processor grids yet. Add one to compare kill prices.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowAdd(true)}>
              Add first grid
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* State filter tabs */}
            {(() => {
              const states = Array.from(new Set(filteredGrids.map(g => (g as any).state).filter(Boolean))).sort();
              return states.length > 1 ? (
                <div className="flex gap-2 flex-wrap">
                  {states.map(s => (
                    <Badge key={s} variant="outline" className="cursor-default px-3 py-1 text-xs font-medium">{s}</Badge>
                  ))}
                  <span className="text-xs text-muted-foreground self-center ml-1">— scroll down to filter by state</span>
                </div>
              ) : null;
            })()}

            {/* Data freshness notice */}
            <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-800">
              <span className="font-semibold shrink-0">ℹ Grid data:</span>
              <span>Sourced from Beef Central weekly kill reports (May 2026). Processors do not publish grids publicly — confirmed prices reflect regional market rates. <span className="font-medium">Derived</span> = assigned from regional differential. <span className="font-medium">Estimated</span> = industry-based approximation. Update grids weekly as markets move.</span>
            </div>

            {Object.entries(grouped).map(([processorName, rows]) => {
              const locations = Array.from(new Set(rows.map(r => (r as any).plant_location).filter(Boolean)));
              const states = Array.from(new Set(rows.map(r => (r as any).state).filter(Boolean)));
              return (
              <div key={processorName}>
                <div className="flex items-center gap-3 mb-2 px-1">
                  <p className="text-sm font-bold text-foreground">{processorName}</p>
                  {states.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                  {locations.length === 1 && <span className="text-xs text-muted-foreground">{locations[0]}</span>}
                </div>
                <Card className="overflow-hidden rounded-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/20 text-xs text-muted-foreground">
                          <th className="text-left px-4 py-3">Category</th>
                          <th className="text-left px-3 py-3">Location</th>
                          <th className="text-right px-4 py-3">Base ¢/kg CW</th>
                          <th className="text-right px-3 py-3">HGP Free +</th>
                          <th className="text-right px-3 py-3">MSA +</th>
                          <th className="text-right px-3 py-3">Effective</th>
                          <th className="text-center px-3 py-3">Source</th>
                          <th className="px-3 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rows.map(g => {
                          const isBest = g.price_cpkg_cw === bestPrice;
                          const confidence = (g as any).source_confidence ?? 'confirmed';
                          const confidenceStyle = confidence === 'confirmed' ? 'bg-green-100 text-green-700' : confidence === 'derived' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700';
                          return (
                            <tr key={g.id} className={`hover:bg-muted/10 ${isBest ? "bg-green-50/50" : ""}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {isBest && <Star className="h-3.5 w-3.5 text-green-600 fill-green-600 shrink-0" />}
                                  <span className="font-medium">{g.grade ?? g.description ?? "—"}</span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-xs text-muted-foreground">{(g as any).plant_location ?? "—"}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {isBest && (
                                    <Badge className="bg-green-100 text-green-800 text-xs font-bold border-0">Best</Badge>
                                  )}
                                  <span className="font-bold text-base">{fmt(g.price_cpkg_cw)}¢</span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right text-muted-foreground text-sm">
                                {g.hgp_free_premium_cpkg > 0 ? `+${fmt(g.hgp_free_premium_cpkg)}¢` : "—"}
                              </td>
                              <td className="px-3 py-3 text-right text-muted-foreground text-sm">
                                {g.msa_premium_cpkg > 0 ? `+${fmt(g.msa_premium_cpkg)}¢` : "—"}
                              </td>
                              <td className="px-3 py-3 text-right text-muted-foreground text-xs whitespace-nowrap">
                                {format(new Date(g.effective_date), "d MMM yy")}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${confidenceStyle}`}>
                                  {confidence}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <button
                                  onClick={() => deleteGrid(g.id)}
                                  className="text-muted-foreground/40 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            );
            })}
          </div>
        )}
      </div>

      <AddGridDialog open={showAdd} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); refetch(); }} toast={toast} existingProcessors={Object.keys(grouped)} />
    </DashboardLayout>
  );
}

// ─── Add Grid Dialog ──────────────────────────────────────────────────────────

function AddGridDialog({ open, onClose, onSaved, toast, existingProcessors }: any) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    processor_name: "",
    description: "",
    weight_min_kg: "",
    weight_max_kg: "",
    grade: "A",
    fat_score: "",
    price_cpkg_cw: "",
    hgp_free_premium_cpkg: "0",
    msa_premium_cpkg: "0",
    effective_date: today,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    if (!form.processor_name || !form.price_cpkg_cw) return;
    setSaving(true);
    const { error } = await supabase.from("processor_grids").insert({
      processor_name: form.processor_name,
      description: form.description || null,
      weight_min_kg: form.weight_min_kg ? parseFloat(form.weight_min_kg) : null,
      weight_max_kg: form.weight_max_kg ? parseFloat(form.weight_max_kg) : null,
      grade: form.grade || null,
      fat_score: form.fat_score || null,
      price_cpkg_cw: parseFloat(form.price_cpkg_cw),
      hgp_free_premium_cpkg: parseFloat(form.hgp_free_premium_cpkg) || 0,
      msa_premium_cpkg: parseFloat(form.msa_premium_cpkg) || 0,
      effective_date: form.effective_date,
    });
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Grid added" });
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader><DialogTitle>Add Processor Grid</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Processor Name</Label>
            <Input
              placeholder="e.g. JBS Australia"
              value={form.processor_name}
              onChange={e => set("processor_name", e.target.value)}
              list="existing-processors"
              className="rounded-xl"
            />
            <datalist id="existing-processors">
              {existingProcessors.map((p: string) => <option key={p} value={p} />)}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Description</Label>
            <Input placeholder="e.g. A-grade heavy steer" value={form.description} onChange={e => set("description", e.target.value)} className="rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Min weight (kg)</Label>
              <Input type="number" placeholder="300" value={form.weight_min_kg} onChange={e => set("weight_min_kg", e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Max weight (kg)</Label>
              <Input type="number" placeholder="450" value={form.weight_max_kg} onChange={e => set("weight_max_kg", e.target.value)} className="rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Grade</Label>
              <Input placeholder="A" value={form.grade} onChange={e => set("grade", e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Fat score</Label>
              <Input placeholder="2-4" value={form.fat_score} onChange={e => set("fat_score", e.target.value)} className="rounded-xl" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Base price (¢/kg CW)</Label>
            <Input type="number" step="0.5" placeholder="620" value={form.price_cpkg_cw} onChange={e => set("price_cpkg_cw", e.target.value)} className="rounded-xl font-bold text-lg" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">HGP Free premium (¢/kg)</Label>
              <Input type="number" step="1" placeholder="50" value={form.hgp_free_premium_cpkg} onChange={e => set("hgp_free_premium_cpkg", e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">MSA premium (¢/kg)</Label>
              <Input type="number" step="1" placeholder="24" value={form.msa_premium_cpkg} onChange={e => set("msa_premium_cpkg", e.target.value)} className="rounded-xl" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Effective date</Label>
            <Input type="date" value={form.effective_date} onChange={e => set("effective_date", e.target.value)} className="rounded-xl" />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
            <Button
              variant="default"
              onClick={save}
              disabled={saving || !form.processor_name || !form.price_cpkg_cw}
              className="flex-1 rounded-xl font-bold"
            >
              {saving ? "Saving…" : "Add Grid"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
