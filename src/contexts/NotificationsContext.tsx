import React, { createContext, useContext, useState, ReactNode, useMemo } from "react";

export interface AssignmentNotification {
  id: number;
  employeeName: string; // имя сотрудника, кому предназначено
  orderId: number;
  orderNumber: string;
  orderBrand: string;
  orderMarketplace: string;
  createdAt: number;
  seen: boolean;
}

interface NotificationsContextType {
  notifications: AssignmentNotification[];
  notifyAssignment: (payload: Omit<AssignmentNotification, "id" | "createdAt" | "seen">) => void;
  markSeen: (id: number) => void;
  markAllSeenFor: (employeeName: string) => void;
  unseenFor: (employeeName: string) => AssignmentNotification[];
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
};

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<AssignmentNotification[]>([]);

  const notifyAssignment = (payload: Omit<AssignmentNotification, "id" | "createdAt" | "seen">) => {
    setNotifications((prev) => {
      // избегаем дублей: если уже есть непрочитанное уведомление по этому заказу для этого сотрудника — не добавляем
      const dup = prev.some(n => !n.seen && n.employeeName === payload.employeeName && n.orderId === payload.orderId);
      if (dup) return prev;
      return [
        { ...payload, id: Date.now() + Math.random(), createdAt: Date.now(), seen: false },
        ...prev,
      ];
    });
  };

  const markSeen = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, seen: true } : n));
  };

  const markAllSeenFor = (employeeName: string) => {
    setNotifications(prev => prev.map(n => n.employeeName === employeeName ? { ...n, seen: true } : n));
  };

  const unseenFor = (employeeName: string) =>
    notifications.filter(n => n.employeeName === employeeName && !n.seen);

  const value = useMemo(() => ({ notifications, notifyAssignment, markSeen, markAllSeenFor, unseenFor }),
    [notifications]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};
