export type MobCategory =
  | "boner_cow" | "lot_fed" | "backgrounder" | "weaner"
  | "breeder" | "trade" | "bull" | "cull_cow";

export type ProgramType = "feedlot" | "grass" | "agistment" | "backgrounding";
export type ExitPath = "saleyard" | "oth" | "live_export" | "breeding" | "kill_own";
export type MobStatus = "active" | "sold" | "slaughtered" | "transferred";
export type CostType =
  | "purchase" | "freight_in" | "freight_out" | "yard_dues" | "agent_commission"
  | "mla_levy" | "feed_grain" | "feed_hay" | "feed_supplement" | "agistment"
  | "vet" | "vaccination" | "drenching" | "preg_test" | "branding"
  | "insurance" | "interest" | "water_infrastructure" | "labour" | "other";

export interface Mob {
  id: string;
  created_at: string;
  owner_id: string | null;
  mob_name: string;
  category: MobCategory;
  breed_type: string | null;
  head_count: number;
  purchase_date: string;
  purchase_price_per_head: number | null;
  purchase_cents_per_kg: number | null;
  purchase_weight_avg_kg: number | null;
  shrink_pct: number | null;
  arrival_weight_avg_kg: number | null;
  source_type: string | null;
  source_name: string | null;
  agent_name: string | null;
  agent_commission_pct: number | null;
  location_name: string | null;
  program_type: ProgramType | null;
  target_exit_path: ExitPath | null;
  target_exit_date: string | null;
  target_weight_kg: number | null;
  hgp_free: boolean;
  msa_eligible: boolean;
  halal_certified: boolean;
  nlis_confirmed: boolean;
  nvd_received: boolean;
  status: MobStatus;
  notes: string | null;
}

export interface MobCost {
  id: string;
  mob_id: string;
  created_at: string;
  cost_date: string;
  cost_type: CostType;
  description: string | null;
  amount_total: number;
  per_head: number | null;
  head_count: number | null;
  notes: string | null;
}

export interface WeightRecord {
  id: string;
  mob_id: string;
  created_at: string;
  weigh_date: string;
  avg_weight_kg: number;
  head_count: number | null;
  method: string | null;
  adg_since_last: number | null;
  notes: string | null;
}

export interface MarketBenchmark {
  id: string;
  benchmark_date: string;
  indicator: string;
  cents_per_kg: number;
  basis: string | null;
  source: string | null;
  notes: string | null;
}

export const CATEGORY_LABELS: Record<MobCategory, string> = {
  boner_cow:    "Boner Cow",
  lot_fed:      "Lot Fed",
  backgrounder: "Backgrounder",
  weaner:       "Weaner",
  breeder:      "Breeder",
  trade:        "Trade Cattle",
  bull:         "Bull",
  cull_cow:     "Cull Cow",
};

export const PROGRAM_LABELS: Record<ProgramType, string> = {
  feedlot:       "Feedlot",
  grass:         "Grass / Pasture",
  agistment:     "Agistment",
  backgrounding: "Backgrounding",
};

export const EXIT_PATH_LABELS: Record<ExitPath, string> = {
  saleyard:    "Sell Store — Saleyard",
  oth:         "Sell OTH — Direct to Processor",
  live_export: "Live Export",
  breeding:    "Sell as Breeding Stock",
  kill_own:    "Kill Own (Boning Room)",
};

export const COST_TYPE_LABELS: Record<CostType, string> = {
  purchase:           "Purchase Price",
  freight_in:         "Freight In",
  freight_out:        "Freight Out",
  yard_dues:          "Yard Dues",
  agent_commission:   "Agent Commission",
  mla_levy:           "MLA Levy",
  feed_grain:         "Feed — Grain",
  feed_hay:           "Feed — Hay / Roughage",
  feed_supplement:    "Feed — Supplement",
  agistment:          "Agistment",
  vet:                "Vet",
  vaccination:        "Vaccination",
  drenching:          "Drenching",
  preg_test:          "Pregnancy Testing",
  branding:           "Branding / Marking",
  insurance:          "Insurance",
  interest:           "Interest on Capital",
  water_infrastructure: "Water / Infrastructure",
  labour:             "Labour",
  other:              "Other",
};

export const COST_TYPE_GROUPS: { label: string; types: CostType[] }[] = [
  { label: "Acquisition", types: ["purchase", "freight_in", "yard_dues", "agent_commission", "mla_levy"] },
  { label: "Feed", types: ["feed_grain", "feed_hay", "feed_supplement", "agistment"] },
  { label: "Health", types: ["vet", "vaccination", "drenching", "preg_test", "branding"] },
  { label: "Finance", types: ["insurance", "interest", "water_infrastructure", "labour", "freight_out", "other"] },
];
