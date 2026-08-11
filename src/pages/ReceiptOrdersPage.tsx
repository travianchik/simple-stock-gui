import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { toast } from "@/hooks/use-toast";
import { Plus, ScanLine, Printer, CheckCircle2, MapPin, Package } from "lucide-react";
import { useRoles } from "@/contexts/RoleContext";
import { useStock, StockBox } from "@/contexts/StockContext";
import {
  useWarehouse, ReceiptOrder, ReceiptOrderStatus, NomenclatureItem,
} from "@/contexts/WarehouseContext";

const statusMeta: Record<ReceiptOrderStatus, { label: string; type: "default" | "primary" | "warning" | "success" }> = {
  created: { label: "Создан", type: "default" },
  assigned: { label: "Назначен сотрудник", type: "primary" },
  picking: { label: "Пикинг", type: "warning" },
  picked: { label: "Передан ст. менеджеру", type: "warning" },
  verified: { label: "Сверен", type: "primary" },
  on_balance: { label: "На балансе", type: "success" },
};

const emptyItem = (): NomenclatureItem => ({
  article: "", name: "", barcode: "", brand: "", units: 0, chzCount: 0, unitsPerBox: 40, price: undefined,
});

const ReceiptOrdersPage = () => {
  const { currentUser, users } = useRoles();
  const { orders, addOrder, updateOrder, addPickedBox, generateBoxNumber } = useWarehouse();
  const { addBoxes } = useStock();

  const isSenior = currentUser.role === "warehouse_head" || currentUser.role === "receiving_manager";

  /* --- создание ордера (старший менеджер) --- */
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    orderNumber: "", upd: "", ip: "", marketplace: "Wildberries",
    packaging: "boxes" as "boxes" | "bags", method: "kiz" as "kiz" | "barcode",
    assigneeId: "", tableNo: "",
  });
  const [items, setItems] = useState<NomenclatureItem[]>([emptyItem()]);

  const employees = users.filter((u) => u.role === "employee");

  const submitOrder = () => {
    const valid = items.filter((i) => i.article && i.units > 0);
    if (!form.orderNumber || valid.length === 0) {
      toast({ title: "Заполните номер ордера и номенклатуру", variant: "destructive" });
      return;
    }
    const plannedBoxes = valid.reduce((s, i) => s + Math.ceil(i.units / (i.unitsPerBox || 1)), 0);
    addOrder({
      orderNumber: form.orderNumber,
      upd: form.upd,
      ip: form.ip,
      marketplace: form.marketplace,
      packaging: form.packaging,
      method: form.method,
      items: valid,
      plannedBoxes,
      assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
      tableNo: form.tableNo,
    });
    toast({ title: `Ордер ${form.orderNumber} создан`, description: `Коробов по плану: ${plannedBoxes}` });
    setCreateOpen(false);
    setItems([emptyItem()]);
    setForm({ orderNumber: "", upd: "", ip: "", marketplace: "Wildberries", packaging: "boxes", method: "kiz", assigneeId: "", tableNo: "" });
  };

  /* --- пикинг (менеджер по приёмке / сотрудник) --- */
  const [pickOrder, setPickOrder] = useState<ReceiptOrder | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [pickedQty, setPickedQty] = useState(0);

  const openPick = (order: ReceiptOrder) => {
    setPickOrder(order);
    setPickedQty(0);
    setScanValue("");
    if (order.status === "assigned" || order.status === "created") {
      updateOrder(order.id, { status: "picking" });
    }
  };

  const handleScan = () => {
    if (!pickOrder) return;
    const item = pickOrder.items.find((i) => i.barcode === scanValue.trim() || i.article === scanValue.trim());
    if (!item) {
      toast({ title: "Товар не найден в ордере", variant: "destructive" });
      return;
    }
    setPickedQty((q) => q + 1);
    setScanValue("");
  };

  const closeBoxAndPrint = () => {
    if (!pickOrder || pickedQty === 0) return;
    const boxNumber = generateBoxNumber();
    addPickedBox(pickOrder.id, {
      boxNumber,
      qty: pickedQty,
      pickerName: currentUser.name,
      articles: pickOrder.items.map((i) => ({ article: i.article, barcode: i.barcode, qty: pickedQty })),
      labelPrinted: true,
    });
    toast({
      title: `Короб ${boxNumber} закрыт`,
      description: `Отгрузочная этикетка напечатана: баркод, ${currentUser.name}, ${pickOrder.items.map((i) => i.article).join(", ")}, ${pickedQty} ед.`,
    });
    setPickedQty(0);
  };

  const transferToSenior = () => {
    if (!pickOrder) return;
    updateOrder(pickOrder.id, { status: "picked" });
    toast({ title: "Данные переданы старшему менеджеру" });
    setPickOrder(null);
  };

  /* --- сверка + баланс + ячейка (старший менеджер) --- */
  const [verifyOrder, setVerifyOrder] = useState<ReceiptOrder | null>(null);
  const [factQty, setFactQty] = useState("");
  const [comment, setComment] = useState("");
  const [cell, setCell] = useState("");

  const plannedQty = (o: ReceiptOrder) => o.items.reduce((s, i) => s + i.units, 0);
  const pickedTotal = (o: ReceiptOrder) => o.boxes.reduce((s, b) => s + b.qty, 0);

  const openVerify = (o: ReceiptOrder) => {
    setVerifyOrder(o);
    setFactQty(String(pickedTotal(o)));
    setComment(o.comment || "");
    setCell(o.boxes[0]?.cell || "");
  };

  const confirmVerify = () => {
    if (!verifyOrder) return;
    const fact = Number(factQty);
    const plan = plannedQty(verifyOrder);
    if (fact !== plan && !comment) {
      toast({ title: "Расхождение по количеству", description: "Пересчитайте лично с сотрудниками и оставьте комментарий для клиента", variant: "destructive" });
      return;
    }
    updateOrder(verifyOrder.id, { status: "verified", verifiedQty: fact, comment });
    toast({
      title: "Поставка сверена",
      description: fact === plan ? "Расхождений нет — товар можно ставить на баланс" : `Расхождение: план ${plan}, факт ${fact}. Комментарий отправлен клиенту.`,
    });
  };

  const putOnBalance = () => {
    if (!verifyOrder) return;
    if (!cell) {
      toast({ title: "Назначьте ячейку хранения", description: "Формат: стеллаж.секция.этаж.короб (пример 2.5.1.3)", variant: "destructive" });
      return;
    }
    const date = new Date().toLocaleDateString("ru-RU");
    const newBoxes: StockBox[] = verifyOrder.boxes.map((b, idx) => ({
      id: Date.now() + idx,
      boxNumber: b.boxNumber,
      upd: verifyOrder.upd || verifyOrder.orderNumber,
      qty: b.qty,
      brand: verifyOrder.items[0]?.brand || "—",
      dateReceived: date,
      status: "on_stock",
      ip: verifyOrder.ip,
      marketplace: verifyOrder.marketplace,
      cell,
      items: verifyOrder.items.map((i) => ({
        article: i.article,
        articleSeller: i.article,
        name: i.name,
        qty: b.qty,
        barcode: i.barcode,
        price: i.price,
        brand: i.brand,
        dateReceived: date,
        marketplace: verifyOrder.marketplace,
        kind: "unit" as const,
        chzCodes: verifyOrder.method === "kiz" ? Array.from({ length: Math.min(b.qty, i.chzCount) }, (_, k) => `${i.barcode}-CHZ-${k + 1}`) : undefined,
      })),
    }));
    if (newBoxes.length) addBoxes(newBoxes);
    updateOrder(verifyOrder.id, {
      status: "on_balance",
      boxes: verifyOrder.boxes.map((b) => ({ ...b, cell })),
    });
    toast({ title: "Товар упал на баланс склада", description: `Ячейка хранения: ${cell}` });
    setVerifyOrder(null);
  };

  const myOrders = isSenior
    ? orders
    : orders.filter((o) => o.assigneeId === currentUser.id || o.assigneeId === null);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ордера приёмки"
        description="Приёмка товара на баланс склада: номенклатура, ордера, назначение сотрудников, сверка, ячейка хранения"
      />

      {isSenior && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" />Загрузить заказ / создать ордер</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Загрузка заказа и создание ордера</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Номер ордера</Label><Input value={form.orderNumber} onChange={(e) => setForm({ ...form, orderNumber: e.target.value })} placeholder="ORD-0103" /></div>
              <div><Label className="text-xs">УПД</Label><Input value={form.upd} onChange={(e) => setForm({ ...form, upd: e.target.value })} placeholder="УПЛ-00149" /></div>
              <div><Label className="text-xs">ИП / клиент</Label><Input value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} placeholder="ИП Иванов А.А." /></div>
              <div>
                <Label className="text-xs">Маркетплейс</Label>
                <Select value={form.marketplace} onValueChange={(v) => setForm({ ...form, marketplace: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Wildberries">Wildberries</SelectItem><SelectItem value="Ozon">Ozon</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Товар приезжает</Label>
                <Select value={form.packaging} onValueChange={(v: "boxes" | "bags") => setForm({ ...form, packaging: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="boxes">В коробах</SelectItem><SelectItem value="bags">В мешках</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Метод приёмки (ТЗ сотрудника)</Label>
                <Select value={form.method} onValueChange={(v: "kiz" | "barcode") => setForm({ ...form, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="kiz">По КИЗу (ЧЗ)</SelectItem><SelectItem value="barcode">По баркоду</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Сотрудник приёмки</Label>
                <Select value={form.assigneeId} onValueChange={(v) => setForm({ ...form, assigneeId: v })}>
                  <SelectTrigger><SelectValue placeholder="Назначить позже" /></SelectTrigger>
                  <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Номер стола</Label><Input value={form.tableNo} onChange={(e) => setForm({ ...form, tableNo: e.target.value })} placeholder="Стол 3" /></div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Данные по товару (номенклатура)</Label>
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-7 gap-2 items-end">
                  <Input className="col-span-1" placeholder="Артикул" value={it.article} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, article: e.target.value } : x))} />
                  <Input className="col-span-2" placeholder="Наименование" value={it.name} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} />
                  <Input placeholder="Баркод" value={it.barcode} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, barcode: e.target.value } : x))} />
                  <Input placeholder="Бренд" value={it.brand} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, brand: e.target.value } : x))} />
                  <Input type="number" placeholder="Кол-во ед." value={it.units || ""} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, units: Number(e.target.value) } : x))} />
                  <Input type="number" placeholder="Кол-во ЧЗ" value={it.chzCount || ""} onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, chzCount: Number(e.target.value) } : x))} />
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setItems([...items, emptyItem()])}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Строка
                </Button>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  Ед. в коробе:
                  <Input className="w-20 h-8" type="number" value={items[0]?.unitsPerBox || 40}
                    onChange={(e) => setItems(items.map((x) => ({ ...x, unitsPerBox: Number(e.target.value) })))} />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={submitOrder}>Создать ордер и назначить</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs">Ордер</TableHead>
              <TableHead className="text-xs">УПД</TableHead>
              <TableHead className="text-xs">Тара</TableHead>
              <TableHead className="text-xs">Метод</TableHead>
              <TableHead className="text-xs text-right">План, ед.</TableHead>
              <TableHead className="text-xs text-right">Собрано, ед.</TableHead>
              <TableHead className="text-xs text-right">Коробов</TableHead>
              <TableHead className="text-xs">Сотрудник / стол</TableHead>
              <TableHead className="text-xs">Ячейка</TableHead>
              <TableHead className="text-xs">Статус</TableHead>
              <TableHead className="text-xs w-40"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {myOrders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-sm text-primary">{o.orderNumber}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{o.upd || "—"}</TableCell>
                <TableCell className="text-sm">{o.packaging === "boxes" ? "Короба" : "Мешки"}</TableCell>
                <TableCell className="text-sm">{o.method === "kiz" ? "КИЗ (ЧЗ)" : "Баркод"}</TableCell>
                <TableCell className="text-sm text-right">{plannedQty(o)}</TableCell>
                <TableCell className="text-sm text-right font-medium">{pickedTotal(o)}</TableCell>
                <TableCell className="text-sm text-right">{o.boxes.length} / {o.plannedBoxes}</TableCell>
                <TableCell className="text-sm">
                  {o.assigneeId ? users.find((u) => u.id === o.assigneeId)?.name : "—"}
                  {o.tableNo && <span className="text-muted-foreground"> · {o.tableNo}</span>}
                </TableCell>
                <TableCell className="text-sm font-mono">{o.boxes[0]?.cell || "—"}</TableCell>
                <TableCell><StatusBadge status={statusMeta[o.status].type} label={statusMeta[o.status].label} /></TableCell>
                <TableCell className="text-right space-x-1">
                  {["created", "assigned", "picking"].includes(o.status) && (
                    <Button size="sm" variant="outline" onClick={() => openPick(o)}>
                      <ScanLine className="w-3.5 h-3.5 mr-1" />Пикать
                    </Button>
                  )}
                  {isSenior && ["picked", "verified"].includes(o.status) && (
                    <Button size="sm" onClick={() => openVerify(o)}>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Сверить
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ===== ПИКИНГ ===== */}
      <Dialog open={!!pickOrder} onOpenChange={(v) => !v && setPickOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ордер {pickOrder?.orderNumber} — приёмка {pickOrder?.method === "kiz" ? "по КИЗу" : "по баркоду"}</DialogTitle>
          </DialogHeader>
          {pickOrder && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">
                Наполнение: {pickOrder.items.map((i) => `${i.article} — ${i.units} ед.`).join("; ")} · ед. в коробе: {pickOrder.items[0]?.unitsPerBox}
              </div>
              <div className="flex gap-2">
                <Input autoFocus placeholder={pickOrder.method === "kiz" ? "Отсканируйте КИЗ / баркод" : "Отсканируйте баркод"}
                  value={scanValue} onChange={(e) => setScanValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScan()} />
                <Button onClick={handleScan}><ScanLine className="w-4 h-4" /></Button>
              </div>
              <div className="rounded-md bg-muted/40 p-3 text-sm">
                В текущем коробе: <span className="font-semibold">{pickedQty}</span> ед.
                <div className="text-xs text-muted-foreground mt-1">Собрано коробов: {pickOrder.boxes.length}</div>
              </div>
              {pickOrder.boxes.length > 0 && (
                <div className="space-y-1 text-xs">
                  {pickOrder.boxes.map((b) => (
                    <div key={b.boxNumber} className="flex items-center gap-2 text-muted-foreground">
                      <Package className="w-3 h-3" />
                      <span className="font-mono">{b.boxNumber}</span> · {b.qty} ед. · {b.pickerName} · этикетка напечатана
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeBoxAndPrint} disabled={pickedQty === 0}>
              <Printer className="w-4 h-4 mr-1" />Закрыть короб и печатать этикетку
            </Button>
            <Button onClick={transferToSenior} disabled={!pickOrder?.boxes.length}>Передать ст. менеджеру</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== СВЕРКА / БАЛАНС / ЯЧЕЙКА ===== */}
      <Dialog open={!!verifyOrder} onOpenChange={(v) => !v && setVerifyOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Сверка поставки {verifyOrder?.orderNumber}</DialogTitle></DialogHeader>
          {verifyOrder && (
            <div className="space-y-3">
              <div className="text-sm">План: <b>{plannedQty(verifyOrder)}</b> ед. · собрано сотрудником: <b>{pickedTotal(verifyOrder)}</b> ед.</div>
              <div><Label className="text-xs">Фактическое количество (пересчёт)</Label><Input type="number" value={factQty} onChange={(e) => setFactQty(e.target.value)} /></div>
              <div>
                <Label className="text-xs">Комментарий для клиента (при расхождении в большую/меньшую сторону)</Label>
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
              </div>
              <div>
                <Label className="text-xs">Ячейка хранения (стеллаж.секция.этаж.короб)</Label>
                <Input value={cell} onChange={(e) => setCell(e.target.value)} placeholder="2.5.1.3" className="font-mono" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={confirmVerify}><CheckCircle2 className="w-4 h-4 mr-1" />Сверить</Button>
            <Button onClick={putOnBalance} disabled={verifyOrder?.status !== "verified"}>
              <MapPin className="w-4 h-4 mr-1" />На баланс + ячейка
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReceiptOrdersPage;