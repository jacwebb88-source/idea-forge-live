import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "muster_session_id";
const OWNER_KEY   = "muster_is_owner";

function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

// If the URL contains ?owner=true, permanently mark this browser as the owner
function checkOwnerFlag(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.get("owner") === "true") {
    localStorage.setItem(OWNER_KEY, "true");
    // Remove the query param from the URL without a page reload
    const url = new URL(window.location.href);
    url.searchParams.delete("owner");
    window.history.replaceState({}, "", url.toString());
  }
  return localStorage.getItem(OWNER_KEY) === "true";
}

export function useVisitorTracking() {
  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    const isOwner   = checkOwnerFlag();

    const track = async () => {
      const { data } = await supabase
        .from("visitor_sessions")
        .select("id, page_count")
        .eq("session_id", sessionId)
        .single();

      if (data) {
        await supabase
          .from("visitor_sessions")
          .update({
            last_seen:  new Date().toISOString(),
            page_count: (data.page_count ?? 1) + 1,
            is_owner:   isOwner,
          })
          .eq("session_id", sessionId);
      } else {
        await supabase.from("visitor_sessions").insert({
          session_id: sessionId,
          referrer:   document.referrer || null,
          is_owner:   isOwner,
        });
      }
    };

    track();
  }, []);
}
