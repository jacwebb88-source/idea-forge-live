import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import BookingBoard from "./pages/BookingBoard";
import TransportSlotting from "./pages/TransportSlotting";
import GridSpecs from "./pages/GridSpecs";
import KPIDashboard from "./pages/KPIDashboard";
import ImportData from "./pages/ImportData";
import Plants from "./pages/Plants";
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
          <Route path="/bookings" element={<BookingBoard />} />
          <Route path="/transport" element={<TransportSlotting />} />
          <Route path="/grid-specs" element={<GridSpecs />} />
          <Route path="/kpis" element={<KPIDashboard />} />
          <Route path="/import" element={<ImportData />} />
          <Route path="/plants" element={<Plants />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
