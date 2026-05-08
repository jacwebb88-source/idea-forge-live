import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, MessageSquareText } from "lucide-react";
import { NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  describeChange,
  changeSeverity,
  severityDot,
  severityChip,
  severityLabel,
} from "@/lib/changeFormat";

interface ChangeItem {
  id: string;
  booking_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  change_note: string | null;
  changed_by: string | null;
  changed_by_role: string | null;
  changed_at: string | null;
}

interface RecentActivityProps {
  /** Max items to display. Default 12. */
  limit?: number;
  /** Compact card title (e.g. "Recent Changes" on Kill Board). */
  title?: string;
  /** Show "View full audit trail" footer link. */
  showAuditLink?: boolean;
}

export function RecentActivity({
  limit = 12,
  title = "Recent Changes",
  showAuditLink = true,
}: RecentActivityProps) {
  const [changes, setChanges] = useState<ChangeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("booking_changes")
        .select("id, booking_id, field_name, old_value, new_value, change_note, changed_by, changed_by_role, changed_at")
        .order("changed_at", { ascending: false })
        .limit(limit);

      if (!error && data) setChanges(data as ChangeItem[]);
      setLoading(false);
    };
    fetch();
  }, [limit]);

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5 text-primary" />
          {title}
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            Operator accountability feed
          </span>
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
          <div className="space-y-3">
            {changes.map((c) => {
              const sev = changeSeverity(c);
              return (
                <div key={c.id} className="flex items-start gap-3">
                  <div className="mt-1.5 shrink-0">
                    <div className={`w-2 h-2 rounded-full ${severityDot[sev]}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 border shrink-0 ${severityChip[sev]}`}
                      >
                        {severityLabel[sev]}
                      </span>
                      <p className="text-sm text-foreground leading-snug flex-1">
                        {describeChange(c)}
                      </p>
                    </div>
                    {c.change_note && (
                      <p className="text-xs text-muted-foreground italic mt-0.5 flex items-start gap-1">
                        <MessageSquareText className="h-3 w-3 mt-0.5 shrink-0" />
                        "{c.change_note}"
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Booking <span className="font-mono">{c.booking_id.slice(-6).toUpperCase()}</span>
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
              );
            })}
          </div>
        )}
        {showAuditLink && (
          <div className="mt-4 pt-3 border-t text-right">
            <NavLink
              to="/change-history"
              className="text-xs text-primary hover:underline font-medium"
            >
              View full audit trail →
            </NavLink>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
