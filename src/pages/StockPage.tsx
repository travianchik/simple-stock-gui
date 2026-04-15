import { useState, useMemo, useRef } from "react";
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
import {
  Search, ScanLine, FileText, Download, Package, CheckCircle2, XCircle, AlertTriangle, Upload, ChevronDown, ChevronRight, Box,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface SKUItem {
  article: string;
  articleSeller: string;
  name: string;
  qty: number;
  barcode: string;
  price?: number;
  brand: string;
  size?: string;
  chz?: string; // Честный знак
  dateReceived: string;
  marketplace?: string;
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
    id: 1, boxNumber: "КРБ-001", upd: "УПД-00142", qty: 120,
    brand: "BasicWear", dateReceived: "02.04.2026", status: "on_stock",
    ip: "ИП Иванов А.А.", marketplace: "Wildberries",
    items: [
      { article: "WB-12345", articleSeller: "FB-001-S", name: "Футболка белая S", qty: 40, barcode: "4607012345671-01", price: 850, brand: "BasicWear", size: "S", dateReceived: "02.04.2026", marketplace: "Wildberries" },
      { article: "WB-12346", articleSeller: "FB-001-M", name: "Футболка белая M", qty: 50, barcode: "4607012345671-02", price: 850, brand: "BasicWear", size: "M", chz: "010464007456781921abc123", dateReceived: "02.04.2026", marketplace: "Wildberries" },
      { article: "WB-12347", articleSeller: "FB-001-L", name: "Футболка белая L", qty: 30, barcode: "4607012345671-03", price: 850, brand: "BasicWear", size: "L", dateReceived: "02.04.2026", marketplace: "Wildberries" },
    ],
  },
  {
    id: 2, boxNumber: "КРБ-002", upd: "УПД-00143", qty: 80,
    brand: "DenimPro", dateReceived: "01.04.2026", status: "on_stock",
    ip: "ИП Петров Б.Б.", marketplace: "Ozon",
    items: [
      { article: "OZ-99001", articleSeller: "JS-045-30", name: "Джинсы slim 30", qty: 30, barcode: "4607012345672-01", price: 3200, brand: "DenimPro", size: "30", dateReceived: "01.04.2026", marketplace: "Ozon" },
      { article: "OZ-99002", articleSeller: "JS-045-32", name: "Джинсы slim 32", qty: 30, barcode: "4607012345672-02", price: 3200, brand: "DenimPro", size: "32", chz: "010464007456781921xyz456", dateReceived: "01.04.2026", marketplace: "Ozon" },
      { article: "OZ-99003", articleSeller: "JS-045-34", name: "Джинсы slim 34", qty: 20, barcode: "4607012345672-03", price: 3200, brand: "DenimPro", size: "34", dateReceived: "01.04.2026", marketplace: "Ozon" },
    ],
  },
  {
    id: 3, boxNumber: "КРБ-003", upd: "УПД-00144", qty: 45,
    brand: "RunStyle", dateReceived: "31.03.2026", status: "on_stock",
    ip: "ИП Иванов А.А.", marketplace: "Wildberries",
    items: [
      { article: "WB-55001", articleSeller: "KS-112-41", name: "Кроссовки 41", qty: 15, barcode: "4607012345673-01", price: 5600, brand: "RunStyle", size: "41", dateReceived: "31.03.2026", marketplace: "Wildberries" },
      { article: "WB-55002", articleSeller: "KS-112-42", name: "Кроссовки 42", qty: 15, barcode: "4607012345673-02", price: 5600, brand: "RunStyle", size: "42", dateReceived: "31.03.2026", marketplace: "Wildberries" },
      { article: "WB-55003", articleSeller: "KS-112-43", name: "Кроссовки 43", qty: 15, barcode: "4607012345673-03", price: 5600, brand: "RunStyle", size: "43", dateReceived: "31.03.2026", marketplace: "Wildberries" },
    ],
  },
  {
    id: 4, boxNumber: "КРБ-004", upd: "УПД-00145", qty: 200,
    brand: "BasicWear", dateReceived: "30.03.2026", status: "on_stock",
    ip: "ИП Сидоров В.В.", marketplace: "Ozon",
    items: [
      { article: "OZ-77001", articleSeller: "HO-023-S", name: "Худи оверсайз S", qty: 60, barcode: "4607012345674-01", price: 2400, brand: "BasicWear", size: "S", dateReceived: "30.03.2026", marketplace: "Ozon" },
      { article: "OZ-77002", articleSeller: "HO-023-M", name: "Худи оверсайз M", qty: 80, barcode: "4607012345674-02", price: 2400, brand: "BasicWear", size: "M", dateReceived: "30.03.2026", marketplace: "Ozon" },
      { article: "OZ-77003", articleSeller: "HO-023-L", name: "Худи оверсайз L", qty: 60, barcode: "4607012345674-03", price: 2400, brand: "BasicWear", size: "L", dateReceived: "30.03.2026", marketplace: "Ozon" },
    ],
  },
  {
    id: 5, boxNumber: "КРБ-005", upd: "УПД-00146", qty: 60,
    brand: "UrbanBag", dateReceived: "29.03.2026", status: "on_stock",
    ip: "ИП Петров Б.Б.", marketplace: "Wildberries",
    items: [
      { article: "WB-33001", articleSeller: "RG-008-BK", name: "Рюкзак чёрный", qty: 30, barcode: "4607012345675-01", price: 4100, brand: "UrbanBag", size: "—", dateReceived: "29.03.2026", marketplace: "Wildberries" },
      { article: "WB-33002", articleSeller: "RG-008-GR", name: "Рюкзак серый", qty: 30, barcode: "4607012345675-02", price: 4100, brand: "UrbanBag", size: "—", dateReceived: "29.03.2026", marketplace: "Wildberries" },
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
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState<"file" | "barcode">("file");
  const [uploadBarcode, setUploadBarcode] = useState("");
  const [uploadTargetItem, setUploadTargetItem] = useState<StockBox | null>(null);
  const xmlInputRef = useRef<HTMLInputElement>(null);

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

  const handleBarcodeScan = () => {
    if (!scanInput.trim()) return;
    const found = boxes.find(
      (box) =>
        box.upd.toLowerCase() === scanInput.trim().toLowerCase() ||
        box.boxNumber.toLowerCase() === scanInput.trim().toLowerCase() ||
        box.items.some((i) => i.barcode === scanInput.trim())
    );
    if (found) {
      handleScan(found.id);
      setScanInput("");
    }
  };

  const startInventory = () => { setInventoryMode(true); setInventoryFinished(false); setScannedIds([]); };
  const finishInventory = () => { setInventoryFinished(true); };
  const resetInventory = () => { setInventoryMode(false); setInventoryFinished(false); setScannedIds([]); };

  const getBoxStatus = (box: StockBox) => {
    if (!inventoryMode) return { label: "На складе", type: "success" as const };
    if (scannedIds.includes(box.id)) return { label: "На складе", type: "success" as const };
    if (inventoryFinished) return { label: "Нет на складе", type: "error" as const };
    return { label: "Не проверен", type: "default" as const };
  };

  const notScannedCount = inventoryMode ? boxes.length - scannedIds.length : 0;

  // Excel export
  const exportExcel = () => {
    const rows = boxes.flatMap((box) =>
      box.items.map((item) => ({
        "№ Короба": box.boxNumber,
        "УПД": box.upd,
        "Артикул WB/Ozon": item.article,
        "Артикул продавца": item.articleSeller,
        "Наименование": item.name,
        "Бренд": item.brand,
        "Размер": item.size || "—",
        "Остаток": item.qty,
        "Баркод": item.barcode,
        "ЧЗ": item.chz || "",
        "Дата приёмки": item.dateReceived,
        "Маркетплейс": item.marketplace || "",
        "ИП": box.ip,
      }))
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Сток");
    XLSX.writeFile(wb, `Сток_${new Date().toLocaleDateString("ru-RU")}.xlsx`);
    toast.success("Excel файл скачан");
  };

  // XML upload
  const parseXMLToBox = (xmlText: string): StockBox | null => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, "text/xml");
      if (doc.querySelector("parsererror")) { toast.error("Ошибка разбора XML файла"); return null; }

      const docNumber = doc.querySelector("Документ, Document, СвСчФакт, ИдДок")?.getAttribute("НомерСчФ")
        || doc.querySelector("Документ, Document")?.getAttribute("Номер")
        || doc.querySelector("НомерДок, DocNumber")?.textContent
        || doc.querySelector("[НомерСчФ]")?.getAttribute("НомерСчФ")
        || `УПД-${String(Date.now()).slice(-5)}`;
      const updNumber = docNumber.startsWith("УПД") ? docNumber : `УПД-${docNumber}`;

      const dateAttr = doc.querySelector("Документ, Document, СвСчФакт")?.getAttribute("ДатаСчФ")
        || doc.querySelector("ДатаДок, DocDate")?.textContent
        || new Date().toLocaleDateString("ru-RU");

      const sellerName = doc.querySelector("СвПрод, Продавец, Seller")?.getAttribute("НаимОрг")
        || doc.querySelector("НаимПрод, SellerName")?.textContent
        || "Поставщик";

      const itemNodes = doc.querySelectorAll("СведТов, ТоварнаяСтрока, Item, Товар, ТаблСчФакт > *");
      const items: SKUItem[] = [];
      itemNodes.forEach((node, idx) => {
        const name = node.getAttribute("НаимТов") || node.querySelector("Наименование, Name")?.textContent || `Товар ${idx + 1}`;
        const articleSeller = node.getAttribute("Артикул") || node.querySelector("Артикул, Article, КодТов")?.textContent || `ART-${idx + 1}`;
        const qty = parseInt(node.getAttribute("КолТов") || node.querySelector("Количество, Qty")?.textContent || "1", 10);
        const price = parseFloat(node.getAttribute("ЦенаТов") || node.querySelector("Цена, Price")?.textContent || "0");
        const barcode = node.getAttribute("ШтрихКод") || node.querySelector("ШтрихКод, Barcode")?.textContent || `${Date.now()}-${idx}`;
        items.push({ article: articleSeller, articleSeller, name, qty, barcode, price, brand: sellerName, dateReceived: dateAttr });
      });
      if (items.length === 0) {
        items.push({ article: "N/A", articleSeller: "N/A", name: "Товар из УПД", qty: 1, barcode: String(Date.now()), price: 0, brand: sellerName, dateReceived: dateAttr });
      }

      return {
        id: Date.now(), boxNumber: `КРБ-${String(Date.now()).slice(-3)}`, upd: updNumber,
        qty: items.reduce((s, i) => s + i.qty, 0), brand: sellerName, dateReceived: dateAttr,
        status: "on_stock", ip: "Не указан", marketplace: "Не указан", items,
      };
    } catch { toast.error("Не удалось разобрать XML"); return null; }
  };

  const handleXMLUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const item = parseXMLToBox(e.target?.result as string);
      if (!item) return;
      if (boxes.some((b) => b.upd.toLowerCase() === item.upd.toLowerCase())) {
        toast.error(`УПД ${item.upd} уже существует в списке`);
        return;
      }
      setBoxes((prev) => [item, ...prev]);
      toast.success(`УПД ${item.upd} успешно добавлен`);
      setUploadDialogOpen(false);
    };
    reader.readAsText(file);
  };

  const handleBarcodeUploadSearch = () => {
    if (!uploadBarcode.trim()) return;
    const found = boxes.find(
      (b) => b.upd.toLowerCase() === uploadBarcode.trim().toLowerCase() ||
        b.items.some((i) => i.barcode === uploadBarcode.trim())
    );
    if (found) { toast.error(`УПД ${found.upd} уже существует`); setUploadTargetItem(null); return; }
    setUploadTargetItem({
      id: Date.now(), boxNumber: `КРБ-${uploadBarcode.trim().slice(-3)}`,
      upd: `УПД-${uploadBarcode.trim().slice(-5)}`, qty: 0, brand: "Не указан",
      dateReceived: new Date().toLocaleDateString("ru-RU"), status: "on_stock",
      ip: "Не указан", marketplace: "Не указан", items: [],
    });
  };

  const handleBarcodeAddToStock = () => {
    if (!uploadTargetItem) return;
    setBoxes((prev) => [uploadTargetItem, ...prev]);
    toast.success(`УПД ${uploadTargetItem.upd} добавлен`);
    setUploadBarcode(""); setUploadTargetItem(null); setUploadDialogOpen(false);
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
            <Button variant="outline" size="sm" onClick={() => { setUploadDialogOpen(true); setUploadTab("file"); }}>
              <Upload className="w-4 h-4 mr-2" />
              Загрузить УПД
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
            <span className="text-sm font-medium">Режим инвентаризации</span>
            <Input
              placeholder="Сканируйте штрих-код..."
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBarcodeScan()}
              className="max-w-xs"
              autoFocus
            />
            <Button size="sm" variant="secondary" onClick={handleBarcodeScan}>Найти</Button>
            <div className="ml-auto flex items-center gap-3 text-sm">
              <Badge variant="secondary" className="gap-1"><CheckCircle2 className="w-3 h-3" />{scannedIds.length} найдено</Badge>
              <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />{notScannedCount} не проверено</Badge>
            </div>
          </div>
        )}

        {inventoryMode && inventoryFinished && (
          <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <div className="text-sm">
              <span className="font-medium">Инвентаризация завершена. </span>
              <span className="text-success font-medium">{scannedIds.length} на складе</span>
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
                  <TableHead className="text-xs font-medium text-right">Кол-во</TableHead>
                  <TableHead className="text-xs font-medium">Бренд</TableHead>
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
                          <TableCell className="text-sm text-right font-medium">{box.qty}</TableCell>
                          <TableCell className="text-sm">{box.brand}</TableCell>
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
                            <td colSpan={inventoryMode && !inventoryFinished ? 7 : 6} className="p-0">
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
                                      {box.items.some((i) => i.chz) && <TableHead className="text-xs">ЧЗ</TableHead>}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {box.items.map((item, idx) => (
                                      <TableRow key={idx}>
                                        <TableCell className="text-xs font-mono">{item.articleSeller}</TableCell>
                                        <TableCell className="text-xs">{item.name}</TableCell>
                                        <TableCell className="text-xs">{item.size || "—"}</TableCell>
                                        <TableCell className="text-xs text-right">{item.qty}</TableCell>
                                        <TableCell className="text-xs font-mono text-muted-foreground">{item.barcode}</TableCell>
                                        {box.items.some((i) => i.chz) && (
                                          <TableCell className="text-xs font-mono text-muted-foreground max-w-[200px] truncate">{item.chz || "—"}</TableCell>
                                        )}
                                      </TableRow>
                                    ))}
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
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Ничего не найдено</TableCell>
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
                  <TableHead className="text-xs font-medium text-right">Остаток</TableHead>
                  <TableHead className="text-xs font-medium">Баркод</TableHead>
                  <TableHead className="text-xs font-medium">Дата приёмки</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSKU.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-sm font-mono">{item.article}</TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">{item.articleSeller}</TableCell>
                    <TableCell className="text-sm">{item.brand}</TableCell>
                    <TableCell className="text-sm">{item.size || "—"}</TableCell>
                    <TableCell className="text-sm text-right font-medium">{item.qty}</TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">{item.barcode}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.dateReceived}</TableCell>
                  </TableRow>
                ))}
                {filteredSKU.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Ничего не найдено</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Upload UPD dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
        setUploadDialogOpen(open);
        if (!open) { setUploadBarcode(""); setUploadTargetItem(null); setUploadTab("file"); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Загрузить УПД
            </DialogTitle>
            <DialogDescription>Загрузите XML-файл или отсканируйте штрих-код</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 border-b border-border pb-2">
            <Button variant={uploadTab === "file" ? "default" : "ghost"} size="sm"
              onClick={() => { setUploadTab("file"); setUploadTargetItem(null); setUploadBarcode(""); }}>
              <FileText className="w-4 h-4 mr-1" />XML файл
            </Button>
            <Button variant={uploadTab === "barcode" ? "default" : "ghost"} size="sm"
              onClick={() => { setUploadTab("barcode"); setUploadTargetItem(null); }}>
              <ScanLine className="w-4 h-4 mr-1" />Штрих-код
            </Button>
          </div>
          {uploadTab === "file" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Выберите XML-файл УПД. Система автоматически считает данные и добавит в Сток.</p>
              <input ref={xmlInputRef} type="file" className="hidden" accept=".xml"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleXMLUpload(file); e.target.value = ""; }} />
              <Button variant="outline" className="w-full h-24 border-dashed border-2 flex flex-col gap-2"
                onClick={() => xmlInputRef.current?.click()}>
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Нажмите для выбора XML файла</span>
              </Button>
            </div>
          )}
          {uploadTab === "barcode" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Отсканируйте штрих-код с печатного УПД или введите вручную.</p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Штрих-код или номер УПД..." value={uploadBarcode}
                    onChange={(e) => setUploadBarcode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleBarcodeUploadSearch()}
                    className="pl-9" autoFocus />
                </div>
                <Button size="sm" onClick={handleBarcodeUploadSearch}>Найти</Button>
              </div>
              {uploadTargetItem && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">{uploadTargetItem.upd}</span>
                  </div>
                  <Button variant="default" size="sm" className="w-full" onClick={handleBarcodeAddToStock}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />Добавить в Сток
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockPage;
