import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface HintTooltipProps {
  term: string;
  explanation: string;
  learnMoreUrl?: string;
}

export function HintTooltip({ term, explanation, learnMoreUrl }: HintTooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Explain ${term}`}
          className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-400 text-gray-500 text-[10px] font-semibold leading-none hover:border-gray-600 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 transition-colors cursor-pointer shrink-0"
          onClick={() => setOpen((prev) => !prev)}
        >
          ?
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="max-w-[280px] p-3 text-sm"
      >
        <p className="font-semibold text-gray-900 mb-1">{term}</p>
        <p className="text-gray-600 leading-snug">{explanation}</p>
        {learnMoreUrl && (
          <a
            href={learnMoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-green-700 hover:text-green-900 font-medium text-xs"
          >
            Learn more →
          </a>
        )}
      </PopoverContent>
    </Popover>
  );
}

export const HINTS: Record<string, { explanation: string; learnMoreUrl?: string }> = {
  msa_grade: {
    explanation:
      "MSA stands for Meat Standards Australia. Grades run from 3 (good) to 6 (exceptional). Higher grade = higher price per kg. Most cattle grade MSA 4.",
  },
  msa_index: {
    explanation:
      "A score from 39–100 that predicts eating quality. Calculated from pH, marbling, fat depth and other factors. Aim for 60+.",
  },
  hgp: {
    explanation:
      "Hormone Growth Promotant — a pellet that speeds growth. If used, cattle CANNOT be sold to EU or Japan markets. Always record HGP use.",
  },
  ph: {
    explanation:
      "Measures stress before slaughter. Aim for below 5.70. Above 5.70 is a 'dark cutter' — tough, dark meat that gets a lower price.",
  },
  hscw: {
    explanation:
      "Hot Standard Carcase Weight — the weight of the carcase right after slaughter. Price is calculated per kg of HSCW.",
  },
  dressing_pct: {
    explanation:
      "Carcase weight as a percentage of live weight. Cattle typically dress at 55–62%. Higher dressing % = more meat per animal.",
  },
  ema: {
    explanation:
      "Eye Muscle Area — the cross-section of the ribeye in cm². Larger EMA means more high-value cuts. Measured at the 12th rib.",
  },
  marbling: {
    explanation:
      "Fat visible as white flecks inside the muscle. Scored 0–9 (AUS-MEAT scale). Higher marbling = more flavour and higher price, especially for Japan.",
  },
  nvd: {
    explanation:
      "National Vendor Declaration — a document the farmer signs before sending livestock. Declares treatment history, HGP status, and property ID. Must be received before kill.",
  },
  nlis: {
    explanation:
      "National Livestock Identification System — the mandatory RFID ear tag that tracks every animal in Australia. Every transfer must be recorded on the NLIS database.",
  },
  pic: {
    explanation:
      "Property Identification Code — a unique code for your farm. Every property in Australia has one. Like a postcode but just for your land.",
  },
  lpa: {
    explanation:
      "Livestock Production Assurance — a quality assurance program. Being LPA accredited means your property meets basic food safety and animal welfare standards.",
  },
  eu_eligible: {
    explanation:
      "EU (Europe) requires beef to be HGP-free and from cattle under 30 months old (0–2 tooth). EU markets typically pay a premium of 15–20% over domestic.",
  },
  days_on_feed: {
    explanation:
      "How long cattle have been eating grain in a feedlot. GFF accreditation requires minimum 100 days. Japan spec programs typically require 150+ days.",
  },
  gff: {
    explanation:
      "Grain Fed Free Range accreditation — a certified grain-fed program. Required for many premium export markets. Minimum 60–100 days on feed depending on program.",
  },
  pcas: {
    explanation:
      "Pasture-fed Cattle Assurance System — independently audited certification that cattle were 100% grassfed. Commands a grassfed premium in domestic and export markets.",
  },
  escas: {
    explanation:
      "Exporter Supply Chain Assurance System — mandatory for live export. Requires documented animal welfare at every step from farm to overseas slaughter.",
  },
  fmd: {
    explanation:
      "Farm Management Deposit — a tax tool allowing farmers to deposit income in good years (tax deductible) and withdraw in tough years. Max $800,000.",
  },
  dentition: {
    explanation:
      "Number of permanent front teeth. 0-tooth = young (under ~2 years). EU and Japan require 0–2 tooth. More teeth = older animal = less eligible for premium markets.",
  },
  cog: {
    explanation:
      "Cost of Gain — how much it costs to add 1kg of weight. Australian feedlots typically run $3.20–$3.54/kg. Key number for feedlot profitability.",
  },
  oth: {
    explanation:
      "Over The Hooks — selling directly to a processor, paid per kg of dressed carcase weight. As opposed to selling liveweight at a saleyard.",
  },
  provenance: {
    explanation:
      "The verified story of where an animal came from, how it was raised, and how it performed at kill. A QR-scannable provenance record can increase price per kg for premium markets.",
  },
  lot_code: {
    explanation:
      "A unique reference (e.g. MST-2025-0641) assigned to each kill batch in Muster. Links the live animal data to the carcase data to the export destination. Used on QR codes.",
  },
  fill_rate: {
    explanation:
      "How full the kill schedule is as a percentage of capacity. 100% = fully booked. Most processors aim for 85–95% to allow for changes and no-shows.",
  },
  slot_adherence: {
    explanation:
      "How often transport slots are met on time. Low adherence means trucks arriving outside their booked window — causing delays for everyone else.",
  },
};
