import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface GettingStartedProps {
  role: string; // 'supplier' | 'ops' | 'management' | 'buyer'
  open: boolean;
  onClose: () => void;
}

interface Step {
  icon: string;
  title: string;
  description: string;
  link?: string;
}

const STEPS_BY_ROLE: Record<string, Step[]> = {
  supplier: [
    {
      icon: "🐄",
      title: "Add your first mob",
      description:
        "Tell Muster about your livestock. Start with one mob — a group of cattle or sheep you manage together.",
      link: "/on-farm/mobs/new",
    },
    {
      icon: "📊",
      title: "Check market prices",
      description:
        "See live cattle and sheep prices. Compare saleyards, online auctions, and processor grids.",
      link: "/on-farm/market",
    },
    {
      icon: "🏆",
      title: "See your kill results",
      description:
        "After your cattle are processed, your MSA grade, pH, and total value appear here automatically.",
      link: "/on-farm/kill-results",
    },
    {
      icon: "📋",
      title: "Check export eligibility",
      description:
        "See which markets your mobs qualify for — EU, Japan, Halal, Korea. One click to see what's stopping you.",
      link: "/on-farm/export-compliance",
    },
  ],
  ops: [
    {
      icon: "📅",
      title: "Review the kill board",
      description:
        "See all upcoming bookings on a calendar. Drag and drop to rearrange. Flag conflicts automatically.",
      link: "/kill-plan",
    },
    {
      icon: "✅",
      title: "Check compliance",
      description:
        "See which bookings have their NVD, NLIS transfer, and vendor declaration confirmed before kill day.",
      link: "/compliance",
    },
    {
      icon: "📏",
      title: "Enter kill grading",
      description:
        "After kill, enter the grading results. The producer sees them immediately — no more phone calls.",
      link: "/kill-grading",
    },
    {
      icon: "🔲",
      title: "Generate a QR code",
      description:
        "Create a scannable provenance record for each kill lot. Print it on cartons for premium markets.",
      link: "/lot-tracking",
    },
  ],
  management: [
    {
      icon: "📊",
      title: "View KPI dashboard",
      description:
        "Live metrics: fill rate, slot adherence, on-spec percentage, changes count.",
      link: "/kpis",
    },
    {
      icon: "📦",
      title: "Check forward volume",
      description:
        "See what's coming in the next 4–12 weeks. Plan labour and capacity now.",
      link: "/forward-plan",
    },
    {
      icon: "🌍",
      title: "Review export compliance",
      description:
        "Check establishment cert expiry dates and kill-day HGP conflicts.",
      link: "/export-compliance",
    },
    {
      icon: "👥",
      title: "Manage your team",
      description: "Add staff, set roles, control who can see what.",
      link: "/users",
    },
  ],
  buyer: [
    {
      icon: "📋",
      title: "Submit a booking request",
      description:
        "Tell the processor what you want to book — species, head count, kill date.",
      link: "/buyer-request",
    },
    {
      icon: "📊",
      title: "View market benchmarks",
      description:
        "See current grid prices and benchmark against saleyards.",
      link: "/on-farm/market",
    },
    {
      icon: "🔍",
      title: "Track your bookings",
      description: "See the status of all your submitted bookings.",
      link: "/buyer-portal",
    },
    {
      icon: "📞",
      title: "Contact support",
      description: "If you need help, reach out to your Muster contact.",
    },
  ],
};

function getVisitedPages(): string[] {
  try {
    return JSON.parse(localStorage.getItem("muster_visited_pages") || "[]");
  } catch {
    return [];
  }
}

export function GettingStarted({ role, open, onClose }: GettingStartedProps) {
  const navigate = useNavigate();
  const [visitedPages, setVisitedPages] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setVisitedPages(getVisitedPages());
    }
  }, [open]);

  const steps = STEPS_BY_ROLE[role] ?? STEPS_BY_ROLE["supplier"];

  function handleGo(link: string) {
    // Mark page as visited
    const updated = Array.from(new Set([...visitedPages, link]));
    localStorage.setItem("muster_visited_pages", JSON.stringify(updated));
    setVisitedPages(updated);
    onClose();
    navigate(link);
  }

  function handleDismiss() {
    localStorage.setItem(`muster_onboarding_dismissed_${role}`, "true");
    onClose();
  }

  const roleLabel =
    role === "supplier"
      ? "Farmer / Supplier"
      : role === "ops"
      ? "Operations"
      : role === "management"
      ? "Management"
      : role === "buyer"
      ? "Buyer"
      : role;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-2xl w-full p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-green-700 px-8 py-6 text-white">
          <DialogHeader>
            <div className="text-xl font-bold tracking-tight mb-1">
              <span className="text-white/70 font-normal text-sm uppercase tracking-widest block mb-1">
                Muster
              </span>
              <DialogTitle className="text-white text-2xl font-bold">
                Welcome to Muster
              </DialogTitle>
            </div>
            <p className="text-green-100 text-sm mt-1">
              Here's how to get the most out of your account
              <span className="ml-2 text-green-200/70 text-xs">({roleLabel})</span>
            </p>
          </DialogHeader>
        </div>

        {/* Steps */}
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {steps.map((step, index) => {
            const visited = step.link ? visitedPages.includes(step.link) : false;

            return (
              <div
                key={index}
                className="relative border border-gray-200 rounded-xl p-4 flex flex-col gap-2 bg-white hover:border-green-400 hover:shadow-sm transition-all"
              >
                {visited && (
                  <span className="absolute top-3 right-3 text-green-600">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                )}
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none mt-0.5" aria-hidden="true">
                    {step.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm leading-snug">
                      {step.title}
                    </p>
                    <p className="text-gray-500 text-xs leading-snug mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
                {step.link ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="self-end text-green-700 border-green-300 hover:bg-green-50 hover:border-green-500 text-xs h-7 px-3"
                    onClick={() => handleGo(step.link!)}
                  >
                    Go →
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="self-end text-gray-500 border-gray-200 text-xs h-7 px-3 cursor-default opacity-60"
                    disabled
                  >
                    Go →
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            You can reopen this guide anytime from the Help menu.
          </p>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to control auto-showing the onboarding modal.
 * Returns [open, setOpen] — auto-opens on first visit for the given role.
 */
export function useGettingStarted(role: string) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!role) return;
    const dismissed = localStorage.getItem(`muster_onboarding_dismissed_${role}`);
    if (!dismissed) {
      setOpen(true);
    }
  }, [role]);

  return [open, setOpen] as const;
}
