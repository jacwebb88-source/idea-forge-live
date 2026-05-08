import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import BookingBoard from "./pages/BookingBoard";
import KillPlan from "./pages/KillPlan";
import TransportSlotting from "./pages/TransportSlotting";
import GridSpecs from "./pages/GridSpecs";
import KPIDashboard from "./pages/KPIDashboard";
import ImportData from "./pages/ImportData";
import Plants from "./pages/Plants";
import Suppliers from "./pages/Suppliers";
import BuyerSupplierRequest from "./pages/BuyerSupplierRequest";
import PilotProjects from "./pages/PilotProjects";
import ComplianceChecks from "./pages/ComplianceChecks";
import KillReports from "./pages/KillReports";
import ChangeHistory from "./pages/ChangeHistory";
import IntakeStatus from "./pages/IntakeStatus";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/kill-plan" element={<KillPlan />} />
          <Route path="/bookings" element={<BookingBoard />} />
          <Route path="/transport" element={<TransportSlotting />} />
          <Route path="/grid-specs" element={<GridSpecs />} />
          <Route path="/kpis" element={<KPIDashboard />} />
          <Route path="/import" element={<ImportData />} />
          <Route path="/plants" element={<Plants />} />
          <Route path="/buyer-request" element={<BuyerSupplierRequest />} />
          <Route path="/pilots" element={<PilotProjects />} />
          <Route path="/compliance" element={<ComplianceChecks />} />
          <Route path="/kill-reports" element={<KillReports />} />
          <Route path="/change-history" element={<ChangeHistory />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/intake" element={<IntakeStatus />} />
          <Route path="/settings" element={<Settings />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
