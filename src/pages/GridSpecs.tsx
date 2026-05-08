import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { FileSpreadsheet, Search, Download, Eye, CheckCircle2, XCircle, Scale, Beef, Layers } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type GridSpec = Tables<"gridspecs">;

// ── Helpers ────────────────────────────────────────────────────────────────────

const speciesColour = (species: string | null) => {
  switch ((species || "").toLowerCase()) {
    case "beef":
    case "cattle": return { border: "border-l-red-500",   bg: "bg-red-50",    badge: "bg-red-100 text-red-800 border-red-200" };
    case "lamb":   return { border: "border-l-blue-500",  bg: "bg-blue-50",   badge: "bg-blue-100 text-blue-800 border-blue-200" };
    case "mutton":
    case "sheep":  return { border: "border-l-indigo-500",bg: "bg-indigo-50", badge: "bg-indigo-100 text-indigo-800 border-indigo-200" };
    case "goat":   return { border: "border-l-amber-500", bg: "bg-amber-50",  badge: "bg-amber-100 text-amber-800 border-amber-200" };
    default:       return { border: "border-l-gray-400",  bg: "bg-gray-50",   badge: "bg-gray-100 text-gray-700 border-gray-200" };
  }
};

const isCurrent = (spec: GridSpec) => {
  const now = new Date().toISOString().slice(0, 10);
  const started = !spec.effective_from || spec.effective_from <= now;
  const notExpired = !spec.effective_to || spec.effective_to > now;
  return started && notExpired;
};

const hscwRange = (spec: GridSpec) => {
  if (spec.min_hscw != null && spec.max_hscw != null) return `${spec.min_hscw}–${spec.max_hscw} kg`;
  if (spec.min_hscw != null) return `≥ ${spec.min_hscw} kg`;
  if (spec.max_hscw != null) return `≤ ${spec.max_hscw} kg`;
  return "—";
};

