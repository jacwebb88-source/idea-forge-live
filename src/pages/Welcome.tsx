import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

const WATERMARK_TEXT = `Jacqui Webb · Muster · Confidential · ${format(new Date(), "d MMM yyyy")}`;

export default function Welcome() {
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState(false);

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setDemoError(false);
    const { error } = await supabase.auth.signInWithPassword({
      email: "demo@muster.com.au",
      password: "MusterDemo2025!",
    });
    if (error) {
      setDemoError(true);
      setDemoLoading(false);
    } else {
      navigate("/home");
    }
  };

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

      {/* Top banner */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-emerald-600/90 backdrop-blur-sm border-b border-emerald-500/40 py-2 px-4 text-center">
        <p className="text-white/90 text-xs sm:text-sm font-medium">
          🚀 Built for Australian livestock — farm to fork traceability, kill scheduling, export compliance and more.
        </p>
      </div>

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

      <div className="relative z-10 max-w-lg w-full text-center space-y-8 pt-12">

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
            You've been invited to explore an early look at the Muster platform. Livestock intake coordination, compliance and operational visibility for red meat processors and producers.
          </p>
        </div>

        {/* Two platforms */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="bg-white/10 border border-white/20 rounded-2xl px-5 py-5 space-y-3">
            <p className="text-white font-bold text-sm">Muster Processing</p>
            <p className="text-white/60 text-xs leading-relaxed">For abattoirs and processing plants</p>
            <ul className="space-y-1.5">
              {[
                "Kill scheduling",
                "Vendor coordination",
                "NVD compliance",
                "Operations agent",
                "Forecasting",
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-white/75 text-xs">
                  <span className="text-amber-300 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white/10 border border-white/20 rounded-2xl px-5 py-5 space-y-3">
            <p className="text-white font-bold text-sm">Muster Livestock</p>
            <p className="text-white/60 text-xs leading-relaxed">Feedlots · Backgrounders · Pastoral companies · Farmers</p>
            <ul className="space-y-1.5">
              {[
                "Market intelligence",
                "Livestock traceability",
                "Kill results",
                "Bid calculator",
                "AI agents",
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-white/75 text-xs">
                  <span className="text-amber-300 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
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

          {/* Demo login */}
          <div className="space-y-2">
            <Button
              onClick={handleDemoLogin}
              disabled={demoLoading}
              size="lg"
              variant="outline"
              className="border-white/40 text-white hover:bg-white/10 hover:border-white/70 font-semibold text-base px-10 py-6 rounded-xl gap-2 w-full bg-transparent"
            >
              {demoLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "🔍"
              )}
              Explore the Demo
            </Button>
            {demoError && (
              <p className="text-red-300 text-xs">Demo unavailable — please try again</p>
            )}
            <p className="text-white/50 text-xs">
              See the full platform with live data. No account needed.
            </p>
          </div>

          <p className="text-white/40 text-xs">
            Built by Jacqui Webb · Muster · {new Date().getFullYear()}
          </p>
        </div>

      </div>
    </div>
  );
}
