import { differenceInDays, format } from "date-fns";
import { ArrowRight, CheckCircle, AlertTriangle, Clock, Scale } from "lucide-react";
import { categoryToken, exitToken, programToken } from "./farmTokens";
import type { Mob } from "./types";

interface MobCardProps {
  mob: Mob;
  latestWeightKg?: number | null;
  adg?: number | null;
  totalCostPerHead?: number;
  onClick: () => void;
}

export function MobCard({ mob, latestWeightKg, adg, totalCostPerHead, onClick }: MobCardProps) {
  const cat = categoryToken(mob.category);
  const exit = exitToken(mob.target_exit_path);
  const prog = programToken(mob.program_type);
  const dof = differenceInDays(new Date(), new Date(mob.purchase_date));

  // Days to exit
  const daysToExit = mob.target_exit_date
    ? differenceInDays(new Date(mob.target_exit_date), new Date())
    : null;

  // DOF progress % (vs target exit date if set, else vs 90 day default)
  const dofTarget = mob.target_exit_date
    ? differenceInDays(new Date(mob.target_exit_date), new Date(mob.purchase_date))
    : 90;
  const dofPct = Math.min(100, Math.round((dof / dofTarget) * 100));

  // Weight progress
  const currentWt = latestWeightKg ?? mob.arrival_weight_avg_kg ?? mob.purchase_weight_avg_kg ?? 0;
  const arrivalWt = mob.arrival_weight_avg_kg ?? mob.purchase_weight_avg_kg ?? 0;
  const targetWt = mob.target_weight_kg ?? 0;
  const wtPct = targetWt && arrivalWt
    ? Math.min(100, Math.round(((currentWt - arrivalWt) / (targetWt - arrivalWt)) * 100))
    : 0;

  const isReady = daysToExit !== null && daysToExit <= 7;
  const isDueSoon = daysToExit !== null && daysToExit > 7 && daysToExit <= 21;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl overflow-hidden shadow-sm border ${cat.border} bg-white hover:shadow-md transition-all duration-200 active:scale-[0.98]`}
    >
      {/* Coloured header band */}
      <div className={`bg-gradient-to-r ${cat.gradient} px-5 pt-4 pb-5`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-white/70 text-xs font-medium uppercase tracking-wider">{cat.label}</p>
            <h3 className="text-white font-bold text-lg leading-tight mt-0.5 truncate">{mob.mob_name}</h3>
          </div>
          {isReady ? (
            <span className="shrink-0 bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full border border-white/30">
              READY
            </span>
          ) : isDueSoon ? (
            <span className="shrink-0 bg-amber-400/80 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              DUE SOON
            </span>
          ) : null}
        </div>

        {/* Big stats row */}
        <div className="flex gap-5 mt-3">
          <div>
            <p className="text-white/60 text-xs">Head</p>
            <p className="text-white font-bold text-2xl leading-tight">{mob.head_count}</p>
          </div>
          <div>
            <p className="text-white/60 text-xs">Days on feed</p>
            <p className="text-white font-bold text-2xl leading-tight">{dof}</p>
          </div>
          {currentWt > 0 && (
            <div>
              <p className="text-white/60 text-xs">Avg weight</p>
              <p className="text-white font-bold text-2xl leading-tight">{currentWt.toFixed(0)}<span className="text-sm font-normal">kg</span></p>
            </div>
          )}
          {adg != null && adg > 0 && (
            <div>
              <p className="text-white/60 text-xs">ADG</p>
              <p className="text-white font-bold text-2xl leading-tight">{adg.toFixed(2)}<span className="text-sm font-normal">kg</span></p>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className={`${cat.bg} px-5 py-4 space-y-3`}>
        {/* Progress bars */}
        <div className="space-y-2">
          {/* DOF progress */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className={`${cat.text} font-medium`}>Time on feed</span>
              <span className={cat.text}>{dof}d {mob.target_exit_date ? `of ${dofTarget}d` : ""}</span>
            </div>
            <div className="h-2 bg-black/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${cat.gradient} transition-all`}
                style={{ width: `${dofPct}%` }}
              />
            </div>
          </div>

          {/* Weight progress */}
          {targetWt > 0 && arrivalWt > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className={`${cat.text} font-medium`}>Weight to target</span>
                <span className={cat.text}>{currentWt.toFixed(0)}kg of {targetWt}kg</span>
              </div>
              <div className="h-2 bg-black/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${wtPct >= 100 ? "bg-green-500" : `bg-gradient-to-r ${cat.gradient}`}`}
                  style={{ width: `${Math.max(4, wtPct)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Detail row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {mob.location_name && (
            <span className={`text-xs ${cat.text} opacity-70`}>{mob.location_name}</span>
          )}
          {prog && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${prog.color}`}>{prog.label}</span>
          )}
          {exit && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${exit.color}`}>{exit.short}</span>
          )}
          {mob.hgp_free && <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 text-green-800 font-medium">HGP Free</span>}
          {mob.msa_eligible && <span className="text-xs px-2 py-0.5 rounded-full bg-white/60 text-blue-800 font-medium">MSA</span>}
        </div>

        {/* Bottom row: cost + exit date + arrow */}
        <div className="flex items-center justify-between pt-1 border-t border-black/10">
          <div className="flex gap-4 text-xs">
            {totalCostPerHead != null && totalCostPerHead > 0 && (
              <div>
                <span className={`${cat.text} opacity-60`}>Cost/head </span>
                <span className={`${cat.text} font-bold`}>${totalCostPerHead.toFixed(0)}</span>
              </div>
            )}
            {daysToExit !== null && (
              <div className={`flex items-center gap-1 ${isReady ? "text-white bg-green-600 px-2 py-0.5 rounded-full font-bold text-xs" : cat.text}`}>
                {isReady ? <CheckCircle className="h-3 w-3" /> : daysToExit <= 21 ? <AlertTriangle className="h-3 w-3 text-amber-600" /> : <Clock className="h-3 w-3 opacity-50" />}
                {isReady ? "Exit now" : daysToExit <= 0 ? "Overdue" : `${daysToExit}d to exit`}
              </div>
            )}
          </div>
          <ArrowRight className={`h-5 w-5 ${cat.icon} opacity-60`} />
        </div>
      </div>
    </button>
  );
}

// Compact summary card for use in lists/tables where space is tight
export function MobPill({ mob, onClick }: { mob: Mob; onClick?: () => void }) {
  const cat = categoryToken(mob.category);
  const dof = differenceInDays(new Date(), new Date(mob.purchase_date));
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full text-left rounded-xl border ${cat.border} ${cat.bg} px-4 py-3 hover:shadow-sm transition-all`}
    >
      <div className={`h-3 w-3 rounded-full shrink-0 ${cat.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate">{mob.mob_name}</p>
        <p className="text-xs text-muted-foreground">{mob.head_count} head · {dof}d on feed</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}
