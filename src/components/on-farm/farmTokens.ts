// Farm design token system
// Each cattle category gets a visual identity: gradient, text colour, accent, emoji-free icon colour

export const CATEGORY_TOKENS = {
  lot_fed: {
    gradient: "from-amber-500 to-yellow-600",
    bg: "bg-amber-50",
    border: "border-amber-300",
    badge: "bg-amber-100 text-amber-900",
    dot: "bg-amber-500",
    text: "text-amber-900",
    icon: "text-amber-600",
    label: "Lot Fed",
    tagline: "Feedlot program",
  },
  backgrounder: {
    gradient: "from-green-600 to-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    badge: "bg-emerald-100 text-emerald-900",
    dot: "bg-emerald-500",
    text: "text-emerald-900",
    icon: "text-emerald-600",
    label: "Backgrounder",
    tagline: "Pasture growing",
  },
  boner_cow: {
    gradient: "from-rose-600 to-red-700",
    bg: "bg-rose-50",
    border: "border-rose-300",
    badge: "bg-rose-100 text-rose-900",
    dot: "bg-rose-500",
    text: "text-rose-900",
    icon: "text-rose-600",
    label: "Boner Cow",
    tagline: "Direct to processor",
  },
  weaner: {
    gradient: "from-sky-500 to-blue-600",
    bg: "bg-sky-50",
    border: "border-sky-300",
    badge: "bg-sky-100 text-sky-900",
    dot: "bg-sky-500",
    text: "text-sky-900",
    icon: "text-sky-600",
    label: "Weaner",
    tagline: "Early growth stage",
  },
  breeder: {
    gradient: "from-purple-600 to-violet-700",
    bg: "bg-purple-50",
    border: "border-purple-300",
    badge: "bg-purple-100 text-purple-900",
    dot: "bg-purple-500",
    text: "text-purple-900",
    icon: "text-purple-600",
    label: "Breeder",
    tagline: "Breeding stock",
  },
  trade: {
    gradient: "from-slate-500 to-slate-700",
    bg: "bg-slate-50",
    border: "border-slate-300",
    badge: "bg-slate-100 text-slate-900",
    dot: "bg-slate-500",
    text: "text-slate-900",
    icon: "text-slate-600",
    label: "Trade",
    tagline: "Trading stock",
  },
  bull: {
    gradient: "from-orange-600 to-red-600",
    bg: "bg-orange-50",
    border: "border-orange-300",
    badge: "bg-orange-100 text-orange-900",
    dot: "bg-orange-500",
    text: "text-orange-900",
    icon: "text-orange-600",
    label: "Bull",
    tagline: "Bull program",
  },
  cull_cow: {
    gradient: "from-red-500 to-rose-700",
    bg: "bg-red-50",
    border: "border-red-300",
    badge: "bg-red-100 text-red-900",
    dot: "bg-red-400",
    text: "text-red-900",
    icon: "text-red-600",
    label: "Cull Cow",
    tagline: "Cull program",
  },
} as const;

export type MobCategoryKey = keyof typeof CATEGORY_TOKENS;

export function categoryToken(cat: string) {
  return CATEGORY_TOKENS[cat as MobCategoryKey] ?? CATEGORY_TOKENS.trade;
}

// Program type labels and colours
export const PROGRAM_TOKENS = {
  feedlot:       { label: "Feedlot",         color: "bg-amber-100 text-amber-800" },
  grass:         { label: "Grass / Pasture",  color: "bg-green-100 text-green-800" },
  agistment:     { label: "Agistment",        color: "bg-blue-100 text-blue-800" },
  backgrounding: { label: "Backgrounding",    color: "bg-emerald-100 text-emerald-800" },
} as const;

export function programToken(prog: string | null) {
  if (!prog) return null;
  return PROGRAM_TOKENS[prog as keyof typeof PROGRAM_TOKENS] ?? { label: prog, color: "bg-muted text-muted-foreground" };
}

// Exit path labels and colours
export const EXIT_TOKENS = {
  saleyard:    { label: "Saleyard",          short: "Saleyard",       color: "bg-slate-100 text-slate-700" },
  oth:         { label: "OTH — Processor",   short: "OTH",            color: "bg-green-100 text-green-700" },
  live_export: { label: "Live Export",        short: "Export",         color: "bg-blue-100 text-blue-700" },
  breeding:    { label: "Breeding Stock",     short: "Breeding",       color: "bg-purple-100 text-purple-700" },
  kill_own:    { label: "Kill Own",           short: "Kill Own",       color: "bg-amber-100 text-amber-800" },
} as const;

export function exitToken(path: string | null) {
  if (!path) return null;
  return EXIT_TOKENS[path as keyof typeof EXIT_TOKENS] ?? { label: path, short: path, color: "bg-muted text-muted-foreground" };
}

// Farm colour palette for CSS
export const FARM_PALETTE = {
  paddock:  "#15803d",  // deep green — primary
  grain:    "#d97706",  // amber — feedlot/grain
  soil:     "#92400e",  // dark amber/brown — earth
  sky:      "#0284c7",  // sky blue — stats
  dust:     "#78716c",  // warm grey — neutral
  blood:    "#b91c1c",  // deep red — alerts
  cream:    "#fef9ee",  // warm off-white — backgrounds
};
