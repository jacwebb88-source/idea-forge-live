import { useParams, Navigate } from "react-router-dom";
import { DemoProvider, DemoMode, DEMO_PLANT_NAMES } from "@/contexts/DemoContext";
import Index from "./Index";

/**
 * Demo entry point — no login required.
 * /demo/enterprise  →  JBS-scale Southern Cross Meats dataset
 * /demo/regional    →  Mid-size Riverbank Meats dataset
 *
 * The DemoContext is consumed by pages (BookingBoard, KillPlan, etc.)
 * to pre-filter by the correct plant_id.
 */
export default function Demo() {
  const { mode } = useParams<{ mode: string }>();

  if (mode !== "enterprise" && mode !== "regional") {
    return <Navigate to="/" replace />;
  }

  const demoMode = mode as DemoMode;
  const plantName = DEMO_PLANT_NAMES[demoMode];

  return (
    <DemoProvider mode={demoMode}>
      {/* Amber demo banner — always visible */}
      <div
        style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999 }}
        className="bg-amber-500 text-white text-xs font-semibold py-2 px-4 flex items-center justify-between"
      >
        <span>Demo — {plantName}</span>
        <a href="https://webbmuster.com.au" className="text-white/80 hover:text-white underline text-xs">
          webbmuster.com.au
        </a>
      </div>
      {/* Push content below banner */}
      <div className="pt-8">
        <Index />
      </div>
    </DemoProvider>
  );
}
