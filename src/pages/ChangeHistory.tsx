import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, subDays } from "date-fns";
import { History, Search, ArrowRight, User, Calendar, Filter, Download, MessageSquareText } from "lucide-react";
import {
  fieldLabel,
  describeChange,
  changeSeverity,
  severityChip,
  severityLabel,
  severityDot,
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
  // from join
  requested_kill_date?: string | null;
  species?: string | null;
  head_count?: number | null;
  status?: string | null;
  supplier_id?: string | null;
};

// Schedule-critical fields (used for the summary stat)
const isHighImportance = (field: string): boolean =>
  ["status", "head_count", "requested_kill_date", "hgp_status", "kill_order_seq", "nvd_status", "nlis_status", "pic_status"].includes(field);

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
            <h1 className="text-3xl font-bold text-foreground">Change History &amp; Accountability</h1>
            <p className="text-muted-foreground">
              Operational audit trail — every booking change, who made it, when, and the reason given. Use to settle disputes, brief shift changeovers and follow up missed comms.
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
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Operators</CardTitle></CardHeader>
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
              placeholder="Search by operator, booking, note…"
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
                  const sev = changeSeverity(c);
                  const sentence = describeChange(c);
                  return (
                    <div
                      key={c.id}
                      className={`rounded-md border-l-4 border border-border bg-muted/20 px-4 py-3 text-sm ${
                        sev === "critical" ? "border-l-red-500 bg-red-50/40 dark:bg-red-950/10" :
                        sev === "warning"  ? "border-l-amber-500 bg-amber-50/40 dark:bg-amber-950/10" :
                        sev === "positive" ? "border-l-emerald-500" :
                        "border-l-blue-400"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          {/* Operational sentence + severity */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 border shrink-0 ${severityChip[sev]}`}
                            >
                              {severityLabel[sev]}
                            </span>
                            <span className="font-semibold text-foreground">{sentence}</span>
                          </div>

                          {/* Booking context */}
                          <p className="text-xs text-muted-foreground mt-1">
                            Booking <span className="font-mono">{c.booking_id.slice(-8).toUpperCase()}</span>
                            {c.requested_kill_date && (
                              <> · Kill {format(parseISO(c.requested_kill_date), "d MMM yyyy")}</>
                            )}
                            {c.species && <> · <span className="capitalize">{c.species}</span></>}
                            {c.head_count != null && <> · {c.head_count.toLocaleString()} head</>}
                          </p>

                          {/* Reason / comment */}
                          {c.change_note ? (
                            <p className="text-xs text-foreground/80 italic mt-1.5 flex items-start gap-1 bg-background/60 rounded px-2 py-1 border border-border/60">
                              <MessageSquareText className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                              "{c.change_note}"
                            </p>
                          ) : (
                            <p className="text-[11px] text-muted-foreground/70 italic mt-1">No reason recorded</p>
                          )}
                        </div>

                        {/* Who + when */}
                        <div className="text-right shrink-0 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1 justify-end">
                            <User className="h-3 w-3" />
                            <span className="font-medium text-foreground">{c.changed_by || "System"}</span>
                          </div>
                          {c.changed_by_role && (
                            <div className="text-xs mt-0.5 capitalize">{c.changed_by_role}</div>
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
              <span className="font-medium">Immutable audit trail.</span> Every booking change from the Kill Board and Booking Board is recorded here — who changed it, prior value, new value, and any reason given. No hard deletes.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
