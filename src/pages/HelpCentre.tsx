import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Search, HelpCircle, Mail } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type Role = "all" | "farmer" | "processor" | "enterprise";

interface Article {
  id: string;
  question: string;
  answer: React.ReactNode;
  roles: Role[];
}

interface Section {
  id: string;
  title: string;
  articles: Article[];
}

interface GlossaryTerm {
  term: string;
  definition: string;
}

// ── Role badge helper ─────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: Role }) {
  const map: Record<Role, { label: string; className: string }> = {
    all: { label: "All Roles", className: "bg-gray-100 text-gray-700 border-gray-300" },
    farmer: { label: "Farmers & Producers", className: "bg-green-100 text-green-800 border-green-300" },
    processor: { label: "Processor Staff", className: "bg-blue-100 text-blue-800 border-blue-300" },
    enterprise: { label: "Enterprise", className: "bg-purple-100 text-purple-800 border-purple-300" },
  };
  const { label, className } = map[role];
  return (
    <Badge variant="outline" className={`text-xs ${className}`}>
      {label}
    </Badge>
  );
}

// ── Content ───────────────────────────────────────────────────────────────────

const SECTIONS: Section[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    articles: [
      {
        id: "what-is-muster",
        question: "What is Muster and how does it work?",
        roles: ["all"],
        answer: (
          <p>
            Muster is a platform that connects farmers, processors (abattoirs), and enterprise livestock
            operators. Think of it as the central hub where bookings are made, animals are tracked from
            farm to plate, and financial records are kept in one place. Everyone logs into the same
            system — farmers can see their own animals, and processors can manage the kill floor. No
            more chasing paperwork by phone.
          </p>
        ),
      },
      {
        id: "how-to-log-in",
        question: "How do I log in?",
        roles: ["all"],
        answer: (
          <p>
            Go to the website and click <strong>Log In</strong>. Enter your email and password. If you
            forget your password, click <strong>"Forgot password"</strong> on the login screen and
            follow the email instructions. If you don't have an account yet, contact your Muster
            administrator — they'll set you up with the right role.
          </p>
        ),
      },
      {
        id: "what-does-my-role-mean",
        question: "What does my role mean?",
        roles: ["all"],
        answer: (
          <ul className="space-y-2 list-none">
            {[
              { role: "Supplier / Farmer", desc: "You can see your mobs, your kill results, market prices, and manage your financial records." },
              { role: "Processor Ops", desc: "You can manage bookings, the kill plan, transport, compliance checks, and grading." },
              { role: "Management", desc: "You can see everything — all dashboards, reports, and settings." },
              { role: "Buyer", desc: "You can submit booking requests and view the buyer portal." },
            ].map(({ role, desc }) => (
              <li key={role} className="flex gap-2">
                <span className="font-semibold min-w-36">{role}:</span>
                <span className="text-muted-foreground">{desc}</span>
              </li>
            ))}
          </ul>
        ),
      },
    ],
  },
  {
    id: "farmers",
    title: "For Farmers & Producers",
    articles: [
      {
        id: "add-mob",
        question: "How do I add my livestock (create a mob)?",
        roles: ["farmer"],
        answer: (
          <>
            <ol className="list-decimal list-inside space-y-1 mb-3">
              <li>Click <strong>On Farm Home</strong> in the left menu.</li>
              <li>Click the green <strong>+ New Mob</strong> button.</li>
              <li>Fill in: mob name, species (cattle / sheep), number of head, breed, and any program details.</li>
              <li>Click <strong>Save</strong>. Your mob now appears in your list.</li>
            </ol>
            <p className="text-muted-foreground text-sm">
              A mob is just a group of animals you manage together — like a paddock or a pen.
            </p>
          </>
        ),
      },
      {
        id: "hgp",
        question: "What is HGP and why does it matter?",
        roles: ["farmer"],
        answer: (
          <>
            <p className="mb-2">
              HGP stands for <strong>Hormone Growth Promotant</strong>. It's a pellet or implant that
              makes cattle grow faster. The important thing to know: if you use HGP on your cattle, they{" "}
              <strong>cannot</strong> be sold to the EU (Europe) or Japan. These markets pay a premium,
              so it's worth knowing before you treat.
            </p>
            <p className="text-muted-foreground text-sm">
              Always record HGP use in Muster so you know which cattle are eligible for which markets.
            </p>
          </>
        ),
      },
      {
        id: "kill-results",
        question: "How do I see what my cattle graded at kill?",
        roles: ["farmer"],
        answer: (
          <p>
            Go to <strong>Farm Tools → Kill Results</strong> in the left menu. You'll see your kill
            history — how many head, what MSA grade they got, average weight, pH result, and total
            value. This information is updated by the processor after kill. You used to have to call
            your agent to find this out — now it's here automatically.
          </p>
        ),
      },
      {
        id: "msa-grade",
        question: "What is MSA grade?",
        roles: ["farmer"],
        answer: (
          <>
            <p className="mb-2">
              MSA stands for <strong>Meat Standards Australia</strong>. It's a grading system that
              predicts how good the beef will taste. The grades are:
            </p>
            <ul className="space-y-1">
              {[
                { grade: "MSA 3", desc: "Good quality" },
                { grade: "MSA 4", desc: "Better quality — most common" },
                { grade: "MSA 5", desc: "Premium" },
                { grade: "MSA 6", desc: "Top tier (often Wagyu or high marbling)" },
              ].map(({ grade, desc }) => (
                <li key={grade} className="flex gap-2">
                  <span className="font-semibold w-16">{grade}:</span>
                  <span className="text-muted-foreground">{desc}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-muted-foreground">
              Higher MSA grade = higher price per kg. Aim for MSA 4 or above.
            </p>
          </>
        ),
      },
      {
        id: "ph-results",
        question: "What does pH mean on my kill results?",
        roles: ["farmer"],
        answer: (
          <>
            <p className="mb-2">
              pH is measured in the carcase after kill. It tells you how stressed the animal was before
              slaughter. A good pH is <strong>below 5.70</strong>. If pH is above 5.70, the beef can
              be dark and tough — this is called a <strong>"dark cutter."</strong> Dark cutters often
              fail MSA and get a lower price.
            </p>
            <p className="text-sm text-muted-foreground">
              To get good pH: make sure your cattle have a quiet, low-stress journey to the abattoir
              and get at least 24 hours of rest before kill.
            </p>
          </>
        ),
      },
      {
        id: "export-eligibility",
        question: "How do I check if my cattle are export eligible?",
        roles: ["farmer"],
        answer: (
          <p>
            Go to <strong>Farm Tools → Export Compliance</strong>. You'll see a grid showing which of
            your mobs can go to which markets (EU, Japan, USA, Halal, Korea). A green tick means
            eligible. A red X means not eligible — and you can click the X to find out exactly why.
          </p>
        ),
      },
      {
        id: "import-financials",
        question: "How do I import my financial records?",
        roles: ["farmer"],
        answer: (
          <p>
            Go to <strong>Farm Tools → Import Financials</strong>. You can upload a CSV or Excel file
            from Xero, MYOB, AgriMaster, or your bank. Muster will read the transactions and ask you
            to match each one to a mob. Once imported, your cost-of-production figures update
            automatically.
          </p>
        ),
      },
      {
        id: "attach-receipt",
        question: "How do I attach a receipt to a mob?",
        roles: ["farmer"],
        answer: (
          <p>
            Open any mob record (<strong>On Farm Home → click a mob name</strong>). Scroll down to find
            the <strong>Documents</strong> section. Click <strong>"Attach Document,"</strong> drag and
            drop your receipt or invoice, fill in the amount and category (Feed, Vet, Freight etc), and
            save. Muster will try to read the amount and date automatically.
          </p>
        ),
      },
      {
        id: "livestock-trading-account",
        question: "What is the livestock trading account?",
        roles: ["farmer"],
        answer: (
          <>
            <p className="mb-2">
              It's the tax schedule your accountant needs every year. It calculates:
            </p>
            <p className="font-mono text-sm bg-muted rounded p-2 mb-2">
              What you started with + what you bought + costs − what you sold − what you still have ={" "}
              <strong>taxable profit or loss</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Muster generates this automatically from your mob records, cost entries, and kill results.
              Find it under <strong>Enterprise → Financial Analysis → Livestock Trading Account</strong> tab.
            </p>
          </>
        ),
      },
      {
        id: "fmd",
        question: "What is an FMD?",
        roles: ["farmer"],
        answer: (
          <>
            <p className="mb-2">
              FMD stands for <strong>Farm Management Deposit</strong>. It's a government scheme that
              lets you put money into a special bank account in a good year and get a tax deduction.
              When you withdraw it in a tough year, you pay tax then instead. You can deposit up to{" "}
              <strong>$800,000</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Track your FMDs under <strong>Enterprise → Financial Analysis → FMD Tracker</strong> tab.
              Always talk to your accountant before making FMD decisions.
            </p>
          </>
        ),
      },
      {
        id: "qr-code-carton",
        question: "What is the QR code on my carton?",
        roles: ["farmer"],
        answer: (
          <p>
            When your cattle are processed, Muster generates a unique QR code for that kill lot. This
            code can be printed on cartons and retail packaging. When a customer or buyer scans it,
            they see a page showing where the cattle came from, what program they were on, how they
            graded, and where the beef was shipped. This is called <strong>provenance</strong> — and
            it can increase your price per kg, especially for Japan and EU markets.
          </p>
        ),
      },
    ],
  },
  {
    id: "processor",
    title: "For Processor Staff",
    articles: [
      {
        id: "take-booking",
        question: "How do I take a booking?",
        roles: ["processor"],
        answer: (
          <p>
            Go to <strong>Bookings</strong> in the left menu. Click <strong>+ New Booking</strong>.
            Fill in the supplier name, species, number of head, requested kill date, and any compliance
            details. The supplier can also submit requests themselves through the Supplier Portal — you
            just need to confirm them.
          </p>
        ),
      },
      {
        id: "kill-board",
        question: "How does the Kill Board work?",
        roles: ["processor"],
        answer: (
          <p>
            The Kill Board (<strong>Kill Plan</strong> in the menu) shows your upcoming kill days as a
            calendar. Each booking appears as a block. You can drag and drop bookings between days. The
            board flags if a day is over capacity, or if there's an HGP conflict — for example,
            HGP-treated cattle scheduled on an EU kill day would contaminate the whole batch and Muster
            will warn you before that happens.
          </p>
        ),
      },
      {
        id: "nvd",
        question: "What is an NVD and why does it matter?",
        roles: ["processor"],
        answer: (
          <>
            <p className="mb-2">
              NVD stands for <strong>National Vendor Declaration</strong>. It's a document the farmer
              fills out before sending cattle. It declares: what the cattle were treated with, whether
              they're HGP-free, whether withholding periods are clear, and their property ID.
            </p>
            <p className="text-sm text-muted-foreground">
              You must have the NVD before you can kill the animals. In Muster, you can look up an NVD
              number and it auto-fills the compliance fields on the booking.
            </p>
          </>
        ),
      },
      {
        id: "enter-grading",
        question: "How do I enter kill grading results?",
        roles: ["processor"],
        answer: (
          <>
            <p className="mb-2">
              Go to <strong>Reporting → Kill Grading</strong>. Select the booking from the list on the
              left. On the right, enter the grading results — either as a lot average (one record for
              the whole mob) or animal by animal using NLIS tag numbers.
            </p>
            <p className="text-sm text-muted-foreground">
              Fields include: HSCW, pH, fat depth, EMA, marbling, and MSA grade. Save and the producer
              can see these results immediately in their Kill Results page.
            </p>
          </>
        ),
      },
      {
        id: "establishment-certs",
        question: "What are establishment certificates and when do they expire?",
        roles: ["processor"],
        answer: (
          <>
            <p className="mb-2">
              These are the official approvals that allow you to process animals for export. Key ones:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm mb-2">
              <li>DAFF Export Establishment registration</li>
              <li>Halal certification (AFIC, ANIC or HFA)</li>
              <li>EU Listed establishment</li>
              <li>USA FSIS approval</li>
            </ul>
            <p className="text-sm text-muted-foreground">
              Find them under <strong>Reporting → Export Compliance → Establishment Certificates</strong>{" "}
              tab. Muster shows a countdown to expiry and flags anything expiring within 90 days.
            </p>
          </>
        ),
      },
      {
        id: "lot-code-qr",
        question: "What is a lot code and QR code?",
        roles: ["processor"],
        answer: (
          <p>
            After kill, each batch gets a unique lot code (e.g. <code>MST-2025-0641</code>). This code
            links all the data about that kill — where the cattle came from, how they graded, where the
            beef went. Go to <strong>Reporting → Lot Tracking &amp; QR</strong> to see all lots and
            generate QR codes for printing on cartons.
          </p>
        ),
      },
    ],
  },
];

const GLOSSARY: GlossaryTerm[] = [
  { term: "HSCW", definition: "Hot Standard Carcase Weight. The weight of the carcase immediately after slaughter, before chilling. Used to calculate price." },
  { term: "MSA", definition: "Meat Standards Australia. A grading system that predicts eating quality on a scale of 3–6." },
  { term: "pH", definition: "A measure of how stressed the animal was before slaughter. Aim for below 5.70." },
  { term: "HGP", definition: "Hormone Growth Promotant. A pellet that speeds growth. Removes EU/Japan eligibility." },
  { term: "NVD", definition: "National Vendor Declaration. A document the farmer signs declaring the animal's treatment history." },
  { term: "NLIS", definition: "National Livestock Identification System. The mandatory RFID ear tag system that tracks every animal in Australia." },
  { term: "PIC", definition: "Property Identification Code. A unique code for each farm. Like a postcode for your property." },
  { term: "eNVD", definition: "Electronic NVD. The digital version of the vendor declaration, done through the Integrity Systems app." },
  { term: "LPA", definition: "Livestock Production Assurance. A quality assurance program for Australian livestock producers." },
  { term: "OTH", definition: "Over The Hooks. Selling directly to a processor, where you're paid per kg of dressed carcase weight." },
  { term: "GFF / Grain Fed", definition: "Grain Fed Free Range or Grain Fed accreditation program. Requires minimum days on feed." },
  { term: "PCAS", definition: "Pasture-fed Cattle Assurance System. Certifies that cattle were grassfed only." },
  { term: "NFAS", definition: "National Feedlot Accreditation Scheme. Accreditation for feedlot operators." },
  { term: "ESCAS", definition: "Exporter Supply Chain Assurance System. Required for live export — ensures animal welfare throughout the supply chain." },
  { term: "DOF", definition: "Days on Feed. How long cattle have been in a feedlot on grain. Japan requires 100+ days minimum." },
  { term: "EMA", definition: "Eye Muscle Area. The cross-sectional area of the ribeye muscle in cm². Larger = more meat yield." },
  { term: "Marbling", definition: "Intramuscular fat visible as white flecks in the meat. Scored 0–9 on AUS-MEAT scale. Higher = more flavour, higher price." },
  { term: "Dressing %", definition: "The carcase weight as a percentage of liveweight. Typically 55–62% for cattle." },
  { term: "FMD", definition: "Farm Management Deposit. A tax tool that lets farmers deposit income in good years and withdraw in tough years." },
  { term: "Dark cutter", definition: "When beef turns dark due to high pH from pre-slaughter stress. Fails MSA and gets a lower price." },
  { term: "Dentition", definition: "The number of permanent teeth. 0-tooth = young cattle (under ~2 years), 2-tooth = ~2–3 years. EU requires 0–2 tooth." },
  { term: "DAFF", definition: "Department of Agriculture, Fisheries and Forestry. The federal authority that approves export establishments." },
  { term: "AQIS", definition: "Australian Quarantine and Inspection Service (now part of DAFF). Issues health certificates for exports." },
  { term: "ADG", definition: "Average Daily Gain. How much weight an animal gains per day. Good feedlot cattle gain 2–2.5 kg/day." },
  { term: "COG", definition: "Cost of Gain. How much it costs to put on 1 kg of weight. Typically $3.20–3.54/kg in Australian feedlots." },
];

// ── Role filter map ───────────────────────────────────────────────────────────

const TAB_ROLES: { value: string; label: string; match: Role[] }[] = [
  { value: "all", label: "All", match: ["all", "farmer", "processor", "enterprise"] },
  { value: "farmer", label: "Farmers & Producers", match: ["farmer", "all"] },
  { value: "processor", label: "Processor Staff", match: ["processor", "all"] },
  { value: "enterprise", label: "Enterprise", match: ["enterprise", "all"] },
];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HelpCentre() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const activeRoles = useMemo<Role[]>(
    () => TAB_ROLES.find((t) => t.value === activeTab)?.match ?? ["all", "farmer", "processor", "enterprise"],
    [activeTab]
  );

  const query = search.toLowerCase().trim();

  const filteredSections = useMemo(() =>
    SECTIONS.map((section) => ({
      ...section,
      articles: section.articles.filter((article) => {
        const roleMatch = article.roles.some((r) => activeRoles.includes(r));
        if (!roleMatch) return false;
        if (!query) return true;
        return (
          article.question.toLowerCase().includes(query) ||
          String(article.answer).toLowerCase().includes(query)
        );
      }),
    })).filter((s) => s.articles.length > 0),
    [activeRoles, query]
  );

  const filteredGlossary = useMemo(() =>
    GLOSSARY.filter(({ term, definition }) => {
      if (!query) return true;
      return term.toLowerCase().includes(query) || definition.toLowerCase().includes(query);
    }),
    [query]
  );

  const hasResults = filteredSections.length > 0 || filteredGlossary.length > 0;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-16">

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Help Centre</h1>
          <p className="text-muted-foreground text-lg">Simple guides for everything in Muster</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-base"
          />
        </div>

        {/* Role tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            {TAB_ROLES.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-sm">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* No results */}
        {!hasResults && (
          <Card>
            <CardContent className="py-12 text-center">
              <HelpCircle className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No articles match your search. Try different words.</p>
            </CardContent>
          </Card>
        )}

        {/* Article sections */}
        {filteredSections.map((section) => (
          <Card key={section.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {section.articles.map((article) => (
                  <AccordionItem key={article.id} value={article.id}>
                    <AccordionTrigger className="text-left gap-3 hover:no-underline">
                      <span className="flex-1 font-medium">{article.question}</span>
                      <span className="flex gap-1.5 flex-wrap justify-end shrink-0">
                        {article.roles.map((r) => (
                          <RoleBadge key={r} role={r} />
                        ))}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="text-sm text-foreground/90 leading-relaxed pt-1 space-y-2">
                        {article.answer}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        ))}

        {/* Glossary */}
        {filteredGlossary.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Key Terms Glossary</CardTitle>
              <p className="text-sm text-muted-foreground">
                Plain English explanations for every piece of livestock jargon you'll see in Muster.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredGlossary.map(({ term, definition }) => (
                  <div
                    key={term}
                    className="rounded-lg border bg-muted/40 p-3 space-y-1"
                  >
                    <p className="font-semibold text-sm">{term}</p>
                    <p className="text-sm text-muted-foreground leading-snug">{definition}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Support footer */}
        <Card className="border-dashed">
          <CardContent className="py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left space-y-1">
              <p className="font-semibold text-lg">Can't find what you're looking for?</p>
              <p className="text-muted-foreground text-sm">
                Our support team can walk you through anything step by step.
              </p>
            </div>
            <Button asChild size="lg" className="shrink-0">
              <a href="mailto:support@muster.com.au">
                <Mail className="mr-2 h-4 w-4" />
                Contact Support
              </a>
            </Button>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
