import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, subDays, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import {
  History, Search, User, Calendar, Download, MessageSquareText,
  CalendarClock, ShieldAlert, Truck, Factory, Handshake, Activity, X,
} from "lucide-react";
import {
  fieldLabel,
  describeChange,
  changeSeverity,
  severityChip,
  severityLabel,
  changeCategory,
  categoryLabel,
  categoryChip,
  categoryAccent,
  type ChangeCategory,
} from "@/lib/changeFormat";

type ChangeRecord = {
  id: string;
  booking_id: string;
  changed_at: string | null;
  changed_by: string | null;
  changed_by_role: string | null;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  change_note: string | null;
  requested_kill_date?: string | null;
  species?: string | null;
  head_count?: number | null;
  status?: string | null;
  supplier_id?: string | null;
  supplier_name?: string | null;
};

const CATEGORY_ICONS: Record<ChangeCategory, typeof CalendarClock> = {
  scheduling: CalendarClock,
  compliance: ShieldAlert,
  transport:  Truck,
  supplier:   Factory,
  buyer:      Handshake,
  other:      Activity,
};

const CATEGORIES: ChangeCategory[] = ["scheduling", "compliance", "transport", "supplier", "buyer"];

const dayHeading = (iso: string) => {
  const d = parseISO(iso);
  if (isToday(d))     return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE d MMM yyyy");
};

