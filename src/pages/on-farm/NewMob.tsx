import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  CATEGORY_LABELS, PROGRAM_LABELS, EXIT_PATH_LABELS,
  type MobCategory, type ProgramType, type ExitPath,
} from "@/components/on-farm/types";
import { ArrowLeft, Beef } from "lucide-react";

const CATTLE_CATEGORIES: MobCategory[] = [
  "boner_cow", "lot_fed", "backgrounder", "weaner", "breeder", "trade", "bull", "cull_cow",
];

const SHEEP_CATEGORIES: MobCategory[] = [
  "trade_lamb", "heavy_lamb", "merino_lamb", "ewe", "wether", "hogget",
];

export default function NewMob() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    species: "cattle" as "cattle" | "sheep",
    mob_name: "",
    category: "" as MobCategory | "",
    breed_type: "",
    head_count: "",
    purchase_date: new Date().toISOString().split("T")[0],
    purchase_price_per_head: "",
    purchase_cents_per_kg: "",
    purchase_weight_avg_kg: "",
    shrink_pct: "4",
    source_type: "",
    source_name: "",
    agent_name: "",
    agent_commission_pct: "",
    location_name: "",
    program_type: "" as ProgramType | "",
    target_exit_path: "" as ExitPath | "",
    target_exit_date: "",
    target_weight_kg: "",
    hgp_free: false,
    msa_eligible: false,
    halal_certified: false,
    nlis_confirmed: false,
    nvd_received: false,
    notes: "",
  });

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const setSpecies = (species: "cattle" | "sheep") => {
    setForm(f => ({ ...f, species, category: "" }));
  };

  const isSheep = form.species === "sheep";
  const categoryList = isSheep ? SHEEP_CATEGORIES : CATTLE_CATEGORIES;

  const arrivalWeight = form.purchase_weight_avg_kg && form.shrink_pct
    ? (parseFloat(form.purchase_weight_avg_kg) * (1 - parseFloat(form.shrink_pct) / 100)).toFixed(1)
    : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.mob_name || !form.category || !form.head_count || !form.purchase_date) {
      toast({ title: "Missing required fields", description: "Name, category, head count, and purchase date are required.", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload: Record<string, unknown> = {
      species: form.species,
      mob_name: form.mob_name,
      category: form.category,
      breed_type: form.breed_type || null,
      head_count: parseInt(form.head_count),
      purchase_date: form.purchase_date,
      purchase_price_per_head: form.purchase_price_per_head ? parseFloat(form.purchase_price_per_head) : null,
      purchase_cents_per_kg: form.purchase_cents_per_kg ? parseFloat(form.purchase_cents_per_kg) : null,
      purchase_weight_avg_kg: form.purchase_weight_avg_kg ? parseFloat(form.purchase_weight_avg_kg) : null,
      shrink_pct: form.shrink_pct ? parseFloat(form.shrink_pct) : 4,
      arrival_weight_avg_kg: arrivalWeight ? parseFloat(arrivalWeight) : null,
      source_type: form.source_type || null,
      source_name: form.source_name || null,
      agent_name: form.agent_name || null,
      agent_commission_pct: form.agent_commission_pct ? parseFloat(form.agent_commission_pct) : null,
      location_name: form.location_name || null,
      program_type: form.program_type || null,
      target_exit_path: form.target_exit_path || null,
      target_exit_date: form.target_exit_date || null,
      target_weight_kg: form.target_weight_kg ? parseFloat(form.target_weight_kg) : null,
      hgp_free: form.hgp_free,
      msa_eligible: form.msa_eligible,
      halal_certified: form.halal_certified,
      nlis_confirmed: form.nlis_confirmed,
      nvd_received: form.nvd_received,
      notes: form.notes || null,
      status: "active",
    };

    const { data, error } = await supabase.from("mobs").insert(payload).select("id").single();
    setSaving(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // Auto-create purchase cost entry
    if (payload.purchase_price_per_head || (payload.purchase_cents_per_kg && payload.purchase_weight_avg_kg)) {
      const totalPurchase = payload.purchase_price_per_head
        ? (payload.purchase_price_per_head as number) * parseInt(form.head_count)
        : ((payload.purchase_cents_per_kg as number) / 100) * (payload.purchase_weight_avg_kg as number) * parseInt(form.head_count);

      await supabase.from("mob_costs").insert({
        mob_id: data.id,
        cost_date: form.purchase_date,
        cost_type: "purchase",
        description: `Purchase — ${form.source_name || form.source_type || "direct"}`,
        amount_total: totalPurchase,
        per_head: totalPurchase / parseInt(form.head_count),
        head_count: parseInt(form.head_count),
      });

      // MLA levy $5/head
      await supabase.from("mob_costs").insert({
        mob_id: data.id,
        cost_date: form.purchase_date,
        cost_type: "mla_levy",
        description: "MLA transaction levy",
        amount_total: 5 * parseInt(form.head_count),
        per_head: 5,
        head_count: parseInt(form.head_count),
      });

      // Agent commission
      if (form.agent_commission_pct) {
        const commAmt = totalPurchase * parseFloat(form.agent_commission_pct) / 100;
        await supabase.from("mob_costs").insert({
          mob_id: data.id,
          cost_date: form.purchase_date,
          cost_type: "agent_commission",
          description: `Agent commission ${form.agent_commission_pct}%`,
          amount_total: commAmt,
          per_head: commAmt / parseInt(form.head_count),
          head_count: parseInt(form.head_count),
        });
      }
    }

    toast({ title: "Mob created", description: `${form.mob_name} added successfully.` });
    navigate(`/on-farm/mobs/${data.id}`);
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/on-farm")} className="gap-1 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> On Farm
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {isSheep
            ? <span className="text-lg leading-none">🐑</span>
            : <Beef className="h-5 w-5 text-primary" />
          }
          <h1 className="text-xl font-bold">New Mob</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic info */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Mob Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">

              {/* Species toggle */}
              <div className="flex rounded-full border overflow-hidden w-fit">
                <button
                  type="button"
                  onClick={() => setSpecies("cattle")}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    !isSheep
                      ? "bg-amber-100 text-amber-800 font-bold"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  🐄 Cattle
                </button>
                <button
                  type="button"
                  onClick={() => setSpecies("sheep")}
                  className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                    isSheep
                      ? "bg-green-100 text-green-800 font-bold"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  🐑 Sheep & Lamb
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Mob Name <span className="text-destructive">*</span></Label>
                  <Input placeholder="e.g. NSW Weaners May 25, Boner Cows Lot 3" value={form.mob_name} onChange={e => set("mob_name", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Category <span className="text-destructive">*</span></Label>
                  <Select value={form.category} onValueChange={v => set("category", v)}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categoryList.map(v => (
                        <SelectItem key={v} value={v}>{CATEGORY_LABELS[v]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Breed / Type</Label>
                  <Input
                    placeholder={isSheep ? "e.g. Merino, Dorper, White Suffolk, Crossbred" : "e.g. Angus, Crossbred, Bos Indicus"}
                    value={form.breed_type}
                    onChange={e => set("breed_type", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Head Count <span className="text-destructive">*</span></Label>
                  <Input type="number" min="1" placeholder="e.g. 120" value={form.head_count} onChange={e => set("head_count", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Program</Label>
                  <Select value={form.program_type} onValueChange={v => set("program_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROGRAM_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Location / Property</Label>
                  <Input placeholder="e.g. Home block, Killarook agistment, Dunolly feedlot" value={form.location_name} onChange={e => set("location_name", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchase */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Purchase</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Purchase Date <span className="text-destructive">*</span></Label>
                  <Input type="date" value={form.purchase_date} onChange={e => set("purchase_date", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Source</Label>
                  <Select value={form.source_type} onValueChange={v => set("source_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Where from?" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="saleyard">Saleyard</SelectItem>
                      <SelectItem value="direct">Direct from property</SelectItem>
                      <SelectItem value="auctions_plus">AuctionsPlus</SelectItem>
                      <SelectItem value="stock_live">StockLive</SelectItem>
                      <SelectItem value="agent">Via agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Source Name</Label>
                  <Input placeholder="e.g. Wodonga Saleyards, AuctionsPlus lot 4421" value={form.source_name} onChange={e => set("source_name", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Price per head ($)</Label>
                  <Input type="number" step="0.01" placeholder="e.g. 1200.00" value={form.purchase_price_per_head} onChange={e => set("purchase_price_per_head", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>— or — Price (¢/kg lwt)</Label>
                  <Input type="number" step="0.1" placeholder="e.g. 426" value={form.purchase_cents_per_kg} onChange={e => set("purchase_cents_per_kg", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Avg weight at purchase (kg)</Label>
                  <Input type="number" step="0.1" placeholder="e.g. 320" value={form.purchase_weight_avg_kg} onChange={e => set("purchase_weight_avg_kg", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Transit shrink %</Label>
                  <Input type="number" step="0.1" placeholder={isSheep ? "2" : "4"} value={form.shrink_pct} onChange={e => set("shrink_pct", e.target.value)} />
                </div>
                {arrivalWeight && (
                  <div className="col-span-2 rounded-md bg-muted/40 px-4 py-2 text-sm">
                    <span className="text-muted-foreground">Estimated arrival weight: </span>
                    <span className="font-semibold">{arrivalWeight} kg/head</span>
                    <span className="text-muted-foreground ml-1">(after {form.shrink_pct}% shrink)</span>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Agent name</Label>
                  <Input placeholder="e.g. Elders, Nutrien" value={form.agent_name} onChange={e => set("agent_name", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Agent commission (%)</Label>
                  <Input type="number" step="0.1" placeholder="e.g. 4.5" value={form.agent_commission_pct} onChange={e => set("agent_commission_pct", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exit plan */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Exit Plan</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Target exit path</Label>
                  <Select value={form.target_exit_path} onValueChange={v => set("target_exit_path", v)}>
                    <SelectTrigger><SelectValue placeholder="How do you plan to sell?" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(EXIT_PATH_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Target exit date</Label>
                  <Input type="date" value={form.target_exit_date} onChange={e => set("target_exit_date", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{isSheep ? "Target turn-off weight (kg CW)" : "Target turn-off weight (kg/head)"}</Label>
                  <Input type="number" step="0.1" placeholder="e.g. 420" value={form.target_weight_kg} onChange={e => set("target_weight_kg", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Compliance flags */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Compliance</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "hgp_free", label: "HGP Free (Hormone-free)" },
                  { key: "msa_eligible", label: "MSA Eligible" },
                  { key: "halal_certified", label: "Halal Certified" },
                  { key: "nlis_confirmed", label: "NLIS Confirmed" },
                  { key: "nvd_received", label: "NVD Received" },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={key}
                      checked={form[key as keyof typeof form] as boolean}
                      onCheckedChange={v => set(key, !!v)}
                    />
                    <Label htmlFor={key} className="text-sm font-normal cursor-pointer">{label}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea placeholder="Any additional notes about this mob…" value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 pb-6">
            <Button type="button" variant="outline" onClick={() => navigate("/on-farm")}>Cancel</Button>
            <Button type="submit" disabled={saving} className="flex-1">
              {saving ? "Saving…" : "Create Mob"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
