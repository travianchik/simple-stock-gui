import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Play, Download, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type OrderStatus = "new" | "in_progress" | "completed" | "overstock" | "shortage" | "return";

const statusMap: Record<OrderStatus, { label: string; type: "success" | "warning" | "error" | "default" | "primary" }> = {
  new: { label: "Новый", type: "default" },
  in_progress: { label: "В работе", type: "primary" },
  completed: { label: "Завершён", type: "success" },
  overstock: { label: "Пересток", type: "warning" },
  shortage: { label: "Недостача", type: "error" },
  return: { label: "Возврат", type: "error" },
};

const mockOrders = [
  { id: 1, number: "ORD-2041", marketplace: "Wildberries", brand: "BasicWear", items: 500, scanned: 500, status: "completed" as OrderStatus, employees: ["Иванов А.", "Петров К."], date: "02.04.2026" },
  { id: 2, number: "ORD-2042", marketplace: "OZON", brand: "DenimPro", items: 300, scanned: 180, status: "in_progress" as OrderStatus, employees: ["Сидоров В."], date: "03.04.2026" },
  { id: 3, number: "ORD-2043", marketplace: "Wildberries", brand: "RunStyle", items: 200, scanned: 0, status: "new" as OrderStatus, employees: [], date: "04.04.2026" },
  { id: 4, number: "ORD-2044", marketplace: "Wildberries", brand: "BasicWear", items: 150, scanned: 160, status: "overstock" as OrderStatus, employees: ["Козлов Д."], date: "01.04.2026" },
  { id: 5, number: "ORD-2045", marketplace: "OZON", brand: "UrbanBag", items: 100, scanned: 85, status: "shortage" as OrderStatus, employees: ["Иванов А."], date: "31.03.2026" },
];

const ReceivingPage = () => {
  const [search, setSearch] = useState("");
  const [mpFilter, setMpFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<typeof mockOrders[0] | null>(null);

  const filtered = mockOrders.filter((o) => {
    const matchSearch = o.number.toLowerCase().includes(search.toLowerCase()) || o.brand.toLowerCase().includes(search.toLowerCase());
    const matchMp = mpFilter === "all" || o.marketplace === mpFilter;
    return matchSearch && matchMp;
  });

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Приёмка товара" description="Приём заказов от изготовителей, маркировка и формирование УПД" />

      <div className="p-6 space-y-4 flex-1">
        <div className="flex items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Поиск по номеру, бренду..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={mpFilter} onValueChange={setMpFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Маркетплейс" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все маркетплейсы</SelectItem>
              <SelectItem value="Wildberries">Wildberries</SelectItem>
              <SelectItem value="OZON">OZON</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-medium">Заказ</TableHead>
                <TableHead className="text-xs font-medium">Маркетплейс</TableHead>
                <TableHead className="text-xs font-medium">Бренд</TableHead>
                <TableHead className="text-xs font-medium text-right">Этикетки</TableHead>
                <TableHead className="text-xs font-medium text-right">Отсканировано</TableHead>
                <TableHead className="text-xs font-medium">Сотрудники</TableHead>
                <TableHead className="text-xs font-medium">Статус</TableHead>
                <TableHead className="text-xs font-medium">Дата</TableHead>
                <TableHead className="text-xs font-medium w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm font-medium">{order.number}</TableCell>
                  <TableCell className="text-sm">{order.marketplace}</TableCell>
                  <TableCell className="text-sm">{order.brand}</TableCell>
                  <TableCell className="text-sm text-right">{order.items}</TableCell>
                  <TableCell className="text-sm text-right">{order.scanned}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{order.employees.join(", ") || "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={statusMap[order.status].type} label={statusMap[order.status].label} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{order.date}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {order.status === "new" && (
                        <Button variant="ghost" size="sm" title="Начать приём">
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" title="Подробнее" onClick={() => setSelectedOrder(order)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {order.status === "completed" && (
                        <Button variant="ghost" size="sm" title="Выгрузить отчёт">
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Заказ {selectedOrder?.number}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Маркетплейс</span><span>{selectedOrder?.marketplace}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Бренд</span><span>{selectedOrder?.brand}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Этикеток</span><span>{selectedOrder?.items}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Отсканировано</span><span>{selectedOrder?.scanned}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Статус</span>{selectedOrder && <StatusBadge status={statusMap[selectedOrder.status].type} label={statusMap[selectedOrder.status].label} />}</div>
            <div className="flex justify-between"><span className="text-muted-foreground">Сотрудники</span><span>{selectedOrder?.employees.join(", ") || "—"}</span></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReceivingPage;
