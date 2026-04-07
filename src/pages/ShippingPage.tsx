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
  ScanLine, FileText, Package, Search, CheckCircle2, XCircle, Eye, Truck, Plus, Download,
} from "lucide-react";

interface UPDItem {
  id: number;
  upd: string;
  order: string;
  items: number;
  brand: string;
  barcode: string;
  marketplace: string;
  contents: { article: string; name: string; qty: number }[];
}

interface Shipment {
  id: number;
  number: string;
  upds: UPDItem[];
  totalItems: number;
  date: string;
  destination: string;
  status: "shipped" | "in_transit" | "delivered";
}

const availableUpds: UPDItem[] = [
  {
    id: 1, upd: "УПД-00142", order: "ORD-2041", items: 120, brand: "BasicWear", barcode: "4607012345671", marketplace: "Wildberries",
    contents: [
      { article: "FB-001-S", name: "Футболка белая S", qty: 40 },
      { article: "FB-001-M", name: "Футболка белая M", qty: 50 },
      { article: "FB-001-L", name: "Футболка белая L", qty: 30 },
    ],
  },
  {
    id: 2, upd: "УПД-00143", order: "ORD-2041", items: 80, brand: "DenimPro", barcode: "4607012345672", marketplace: "OZON",
    contents: [
      { article: "JS-045-30", name: "Джинсы slim 30", qty: 30 },
      { article: "JS-045-32", name: "Джинсы slim 32", qty: 30 },
      { article: "JS-045-34", name: "Джинсы slim 34", qty: 20 },
    ],
  },
  {
    id: 3, upd: "УПД-00144", order: "ORD-2042", items: 45, brand: "RunStyle", barcode: "4607012345673", marketplace: "Wildberries",
    contents: [
      { article: "KS-112-41", name: "Кроссовки 41", qty: 15 },
      { article: "KS-112-42", name: "Кроссовки 42", qty: 15 },
      { article: "KS-112-43", name: "Кроссовки 43", qty: 15 },
    ],
  },
  {
    id: 4, upd: "УПД-00145", order: "ORD-2044", items: 200, brand: "BasicWear", barcode: "4607012345674", marketplace: "Яндекс Маркет",
    contents: [
      { article: "HO-023-S", name: "Худи оверсайз S", qty: 60 },
      { article: "HO-023-M", name: "Худи оверсайз M", qty: 80 },
      { article: "HO-023-L", name: "Худи оверсайз L", qty: 60 },
    ],
  },
  {
    id: 5, upd: "УПД-00146", order: "ORD-2042", items: 60, brand: "UrbanBag", barcode: "4607012345675", marketplace: "OZON",
    contents: [
      { article: "RG-008-BK", name: "Рюкзак чёрный", qty: 30 },
      { article: "RG-008-GR", name: "Рюкзак серый", qty: 30 },
    ],
  },
];

const destinations = ["Wildberries", "OZON", "Яндекс Маркет"];

