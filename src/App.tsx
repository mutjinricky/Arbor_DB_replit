import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TopNav } from "@/components/TopNav";
import Dashboard from "./pages/Dashboard";
import TreeInventory from "./pages/TreeInventory";
import BusinessHistory from "./pages/BusinessHistory";
import PestCalendar from "./pages/PestCalendar";
import TreeRisk from "./pages/TreeRisk";
import SoilManagement from "./pages/SoilManagement";
import NotFound from "./pages/NotFound";
import { AuthGate } from "./components/AuthGate";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen w-full">
            <TopNav />
            <Routes>
            <Route element={<AuthGate><Outlet /></AuthGate>}>
              <Route path="/" element={<TreeInventory />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/tree-inventory" element={<TreeInventory />} />
              <Route path="/business-history" element={<BusinessHistory />} />
              <Route path="/soil-management" element={<SoilManagement />} />
              <Route path="/tree-risk" element={<TreeRisk />} />
              <Route path="/pest-calendar" element={<PestCalendar />} />
              {/* <Route path="/projects/create" element={<CreateProject />} meta={{ allowedRoles: ["worker", "admin"] }} /> */}
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
