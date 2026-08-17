import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { RefreshCw, Download, PackagePlus, ScanLine, Printer, QrCode, Truck, FileText, Warehouse } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOrbita, wbWarehouses, type FbsOrder, type Supply, type UplBox } from "@/contexts/OrbitaContext";

const toDate = (ru: string) => {
  const [d, t] = ru.split(" ");
  const [dd, mm, yy] = (d ?? "").split(".");
  return new Date(`${yy}-${mm}-${dd}T${t ?? "00:00"}`);
};

const FbsShippingPage = () => {
  const {
    fbsOrders,
    supplies,
    syncFbsNew,
    createSupply,
    addTrbx,
    attachKiz,
    printSticker,
    printSupplyQr,
    deliverSupply,
    refreshSaleStatuses,
    markUpdGenerated,
    ordersOfSupply,
    boxes,
    findBoxByBarcode,
  } = useOrbita();
  const { toast } = useToast();

  /* --- Новое --- */
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [selected, setSelected] = useState<number[]>([]);
  const [supplyWarehouse, setSupplyWarehouse] = useState<string>(wbWarehouses[0].name);
  const [createOpen, setCreateOpen] = useState(false);

  /* --- В сборке --- */
  const [openSupply, setOpenSupply] = useState<Supply | null>(null);
  const [kizValue, setKizValue] = useState("");
  const [emulating, setEmulating] = useState(false);
  const [uplValue, setUplValue] = useState("");
  const [uplBox, setUplBox] = useState<UplBox | null>(null);

  /* --- Завершённые --- */
  const [doneSelected, setDoneSelected] = useState<number[]>([]);
  const [doneStatusFilter, setDoneStatusFilter] = useState<"all" | "bought" | "canceled">("all");

  const newOrders = useMemo(() => {
    return fbsOrders
      .filter((o) => o.status === "new")
      .filter((o) => (warehouseFilter === "all" ? true : o.warehouse === warehouseFilter))
      .filter((o) => {
        const d = toDate(o.createdAt);
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo && d > new Date(`${dateTo}T23:59`)) return false;
        return true;
      });
  }, [fbsOrders, warehouseFilter, dateFrom, dateTo]);

  const assemblingSupplies = supplies.filter((s) => s.status === "assembling");
  const deliveringSupplies = supplies.filter((s) => s.status === "delivering");
  const doneOrders = fbsOrders
    .filter((o) => o.status === "delivering" || o.status === "done")
    .filter((o) => {
      if (doneStatusFilter === "all") return true;
      if (doneStatusFilter === "canceled") return o.saleStatus === "canceled";
      return o.saleStatus !== "canceled";
    });

  const liveSupply = openSupply ? supplies.find((s) => s.id === openSupply.id) ?? null : null;
  const supplyOrders = liveSupply ? ordersOfSupply(liveSupply.id).filter((o) => o.status === "assembling") : [];

  const exportNew = () => {
    const rows = newOrders.map((o) => ({
      "Сборочное задание": o.orderNo,
      Дата: o.createdAt,
      Артикул: o.article,
      Размер: o.size,
      Наименование: o.name,
      Баркод: o.shk,
      "Артикул WB": o.wbArticle,
      Цена: o.price,
      Склад: o.warehouse,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Новые заказы");
    XLSX.writeFile(wb, "FBS_новые.xlsx");
  };

  const handleCreateSupply = () => {
    const chosen = fbsOrders.filter((o) => selected.includes(o.id));
    const warehouses = new Set(chosen.map((o) => o.warehouse));
    if (warehouses.size > 1) {
      toast({
        title: "Недопустимо несколько складов",
        description: "Поставку можно создать только по одному складу.",
        variant: "destructive",
      });
      return;
    }
    const wh = chosen[0]?.warehouse ?? supplyWarehouse;
    const supply = createSupply(selected, wh);
    setSelected([]);
    setCreateOpen(false);
    if (supply) toast({ title: `Поставка создана: ${supply.supplyNo}`, description: `Склад: ${wh}` });
  };

  const handleKiz = () => {
    if (!liveSupply) return;
    const res = attachKiz(liveSupply.id, kizValue);
    toast({ title: res.ok ? "КИЗ добавлен в поставку" : "Не найдено", description: res.message, variant: res.ok ? undefined : "destructive" });
    if (res.ok) setKizValue("");
  };

  /* --- Эмуляция сканера КИЗ --- */
  const rnd = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");
  const genKiz = (o: FbsOrder) => `01046${o.shk}21${rnd(6)}\u001d93${rnd(4)}`;

  const emulateScan = async (order?: FbsOrder) => {
    if (!liveSupply || emulating) return;
    const target = order ?? supplyOrders.find((o) => !o.kiz);
    if (!target) {
      toast({ title: "Все КИЗы уже привязаны", description: "Нет заданий без КИЗа." });
      return;
    }
    const code = genKiz(target);
    setEmulating(true);
    // печатаем код «по символам», как это делает сканер
    for (let i = 1; i <= code.length; i += 4) {
      setKizValue(code.slice(0, i));
      await new Promise((r) => setTimeout(r, 12));
    }
    setKizValue(code);
    await new Promise((r) => setTimeout(r, 150));
    const res = attachKiz(liveSupply.id, code);
    toast({
      title: res.ok ? "КИЗ отсканирован (эмуляция)" : "Не найдено",
      description: res.message,
      variant: res.ok ? undefined : "destructive",
    });
    if (res.ok) setKizValue("");
    setEmulating(false);
  };

  const emulateScanAll = async () => {
    if (!liveSupply || emulating) return;
    const pending = supplyOrders.filter((o) => !o.kiz);
    if (!pending.length) {
      toast({ title: "Все КИЗы уже привязаны" });
      return;
    }
    for (const o of pending) {
      await emulateScan(o);
      await new Promise((r) => setTimeout(r, 120));
    }
    toast({ title: "Эмуляция завершена", description: `Отсканировано КИЗов: ${pending.length}` });
  };

  const generateUpd = () => {
    const rows = fbsOrders.filter((o) => doneSelected.includes(o.id));
    if (!rows.length) return;
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<УПД Дата="${new Date().toLocaleDateString("ru-RU")}">\n${rows
      .map(
        (o) =>
          `  <Товар Артикул="${o.article}" Размер="${o.size}" ШК="${o.shk}" АртикулWB="${o.wbArticle}" Цена="${o.price}" Задание="${o.orderNo}" КИЗ="${o.kiz ?? ""}" />`
      )
      .join("\n")}\n</УПД>`;
    const blob = new Blob([xml], { type: "application/xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `УПД_${Date.now()}.xml`;
    a.click();
    URL.revokeObjectURL(a.href);
    markUpdGenerated(doneSelected);
    setDoneSelected([]);
    toast({ title: "УПД сформирован", description: "xml-файл скачан, товар отмечен ярлыком «УПД»." });
  };

  /* короба и ячейки хранения по товару (данные из Стока) */
  const cellsOfShk = (shk: string) => boxes.filter((b) => b.items.some((i) => i.shk === shk));

  const handleUplScan = (raw?: string) => {
    const code = (raw ?? uplValue).trim();
    if (!code) return;
    const box = findBoxByBarcode(code);
    setUplBox(box ?? null);
    if (!box) {
      toast({ title: "УПЛ не найден", description: code, variant: "destructive" });
      return;
    }
    toast({ title: `УПЛ ${box.uplNumber}`, description: `Ячейка хранения ${box.cell || "не назначена"}` });
  };

  const emulateUplScan = () => {
    const shks = supplyOrders.map((o) => o.shk);
    const box = boxes.find((b) => b.items.some((i) => shks.includes(i.shk))) ?? boxes[0];
    if (!box) {
      toast({ title: "Коробов нет", description: "В Стоке нет коробов с УПЛ.", variant: "destructive" });
      return;
    }
    setUplValue(box.uplBarcode);
    handleUplScan(box.uplBarcode);
  };

  const toggle = (arr: number[], set: (v: number[]) => void, id: number) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Работа с FBS WB"
        description="Новое → В сборке → В доставке → Завершённые. Обмен с WB по API."
        actions={
          <Button size="sm" onClick={() => { const n = syncFbsNew(); toast({ title: "Список обновлён по API WB", description: `Новых сборочных заданий: ${n}` }); }}>
            <RefreshCw className="w-4 h-4 mr-2" /> Получить новые задания
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="new">
          <TabsList>
            <TabsTrigger value="new">Новое ({fbsOrders.filter((o) => o.status === "new").length})</TabsTrigger>
            <TabsTrigger value="assembling">В сборке ({assemblingSupplies.length})</TabsTrigger>
            <TabsTrigger value="delivering">В доставке ({deliveringSupplies.length})</TabsTrigger>
            <TabsTrigger value="done">Завершённые ({doneOrders.length})</TabsTrigger>
            <TabsTrigger value="warehouses">Склады WB</TabsTrigger>
          </TabsList>

          {/* ================= НОВОЕ ================= */}
          <TabsContent value="new" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Дата с</Label>
                <Input type="date" className="h-9 w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Дата по</Label>
                <Input type="date" className="h-9 w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Склад</Label>
                <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                  <SelectTrigger className="h-9 w-72"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все склады</SelectItem>
                    {wbWarehouses.map((w) => (
                      <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" variant="outline" onClick={exportNew}>
                <Download className="w-4 h-4 mr-2" /> Выгрузить
              </Button>
              <Button
                size="sm"
                disabled={!selected.length}
                onClick={() => {
                  const chosen = fbsOrders.filter((o) => selected.includes(o.id));
                  setSupplyWarehouse(chosen[0]?.warehouse ?? wbWarehouses[0].name);
                  setCreateOpen(true);
                }}
              >
                <PackagePlus className="w-4 h-4 mr-2" /> Создать поставку ({selected.length})
              </Button>
            </div>

            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5">
                      <Checkbox
                        checked={!!newOrders.length && selected.length === newOrders.length}
                        onCheckedChange={(c) => setSelected(c ? newOrders.map((o) => o.id) : [])}
                      />
                    </th>
                    <th className="text-left px-3 py-2.5">Задание</th>
                    <th className="text-left px-3 py-2.5">Поступил</th>
                    <th className="text-left px-3 py-2.5">Товар</th>
                    <th className="text-left px-3 py-2.5">Артикул / размер</th>
                    <th className="text-left px-3 py-2.5">Баркод</th>
                    <th className="text-right px-3 py-2.5">Цена</th>
                    <th className="text-left px-3 py-2.5">Склад</th>
                  </tr>
                </thead>
                <tbody>
                  {newOrders.map((o) => (
                    <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2 text-center">
                        <Checkbox checked={selected.includes(o.id)} onCheckedChange={() => toggle(selected, setSelected, o.id)} />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{o.orderNo}</td>
                      <td className="px-3 py-2 text-xs">{o.createdAt}</td>
                      <td className="px-3 py-2 max-w-[280px] truncate" title={o.name}>{o.name}</td>
                      <td className="px-3 py-2 text-xs">{o.article} · {o.size}</td>
                      <td className="px-3 py-2 font-mono text-xs">{o.shk}</td>
                      <td className="px-3 py-2 text-right">{o.price} ₽</td>
                      <td className="px-3 py-2 text-xs">{o.warehouse}</td>
                    </tr>
                  ))}
                  {!newOrders.length && (
                    <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">Новых сборочных заданий нет</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Товар из раздела «Новое» отображается в Стоке в столбце «В резерве».
            </p>
          </TabsContent>

          {/* ================= В СБОРКЕ ================= */}
          <TabsContent value="assembling" className="mt-4 space-y-4">
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2.5">Поставка</th>
                    <th className="text-left px-3 py-2.5">QR-код</th>
                    <th className="text-left px-3 py-2.5">Создана</th>
                    <th className="text-right px-3 py-2.5">Заданий</th>
                    <th className="text-right px-3 py-2.5">Грузомест</th>
                    <th className="text-left px-3 py-2.5">Склад</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {assemblingSupplies.map((s) => (
                    <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{s.supplyNo}</td>
                      <td className="px-3 py-2 font-mono text-xs">{s.qrCode}</td>
                      <td className="px-3 py-2 text-xs">{s.createdAt}</td>
                      <td className="px-3 py-2 text-right">{ordersOfSupply(s.id).filter((o) => o.status === "assembling").length}</td>
                      <td className="px-3 py-2 text-right">{s.trbx.length}</td>
                      <td className="px-3 py-2 text-xs">{s.warehouse}</td>
                      <td className="px-3 py-2 text-right">
                        <Button size="sm" variant="outline" onClick={() => { setOpenSupply(s); setKizValue(""); }}>Открыть поставку</Button>
                      </td>
                    </tr>
                  ))}
                  {!assemblingSupplies.length && (
                    <tr><td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">Поставок в сборке нет</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Товар в сборке отображается в Стоке в столбце «Отгрузка».
            </p>
          </TabsContent>

          {/* ================= В ДОСТАВКЕ ================= */}
          <TabsContent value="delivering" className="mt-4">
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2.5">Поставка</th>
                    <th className="text-left px-3 py-2.5">QR-код поставки</th>
                    <th className="text-left px-3 py-2.5">Статус</th>
                    <th className="text-left px-3 py-2.5">Время сканирования QR</th>
                    <th className="text-right px-3 py-2.5">Заказы / грузоместа</th>
                    <th className="text-left px-3 py-2.5">Склад</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveringSupplies.map((s) => (
                    <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{s.name} · {s.supplyNo}</td>
                      <td className="px-3 py-2 font-mono text-xs">{s.qrCode}</td>
                      <td className="px-3 py-2"><StatusBadge status="primary" label="Поставка в обработке" /></td>
                      <td className="px-3 py-2 text-xs">{s.createdAt}</td>
                      <td className="px-3 py-2 text-right">{ordersOfSupply(s.id).length} / {s.trbx.length}</td>
                      <td className="px-3 py-2 text-xs">{s.warehouse}</td>
                    </tr>
                  ))}
                  {!deliveringSupplies.length && (
                    <tr><td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">Поставок в доставке нет</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              При передаче в доставку количество товара списывается из столбца «Всего» в Стоке.
            </p>
          </TabsContent>

          {/* ================= ЗАВЕРШЁННЫЕ ================= */}
          <TabsContent value="done" className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <Select value={doneStatusFilter} onValueChange={(v) => setDoneStatusFilter(v as typeof doneStatusFilter)}>
                <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="bought">Товар выкуплен</SelectItem>
                  <SelectItem value="canceled">Покупатель отказался</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" disabled={!doneSelected.length} onClick={generateUpd}>
                <FileText className="w-4 h-4 mr-2" /> Сформировать УПД ({doneSelected.length})
              </Button>
            </div>

            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5">
                      <Checkbox
                        checked={!!doneOrders.length && doneSelected.length === doneOrders.length}
                        onCheckedChange={(c) => setDoneSelected(c ? doneOrders.map((o) => o.id) : [])}
                      />
                    </th>
                    <th className="text-left px-3 py-2.5">Задание</th>
                    <th className="text-left px-3 py-2.5">Товар</th>
                    <th className="text-right px-3 py-2.5">Цена</th>
                    <th className="text-left px-3 py-2.5">Склад</th>
                    <th className="text-left px-3 py-2.5">Статус</th>
                    <th className="text-left px-3 py-2.5">КИЗ</th>
                    <th className="text-left px-3 py-2.5">УПД</th>
                  </tr>
                </thead>
                <tbody>
                  {doneOrders.map((o) => (
                    <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2 text-center">
                        <Checkbox checked={doneSelected.includes(o.id)} onCheckedChange={() => toggle(doneSelected, setDoneSelected, o.id)} />
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{o.orderNo}</td>
                      <td className="px-3 py-2 text-xs">{o.name} · {o.article} · {o.size}</td>
                      <td className="px-3 py-2 text-right">{o.price} ₽</td>
                      <td className="px-3 py-2 text-xs">{o.warehouse}</td>
                      <td className="px-3 py-2">
                        <StatusBadge
                          status={o.saleStatus === "canceled" ? "error" : "success"}
                          label={o.saleStatus === "canceled" ? "Покупатель отказался" : "Товар выкуплен"}
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{o.kiz ?? "—"}</td>
                      <td className="px-3 py-2">{o.updGenerated ? <StatusBadge status="primary" label="УПД" /> : "—"}</td>
                    </tr>
                  ))}
                  {!doneOrders.length && (
                    <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">Завершённых заданий нет</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ================= СКЛАДЫ WB ================= */}
          <TabsContent value="warehouses" className="mt-4">
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2.5">Склад продавца</th>
                    <th className="text-left px-3 py-2.5">Адрес</th>
                    <th className="text-left px-3 py-2.5">Тип</th>
                  </tr>
                </thead>
                <tbody>
                  {wbWarehouses.map((w) => (
                    <tr key={w.id} className="border-t border-border">
                      <td className="px-3 py-2 font-medium flex items-center gap-2">
                        <Warehouse className="w-4 h-4 text-muted-foreground" /> {w.name}
                      </td>
                      <td className="px-3 py-2 text-xs">{w.address}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{w.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Создание поставки */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать поставку</DialogTitle>
            <DialogDescription>
              Поставка создаётся только по одному складу. Заданий выбрано: {selected.length}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Склад поставки</Label>
            <Select value={supplyWarehouse} onValueChange={setSupplyWarehouse}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {wbWarehouses.map((w) => (
                  <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateSupply}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Работа с поставкой */}
      <Dialog open={!!liveSupply} onOpenChange={(o) => !o && setOpenSupply(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Поставка {liveSupply?.supplyNo}</DialogTitle>
            <DialogDescription>{liveSupply?.warehouse} · грузомест: {liveSupply?.trbx.length ?? 0}</DialogDescription>
          </DialogHeader>

          {liveSupply && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => { addTrbx(liveSupply.id); toast({ title: "Грузоместо добавлено" }); }}>
                  <PackagePlus className="w-4 h-4 mr-2" /> Добавить грузоместо
                </Button>
                <Button size="sm" variant="outline" onClick={() => { printSupplyQr(liveSupply.id); toast({ title: "QR поставки отправлен на печать", description: liveSupply.qrCode }); }}>
                  <QrCode className="w-4 h-4 mr-2" /> Печать QR поставки
                </Button>
                <Button size="sm" variant="outline" onClick={() => {
                  const n = refreshSaleStatuses(liveSupply.id);
                  toast({
                    title: n ? "Обнаружен отказ покупателя" : "Отказов нет",
                    description: n ? "Неактуальное задание удалено из поставки." : "Все задания актуальны.",
                    variant: n ? "destructive" : undefined,
                  });
                }}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Обновить статусы заданий
                </Button>
                <Button size="sm" onClick={() => { deliverSupply(liveSupply.id); setOpenSupply(null); toast({ title: "Поставка передана в доставку" }); }}>
                  <Truck className="w-4 h-4 mr-2" /> Передать в доставку
                </Button>
              </div>

              <div className="space-y-2 rounded border border-border p-3">
                <Label>Скан УПЛ (поиск короба и ячейки хранения)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="ШК УПЛ или номер УПЛ"
                    value={uplValue}
                    onChange={(e) => setUplValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUplScan()}
                  />
                  <Button onClick={() => handleUplScan()}><ScanLine className="w-4 h-4 mr-2" /> Найти короб</Button>
                  <Button variant="outline" onClick={emulateUplScan}>Эмулировать скан УПЛ</Button>
                </div>
                {uplBox && (
                  <div className="text-xs space-y-1">
                    <div>
                      Короб <b>{uplBox.uplNumber}</b> · ячейка{" "}
                      <b className="font-mono">{uplBox.cell || "не назначена"}</b> · заказ {uplBox.orderNumber}
                    </div>
                    <div className="text-muted-foreground">
                      {uplBox.items.map((i) => `${i.article} · ${i.size} — ${i.qty} шт`).join(" | ")}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 rounded border border-border p-3">
                <Label>Скан КИЗ товара</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Сканируйте КИЗ товара"
                    value={kizValue}
                    onChange={(e) => setKizValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleKiz()}
                  />
                  <Button onClick={handleKiz} disabled={emulating}><ScanLine className="w-4 h-4 mr-2" /> Добавить</Button>
                  <Button variant="outline" onClick={() => emulateScan()} disabled={emulating}>
                    <ScanLine className={`w-4 h-4 mr-2 ${emulating ? "animate-pulse" : ""}`} /> Эмулировать скан
                  </Button>
                  <Button variant="secondary" onClick={emulateScanAll} disabled={emulating}>
                    Скан всех
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  По КИЗу определяем товар и привязываем к заданию по совпадению ШК / артикула / размера.
                  Кнопки эмуляции генерируют КИЗ в формате GS1 (01…21…93…) и «сканируют» его вместо физического сканера.
                </p>
              </div>

              <table className="w-full text-sm border border-border rounded">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Задание</th>
                    <th className="text-left px-3 py-2">Товар</th>
                    <th className="text-left px-3 py-2">Баркод</th>
                    <th className="text-left px-3 py-2">Ячейки хранения (короба)</th>
                    <th className="text-left px-3 py-2">КИЗ</th>
                    <th className="text-left px-3 py-2">Стикер WB</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {supplyOrders.map((o: FbsOrder) => (
                    <tr key={o.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{o.orderNo}</td>
                      <td className="px-3 py-2 text-xs">{o.article} · {o.size}</td>
                      <td className="px-3 py-2 text-xs">
                        {cellsOfShk(o.shk).length ? (
                          <div className="space-y-0.5">
                            {cellsOfShk(o.shk).map((b) => (
                              <div key={b.id} className="font-mono text-[11px]">
                                {b.cell || "без ячейки"}{" "}
                                <span className="text-muted-foreground">
                                  · {b.uplNumber} · {b.items.filter((i) => i.shk === o.shk).reduce((s2, i) => s2 + i.qty, 0)} шт
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">нет коробов</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">{o.kiz ?? "—"}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={o.stickerPrinted ? "success" : "default"} label={o.stickerPrinted ? "Напечатан" : "Нет"} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button size="sm" variant="ghost" disabled={!!o.kiz || emulating} onClick={() => emulateScan(o)}>
                          <ScanLine className="w-4 h-4 mr-1" /> Скан КИЗ
                        </Button>
                        <Button size="sm" variant="ghost" disabled={!o.kiz} onClick={() => { printSticker(o.id); toast({ title: "Стикер WB отправлен на печать", description: `${o.article} · ${o.size}` }); }}>
                          <Printer className="w-4 h-4 mr-1" /> Печать стикера
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!supplyOrders.length && (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">В поставке нет заданий</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FbsShippingPage;