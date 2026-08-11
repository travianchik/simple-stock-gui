import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { toast } from "@/hooks/use-toast";
import {
  Download, ScanLine, Printer, QrCode, Truck, Package, PackageCheck,
} from "lucide-react";
import { useRoles } from "@/contexts/RoleContext";
import { useWarehouse, ShipTask, ShipTaskStatus } from "@/contexts/WarehouseContext";

const statusMeta: Record<ShipTaskStatus, { label: string; type: "default" | "primary" | "warning" | "success" }> = {
  new: { label: "Новое задание", type: "default" },
  picking: { label: "Сборка", type: "warning" },
  picked: { label: "Собрано", type: "primary" },
  packing: { label: "Упаковка", type: "warning" },
  packed: { label: "Упаковано", type: "primary" },
  shipped: { label: "Передано водителю", type: "success" },
};

const cities = ["Москва", "Санкт-Петербург", "Казань", "Екатеринбург", "Новосибирск"];

const FbsShippingPage = () => {
  const { currentUser } = useRoles();
  const { tasks, addTasks, updateTask, updateTaskItem } = useWarehouse();

  const [scheme, setScheme] = useState<"FBS" | "FBO">("FBS");
  const visible = tasks.filter((t) => t.scheme === scheme);

  /* --- автоматическая выгрузка заказов по API (как надо реализовать) --- */
  const [apiOpen, setApiOpen] = useState(false);
  const [apiDate, setApiDate] = useState(new Date().toISOString().slice(0, 10));
  const [apiTime, setApiTime] = useState("09:00");
  const [apiUnits, setApiUnits] = useState("250");

  const downloadFromApi = () => {
    const units = Number(apiUnits) || 0;
    const perCity = Math.max(1, Math.floor(units / cities.length));
    const created: ShipTask[] = cities.map((city, idx) => ({
      id: Date.now() + idx,
      scheme,
      city,
      qrCode: `QR-WB-${city.slice(0, 3).toUpperCase()}-${String(Date.now()).slice(-4)}${idx}`,
      marketplace: "Wildberries",
      managerId: null,
      packerId: null,
      unitsPerBox: 5,
      boxesCount: 0,
      qrCopies: 0,
      items: [
        { article: "WB-12345", name: "Футболка белая S", barcode: "4607012345671-01", qty: perCity, cell: "1.2.1.1", picked: 0, labeled: 0 },
      ],
      status: "new",
      createdAt: new Date().toLocaleDateString("ru-RU"),
      source: "api",
    }));
    addTasks(created);
    toast({
      title: `Данные скачаны по API (${apiDate} ${apiTime})`,
      description: `${units} ед. сопоставлены с ${cities.length} городами, задания для менеджеров по отгрузке сформированы сразу`,
    });
    setApiOpen(false);
  };

  /* --- ТСД: сборка заказа менеджером по отгрузке --- */
  const [pickTask, setPickTask] = useState<ShipTask | null>(null);
  const [qrScan, setQrScan] = useState("");
  const [openedBox, setOpenedBox] = useState<string | null>(null);
  const [itemScan, setItemScan] = useState("");

  const current = pickTask ? tasks.find((t) => t.id === pickTask.id) || pickTask : null;

  const openTaskByQr = () => {
    if (!current) return;
    if (qrScan.trim() !== current.qrCode) {
      toast({ title: "QR заказа не совпадает", variant: "destructive" });
      return;
    }
    updateTask(current.id, { status: "picking", managerId: currentUser.id });
    toast({ title: "Заказ открыт на ТСД", description: "Идите собирать заказ по листу (стеллаж / ячейка)" });
    setQrScan("");
  };

  const openBox = (cell: string) => {
    setOpenedBox(cell);
    toast({ title: `Откройте коробку в ячейке ${cell}` });
  };

  const pickItem = () => {
    if (!current || !openedBox) return;
    const item = current.items.find((i) => i.cell === openedBox && (i.barcode === itemScan.trim() || i.article === itemScan.trim()));
    if (!item) {
      toast({ title: "Баркод / КИЗ не соответствует заданию", variant: "destructive" });
      return;
    }
    if (item.picked >= item.qty) {
      toast({ title: "По этой позиции задание уже выполнено" });
      return;
    }
    updateTaskItem(current.id, item.article, { picked: item.picked + 1 });
    setItemScan("");
  };

  const closeBox = () => {
    toast({ title: `Короб в ячейке ${openedBox} закрыт` });
    setOpenedBox(null);
  };

  const toTrolley = () => {
    if (!current) return;
    updateTask(current.id, { status: "picked" });
    toast({ title: "Товар сложен на тележку", description: "Передан упаковщицам по отгрузке" });
    setPickTask(null);
  };

  /* --- упаковка --- */
  const [packTask, setPackTask] = useState<ShipTask | null>(null);
  const [packScan, setPackScan] = useState("");
  const [boxesCount, setBoxesCount] = useState("");
  const packCurrent = packTask ? tasks.find((t) => t.id === packTask.id) || packTask : null;

  const scanForLabel = () => {
    if (!packCurrent) return;
    const item = packCurrent.items.find((i) => i.barcode === packScan.trim() || i.article === packScan.trim());
    if (!item) {
      toast({ title: "Баркод / КИЗ не найден в заказе", variant: "destructive" });
      return;
    }
    if (item.labeled >= item.qty) {
      toast({ title: "Все этикетки по позиции наклеены" });
      return;
    }
    updateTaskItem(packCurrent.id, item.article, { labeled: item.labeled + 1 });
    updateTask(packCurrent.id, { status: "packing", packerId: currentUser.id });
    toast({ title: "Этикетка WB распечатана", description: `${item.name} — наклейте и сложите товар в короб` });
    setPackScan("");
  };

  const finishPacking = () => {
    if (!packCurrent) return;
    const total = packCurrent.items.reduce((s, i) => s + i.qty, 0);
    const count = Number(boxesCount);
    if (!count) {
      toast({ title: "Укажите количество коробов", variant: "destructive" });
      return;
    }
    updateTask(packCurrent.id, { status: "packed", boxesCount: count, qrCopies: count });
    toast({
      title: `WB выдал QR по городу ${packCurrent.city}`,
      description: `${total} ед. по ${packCurrent.unitsPerBox} в коробе = ${count} коробов → ${count} копий QR напечатано`,
    });
    setBoxesCount("");
    setPackTask(null);
  };

  const handOverToDriver = (t: ShipTask) => {
    const driver = "Водитель Смирнов И.";
    updateTask(t.id, { status: "shipped", driver });
    toast({ title: "Короба переданы водителю", description: `${driver} сдаёт короба в сортировочный центр` });
  };

  const printSheets = () => {
    const list = visible.filter((t) => t.status === "new" || t.status === "picking");
    toast({
      title: `Печать заданий: ${list.length} лист(ов)`,
      description: list.map((t) => `${t.city} — ${t.items.reduce((s, i) => s + i.qty, 0)} ед.`).join("; "),
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Отгрузка FBS / FBO"
        description="Задания по городам, сборка на ТСД по QR, упаковка и передача коробов водителю"
        actions={
          <>
            <div className="flex rounded-md border border-border overflow-hidden">
              {(["FBS", "FBO"] as const).map((s) => (
                <button key={s} onClick={() => setScheme(s)}
                  className={`px-3 py-1.5 text-xs ${scheme === s ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>
                  {s}
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={printSheets}><Printer className="w-4 h-4 mr-1" />Печать заданий</Button>
            <Button size="sm" onClick={() => setApiOpen(true)}><Download className="w-4 h-4 mr-1" />Скачать заказы по API</Button>
          </>
        }
      />

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs">QR заказа</TableHead>
              <TableHead className="text-xs">Город</TableHead>
              <TableHead className="text-xs">Маркетплейс</TableHead>
              <TableHead className="text-xs text-right">Ед. в заказе</TableHead>
              <TableHead className="text-xs text-right">Собрано</TableHead>
              <TableHead className="text-xs text-right">Ед./короб</TableHead>
              <TableHead className="text-xs text-right">Коробов / QR</TableHead>
              <TableHead className="text-xs">Источник</TableHead>
              <TableHead className="text-xs">Статус</TableHead>
              <TableHead className="text-xs w-52"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((t) => {
              const total = t.items.reduce((s, i) => s + i.qty, 0);
              const picked = t.items.reduce((s, i) => s + i.picked, 0);
              return (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs text-primary">{t.qrCode}</TableCell>
                  <TableCell className="text-sm">{t.city}</TableCell>
                  <TableCell className="text-sm">{t.marketplace}</TableCell>
                  <TableCell className="text-sm text-right">{total}</TableCell>
                  <TableCell className="text-sm text-right font-medium">{picked}</TableCell>
                  <TableCell className="text-sm text-right">{t.unitsPerBox}</TableCell>
                  <TableCell className="text-sm text-right">{t.boxesCount || "—"} / {t.qrCopies || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.source === "api" ? "API" : "Вручную"}</TableCell>
                  <TableCell><StatusBadge status={statusMeta[t.status].type} label={statusMeta[t.status].label} /></TableCell>
                  <TableCell className="text-right space-x-1">
                    {["new", "picking"].includes(t.status) && (
                      <Button size="sm" variant="outline" onClick={() => { setPickTask(t); setQrScan(""); setOpenedBox(null); }}>
                        <ScanLine className="w-3.5 h-3.5 mr-1" />ТСД
                      </Button>
                    )}
                    {["picked", "packing"].includes(t.status) && (
                      <Button size="sm" variant="outline" onClick={() => { setPackTask(t); setBoxesCount(""); }}>
                        <Package className="w-3.5 h-3.5 mr-1" />Упаковка
                      </Button>
                    )}
                    {t.status === "packed" && (
                      <Button size="sm" onClick={() => handOverToDriver(t)}>
                        <Truck className="w-3.5 h-3.5 mr-1" />Водителю
                      </Button>
                    )}
                    {t.status === "shipped" && <span className="text-xs text-muted-foreground">{t.driver}</span>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* API */}
      <Dialog open={apiOpen} onOpenChange={setApiOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Автоматическое скачивание заказов по API</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Дата</Label><Input type="date" value={apiDate} onChange={(e) => setApiDate(e.target.value)} /></div>
              <div><Label className="text-xs">Время</Label><Input type="time" value={apiTime} onChange={(e) => setApiTime(e.target.value)} /></div>
            </div>
            <div><Label className="text-xs">Кол-во заказов за 24 часа, ед.</Label><Input type="number" value={apiUnits} onChange={(e) => setApiUnits(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">
              Товар сопоставляется по городам, QR маркетплейса сопоставляется с товаром, задание для менеджеров по отгрузке формируется сразу.
            </p>
          </div>
          <DialogFooter><Button onClick={downloadFromApi}>Скачать и сформировать задания</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ТСД */}
      <Dialog open={!!pickTask} onOpenChange={(v) => !v && setPickTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>ТСД · задание {current?.city}</DialogTitle></DialogHeader>
          {current && (
            <div className="space-y-3">
              {current.status === "new" ? (
                <div className="space-y-2">
                  <Label className="text-xs">Пикните QR заказа на листе задания ({current.qrCode})</Label>
                  <div className="flex gap-2">
                    <Input autoFocus value={qrScan} onChange={(e) => setQrScan(e.target.value)} placeholder="QR заказа"
                      onKeyDown={(e) => e.key === "Enter" && openTaskByQr()} />
                    <Button onClick={openTaskByQr}><QrCode className="w-4 h-4" /></Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    {current.items.map((i) => (
                      <div key={i.article} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                        <div>
                          <div>{i.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{i.article} · ячейка {i.cell}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{i.picked} / {i.qty} ед.</span>
                          <Button size="sm" variant={openedBox === i.cell ? "default" : "outline"} onClick={() => openBox(i.cell)}>
                            Открыть короб
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {openedBox && (
                    <div className="space-y-2 rounded-md bg-muted/40 p-3">
                      <Label className="text-xs">Ячейка {openedBox}: пикните баркод или КИЗ товара</Label>
                      <div className="flex gap-2">
                        <Input autoFocus value={itemScan} onChange={(e) => setItemScan(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && pickItem()} placeholder="Баркод / КИЗ" />
                        <Button onClick={pickItem}><ScanLine className="w-4 h-4" /></Button>
                        <Button variant="outline" onClick={closeBox}>Закрыть короб</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={toTrolley} disabled={!current || current.status === "new"}>
              <PackageCheck className="w-4 h-4 mr-1" />На тележку → упаковщицам
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Упаковка */}
      <Dialog open={!!packTask} onOpenChange={(v) => !v && setPackTask(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Упаковка · {packCurrent?.city}</DialogTitle></DialogHeader>
          {packCurrent && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input autoFocus value={packScan} onChange={(e) => setPackScan(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && scanForLabel()} placeholder="Сканируйте баркод или КИЗ (ЧЗ)" />
                <Button onClick={scanForLabel}><Printer className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-1 text-sm">
                {packCurrent.items.map((i) => (
                  <div key={i.article} className="flex justify-between rounded-md border border-border px-3 py-2">
                    <span>{i.name}</span>
                    <span className="text-xs text-muted-foreground">этикеток: {i.labeled} / {i.qty}</span>
                  </div>
                ))}
              </div>
              <div>
                <Label className="text-xs">
                  Количество коробов ({packCurrent.items.reduce((s, i) => s + i.qty, 0)} ед. по {packCurrent.unitsPerBox} в коробе)
                </Label>
                <Input type="number" value={boxesCount} onChange={(e) => setBoxesCount(e.target.value)}
                  placeholder={String(Math.ceil(packCurrent.items.reduce((s, i) => s + i.qty, 0) / packCurrent.unitsPerBox))} />
                <p className="text-xs text-muted-foreground mt-1">Под каждый короб будет напечатан дубль QR, выданного маркетплейсом.</p>
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={finishPacking}><QrCode className="w-4 h-4 mr-1" />Завершить заказ и печатать QR</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FbsShippingPage;