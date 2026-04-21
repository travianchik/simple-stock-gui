import { useState, useMemo } from "react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Search, ScanLine, Download, Package, CircleCheck as CheckCircle2, Circle as XCircle, TriangleAlert as AlertTriangle, Plus, ChevronDown, ChevronRight, Box } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type SKUKind = "unit" | "set";

interface SKUItem {
  article: string;
  articleSeller: string;
  name: string;
  qty: number;
  barcode: string;
  price?: number;
  brand: string;
  size?: string;
  chzCodes?: string[]; // Честный знак — per-unit identifiers
  dateReceived: string;
  marketplace?: string;
  kind: SKUKind; // единица (1 шт) или набор (несколько в упаковке)
  setSize?: number; // если kind === 'set', сколько товаров внутри
}

interface StockBox {
  id: number;
  boxNumber: string;
  upd: string;
  qty: number;
  brand: string;
  dateReceived: string;
  status: "on_stock" | "missing" | "unchecked";
  ip: string; // ИП
  marketplace: string; // МП
  items: SKUItem[];
  uploadedFileUrl?: string | null;
  uploadedFileName?: string | null;
}

const mockBoxes: StockBox[] = [
  {
    id: 1, boxNumber: "КРБ-001", upd: "УПЛ-00142", qty: 73,
    brand: "BasicWear", dateReceived: "02.04.2026", status: "on_stock",
    ip: "ИП Иванов А.А.", marketplace: "Wildberries",
    items: [
      { article: "WB-12345", articleSeller: "FB-001-S", name: "Футболка белая S", qty: 40, barcode: "4607012345671-01", price: 850, brand: "BasicWear", size: "S", dateReceived: "02.04.2026", marketplace: "Wildberries", kind: "unit" },
      { article: "WB-12346", articleSeller: "FB-001-M", name: "Футболка белая M", qty: 3, barcode: "4607012345671-02", price: 850, brand: "BasicWear", size: "M", chzCodes: ["010464007456781921CHZ001", "010464007456781921CHZ002", "010464007456781921CHZ003"], dateReceived: "02.04.2026", marketplace: "Wildberries", kind: "unit" },
      { article: "WB-12347", articleSeller: "FB-001-L", name: "Футболка белая L", qty: 30, barcode: "4607012345671-03", price: 850, brand: "BasicWear", size: "L", dateReceived: "02.04.2026", marketplace: "Wildberries", kind: "unit" },
    ],
  },
  {
    id: 2, boxNumber: "КРБ-002", upd: "УПЛ-00143", qty: 53,
    brand: "DenimPro", dateReceived: "01.04.2026", status: "on_stock",
    ip: "ИП Петров Б.Б.", marketplace: "Ozon",
    items: [
      { article: "OZ-99001", articleSeller: "JS-045-30", name: "Джинсы slim 30", qty: 30, barcode: "4607012345672-01", price: 3200, brand: "DenimPro", size: "30", dateReceived: "01.04.2026", marketplace: "Ozon", kind: "unit" },
      { article: "OZ-99002", articleSeller: "JS-045-32", name: "Джинсы slim 32", qty: 3, barcode: "4607012345672-02", price: 3200, brand: "DenimPro", size: "32", chzCodes: ["010464007456781921YXZ001", "010464007456781921YXZ002", "010464007456781921YXZ003"], dateReceived: "01.04.2026", marketplace: "Ozon", kind: "unit" },
      { article: "OZ-99003", articleSeller: "JS-045-34", name: "Джинсы slim 34", qty: 20, barcode: "4607012345672-03", price: 3200, brand: "DenimPro", size: "34", dateReceived: "01.04.2026", marketplace: "Ozon", kind: "unit" },
    ],
  },
  {
    id: 3, boxNumber: "КРБ-003", upd: "УПЛ-00144", qty: 45,
    brand: "RunStyle", dateReceived: "31.03.2026", status: "on_stock",
    ip: "ИП Иванов А.А.", marketplace: "Wildberries",
    items: [
      { article: "WB-55001", articleSeller: "KS-112-41", name: "Кроссовки 41", qty: 15, barcode: "4607012345673-01", price: 5600, brand: "RunStyle", size: "41", dateReceived: "31.03.2026", marketplace: "Wildberries", kind: "unit" },
      { article: "WB-55002", articleSeller: "KS-112-42", name: "Кроссовки 42", qty: 15, barcode: "4607012345673-02", price: 5600, brand: "RunStyle", size: "42", dateReceived: "31.03.2026", marketplace: "Wildberries", kind: "unit" },
      { article: "WB-55003", articleSeller: "KS-112-43", name: "Кроссовки 43", qty: 15, barcode: "4607012345673-03", price: 5600, brand: "RunStyle", size: "43", dateReceived: "31.03.2026", marketplace: "Wildberries", kind: "unit" },
    ],
  },
  {
    id: 4, boxNumber: "КРБ-004", upd: "УПЛ-00145", qty: 50,
    brand: "BasicWear", dateReceived: "30.03.2026", status: "on_stock",
    ip: "ИП Сидоров В.В.", marketplace: "Ozon",
    items: [
      { article: "OZ-77001", articleSeller: "HO-023-S", name: "Худи оверсайз S", qty: 20, barcode: "4607012345674-01", price: 2400, brand: "BasicWear", size: "S", dateReceived: "30.03.2026", marketplace: "Ozon", kind: "unit" },
      { article: "OZ-77002", articleSeller: "NB-BX-5", name: "Трусы набор 5шт", qty: 15, barcode: "4607012345674-02", price: 1200, brand: "BasicWear", size: "L", dateReceived: "30.03.2026", marketplace: "Ozon", kind: "set", setSize: 5 },
      { article: "OZ-77003", articleSeller: "HO-023-L", name: "Худи оверсайз L", qty: 15, barcode: "4607012345674-03", price: 2400, brand: "BasicWear", size: "L", dateReceived: "30.03.2026", marketplace: "Ozon", kind: "unit" },
    ],
  },
  {
    id: 5, boxNumber: "КРБ-005", upd: "УПЛ-00146", qty: 60,
    brand: "UrbanBag", dateReceived: "29.03.2026", status: "on_stock",
    ip: "ИП Петров Б.Б.", marketplace: "Wildberries",
    items: [
      { article: "WB-33001", articleSeller: "RG-008-BK", name: "Рюкзак чёрный", qty: 30, barcode: "4607012345675-01", price: 4100, brand: "UrbanBag", size: "—", dateReceived: "29.03.2026", marketplace: "Wildberries", kind: "unit" },
      { article: "WB-33002", articleSeller: "RG-008-GR", name: "Рюкзак серый", qty: 30, barcode: "4607012345675-02", price: 4100, brand: "UrbanBag", size: "—", dateReceived: "29.03.2026", marketplace: "Wildberries", kind: "unit" },
    ],
  },
];

