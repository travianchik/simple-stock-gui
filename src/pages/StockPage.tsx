import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Download, Upload, RefreshCw, Search, ScanLine, Boxes, FileSpreadsheet } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import UplLabel from "@/components/UplLabel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOrbita, type StockRow, type UplBox } from "@/contexts/OrbitaContext";

const TEMPLATE_HEADERS = [
  "Артикул",
  "Размер",
  "Наименование",
  "ШК",
  "GTIN",
  "Артикул WB/Ozon",
  "Единица хранения",
  "Количество",
];

const num = (v: unknown) => {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/\s/g, "").replace(",", ".");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? Math.round(n) : 0;
};

const StockPage = () => {
  const { stockComputed, importStock, lastWbSync, syncStockToWb, boxes, findBoxByBarcode } = useOrbita();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [articleFilter, setArticleFilter] = useState("all");
  const [scanOpen, setScanOpen] = useState(false);
  const [scanCode, setScanCode] = useState("");
  const [foundBox, setFoundBox] = useState<UplBox | null>(null);
  const [boxDialog, setBoxDialog] = useState<UplBox | null>(null);

  const articles = useMemo(
    () => Array.from(new Set(stockComputed.map((r) => r.article))).sort(),
    [stockComputed]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stockComputed.filter((r) => {
      const okArticle = articleFilter === "all" || r.article === articleFilter;
      const okSearch =
        !q ||
        [r.article, r.name, r.shk, r.gtin, r.wbArticle, r.size].some((f) => String(f).toLowerCase().includes(q));
      return okArticle && okSearch;
    });
  }, [stockComputed, search, articleFilter]);

  const totals = useMemo(
    () => ({
      total: rows.reduce((s, r) => s + r.total, 0),
      reserved: rows.reduce((s, r) => s + r.reserved, 0),
      shipped: rows.reduce((s, r) => s + r.shipped, 0),
      available: rows.reduce((s, r) => s + r.available, 0),
      deficit: rows.reduce((s, r) => s + r.deficit, 0),
    }),
    [rows]
  );

  /* ---------- Скачать пример ---------- */
  const downloadTemplate = () => {
    const example = [
      TEMPLATE_HEADERS,
      ["FAPPE/БРАЗ_КРУЖК/466С", "2XL", "Комплект трусов женских FAPPE/БРАЗ_КРУЖК/466С", "4610547700972", "4610547700972", "288015345", "шт", 552],
      ["FAPPE/БРАЗ_КРУЖК/466С", "M", "Комплект трусов женских FAPPE/БРАЗ_КРУЖК/466С", "2041941632583", "4660546067903", "288015345", "шт", 2694],
    ];
    const ws = XLSX.utils.aoa_to_sheet(example);
    ws["!cols"] = TEMPLATE_HEADERS.map(() => ({ wch: 26 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Сток");
    XLSX.writeFile(wb, "Пример_загрузки_стока.xlsx");
    toast({ title: "Шаблон скачан", description: "Заполните файл и нажмите «Загрузить сток»." });
  };

  /* ---------- Загрузить сток ---------- */
  const handleUpload = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      const parsed: Omit<StockRow, "id">[] = raw
        .map((r) => {
          const get = (...keys: string[]) => {
            for (const k of keys) {
              const found = Object.keys(r).find((rk) => rk.toLowerCase().includes(k.toLowerCase()));
              if (found && String(r[found]).trim() !== "") return String(r[found]).trim();
            }
            return "";
          };
          return {
            article: get("Артикул продавца", "Номенклатура.Артикул", "Артикул"),
            size: get("Размер", "Характеристика"),
            name: get("Наименование", "Номенклатура"),
            shk: get("ШК", "Баркод"),
            gtin: get("GTIN"),
            wbArticle: get("Артикул WB", "Артикул WB/Ozon", "Ozon"),
            unit: get("Единица хранения", "Ед") || "шт",
            total: num(get("Количество", "В наличии Всего", "Всего")),
          };
        })
        .filter((r) => r.shk || r.article);

      if (!parsed.length) {
        toast({ title: "Файл пустой", description: "Не найдено ни одной строки товара.", variant: "destructive" });
        return;
      }
      const res = importStock(parsed);
      toast({
        title: "Сток загружен",
        description: `Новых строк: ${res.added}. Совпало по ШК (количество суммировано): ${res.merged}.`,
      });
    } catch {
      toast({ title: "Ошибка чтения файла", description: "Ожидается файл Excel по шаблону.", variant: "destructive" });
    }
  };

  const exportStock = () => {
    const data = rows.map((r) => ({
      Характеристика: r.size,
      "Номенклатура.Артикул": r.article,
      ШК: r.shk,
      GTIN: r.gtin,
      "Артикул WB": r.wbArticle,
      Номенклатура: r.name,
      "Единица хранения": r.unit,
      Всего: r.total,
      "В резерве": r.reserved,
      Отгрузка: r.shipped,
      Доступно: r.available,
      "К обеспечению": r.toProvide,
      Дефицит: r.deficit || "",
      Излишек: r.surplus || "",
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "Сток");
    XLSX.writeFile(wb, "Сток.xlsx");
  };

  const doScan = () => {
    const box = findBoxByBarcode(scanCode);
    setFoundBox(box ?? null);
    if (!box) toast({ title: "УПЛ не найден", description: "Проверьте штрихкод упаковочного листа.", variant: "destructive" });
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Сток"
        description={
          lastWbSync
            ? `Остатки переданы на WB: ${lastWbSync} (из столбца «Доступно»)`
            : "Остатки товара на складе с динамическими столбцами по FBS"
        }
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Скачать пример
            </Button>
            <Button size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" /> Загрузить сток
            </Button>
            <Button variant="outline" size="sm" onClick={() => { syncStockToWb(); toast({ title: "Остатки отправлены на WB", description: "Переданы значения столбца «Доступно» на все склады продавца." }); }}>
              <RefreshCw className="w-4 h-4 mr-2" /> Обновить остатки на WB
            </Button>
            <Button variant="outline" size="sm" onClick={exportStock}>
              <Download className="w-4 h-4 mr-2" /> Скачать Excel
            </Button>
          </>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="stock">
          <TabsList>
            <TabsTrigger value="stock">Остатки</TabsTrigger>
            <TabsTrigger value="boxes">Короба / УПЛ</TabsTrigger>
          </TabsList>

          {/* ============ ОСТАТКИ ============ */}
          <TabsContent value="stock" className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-72">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-8 h-9"
                  placeholder="Поиск: артикул, ШК, GTIN, артикул WB"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={articleFilter} onValueChange={setArticleFilter}>
                <SelectTrigger className="h-9 w-72">
                  <SelectValue placeholder="Артикул" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все артикулы</SelectItem>
                  {articles.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="ml-auto flex gap-4 text-xs text-muted-foreground">
                <span>Всего: <b className="text-foreground">{totals.total}</b></span>
                <span>В резерве: <b className="text-foreground">{totals.reserved}</b></span>
                <span>Отгрузка: <b className="text-foreground">{totals.shipped}</b></span>
                <span>Доступно: <b className="text-foreground">{totals.available}</b></span>
                {totals.deficit > 0 && <span className="text-destructive">Дефицит: <b>{totals.deficit}</b></span>}
              </div>
            </div>

            <div className="border border-border rounded-lg overflow-auto bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2.5">Характеристика</th>
                    <th className="text-left px-3 py-2.5">Артикул</th>
                    <th className="text-left px-3 py-2.5">ШК</th>
                    <th className="text-left px-3 py-2.5">GTIN</th>
                    <th className="text-left px-3 py-2.5">Артикул WB</th>
                    <th className="text-left px-3 py-2.5">Номенклатура</th>
                    <th className="text-left px-3 py-2.5">Ед.</th>
                    <th className="text-right px-3 py-2.5">Всего</th>
                    <th className="text-right px-3 py-2.5">В резерве</th>
                    <th className="text-right px-3 py-2.5">Отгрузка</th>
                    <th className="text-right px-3 py-2.5">Доступно</th>
                    <th className="text-right px-3 py-2.5">К обеспечению</th>
                    <th className="text-right px-3 py-2.5">Дефицит</th>
                    <th className="text-right px-3 py-2.5">Излишек</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-t border-border ${r.deficit > 0 ? "bg-destructive/10" : "hover:bg-muted/30"}`}
                    >
                      <td className="px-3 py-2">{r.size}</td>
                      <td className="px-3 py-2 font-medium">{r.article}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.shk}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{r.gtin || "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.wbArticle || "—"}</td>
                      <td className="px-3 py-2 max-w-[280px] truncate" title={r.name}>{r.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.unit}</td>
                      <td className="px-3 py-2 text-right">{r.total}</td>
                      <td className="px-3 py-2 text-right">{r.reserved || "—"}</td>
                      <td className="px-3 py-2 text-right">{r.shipped || "—"}</td>
                      <td className={`px-3 py-2 text-right font-semibold ${r.available < 0 ? "text-destructive" : ""}`}>{r.available}</td>
                      <td className="px-3 py-2 text-right">{r.toProvide || "—"}</td>
                      <td className="px-3 py-2 text-right text-destructive">{r.deficit || "—"}</td>
                      <td className="px-3 py-2 text-right">{r.surplus || "—"}</td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={14} className="px-3 py-10 text-center text-muted-foreground">
                        Сток пуст. Скачайте пример, заполните и загрузите файл.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              Доступно = Всего − В резерве − Отгрузка · К обеспечению = В резерве + Отгрузка · Дефицит показывается при
              отрицательном значении «Доступно» (строка подсвечена) · Излишек дублирует «Доступно». На маркетплейс
              передаётся столбец «Доступно».
            </p>
          </TabsContent>

          {/* ============ КОРОБА / УПЛ ============ */}
          <TabsContent value="boxes" className="mt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => { setScanOpen(true); setScanCode(""); setFoundBox(null); }}>
                <ScanLine className="w-4 h-4 mr-2" /> Сканировать ШК УПЛ
              </Button>
              <span className="text-xs text-muted-foreground">Коробов всего: {boxes.length}</span>
            </div>

            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2.5">УПЛ</th>
                    <th className="text-left px-3 py-2.5">ШК УПЛ</th>
                    <th className="text-left px-3 py-2.5">Заказ</th>
                    <th className="text-right px-3 py-2.5">Кол-во в коробе</th>
                    <th className="text-left px-3 py-2.5">Статус</th>
                    <th className="px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {boxes.map((b) => (
                    <tr key={b.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{b.uplNumber}</td>
                      <td className="px-3 py-2 font-mono text-xs">{b.uplBarcode}</td>
                      <td className="px-3 py-2">{b.orderNumber}</td>
                      <td className="px-3 py-2 text-right">{b.items.reduce((s, i) => s + i.qty, 0)}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={b.closed ? "success" : "warning"} label={b.closed ? "Закрыт" : "Открыт"} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setBoxDialog(b)}>
                          <Boxes className="w-4 h-4 mr-1" /> Наполнение
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!boxes.length && (
                    <tr>
                      <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                        Коробов пока нет — они появятся после приёмки товара.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Диалог сканирования УПЛ */}
      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Сканирование ШК упаковочного листа</DialogTitle>
            <DialogDescription>Считайте штрихкод УПЛ — покажем наполнение короба.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              autoFocus
              placeholder="ШК УПЛ или номер УПЛ"
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doScan()}
            />
            <Button onClick={doScan}>Найти</Button>
          </div>
          {foundBox && (
            <div className="mt-2">
              <UplLabel box={foundBox} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Наполнение короба */}
      <Dialog open={!!boxDialog} onOpenChange={(o) => !o && setBoxDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Наполнение короба {boxDialog?.uplNumber}</DialogTitle>
            <DialogDescription>Заказ {boxDialog?.orderNumber} · ШК УПЛ {boxDialog?.uplBarcode}</DialogDescription>
          </DialogHeader>
          {boxDialog && (
            <div className="space-y-3">
              <table className="w-full text-sm border border-border rounded">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2">Артикул</th>
                    <th className="text-left px-3 py-2">Баркод</th>
                    <th className="text-left px-3 py-2">Размер</th>
                    <th className="text-right px-3 py-2">Кол-во</th>
                    <th className="text-left px-3 py-2">КИЗы</th>
                  </tr>
                </thead>
                <tbody>
                  {boxDialog.items.map((i) => (
                    <tr key={i.shk} className="border-t border-border align-top">
                      <td className="px-3 py-2">{i.article}</td>
                      <td className="px-3 py-2 font-mono text-xs">{i.shk}</td>
                      <td className="px-3 py-2">{i.size}</td>
                      <td className="px-3 py-2 text-right">{i.qty}</td>
                      <td className="px-3 py-2 text-[11px] font-mono text-muted-foreground">
                        {i.kizes.length ? i.kizes.join(", ") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <UplLabel box={boxDialog} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockPage;