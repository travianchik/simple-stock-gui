import { useState, useMemo, useRef } from "react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import UPDDocument, { UPDDocumentData } from "@/components/UPDDocument";
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
  Search, ScanLine, FileText, Download, Eye, Package, CheckCircle2, XCircle, AlertTriangle, Upload,
} from "lucide-react";
import { toast } from "sonner";

interface StockItem {
  id: number;
  upd: string;
  name: string;
  article: string;
  qty: number;
  brand: string;
  date: string;
  barcode: string;
  items: { article: string; name: string; qty: number; barcode: string; price?: number }[];
  uploadedFileUrl?: string | null;
  uploadedFileName?: string | null;
}

const mockStock: StockItem[] = [
  {
    id: 1, upd: "УПД-00142", name: "Футболка базовая белая", article: "FB-001", qty: 120,
    brand: "BasicWear", date: "02.04.2026", barcode: "4607012345671",
    items: [
      { article: "FB-001-S", name: "Футболка белая S", qty: 40, barcode: "4607012345671-01", price: 850 },
      { article: "FB-001-M", name: "Футболка белая M", qty: 50, barcode: "4607012345671-02", price: 850 },
      { article: "FB-001-L", name: "Футболка белая L", qty: 30, barcode: "4607012345671-03", price: 850 },
    ],
  },
  {
    id: 2, upd: "УПД-00143", name: "Джинсы slim fit", article: "JS-045", qty: 80,
    brand: "DenimPro", date: "01.04.2026", barcode: "4607012345672",
    items: [
      { article: "JS-045-30", name: "Джинсы slim 30", qty: 30, barcode: "4607012345672-01", price: 3200 },
      { article: "JS-045-32", name: "Джинсы slim 32", qty: 30, barcode: "4607012345672-02", price: 3200 },
      { article: "JS-045-34", name: "Джинсы slim 34", qty: 20, barcode: "4607012345672-03", price: 3200 },
    ],
  },
  {
    id: 3, upd: "УПД-00144", name: "Кроссовки спортивные", article: "KS-112", qty: 45,
    brand: "RunStyle", date: "31.03.2026", barcode: "4607012345673",
    items: [
      { article: "KS-112-41", name: "Кроссовки 41", qty: 15, barcode: "4607012345673-01", price: 5600 },
      { article: "KS-112-42", name: "Кроссовки 42", qty: 15, barcode: "4607012345673-02", price: 5600 },
      { article: "KS-112-43", name: "Кроссовки 43", qty: 15, barcode: "4607012345673-03", price: 5600 },
    ],
  },
  {
    id: 4, upd: "УПД-00145", name: "Худи оверсайз", article: "HO-023", qty: 200,
    brand: "BasicWear", date: "30.03.2026", barcode: "4607012345674",
    items: [
      { article: "HO-023-S", name: "Худи оверсайз S", qty: 60, barcode: "4607012345674-01", price: 2400 },
      { article: "HO-023-M", name: "Худи оверсайз M", qty: 80, barcode: "4607012345674-02", price: 2400 },
      { article: "HO-023-L", name: "Худи оверсайз L", qty: 60, barcode: "4607012345674-03", price: 2400 },
    ],
  },
  {
    id: 5, upd: "УПД-00146", name: "Рюкзак городской", article: "RG-008", qty: 60,
    brand: "UrbanBag", date: "29.03.2026", barcode: "4607012345675",
    items: [
      { article: "RG-008-BK", name: "Рюкзак чёрный", qty: 30, barcode: "4607012345675-01", price: 4100 },
      { article: "RG-008-GR", name: "Рюкзак серый", qty: 30, barcode: "4607012345675-02", price: 4100 },
    ],
  },
  {
    id: 6, upd: "УПД-00147", name: "Шапка вязаная", article: "SV-019", qty: 150,
    brand: "WarmHead", date: "28.03.2026", barcode: "4607012345676",
    items: [
      { article: "SV-019-BK", name: "Шапка чёрная", qty: 75, barcode: "4607012345676-01", price: 1200 },
      { article: "SV-019-WH", name: "Шапка белая", qty: 75, barcode: "4607012345676-02", price: 1200 },
    ],
  },
];

