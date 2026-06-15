import { useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { LivestockSidebar } from "./LivestockSidebar";
import { Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";
import { format } from "date-fns";

interface LivestockLayoutProps {
  children: React.ReactNode;
}

const WATERMARK_TEXT = `Jacqui Webb · Muster · Confidential · ${format(new Date(), "d MMM yyyy")}`;

export function LivestockLayout({ children }: LivestockLayoutProps) {
  useVisitorTracking();

  useEffect(() => {
    const blockContext = (e: MouseEvent) => e.preventDefault();
    const blockKeys = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && ["c","p","s","a"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", blockContext);
    document.addEventListener("keydown", blockKeys);
    return () => {
      document.removeEventListener("contextmenu", blockContext);
      document.removeEventListener("keydown", blockKeys);
    };
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background" style={{ userSelect: "none", WebkitUserSelect: "none" }}>

        {/* Watermark */}
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} style={{
              position: "absolute",
              top: `${(i * 12) - 10}%`,
              left: "-20%",
              width: "140%",
              transform: "rotate(-30deg)",
              textAlign: "center",
              fontSize: "11px",
              fontWeight: 600,
              color: "rgba(0,0,0,0.035)",
              whiteSpace: "nowrap",
              letterSpacing: "0.05em",
              pointerEvents: "none",
              userSelect: "none",
            }}>
              {WATERMARK_TEXT} &nbsp;&nbsp;&nbsp; {WATERMARK_TEXT}
            </div>
          ))}
        </div>

        <LivestockSidebar />

        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="flex items-center gap-2">
                <img src="/muster-logo.png" alt="Muster" className="h-9 w-9 rounded-lg object-cover" />
                <h1 className="text-xl font-semibold text-foreground">
                  Muster Livestock
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden md:block mr-2">
                Confidential · Not for distribution
              </span>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full"></span>
              </Button>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </header>

          <main className="flex-1 p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
