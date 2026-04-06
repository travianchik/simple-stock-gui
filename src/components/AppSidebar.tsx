import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Package,
  ClipboardList,
  Truck,
  RotateCcw,
  Users,
  ChevronLeft,
  ChevronRight,
  Warehouse,
} from "lucide-react";

const navItems = [
  { path: "/", label: "Сток / Инвентаризация", icon: Package },
  { path: "/receiving", label: "Приёмка товара", icon: ClipboardList },
  { path: "/shipping", label: "Отгрузка товара", icon: Truck },
  { path: "/returns", label: "Возврат товара", icon: RotateCcw },
  { path: "/roles", label: "Управление ролями", icon: Users },
];

const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside
      className={`flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex items-center gap-3 px-4 h-14 border-b border-sidebar-border">
        <Warehouse className="w-6 h-6 text-sidebar-primary shrink-0" />
        {!collapsed && (
          <span className="font-semibold text-sidebar-accent-foreground text-sm tracking-wide">
            Свой Склад
          </span>
        )}
      </div>

      <nav className="flex-1 py-2 space-y-0.5 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-10 border-t border-sidebar-border text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
};

export default AppSidebar;
