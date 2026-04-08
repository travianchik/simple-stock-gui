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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ScanLine, FileText, Search, CheckCircle2, Eye, RotateCcw, Package, Download, AlertTriangle,
} from "lucide-react";

interface ReturnItem {
  article: string;
  name: string;
  qty: number;
  barcode: string;
}

interface ReturnUPD {
  id: number;
  upd: string;
  order: string;
  brand: string;
  marketplace: string;
  barcode: string;
  items: ReturnItem[];
  totalQty: number;
  returnDate: string;
  reason: string;
}

interface CompletedReturn {
  id: number;
  number: string;
  upds: ReturnUPD[];
  totalItems: number;
  date: string;
  status: "return" | "partial_return";
}

const returnReasons = ["Брак", "Пересорт", "Возврат покупателя", "Повреждение при доставке", "Истёк срок"];

// Mock UPDs that have been returned to the warehouse
const returnedUpds: ReturnUPD[] = [
  {
    id: 1, upd: "УПД-00130", order: "ORD-2035", brand: "BasicWear", marketplace: "Wildberries",
    barcode: "4607012345681", totalQty: 40, returnDate: "05.04.2026", reason: "Брак",
    items: [
      { article: "FB-001-S", name: "Футболка белая S", qty: 20, barcode: "4607012345681-01" },
      { article: "FB-001-M", name: "Футболка белая M", qty: 20, barcode: "4607012345681-02" },
    ],
  },
  {
    id: 2, upd: "УПД-00131", order: "ORD-2036", brand: "DenimPro", marketplace: "OZON",
    barcode: "4607012345682", totalQty: 30, returnDate: "04.04.2026", reason: "Пересорт",
    items: [
      { article: "JS-045-30", name: "Джинсы slim 30", qty: 15, barcode: "4607012345682-01" },
      { article: "JS-045-32", name: "Джинсы slim 32", qty: 15, barcode: "4607012345682-02" },
    ],
  },
  {
    id: 3, upd: "УПД-00132", order: "ORD-2037", brand: "RunStyle", marketplace: "Wildberries",
    barcode: "4607012345683", totalQty: 15, returnDate: "03.04.2026", reason: "Возврат покупателя",
    items: [
      { article: "KS-112-42", name: "Кроссовки 42", qty: 10, barcode: "4607012345683-01" },
      { article: "KS-112-43", name: "Кроссовки 43", qty: 5, barcode: "4607012345683-02" },
    ],
  },
  {
    id: 4, upd: "УПД-00133", order: "ORD-2038", brand: "BasicWear", marketplace: "Яндекс Маркет",
    barcode: "4607012345684", totalQty: 60, returnDate: "02.04.2026", reason: "Повреждение при доставке",
    items: [
      { article: "HO-023-S", name: "Худи оверсайз S", qty: 30, barcode: "4607012345684-01" },
      { article: "HO-023-M", name: "Худи оверсайз M", qty: 30, barcode: "4607012345684-02" },
    ],
  },
  {
    id: 5, upd: "УПД-00134", order: "ORD-2035", brand: "UrbanBag", marketplace: "OZON",
    barcode: "4607012345685", totalQty: 20, returnDate: "01.04.2026", reason: "Брак",
    items: [
      { article: "RG-008-BK", name: "Рюкзак чёрный", qty: 20, barcode: "4607012345685-01" },
    ],
  },
];

