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
import { Plus, Trash2, Grid3X3, Star } from "lucide-react";
import { format } from "date-fns";

function fmt(n: number) { return n.toFixed(0); }

export default function ProcessorGrids() {
  const { grids, loading, refetch } = useProcessorGrids();
  const [showAdd, setShowAdd] = useState(false);
  const { toast } = useToast();

  async function deleteGrid(id: string) {
    const { error } = await supabase.from("processor_grids").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Grid deleted" });
    refetch();
  }

  // Group by processor name
  const grouped: Record<string, ProcessorGrid[]> = {};
  grids.forEach(g => {
    if (!grouped[g.processor_name]) grouped[g.processor_name] = [];
    grouped[g.processor_name].push(g);
  });

  const bestPrice = grids.length ? Math.max(...grids.map(g => g.price_cpkg_cw)) : 0;

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

        {/* Summary strip */}
        {grids.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Processors", value: Object.keys(grouped).length },
              { label: "Grid entries", value: grids.length },
              { label: "Best price (¢/kg CW)", value: bestPrice },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="px-4 py-3 text-center">
                  <p className="text-muted-foreground text-xs">{label}</p>
                  <p className="font-bold text-xl">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Grid table */}
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted/40" />)}
          </div>
        ) : grids.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-green-200 bg-green-50 py-12 text-center">
            <Grid3X3 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-green-900/60 text-sm">No processor grids yet. Add one to compare kill prices.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowAdd(true)}>
              Add first grid
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(grouped).map(([processorName, rows]) => (
              <div key={processorName}>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">{processorName}</p>
                <Card className="overflow-hidden rounded-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/20 text-xs text-muted-foreground">
                          <th className="text-left px-4 py-3">Spec / Description</th>
                          <th className="text-center px-3 py-3">Grade</th>
                          <th className="text-center px-3 py-3">Fat Score</th>
                          <th className="text-center px-3 py-3">Weight Range</th>
                          <th className="text-right px-4 py-3">Base ¢/kg CW</th>
                          <th className="text-right px-3 py-3">HGP Free +</th>
                          <th className="text-right px-3 py-3">MSA +</th>
                          <th className="text-right px-3 py-3">Effective</th>
                          <th className="px-3 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rows.map(g => {
                          const isBest = g.price_cpkg_cw === bestPrice;
                          return (
                            <tr key={g.id} className={`hover:bg-muted/10 ${isBest ? "bg-green-50/50" : ""}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {isBest && <Star className="h-3.5 w-3.5 text-green-600 fill-green-600 shrink-0" />}
                                  <span className="font-medium">{g.description ?? "—"}</span>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-center">
                                {g.grade ? <Badge variant="outline" className="text-xs">{g.grade}</Badge> : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="px-3 py-3 text-center text-muted-foreground text-xs">{g.fat_score ?? "—"}</td>
                              <td className="px-3 py-3 text-center text-muted-foreground text-xs">
                                {g.weight_min_kg && g.weight_max_kg ? `${g.weight_min_kg}–${g.weight_max_kg}kg` : "—"}
                              </td>
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
            ))}
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
              onClick={save}
              disabled={saving || !form.processor_name || !form.price_cpkg_cw}
              className="flex-1 rounded-xl bg-gradient-to-r from-green-700 to-emerald-800 text-white hover:opacity-90 font-bold"
            >
              {saving ? "Saving…" : "Add Grid"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
