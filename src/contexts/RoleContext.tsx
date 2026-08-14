import React, { createContext, useContext, useState, ReactNode } from "react";

export type Role = "warehouse_head" | "receiving_manager" | "shipping_manager" | "employee";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  managerId: number | null;
  scanner: string;
}

export const roleLabels: Record<Role, string> = {
  warehouse_head: "Руководитель склада",
  receiving_manager: "Менеджер по приёмке",
  shipping_manager: "Менеджер по отгрузке",
  employee: "Сотрудник",
};

export const roleStatus: Record<Role, "primary" | "success" | "warning" | "default"> = {
  warehouse_head: "primary",
  receiving_manager: "success",
  shipping_manager: "warning",
  employee: "default",
};

// Access rules from TZ
export const roleAccess: Record<Role, string[]> = {
  warehouse_head: ["/", "/receiving", "/fbs", "/roles"],
  receiving_manager: ["/receiving"],
  shipping_manager: ["/", "/fbs"],
  employee: [], // determined by their manager's access
};

const initialUsers: User[] = [
  { id: 1, name: "Иванов Алексей", email: "ivanov@orbita.ru", role: "warehouse_head", managerId: null, scanner: "—" },
  { id: 2, name: "Петрова Мария", email: "petrova@orbita.ru", role: "receiving_manager", managerId: 1, scanner: "—" },
  { id: 3, name: "Козлов Дмитрий", email: "kozlov@orbita.ru", role: "shipping_manager", managerId: 1, scanner: "—" },
  { id: 4, name: "Сидоров Виктор", email: "sidorov@orbita.ru", role: "employee", managerId: 2, scanner: "SCN-001" },
  { id: 5, name: "Николаева Анна", email: "nikolaeva@orbita.ru", role: "employee", managerId: 2, scanner: "SCN-002" },
  { id: 6, name: "Кузнецов Павел", email: "kuznecov@orbita.ru", role: "employee", managerId: 3, scanner: "SCN-003" },
];

interface RoleContextType {
  users: User[];
  currentUser: User;
  setCurrentUserId: (id: number) => void;
  addUser: (user: Omit<User, "id">) => void;
  updateUser: (id: number, data: Partial<User>) => void;
  deleteUser: (id: number) => void;
  getManagerName: (managerId: number | null) => string;
  getAllowedPaths: () => string[];
  managers: User[];
}

const RoleContext = createContext<RoleContextType | null>(null);

export const useRoles = () => {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRoles must be used within RoleProvider");
  return ctx;
};

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [currentUserId, setCurrentUserId] = useState(1); // default: warehouse_head

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  const managers = users.filter(
    (u) => u.role === "warehouse_head" || u.role === "receiving_manager" || u.role === "shipping_manager"
  );

  const getManagerName = (managerId: number | null) => {
    if (!managerId) return "—";
    const m = users.find((u) => u.id === managerId);
    return m ? m.name : "—";
  };

  const getAllowedPaths = (): string[] => {
    if (currentUser.role === "warehouse_head") {
      return roleAccess.warehouse_head;
    }
    if (currentUser.role === "employee" && currentUser.managerId) {
      const manager = users.find((u) => u.id === currentUser.managerId);
      if (manager) {
        return roleAccess[manager.role];
      }
    }
    return roleAccess[currentUser.role];
  };

  const addUser = (data: Omit<User, "id">) => {
    setUsers((prev) => [...prev, { ...data, id: Date.now() }]);
  };

  const updateUser = (id: number, data: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)));
  };

  const deleteUser = (id: number) => {
    if (id === currentUserId) return; // can't delete self
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  return (
    <RoleContext.Provider
      value={{
        users,
        currentUser,
        setCurrentUserId,
        addUser,
        updateUser,
        deleteUser,
        getManagerName,
        getAllowedPaths,
        managers,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};