const ReturnsPage = () => {
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [marketplaceFilter, setMarketplaceFilter] = useState("all");
  const [reasonFilter, setReasonFilter] = useState("all");

  // Return mode
  const [returnMode, setReturnMode] = useState(false);
  const [scannedIds, setScannedIds] = useState<number[]>([]);
  const [scanInput, setScanInput] = useState("");

  // Processed returns (removed from pending)
  const [processedIds, setProcessedIds] = useState<number[]>([]);
  const [completedReturns, setCompletedReturns] = useState<CompletedReturn[]>([
    {
      id: 0, number: "RET-001",
      upds: [], totalItems: 25, date: "28.03.2026",
      status: "return",
    },
  ]);

  // Dialogs
  const [updDialog, setUpdDialog] = useState<ReturnUPD | null>(null);
  const [returnDialog, setReturnDialog] = useState<CompletedReturn | null>(null);

  const brands = useMemo(() => [...new Set(returnedUpds.map((u) => u.brand))], []);
  const marketplaces = useMemo(() => [...new Set(returnedUpds.map((u) => u.marketplace))], []);

  const pendingUpds = useMemo(
    () => returnedUpds.filter((u) => !processedIds.includes(u.id)),
    [processedIds]
  );

  const filteredUpds = useMemo(
    () =>
      pendingUpds.filter((u) => {
        const s = search.toLowerCase();
        const matchSearch =
          u.upd.toLowerCase().includes(s) ||
          u.order.toLowerCase().includes(s) ||
          u.barcode.includes(search) ||
          u.marketplace.toLowerCase().includes(s) ||
          u.brand.toLowerCase().includes(s);
        const matchBrand = brandFilter === "all" || u.brand === brandFilter;
        const matchMp = marketplaceFilter === "all" || u.marketplace === marketplaceFilter;
        const matchReason = reasonFilter === "all" || u.reason === reasonFilter;
        return matchSearch && matchBrand && matchMp && matchReason;
      }),
    [pendingUpds, search, brandFilter, marketplaceFilter, reasonFilter]
  );

  const scannedUpds = useMemo(
    () => pendingUpds.filter((u) => scannedIds.includes(u.id)),
    [pendingUpds, scannedIds]
  );

  const handleScanUpd = (id: number) => {
    setScannedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleBarcodeScan = () => {
    if (!scanInput.trim()) return;
    const found = pendingUpds.find(
      (u) =>
        u.barcode === scanInput.trim() || u.upd.toLowerCase() === scanInput.trim().toLowerCase()
    );
    if (found && !scannedIds.includes(found.id)) {
      setScannedIds((prev) => [...prev, found.id]);
    }
    setScanInput("");
  };

  const startReturn = () => {
    setReturnMode(true);
    setScannedIds([]);
    setTab("pending");
  };

  const finishReturn = () => {
    if (scannedUpds.length === 0) return;

    // Determine if it's a full or partial return for the affected orders
    const affectedOrders = [...new Set(scannedUpds.map((u) => u.order))];
    const allUpdsForOrders = pendingUpds.filter((u) => affectedOrders.includes(u.order));
    const allScanned = allUpdsForOrders.every((u) => scannedIds.includes(u.id));

    const newReturn: CompletedReturn = {
      id: Date.now(),
      number: `RET-${String(completedReturns.length + 1).padStart(3, "0")}`,
      upds: scannedUpds,
      totalItems: scannedUpds.reduce((sum, u) => sum + u.totalQty, 0),
      date: new Date().toLocaleDateString("ru-RU"),
      status: allScanned ? "return" : "partial_return",
    };

    setCompletedReturns((prev) => [newReturn, ...prev]);
    setProcessedIds((prev) => [...prev, ...scannedIds]);
    setScannedIds([]);
    setReturnMode(false);
    setTab("completed");
  };

  const cancelReturn = () => {
    setReturnMode(false);
    setScannedIds([]);
  };

  const downloadReturnReport = (ret: CompletedReturn) => {
    const lines = [
      `ВОЗВРАТ ${ret.number}`,
      `═══════════════════════════════════════`,
      `Дата: ${ret.date}`,
      `Статус: ${ret.status === "return" ? "Полный возврат" : "Частичный возврат"}`,
      `Всего товаров: ${ret.totalItems}`,
      `Кол-во УПД: ${ret.upds.length}`,
      ``,
      `СОСТАВ ВОЗВРАТА:`,
      `───────────────────────────────────────`,
    ];
    ret.upds.forEach((u) => {
      lines.push(`${u.upd} | Заказ: ${u.order} | ${u.totalQty} шт. | ${u.brand} | ${u.reason}`);
      u.items.forEach((c) => {
        lines.push(`  ${c.article} — ${c.name} — ${c.qty} шт.`);
      });
      lines.push("");
    });
    lines.push(`Данные переданы в раздел «Приёмка товара» со статусом «${ret.status === "return" ? "Возврат" : "Частичный возврат"}».`);
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ret.number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusMap = {
    return: { label: "Возврат", type: "error" as const },
    partial_return: { label: "Частичный возврат", type: "warning" as const },
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Возврат товара"
        description="Обработка возвращённого товара и передача в приёмку"
        actions={
          <div className="flex items-center gap-2">
            {returnMode ? (
              <>
                <Button variant="outline" size="sm" onClick={cancelReturn}>Отмена</Button>
                <Button size="sm" onClick={finishReturn} disabled={scannedUpds.length === 0}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Завершить возврат ({scannedUpds.length})
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={startReturn}>
                <ScanLine className="w-4 h-4 mr-2" />
                Запустить возврат
              </Button>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-4 flex-1 overflow-auto">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pending">
              Ожидают обработки
              <Badge variant="secondary" className="ml-2 text-xs">{pendingUpds.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="completed">
              Завершённые возвраты
              <Badge variant="secondary" className="ml-2 text-xs">{completedReturns.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative max-w-xs flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по УПД, заказу, ШК, маркетплейсу..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={marketplaceFilter} onValueChange={setMarketplaceFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Маркетплейс" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все маркетплейсы</SelectItem>
                  {marketplaces.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select value={reasonFilter} onValueChange={setReasonFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Причина" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все причины</SelectItem>
                  {returnReasons.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Scan bar in return mode */}
            {returnMode && (
              <div className="flex items-center gap-3 p-4 rounded-lg border border-primary/30 bg-primary/5">
                <ScanLine className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Сканирование возвратных УПД</span>
                <Input
                  placeholder="Сканируйте штрих-код УПД..."
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleBarcodeScan()}
                  className="max-w-xs"
                  autoFocus
                />
                <Button size="sm" variant="secondary" onClick={handleBarcodeScan}>Найти</Button>
                <div className="ml-auto">
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {scannedUpds.length} отсканировано
                  </Badge>
                </div>
              </div>
            )}

            {/* Scanned summary */}
            {returnMode && scannedUpds.length > 0 && (
              <div className="p-3 rounded-lg border border-warning/30 bg-warning/5">
                <div className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  К возврату: {scannedUpds.length} УПД, {scannedUpds.reduce((s, u) => s + u.totalQty, 0)} товаров
                </div>
                <div className="flex flex-wrap gap-2">
                  {scannedUpds.map((u) => (
                    <Badge key={u.id} variant="secondary" className="gap-1">
                      <FileText className="w-3 h-3" />
                      {u.upd} ({u.totalQty} шт.) — {u.reason}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* UPD Table */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-medium">УПД</TableHead>
                    <TableHead className="text-xs font-medium">Заказ</TableHead>
                    <TableHead className="text-xs font-medium">Маркетплейс</TableHead>
                    <TableHead className="text-xs font-medium">Бренд</TableHead>
                    <TableHead className="text-xs font-medium">Причина</TableHead>
                    <TableHead className="text-xs font-medium text-right">Кол-во</TableHead>
                    <TableHead className="text-xs font-medium">Дата возврата</TableHead>
                    <TableHead className="text-xs font-medium">Статус</TableHead>
                    {returnMode && <TableHead className="text-xs font-medium w-24"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUpds.map((u) => {
                    const scanned = scannedIds.includes(u.id);
                    return (
                      <TableRow key={u.id} className={scanned ? "bg-warning/5" : ""}>
                        <TableCell>
                          <button
                            onClick={() => setUpdDialog(u)}
                            className="flex items-center gap-1.5 font-mono text-sm text-primary hover:underline cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            {u.upd}
                          </button>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.order}</TableCell>
                        <TableCell className="text-sm">{u.marketplace}</TableCell>
                        <TableCell className="text-sm">{u.brand}</TableCell>
                        <TableCell className="text-sm">{u.reason}</TableCell>
                        <TableCell className="text-sm text-right font-medium">{u.totalQty}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.returnDate}</TableCell>
                        <TableCell>
                          {scanned ? (
                            <StatusBadge status="warning" label="Отсканирован" />
                          ) : (
                            <StatusBadge status="default" label="Ожидает" />
                          )}
                        </TableCell>
                        {returnMode && (
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {!scanned && (
                                <Button variant="ghost" size="sm" onClick={() => handleScanUpd(u.id)} title="Сканировать">
                                  <ScanLine className="w-4 h-4" />
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => setUpdDialog(u)} title="Просмотр">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {filteredUpds.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={returnMode ? 9 : 8} className="text-center text-muted-foreground py-8">
                        {pendingUpds.length === 0 ? "Все возвраты обработаны" : "Ничего не найдено"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-4">
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-medium">Номер</TableHead>
                    <TableHead className="text-xs font-medium">Дата</TableHead>
                    <TableHead className="text-xs font-medium text-right">УПД</TableHead>
                    <TableHead className="text-xs font-medium text-right">Товаров</TableHead>
                    <TableHead className="text-xs font-medium">Статус</TableHead>
                    <TableHead className="text-xs font-medium">Передано в Приёмку</TableHead>
                    <TableHead className="text-xs font-medium w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedReturns.map((ret) => (
                    <TableRow key={ret.id}>
                      <TableCell className="font-mono text-sm font-medium">{ret.number}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ret.date}</TableCell>
                      <TableCell className="text-sm text-right">{ret.upds.length}</TableCell>
                      <TableCell className="text-sm text-right font-medium">{ret.totalItems}</TableCell>
                      <TableCell>
                        <StatusBadge
                          status={statusMap[ret.status].type}
                          label={statusMap[ret.status].label}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1 text-xs">
                          <CheckCircle2 className="w-3 h-3" />
                          Да
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {ret.upds.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => setReturnDialog(ret)} title="Детали">
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {ret.upds.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => downloadReturnReport(ret)} title="Скачать отчёт">
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {completedReturns.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Нет завершённых возвратов
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* UPD Preview Dialog */}
      <Dialog open={!!updDialog} onOpenChange={() => setUpdDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {updDialog?.upd}
            </DialogTitle>
            <DialogDescription>
              Содержимое возвратной коробки
            </DialogDescription>
          </DialogHeader>
          {updDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Заказ</div>
                <div className="font-medium">{updDialog.order}</div>
                <div className="text-muted-foreground">Маркетплейс</div>
                <div className="font-medium">{updDialog.marketplace}</div>
                <div className="text-muted-foreground">Бренд</div>
                <div className="font-medium">{updDialog.brand}</div>
                <div className="text-muted-foreground">Причина возврата</div>
                <div className="font-medium text-destructive">{updDialog.reason}</div>
                <div className="text-muted-foreground">Дата возврата</div>
                <div className="font-medium">{updDialog.returnDate}</div>
                <div className="text-muted-foreground">Штрих-код</div>
                <div className="font-mono font-medium">{updDialog.barcode}</div>
                <div className="text-muted-foreground">Общее кол-во</div>
                <div className="font-medium">{updDialog.totalQty} шт.</div>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Артикул</TableHead>
                      <TableHead className="text-xs">Наименование</TableHead>
                      <TableHead className="text-xs text-right">Кол-во</TableHead>
                      <TableHead className="text-xs">ШК</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {updDialog.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm font-mono">{item.article}</TableCell>
                        <TableCell className="text-sm">{item.name}</TableCell>
                        <TableCell className="text-sm text-right">{item.qty}</TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">{item.barcode}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Completed Return Detail Dialog */}
      <Dialog open={!!returnDialog} onOpenChange={() => setReturnDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              {returnDialog?.number}
            </DialogTitle>
            <DialogDescription>
              Детали завершённого возврата
            </DialogDescription>
          </DialogHeader>
          {returnDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Дата</div>
                  <div className="font-medium">{returnDialog.date}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Всего товаров</div>
                  <div className="font-medium">{returnDialog.totalItems}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Статус</div>
                  <StatusBadge
                    status={statusMap[returnDialog.status].type}
                    label={statusMap[returnDialog.status].label}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/30 border border-border text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Статус «{returnDialog.status === "return" ? "Возврат" : "Частичный возврат"}» передан в раздел «Приёмка товара» для повторной обработки.
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">УПД</TableHead>
                      <TableHead className="text-xs">Заказ</TableHead>
                      <TableHead className="text-xs">Маркетплейс</TableHead>
                      <TableHead className="text-xs">Причина</TableHead>
                      <TableHead className="text-xs text-right">Товаров</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnDialog.upds.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono text-sm">{u.upd}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.order}</TableCell>
                        <TableCell className="text-sm">{u.marketplace}</TableCell>
                        <TableCell className="text-sm">{u.reason}</TableCell>
                        <TableCell className="text-sm text-right font-medium">{u.totalQty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReturnsPage;