const handleExportCSV = (specs: GridSpec[]) => {
  const headers = ["ID", "Species", "Version", "Min HSCW (kg)", "Max HSCW (kg)", "Fat Code", "Dentition/Age", "Effective From", "Effective To", "Notes"];
  const rows = specs.map(s => [
    s.id, s.species, s.version,
    s.min_hscw ?? "", s.max_hscw ?? "",
    s.fat_code ?? "", s.dentition_or_age ?? "",
    s.effective_from ?? "", s.effective_to ?? "",
    (s.notes ?? "").replace(/"/g, '""'),
  ]);
  const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `muster-gridspecs-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function GridSpecs() {
  const [gridSpecs, setGridSpecs] = useState<GridSpec[]>([]);
  const [plants, setPlants] = useState<{ id: string; plant_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [plantFilter, setPlantFilter] = useState("all");
  const [speciesFilter, setSpeciesFilter] = useState("all");
  const [showExpired, setShowExpired] = useState(false);
  const [selectedSpec, setSelectedSpec] = useState<GridSpec | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: specs }, { data: plantsData }] = await Promise.all([
        supabase.from("gridspecs").select("*").order("species").order("version", { ascending: false }),
        supabase.from("plants").select("id, plant_name").order("plant_name"),
      ]);
      if (specs)      setGridSpecs(specs);
      if (plantsData) setPlants(plantsData);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const plantNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    plants.forEach(p => (m[p.id] = p.plant_name));
    return m;
  }, [plants]);

  const filtered = useMemo(() => {
    let list = gridSpecs;
    if (!showExpired) list = list.filter(isCurrent);
    if (speciesFilter !== "all") list = list.filter(s => (s.species || "").toLowerCase() === speciesFilter);
    if (plantFilter !== "all")   list = list.filter(s => s.plant_id === plantFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(s =>
        (s.species || "").toLowerCase().includes(q) ||
        (s.notes || "").toLowerCase().includes(q) ||
        (s.fat_code || "").toLowerCase().includes(q) ||
        (s.dentition_or_age || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [gridSpecs, showExpired, speciesFilter, plantFilter, searchTerm]);

  // Summary counts
  const currentCount = gridSpecs.filter(isCurrent).length;
  const expiredCount = gridSpecs.filter(s => !isCurrent(s)).length;
  const speciesInUse = Array.from(new Set(gridSpecs.filter(isCurrent).map(s => s.species))).sort();

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Kill Grid Specifications</h1>
            <p className="text-muted-foreground">HSCW ranges, fat codes, and dentition specs per species and plant</p>
          </div>
          <Button variant="outline" onClick={() => handleExportCSV(filtered)} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Summary strip */}
        {!loading && (
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-md border bg-emerald-50 border-emerald-200 px-3 py-1.5 text-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-medium">Active specs</span>
              <span className="text-emerald-700 font-bold">{currentCount}</span>
            </div>
            {expiredCount > 0 && (
              <div
                className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm cursor-pointer transition-all ${showExpired ? "bg-gray-200 border-gray-400" : "bg-gray-50 border-gray-200"}`}
                onClick={() => setShowExpired(v => !v)}
              >
                <XCircle className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-gray-600 font-medium">Expired</span>
                <span className="text-gray-600 font-bold">{expiredCount}</span>
              </div>
            )}
            {speciesInUse.map(sp => {
              const clr = speciesColour(sp);
              return (
                <div
                  key={sp}
                  onClick={() => setSpeciesFilter(f => f === sp.toLowerCase() ? "all" : sp.toLowerCase())}
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium cursor-pointer transition-all ${clr.badge} ${speciesFilter === sp.toLowerCase() ? "ring-2 ring-offset-1 ring-current" : ""}`}
                >
                  <span className="capitalize">{sp}</span>
                  <span className="font-bold">{gridSpecs.filter(s => isCurrent(s) && (s.species || "").toLowerCase() === sp.toLowerCase()).length}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search species, fat code, dentition, notes…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Species" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All Species</SelectItem>
              <SelectItem value="beef">Beef</SelectItem>
              <SelectItem value="lamb">Lamb</SelectItem>
              <SelectItem value="mutton">Mutton / Sheep</SelectItem>
              <SelectItem value="goat">Goat</SelectItem>
            </SelectContent>
          </Select>
          {plants.length > 1 && (
            <Select value={plantFilter} onValueChange={setPlantFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Plants" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Plants</SelectItem>
                {plants.map(p => <SelectItem key={p.id} value={p.id}>{p.plant_name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Grid Specs List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-1">No grid specifications found</h3>
              <p className="text-muted-foreground text-sm">Adjust your filters or show expired specs to see more.</p>
              {!showExpired && expiredCount > 0 && (
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowExpired(true)}>
                  Show expired specs
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map(spec => {
              const clr = speciesColour(spec.species);
              const current = isCurrent(spec);
              return (
                <Card
                  key={spec.id}
                  className={`border-l-4 ${clr.border} ${!current ? "opacity-60" : ""} hover:shadow-md transition-shadow cursor-pointer`}
                  onClick={() => { setSelectedSpec(spec); setDialogOpen(true); }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-semibold capitalize border rounded px-2 py-0.5 ${clr.badge}`}>
                              {spec.species}
                            </span>
                            <Badge variant={current ? "confirmed" : "secondary"}>
                              {current ? `v${spec.version} · Current` : `v${spec.version} · Expired`}
                            </Badge>
                            {spec.plant_id && plantNameMap[spec.plant_id] && (
                              <span className="text-xs text-muted-foreground">{plantNameMap[spec.plant_id]}</span>
                            )}
                          </div>
                          {spec.effective_from && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Effective {format(new Date(spec.effective_from), "d MMM yyyy")}
                              {spec.effective_to && ` → ${format(new Date(spec.effective_to), "d MMM yyyy")}`}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground flex-shrink-0"
                        onClick={e => { e.stopPropagation(); setSelectedSpec(spec); setDialogOpen(true); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                          <Scale className="h-3 w-3" /> HSCW Range
                        </div>
                        <div className="text-lg font-bold tabular-nums">{hscwRange(spec)}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                          <Layers className="h-3 w-3" /> Fat Code
                        </div>
                        <div className="text-lg font-bold">{spec.fat_code || "—"}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
                          <Beef className="h-3 w-3" /> Dentition / Age
                        </div>
                        <div className="text-base font-semibold">{spec.dentition_or_age || "—"}</div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Plant</div>
                        <div className="text-sm">{spec.plant_id ? (plantNameMap[spec.plant_id] || spec.plant_id.slice(0, 8)) : "—"}</div>
                      </div>
                    </div>
                    {spec.notes && (
                      <p className="mt-3 text-sm text-muted-foreground border-t pt-3">{spec.notes}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                Grid Specification
                {selectedSpec && (
                  <span className="ml-1 text-sm font-normal text-muted-foreground capitalize">
                    — {selectedSpec.species} v{selectedSpec.version}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            {selectedSpec && (() => {
              const clr = speciesColour(selectedSpec.species);
              const current = isCurrent(selectedSpec);
              return (
                <div className="space-y-4 text-sm">
                  {/* Status banner */}
                  <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium ${current ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-gray-100 text-gray-600 border border-gray-200"}`}>
                    {current ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    {current ? "Current specification — in active use" : "Expired specification — superseded by newer version"}
                  </div>

                  {/* Key metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Species</p>
                      <span className={`text-xs font-semibold capitalize border rounded px-2 py-0.5 ${clr.badge}`}>
                        {selectedSpec.species}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Version</p>
                      <p className="font-semibold">v{selectedSpec.version}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">HSCW Range</p>
                      <p className="text-xl font-bold tabular-nums">{hscwRange(selectedSpec)}</p>
                      <p className="text-xs text-muted-foreground">Hot Standard Carcase Weight</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Fat Code</p>
                      <p className="text-xl font-bold">{selectedSpec.fat_code || "—"}</p>
                      <p className="text-xs text-muted-foreground">AUS-MEAT fat depth score</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Dentition / Age</p>
                      <p className="font-semibold">{selectedSpec.dentition_or_age || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Plant</p>
                      <p>{selectedSpec.plant_id ? (plantNameMap[selectedSpec.plant_id] || selectedSpec.plant_id.slice(0, 12)) : "—"}</p>
                    </div>
                  </div>

                  {/* Effective period */}
                  <div className="border rounded-md p-3 bg-muted/30">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Effective period</p>
                    <div className="flex items-center gap-3 text-sm">
                      <span>{selectedSpec.effective_from ? format(new Date(selectedSpec.effective_from), "d MMM yyyy") : "No start date"}</span>
                      <span className="text-muted-foreground">→</span>
                      <span>{selectedSpec.effective_to ? format(new Date(selectedSpec.effective_to), "d MMM yyyy") : "No expiry (ongoing)"}</span>
                    </div>
                  </div>

                  {/* Yield adj rules */}
                  {selectedSpec.yield_adj_rules && Object.keys(selectedSpec.yield_adj_rules as object).length > 0 && (
                    <div className="border rounded-md p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Yield adjustment rules</p>
                      <pre className="text-xs text-muted-foreground overflow-x-auto">
                        {JSON.stringify(selectedSpec.yield_adj_rules, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedSpec.notes && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm text-muted-foreground">{selectedSpec.notes}</p>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <Button variant="outline" size="sm" onClick={() => handleExportCSV([selectedSpec])}>
                      <Download className="h-4 w-4 mr-1.5" />
                      Export this spec
                    </Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
