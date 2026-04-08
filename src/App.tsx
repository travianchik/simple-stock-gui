import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider } from "./contexts/RoleContext";
import AppLayout from "./components/AppLayout";
import StockPage from "./pages/StockPage";
import ReceivingPage from "./pages/ReceivingPage";
import ShippingPage from "./pages/ShippingPage";
import ReturnsPage from "./pages/ReturnsPage";
import RolesPage from "./pages/RolesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RoleProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<StockPage />} />
              <Route path="/receiving" element={<ReceivingPage />} />
              <Route path="/shipping" element={<ShippingPage />} />
              <Route path="/returns" element={<ReturnsPage />} />
              <Route path="/roles" element={<RolesPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RoleProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