const StockPage = () => {
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [inventoryMode, setInventoryMode] = useState(false);
  const [inventoryFinished, setInventoryFinished] = useState(false);
  const [scannedIds, setScannedIds] = useState<number[]>([]);
  const [scanInput, setScanInput] = useState("");
  const [updDialog, setUpdDialog] = useState<StockItem | null>(null);
  const [stockItems, setStockItems] = useState<StockItem[]>(mockStock);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState<"file" | "barcode">("file");
  const [uploadBarcode, setUploadBarcode] = useState("");
  const [uploadTargetItem, setUploadTargetItem] = useState<StockItem | null>(null);
  const xmlInputRef = useRef<HTMLInputElement>(null);

  const brands = useMemo(() => [...new Set(stockItems.map((i) => i.brand))], [stockItems]);

  const filtered = useMemo(
    () =>
      stockItems.filter((item) => {
        const matchSearch =
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.upd.toLowerCase().includes(search.toLowerCase()) ||
          item.article.toLowerCase().includes(search.toLowerCase()) ||
          item.barcode.includes(search);
        const matchBrand = brandFilter === "all" || item.brand === brandFilter;
        return matchSearch && matchBrand;
      }),
    [search, brandFilter, stockItems]
  );

  const handleScan = (id: number) => {
    setScannedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleBarcodeScan = () => {
    if (!scanInput.trim()) return;
    const found = stockItems.find(
      (item) =>
        item.barcode === scanInput.trim() || item.upd.toLowerCase() === scanInput.trim().toLowerCase()
    );
    if (found) {
      handleScan(found.id);
      setScanInput("");
    }
  };

  const startInventory = () => {
    setInventoryMode(true);
    setInventoryFinished(false);
    setScannedIds([]);
  };

  const finishInventory = () => {
    setInventoryFinished(true);
  };

  const resetInventory = () => {
    setInventoryMode(false);
    setInventoryFinished(false);
    setScannedIds([]);
  };

  const getItemStatus = (item: StockItem) => {
    if (!inventoryMode) return { label: "На складе", type: "success" as const };
    if (scannedIds.includes(item.id)) return { label: "На складе", type: "success" as const };
    if (inventoryFinished) return { label: "Нет на складе", type: "error" as const };
    return { label: "Не проверен", type: "default" as const };
  };

  const notScannedCount = inventoryMode ? stockItems.length - scannedIds.length : 0;

  const handleUploadUPD = (item: StockItem, file: File) => {
    const url = URL.createObjectURL(file);
    setStockItems((prev) =>
      prev.map((i) =>
        i.id === item.id ? { ...i, uploadedFileUrl: url, uploadedFileName: file.name } : i
      )
    );
    // Update dialog item too
    if (updDialog?.id === item.id) {
      setUpdDialog({ ...item, uploadedFileUrl: url, uploadedFileName: file.name });
    }
    toast.success(`Файл "${file.name}" загружен к ${item.upd}`);
  };

  const downloadUPD = (item: StockItem) => {
    const lines = [
      `УНИВЕРСАЛЬНЫЙ ПЕРЕДАТОЧНЫЙ ДОКУМЕНТ`,
      `═══════════════════════════════════`,
      `Номер: ${item.upd}`,
      `Дата: ${item.date}`,
      `Бренд: ${item.brand}`,
      `Штрих-код коробки: ${item.barcode}`,
      ``,
      `СОДЕРЖИМОЕ КОРОБКИ:`,
      `───────────────────────────────────`,
      `${"Артикул".padEnd(16)} ${"Наименование".padEnd(28)} ${"Кол-во".padStart(8)}`,
      `───────────────────────────────────`,
      ...item.items.map(
        (i) => `${i.article.padEnd(16)} ${i.name.padEnd(28)} ${String(i.qty).padStart(8)}`
      ),
      `───────────────────────────────────`,
      `${"".padEnd(16)} ${"ИТОГО:".padEnd(28)} ${String(item.qty).padStart(8)}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.upd}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toUPDData = (item: StockItem): UPDDocumentData => ({
    number: item.upd,
    date: item.date,
    seller: `${item.brand} (Поставщик)`,
    buyer: 'ООО "Свой Склад"',
    items: item.items.map((i) => ({
      article: i.article,
      name: i.name,
      qty: i.qty,
      price: i.price ?? 0,
      total: i.qty * (i.price ?? 0),
      vatRate: "20%",
      vatAmount: Math.round(i.qty * (i.price ?? 0) * 0.2 * 100) / 100,
      totalWithVat: Math.round(i.qty * (i.price ?? 0) * 1.2 * 100) / 100,
      barcode: i.barcode,
    })),
    totalQty: item.qty,
    uploadedFileUrl: item.uploadedFileUrl,
  });

  const parseXMLToStockItem = (xmlText: string): StockItem | null => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, "text/xml");
      
      const errorNode = doc.querySelector("parsererror");
      if (errorNode) {
        toast.error("Ошибка разбора XML файла");
        return null;
      }

      // Try to extract UPD number from common XML structures
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

      // Parse items from table rows
      const itemNodes = doc.querySelectorAll("СведТов, ТоварнаяСтрока, Item, Товар, ТаблСчФакт > *");
      const items: StockItem["items"] = [];
      
      itemNodes.forEach((node, idx) => {
        const name = node.getAttribute("НаимТов") || node.querySelector("Наименование, Name")?.textContent || `Товар ${idx + 1}`;
        const article = node.getAttribute("Артикул") || node.querySelector("Артикул, Article, КодТов")?.textContent || `ART-${idx + 1}`;
        const qty = parseInt(node.getAttribute("КолТов") || node.querySelector("Количество, Qty, Кол")?.textContent || "1", 10);
        const price = parseFloat(node.getAttribute("ЦенаТов") || node.querySelector("Цена, Price")?.textContent || "0");
        const barcode = node.getAttribute("ШтрихКод") || node.querySelector("ШтрихКод, Barcode")?.textContent || `${Date.now()}-${idx}`;
        
        items.push({ article, name, qty, barcode, price });
      });

      if (items.length === 0) {
        items.push({ article: "N/A", name: "Товар из УПД", qty: 1, barcode: String(Date.now()), price: 0 });
      }

      const totalQty = items.reduce((s, i) => s + i.qty, 0);

      return {
        id: Date.now(),
        upd: updNumber,
        name: items[0]?.name || "Товар",
        article: items[0]?.article || "N/A",
        qty: totalQty,
        brand: sellerName,
        date: dateAttr,
        barcode: items[0]?.barcode || String(Date.now()),
        items,
        uploadedFileUrl: null,
        uploadedFileName: null,
      };
    } catch {
      toast.error("Не удалось разобрать XML файл");
      return null;
    }
  };

  const handleXMLUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const item = parseXMLToStockItem(text);
      if (!item) return;

      // Check for duplicates
      const exists = stockItems.some(
        (s) => s.upd.toLowerCase() === item.upd.toLowerCase()
      );
      if (exists) {
        toast.error(`УПД ${item.upd} уже существует в списке`);
        return;
      }

      setStockItems((prev) => [item, ...prev]);
      toast.success(`УПД ${item.upd} успешно добавлен в Сток`);
      setUploadDialogOpen(false);
    };
    reader.readAsText(file);
  };

  const handleBarcodeUploadSearch = () => {
    if (!uploadBarcode.trim()) return;
    
    // Check if already exists
    const found = stockItems.find(
      (item) =>
        item.barcode === uploadBarcode.trim() ||
        item.upd.toLowerCase() === uploadBarcode.trim().toLowerCase() ||
        item.items.some((i) => i.barcode === uploadBarcode.trim())
    );
    if (found) {
      toast.error(`УПД ${found.upd} уже существует в списке`);
      setUploadTargetItem(null);
      return;
    }

    // Create new item from barcode
    const newItem: StockItem = {
      id: Date.now(),
      upd: `УПД-${uploadBarcode.trim().slice(-5)}`,
      name: "Товар (по штрих-коду)",
      article: "N/A",
      qty: 0,
      brand: "Не указан",
      date: new Date().toLocaleDateString("ru-RU"),
      barcode: uploadBarcode.trim(),
      items: [],
      uploadedFileUrl: null,
      uploadedFileName: null,
    };
    setUploadTargetItem(newItem);
  };

  const handleBarcodeAddToStock = () => {
    if (!uploadTargetItem) return;
    setStockItems((prev) => [uploadTargetItem, ...prev]);
    toast.success(`УПД ${uploadTargetItem.upd} добавлен в Сток`);
    setUploadBarcode("");
    setUploadTargetItem(null);
    setUploadDialogOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Сток / Инвентаризация"
        description="Общий список остатков товара на складе"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setUploadByBarcodeMode(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Загрузить УПД
            </Button>
            {inventoryMode ? (
              <>
                {inventoryFinished ? (
                  <Button variant="outline" size="sm" onClick={resetInventory}>
                    Сбросить
                  </Button>
                ) : (
                  <Button variant="default" size="sm" onClick={finishInventory}>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Завершить инвентаризацию
                  </Button>
                )}
              </>
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
        {/* Filters row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative max-w-xs flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию, артикулу, УПД, ШК..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Бренд" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все бренды</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Inventory scan bar */}
        {inventoryMode && !inventoryFinished && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-primary/30 bg-primary/5">
            <ScanLine className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">Режим инвентаризации</span>
            <Input
              placeholder="Сканируйте штрих-код УПД..."
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBarcodeScan()}
              className="max-w-xs"
              autoFocus
            />
            <Button size="sm" variant="secondary" onClick={handleBarcodeScan}>
              Найти
            </Button>
            <div className="ml-auto flex items-center gap-3 text-sm">
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {scannedIds.length} найдено
              </Badge>
              <Badge variant="destructive" className="gap-1">
                <XCircle className="w-3 h-3" />
                {notScannedCount} не проверено
              </Badge>
            </div>
          </div>
        )}

        {/* Inventory result summary */}
        {inventoryMode && inventoryFinished && (
          <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-card">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <div className="text-sm">
              <span className="font-medium">Инвентаризация завершена. </span>
              <span className="text-success font-medium">{scannedIds.length} на складе</span>
              {notScannedCount > 0 && (
                <span className="text-destructive font-medium ml-2">
                  {notScannedCount} не найдено
                </span>
              )}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-medium">УПД</TableHead>
                <TableHead className="text-xs font-medium">Наименование</TableHead>
                <TableHead className="text-xs font-medium">Артикул</TableHead>
                <TableHead className="text-xs font-medium text-right">Кол-во</TableHead>
                <TableHead className="text-xs font-medium">Бренд</TableHead>
                <TableHead className="text-xs font-medium">Штрих-код</TableHead>
                <TableHead className="text-xs font-medium">Дата</TableHead>
                <TableHead className="text-xs font-medium">Файл</TableHead>
                <TableHead className="text-xs font-medium">Статус</TableHead>
                <TableHead className="text-xs font-medium w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const status = getItemStatus(item);
                const scanned = scannedIds.includes(item.id);
                return (
                  <TableRow
                    key={item.id}
                    className={
                      inventoryMode
                        ? scanned
                          ? "bg-success/5"
                          : inventoryFinished
                            ? "bg-destructive/5"
                            : ""
                        : ""
                    }
                  >
                    <TableCell>
                      <button
                        onClick={() => setUpdDialog(item)}
                        className="flex items-center gap-1.5 font-mono text-sm text-primary hover:underline cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {item.upd}
                      </button>
                    </TableCell>
                    <TableCell className="text-sm">{item.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.article}</TableCell>
                    <TableCell className="text-sm text-right font-medium">{item.qty}</TableCell>
                    <TableCell className="text-sm">{item.brand}</TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">{item.barcode}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.date}</TableCell>
                    <TableCell>
                      {item.uploadedFileUrl ? (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <FileText className="w-3 h-3" />
                          Загружен
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={status.type} label={status.label} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {inventoryMode && !inventoryFinished && !scanned && (
                          <Button variant="ghost" size="sm" onClick={() => handleScan(item.id)} title="Отметить">
                            <ScanLine className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setUpdDialog(item)} title="Просмотр УПД">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    Ничего не найдено
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* UPD Preview Dialog */}
      <Dialog open={!!updDialog} onOpenChange={() => setUpdDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {updDialog?.upd}
            </DialogTitle>
            <DialogDescription>
              Универсальный передаточный документ — {updDialog?.name}
            </DialogDescription>
          </DialogHeader>
          {updDialog && (
            <UPDDocument
              data={toUPDData(updDialog)}
              onDownload={() => downloadUPD(updDialog)}
              onUpload={(file) => handleUploadUPD(updDialog, file)}
              showUpload
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Upload by barcode dialog */}
      <Dialog open={uploadByBarcodeMode} onOpenChange={(open) => {
        setUploadByBarcodeMode(open);
        if (!open) { setUploadBarcode(""); setUploadTargetItem(null); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Загрузить УПД по штрих-коду
            </DialogTitle>
            <DialogDescription>
              Отсканируйте или введите штрих-код товара, чтобы привязать файл УПД
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Штрих-код или номер УПД..."
                  value={uploadBarcode}
                  onChange={(e) => setUploadBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleBarcodeUploadSearch()}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <Button size="sm" onClick={handleBarcodeUploadSearch}>Найти</Button>
            </div>

            {uploadTargetItem && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">{uploadTargetItem.upd}</span>
                  <span className="text-muted-foreground text-sm">— {uploadTargetItem.name}</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Артикул: {uploadTargetItem.article} | Бренд: {uploadTargetItem.brand}</div>
                  <div>Штрих-код: {uploadTargetItem.barcode} | Кол-во: {uploadTargetItem.qty} шт.</div>
                </div>
                {uploadTargetItem.uploadedFileUrl ? (
                  <div className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="w-4 h-4" />
                    Файл уже загружен: {uploadTargetItem.uploadedFileName}
                  </div>
                ) : null}
                <label>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleBarcodeUploadFile(file);
                      e.target.value = "";
                    }}
                  />
                  <Button variant="default" size="sm" asChild className="w-full">
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadTargetItem.uploadedFileUrl ? "Заменить файл" : "Загрузить файл УПД"}
                    </span>
                  </Button>
                </label>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockPage;
