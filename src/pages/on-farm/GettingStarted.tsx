import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LivestockLayout } from "@/components/LivestockLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, Circle, ArrowRight, ChevronDown, ChevronUp,
  FileText, Scale, DollarSign, Building2, Beef,
} from "lucide-react";

interface Step {
  id: string;
  number: number;
  title: string;
  why: string;
  unlocks: string[];
  action: string;
  actionRoute?: string;
  done: boolean;
  icon: React.ReactNode;
}

export default function GettingStarted() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<string | null>("operation");

  // Data state
  const [operationName, setOperationName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [hasMobs, setHasMobs] = useState(false);
  const [hasWeights, setHasWeights] = useState(false);
  const [hasCosts, setHasCosts] = useState(false);
  const [hasGrids, setHasGrids] = useState(false);
  const [hasPurchasePrice, setHasPurchasePrice] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      const [entRes, mobRes, wtRes, costRes, gridRes] = await Promise.all([
        supabase.from("enterprise_settings").select("operation_name").single(),
        supabase.from("mobs").select("id, purchase_price_per_head, purchase_cents_per_kg").limit(10),
        supabase.from("weight_records").select("id").limit(1),
        supabase.from("mob_costs").select("id").limit(1),
        supabase.from("processor_grids").select("id").limit(1),
      ]);

      const name = entRes.data?.operation_name ?? "";
      setSavedName(name);
      setOperationName(name);

      const mobs = (mobRes.data ?? []) as any[];
      setHasMobs(mobs.length > 0);
      setHasPurchasePrice(mobs.some((m: any) => m.purchase_price_per_head || m.purchase_cents_per_kg));
      setHasWeights((wtRes.data?.length ?? 0) > 0);
      setHasCosts((costRes.data?.length ?? 0) > 0);
      setHasGrids((gridRes.data?.length ?? 0) > 0);
      setLoading(false);

      // Auto-expand first incomplete step
      if (!name) setExpanded("operation");
      else if (mobs.length === 0) setExpanded("mob");
      else if ((wtRes.data?.length ?? 0) === 0) setExpanded("weights");
      else if ((costRes.data?.length ?? 0) === 0) setExpanded("costs");
      else if ((gridRes.data?.length ?? 0) === 0) setExpanded("grids");
      else setExpanded(null);
    }
    check();
  }, []);

  async function saveName() {
    if (!operationName.trim()) return;
    setSavingName(true);
    const { error } = await supabase.from("enterprise_settings").upsert({
      operation_name: operationName.trim(),
    });
    setSavingName(false);
    if (error) {
      toast({ title: "Error saving", description: error.message, variant: "destructive" });
    } else {
      setSavedName(operationName.trim());
      toast({ title: "Operation name saved" });
      setExpanded("mob");
    }
  }

  const steps: Step[] = [
    {
      id: "operation",
      number: 1,
      title: "Name your operation",
      why: "Your operation name appears on the Livestock Trading Statement — it's what the bank sees at the top of the document.",
      unlocks: ["Trading Statement header", "Morning Briefing personalisation"],
      action: "Save name",
      done: !!savedName,
      icon: <Building2 className="h-5 w-5" />,
    },
    {
      id: "mob",
      number: 2,
      title: "Add your first mob",
      why: "Every mob is a trading unit — its own P&L, weight tracking, and exit plan. Add the purchase date, head count and purchase price to set the cost base.",
      unlocks: ["Portfolio summary", "Break-even on mob card", "Hold vs Sell scenario"],
      action: "Add a mob",
      actionRoute: "/on-farm/mobs/new",
      done: hasMobs && hasPurchasePrice,
      icon: <Beef className="h-5 w-5" />,
    },
    {
      id: "weights",
      number: 3,
      title: "Log a weight",
      why: "A current weight gives you Average Daily Gain, projects your exit date and calculates where the mob sits against the market right now.",
      unlocks: ["ADG tracking", "Days to target weight", "Break-even c/kg vs market", "Margin per head on mob card"],
      action: "Open a mob to log weight",
      actionRoute: "/on-farm",
      done: hasWeights,
      icon: <Scale className="h-5 w-5" />,
    },
    {
      id: "costs",
      number: 4,
      title: "Add your costs",
      why: "Feed, freight, vet, levies — every cost logged flows into the mob P&L, the trading statement and the AI briefing. Without costs, the financials are incomplete.",
      unlocks: ["True P&L per mob", "Total cost in trading statement", "Unrealised P&L vs purchase value", "AI recommendation accuracy"],
      action: "Open a mob to add costs",
      actionRoute: "/on-farm",
      done: hasCosts,
      icon: <DollarSign className="h-5 w-5" />,
    },
    {
      id: "grids",
      number: 5,
      title: "Add processor grids",
      why: "Once you have processor prices locked in, Muster can compare JBS vs Teys vs Herds on a dollar-per-head basis — accounting for yield, MSA and transport — and show you the best option.",
      unlocks: ["Processor comparison in Decision Engine", "Best exit path by $/head", "Processor-specific kill scheduling"],
      action: "Add processor grids",
      actionRoute: "/on-farm/grids",
      done: hasGrids,
      icon: <FileText className="h-5 w-5" />,
    },
  ];

  const completedCount = steps.filter(s => s.done).length;
  const allDone = completedCount === steps.length;

  return (
    <LivestockLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Setup</p>
          <h1 className="text-3xl font-extrabold tracking-tight">Getting started</h1>
          <p className="text-muted-foreground mt-2">
            Complete these steps to unlock your trading statement, morning briefing and full decision engine.
          </p>
        </div>

        {/* Progress bar */}
        <div className="rounded-2xl border bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold">{completedCount} of {steps.length} steps complete</p>
            {allDone && (
              <span className="text-xs font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full">
                All done — your statement is ready
              </span>
            )}
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / steps.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {steps.map(s => (
              <div key={s.id} className={`text-xs font-medium ${s.done ? "text-amber-600" : "text-muted-foreground"}`}>
                {s.number}
              </div>
            ))}
          </div>
        </div>

        {/* What you get at the end */}
        {!allDone && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-bold text-amber-900 mb-3">What you get when complete</p>
            <div className="grid grid-cols-1 gap-2">
              {[
                { icon: "📊", label: "Livestock Trading Statement", desc: "Bank-ready document showing cost base, current market value and P&L per mob" },
                { icon: "🌅", label: "Morning Briefing", desc: "AI-generated daily summary — which mobs need attention, what the market is doing, what to act on" },
                { icon: "⚖️", label: "Hold vs Sell", desc: "Model any hold period against current costs and market to get a dollar-per-head answer" },
                { icon: "🏆", label: "Best processor by $/head", desc: "Compare your processors on yield, grid price and transport — one click to the best option" },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-amber-900">{item.label}</p>
                    <p className="text-xs text-amber-700">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {allDone && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <p className="text-lg font-bold text-green-800 mb-1">Your setup is complete</p>
            <p className="text-sm text-green-700 mb-4">Everything is in place. Your trading statement and briefing are live with real data.</p>
            <div className="flex gap-3">
              <Button onClick={() => navigate("/on-farm/statement")} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                <FileText className="h-4 w-4" /> View Trading Statement
              </Button>
              <Button variant="outline" onClick={() => navigate("/on-farm/briefing")} className="gap-2">
                View Morning Briefing
              </Button>
            </div>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-sm py-4 text-center">Checking your setup…</p>
          ) : (
            steps.map(step => {
              const isExpanded = expanded === step.id;
              return (
                <div
                  key={step.id}
                  className={`rounded-2xl border bg-white overflow-hidden transition-all ${
                    step.done ? "border-green-200" : isExpanded ? "border-amber-300 shadow-sm" : "border-border"
                  }`}
                >
                  {/* Step header */}
                  <button
                    className="w-full flex items-center gap-4 px-5 py-4 text-left"
                    onClick={() => setExpanded(isExpanded ? null : step.id)}
                  >
                    <div className={`shrink-0 ${step.done ? "text-green-500" : "text-muted-foreground"}`}>
                      {step.done
                        ? <CheckCircle2 className="h-6 w-6" />
                        : <Circle className="h-6 w-6" />}
                    </div>
                    <div className={`shrink-0 h-9 w-9 rounded-xl flex items-center justify-center ${
                      step.done ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
                    }`}>
                      {step.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">Step {step.number}</span>
                        {step.done && <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Done</span>}
                      </div>
                      <p className={`font-bold text-base leading-tight ${step.done ? "text-muted-foreground line-through" : ""}`}>
                        {step.title}
                      </p>
                    </div>
                    <div className="shrink-0 text-muted-foreground">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </button>

                  {/* Step body */}
                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-4 border-t border-border/50">

                      <p className="text-sm text-muted-foreground leading-relaxed pt-4">{step.why}</p>

                      {/* What it unlocks */}
                      <div className="rounded-xl bg-muted/30 px-4 py-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">This step unlocks</p>
                        <ul className="space-y-1">
                          {step.unlocks.map(u => (
                            <li key={u} className="flex items-center gap-2 text-sm">
                              <ArrowRight className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                              {u}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Special inline action for Step 1 */}
                      {step.id === "operation" && (
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold">Operation name</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="e.g. Jumbunna Pastoral, Smith Family Farms"
                              value={operationName}
                              onChange={e => setOperationName(e.target.value)}
                              onKeyDown={e => e.key === "Enter" && saveName()}
                              className="rounded-xl"
                            />
                            <Button
                              onClick={saveName}
                              disabled={savingName || !operationName.trim()}
                              className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                            >
                              {savingName ? "Saving…" : "Save"}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">This appears on your trading statement and briefings.</p>
                        </div>
                      )}

                      {/* Action button for all other steps */}
                      {step.id !== "operation" && (
                        <Button
                          onClick={() => step.actionRoute && navigate(step.actionRoute)}
                          className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                        >
                          {step.action}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      )}

                      {/* Next step hint */}
                      {step.done && (
                        <p className="text-xs text-green-600 font-medium text-center">
                          ✓ Complete — move to the next step
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Trading statement CTA */}
        {completedCount >= 3 && !allDone && (
          <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-5 text-center">
            <p className="text-sm font-bold text-amber-900">Your statement is partially ready</p>
            <p className="text-xs text-amber-700 mt-1 mb-3">Complete steps {steps.filter(s => !s.done).map(s => s.number).join(" and ")} for a full picture — but you can already view what's there.</p>
            <Button variant="outline" onClick={() => navigate("/on-farm/statement")} className="gap-2 border-amber-300 text-amber-800">
              <FileText className="h-4 w-4" /> View partial statement
            </Button>
          </div>
        )}

      </div>
    </LivestockLayout>
  );
}
