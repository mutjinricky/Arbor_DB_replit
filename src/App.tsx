import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TopNav } from "@/components/TopNav";
import Dashboard from "./pages/Dashboard";
import TreeInventory from "./pages/TreeInventory";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import CreateProject from "./pages/CreateProject";
import RequestForm from "./pages/RequestForm";
import PestCalendar from "./pages/PestCalendar";
import TreeRisk from "./pages/TreeRisk";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen w-full">
          <TopNav />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tree-inventory" element={<TreeInventory />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/projects/create" element={<CreateProject />} />
            <Route path="/projects/request" element={<RequestForm />} />
            <Route path="/tree-risk" element={<TreeRisk />} />
            <Route path="/pest-calendar" element={<PestCalendar />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
