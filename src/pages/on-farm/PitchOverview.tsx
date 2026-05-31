import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useMobs, useMarketBenchmarks } from "@/components/on-farm/useMobs";
import { useAuth } from "@/contexts/AuthContext";
import {
  Target, BarChart2, Bot, Clock, TrendingUp, Grid3X3,
  Calculator, Banknote, Wind, ArrowRight, CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";

// ─── Feature cards ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Clock,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    name: "Mob Margin Clock",
    desc: "Live margin/head at 4 turnoff dates. Optimal sell timing at a glance.",
    route: "/on-farm",
  },
  {
    icon: TrendingUp,
    color: "text-blue-600",
    bg: "bg-blue-50",
    name: "Market Intelligence",
    desc: "Live MLA/NLRS benchmark prices, saleyard summary, price alerts.",
    route: "/on-farm/market",
  },
  {
    icon: Grid3X3,
    color: "text-violet-600",
    bg: "bg-violet-50",
    name: "Processor Grids",
    desc: "Manage and compare processor kill grid prices. Know your best buyer.",
    route: "/on-farm/grids",
  },
  {
    icon: Calculator,
    color: "text-amber-600",
    bg: "bg-amber-50",
    name: "Bid Calculator",
    desc: "Max bid/head calculator linked to real cost-of-gain data.",
    route: "/on-farm/bid-calculator",
  },
  {
    icon: Banknote,
    color: "text-green-600",
    bg: "bg-green-50",
    name: "Livestock Finance",
    desc: "Model purchase finance costs and impact on mob P&L.",
    route: "/on-farm/finance",
  },
  {
    icon: Wind,
    color: "text-teal-600",
    bg: "bg-teal-50",
    name: "Carbon Tracker",
    desc: "IPCC Tier 2 methane estimates, ACCU value, Bovaer ROI.",
    route: "/on-farm",
  },
];

// ─── Competitor table ──────────────────────────────────────────────────────────

const COMPETITORS = [
  {
    name: "AgriWebb",
    what: "Mob tracking, NLIS, pasture",
    gap: "No feedlot economics, no AI, no kill grid",
  },
  {
    name: "AGDATA Phoenix",
    what: "Legacy feedlot ERP",
    gap: "Desktop-only, no AI, no mobile, enterprise price",
  },
  {
    name: "CattleMax (US)",
    what: "Basic cattle records",
    gap: "No Australian market, no AI, 20-year-old platform",
  },
  {
    name: "Excel / Spreadsheets",
    what: "Manual calculations",
    gap: "No live data, no AI, no collaboration",
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PitchOverview() {
  const navigate = useNavigate();
  const { mobs } = useMobs();
  const { benchmarks, latest } = useMarketBenchmarks();
  const { user } = useAuth();

  const activeMobs = mobs.filter(m => m.status === "active");
  const totalHead = activeMobs.reduce((s, m) => s + m.head_count, 0);
  const eyci = latest("eyci");
  const feeder = latest("feeder_steer");
  const heavySteer = latest("heavy_steer");
  const benchDate = benchmarks.length
    ? format(new Date(benchmarks[0].benchmark_date), "d MMM yyyy")
    : null;

  // Viewer identity for watermark
  const viewerLabel = user?.email
    ? `${user.email} · ${format(new Date(), "d MMM yyyy HH:mm")}`
    : `Muster Confidential · ${format(new Date(), "d MMM yyyy HH:mm")}`;

  // Block right-click and keyboard shortcuts for copy/print/save
  useEffect(() => {
    const blockContext = (e: MouseEvent) => e.preventDefault();
    const blockKeys = (e: KeyboardEvent) => {
      // Block Cmd/Ctrl + C, P, S, A, Shift+S (screenshot on some systems)
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
    <DashboardLayout>
      {/* ── Watermark overlay ─────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-50 overflow-hidden select-none"
        style={{ userSelect: "none" }}
      >
        {/* Diagonal repeating watermark */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: `${(i * 12) - 10}%`,
              left: "-20%",
              width: "140%",
              transform: "rotate(-30deg)",
              textAlign: "center",
              fontSize: "11px",
              fontWeight: 600,
              color: "rgba(0,0,0,0.07)",
              whiteSpace: "nowrap",
              letterSpacing: "0.05em",
              pointerEvents: "none",
              userSelect: "none",
            }}
          >
            {viewerLabel} &nbsp;&nbsp;&nbsp; CONFIDENTIAL &nbsp;&nbsp;&nbsp; {viewerLabel}
          </div>
        ))}
      </div>

      <div
        className="space-y-10 pb-16"
        style={{ userSelect: "none", WebkitUserSelect: "none" }}
      >

        {/* ── Confidentiality notice ────────────────────────────────────────── */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex gap-3 items-start">
          <span className="text-amber-500 text-lg mt-0.5">🔒</span>
          <div>
            <p className="text-amber-900 font-bold text-sm mb-1">Confidential — Authorised Viewing Only</p>
            <p className="text-amber-800 text-xs leading-relaxed">
              This document contains proprietary and commercially sensitive information belonging to Muster.
              If you have been shared this link, you are a trusted and authorised viewer.
              By viewing this material you agree not to copy, reproduce, distribute, screenshot, or share
              its contents with any third party without the express written consent of Muster.
              This session is individually watermarked and access is logged.
            </p>
            {user?.email && (
              <p className="text-amber-700 text-xs mt-2 font-semibold">
                Authorised viewer: {user.email} · Accessed {format(new Date(), "d MMM yyyy 'at' HH:mm")}
              </p>
            )}
          </div>
        </div>

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-green-900 via-green-800 to-emerald-700 relative">
          {/* Texture overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E\")",
            }}
          />
          <div className="relative px-8 py-12 text-center max-w-4xl mx-auto">
            {/* Logo area */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <img src="/muster-logo.png" alt="Muster" className="h-12 w-12 rounded-xl object-cover shadow-lg" />
              <span className="text-white/60 text-2xl font-light">×</span>
              <span className="text-white text-xl font-bold tracking-wide">On Farm</span>
            </div>

            <h1 className="text-white text-4xl md:text-5xl font-extrabold leading-tight mb-4">
              Muster Decision Engine
            </h1>
            <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-8">
              The only platform that tells Australian cattle producers exactly when to sell,
              what to pay, and whether to hold — live, per mob, backed by AI.
            </p>

            {/* Badge pills */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {["AI-Powered", "Australian Market", "Built for Feedlots & Traders"].map(b => (
                <span key={b} className="bg-white/20 text-white text-sm font-semibold px-4 py-1.5 rounded-full border border-white/30">
                  {b}
                </span>
              ))}
            </div>

            {/* Market gap stat pills */}
            <div className="flex flex-wrap justify-center gap-3">
              <div className="bg-white/10 border border-white/20 rounded-xl px-5 py-2.5 text-left">
                <p className="text-white/50 text-xs">Market gap</p>
                <p className="text-white font-bold text-sm">$0 accessible SaaS feedlot economics tools</p>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-xl px-5 py-2.5 text-left">
                <p className="text-white/50 text-xs">Addressable</p>
                <p className="text-white font-bold text-sm">18,000+ Australian feedlot & backgrounding operators</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── The Gap We Fill ───────────────────────────────────────────────── */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Why now</p>
          <h2 className="text-2xl font-bold text-foreground mb-6">What doesn't exist anywhere else</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: Target,
                color: "text-emerald-600",
                bg: "bg-emerald-50",
                title: "Real-time Mob Margin",
                desc: "Live cost per kg of gain, projected margin at turnoff, and optimal sell date for every mob. No spreadsheets. No guessing.",
              },
              {
                icon: BarChart2,
                color: "text-blue-600",
                bg: "bg-blue-50",
                title: "Processor Grid Intelligence",
                desc: "Aggregate processor kill grid prices, compare which processor pays best for your mob's spec, and track actual vs quoted performance over time.",
              },
              {
                icon: Bot,
                color: "text-violet-600",
                bg: "bg-violet-50",
                title: "AI Sell/Hold Recommendations",
                desc: "Claude AI analyses your mob's cost base, ADG, market benchmarks, and weather forecast to give a plain-language recommendation: sell now, hold 2 weeks, or renegotiate.",
              },
            ].map(card => (
              <div key={card.title} className="rounded-2xl border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className={`h-11 w-11 rounded-xl ${card.bg} flex items-center justify-center mb-4`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <h3 className="font-bold text-base text-foreground mb-2">{card.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Feature showcase ──────────────────────────────────────────────── */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Product</p>
          <h2 className="text-2xl font-bold text-foreground mb-6">What's built</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURES.map(f => (
              <button
                key={f.name}
                onClick={() => navigate(f.route)}
                className="rounded-2xl border bg-white p-5 flex items-start gap-4 text-left hover:shadow-md hover:border-green-200 transition-all group"
              >
                <div className={`h-10 w-10 rounded-xl ${f.bg} flex items-center justify-center shrink-0`}>
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-foreground">{f.name}</p>
                  <p className="text-muted-foreground text-xs mt-1 leading-relaxed">{f.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0 group-hover:text-green-600 group-hover:translate-x-0.5 transition-all mt-0.5" />
              </button>
            ))}
          </div>
        </div>

        {/* ── Live platform stats ───────────────────────────────────────────── */}
        <div className="rounded-2xl border bg-gradient-to-br from-slate-50 to-white p-6">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Live data</p>
          <h2 className="text-xl font-bold text-foreground mb-4">Platform stats — live</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Mobs tracked", value: String(activeMobs.length), sub: "active" },
              { label: "Head under management", value: totalHead.toLocaleString(), sub: "total" },
              { label: "EYCI (MLA)", value: eyci ? `${eyci.cents_per_kg}¢/kg CW` : "—", sub: "Eastern Young Cattle Indicator" },
              { label: "Feeder steer", value: feeder ? `${feeder.cents_per_kg}¢/kg LW` : "—", sub: benchDate ? `MLA/NLRS · ${benchDate}` : "MLA/NLRS" },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border p-4 text-center shadow-sm">
                <p className="text-2xl font-extrabold text-green-700">{s.value}</p>
                <p className="text-foreground text-xs font-semibold mt-1">{s.label}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Competitive positioning ───────────────────────────────────────── */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Landscape</p>
          <h2 className="text-2xl font-bold text-foreground mb-6">The competitive landscape</h2>

          {/* Muster highlight row */}
          <div className="rounded-2xl bg-gradient-to-r from-green-700 to-emerald-600 p-4 mb-3 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-white shrink-0" />
            <div className="flex-1">
              <p className="text-white font-extrabold text-base">Muster</p>
              <p className="text-white/70 text-xs">AI-powered mob-level economics, live processor grids, sell/hold recommendations, Australian market — SaaS, mobile-first</p>
            </div>
            <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30 shrink-0">Muster ✓</span>
          </div>

          <div className="rounded-2xl border overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b">
                  <th className="px-5 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">Competitor</th>
                  <th className="px-5 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">What they do</th>
                  <th className="px-5 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">Key gap vs Muster</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {COMPETITORS.map((c, i) => (
                  <tr key={c.name} className={i % 2 === 0 ? "bg-white" : "bg-muted/20"}>
                    <td className="px-5 py-3 font-semibold text-foreground">{c.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{c.what}</td>
                    <td className="px-5 py-3 text-red-600 font-medium">{c.gap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Investment opportunity ─────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-teal-700 via-emerald-700 to-green-700 p-8 text-center">
          <p className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-2">Opportunity</p>
          <h2 className="text-white text-3xl font-extrabold mb-8">The opportunity</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { stat: "18,000+", label: "Australian feedlot & backgrounding operators" },
              { stat: "$15.5B", label: "Global agtech market (2024)" },
              { stat: "28.5%", label: "CAGR of AI in precision livestock farming" },
              { stat: "$0", label: "Accessible SaaS feedlot economics tools today" },
            ].map(s => (
              <div key={s.stat} className="bg-white/15 border border-white/20 rounded-xl p-4 backdrop-blur">
                <p className="text-white text-3xl font-extrabold mb-1">{s.stat}</p>
                <p className="text-white/70 text-xs leading-snug">{s.label}</p>
              </div>
            ))}
          </div>

          <p className="text-white/60 text-sm mb-6">
            Muster is seed-stage. Prototype live. Pilot discussions underway with Australian cattle operators.
          </p>

          <Button
            onClick={() => navigate("/on-farm")}
            className="bg-white text-emerald-800 hover:bg-emerald-50 font-bold gap-2 px-8 py-3 text-base"
          >
            Explore the platform
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

      </div>
    </DashboardLayout>
  );
}
