import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, PackagePlus, ScanLine, CheckCircle2, Download, Boxes, UserPlus } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import UplLabel from "@/components/UplLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRoles } from "@/contexts/RoleContext";
import { useOrbita, type ReceiveMethod, type ReceiveOrderItem, type UplBox } from "@/contexts/OrbitaContext";

const statusMap = {
  new: { label: "Новый", status: "default" as const },
  in_progress: { label: "В работе", status: "warning" as const },
  done: { label: "Завершён", status: "success" as const },
};

const num = (v: unknown) => {
  const n = Number.parseFloat(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : 0;
};

const ReceivingPage = () => {
  const { orders, addOrder, assignOrder, openBox, addToBox, closeBox, finishOrder, boxesOfOrder, pickedQty, boxes } = useOrbita();
  const { users } = useRoles();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newMethod, setNewMethod] = useState<ReceiveMethod>("kiz");
  const [newFileName, setNewFileName] = useState("");
  const [newItems, setNewItems] = useState<ReceiveOrderItem[]>([]);
  const [newAssignee, setNewAssignee] = useState<string>("none");

  const [workOrderId, setWorkOrderId] = useState<number | null>(null);
  const [activeBoxId, setActiveBoxId] = useState<number | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [labelBox, setLabelBox] = useState<UplBox | null>(null);
  const [detailsOrderId, setDetailsOrderId] = useState<number | null>(null);

  const employees = users.filter((u) => u.role === "employee" || u.role === "receiving_manager");

  const activeOrders = orders.filter((o) => o.status !== "done");
  const doneOrders = orders.filter((o) => o.status === "done");

  const workOrder = orders.find((o) => o.id === workOrderId) || null;
  const activeBox = boxes.find((b) => b.id === activeBoxId) || null;
  const detailsOrder = orders.find((o) => o.id === detailsOrderId) || null;

  /* ---------- Загрузка файла заказа ---------- */
  const parseOrderFile = async (file: File) => {
    try {
      const wb = XLSX.read(await file.arrayBuffer());
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      const get = (r: Record<string, unknown>, ...keys: string[]) => {
        for (const k of keys) {
          const found = Object.keys(r).find((rk) => rk.toLowerCase().includes(k.toLowerCase()));
          if (found && String(r[found]).trim() !== "") return String(r[found]).trim();
        }
        return "";
      };
      const items: ReceiveOrderItem[] = raw
        .map((r) => ({
          article: get(r, "Артикул продавца", "Номенклатура.Артикул", "Артикул"),
          size: get(r, "Размер", "Характеристика"),
          name: get(r, "Наименование", "Номенклатура"),
          shk: get(r, "ШК", "Баркод"),
          gtin: get(r, "GTIN"),
          wbArticle: get(r, "Артикул WB", "Ozon"),
          unit: get(r, "Единица", "Ед") || "шт",
          qty: num(get(r, "Количество", "Кол-во", "Всего")),
          kizes: get(r, "КИЗ", "KIZ") ? [get(r, "КИЗ", "KIZ")] : [],
        }))
        .filter((i) => i.shk || i.article);
      if (!items.length) {
        toast({ title: "Файл не распознан", description: "Нет строк с товаром.", variant: "destructive" });
        return;
      }
      setNewItems(items);
      setNewFileName(file.name);
      toast({ title: "Файл заказа прочитан", description: `Позиций: ${items.length}` });
    } catch {
      toast({ title: "Ошибка чтения файла", description: "Ожидается Excel/CSV с заказом (КИЗ или ШК).", variant: "destructive" });
    }
  };

  const createOrder = () => {
    if (!newItems.length) {
      toast({ title: "Загрузите файл заказа", variant: "destructive" });
      return;
    }
    addOrder({
      number: `ЗАК-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      method: newMethod,
      fileName: newFileName,
      assigneeId: newAssignee === "none" ? null : Number(newAssignee),
      items: newItems,
    });
    setCreateOpen(false);
    setNewItems([]);
    setNewFileName("");
    setNewAssignee("none");
    toast({ title: "Заказ на приёмку создан" });
  };

  /* ---------- Пикинг ---------- */
  const startWork = (orderId: number) => {
    setWorkOrderId(orderId);
    const existingOpen = boxesOfOrder(orderId).find((b) => !b.closed);
    setActiveBoxId(existingOpen ? existingOpen.id : null);
    setScanValue("");
  };

  const handleOpenBox = () => {
    if (workOrderId == null) return;
    const box = openBox(workOrderId);
    setActiveBoxId(box.id);
    toast({ title: `Короб открыт: ${box.uplNumber}` });
  };

  const handleScan = () => {
    if (!workOrder || !activeBox) return;
    const code = scanValue.trim();
    if (!code) return;
    const item =
      workOrder.items.find((i) => i.shk === code) ||
      workOrder.items.find((i) => code.includes(i.shk) || code.includes(i.article));
    if (!item) {
      toast({ title: "Товар не найден в заказе", description: code, variant: "destructive" });
      setScanValue("");
      return;
    }
    if (pickedQty(workOrder.id, item.shk) >= item.qty) {
      toast({ title: "Количество по заказу уже собрано", description: `${item.article} · ${item.size}`, variant: "destructive" });
      setScanValue("");
      return;
    }
    addToBox(activeBox.id, {
      article: item.article,
      size: item.size,
      name: item.name,
      shk: item.shk,
      qty: 1,
      kiz: workOrder.method === "kiz" ? code : undefined,
    });
    setScanValue("");
  };

  const handleCloseBox = () => {
    if (!activeBox) return;
    closeBox(activeBox.id);
    const closed = { ...activeBox, closed: true, closedAt: new Date().toLocaleString("ru-RU") };
    setLabelBox(closed);
    setActiveBoxId(null);
    toast({ title: `Короб ${activeBox.uplNumber} закрыт`, description: "УПЛ отправлен на печать." });
  };

  const handleFinish = (orderId: number) => {
    const open = boxesOfOrder(orderId).find((b) => !b.closed);
    if (open) {
      toast({ title: "Есть незакрытый короб", description: `Закройте ${open.uplNumber} перед завершением.`, variant: "destructive" });
      return;
    }
    finishOrder(orderId);
    if (workOrderId === orderId) setWorkOrderId(null);
    toast({ title: "Приёмка завершена", description: "Товар добавлен в Сток (совпадение по ШК — количество суммировано)." });
  };

  const exportOrderReport = (orderId: number) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const rows = boxesOfOrder(orderId).flatMap((b) =>
      b.items.map((i) => ({
        Заказ: order.number,
        УПЛ: b.uplNumber,
        "ШК УПЛ": b.uplBarcode,
        Артикул: i.article,
        Размер: i.size,
        Наименование: i.name,
        Баркод: i.shk,
        "Кол-во": i.qty,
        КИЗы: i.kizes.join(" "),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Приёмка");
    XLSX.writeFile(wb, `Отчёт_${order.number}.xlsx`);
  };

  const progress = useMemo(() => {
    if (!workOrder) return { picked: 0, plan: 0 };
    const plan = workOrder.items.reduce((s, i) => s + i.qty, 0);
    const picked = workOrder.items.reduce((s, i) => s + pickedQty(workOrder.id, i.shk), 0);
    return { picked, plan };
  }, [workOrder, boxes]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderOrdersTable = (list: typeof orders, done: boolean) => (
    <div className="border border-border rounded-lg overflow-hidden bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="text-left px-3 py-2.5">Заказ</th>
            <th className="text-left px-3 py-2.5">Метод</th>
            <th className="text-left px-3 py-2.5">Файл</th>
            <th className="text-left px-3 py-2.5">Создан</th>
            <th className="text-left px-3 py-2.5">Сотрудник</th>
            <th className="text-right px-3 py-2.5">План / Собрано</th>
            <th className="text-right px-3 py-2.5">Коробов</th>
            <th className="text-left px-3 py-2.5">Статус</th>
            <th className="px-3 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {list.map((o) => {
            const plan = o.items.reduce((s, i) => s + i.qty, 0);
            const picked = o.items.reduce((s, i) => s + pickedQty(o.id, i.shk), 0);
            return (
              <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{o.number}</td>
                <td className="px-3 py-2">{o.method === "kiz" ? "КИЗ" : "ШК"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{o.fileName}</td>
                <td className="px-3 py-2 text-xs">{o.createdAt}</td>
                <td className="px-3 py-2">
                  {o.assigneeId ? (
                    users.find((u) => u.id === o.assigneeId)?.name ?? "—"
                  ) : (
                    <Select onValueChange={(v) => { assignOrder(o.id, Number(v)); toast({ title: "Сотрудник назначен" }); }}>
                      <SelectTrigger className="h-7 w-44 text-xs">
                        <SelectValue placeholder="Назначить" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)} className="text-xs">{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </td>
                <td className="px-3 py-2 text-right">{plan} / <b>{picked}</b></td>
                <td className="px-3 py-2 text-right">{boxesOfOrder(o.id).length}</td>
                <td className="px-3 py-2"><StatusBadge {...statusMap[o.status]} /></td>
                <td className="px-3 py-2 text-right space-x-1 whitespace-nowrap">
                  {!done && (
                    <>
                      <Button size="sm" variant="outline" disabled={!o.assigneeId} onClick={() => startWork(o.id)}>
                        <ScanLine className="w-4 h-4 mr-1" /> Приступить
                      </Button>
                      <Button size="sm" onClick={() => handleFinish(o.id)}>
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Завершить
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setDetailsOrderId(o.id)}>
                    <Boxes className="w-4 h-4 mr-1" /> Короба
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => exportOrderReport(o.id)}>
                    <Download className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
          {!list.length && (
            <tr>
              <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">Заказов нет</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Приёмка товара"
        description="Заказ → назначение сотрудника → пикинг в короба → печать УПЛ → завершение и передача в Сток"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Upload className="w-4 h-4 mr-2" /> Загрузить заказ
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">В работе ({activeOrders.length})</TabsTrigger>
            <TabsTrigger value="done">Завершённые ({doneOrders.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-4">{renderOrdersTable(activeOrders, false)}</TabsContent>
          <TabsContent value="done" className="mt-4">{renderOrdersTable(doneOrders, true)}</TabsContent>
        </Tabs>

        {/* Рабочее место приёмки */}
        {workOrder && (
          <div className="border border-border rounded-lg bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Приёмка заказа {workOrder.number}</h2>
                <p className="text-xs text-muted-foreground">
                  Метод: {workOrder.method === "kiz" ? "сканирование КИЗ" : "сканирование ШК"} · собрано {progress.picked} из {progress.plan}
                </p>
              </div>
              <div className="flex gap-2">
                {!activeBox ? (
                  <Button size="sm" onClick={handleOpenBox}>
                    <PackagePlus className="w-4 h-4 mr-2" /> Открыть короб
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={handleCloseBox}>
                    Закрыть короб и печатать УПЛ
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setWorkOrderId(null)}>Свернуть</Button>
              </div>
            </div>

            {activeBox && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <Label>{workOrder.method === "kiz" ? "Сканируйте КИЗ" : "Сканируйте ШК товара"}</Label>
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      value={scanValue}
                      onChange={(e) => setScanValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleScan()}
                      placeholder={workOrder.method === "kiz" ? "КИЗ / DataMatrix" : "Баркод товара"}
                    />
                    <Button onClick={handleScan}>Пикать</Button>
                  </div>
                  <table className="w-full text-xs border border-border rounded">
                    <thead className="bg-muted/50 uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left px-2 py-1.5">Артикул</th>
                        <th className="text-left px-2 py-1.5">Размер</th>
                        <th className="text-left px-2 py-1.5">Баркод</th>
                        <th className="text-right px-2 py-1.5">План</th>
                        <th className="text-right px-2 py-1.5">Собрано</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workOrder.items.map((i) => {
                        const p = pickedQty(workOrder.id, i.shk);
                        return (
                          <tr key={i.shk} className="border-t border-border">
                            <td className="px-2 py-1.5">{i.article}</td>
                            <td className="px-2 py-1.5">{i.size}</td>
                            <td className="px-2 py-1.5 font-mono">{i.shk}</td>
                            <td className="px-2 py-1.5 text-right">{i.qty}</td>
                            <td className={`px-2 py-1.5 text-right font-semibold ${p >= i.qty ? "text-success" : ""}`}>{p}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <UplLabel box={activeBox} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Создание заказа */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Загрузить заказ на приёмку</DialogTitle>
            <DialogDescription>Файл с заказом (КИЗ или ШК) создаёт заказ на приёмку.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Метод приёмки</Label>
              <Select value={newMethod} onValueChange={(v) => setNewMethod(v as ReceiveMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kiz">КИЗ</SelectItem>
                  <SelectItem value="shk">ШК</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Файл заказа</Label>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) parseOrderFile(f);
                  e.target.value = "";
                }}
              />
              <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" /> {newFileName || "Выбрать файл (xlsx / csv)"}
              </Button>
              {!!newItems.length && (
                <p className="text-xs text-muted-foreground">
                  Позиций: {newItems.length} · единиц: {newItems.reduce((s, i) => s + i.qty, 0)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Сотрудник</Label>
              <Select value={newAssignee} onValueChange={setNewAssignee}>
                <SelectTrigger><SelectValue placeholder="Назначить позже" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Назначить позже</SelectItem>
                  {employees.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
            <Button onClick={createOrder}><UserPlus className="w-4 h-4 mr-2" /> Создать заказ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Печать УПЛ после закрытия короба */}
      <Dialog open={!!labelBox} onOpenChange={(o) => !o && setLabelBox(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Упаковочный лист {labelBox?.uplNumber}</DialogTitle>
            <DialogDescription>Наклейте УПЛ на короб.</DialogDescription>
          </DialogHeader>
          {labelBox && <UplLabel box={labelBox} />}
        </DialogContent>
      </Dialog>

      {/* Короба заказа */}
      <Dialog open={!!detailsOrder} onOpenChange={(o) => !o && setDetailsOrderId(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Короба заказа {detailsOrder?.number}</DialogTitle>
            <DialogDescription>Наполнение коробов, включая КИЗы</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {detailsOrder && boxesOfOrder(detailsOrder.id).map((b) => (
              <div key={b.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{b.uplNumber} · <span className="font-mono text-xs">{b.uplBarcode}</span></div>
                  <StatusBadge status={b.closed ? "success" : "warning"} label={b.closed ? "Закрыт" : "Открыт"} />
                </div>
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground uppercase">
                    <tr>
                      <th className="text-left py-1">Артикул</th>
                      <th className="text-left py-1">Размер</th>
                      <th className="text-left py-1">Баркод</th>
                      <th className="text-right py-1">Кол-во</th>
                      <th className="text-left py-1">КИЗы</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.items.map((i) => (
                      <tr key={i.shk} className="border-t border-border align-top">
                        <td className="py-1">{i.article}</td>
                        <td className="py-1">{i.size}</td>
                        <td className="py-1 font-mono">{i.shk}</td>
                        <td className="py-1 text-right">{i.qty}</td>
                        <td className="py-1 font-mono text-[10px] text-muted-foreground">{i.kizes.join(", ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            {detailsOrder && !boxesOfOrder(detailsOrder.id).length && (
              <p className="text-sm text-muted-foreground text-center py-6">Коробов пока нет</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReceivingPage;