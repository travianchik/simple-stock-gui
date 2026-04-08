import { useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Pencil, Trash2, Search, Shield } from "lucide-react";
import { useRoles, roleLabels, roleStatus, Role } from "@/contexts/RoleContext";
import type { User } from "@/contexts/RoleContext";

const emptyForm = { name: "", email: "", role: "employee" as Role, managerId: null as number | null, scanner: "" };

const RolesPage = () => {
  const { users, currentUser, addUser, updateUser, deleteUser, getManagerName, managers } = useRoles();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        const s = search.toLowerCase();
        const matchSearch = u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s);
        const matchRole = roleFilter === "all" || u.role === roleFilter;
        return matchSearch && matchRole;
      }),
    [users, search, roleFilter]
  );

  const openAdd = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      managerId: user.managerId,
      scanner: user.scanner === "—" ? "" : user.scanner,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    const data = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      managerId: form.role === "warehouse_head" ? null : form.managerId,
      scanner: form.scanner.trim() || "—",
    };
    if (editingUser) {
      updateUser(editingUser.id, data);
    } else {
      addUser(data);
    }
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      deleteUser(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  // Only warehouse_head can manage roles
  const canManage = currentUser.role === "warehouse_head";

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Управление ролями"
        description="Назначение ролей, привязка сотрудников и сканеров"
        actions={
          canManage ? (
            <Button size="sm" onClick={openAdd}>
              <UserPlus className="w-4 h-4 mr-2" />
              Добавить пользователя
            </Button>
          ) : (
            <Badge variant="outline" className="gap-1.5 text-xs">
              <Shield className="w-3 h-3" />
              Только просмотр
            </Badge>
          )
        }
      />

      <div className="p-6 space-y-4 flex-1 overflow-auto">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative max-w-xs flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по ФИО или email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Все роли" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все роли</SelectItem>
              {Object.entries(roleLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-3 flex-wrap">
          {Object.entries(roleLabels).map(([key, label]) => {
            const count = users.filter((u) => u.role === key).length;
            return (
              <Badge key={key} variant="outline" className="gap-1 text-xs">
                {label}: {count}
              </Badge>
            );
          })}
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-medium">ФИО</TableHead>
                <TableHead className="text-xs font-medium">Email</TableHead>
                <TableHead className="text-xs font-medium">Роль</TableHead>
                <TableHead className="text-xs font-medium">Менеджер</TableHead>
                <TableHead className="text-xs font-medium">Сканер</TableHead>
                <TableHead className="text-xs font-medium">Доступы</TableHead>
                {canManage && <TableHead className="text-xs font-medium w-24"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const isCurrentUser = u.id === currentUser.id;
                // Calculate access for display
                let accessPaths: string[] = [];
                if (u.role === "warehouse_head") {
                  accessPaths = ["Все разделы"];
                } else if (u.role === "employee" && u.managerId) {
                  const mgr = users.find((m) => m.id === u.managerId);
                  if (mgr?.role === "receiving_manager") accessPaths = ["Приёмка", "Возврат"];
                  else if (mgr?.role === "shipping_manager") accessPaths = ["Сток", "Отгрузка"];
                } else if (u.role === "receiving_manager") {
                  accessPaths = ["Приёмка", "Возврат"];
                } else if (u.role === "shipping_manager") {
                  accessPaths = ["Сток", "Отгрузка"];
                }

                return (
                  <TableRow key={u.id} className={isCurrentUser ? "bg-primary/5" : ""}>
                    <TableCell className="text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {u.name}
                        {isCurrentUser && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Вы</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <StatusBadge status={roleStatus[u.role]} label={roleLabels[u.role]} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{getManagerName(u.managerId)}</TableCell>
                    <TableCell className="text-sm font-mono">{u.scanner}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {accessPaths.map((p) => (
                          <Badge key={p} variant="outline" className="text-[10px] px-1.5 py-0">{p}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(u)} title="Редактировать">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {!isCurrentUser && (
                            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(u)} title="Удалить" className="text-destructive hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canManage ? 7 : 6} className="text-center text-muted-foreground py-8">
                    Ничего не найдено
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Редактировать пользователя" : "Новый пользователь"}</DialogTitle>
            <DialogDescription>
              {editingUser ? "Измените данные пользователя" : "Заполните данные нового пользователя"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ФИО</Label>
              <Input
                placeholder="Фамилия Имя"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Роль</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as Role }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roleLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.role !== "warehouse_head" && (
              <div className="space-y-2">
                <Label>Менеджер</Label>
                <Select
                  value={form.managerId ? String(form.managerId) : "none"}
                  onValueChange={(v) => setForm((f) => ({ ...f, managerId: v === "none" ? null : Number(v) }))}
                >
                  <SelectTrigger><SelectValue placeholder="Выберите менеджера" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не назначен</SelectItem>
                    {managers
                      .filter((m) => m.id !== editingUser?.id)
                      .map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name} ({roleLabels[m.role]})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(form.role === "employee") && (
              <div className="space-y-2">
                <Label>Сканер</Label>
                <Input
                  placeholder="ID сканера (напр. SCN-004)"
                  value={form.scanner}
                  onChange={(e) => setForm((f) => ({ ...f, scanner: e.target.value }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || !form.email.trim()}>
              {editingUser ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить пользователя?</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить {deleteConfirm?.name}? Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Отмена</Button>
            <Button variant="destructive" onClick={handleDelete}>Удалить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesPage;
