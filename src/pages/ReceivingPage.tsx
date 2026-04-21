import { useState, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Play, Download, Eye, UserPlus, Package, Printer, CircleCheck as CheckCircle, ArrowLeft, Plus, ScanBarcode, X, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

type OrderStatus = "new" | "in_progress" | "completed" | "overstock" | "shortage" | "resorting" | "return" | "partial_return";

const statusMap: Record<OrderStatus, { label: string; type: "success" | "warning" | "error" | "default" | "primary" }> = {
  new: { label: "Новый", type: "default" },
  in_progress: { label: "В работе", type: "primary" },
  completed: { label: "Завершён", type: "success" },
  overstock: { label: "Пересток", type: "warning" },
  shortage: { label: "Недостача", type: "error" },
  resorting: { label: "Пересорт", type: "warning" },
  return: { label: "Возврат", type: "error" },
  partial_return: { label: "Частичный возврат", type: "error" },
};

interface LabelItem {
  id: string;
  barcode: string;
  article: string;
  name: string;
  size: string;
  scanned: boolean;
  boxId: string | null;
  flagged: boolean; // red-flagged for shortage/return
  chzCode?: string; // Честный знак per-unit code
}

interface Box {
  id: string;
  number: number;
  updNumber: string;
  items: string[]; // label IDs
  sealed: boolean;
}

interface Order {
  id: number;
  number: string;
  marketplace: string;
  brand: string;
  ip: string;
  totalLabels: number;
  scannedCount: number;
  status: OrderStatus;
  employees: string[];
  date: string;
  labels: LabelItem[];
  boxes: Box[];
}

const availableEmployees = [
  { id: "e1", name: "Иванов А.В.", scanner: "SC-001" },
  { id: "e2", name: "Петров К.М.", scanner: "SC-002" },
  { id: "e3", name: "Сидоров В.Д.", scanner: "SC-003" },
  { id: "e4", name: "Козлов Д.А.", scanner: "SC-004" },
  { id: "e5", name: "Фёдорова Е.С.", scanner: "SC-005" },
];

function generateLabels(count: number, brand: string): LabelItem[] {
  const articles = ["ART-100", "ART-200", "ART-300", "ART-400"];
  const names = ["Футболка базовая", "Джинсы slim", "Куртка ветровка", "Шорты спорт"];
  const sizes = ["XS", "S", "M", "L", "XL"];
  return Array.from({ length: count }, (_, i) => {
    const artIdx = i % articles.length;
    return {
      id: `lbl-${Date.now()}-${i}`,
      barcode: `${brand.toUpperCase().slice(0, 3)}${String(1000 + i).padStart(6, "0")}`,
      article: articles[artIdx],
      name: names[artIdx],
      size: sizes[i % sizes.length],
      scanned: false,
      boxId: null,
      flagged: false,
    };
  });
}

const initialOrders: Order[] = [
  {
    id: 1, number: "ORD-2041", marketplace: "Wildberries", brand: "BasicWear", ip: "ИП Иванов А.А.",
    totalLabels: 24, scannedCount: 24, status: "completed",
    employees: ["Иванов А.В.", "Петров К.М."], date: "02.04.2026",
    labels: generateLabels(24, "BasicWear").map((l, i) => ({
      ...l, scanned: true, boxId: "box-1",
      chzCode: i < 10 ? `010464007456781${String(i + 1).padStart(4, "0")}` : undefined,
    })),
    boxes: [{ id: "box-1", number: 1, updNumber: "УПД-20260402-001", items: [], sealed: true }],
  },
  {
    id: 2, number: "ORD-2042", marketplace: "OZON", brand: "DenimPro", ip: "ИП Петров Б.Б.",
    totalLabels: 18, scannedCount: 7, status: "in_progress",
    employees: ["Сидоров В.Д."], date: "03.04.2026",
    labels: generateLabels(18, "DenimPro").map((l, i) => i < 7 ? { ...l, scanned: true, boxId: "box-2" } : l),
    boxes: [{ id: "box-2", number: 1, updNumber: "УПД-20260403-001", items: [], sealed: false }],
  },
  {
    id: 3, number: "ORD-2043", marketplace: "Wildberries", brand: "RunStyle", ip: "ИП Иванов А.А.",
    totalLabels: 12, scannedCount: 0, status: "new",
    employees: [], date: "04.04.2026",
    labels: generateLabels(12, "RunStyle"),
    boxes: [],
  },
  {
    id: 4, number: "ORD-2044", marketplace: "Wildberries", brand: "BasicWear", ip: "ИП Сидоров В.В.",
    totalLabels: 10, scannedCount: 12, status: "overstock",
    employees: ["Козлов Д.А."], date: "01.04.2026",
    labels: generateLabels(12, "BasicWear").map(l => ({ ...l, scanned: true, boxId: "box-4" })),
    boxes: [{ id: "box-4", number: 1, updNumber: "УПД-20260401-001", items: [], sealed: true }],
  },
  {
    id: 5, number: "ORD-2045", marketplace: "OZON", brand: "UrbanBag", ip: "ИП Петров Б.Б.",
    totalLabels: 15, scannedCount: 11, status: "shortage",
    employees: ["Иванов А.В."], date: "31.03.2026",
    labels: generateLabels(15, "UrbanBag").map((l, i) => i < 11 ? { ...l, scanned: true, boxId: "box-5" } : { ...l, flagged: true }),
    boxes: [{ id: "box-5", number: 1, updNumber: "УПД-20260331-001", items: [], sealed: true }],
  },
];

const ReceivingPage = () => {
  const [search, setSearch] = useState("");
  const [mpFilter, setMpFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [assignDialog, setAssignDialog] = useState<number | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [statusDialog, setStatusDialog] = useState<number | null>(null);
  const [tab, setTab] = useState("active");

  const activeOrder = orders.find(o => o.id === activeOrderId) || null;

  const updateOrder = useCallback((id: number, updater: (o: Order) => Order) => {
    setOrders(prev => prev.map(o => o.id === id ? updater(o) : o));
  }, []);

  const filtered = orders.filter((o) => {
    const matchSearch = o.number.toLowerCase().includes(search.toLowerCase()) || o.brand.toLowerCase().includes(search.toLowerCase());
    const matchMp = mpFilter === "all" || o.marketplace === mpFilter;
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const matchTab = tab === "active"
      ? !["completed", "overstock", "shortage", "resorting"].includes(o.status)
      : ["completed", "overstock", "shortage", "resorting", "return", "partial_return"].includes(o.status);
    return matchSearch && matchMp && matchStatus && matchTab;
  });

  // --- Assign employees ---
  const openAssignDialog = (orderId: number) => {
    const order = orders.find(o => o.id === orderId);
    setSelectedEmployees(order?.employees || []);
    setAssignDialog(orderId);
  };

  const confirmAssign = () => {
    if (assignDialog === null) return;
    updateOrder(assignDialog, o => ({ ...o, employees: selectedEmployees }));
    setAssignDialog(null);
    toast.success("Сотрудники назначены");
  };

  // --- Start receiving ---
  const startReceiving = (orderId: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.employees.length === 0) {
      openAssignDialog(orderId);
      return;
    }
    updateOrder(orderId, o => ({
      ...o,
      status: "in_progress",
      boxes: o.boxes.length === 0 ? [createBox(1)] : o.boxes,
    }));
    setActiveOrderId(orderId);
    toast.info("Приём начат");
  };

  const createBox = (num: number): Box => ({
    id: `box-${Date.now()}-${num}`,
    number: num,
    updNumber: "",
    items: [],
    sealed: false,
  });

  // --- Scanning ---
  const scanItem = (orderId: number, labelId: string) => {
    updateOrder(orderId, o => {
      const openBox = o.boxes.find(b => !b.sealed);
      if (!openBox) return o;
      return {
        ...o,
        scannedCount: o.scannedCount + 1,
        labels: o.labels.map(l =>
          l.id === labelId ? { ...l, scanned: true, boxId: openBox.id, flagged: false } : l
        ),
        boxes: o.boxes.map(b =>
          b.id === openBox.id ? { ...b, items: [...b.items, labelId] } : b
        ),
      };
    });
  };

  const simulateScan = () => {
    if (!activeOrder) return;
    const unscanned = activeOrder.labels.find(l => !l.scanned);
    if (!unscanned) {
      toast.info("Все этикетки отсканированы");
      return;
    }
    scanItem(activeOrder.id, unscanned.id);
    toast.success(`Отсканировано: ${unscanned.barcode}`);
  };

  // --- Boxes ---
  const sealBoxAndPrintUPD = () => {
    if (!activeOrder) return;
    const openBox = activeOrder.boxes.find(b => !b.sealed);
    if (!openBox || openBox.items.length === 0) {
      toast.error("Коробка пуста");
      return;
    }
    const updNum = `УПД-${activeOrder.number}-${openBox.number}`;
    updateOrder(activeOrder.id, o => ({
      ...o,
      boxes: o.boxes.map(b =>
        b.id === openBox.id ? { ...b, sealed: true, updNumber: updNum } : b
      ),
    }));
    toast.success(`Напечатан ${updNum}`);
  };

  const addNewBox = () => {
    if (!activeOrder) return;
    const num = activeOrder.boxes.length + 1;
    updateOrder(activeOrder.id, o => ({
      ...o,
      boxes: [...o.boxes, createBox(num)],
    }));
    toast.success(`Коробка №${num} добавлена`);
  };

  // --- Finish ---
  const finishReceiving = () => {
    if (!activeOrder) return;
    setStatusDialog(activeOrder.id);
  };

  const setFinalStatus = (status: OrderStatus) => {
    if (statusDialog === null) return;
    updateOrder(statusDialog, o => {
      const labels = o.labels.map(l => ({
        ...l,
        flagged: !l.scanned && ["shortage", "resorting", "return", "partial_return"].includes(status),
      }));
      return { ...o, status, labels };
    });
    setStatusDialog(null);
    setActiveOrderId(null);
    toast.success(`Статус заказа: ${statusMap[status].label}`);
  };

  // --- Reopen ---
  const reopenOrder = (orderId: number) => {
    updateOrder(orderId, o => ({
      ...o,
      status: "in_progress",
    }));
    setActiveOrderId(orderId);
    toast.info("Заказ переоткрыт");
  };

  // --- Export ---
  const exportReport = (order: Order) => {
    const rows = [
      ["Сотрудник", "Отсканировано этикеток"],
      ...order.employees.map(e => [e, String(Math.floor(order.scannedCount / (order.employees.length || 1)))]),
    ];
    const csv = rows.map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `отчёт-${order.number}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Отчёт выгружен");
  };

  // ===================== ORDER DETAIL VIEW =====================
  if (activeOrder) {
    const openBox = activeOrder.boxes.find(b => !b.sealed);
    const scannedInOpenBox = openBox ? openBox.items.length : 0;
    const totalScanned = activeOrder.labels.filter(l => l.scanned).length;
    const totalLabels = activeOrder.labels.length;
    const progress = Math.round((totalScanned / totalLabels) * 100);

    return (
      <div className="flex flex-col h-full">
        <PageHeader
          title={`Приёмка ${activeOrder.number}`}
          description={`${activeOrder.brand} · ${activeOrder.marketplace} · ${activeOrder.ip}`}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setActiveOrderId(null)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Назад
              </Button>
              <Button variant="outline" size="sm" onClick={() => openAssignDialog(activeOrder.id)}>
                <UserPlus className="w-4 h-4 mr-1" /> Сотрудники
              </Button>
            </div>
          }
        />

        <div className="p-6 flex-1 space-y-4 overflow-auto">
          {/* Progress */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Прогресс сканирования</span>
                <span className="font-medium">{totalScanned} / {totalLabels} ({progress}%)</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <StatusBadge status={statusMap[activeOrder.status].type} label={statusMap[activeOrder.status].label} />
          </div>

          {/* Employees */}
          {activeOrder.employees.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Назначены: {activeOrder.employees.join(", ")}
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={simulateScan} disabled={totalScanned >= totalLabels}>
              <ScanBarcode className="w-4 h-4 mr-1" /> Сканировать
            </Button>
            {openBox && (
              <Button variant="outline" onClick={sealBoxAndPrintUPD} disabled={scannedInOpenBox === 0}>
                <Printer className="w-4 h-4 mr-1" /> Напечатать УПД (коробка №{openBox.number})
              </Button>
            )}
            <Button variant="outline" onClick={addNewBox}>
              <Plus className="w-4 h-4 mr-1" /> Новая коробка
            </Button>
            <Button variant="default" className="ml-auto" onClick={finishReceiving}>
              <CheckCircle className="w-4 h-4 mr-1" /> Завершить приём
            </Button>
          </div>

          {/* Boxes summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activeOrder.boxes.map(box => (
              <div key={box.id} className={`rounded-lg border p-3 text-sm ${box.sealed ? 'border-success/40 bg-success/5' : 'border-primary/40 bg-primary/5'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4" />
                  <span className="font-medium">Коробка №{box.number}</span>
                </div>
                <div className="text-muted-foreground text-xs">
                  {box.items.length} шт.
                  {box.sealed && <span className="ml-2 text-success">· {box.updNumber}</span>}
                  {!box.sealed && <span className="ml-2 text-primary">· Открыта</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Labels table */}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-medium w-12">#</TableHead>
                  <TableHead className="text-xs font-medium">Штрих-код</TableHead>
                  <TableHead className="text-xs font-medium">Артикул</TableHead>
                  <TableHead className="text-xs font-medium">Наименование</TableHead>
                  <TableHead className="text-xs font-medium">Размер</TableHead>
                  {activeOrder.labels.some(l => l.chzCode) && (
                    <TableHead className="text-xs font-medium">Честный знак</TableHead>
                  )}
                  <TableHead className="text-xs font-medium">Коробка</TableHead>
                  <TableHead className="text-xs font-medium">Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeOrder.labels.map((label, idx) => {
                  const box = activeOrder.boxes.find(b => b.id === label.boxId);
                  return (
                    <TableRow
                      key={label.id}
                      className={
                        label.flagged ? "bg-destructive/5" :
                        label.scanned ? "bg-success/5" : ""
                      }
                    >
                      <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{label.barcode}</TableCell>
                      <TableCell className="text-sm">{label.article}</TableCell>
                      <TableCell className="text-sm">{label.name}</TableCell>
                      <TableCell className="text-sm">{label.size}</TableCell>
                      {activeOrder.labels.some(l => l.chzCode) && (
                        <TableCell className="text-xs font-mono text-muted-foreground max-w-[180px] truncate" title={label.chzCode}>
                          {label.chzCode || "—"}
                        </TableCell>
                      )}
                      <TableCell className="text-sm text-muted-foreground">
                        {box ? `№${box.number}` : "—"}
                      </TableCell>
                      <TableCell>
                        {label.flagged ? (
                          <span className="text-xs font-medium text-destructive">Не отсканировано</span>
                        ) : label.scanned ? (
                          <span className="text-xs font-medium text-success">Отсканировано</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Ожидает</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Assign employees dialog */}
        <AssignDialog
          open={assignDialog !== null}
          onClose={() => setAssignDialog(null)}
          selected={selectedEmployees}
          setSelected={setSelectedEmployees}
          onConfirm={confirmAssign}
        />

        {/* Status dialog */}
        <Dialog open={statusDialog !== null} onOpenChange={() => setStatusDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Завершение приёмки</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-3">
              Отсканировано {totalScanned} из {totalLabels} этикеток. Выберите итоговый статус:
            </p>
            <div className="grid grid-cols-1 gap-2">
              <Button variant="outline" className="justify-start" onClick={() => setFinalStatus("completed")} disabled={totalScanned !== totalLabels}>
                <CheckCircle className="w-4 h-4 mr-2 text-success" /> Завершить заказ
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => setFinalStatus("overstock")}>
                <Package className="w-4 h-4 mr-2 text-warning" /> Пересток (товара больше этикеток)
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => setFinalStatus("resorting")}>
                <RotateCcw className="w-4 h-4 mr-2 text-warning" /> Пересорт
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => setFinalStatus("shortage")}>
                <X className="w-4 h-4 mr-2 text-destructive" /> Недостача (товара меньше этикеток)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ===================== ORDER LIST VIEW =====================
  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Приёмка товара" description="Приём заказов от изготовителей, маркировка и формирование УПД" />

      <div className="p-6 space-y-4 flex-1 overflow-auto">
        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="active">Активные</TabsTrigger>
            <TabsTrigger value="archive">Завершённые</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Поиск по номеру, бренду..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={mpFilter} onValueChange={setMpFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Маркетплейс" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все МП</SelectItem>
              <SelectItem value="Wildberries">Wildberries</SelectItem>
              <SelectItem value="OZON">OZON</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              {Object.entries(statusMap).map(([key, val]) => (
                <SelectItem key={key} value={key}>{val.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-medium">Заказ</TableHead>
                <TableHead className="text-xs font-medium">МП</TableHead>
                <TableHead className="text-xs font-medium">Бренд</TableHead>
                <TableHead className="text-xs font-medium">ИП</TableHead>
                <TableHead className="text-xs font-medium text-right">Этикетки</TableHead>
                <TableHead className="text-xs font-medium text-right">Отсканировано</TableHead>
                <TableHead className="text-xs font-medium">Сотрудники</TableHead>
                <TableHead className="text-xs font-medium">Статус</TableHead>
                <TableHead className="text-xs font-medium">Дата</TableHead>
                <TableHead className="text-xs font-medium w-36"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    Заказы не найдены
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((order) => {
                const scanned = order.labels.filter(l => l.scanned).length;
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm font-medium">{order.number}</TableCell>
                    <TableCell className="text-sm">{order.marketplace}</TableCell>
                    <TableCell className="text-sm">{order.brand}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{order.ip}</TableCell>
                    <TableCell className="text-sm text-right">{order.totalLabels}</TableCell>
                    <TableCell className="text-sm text-right">{scanned}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                      {order.employees.length > 0 ? order.employees.join(", ") : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={statusMap[order.status].type} label={statusMap[order.status].label} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{order.date}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {order.status === "new" && (
                          <>
                            <Button variant="ghost" size="sm" title="Назначить сотрудников" onClick={() => openAssignDialog(order.id)}>
                              <UserPlus className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Начать приём" onClick={() => startReceiving(order.id)}>
                              <Play className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {order.status === "in_progress" && (
                          <Button variant="ghost" size="sm" title="Продолжить приём" onClick={() => setActiveOrderId(order.id)}>
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        {["shortage", "resorting", "return", "partial_return"].includes(order.status) && (
                          <Button variant="ghost" size="sm" title="Переоткрыть" onClick={() => reopenOrder(order.id)}>
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                        {["completed", "overstock", "shortage", "resorting"].includes(order.status) && (
                          <Button variant="ghost" size="sm" title="Выгрузить отчёт" onClick={() => exportReport(order)}>
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" title="Подробнее" onClick={() => setActiveOrderId(order.id)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Assign employees dialog */}
      <AssignDialog
        open={assignDialog !== null}
        onClose={() => setAssignDialog(null)}
        selected={selectedEmployees}
        setSelected={setSelectedEmployees}
        onConfirm={confirmAssign}
      />
    </div>
  );
};

// --- Assign Dialog Component ---
function AssignDialog({
  open, onClose, selected, setSelected, onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  selected: string[];
  setSelected: (v: string[]) => void;
  onConfirm: () => void;
}) {
  const toggle = (name: string) => {
    setSelected(
      selected.includes(name) ? selected.filter(n => n !== name) : [...selected, name]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Назначить сотрудников</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-60 overflow-auto">
          {availableEmployees.map(emp => (
            <label
              key={emp.id}
              className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                checked={selected.includes(emp.name)}
                onCheckedChange={() => toggle(emp.name)}
              />
              <div className="flex-1">
                <div className="text-sm font-medium">{emp.name}</div>
                <div className="text-xs text-muted-foreground">Сканер: {emp.scanner}</div>
              </div>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={onConfirm} disabled={selected.length === 0}>Назначить ({selected.length})</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ReceivingPage;
