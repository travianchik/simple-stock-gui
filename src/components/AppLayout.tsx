import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";

const AppLayout = () => (
  <div className="flex h-screen overflow-hidden">
    <AppSidebar />
    <main className="flex-1 overflow-auto bg-background">
      <Outlet />
    </main>
  </div>
);

export default AppLayout;
