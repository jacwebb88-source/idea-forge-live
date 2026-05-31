import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { format } from "date-fns";

const WATERMARK_TEXT = `Jacqui Webb · Muster · Confidential · ${format(new Date(), "d MMM yyyy")}`;

export default function Welcome() {
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-700 flex flex-col items-center justify-center px-6 relative overflow-hidden" style={{ userSelect: "none", WebkitUserSelect: "none" }}>

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
            color: "rgba(255,255,255,0.07)",
            whiteSpace: "nowrap",
            letterSpacing: "0.05em",
            pointerEvents: "none",
            userSelect: "none",
          }}>
            {WATERMARK_TEXT} &nbsp;&nbsp;&nbsp; {WATERMARK_TEXT}
          </div>
        ))}
      </div>

      {/* Background texture */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E\")",
        }}
      />

      <div className="relative z-10 max-w-lg w-full text-center space-y-8">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <img
            src="/muster-logo.png"
            alt="Muster"
            className="h-16 w-16 rounded-2xl object-cover shadow-xl"
          />
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-white text-4xl font-extrabold tracking-tight">
            Welcome to Muster
          </h1>
          <p className="text-white/75 text-lg leading-relaxed">
            You've been invited to explore an early look at something we're really excited about —
            a decision engine built for Australian cattle producers.
          </p>
        </div>

        {/* What they're about to see */}
        <div className="bg-white/10 border border-white/20 rounded-2xl px-6 py-5 text-left space-y-3">
          <p className="text-white font-semibold text-sm">What you'll see inside:</p>
          <ul className="space-y-2">
            {[
              "Kill plan & booking management",
              "Supplier & buyer coordination",
              "Transport slotting & scheduling",
              "Live KPI dashboard",
              "Compliance & intake tracking",
            ].map(item => (
              <li key={item} className="flex items-start gap-2 text-white/80 text-sm">
                <span className="text-emerald-300 mt-0.5">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Confidentiality — friendly */}
        <div className="space-y-4">
          <p className="text-white/60 text-xs leading-relaxed px-4">
            This is an early prototype shared with you in confidence. By entering you agree
            to keep what you see between us — no screenshots, forwarding, or sharing without
            a quick chat with Jacqui first. We appreciate you respecting that. 🤝
          </p>

          <Button
            onClick={() => navigate("/home")}
            size="lg"
            className="bg-white text-green-900 hover:bg-emerald-50 font-bold text-base px-10 py-6 rounded-xl shadow-xl gap-2 w-full"
          >
            Enter prototype
            <ArrowRight className="h-5 w-5" />
          </Button>

          <p className="text-white/40 text-xs">
            Built by Jacqui Webb · Muster · {new Date().getFullYear()}
          </p>
        </div>

      </div>
    </div>
  );
}
