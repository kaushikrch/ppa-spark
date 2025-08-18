import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Home, DollarSign, TrendingUp, Package, Settings, Zap, Search, FileText, Menu } from "lucide-react";
import Landing from "./pages/Landing";
import PPA from "./pages/PPA";
import Elasticities from "./pages/Elasticities";
import Assortment from "./pages/Assortment";
import Simulator from "./pages/Simulator";
import Optimizer from "./pages/Optimizer";
import Huddle from "./pages/Huddle";
import RAG from "./pages/RAG";
import RAGSearch from "./pages/RAGSearch";
import Decisions from "./pages/Decisions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Navigation = () => {
  const location = useLocation();
  
  const navItems = [
    { path: "/", label: "Dashboard", icon: Home },
    { path: "/ppa", label: "Price-Pack", icon: DollarSign },
    { path: "/elasticities", label: "Elasticities", icon: TrendingUp },
    { path: "/assortment", label: "Assortment", icon: Package },
    { path: "/simulator", label: "Simulator", icon: Settings },
    { path: "/optimizer", label: "Optimizer", icon: Zap },
    { path: "/huddle", label: "AI Huddle", icon: Zap },
    { path: "/rag", label: "RAG Search", icon: Search },
    { path: "/decisions", label: "Decisions", icon: FileText },
  ];

  return (
    <Card className="p-4 bg-gradient-secondary border-0 shadow-elegant">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">iNRM Dashboard</h1>
          <p className="text-sm text-muted-foreground">PPA + Assortment Intelligence</p>
        </div>
        <Badge variant="outline" className="text-primary border-primary">
          v1.0.0
        </Badge>
      </div>
      
      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-primary text-primary-foreground shadow-purple' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </Card>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <div className="grid lg:grid-cols-[280px_1fr] gap-6 p-6">
            {/* Sidebar */}
            <aside className="hidden lg:block">
              <Navigation />
            </aside>
            
            {/* Main Content */}
            <main className="min-h-screen">
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/ppa" element={<PPA />} />
                <Route path="/elasticities" element={<Elasticities />} />
                <Route path="/assortment" element={<Assortment />} />
                <Route path="/simulator" element={<Simulator />} />
                <Route path="/optimizer" element={<Optimizer />} />
                <Route path="/huddle" element={<Huddle />} />
                <Route path="/rag" element={<RAGSearch />} />
                <Route path="/decisions" element={<Decisions />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
