import { Fragment, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Upload, Plus, ScanLine, CheckCircle2, Download, UserPlus, Play, Pencil, Eye,
  ChevronLeft, Search, PackagePlus, Printer, ScanBarcode, Package, Tag, X,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import UplLabel from "@/components/UplLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRoles } from "@/contexts/RoleContext";
import { useOrbita, type ReceiveMethod, type ReceiveOrderItem, type ReceiveOrderStatus, type UplBox } from "@/contexts/OrbitaContext";

const statusMap: Record<ReceiveOrderStatus, { label: string; status: "default" | "warning" | "success" }> = {
  new: { label: "Новый", status: "default" },
  in_progress: { label: "В работе", status: "warning" },
  done: { label: "Завершён", status: "success" },
};

const num = (v: unknown) => {
  const n = Number.parseFloat(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : 0;
};

const orderNumber = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `ORD-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${Math.floor(
    Math.random() * 9000 + 1000
  )}`;
};

const ReceivingPage = () => {
  const {
    orders, boxes, scans, addOrder, assignEmployees, setOrderStatus,
    openBox, addToBox, closeBox, finishOrder, boxesOfOrder, pickedQty,
  } = useOrbita();
  const { users } = useRoles();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  /* список */
  const [tab, setTab] = useState<"active" | "done">("active");
  const [search, setSearch] = useState("");
  const [mpFilter, setMpFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  /* создание */
  const [createOpen, setCreateOpen] = useState(false);
  const [newMethod, setNewMethod] = useState<ReceiveMethod>("kiz");
  const [newName, setNewName] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [newItems, setNewItems] = useState<ReceiveOrderItem[]>([]);

  /* назначение сотрудников */
  const [assignOrderId, setAssignOrderId] = useState<number | null>(null);
  const [assignSel, setAssignSel] = useState<number[]>([]);

  /* статус */
  const [statusOrderId, setStatusOrderId] = useState<number | null>(null);

  /* детальная страница */
  const [openOrderId, setOpenOrderId] = useState<number | null>(null);
  const [activeBoxId, setActiveBoxId] = useState<number | null>(null);
  const [scanValue, setScanValue] = useState("");
  const [labelBox, setLabelBox] = useState<UplBox | null>(null);
  const [posSearch, setPosSearch] = useState("");

  const employees = users;
  const openOrder = orders.find((o) => o.id === openOrderId) || null;
  const activeBox = boxes.find((b) => b.id === activeBoxId) || null;

  const mpList = useMemo(
    () => Array.from(new Set(orders.map((o) => o.mp).filter(Boolean))) as string[],
    [orders]
  );

  const filtered = orders
    .filter((o) => (tab === "done" ? o.status === "done" : o.status !== "done"))
    .filter((o) => {
      const q = search.trim().toLowerCase();
      return !q || o.number.toLowerCase().includes(q) || (o.brand ?? "").toLowerCase().includes(q);
    })
    .filter((o) => mpFilter === "all" || o.mp === mpFilter)
    .filter((o) => statusFilter === "all" || o.status === statusFilter);

  const totalQty = (id: number) => orders.find((o) => o.id === id)?.items.reduce((s, i) => s + i.qty, 0) ?? 0;
  const scannedQty = (id: number) => {
    const o = orders.find((x) => x.id === id);
    return o ? o.items.reduce((s, i) => s + pickedQty(o.id, i.shk), 0) : 0;
  };
  const employeeNames = (id: number) => {
    const o = orders.find((x) => x.id === id);
    const ids = o?.assigneeIds ?? (o?.assigneeId ? [o.assigneeId] : []);
    const names = ids.map((i) => users.find((u) => u.id === i)?.name).filter(Boolean);
    return names.length ? names.join(", ") : "—";
  };

  /* ---------- файл заказа ---------- */
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
          shk: get(r, "штрих-код", "Штрих", "ШК", "Баркод"),
          gtin: get(r, "GTIN"),
          wbArticle: get(r, "Артикул WB", "Ozon"),
          unit: get(r, "Единица", "Ед") || "шт",
          qty: num(get(r, "Количество", "Кол-во", "Всего")) || 1,
          kizes: get(r, "Честный знак", "КИЗ", "KIZ") ? [get(r, "Честный знак", "КИЗ", "KIZ")] : [],
        }))
        .filter((i) => i.shk || i.article);
      if (!items.length) {
        toast({ title: "Файл не распознан", description: "Нет строк с товаром.", variant: "destructive" });
        return;
      }
      setNewItems(items);
      setNewFileName(file.name);
      toast({ title: "Файл прочитан", description: `Позиций: ${items.length}` });
    } catch {
      toast({ title: "Ошибка чтения файла", description: "Ожидается Excel/CSV (.xlsx, .xls, .csv).", variant: "destructive" });
    }
  };

  const createOrder = () => {
    if (!newItems.length) {
      toast({ title: "Загрузите Excel-файл со списком товаров", variant: "destructive" });
      return;
    }
    addOrder({
      number: orderNumber(),
      method: newMethod,
      fileName: newFileName || newName,
      assigneeId: null,
      assigneeIds: [],
      items: newItems,
    });
    setCreateOpen(false);
    setNewItems([]);
    setNewFileName("");
    setNewName("");
    toast({ title: "Заказ создан" });
  };

  /* ---------- короба / пикинг ---------- */
  const enterOrder = (id: number) => {
    setOpenOrderId(id);
    const opened = boxesOfOrder(id).find((b) => !b.closed);
    setActiveBoxId(opened ? opened.id : null);
    setScanValue("");
  };

  const handleOpenBox = () => {
    if (openOrderId == null) return;
    const box = openBox(openOrderId);
    setActiveBoxId(box.id);
    toast({ title: `Короб открыт: ${box.uplNumber}`, description: `Ячейка ${box.cell}` });
  };

  const handleScan = (raw?: string) => {
    if (!openOrder) return;
    if (!activeBox) {
      toast({ title: "Откройте короб", description: "Перед сканированием нужно открыть короб.", variant: "destructive" });
      return;
    }
    const code = (raw ?? scanValue).trim();
    if (!code) return;
    const item =
      openOrder.items.find((i) => i.shk === code) ||
      openOrder.items.find((i) => (i.kizes ?? []).some((k) => k === code)) ||
      openOrder.items.find((i) => (i.shk && code.includes(i.shk)) || (i.article && code.includes(i.article)));
    if (!item) {
      toast({ title: "Товар не найден в заказе", description: code, variant: "destructive" });
      setScanValue("");
      return;
    }
    if (pickedQty(openOrder.id, item.shk) >= item.qty) {
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
      kiz: openOrder.method === "kiz" ? (code.length > 14 ? code : item.kizes?.[0]) : undefined,
    });
    setScanValue("");
  };

  const emulateScan = () => {
    if (!openOrder) return;
    const item = openOrder.items.find((i) => pickedQty(openOrder.id, i.shk) < i.qty);
    if (!item) {
      toast({ title: "Все позиции собраны" });
      return;
    }
    handleScan(openOrder.method === "kiz" ? item.kizes?.[0] || item.shk : item.shk);
  };

  const handleCloseBox = () => {
    if (!activeBox) return;
    closeBox(activeBox.id);
    setLabelBox({ ...activeBox, closed: true, closedAt: new Date().toLocaleString("ru-RU") });
    setActiveBoxId(null);
    toast({ title: `Короб ${activeBox.uplNumber} закрыт`, description: "УПЛ можно печатать." });
  };

  const handleFinish = (orderId: number) => {
    const open = boxesOfOrder(orderId).find((b) => !b.closed);
    if (open) {
      toast({ title: "Есть незакрытый короб", description: `Закройте ${open.uplNumber} перед завершением.`, variant: "destructive" });
      return;
    }
    finishOrder(orderId);
    toast({ title: "Приёмка завершена", description: "Товар передан в Сток." });
    setOpenOrderId(null);
  };

  const exportRows = (rows: Record<string, unknown>[], sheet: string, file: string) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheet);
    XLSX.writeFile(wb, file);
  };

  /* ================= ДЕТАЛЬНАЯ СТРАНИЦА ================= */
  if (openOrder) {
    const orderScans = scans.filter((s) => s.orderId === openOrder.id);
    const plan = totalQty(openOrder.id);
    const done = scannedQty(openOrder.id);
    const pct = plan ? Math.round((done / plan) * 100) : 0;
    const orderBoxes = boxesOfOrder(openOrder.id);
    const positions = openOrder.items.filter((i) => {
      const q = posSearch.trim().toLowerCase();
      return !q || i.shk.toLowerCase().includes(q) || i.article.toLowerCase().includes(q);
    });

    const posTable = (list: ReceiveOrderItem[], caption?: string) => (
      <div className="border border-border rounded-lg bg-card overflow-hidden">
        {caption && <div className="px-4 py-2.5 text-xs text-muted-foreground border-b border-border">{caption}</div>}
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2.5">#</th>
              <th className="text-left px-3 py-2.5">Штрих-код</th>
              <th className="text-left px-3 py-2.5">Честный знак</th>
              <th className="text-left px-3 py-2.5">Артикул</th>
              <th className="text-left px-3 py-2.5">Наименование</th>
              <th className="text-left px-3 py-2.5">Размер</th>
              <th className="text-right px-3 py-2.5">Ожидается</th>
              <th className="text-right px-3 py-2.5">Отсканировано</th>
            </tr>
          </thead>
          <tbody>
            {list.map((i, idx) => (
              <tr key={`${i.shk}-${idx}`} className="border-t border-border hover:bg-muted/30">
                <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                <td className="px-3 py-2 font-mono text-xs">{i.shk || "—"}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground truncate max-w-[160px]">
                  {i.kizes?.[0] ?? "—"}
                </td>
                <td className="px-3 py-2">{i.article}</td>
                <td className="px-3 py-2">{i.name}</td>
                <td className="px-3 py-2">{i.size}</td>
                <td className="px-3 py-2 text-right">{i.qty}</td>
                <td className="px-3 py-2 text-right font-semibold">{pickedQty(openOrder.id, i.shk)}</td>
              </tr>
            ))}
            {!list.length && (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">Позиций нет</td></tr>
            )}
          </tbody>
        </table>
      </div>
    );

    return (
      <div className="flex flex-col h-full">
        <PageHeader
          title={`Приёмка ${openOrder.number}`}
          actions={
            <>
              <Button size="sm" variant="outline" onClick={() =>
                exportRows(
                  orderScans.map((s, i) => ({ "#": i + 1, УПЛ: s.uplNumber, Артикул: s.article, Размер: s.size, "Штрих-код": s.shk, "Честный знак": s.kiz ?? "", Время: s.at })),
                  "Сканирования",
                  `Сканирования_${openOrder.number}.xlsx`
                )}>
                <Download className="w-4 h-4 mr-2" /> Сканирования
              </Button>
              <Button size="sm" variant="outline" onClick={() =>
                exportRows(
                  openOrder.items.map((i, idx) => ({ "#": idx + 1, "Штрих-код": i.shk, "Честный знак": i.kizes?.[0] ?? "", Артикул: i.article, Наименование: i.name, Размер: i.size, Ожидается: i.qty, Отсканировано: pickedQty(openOrder.id, i.shk) })),
                  "Позиции",
                  `Позиции_${openOrder.number}.xlsx`
                )}>
                <Download className="w-4 h-4 mr-2" /> Позиции
              </Button>
              <Button size="sm" variant="outline" onClick={() => setOpenOrderId(null)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Назад
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setAssignOrderId(openOrder.id); setAssignSel(openOrder.assigneeIds ?? []); }}>
                <UserPlus className="w-4 h-4 mr-2" /> Сотрудники
              </Button>
              <Button size="sm" variant="outline" onClick={() => setStatusOrderId(openOrder.id)}>
                <Pencil className="w-4 h-4 mr-2" /> Статус
              </Button>
            </>
          }
        />

        <div className="flex-1 overflow-auto p-6 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Прогресс сканирования</span>
              <span className="flex items-center gap-2">
                {done} / {plan} ({pct}%)
                <StatusBadge {...statusMap[openOrder.status]} />
              </span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>

          <div className="flex justify-end">
            <Button size="sm" onClick={() => handleFinish(openOrder.id)}>
              <CheckCircle2 className="w-4 h-4 mr-2" /> Завершить приём
            </Button>
          </div>

          {/* Короба и УПЛ */}
          <div className="border border-border rounded-lg bg-card p-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="font-semibold text-sm">Короба и упаковочные листы</h2>
                <p className="text-xs text-muted-foreground">
                  Метод: {openOrder.method === "kiz" ? "сканирование КИЗ (Честный знак)" : "сканирование штрих-кода"} · коробов: {orderBoxes.length}
                </p>
              </div>
              <div className="flex gap-2">
                {!activeBox ? (
                  <Button size="sm" onClick={handleOpenBox}>
                    <PackagePlus className="w-4 h-4 mr-2" /> Открыть короб
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={emulateScan}>
                      <ScanBarcode className="w-4 h-4 mr-2" /> Эмулировать скан
                    </Button>
                    <Button size="sm" onClick={handleCloseBox}>
                      <Printer className="w-4 h-4 mr-2" /> Закрыть короб и печатать УПЛ
                    </Button>
                  </>
                )}
              </div>
            </div>

            {activeBox && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <Label>{openOrder.method === "kiz" ? "Сканируйте КИЗ" : "Сканируйте штрих-код товара"}</Label>
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      value={scanValue}
                      onChange={(e) => setScanValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleScan()}
                      placeholder={openOrder.method === "kiz" ? "КИЗ / DataMatrix" : "Баркод товара"}
                    />
                    <Button onClick={() => handleScan()}><ScanLine className="w-4 h-4 mr-1" /> В короб</Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Активный короб: <b>{activeBox.uplNumber}</b> · ячейка {activeBox.cell} · в коробе{" "}
                    {activeBox.items.reduce((s, i) => s + i.qty, 0)} шт
                  </div>
                </div>
                <UplLabel box={activeBox} />
              </div>
            )}

            {!!orderBoxes.length && (
              <table className="w-full text-sm border border-border rounded overflow-hidden">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">№ УПЛ</th>
                    <th className="text-left px-3 py-2">ШК УПЛ</th>
                    <th className="text-left px-3 py-2">Ячейка</th>
                    <th className="text-right px-3 py-2">Кол-во</th>
                    <th className="text-left px-3 py-2">Статус</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {orderBoxes.map((b) => (
                    <tr key={b.id} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{b.uplNumber}</td>
                      <td className="px-3 py-2 font-mono text-xs">{b.uplBarcode}</td>
                      <td className="px-3 py-2 font-mono text-xs">{b.cell}</td>
                      <td className="px-3 py-2 text-right">{b.items.reduce((s, i) => s + i.qty, 0)}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={b.closed ? "success" : "warning"} label={b.closed ? "Закрыт" : "Открыт"} />
                      </td>
                      <td className="px-3 py-2 text-right space-x-1">
                        {!b.closed && b.id !== activeBoxId && (
                          <Button size="sm" variant="ghost" onClick={() => setActiveBoxId(b.id)}>Продолжить</Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setLabelBox(b)}>
                          <Printer className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <Tabs defaultValue="scans">
            <TabsList>
              <TabsTrigger value="scans"><ScanLine className="w-3.5 h-3.5 mr-1.5" /> Сканирования</TabsTrigger>
              <TabsTrigger value="last">
                <Package className="w-3.5 h-3.5 mr-1.5" /> Последние позиции
                <span className="ml-1.5 text-[10px] text-muted-foreground">{Math.min(10, openOrder.items.length)}</span>
              </TabsTrigger>
              <TabsTrigger value="all">
                <Tag className="w-3.5 h-3.5 mr-1.5" /> Все позиции
                <span className="ml-1.5 text-[10px] text-muted-foreground">{openOrder.items.length}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scans" className="mt-4">
              {orderScans.length ? (
                <div className="border border-border rounded-lg bg-card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2.5">#</th>
                        <th className="text-left px-3 py-2.5">Время</th>
                        <th className="text-left px-3 py-2.5">УПЛ</th>
                        <th className="text-left px-3 py-2.5">Штрих-код</th>
                        <th className="text-left px-3 py-2.5">Честный знак</th>
                        <th className="text-left px-3 py-2.5">Артикул</th>
                        <th className="text-left px-3 py-2.5">Размер</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderScans.map((s, i) => (
                        <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                          <td className="px-3 py-2 text-muted-foreground">{orderScans.length - i}</td>
                          <td className="px-3 py-2 text-xs">{s.at}</td>
                          <td className="px-3 py-2">{s.uplNumber}</td>
                          <td className="px-3 py-2 font-mono text-xs">{s.shk}</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground truncate max-w-[160px]">{s.kiz ?? "—"}</td>
                          <td className="px-3 py-2">{s.article}</td>
                          <td className="px-3 py-2">{s.size}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="border border-border rounded-lg bg-card py-16 text-center">
                  <ScanLine className="w-8 h-8 mx-auto text-muted-foreground/50" />
                  <p className="mt-3 text-sm text-muted-foreground">Нет отсканированных позиций</p>
                  <p className="text-xs text-muted-foreground/80">
                    Начните сканирование, чтобы увидеть здесь последние отсканированные товары
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="last" className="mt-4">
              {posTable(openOrder.items.slice(0, 10), "Топ-10 позиций, отсортированных по дате обновления")}
            </TabsContent>

            <TabsContent value="all" className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">{openOrder.items.length} позиций</span>
                <div className="relative w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9 h-9" placeholder="Поиск по баркоду..." value={posSearch} onChange={(e) => setPosSearch(e.target.value)} />
                </div>
              </div>
              {posTable(positions)}
            </TabsContent>
          </Tabs>
        </div>

        {renderDialogs()}
      </div>
    );
  }

  /* ================= СПИСОК ЗАКАЗОВ ================= */
  function renderDialogs() {
    const assignTarget = orders.find((o) => o.id === assignOrderId) || null;
    const statusTarget = orders.find((o) => o.id === statusOrderId) || null;
    return (
      <Fragment>
        {/* Создать заказ */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Создать заказ</DialogTitle>
              <DialogDescription>
                Загрузите Excel-файл со списком товаров или создайте заказ из товаров подключённого маркетплейса.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) parseOrderFile(f); e.target.value = ""; }}
              />
              <Button onClick={() => fileRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" /> Загрузить файл
              </Button>
              <div className="border-t border-border pt-4 space-y-2">
                <Label>Название заказа</Label>
                <Input placeholder="Например: Приёмка от 30.05.2026 WB" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">
                Колонки: штрих-код, КИЗ, количество, номер заказа. Номер заказа должен быть одинаковым для всех строк.
              </p>
              <div className="space-y-2">
                <Label>Метод приёмки</Label>
                <Select value={newMethod} onValueChange={(v) => setNewMethod(v as ReceiveMethod)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kiz">КИЗ (Честный знак)</SelectItem>
                    <SelectItem value="shk">Штрих-код</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border border-dashed border-border rounded-lg py-8 text-center text-sm text-muted-foreground hover:bg-muted/30 transition-colors"
              >
                <Upload className="w-5 h-5 mx-auto mb-2" />
                {newFileName || "Выбрать Excel файл (.xlsx, .xls, .csv)"}
                {!!newItems.length && (
                  <div className="mt-1 text-xs">Позиций: {newItems.length} · единиц: {newItems.reduce((s, i) => s + i.qty, 0)}</div>
                )}
              </button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Отмена</Button>
              <Button onClick={createOrder} disabled={!newItems.length}>Создать заказ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Назначить сотрудников */}
        <Dialog open={!!assignTarget} onOpenChange={(o) => !o && setAssignOrderId(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Назначить сотрудников</DialogTitle>
            </DialogHeader>
            <div className="max-h-64 overflow-auto space-y-3 pr-1">
              {employees.map((u) => (
                <label key={u.id} className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={assignSel.includes(u.id)}
                    onCheckedChange={(c) =>
                      setAssignSel((prev) => (c ? [...prev, u.id] : prev.filter((x) => x !== u.id)))
                    }
                  />
                  <span>
                    <span className="block text-sm">{u.name}</span>
                    <span className="block text-xs text-muted-foreground">Сканер: {u.scanner === "—" ? "" : u.scanner}</span>
                  </span>
                </label>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignOrderId(null)}>Отмена</Button>
              <Button
                disabled={!assignSel.length}
                onClick={() => {
                  if (assignTarget) assignEmployees(assignTarget.id, assignSel);
                  setAssignOrderId(null);
                  toast({ title: "Сотрудники назначены" });
                }}
              >
                Назначить ({assignSel.length})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Статус */}
        <Dialog open={!!statusTarget} onOpenChange={(o) => !o && setStatusOrderId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Статус заказа</DialogTitle>
              <DialogDescription>{statusTarget?.number}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {(["new", "in_progress", "done"] as ReceiveOrderStatus[]).map((s) => (
                <Button
                  key={s}
                  variant={statusTarget?.status === s ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => {
                    if (statusTarget) setOrderStatus(statusTarget.id, s);
                    setStatusOrderId(null);
                  }}
                >
                  {statusMap[s].label}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Печать УПЛ */}
        <Dialog open={!!labelBox} onOpenChange={(o) => !o && setLabelBox(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Упаковочный лист {labelBox?.uplNumber}</DialogTitle>
              <DialogDescription>Наклейте УПЛ на короб.</DialogDescription>
            </DialogHeader>
            {labelBox && <UplLabel box={labelBox} />}
          </DialogContent>
        </Dialog>
      </Fragment>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Приёмка товара"
        description="Приём заказов от изготовителей, маркировка и формирование Упаковочных листов"
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Создать заказ
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "active" | "done")}>
          <TabsList>
            <TabsTrigger value="active">Активные</TabsTrigger>
            <TabsTrigger value="done">Завершённые</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Поиск по номеру, бренду..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={mpFilter} onValueChange={setMpFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Все МП" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все МП</SelectItem>
              {mpList.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Все статусы" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="new">Новый</SelectItem>
              <SelectItem value="in_progress">В работе</SelectItem>
              <SelectItem value="done">Завершён</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2.5">Заказ</th>
                <th className="text-left px-3 py-2.5">МП</th>
                <th className="text-left px-3 py-2.5">Бренд</th>
                <th className="text-left px-3 py-2.5">ИП</th>
                <th className="text-right px-3 py-2.5">Товары</th>
                <th className="text-right px-3 py-2.5">Отсканировано</th>
                <th className="text-left px-3 py-2.5">Сотрудники</th>
                <th className="text-left px-3 py-2.5">Статус</th>
                <th className="text-left px-3 py-2.5">Дата</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-3 py-3 font-mono text-xs">{o.number}</td>
                  <td className="px-3 py-3 text-muted-foreground">{o.mp ?? "—"}</td>
                  <td className="px-3 py-3 text-muted-foreground">{o.brand ?? "—"}</td>
                  <td className="px-3 py-3 text-muted-foreground">{o.ip ?? "—"}</td>
                  <td className="px-3 py-3 text-right">{totalQty(o.id)}</td>
                  <td className="px-3 py-3 text-right">{scannedQty(o.id)}</td>
                  <td className="px-3 py-3 text-muted-foreground">{employeeNames(o.id)}</td>
                  <td className="px-3 py-3"><StatusBadge {...statusMap[o.status]} /></td>
                  <td className="px-3 py-3 text-muted-foreground text-xs">{o.createdAt}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <Button size="icon" variant="ghost" title="Назначить сотрудников"
                      onClick={() => { setAssignOrderId(o.id); setAssignSel(o.assigneeIds ?? (o.assigneeId ? [o.assigneeId] : [])); }}>
                      <UserPlus className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Приступить к приёмке" onClick={() => enterOrder(o.id)}>
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Изменить статус" onClick={() => setStatusOrderId(o.id)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Открыть заказ" onClick={() => enterOrder(o.id)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={10} className="px-3 py-12 text-center text-muted-foreground">Заказов нет</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {renderDialogs()}
    </div>
  );
};

export default ReceivingPage;
