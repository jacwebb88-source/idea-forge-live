import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Index from "./pages/Index";
import Login from "./pages/Login";
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
import ForwardPlan from "./pages/ForwardPlan";
import BuyerPortal from "./pages/BuyerPortal";
import SupplierPortal from "./pages/SupplierPortal";
import UserAccess from "./pages/UserAccess";
import OnFarm from "./pages/on-farm/OnFarm";
import NewMob from "./pages/on-farm/NewMob";
import MobDetail from "./pages/on-farm/MobDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Ops / management routes — full access */}
            <Route path="/" element={<ProtectedRoute allowedRoles={["ops","management"]}><Index /></ProtectedRoute>} />
            <Route path="/kill-plan" element={<ProtectedRoute allowedRoles={["ops","management"]}><KillPlan /></ProtectedRoute>} />
            <Route path="/bookings" element={<ProtectedRoute allowedRoles={["ops","management","buyer"]}><BookingBoard /></ProtectedRoute>} />
            <Route path="/transport" element={<ProtectedRoute allowedRoles={["ops","management","transport"]}><TransportSlotting /></ProtectedRoute>} />
            <Route path="/grid-specs" element={<ProtectedRoute allowedRoles={["ops","management"]}><GridSpecs /></ProtectedRoute>} />
            <Route path="/kpis" element={<ProtectedRoute allowedRoles={["ops","management"]}><KPIDashboard /></ProtectedRoute>} />
            <Route path="/import" element={<ProtectedRoute allowedRoles={["ops","management"]}><ImportData /></ProtectedRoute>} />
            <Route path="/plants" element={<ProtectedRoute allowedRoles={["ops","management"]}><Plants /></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute allowedRoles={["ops","management"]}><Suppliers /></ProtectedRoute>} />
            <Route path="/pilots" element={<ProtectedRoute allowedRoles={["ops","management"]}><PilotProjects /></ProtectedRoute>} />
            <Route path="/compliance" element={<ProtectedRoute allowedRoles={["ops","management"]}><ComplianceChecks /></ProtectedRoute>} />
            <Route path="/kill-reports" element={<ProtectedRoute allowedRoles={["ops","management"]}><KillReports /></ProtectedRoute>} />
            <Route path="/change-history" element={<ProtectedRoute allowedRoles={["ops","management"]}><ChangeHistory /></ProtectedRoute>} />
            <Route path="/intake" element={<ProtectedRoute allowedRoles={["ops","management"]}><IntakeStatus /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/forward-plan" element={<ProtectedRoute allowedRoles={["ops","management"]}><ForwardPlan /></ProtectedRoute>} />

            {/* Supplier booking request — accessible to buyers and suppliers too */}
            <Route path="/buyer-request" element={<ProtectedRoute allowedRoles={["ops","management","buyer","supplier"]}><BuyerSupplierRequest /></ProtectedRoute>} />

            {/* Buyer portal — buyers, ops can also view */}
            <Route path="/buyer-portal" element={<ProtectedRoute allowedRoles={["buyer","ops","management"]}><BuyerPortal /></ProtectedRoute>} />

            {/* Supplier portal — suppliers, ops and management */}
            <Route path="/supplier-portal" element={<ProtectedRoute allowedRoles={["supplier","ops","management"]}><SupplierPortal /></ProtectedRoute>} />

            {/* Users & Access — ops and management only */}
            <Route path="/users" element={<ProtectedRoute allowedRoles={["ops","management"]}><UserAccess /></ProtectedRoute>} />

            {/* On Farm — suppliers, ops, management */}
            <Route path="/on-farm" element={<ProtectedRoute allowedRoles={["supplier","ops","management"]}><OnFarm /></ProtectedRoute>} />
            <Route path="/on-farm/mobs/new" element={<ProtectedRoute allowedRoles={["supplier","ops","management"]}><NewMob /></ProtectedRoute>} />
            <Route path="/on-farm/mobs/:id" element={<ProtectedRoute allowedRoles={["supplier","ops","management"]}><MobDetail /></ProtectedRoute>} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
