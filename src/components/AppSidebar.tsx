import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Package,
  ClipboardList,
  Truck,
  Users,
  ChevronLeft,
  ChevronRight,
  Warehouse,
  UserCircle,
  ClipboardCheck,
  QrCode,
} from "lucide-react";
import { useRoles, roleLabels } from "@/contexts/RoleContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/StatusBadge";
import { roleStatus } from "@/contexts/RoleContext";

const allNavItems = [
  { path: "/", label: "Сток", icon: Package },
  { path: "/receiving", label: "Приёмка товара", icon: ClipboardList },
  { path: "/fbs", label: "Отгрузка FBS / FBO", icon: QrCode },
  { path: "/roles", label: "Управление ролями", icon: Users },
];

const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, users, setCurrentUserId, getAllowedPaths } = useRoles();

  const allowedPaths = getAllowedPaths();
  const navItems = allNavItems.filter((item) => allowedPaths.includes(item.path));

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

      {/* Current user selector */}
      {!collapsed && (
        <div className="px-3 py-3 border-t border-sidebar-border space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-sidebar-foreground/60 uppercase tracking-wider">
            <UserCircle className="w-3.5 h-3.5" />
            Текущий пользователь
          </div>
          <Select value={String(currentUser.id)} onValueChange={(v) => {
            setCurrentUserId(Number(v));
            // Navigate to first allowed path if current path is not allowed
            const user = users.find(u => u.id === Number(v));
            if (user) {
              // Will be handled by effect
            }
          }}>
            <SelectTrigger className="h-8 text-xs bg-sidebar-accent/30 border-sidebar-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={String(u.id)} className="text-xs">
                  <div className="flex items-center gap-2">
                    {u.name}
                    <span className="text-muted-foreground">({roleLabels[u.role]})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
