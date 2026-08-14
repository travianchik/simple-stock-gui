import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider } from "./contexts/RoleContext";
import { StockProvider } from "./contexts/StockContext";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import { WarehouseProvider } from "./contexts/WarehouseContext";
import { OrbitaProvider } from "./contexts/OrbitaContext";
import AppLayout from "./components/AppLayout";
import StockPage from "./pages/StockPage";
import ReceivingPage from "./pages/ReceivingPage";
import ReceiptOrdersPage from "./pages/ReceiptOrdersPage";
import ShippingPage from "./pages/ShippingPage";
import FbsShippingPage from "./pages/FbsShippingPage";
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
          <StockProvider>
          <WarehouseProvider>
          <OrbitaProvider>
          <NotificationsProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<StockPage />} />
              <Route path="/receiving" element={<ReceivingPage />} />
              <Route path="/receipt-orders" element={<ReceiptOrdersPage />} />
              <Route path="/shipping" element={<ShippingPage />} />
              <Route path="/fbs" element={<FbsShippingPage />} />
              <Route path="/roles" element={<RolesPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </NotificationsProvider>
          </OrbitaProvider>
          </WarehouseProvider>
          </StockProvider>
        </RoleProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
