import { useState, useCallback, useRef } from "react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Play, Download, Eye, UserPlus, Package, Printer, CircleCheck as CheckCircle, ArrowLeft, Plus, ScanBarcode, Upload, FileSpreadsheet, Store, Link as LinkIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useRoles } from "@/contexts/RoleContext";
import { useStock, StockBox, SKUItem } from "@/contexts/StockContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import { Bell } from "lucide-react";

type OrderStatus = "new" | "in_progress" | "completed" | "partially_accepted";

const statusMap: Record<OrderStatus, { label: string; type: "success" | "warning" | "error" | "default" | "primary" }> = {
  new: { label: "Новый", type: "default" },
  in_progress: { label: "В работе", type: "primary" },
  completed: { label: "Завершён", type: "success" },
  partially_accepted: { label: "Частично принят", type: "warning" },
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
    boxes: [{ id: "box-1", number: 1, updNumber: "УПЛ-20260402-001", items: [], sealed: true }],
  },
  {
    id: 2, number: "ORD-2042", marketplace: "OZON", brand: "DenimPro", ip: "ИП Петров Б.Б.",
    totalLabels: 18, scannedCount: 7, status: "in_progress",
    employees: ["Сидоров В.Д."], date: "03.04.2026",
    labels: generateLabels(18, "DenimPro").map((l, i) => i < 7 ? { ...l, scanned: true, boxId: "box-2" } : l),
    boxes: [{ id: "box-2", number: 1, updNumber: "УПЛ-20260403-001", items: [], sealed: false }],
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
    totalLabels: 12, scannedCount: 12, status: "completed",
    employees: ["Козлов Д.А."], date: "01.04.2026",
    labels: generateLabels(12, "BasicWear").map(l => ({ ...l, scanned: true, boxId: "box-4" })),
    boxes: [{ id: "box-4", number: 1, updNumber: "УПЛ-20260401-001", items: [], sealed: true }],
  },
  {
    id: 5, number: "ORD-2045", marketplace: "OZON", brand: "UrbanBag", ip: "ИП Петров Б.Б.",
    totalLabels: 11, scannedCount: 11, status: "completed",
    employees: ["Иванов А.В."], date: "31.03.2026",
    labels: generateLabels(11, "UrbanBag").map(l => ({ ...l, scanned: true, boxId: "box-5" })),
    boxes: [{ id: "box-5", number: 1, updNumber: "УПЛ-20260331-001", items: [], sealed: true }],
  },
  {
    id: 6, number: "ORD-2046", marketplace: "Wildberries", brand: "RunStyle", ip: "ИП Иванов А.А.",
    totalLabels: 20, scannedCount: 14, status: "partially_accepted",
    employees: ["Петров К.М."], date: "30.03.2026",
    labels: generateLabels(20, "RunStyle").map((l, i) => i < 14
      ? { ...l, scanned: true, boxId: "box-6" }
      : { ...l, flagged: true }),
    boxes: [{ id: "box-6", number: 1, updNumber: "УПЛ-20260330-001", items: [], sealed: true }],
  },
];