const ShippingPage = () => {
  const [tab, setTab] = useState("available");
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [marketplaceFilter, setMarketplaceFilter] = useState("all");

  // Shipping mode
  const [shippingMode, setShippingMode] = useState(false);
  const [scannedIds, setScannedIds] = useState<number[]>([]);
  const [scanInput, setScanInput] = useState("");
  const [selectedDest, setSelectedDest] = useState(destinations[0]);

  // Completed shipments
  const [shipments, setShipments] = useState<Shipment[]>([
    {
      id: 1, number: "SHP-001",
      upds: [],
      totalItems: 90, date: "28.03.2026", destination: "Wildberries", status: "delivered",
    },
    {
      id: 2, number: "SHP-002",
      upds: [],
      totalItems: 75, date: "25.03.2026", destination: "OZON", status: "shipped",
    },
  ]);

  // Removed UPDs (shipped out)
  const [removedUpdIds, setRemovedUpdIds] = useState<number[]>([]);

  // Dialogs
  const [updDialog, setUpdDialog] = useState<UPDItem | null>(null);
  const [shipmentDialog, setShipmentDialog] = useState<Shipment | null>(null);

  const brands = useMemo(() => [...new Set(availableUpds.map((u) => u.brand))], []);

  const activeUpds = useMemo(
    () => availableUpds.filter((u) => !removedUpdIds.includes(u.id)),
    [removedUpdIds]
  );

  const filteredUpds = useMemo(
    () =>
      activeUpds.filter((u) => {
        const matchSearch =
          u.upd.toLowerCase().includes(search.toLowerCase()) ||
          u.order.toLowerCase().includes(search.toLowerCase()) ||
          u.barcode.includes(search) ||
          u.marketplace.toLowerCase().includes(search.toLowerCase());
        const matchBrand = brandFilter === "all" || u.brand === brandFilter;
        const matchMp = marketplaceFilter === "all" || u.marketplace === marketplaceFilter;
        return matchSearch && matchBrand && matchMp;
      }),
    [activeUpds, search, brandFilter, marketplaceFilter]
  );

  const scannedUpds = useMemo(
    () => activeUpds.filter((u) => scannedIds.includes(u.id)),
    [activeUpds, scannedIds]
  );

  const handleScanUpd = (id: number) => {
    setScannedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const handleBarcodeScan = () => {
    if (!scanInput.trim()) return;
    const found = activeUpds.find(
      (u) => u.barcode === scanInput.trim() || u.upd.toLowerCase() === scanInput.trim().toLowerCase()
    );
    if (found && !scannedIds.includes(found.id)) {
      handleScanUpd(found.id);
    }
    setScanInput("");
  };

  const startShipping = () => {
    setShippingMode(true);
    setScannedIds([]);
    setTab("available");
  };

  const finishShipping = () => {
    if (scannedUpds.length === 0) return;

    const newShipment: Shipment = {
      id: Date.now(),
      number: `SHP-${String(shipments.length + 1).padStart(3, "0")}`,
      upds: scannedUpds,
      totalItems: scannedUpds.reduce((sum, u) => sum + u.items, 0),
      date: new Date().toLocaleDateString("ru-RU"),
      destination: selectedDest,
      status: "shipped",
    };

    setShipments((prev) => [newShipment, ...prev]);
    setRemovedUpdIds((prev) => [...prev, ...scannedIds]);
    setScannedIds([]);
    setShippingMode(false);
    setTab("shipments");
  };

  const cancelShipping = () => {
    setShippingMode(false);
    setScannedIds([]);
  };

  const downloadShipmentReport = (shipment: Shipment) => {
    const lines = [
      `ОТГРУЗКА ${shipment.number}`,
      `═══════════════════════════════════════`,
      `Дата: ${shipment.date}`,
      `Направление: ${shipment.destination}`,
      `Всего товаров: ${shipment.totalItems}`,
      `Кол-во УПД: ${shipment.upds.length}`,
      ``,
      `СОСТАВ ОТГРУЗКИ:`,
      `───────────────────────────────────────`,
    ];
    shipment.upds.forEach((u) => {
      lines.push(`${u.upd} | Заказ: ${u.order} | ${u.items} шт. | ${u.brand}`);
      u.contents.forEach((c) => {
        lines.push(`  ${c.article} — ${c.name} — ${c.qty} шт.`);
      });
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${shipment.number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusMap = {
    shipped: { label: "Отгружено", type: "primary" as const },
    in_transit: { label: "В пути", type: "warning" as const },
    delivered: { label: "Доставлено", type: "success" as const },
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Отгрузка товара"
        description="Формирование паллет и отправка на маркетплейсы"
        actions={
          <div className="flex items-center gap-2">
            {shippingMode ? (
              <>
                <Button variant="outline" size="sm" onClick={cancelShipping}>Отмена</Button>
                <Button size="sm" onClick={finishShipping} disabled={scannedUpds.length === 0}>
                  <Truck className="w-4 h-4 mr-1" />
                  Завершить отгрузку ({scannedUpds.length})
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={startShipping}>
                <Plus className="w-4 h-4 mr-2" />
                Начать отгрузку
              </Button>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-4 flex-1 overflow-auto">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="available">
              Доступные УПД
              <Badge variant="secondary" className="ml-2 text-xs">{activeUpds.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="shipments">
              Завершённые отгрузки
              <Badge variant="secondary" className="ml-2 text-xs">{shipments.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative max-w-xs flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по УПД, заказу, ШК..."
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

            {/* Scan bar in shipping mode */}
            {shippingMode && (
              <div className="flex items-center gap-3 p-4 rounded-lg border border-primary/30 bg-primary/5">
                <Package className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">Формирование паллеты</span>
                <Select value={selectedDest} onValueChange={setSelectedDest}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {destinations.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            {shippingMode && scannedUpds.length > 0 && (
              <div className="p-3 rounded-lg border border-success/30 bg-success/5">
                <div className="text-sm font-medium mb-2">
                  В паллету добавлено: {scannedUpds.length} УПД, {scannedUpds.reduce((s, u) => s + u.items, 0)} товаров → {selectedDest}
                </div>
                <div className="flex flex-wrap gap-2">
                  {scannedUpds.map((u) => (
                    <Badge key={u.id} variant="secondary" className="gap-1">
                      <FileText className="w-3 h-3" />
                      {u.upd} ({u.items} шт.)
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
                    <TableHead className="text-xs font-medium">Бренд</TableHead>
                    <TableHead className="text-xs font-medium">Штрих-код</TableHead>
                    <TableHead className="text-xs font-medium text-right">Товаров</TableHead>
                    <TableHead className="text-xs font-medium">Статус</TableHead>
                    <TableHead className="text-xs font-medium w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUpds.map((u) => {
                    const scanned = scannedIds.includes(u.id);
                    return (
                      <TableRow key={u.id} className={scanned ? "bg-success/5" : ""}>
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
                        <TableCell className="text-sm">{u.brand}</TableCell>
                        <TableCell className="text-sm font-mono text-muted-foreground">{u.barcode}</TableCell>
                        <TableCell className="text-sm text-right font-medium">{u.items}</TableCell>
                        <TableCell>
                          {scanned ? (
                            <StatusBadge status="success" label="В паллете" />
                          ) : (
                            <StatusBadge status="default" label="На складе" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {shippingMode && !scanned && (
                              <Button variant="ghost" size="sm" onClick={() => handleScanUpd(u.id)} title="Сканировать">
                                <ScanLine className="w-4 h-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => setUpdDialog(u)} title="Просмотр">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredUpds.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {activeUpds.length === 0 ? "Все УПД отгружены" : "Ничего не найдено"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="shipments" className="space-y-4 mt-4">
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-medium">Номер</TableHead>
                    <TableHead className="text-xs font-medium">Направление</TableHead>
                    <TableHead className="text-xs font-medium">УПД</TableHead>
                    <TableHead className="text-xs font-medium text-right">Всего товаров</TableHead>
                    <TableHead className="text-xs font-medium">Дата</TableHead>
                    <TableHead className="text-xs font-medium">Статус</TableHead>
                    <TableHead className="text-xs font-medium w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((s) => {
                    const st = statusMap[s.status];
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-sm font-medium">{s.number}</TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                            {s.destination}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {s.upds.length > 0
                            ? s.upds.map((u) => u.upd).join(", ")
                            : `${s.number === "SHP-001" ? "УПД-00140, УПД-00141" : "УПД-00138, УПД-00139"}`}
                        </TableCell>
                        <TableCell className="text-sm text-right font-medium">{s.totalItems}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.date}</TableCell>
                        <TableCell>
                          <StatusBadge status={st.type} label={st.label} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {s.upds.length > 0 && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => setShipmentDialog(s)} title="Подробнее">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => downloadShipmentReport(s)} title="Скачать">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
            <DialogDescription>Содержимое коробки — Заказ {updDialog?.order}</DialogDescription>
          </DialogHeader>
          {updDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Бренд</div>
                <div className="font-medium">{updDialog.brand}</div>
                <div className="text-muted-foreground">Заказ</div>
                <div className="font-medium">{updDialog.order}</div>
                <div className="text-muted-foreground">Штрих-код</div>
                <div className="font-mono font-medium">{updDialog.barcode}</div>
                <div className="text-muted-foreground">Всего товаров</div>
                <div className="font-medium">{updDialog.items} шт.</div>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Артикул</TableHead>
                      <TableHead className="text-xs">Наименование</TableHead>
                      <TableHead className="text-xs text-right">Кол-во</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {updDialog.contents.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm font-mono">{c.article}</TableCell>
                        <TableCell className="text-sm">{c.name}</TableCell>
                        <TableCell className="text-sm text-right">{c.qty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Shipment Detail Dialog */}
      <Dialog open={!!shipmentDialog} onOpenChange={() => setShipmentDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              {shipmentDialog?.number}
            </DialogTitle>
            <DialogDescription>
              {shipmentDialog?.destination} — {shipmentDialog?.date}
            </DialogDescription>
          </DialogHeader>
          {shipmentDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="text-muted-foreground text-xs">УПД</div>
                  <div className="text-lg font-bold">{shipmentDialog.upds.length}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="text-muted-foreground text-xs">Товаров</div>
                  <div className="text-lg font-bold">{shipmentDialog.totalItems}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="text-muted-foreground text-xs">Статус</div>
                  <div className="mt-1">
                    <StatusBadge
                      status={statusMap[shipmentDialog.status].type}
                      label={statusMap[shipmentDialog.status].label}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">УПД</TableHead>
                      <TableHead className="text-xs">Заказ</TableHead>
                      <TableHead className="text-xs">Бренд</TableHead>
                      <TableHead className="text-xs text-right">Товаров</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipmentDialog.upds.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-sm font-mono">{u.upd}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.order}</TableCell>
                        <TableCell className="text-sm">{u.brand}</TableCell>
                        <TableCell className="text-sm text-right font-medium">{u.items}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => downloadShipmentReport(shipmentDialog)}>
                  <Download className="w-4 h-4 mr-2" />
                  Скачать отчёт
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShippingPage;
