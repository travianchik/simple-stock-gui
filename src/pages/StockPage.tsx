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
import { useStock, StockBox, SKUItem } from "@/contexts/StockContext";

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
  const { boxes, setBoxes } = useStock();
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
                  <TableHead className="text-xs font-medium">Ячейка</TableHead>
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
                          <TableCell className="text-sm font-mono">{box.cell || "—"}</TableCell>
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
                            <td colSpan={inventoryMode && !inventoryFinished ? 12 : 11} className="p-0">
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