const ReceivingPage = () => {
  const { currentUser, updateUser } = useRoles();
  const { addBoxes, uploadedOrderIds, markOrderUploaded } = useStock();
  const { notifyAssignment, unseenFor, markSeen, markAllSeenFor } = useNotifications();
  const myUnseen = currentUser.role === "employee" ? unseenFor(currentUser.name) : [];
  const canCreateOrder = currentUser.role === "warehouse_head" || currentUser.role === "receiving_manager";
  const canDownloadReport = canCreateOrder;
  const canUploadToStock = canCreateOrder;

  const [search, setSearch] = useState("");
  const [mpFilter, setMpFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [assignDialog, setAssignDialog] = useState<number | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [tab, setTab] = useState("active");

  // Create order dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState<"file" | "marketplace">("file");
  const [uploadedRows, setUploadedRows] = useState<Array<{ barcode: string; chz?: string; qty: number }>>([]);
  const [selectedMarketplace, setSelectedMarketplace] = useState<"Wildberries" | "OZON" | "">("");
  const [mpProducts, setMpProducts] = useState<Array<{ id: string; barcode: string; name: string; qty: number }>>([]);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const activeOrder = orders.find(o => o.id === activeOrderId) || null;

  const updateOrder = useCallback((id: number, updater: (o: Order) => Order) => {
    setOrders(prev => prev.map(o => o.id === id ? updater(o) : o));
  }, []);

  const filtered = orders.filter((o) => {
    const matchSearch = o.number.toLowerCase().includes(search.toLowerCase()) || o.brand.toLowerCase().includes(search.toLowerCase());
    const matchMp = mpFilter === "all" || o.marketplace === mpFilter;
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    const archived = ["completed", "partially_accepted"];
    const matchTab = tab === "active" ? !archived.includes(o.status) : archived.includes(o.status);
    const matchRole = currentUser.role !== "employee" || o.employees.includes(currentUser.name);
    return matchSearch && matchMp && matchStatus && matchTab && matchRole;
  });

  // --- Assign employees ---
  const openAssignDialog = (orderId: number) => {
    const order = orders.find(o => o.id === orderId);
    setSelectedEmployees(order?.employees || []);
    setAssignDialog(orderId);
  };

  const confirmAssign = () => {
    if (assignDialog === null) return;
    const order = orders.find(o => o.id === assignDialog);
    const previouslyAssigned = new Set(order?.employees || []);
    const newlyAssigned = selectedEmployees.filter(e => !previouslyAssigned.has(e));
    updateOrder(assignDialog, o => ({ ...o, employees: selectedEmployees }));
    if (order) {
      newlyAssigned.forEach(empName => {
        notifyAssignment({
          employeeName: empName,
          orderId: order.id,
          orderNumber: order.number,
          orderBrand: order.brand,
          orderMarketplace: order.marketplace,
        });
      });
    }
    setAssignDialog(null);
    toast.success(newlyAssigned.length > 0
      ? `Сотрудники назначены. Уведомления отправлены (${newlyAssigned.length})`
      : "Сотрудники назначены");
  };

  // --- Start receiving ---
  const startReceiving = (orderId: number) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    // Менеджер без назначенных сотрудников — сначала назначить
    if (order.employees.length === 0 && canCreateOrder) {
      openAssignDialog(orderId);
      return;
    }
    if (order.employees.length === 0) {
      toast.error("На заказ не назначены сотрудники");
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
  const sealBoxAndPrintPackingList = () => {
    if (!activeOrder) return;
    const openBox = activeOrder.boxes.find(b => !b.sealed);
    if (!openBox || openBox.items.length === 0) {
      toast.error("Коробка пуста");
      return;
    }
    const updNum = `УПЛ-${activeOrder.number}-${openBox.number}`;
    updateOrder(activeOrder.id, o => ({
      ...o,
      boxes: o.boxes.map(b =>
        b.id === openBox.id ? { ...b, sealed: true, updNumber: updNum } : b
      ),
    }));
    toast.success(`Напечатан Упаковочный лист ${updNum}`);
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

  // --- Finish: статус определяется автоматически по полноте приёмки ---
  const finishReceiving = () => {
    if (!activeOrder) return;
    const totalScanned = activeOrder.labels.filter(l => l.scanned).length;
    const totalLabels = activeOrder.labels.length;
    const isFull = totalScanned === totalLabels;
    updateOrder(activeOrder.id, o => ({
      ...o,
      status: isFull ? "completed" : "partially_accepted",
      labels: o.labels.map(l => ({ ...l, flagged: !l.scanned })),
      boxes: o.boxes.map(b => ({ ...b, sealed: true })),
    }));
    toast.success(isFull ? "Заказ завершён" : "Заказ частично принят");
    setActiveOrderId(null);
  };

  // --- Загрузить заказ в Сток ---
  const uploadOrderToStock = (order: Order) => {
    if (uploadedOrderIds.has(order.id)) {
      toast.info("Заказ уже загружен в Сток");
      return;
    }
    const today = new Date().toLocaleDateString("ru-RU");
    const newStockBoxes: StockBox[] = order.boxes
      .filter(b => b.items.length > 0 || b.sealed)
      .map((box, idx) => {
        const items: SKUItem[] = order.labels
          .filter(l => l.scanned && l.boxId === box.id)
          .map(l => ({
            article: l.article,
            articleSeller: l.article,
            name: l.name,
            qty: 1,
            barcode: l.barcode,
            brand: order.brand,
            size: l.size,
            chzCodes: l.chzCode ? [l.chzCode] : undefined,
            dateReceived: today,
            marketplace: order.marketplace,
            kind: "unit" as const,
          }));
        return {
          id: Date.now() + idx,
          boxNumber: `КРБ-${String(Date.now()).slice(-3)}-${box.number}`,
          upd: box.updNumber || `УПЛ-${order.number}-${box.number}`,
          qty: items.reduce((s, it) => s + it.qty, 0),
          brand: order.brand,
          dateReceived: today,
          status: "on_stock" as const,
          ip: order.ip,
          marketplace: order.marketplace,
          items,
        };
      });
    if (newStockBoxes.length === 0) {
      toast.error("В заказе нет коробок с товаром");
      return;
    }
    addBoxes(newStockBoxes);
    markOrderUploaded(order.id);
    toast.success(`Заказ ${order.number} загружен в Сток (${newStockBoxes.length} коробок)`);
  };

  // --- Export: Excel с штрихкодом, ЧЗ, количеством, сотрудником и сканером ---
  const exportReport = (order: Order) => {
    const empList = order.employees
      .map(name => availableEmployees.find(e => e.name === name))
      .filter(Boolean) as typeof availableEmployees;
    const rows = order.labels
      .filter(l => l.scanned)
      .map((l, idx) => {
        const emp = empList[idx % (empList.length || 1)] || { name: "—", scanner: "—" };
        return {
          "Штрих-код": l.barcode,
          "Честный знак": l.chzCode || "",
          "Количество": 1,
          "Сотрудник": emp.name,
          "Номер сканера": emp.scanner,
        };
      });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Отчёт");
    XLSX.writeFile(wb, `Отчёт_${order.number}.xlsx`);
    toast.success("Отчёт выгружен");
  };

  // --- Scanner connection (для сотрудников) ---
  const connectScanner = () => {
    if (currentUser.scanner && currentUser.scanner !== "—") {
      toast.info(`Сканер уже подключён: ${currentUser.scanner}`);
      return;
    }
    // имитация поиска сканера на устройстве
    const newScanner = `SCN-${String(Math.floor(Math.random() * 900) + 100)}`;
    updateUser(currentUser.id, { scanner: newScanner });
    toast.success(`Сканер ${newScanner} привязан к профилю`);
  };

  // --- Create order: upload Excel ---
  const handleExcelUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json<Record<string, string | number>>(sheet, { defval: "" });
        const rows = raw.map((r) => {
          const keys = Object.keys(r);
          const barcode = String(r[keys.find(k => /штрих|bar/i.test(k)) || keys[0]] || "");
          const chz = String(r[keys.find(k => /чз|киз|знак/i.test(k)) || ""] || "");
          const qty = Number(r[keys.find(k => /кол|qty|count/i.test(k)) || ""] || 1) || 1;
          return { barcode, chz: chz || undefined, qty };
        }).filter(r => r.barcode || r.chz);
        if (rows.length === 0) { toast.error("В файле не найдено строк"); return; }
        setUploadedRows(rows);
        toast.success(`Загружено ${rows.length} позиций`);
      } catch {
        toast.error("Не удалось прочитать Excel");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const loadMarketplaceProducts = (mp: "Wildberries" | "OZON") => {
    setSelectedMarketplace(mp);
    // Имитация загрузки товаров с маркетплейса
    setMpProducts([
      { id: "p1", barcode: "4607012399001", name: "Футболка базовая S", qty: 0 },
      { id: "p2", barcode: "4607012399002", name: "Футболка базовая M", qty: 0 },
      { id: "p3", barcode: "4607012399003", name: "Джинсы slim 30", qty: 0 },
      { id: "p4", barcode: "4607012399004", name: "Худи оверсайз L", qty: 0 },
      { id: "p5", barcode: "4607012399005", name: "Рюкзак чёрный", qty: 0 },
    ]);
  };

  const createOrderFromData = (source: "file" | "marketplace") => {
    let rowsForLabels: Array<{ barcode: string; chz?: string; qty: number }>;
    let mp = "";
    if (source === "file") {
      rowsForLabels = uploadedRows;
      mp = "—";
    } else {
      rowsForLabels = mpProducts.filter(p => p.qty > 0).map(p => ({ barcode: p.barcode, qty: p.qty }));
      mp = selectedMarketplace || "—";
    }
    if (rowsForLabels.length === 0) { toast.error("Нет позиций для заказа"); return; }
    const total = rowsForLabels.reduce((s, r) => s + r.qty, 0);
    const labels: LabelItem[] = [];
    rowsForLabels.forEach((r, rIdx) => {
      for (let i = 0; i < r.qty; i++) {
        labels.push({
          id: `lbl-${Date.now()}-${rIdx}-${i}`,
          barcode: r.barcode,
          article: `ART-${rIdx + 1}`,
          name: `Товар ${rIdx + 1}`,
          size: "—",
          scanned: false,
          boxId: null,
          flagged: false,
          chzCode: r.chz,
        });
      }
    });
    const newOrder: Order = {
      id: Date.now(),
      number: `ORD-${String(Date.now()).slice(-4)}`,
      marketplace: mp,
      brand: "—",
      ip: "—",
      totalLabels: total,
      scannedCount: 0,
      status: "new",
      employees: [],
      date: new Date().toLocaleDateString("ru-RU"),
      labels,
      boxes: [],
    };
    setOrders(prev => [newOrder, ...prev]);
    toast.success(`Заказ ${newOrder.number} создан`);
    setCreateOpen(false);
    setUploadedRows([]); setSelectedMarketplace(""); setMpProducts([]); setCreateTab("file");
    // сразу открываем окно назначения сотрудника
    setSelectedEmployees([]);
    setAssignDialog(newOrder.id);
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
              {currentUser.role === "employee" && (
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-border bg-muted/30 text-xs">
                  <ScanBarcode className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Сканер:</span>
                  <span className="font-medium">{currentUser.scanner && currentUser.scanner !== "—" ? currentUser.scanner : "не подключён"}</span>
                  {(!currentUser.scanner || currentUser.scanner === "—") && (
                    <Button variant="ghost" size="sm" className="h-6 px-2 ml-1" onClick={connectScanner}>
                      <LinkIcon className="w-3 h-3 mr-1" /> Подключить
                    </Button>
                  )}
                </div>
              )}
              {canCreateOrder && (
                <Button variant="outline" size="sm" onClick={() => openAssignDialog(activeOrder.id)}>
                  <UserPlus className="w-4 h-4 mr-1" /> Сотрудники
                </Button>
              )}
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
          {activeOrder.status === "new" ? (
            <div className="flex items-center gap-3 p-4 rounded-lg border border-primary/30 bg-primary/5">
              <Bell className="w-5 h-5 text-primary" />
              <div className="flex-1 text-sm">
                <p className="font-medium">Заказ назначен на вас</p>
                <p className="text-muted-foreground text-xs">
                  Нажмите «Начать приёмку», чтобы приступить к работе. Менеджер увидит, что вы начали.
                </p>
              </div>
              <Button onClick={() => startReceiving(activeOrder.id)}>
                <Play className="w-4 h-4 mr-1" /> Начать приёмку
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={simulateScan} disabled={totalScanned >= totalLabels || activeOrder.status !== "in_progress"}>
                <ScanBarcode className="w-4 h-4 mr-1" /> Сканировать
              </Button>
              {openBox && activeOrder.status === "in_progress" && (
                <Button variant="outline" onClick={sealBoxAndPrintPackingList} disabled={scannedInOpenBox === 0}>
                  <Printer className="w-4 h-4 mr-1" /> Напечатать Упаковочный лист (коробка №{openBox.number})
                </Button>
              )}
              {activeOrder.status === "in_progress" && (
                <Button variant="outline" onClick={addNewBox}>
                  <Plus className="w-4 h-4 mr-1" /> Новая коробка
                </Button>
              )}
              {activeOrder.status === "in_progress" && (
                <Button variant="default" className="ml-auto" onClick={finishReceiving}>
                  <CheckCircle className="w-4 h-4 mr-1" /> Завершить приём
                </Button>
              )}
            </div>
          )}

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

      </div>
    );
  }

  // ===================== ORDER LIST VIEW =====================
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Приёмка товара"
        description="Приём заказов от изготовителей, маркировка и формирование Упаковочных листов"
        actions={
          <div className="flex items-center gap-2">
            {currentUser.role === "employee" && (
              <div className="relative flex items-center gap-1 px-3 py-1.5 rounded-md border border-border bg-muted/30 text-xs">
                <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Уведомлений:</span>
                <span className="font-medium">{myUnseen.length}</span>
                {myUnseen.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive" />
                )}
              </div>
            )}
            {currentUser.role === "employee" && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-md border border-border bg-muted/30 text-xs">
                <ScanBarcode className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Сканер:</span>
                <span className="font-medium">{currentUser.scanner && currentUser.scanner !== "—" ? currentUser.scanner : "не подключён"}</span>
                {(!currentUser.scanner || currentUser.scanner === "—") && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 ml-1" onClick={connectScanner}>
                    <LinkIcon className="w-3 h-3 mr-1" /> Подключить
                  </Button>
                )}
              </div>
            )}
            {canCreateOrder && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Создать заказ
              </Button>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-4 flex-1 overflow-auto">
        {/* Notifications (для сотрудника) */}
        {currentUser.role === "employee" && myUnseen.length > 0 && (
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">
                    Новые назначения: {myUnseen.length}
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => markAllSeenFor(currentUser.name)}>
                    Прочитать все
                  </Button>
                </div>
                <ul className="space-y-1.5">
                  {myUnseen.map(n => (
                    <li key={n.id} className="flex items-center justify-between text-sm">
                      <span>
                        <span className="font-medium">{n.orderNumber}</span>
                        <span className="text-muted-foreground"> · {n.orderBrand} · {n.orderMarketplace}</span>
                      </span>
                      <Button variant="link" size="sm" className="h-6"
                        onClick={() => {
                          markSeen(n.id);
                          setActiveOrderId(n.orderId);
                        }}>
                        Открыть
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

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
                        {order.status === "new" && canCreateOrder && (
                          <>
                            <Button variant="ghost" size="sm" title="Назначить сотрудников" onClick={() => openAssignDialog(order.id)}>
                              <UserPlus className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Начать приём" onClick={() => startReceiving(order.id)}>
                              <Play className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {order.status === "new" && currentUser.role === "employee" && order.employees.includes(currentUser.name) && (
                          <Button variant="ghost" size="sm" title="Открыть заказ" onClick={() => setActiveOrderId(order.id)}>
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        {order.status === "in_progress" && (
                          <Button variant="ghost" size="sm" title="Продолжить приём" onClick={() => setActiveOrderId(order.id)}>
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        {(order.status === "completed" || order.status === "partially_accepted") && canUploadToStock && (
                          uploadedOrderIds.has(order.id) ? (
                            <Button variant="ghost" size="sm" disabled title="Уже в Стоке">
                              <CheckCircle className="w-4 h-4 text-success" />
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => uploadOrderToStock(order)}>
                              <Package className="w-4 h-4 mr-1" /> Загрузить в Сток
                            </Button>
                          )
                        )}
                        {(order.status === "completed" || order.status === "partially_accepted") && canDownloadReport && (
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

      {/* Create order dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => {
        setCreateOpen(open);
        if (!open) {
          setUploadedRows([]); setSelectedMarketplace(""); setMpProducts([]); setCreateTab("file");
        }
      }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Создать заказ
            </DialogTitle>
            <DialogDescription>
              Загрузите Excel-файл со списком товаров или создайте заказ из товаров подключенного маркетплейса.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 border-b border-border pb-2">
            <Button variant={createTab === "file" ? "default" : "ghost"} size="sm"
              onClick={() => setCreateTab("file")}>
              <FileSpreadsheet className="w-4 h-4 mr-1" /> Загрузить файл
            </Button>
            <Button variant={createTab === "marketplace" ? "default" : "ghost"} size="sm"
              onClick={() => setCreateTab("marketplace")}>
              <Store className="w-4 h-4 mr-1" /> Из маркетплейса
            </Button>
          </div>

          {createTab === "file" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Колонки: штрих-код маркетплейса и количество; либо штрих-код, КИЗ и количество; либо только КИЗ и количество.
              </p>
              <input ref={excelInputRef} type="file" className="hidden" accept=".xlsx,.xls,.csv"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleExcelUpload(f); e.target.value = ""; }} />
              <Button variant="outline" className="w-full h-20 border-dashed border-2 flex flex-col gap-1"
                onClick={() => excelInputRef.current?.click()}>
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Выбрать Excel файл</span>
              </Button>
              {uploadedRows.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/20 max-h-64 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Штрих-код</TableHead>
                        <TableHead className="text-xs">КИЗ</TableHead>
                        <TableHead className="text-xs text-right">Количество</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadedRows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs font-mono">{r.barcode || "—"}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground max-w-[160px] truncate">{r.chz || "—"}</TableCell>
                          <TableCell className="text-xs text-right">{r.qty}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
                <Button onClick={() => createOrderFromData("file")} disabled={uploadedRows.length === 0}>
                  Создать заказ
                </Button>
              </DialogFooter>
            </div>
          )}

          {createTab === "marketplace" && (
            <div className="space-y-4">
              {!selectedMarketplace && (
                <>
                  <p className="text-sm text-muted-foreground">Выберите маркетплейс:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="h-20" onClick={() => loadMarketplaceProducts("Wildberries")}>
                      Wildberries
                    </Button>
                    <Button variant="outline" className="h-20" onClick={() => loadMarketplaceProducts("OZON")}>
                      OZON
                    </Button>
                  </div>
                </>
              )}
              {selectedMarketplace && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{selectedMarketplace}</span>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedMarketplace(""); setMpProducts([]); }}>
                      Сменить МП
                    </Button>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 max-h-64 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Штрих-код</TableHead>
                          <TableHead className="text-xs">Наименование</TableHead>
                          <TableHead className="text-xs w-28 text-right">Количество</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mpProducts.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="text-xs font-mono">{p.barcode}</TableCell>
                            <TableCell className="text-xs">{p.name}</TableCell>
                            <TableCell className="text-xs text-right">
                              <Input type="number" min={0} value={p.qty}
                                onChange={(e) => setMpProducts(prev => prev.map(q => q.id === p.id ? { ...q, qty: Math.max(0, Number(e.target.value) || 0) } : q))}
                                className="h-7 w-20 ml-auto text-right" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
                    <Button onClick={() => createOrderFromData("marketplace")}
                      disabled={mpProducts.every(p => p.qty === 0)}>
                      Создать заказ
                    </Button>
                  </DialogFooter>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
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
