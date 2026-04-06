import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { UserPlus, Pencil } from "lucide-react";

type Role = "warehouse_head" | "receiving_manager" | "shipping_manager" | "employee";

const roleLabels: Record<Role, string> = {
  warehouse_head: "Руководитель склада",
  receiving_manager: "Менеджер по приёмке",
  shipping_manager: "Менеджер по отгрузке",
  employee: "Сотрудник",
};

const roleStatus: Record<Role, "primary" | "success" | "warning" | "default"> = {
  warehouse_head: "primary",
  receiving_manager: "success",
  shipping_manager: "warning",
  employee: "default",
};

const mockUsers = [
  { id: 1, name: "Иванов Алексей", role: "warehouse_head" as Role, manager: "—", scanner: "—", email: "ivanov@orbita.ru" },
  { id: 2, name: "Петрова Мария", role: "receiving_manager" as Role, manager: "Иванов А.", scanner: "—", email: "petrova@orbita.ru" },
  { id: 3, name: "Козлов Дмитрий", role: "shipping_manager" as Role, manager: "Иванов А.", scanner: "—", email: "kozlov@orbita.ru" },
  { id: 4, name: "Сидоров Виктор", role: "employee" as Role, manager: "Петрова М.", scanner: "SCN-001", email: "sidorov@orbita.ru" },
  { id: 5, name: "Николаева Анна", role: "employee" as Role, manager: "Петрова М.", scanner: "SCN-002", email: "nikolaeva@orbita.ru" },
  { id: 6, name: "Кузнецов Павел", role: "employee" as Role, manager: "Козлов Д.", scanner: "SCN-003", email: "kuznecov@orbita.ru" },
];

const RolesPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Управление ролями"
        description="Назначение ролей, привязка сотрудников и сканеров"
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Добавить пользователя
          </Button>
        }
      />

      <div className="p-6 flex-1">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-medium">ФИО</TableHead>
                <TableHead className="text-xs font-medium">Email</TableHead>
                <TableHead className="text-xs font-medium">Роль</TableHead>
                <TableHead className="text-xs font-medium">Менеджер</TableHead>
                <TableHead className="text-xs font-medium">Сканер</TableHead>
                <TableHead className="text-xs font-medium w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="text-sm font-medium">{u.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <StatusBadge status={roleStatus[u.role]} label={roleLabels[u.role]} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.manager}</TableCell>
                  <TableCell className="text-sm font-mono">{u.scanner}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый пользователь</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ФИО</Label>
              <Input placeholder="Фамилия Имя Отчество" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="email@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Роль</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Выберите роль" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Менеджер</Label>
              <Select>
                <SelectTrigger><SelectValue placeholder="Выберите менеджера" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="petrova">Петрова Мария</SelectItem>
                  <SelectItem value="kozlov">Козлов Дмитрий</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Сканер</Label>
              <Input placeholder="ID сканера" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={() => setDialogOpen(false)}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesPage;