type TabView = "boxes" | "sku";

const StockPage = () => {
  const [activeTab, setActiveTab] = useState<TabView>("boxes");
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [ipFilter, setIpFilter] = useState("all");
  const [mpFilter, setMpFilter] = useState("all");
  const [inventoryMode, setInventoryMode] = useState(false);
  const [inventoryFinished, setInventoryFinished] = useState(false);
  const [scannedIds, setScannedIds] = useState<number[]>([]);
  const [scanInput, setScanInput] = useState("");
  const [boxes, setBoxes] = useState<StockBox[]>(mockBoxes);
  const [expandedBoxes, setExpandedBoxes] = useState<Set<number>>(new Set());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addBarcode, setAddBarcode] = useState("");
  const [addPreview, setAddPreview] = useState<{ kind: "box" | "sku"; label: string; detail: string } | null>(null);
  const [scannedSkuIds, setScannedSkuIds] = useState<Set<string>>(new Set());

  const brands = useMemo(() => [...new Set(boxes.map((b) => b.brand))], [boxes]);
  const ips = useMemo(() => [...new Set(boxes.map((b) => b.ip))], [boxes]);
  const mps = useMemo(() => [...new Set(boxes.map((b) => b.marketplace))], [boxes]);

  const filteredBoxes = useMemo(
    () =>
      boxes.filter((box) => {
        const s = search.toLowerCase();
        const matchSearch =
          box.boxNumber.toLowerCase().includes(s) ||
          box.upd.toLowerCase().includes(s) ||
          box.brand.toLowerCase().includes(s) ||
          box.items.some((i) => i.barcode.includes(search) || i.articleSeller.toLowerCase().includes(s));
        const matchBrand = brandFilter === "all" || box.brand === brandFilter;
        const matchIp = ipFilter === "all" || box.ip === ipFilter;
        const matchMp = mpFilter === "all" || box.marketplace === mpFilter;
        return matchSearch && matchBrand && matchIp && matchMp;
      }),
    [search, brandFilter, ipFilter, mpFilter, boxes]
  );

  // All SKU items flat
  const allSKU = useMemo(() => {
    return boxes.flatMap((box) =>
      box.items.map((item) => ({ ...item, boxNumber: box.boxNumber, boxId: box.id }))
    );
  }, [boxes]);

  const filteredSKU = useMemo(() => {
    return allSKU.filter((item) => {
      const s = search.toLowerCase();
      const matchSearch =
        item.article.toLowerCase().includes(s) ||
        item.articleSeller.toLowerCase().includes(s) ||
        item.name.toLowerCase().includes(s) ||
        item.barcode.includes(search) ||
        item.brand.toLowerCase().includes(s);
      const matchBrand = brandFilter === "all" || item.brand === brandFilter;
      const matchMp = mpFilter === "all" || item.marketplace === mpFilter;
      return matchSearch && matchBrand && matchMp;
    });
  }, [allSKU, search, brandFilter, mpFilter]);

  const toggleBox = (id: number) => {
    setExpandedBoxes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleScan = (id: number) => {
    setScannedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleScanSku = (id: string) => {
    setScannedSkuIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleBarcodeScan = () => {
    const code = scanInput.trim();
    if (!code) return;
    if (activeTab === "boxes") {
      const found = boxes.find(
        (box) =>
          box.upd.toLowerCase() === code.toLowerCase() ||
          box.boxNumber.toLowerCase() === code.toLowerCase() ||
          box.items.some((i) => i.barcode === code)
      );
      if (found) { handleScan(found.id); setScanInput(""); }
      else toast.error("Коробка не найдена");
    } else {
      // SKU mode: match by barcode OR ChZ code
      let matchedId: string | null = null;
      for (const box of boxes) {
        for (const item of box.items) {
          const baseId = `${box.id}:${item.barcode}`;
          if (item.barcode === code) matchedId = baseId;
          if (item.chzCodes?.some((c) => c === code)) matchedId = `${baseId}:${code}`;
          if (matchedId) break;
        }
        if (matchedId) break;
      }
      if (matchedId) { handleScanSku(matchedId); setScanInput(""); }
      else toast.error("Единица не найдена");
    }
  };

  const startInventory = () => {
    setInventoryMode(true); setInventoryFinished(false);
    setScannedIds([]); setScannedSkuIds(new Set());
  };
  const finishInventory = () => { setInventoryFinished(true); };
  const resetInventory = () => {
    setInventoryMode(false); setInventoryFinished(false);
    setScannedIds([]); setScannedSkuIds(new Set());
  };

  const getBoxStatus = (box: StockBox) => {
    if (!inventoryMode) return { label: "На складе", type: "success" as const };
    if (scannedIds.includes(box.id)) return { label: "На складе", type: "success" as const };
    if (inventoryFinished) return { label: "Нет на складе", type: "error" as const };
    return { label: "Не проверен", type: "default" as const };
  };

  const getSkuStatus = (skuKey: string) => {
    if (!inventoryMode) return { label: "На складе", type: "success" as const };
    if (scannedSkuIds.has(skuKey)) return { label: "На складе", type: "success" as const };
    if (inventoryFinished) return { label: "Нет на складе", type: "error" as const };
    return { label: "Не проверен", type: "default" as const };
  };

  // Count of SKU rows (expanded per-unit when ChZ present)
  const totalSkuRows = useMemo(() => {
    let n = 0;
    for (const box of boxes) for (const item of box.items) {
      n += item.chzCodes?.length ? item.chzCodes.length : 1;
    }
    return n;
  }, [boxes]);

  const notScannedCount = inventoryMode
    ? (activeTab === "boxes" ? boxes.length - scannedIds.length : totalSkuRows - scannedSkuIds.size)
    : 0;
  const scannedCount = inventoryMode
    ? (activeTab === "boxes" ? scannedIds.length : scannedSkuIds.size)
    : 0;

  // Excel export — two sheets: Коробки и Единицы
  const exportExcel = () => {
    const boxRows = boxes.map((box) => ({
      "№ Короба": box.boxNumber,
      "Упаковочный лист": box.upd,
      "Количество": box.qty,
      "Бренд": box.brand,
      "ИП": box.ip,
      "Маркетплейс": box.marketplace,
      "Дата приёмки": box.dateReceived,
      "Статус": box.status === "on_stock" ? "На складе" : box.status,
    }));
    const skuRows = boxes.flatMap((box) =>
      box.items.flatMap((item) => {
        if (item.chzCodes && item.chzCodes.length > 0) {
          return item.chzCodes.map((code) => ({
            "Артикул WB/Ozon": item.article,
            "Артикул продавца": item.articleSeller,
            "Бренд": item.brand,
            "Размер": item.size || "—",
            "Количество": 1,
            "Баркод": item.barcode,
            "Честный знак": code,
            "Тип": "единица",
            "Дата приёмки": item.dateReceived,
            "№ Короба": box.boxNumber,
          }));
        }
        return [{
          "Артикул WB/Ozon": item.article,
          "Артикул продавца": item.articleSeller,
          "Бренд": item.brand,
          "Размер": item.size || "—",
          "Количество": item.qty,
          "Баркод": item.barcode,
          "Честный знак": "",
          "Тип": item.kind === "set" ? `набор (${item.setSize ?? ""} шт)` : "единица",
          "Дата приёмки": item.dateReceived,
          "№ Короба": box.boxNumber,
        }];
      })
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(boxRows), "Коробки");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(skuRows), "Единицы");
    XLSX.writeFile(wb, `Сток_${new Date().toLocaleDateString("ru-RU")}.xlsx`);
    toast.success("Excel файл скачан");
  };

  // --- Добавить товар: сканирование штрихкода/ЧЗ ---
  const handleAddLookup = () => {
    const code = addBarcode.trim();
    if (!code) return;
    // Проверка на совпадение с упаковочным листом (коробка)
    const existingBox = boxes.find((b) => b.upd.toLowerCase() === code.toLowerCase());
    if (existingBox) {
      setAddPreview({ kind: "box", label: `Коробка ${existingBox.boxNumber}`, detail: `${existingBox.upd} уже есть в Стоке` });
      return;
    }
    // Предпросмотр: тип определяется по формату
    if (code.startsWith("УПЛ") || code.startsWith("PACK")) {
      setAddPreview({ kind: "box", label: `Новая коробка`, detail: `Упаковочный лист: ${code}` });
    } else if (code.length > 20) {
      setAddPreview({ kind: "sku", label: "Единица с Честным знаком", detail: `Код ЧЗ: ${code}` });
    } else {
      setAddPreview({ kind: "sku", label: "Единица", detail: `Штрих-код: ${code}` });
    }
  };

  const handleAddConfirm = () => {
    if (!addPreview) return;
    const code = addBarcode.trim();
    const today = new Date().toLocaleDateString("ru-RU");
    if (addPreview.kind === "box") {
      const newBox: StockBox = {
        id: Date.now(), boxNumber: `КРБ-${String(Date.now()).slice(-3)}`,
        upd: code, qty: 0, brand: "—", dateReceived: today,
        status: "on_stock", ip: "—", marketplace: "—", items: [],
      };
      setBoxes((prev) => [newBox, ...prev]);
      toast.success(`Упаковочный лист ${code} добавлен`);
    } else {
      // единица — добавим как виртуальную коробку без упаковочного листа с одним товаром
      const isChz = code.length > 20;
      const newBox: StockBox = {
        id: Date.now(), boxNumber: `БК-${String(Date.now()).slice(-3)}`,
        upd: "—", qty: 1, brand: "—", dateReceived: today, status: "on_stock",
        ip: "—", marketplace: "—",
        items: [{
          article: "—", articleSeller: "—", name: isChz ? "Единица (по ЧЗ)" : "Единица (по баркоду)",
          qty: 1, barcode: isChz ? String(Date.now()) : code, brand: "—",
          chzCodes: isChz ? [code] : undefined, dateReceived: today, kind: "unit",
        }],
      };
      setBoxes((prev) => [newBox, ...prev]);
      toast.success(`Единица добавлена`);
    }
    setAddBarcode(""); setAddPreview(null); setAddDialogOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Сток / Инвентаризация"
        description="Общий список остатков товара на складе"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportExcel}>
              <Download className="w-4 h-4 mr-2" />
              Скачать Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить товар
            </Button>
            {inventoryMode ? (
              inventoryFinished ? (
                <Button variant="outline" size="sm" onClick={resetInventory}>Сбросить</Button>
              ) : (
                <Button variant="default" size="sm" onClick={finishInventory}>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Завершить инвентаризацию
                </Button>
              )
            ) : (
              <Button variant="outline" size="sm" onClick={startInventory}>
                <ScanLine className="w-4 h-4 mr-2" />
                Инвентаризация
              </Button>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-4 flex-1 overflow-auto">
        {/* Tab switcher */}
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Button
            variant={activeTab === "boxes" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("boxes")}
          >
            <Box className="w-4 h-4 mr-1.5" />
            Короба
          </Button>
          <Button
            variant={activeTab === "sku" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("sku")}
          >
            <Package className="w-4 h-4 mr-1.5" />
            Единицы SKU
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative max-w-xs flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Поиск..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {activeTab === "boxes" && (
            <Select value={ipFilter} onValueChange={setIpFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="ИП" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все ИП</SelectItem>
                {ips.map((ip) => <SelectItem key={ip} value={ip}>{ip}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={mpFilter} onValueChange={setMpFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Маркетплейс" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все МП</SelectItem>
              {mps.map((mp) => <SelectItem key={mp} value={mp}>{mp}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Бренд" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все бренды</SelectItem>
              {brands.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Inventory scan bar */}
        {inventoryMode && !inventoryFinished && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-primary/30 bg-primary/5">
            <ScanLine className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">
              Инвентаризация: {activeTab === "boxes" ? "коробки" : "единицы"}
            </span>
            <Input
              placeholder={activeTab === "boxes" ? "Сканируйте упаковочный лист..." : "Сканируйте штрих-код или ЧЗ..."}
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBarcodeScan()}
              className="max-w-xs"
              autoFocus
            />
            <Button size="sm" variant="secondary" onClick={handleBarcodeScan}>Найти</Button>
            <div className="ml-auto flex items-center gap-3 text-sm">
              <Badge variant="secondary" className="gap-1"><CheckCircle2 className="w-3 h-3" />{scannedCount} найдено</Badge>
              <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />{notScannedCount} не проверено</Badge>
            </div>
          </div>
        )}

        {inventoryMode && inventoryFinished && (
          <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <div className="text-sm">
              <span className="font-medium">Инвентаризация завершена. </span>
              <span className="text-success font-medium">{scannedCount} на складе</span>
              {notScannedCount > 0 && <span className="text-destructive font-medium ml-2">{notScannedCount} не найдено</span>}
            </div>
          </div>
        )}

        {/* ===== TAB: BOXES ===== */}
        {activeTab === "boxes" && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-medium w-8"></TableHead>
                  <TableHead className="text-xs font-medium">№ Короба</TableHead>
                  <TableHead className="text-xs font-medium">Упаковочный лист</TableHead>
                  <TableHead className="text-xs font-medium text-right">Кол-во</TableHead>
                  <TableHead className="text-xs font-medium">Бренд</TableHead>
                  <TableHead className="text-xs font-medium">ИП</TableHead>
                  <TableHead className="text-xs font-medium">Маркетплейс</TableHead>
                  <TableHead className="text-xs font-medium">Дата приёмки</TableHead>
                  <TableHead className="text-xs font-medium">Статус</TableHead>
                  {inventoryMode && !inventoryFinished && <TableHead className="text-xs font-medium w-16"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBoxes.map((box) => {
                  const status = getBoxStatus(box);
                  const scanned = scannedIds.includes(box.id);
                  const isExpanded = expandedBoxes.has(box.id);
                  return (
                    <Collapsible key={box.id} asChild open={isExpanded} onOpenChange={() => toggleBox(box.id)}>
                      <>
                        <TableRow
                          className={inventoryMode ? (scanned ? "bg-success/5" : inventoryFinished ? "bg-destructive/5" : "") : "cursor-pointer hover:bg-muted/30"}
                        >
                          <TableCell>
                            <CollapsibleTrigger asChild>
                              <button className="p-1 hover:bg-muted rounded">
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            </CollapsibleTrigger>
                          </TableCell>
                          <TableCell>
                            <CollapsibleTrigger asChild>
                              <button className="flex items-center gap-1.5 font-mono text-sm text-primary hover:underline">
                                <Box className="w-3.5 h-3.5" />
                                {box.boxNumber}
                              </button>
                            </CollapsibleTrigger>
                          </TableCell>
                          <TableCell className="text-sm font-mono text-muted-foreground">{box.upd}</TableCell>
                          <TableCell className="text-sm text-right font-medium">{box.qty}</TableCell>
                          <TableCell className="text-sm">{box.brand}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{box.ip}</TableCell>
                          <TableCell className="text-sm">{box.marketplace}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{box.dateReceived}</TableCell>
                          <TableCell><StatusBadge status={status.type} label={status.label} /></TableCell>
                          {inventoryMode && !inventoryFinished && (
                            <TableCell>
                              {!scanned && (
                                <Button variant="ghost" size="sm" onClick={() => handleScan(box.id)} title="Отметить">
                                  <ScanLine className="w-4 h-4" />
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                        <CollapsibleContent asChild>
                          <tr>
                            <td colSpan={inventoryMode && !inventoryFinished ? 11 : 10} className="p-0">
                              <div className="bg-muted/20 border-t border-border px-8 py-3">
                                <p className="text-xs font-medium text-muted-foreground mb-2">Наполнение короба {box.boxNumber}</p>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-xs">Артикул</TableHead>
                                      <TableHead className="text-xs">Наименование</TableHead>
                                      <TableHead className="text-xs">Размер</TableHead>
                                      <TableHead className="text-xs text-right">Кол-во</TableHead>
                                      <TableHead className="text-xs">Баркод</TableHead>
                                      {box.items.some((i) => i.chzCodes?.length) && <TableHead className="text-xs">Честный знак</TableHead>}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {box.items.flatMap((item, idx) => {
                                      if (item.chzCodes && item.chzCodes.length > 0) {
                                        return item.chzCodes.map((code, cIdx) => (
                                          <TableRow key={`${idx}-${cIdx}`}>
                                            <TableCell className="text-xs font-mono">{item.articleSeller}</TableCell>
                                            <TableCell className="text-xs">{item.name}</TableCell>
                                            <TableCell className="text-xs">{item.size || "—"}</TableCell>
                                            <TableCell className="text-xs text-right">1</TableCell>
                                            <TableCell className="text-xs font-mono text-muted-foreground">{item.barcode}</TableCell>
                                            {box.items.some((i) => i.chzCodes?.length) && (
                                              <TableCell className="text-xs font-mono text-muted-foreground max-w-[220px] truncate" title={code}>{code}</TableCell>
                                            )}
                                          </TableRow>
                                        ));
                                      }
                                      return [(
                                        <TableRow key={idx}>
                                          <TableCell className="text-xs font-mono">{item.articleSeller}</TableCell>
                                          <TableCell className="text-xs">{item.name}</TableCell>
                                          <TableCell className="text-xs">{item.size || "—"}</TableCell>
                                          <TableCell className="text-xs text-right">{item.qty}</TableCell>
                                          <TableCell className="text-xs font-mono text-muted-foreground">{item.barcode}</TableCell>
                                          {box.items.some((i) => i.chzCodes?.length) && (
                                            <TableCell className="text-xs text-muted-foreground">—</TableCell>
                                          )}
                                        </TableRow>
                                      )];
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </td>
                          </tr>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  );
                })}
                {filteredBoxes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-8">Ничего не найдено</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ===== TAB: SKU ===== */}
        {activeTab === "sku" && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-medium">Артикул WB/Ozon</TableHead>
                  <TableHead className="text-xs font-medium">Артикул продавца</TableHead>
                  <TableHead className="text-xs font-medium">Бренд</TableHead>
                  <TableHead className="text-xs font-medium">Размер</TableHead>
                  <TableHead className="text-xs font-medium text-right">Количество</TableHead>
                  <TableHead className="text-xs font-medium">Баркод</TableHead>
                  <TableHead className="text-xs font-medium">Честный знак</TableHead>
                  <TableHead className="text-xs font-medium">Тип</TableHead>
                  <TableHead className="text-xs font-medium">Дата приёмки</TableHead>
                  <TableHead className="text-xs font-medium">Статус</TableHead>
                  {inventoryMode && !inventoryFinished && <TableHead className="text-xs font-medium w-16"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSKU.flatMap((item, idx) => {
                  const rows: JSX.Element[] = [];
                  if (item.chzCodes && item.chzCodes.length > 0) {
                    item.chzCodes.forEach((code, cIdx) => {
                      const key = `${item.boxId}:${item.barcode}:${code}`;
                      const st = getSkuStatus(key);
                      const scanned = scannedSkuIds.has(key);
                      rows.push(
                        <TableRow key={`${idx}-${cIdx}`}
                          className={inventoryMode ? (scanned ? "bg-success/5" : inventoryFinished ? "bg-destructive/5" : "") : ""}>
                          <TableCell className="text-sm font-mono">{item.article}</TableCell>
                          <TableCell className="text-sm font-mono text-muted-foreground">{item.articleSeller}</TableCell>
                          <TableCell className="text-sm">{item.brand}</TableCell>
                          <TableCell className="text-sm">{item.size || "—"}</TableCell>
                          <TableCell className="text-sm text-right font-medium">1</TableCell>
                          <TableCell className="text-sm font-mono text-muted-foreground">{item.barcode}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground max-w-[200px] truncate" title={code}>{code}</TableCell>
                          <TableCell className="text-xs">{item.kind === "set" ? `набор (${item.setSize ?? ""} шт)` : "единица"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{item.dateReceived}</TableCell>
                          <TableCell><StatusBadge status={st.type} label={st.label} /></TableCell>
                          {inventoryMode && !inventoryFinished && (
                            <TableCell>
                              {!scanned && (
                                <Button variant="ghost" size="sm" onClick={() => handleScanSku(key)} title="Отметить">
                                  <ScanLine className="w-4 h-4" />
                                </Button>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    });
                  } else {
                    const key = `${item.boxId}:${item.barcode}`;
                    const st = getSkuStatus(key);
                    const scanned = scannedSkuIds.has(key);
                    rows.push(
                      <TableRow key={idx}
                        className={inventoryMode ? (scanned ? "bg-success/5" : inventoryFinished ? "bg-destructive/5" : "") : ""}>
                        <TableCell className="text-sm font-mono">{item.article}</TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">{item.articleSeller}</TableCell>
                        <TableCell className="text-sm">{item.brand}</TableCell>
                        <TableCell className="text-sm">{item.size || "—"}</TableCell>
                        <TableCell className="text-sm text-right font-medium">{item.qty}</TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">{item.barcode}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">—</TableCell>
                        <TableCell className="text-xs">{item.kind === "set" ? `набор (${item.setSize ?? ""} шт)` : "единица"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.dateReceived}</TableCell>
                        <TableCell><StatusBadge status={st.type} label={st.label} /></TableCell>
                        {inventoryMode && !inventoryFinished && (
                          <TableCell>
                            {!scanned && (
                              <Button variant="ghost" size="sm" onClick={() => handleScanSku(key)} title="Отметить">
                                <ScanLine className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  }
                  return rows;
                })}
                {filteredSKU.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={inventoryMode && !inventoryFinished ? 11 : 10} className="text-center text-muted-foreground py-8">Ничего не найдено</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Add item dialog */}
      <Dialog open={addDialogOpen} onOpenChange={(open) => {
        setAddDialogOpen(open);
        if (!open) { setAddBarcode(""); setAddPreview(null); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Добавить товар
            </DialogTitle>
            <DialogDescription>
              Отсканируйте упаковочный лист (коробка), штрих-код или Честный знак (единица).
              Можно также ввести значение вручную.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Штрих-код, ЧЗ или упаковочный лист..."
                  value={addBarcode}
                  onChange={(e) => { setAddBarcode(e.target.value); setAddPreview(null); }}
                  onKeyDown={(e) => e.key === "Enter" && handleAddLookup()}
                  className="pl-9" autoFocus
                />
              </div>
              <Button size="sm" onClick={handleAddLookup}>Считать</Button>
            </div>
            {addPreview && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  {addPreview.kind === "box" ? <Box className="w-4 h-4 text-primary" /> : <Package className="w-4 h-4 text-primary" />}
                  <span className="font-medium text-sm">{addPreview.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{addPreview.detail}</p>
                <Button variant="default" size="sm" className="w-full" onClick={handleAddConfirm}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />Добавить в Сток
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockPage;
