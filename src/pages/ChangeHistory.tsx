import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, subDays } from "date-fns";
import { History, Search, ArrowRight, User, Calendar, Filter, Download } from "lucide-react";

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
  // from join
  requested_kill_date?: string | null;
  species?: string | null;
  head_count?: number | null;
  status?: string | null;
  supplier_id?: string | null;
};

// Friendly field name labels
const fieldLabel = (field: string): string => {
  const map: Record<string, string> = {
    status:               "Booking status",
    head_count:           "Head count",
    requested_kill_date:  "Kill date",
    slot_time:            "Slot time",
    arrival_slot:         "Arrival slot",
    supplier_id:          "Supplier",
    plant_id:             "Plant",
    transport_status:     "Transport status",
    hgp_status:           "HGP status",
    kill_order_seq:       "Kill order",
    msa_enrolled:         "MSA enrolment",
    pericardium_ok:       "Pericardium",
    species_class:        "Species class",
    agent_ref:            "Agent ref",
    lot_id:               "Lot ID",
    fill_rate:            "Fill rate",
  };
  return map[field] || field.replace(/_/g, " ");
};

// Which changes are "high importance" (scheduling-critical)
const isHighImportance = (field: string): boolean =>
  ["status", "head_count", "requested_kill_date", "hgp_status", "kill_order_seq"].includes(field);

export default function ChangeHistory() {
  const [changes, setChanges] = useState<ChangeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [fieldFilter, setFieldFilter] = useState("all");
  const [dateRange, setDateRange] = useState("30");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const since = format(subDays(new Date(), parseInt(dateRange)), "yyyy-MM-dd");

      const { data, error } = await (supabase as any)
        .from("booking_changes")
        .select(`
          id, booking_id, changed_at, changed_by, changed_by_role,
          field_name, old_value, new_value, change_note,
          bookings(requested_kill_date, species, head_count, status, supplier_id)
        `)
        .gte("changed_at", since)
        .order("changed_at", { ascending: false })
        .limit(200);

      if (!error && data) {
        const flat: ChangeRecord[] = (data as any[]).map((c) => ({
          ...c,
          requested_kill_date: c.bookings?.requested_kill_date,
          species:              c.bookings?.species,
          head_count:           c.bookings?.head_count,
          status:               c.bookings?.status,
          supplier_id:          c.bookings?.supplier_id,
        }));
        setChanges(flat);
      } else {
        setChanges([]);
      }
      setLoading(false);
    };
    load();
  }, [dateRange]);

  // Unique roles for filter dropdown
  const uniqueRoles = Array.from(new Set(changes.map((c) => c.changed_by_role).filter(Boolean))) as string[];
  const uniqueFields = Array.from(new Set(changes.map((c) => c.field_name).filter(Boolean)));

  const filtered = changes.filter((c) => {
    const matchSearch =
      !search ||
      (c.changed_by || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.booking_id || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.change_note || "").toLowerCase().includes(search.toLowerCase()) ||
      fieldLabel(c.field_name).toLowerCase().includes(search.toLowerCase());
    const matchRole  = roleFilter === "all"  || c.changed_by_role === roleFilter;
    const matchField = fieldFilter === "all" || c.field_name === fieldFilter;
    return matchSearch && matchRole && matchField;
  });

  // Summary stats
  const totalChanges  = filtered.length;
  const uniqueUsers   = new Set(filtered.map((c) => c.changed_by).filter(Boolean)).size;
  const highPriority  = filtered.filter((c) => isHighImportance(c.field_name)).length;
  const todayChanges  = filtered.filter((c) =>
    c.changed_at && format(parseISO(c.changed_at), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
  ).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Change History</h1>
            <p className="text-muted-foreground">
              Full audit trail — who changed what, when, and why
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
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
                const headers = ["Date/Time", "Booking ID", "Field", "Old Value", "New Value", "Changed By", "Role", "Note"];
                const rows = filtered.map(c => [
                  c.changed_at ? format(parseISO(c.changed_at), "yyyy-MM-dd HH:mm") : "",
                  c.booking_id,
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
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Total changes</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{loading ? "—" : totalChanges}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Today</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{loading ? "—" : todayChanges}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">By users</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{loading ? "—" : uniqueUsers || "—"}</div></CardContent>
          </Card>
          <Card className={highPriority > 0 ? "border-amber-200" : ""}>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Schedule-critical</CardTitle></CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${highPriority > 0 ? "text-amber-600" : ""}`}>{loading ? "—" : highPriority}</div>
              <p className="text-xs text-muted-foreground mt-0.5">status, head count, kill date, HGP</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user, booking, note…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All roles</SelectItem>
              {uniqueRoles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={fieldFilter} onValueChange={setFieldFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All fields" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All fields</SelectItem>
              {uniqueFields.map((f) => <SelectItem key={f} value={f}>{fieldLabel(f)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Change log */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {loading ? "Loading…" : `${filtered.length} change${filtered.length !== 1 ? "s" : ""}${search || roleFilter !== "all" || fieldFilter !== "all" ? " (filtered)" : ""}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground animate-pulse py-4 text-center">Loading change history…</p>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center">
                <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Changes will appear here automatically whenever a booking is edited.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((c) => {
                  const isHigh = isHighImportance(c.field_name);
                  return (
                    <div
                      key={c.id}
                      className={`rounded-md border px-4 py-3 text-sm ${isHigh ? "border-amber-200 bg-amber-50/40 dark:bg-amber-950/10" : "border-border bg-muted/20"}`}
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          {/* Field change */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {isHigh && (
                              <span className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5 shrink-0">
                                Critical
                              </span>
                            )}
                            <span className="font-semibold text-foreground">
                              {fieldLabel(c.field_name)}
                            </span>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <span className="line-through">{c.old_value || "—"}</span>
                              <ArrowRight className="h-3 w-3 shrink-0" />
                              <span className="font-medium text-foreground">{c.new_value || "—"}</span>
                            </span>
                          </div>

                          {/* Booking context */}
                          <p className="text-xs text-muted-foreground mt-1">
                            Booking <span className="font-mono">{c.booking_id.slice(-8).toUpperCase()}</span>
                            {c.requested_kill_date && (
                              <> · Kill {format(parseISO(c.requested_kill_date), "d MMM yyyy")}</>
                            )}
                            {c.species && <> · <span className="capitalize">{c.species}</span></>}
                            {c.head_count && <> · {c.head_count.toLocaleString()} head</>}
                          </p>

                          {/* Change note */}
                          {c.change_note && (
                            <p className="text-xs text-muted-foreground italic mt-1">
                              "{c.change_note}"
                            </p>
                          )}
                        </div>

                        {/* Who + when */}
                        <div className="text-right shrink-0 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1 justify-end">
                            <User className="h-3 w-3" />
                            <span>{c.changed_by || "System"}</span>
                          </div>
                          {c.changed_by_role && (
                            <div className="text-xs mt-0.5">{c.changed_by_role}</div>
                          )}
                          <div className="flex items-center gap-1 justify-end mt-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {c.changed_at
                                ? format(parseISO(c.changed_at), "d MMM yyyy, HH:mm")
                                : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-dashed border-muted-foreground/30">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground text-center">
              <span className="font-medium">Immutable audit trail.</span> Every booking change from Kill Plan and Booking Board is recorded here automatically — who changed it, what it was before, what it became, and any reason given. No hard deletes, ever.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