export default function ChangeHistory() {
  const [changes, setChanges] = useState<ChangeRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [activeCats, setActiveCats] = useState<Set<ChangeCategory>>(new Set());
  const [dateRange, setDateRange] = useState("30");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const since = format(subDays(new Date(), parseInt(dateRange)), "yyyy-MM-dd");

      const [{ data: changesData }, { data: suppliersData }] = await Promise.all([
        (supabase as any)
          .from("booking_changes")
          .select(`
            id, booking_id, changed_at, changed_by, changed_by_role,
            field_name, old_value, new_value, change_note,
            bookings(requested_kill_date, species, head_count, status, supplier_id)
          `)
          .gte("changed_at", since)
          .order("changed_at", { ascending: false })
          .limit(300),
        (supabase as any).from("suppliers").select("id, name"),
      ]);

      const supMap: Record<string, string> = {};
      (suppliersData as any[] | null)?.forEach((s) => { supMap[s.id] = s.name; });
      setSuppliers(supMap);

      const flat: ChangeRecord[] = ((changesData as any[]) || []).map((c) => ({
        ...c,
        requested_kill_date: c.bookings?.requested_kill_date,
        species:              c.bookings?.species,
        head_count:           c.bookings?.head_count,
        status:               c.bookings?.status,
        supplier_id:          c.bookings?.supplier_id,
        supplier_name:        c.bookings?.supplier_id ? supMap[c.bookings.supplier_id] : null,
      }));
      setChanges(flat);
      setLoading(false);
    };
    load();
  }, [dateRange]);

  const uniqueRoles = useMemo(
    () => Array.from(new Set(changes.map((c) => c.changed_by_role).filter(Boolean))) as string[],
    [changes]
  );

  const toggleCat = (cat: ChangeCategory) => {
    setActiveCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return changes.filter((c) => {
      const cat = changeCategory(c.field_name);
      if (activeCats.size > 0 && !activeCats.has(cat)) return false;
      if (roleFilter !== "all" && c.changed_by_role !== roleFilter) return false;
      if (!q) return true;
      return (
        (c.changed_by || "").toLowerCase().includes(q) ||
        (c.booking_id || "").toLowerCase().includes(q) ||
        (c.change_note || "").toLowerCase().includes(q) ||
        (c.supplier_name || "").toLowerCase().includes(q) ||
        fieldLabel(c.field_name).toLowerCase().includes(q)
      );
    });
  }, [changes, search, roleFilter, activeCats]);

  // Group filtered records by day for the timeline
  const grouped = useMemo(() => {
    const map = new Map<string, ChangeRecord[]>();
    filtered.forEach((c) => {
      if (!c.changed_at) return;
      const day = format(parseISO(c.changed_at), "yyyy-MM-dd");
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(c);
    });
    return Array.from(map.entries());
  }, [filtered]);

  // Summary stats
  const totalChanges = filtered.length;
  const uniqueUsers  = new Set(filtered.map((c) => c.changed_by).filter(Boolean)).size;
  const criticalCt   = filtered.filter((c) => changeSeverity(c) === "critical").length;
  const todayChanges = filtered.filter((c) =>
    c.changed_at && isToday(parseISO(c.changed_at))
  ).length;

  const catCounts: Record<ChangeCategory, number> = {
    scheduling: 0, compliance: 0, transport: 0, supplier: 0, buyer: 0, other: 0,
  };
  changes.forEach((c) => { catCounts[changeCategory(c.field_name)]++; });

  const filtersActive = activeCats.size > 0 || roleFilter !== "all" || !!search;

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Change History &amp; Accountability</h1>
            <p className="text-muted-foreground max-w-3xl">
              Live operational feed — every booking change, who made it, when, and why. Use to brief shift handovers, settle disputes with suppliers/buyers, and chase missed comms.
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={filtered.length === 0}
              onClick={() => {
                const headers = ["Date/Time", "Booking ID", "Supplier", "Category", "Field", "Old", "New", "Changed By", "Role", "Note"];
                const rows = filtered.map(c => [
                  c.changed_at ? format(parseISO(c.changed_at), "yyyy-MM-dd HH:mm") : "",
                  c.booking_id,
                  c.supplier_name ?? "",
                  categoryLabel[changeCategory(c.field_name)],
                  fieldLabel(c.field_name),
                  c.old_value ?? "",
                  c.new_value ?? "",
                  c.changed_by ?? "",
                  c.changed_by_role ?? "",
                  c.change_note ?? "",
                ]);
                const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `muster-change-history-${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Changes in window</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{loading ? "—" : totalChanges}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Today</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "—" : todayChanges}</div>
              <p className="text-xs text-muted-foreground mt-0.5">since 00:00</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Operators active</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{loading ? "—" : uniqueUsers || "—"}</div></CardContent>
          </Card>
          <Card className={criticalCt > 0 ? "border-red-300" : ""}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Critical events</CardTitle></CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${criticalCt > 0 ? "text-red-600" : ""}`}>{loading ? "—" : criticalCt}</div>
              <p className="text-xs text-muted-foreground mt-0.5">cancellations, eNVD/NLIS fails, overdue follow-ups</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick category filters + search */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            {CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat];
              const active = activeCats.has(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCat(cat)}
                  className={`inline-flex items-center gap-1.5 rounded-full border text-xs font-medium px-3 py-1.5 transition-colors ${
                    active
                      ? `${categoryChip[cat]} ring-2 ring-offset-1 ring-current/30`
                      : "bg-background text-muted-foreground border-border hover:bg-muted/40"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {categoryLabel[cat]}
                  <span className={`ml-1 rounded-full px-1.5 py-0 text-[10px] ${active ? "bg-background/60" : "bg-muted"}`}>
                    {catCounts[cat]}
                  </span>
                </button>
              );
            })}
            {filtersActive && (
              <button
                type="button"
                onClick={() => { setActiveCats(new Set()); setRoleFilter("all"); setSearch(""); }}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ml-1"
              >
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search supplier, booking ID, operator or note…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All roles" /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All roles</SelectItem>
                {uniqueRoles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Timeline feed */}
        {loading ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground animate-pulse">Loading change history…</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No changes match the current filters.</p>
              {filtersActive && (
                <button
                  className="text-xs text-primary hover:underline mt-2"
                  onClick={() => { setActiveCats(new Set()); setRoleFilter("all"); setSearch(""); }}
                >
                  Clear filters
                </button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {grouped.map(([day, items]) => (
              <div key={day}>
                <div className="sticky top-0 z-10 -mx-2 px-2 py-1.5 bg-background/95 backdrop-blur flex items-baseline gap-3 border-b">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">{dayHeading(day)}</h3>
                  <span className="text-xs text-muted-foreground">{items.length} {items.length === 1 ? "change" : "changes"}</span>
                </div>

                <ol className="relative mt-3 ml-3 border-l-2 border-dashed border-border space-y-3">
                  {items.map((c) => {
                    const sev = changeSeverity(c);
                    const cat = changeCategory(c.field_name);
                    const Icon = CATEGORY_ICONS[cat];
                    return (
                      <li key={c.id} className="relative pl-6">
                        {/* Timeline node */}
                        <span
                          className={`absolute -left-[13px] top-3 flex h-6 w-6 items-center justify-center rounded-full ${categoryAccent[cat]} text-white shadow-sm ring-4 ring-background`}
                        >
                          <Icon className="h-3 w-3" />
                        </span>

                        <div className={`rounded-md border bg-card px-4 py-3 shadow-sm hover:shadow transition ${
                          sev === "critical" ? "border-l-4 border-l-red-500" :
                          sev === "warning"  ? "border-l-4 border-l-amber-500" :
                          sev === "positive" ? "border-l-4 border-l-emerald-500" :
                          "border-l-4 border-l-blue-400"
                        }`}>
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 border ${categoryChip[cat]}`}>
                                  {categoryLabel[cat]}
                                </span>
                                <span className={`text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 border ${severityChip[sev]}`}>
                                  {severityLabel[sev]}
                                </span>
                                <span className="font-semibold text-foreground text-sm">{describeChange(c)}</span>
                              </div>

                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                {c.supplier_name && (
                                  <span className="inline-flex items-center gap-1 font-medium text-foreground/90">
                                    <Factory className="h-3 w-3" />{c.supplier_name}
                                  </span>
                                )}
                                <span>
                                  Booking <span className="font-mono text-foreground/80">{c.booking_id.slice(-6).toUpperCase()}</span>
                                </span>
                                {c.requested_kill_date && (
                                  <span className="inline-flex items-center gap-1">
                                    <CalendarClock className="h-3 w-3" />
                                    Kill {format(parseISO(c.requested_kill_date), "EEE d MMM")}
                                  </span>
                                )}
                                {c.head_count != null && <span>{c.head_count.toLocaleString()} head</span>}
                              </div>

                              {/* old → new value chips (only if both present and different) */}
                              {c.old_value != null && c.new_value != null && c.old_value !== c.new_value && (
                                <div className="mt-2 flex items-center gap-2 text-xs">
                                  <span className="font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground line-through decoration-muted-foreground/50">
                                    {c.old_value}
                                  </span>
                                  <span className="text-muted-foreground">→</span>
                                  <span className="font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                                    {c.new_value}
                                  </span>
                                </div>
                              )}

                              {c.change_note && (
                                <p className="text-xs text-foreground/80 italic mt-2 flex items-start gap-1.5 bg-muted/50 rounded px-2.5 py-1.5 border">
                                  <MessageSquareText className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                                  "{c.change_note}"
                                </p>
                              )}
                            </div>

                            <div className="text-right shrink-0 text-xs text-muted-foreground min-w-[120px]">
                              <div className="flex items-center gap-1 justify-end text-foreground font-medium">
                                <User className="h-3 w-3" />
                                {c.changed_by || "System"}
                              </div>
                              {c.changed_by_role && (
                                <div className="text-[11px] mt-0.5 capitalize">{c.changed_by_role}</div>
                              )}
                              <div className="flex items-center gap-1 justify-end mt-1">
                                <Calendar className="h-3 w-3" />
                                {c.changed_at ? format(parseISO(c.changed_at), "HH:mm") : "—"}
                              </div>
                              <div className="text-[11px] mt-0.5">
                                {c.changed_at ? formatDistanceToNow(parseISO(c.changed_at), { addSuffix: true }) : ""}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center pt-2">
          <span className="font-medium">Immutable audit trail.</span> Every booking change from the Kill Board and Booking Board is recorded — no hard deletes.
        </p>
      </div>
    </DashboardLayout>
  );
}
