export type PropertyType = "feedlot" | "pastoral" | "agistment" | "backgrounding" | "mixed";
export type AustralianState = "VIC" | "NSW" | "QLD" | "SA" | "WA" | "NT" | "TAS";
export type PenProgram = "gff_35" | "msa_60" | "msa_90" | "msa_100plus" | "export_grass" | "custom";
export type PenStatus = "empty" | "filling" | "active" | "ready" | "resting";

export interface Property {
  id: string;
  created_at: string;
  owner_id: string | null;
  name: string;
  property_type: PropertyType;
  location: string | null;
  state: string | null;
  capacity_head: number | null;
  current_head: number | null;
  linked_plant_id: string | null;
  nfas_accredited: boolean;
  nfas_number: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  notes: string | null;
  active: boolean;
}

export interface FeedlotPen {
  id: string;
  created_at: string;
  property_id: string;
  pen_number: string;
  capacity: number | null;
  current_mob_id: string | null;
  program: PenProgram | null;
  target_days_on_feed: number | null;
  target_weight_kg: number | null;
  pen_status: PenStatus;
  date_entered: string | null;
  estimated_exit_date: string | null;
  current_ration: string | null;
  ration_cost_per_tonne: number | null;
  daily_intake_kg_head: number | null;
  notes: string | null;
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  feedlot:       "Feedlot",
  pastoral:      "Pastoral Station",
  agistment:     "Agistment",
  backgrounding: "Backgrounding",
  mixed:         "Mixed Enterprise",
};

export const PEN_PROGRAM_LABELS: Record<PenProgram, string> = {
  gff_35:       "GFF 35+ days (NFAS)",
  msa_60:       "MSA 60 days",
  msa_90:       "MSA 90 days",
  msa_100plus:  "MSA 100+ days (premium)",
  export_grass: "Grassfed Export Finish",
  custom:       "Custom Program",
};

export const PEN_PROGRAM_DOF: Record<PenProgram, number> = {
  gff_35: 35, msa_60: 60, msa_90: 90, msa_100plus: 110, export_grass: 21, custom: 60,
};

export const PEN_STATUS_LABELS: Record<PenStatus, string> = {
  empty:   "Empty",
  filling: "Filling",
  active:  "On Feed",
  ready:   "Ready to Ship",
  resting: "Resting",
};

export const PEN_STATUS_COLORS: Record<PenStatus, string> = {
  empty:   "bg-slate-100 text-slate-500",
  filling: "bg-blue-100 text-blue-700",
  active:  "bg-green-100 text-green-700",
  ready:   "bg-amber-100 text-amber-800",
  resting: "bg-purple-100 text-purple-700",
};

export const STATE_OPTIONS: AustralianState[] = ["VIC","NSW","QLD","SA","WA","NT","TAS"];

// Kill pipeline projection — computed client-side
export interface PipelineWeek {
  weekLabel: string;       // "Week 1 (2 Jun)", "Week 2 (9 Jun)" etc
  weekStart: Date;
  headReady: number;       // head projected to be at or past target weight
  mobsReady: { mobName: string; headCount: number; property: string; program: string; adg: number; projectedWeight: number }[];
  cumulativeHead: number;
}
