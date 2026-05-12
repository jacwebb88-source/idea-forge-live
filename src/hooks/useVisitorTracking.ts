import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "muster_session_id";

function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function useVisitorTracking() {
  useEffect(() => {
    const sessionId = getOrCreateSessionId();

    const track = async () => {
      // Check if we've already logged this session
      const { data } = await supabase
        .from("visitor_sessions")
        .select("id, page_count")
        .eq("session_id", sessionId)
        .single();

      if (data) {
        // Returning visitor — update last_seen and increment page count
        await supabase
          .from("visitor_sessions")
          .update({
            last_seen:  new Date().toISOString(),
            page_count: (data.page_count ?? 1) + 1,
          })
          .eq("session_id", sessionId);
      } else {
        // New visitor — insert
        await supabase.from("visitor_sessions").insert({
          session_id: sessionId,
          referrer:   document.referrer || null,
        });
      }
    };

    track();
  }, []);
}
