import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, parseISO } from "date-fns";

interface ChangeItem {
  id: string;
  booking_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_by_role: string | null;
  changed_at: string | null;
}

const fieldLabel = (field: string): string => {
  const map: Record<string, string> = {
    status:              "Status",
    head_count:          "Head count",
    requested_kill_date: "Kill date",
    slot_time:           "Slot time",
    arrival_slot:        "Arrival slot",
    supplier_id:         "Supplier",
    transport_status:    "Transport",
    hgp_status:          "HGP status",
    kill_order_seq:      "Kill order",
    msa_enrolled:        "MSA enrolment",
    pericardium_ok:      "Pericardium",
  };
  return map[field] || field.replace(/_/g, " ");
};

const dotColour = (field: string): string => {
  if (["status", "head_count", "requested_kill_date"].includes(field))
    return "bg-amber-500";
  if (["hgp_status", "kill_order_seq"].includes(field))
    return "bg-red-500";
  return "bg-blue-400";
};

export function RecentActivity() {
  const [changes, setChanges] = useState<ChangeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("booking_changes")
        .select("id, booking_id, field_name, old_value, new_value, changed_by, changed_by_role, changed_at")
        .order("changed_at", { ascending: false })
        .limit(12);

      if (!error && data) {
        setChanges(data as ChangeItem[]);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5 text-primary" />
          Recent Changes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-muted-foreground py-8 text-sm animate-pulse">
            Loading activity…
          </div>
        ) : changes.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            <p>No recent changes recorded.</p>
            <p className="text-xs mt-1">Changes appear here as bookings are edited.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {changes.map((c) => (
              <div key={c.id} className="flex items-start gap-3">
                <div className="mt-1.5 shrink-0">
                  <div className={`w-2 h-2 rounded-full ${dotColour(c.field_name)}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-snug">
                    <span className="font-medium">{fieldLabel(c.field_name)}</span>
                    {" "}
                    <span className="text-muted-foreground text-xs line-through">{c.old_value || "—"}</span>
                    {" "}
                    <ArrowRight className="inline h-3 w-3 text-muted-foreground" />
                    {" "}
                    <span className="font-medium text-foreground text-xs">{c.new_value || "—"}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="font-mono">{c.booking_id.slice(-6).toUpperCase()}</span>
                    {c.changed_by && <> · {c.changed_by}</>}
                    {c.changed_by_role && <> ({c.changed_by_role})</>}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                  {c.changed_at
                    ? formatDistanceToNow(parseISO(c.changed_at), { addSuffix: true })
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
