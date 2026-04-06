import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ScanLine, FileText } from "lucide-react";

const mockStock = [
  { id: 1, upd: "УПД-00142", name: "Футболка базовая белая", article: "FB-001", qty: 120, brand: "BasicWear", date: "02.04.2026", status: "На складе" },
  { id: 2, upd: "УПД-00143", name: "Джинсы slim fit", article: "JS-045", qty: 80, brand: "DenimPro", date: "01.04.2026", status: "На складе" },
  { id: 3, upd: "УПД-00144", name: "Кроссовки спортивные", article: "KS-112", qty: 45, brand: "RunStyle", date: "31.03.2026", status: "На складе" },
  { id: 4, upd: "УПД-00145", name: "Худи оверсайз", article: "HO-023", qty: 200, brand: "BasicWear", date: "30.03.2026", status: "Инвентаризация" },
  { id: 5, upd: "УПД-00146", name: "Рюкзак городской", article: "RG-008", qty: 60, brand: "UrbanBag", date: "29.03.2026", status: "На складе" },
  { id: 6, upd: "УПД-00147", name: "Шапка вязаная", article: "SV-019", qty: 150, brand: "WarmHead", date: "28.03.2026", status: "На складе" },
];

const StockPage = () => {
  const [search, setSearch] = useState("");
  const [inventoryMode, setInventoryMode] = useState(false);
  const [scannedIds, setScannedIds] = useState<number[]>([]);

  const filtered = mockStock.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.upd.toLowerCase().includes(search.toLowerCase()) ||
      item.article.toLowerCase().includes(search.toLowerCase())
  );

  const handleScan = (id: number) => {
    setScannedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Сток / Инвентаризация"
        description="Общий список остатков товара на складе"
        actions={
          inventoryMode ? (
            <Button
              variant="default"
              size="sm"
              onClick={() => { setInventoryMode(false); setScannedIds([]); }}
            >
              Завершить инвентаризацию
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setInventoryMode(true)}>
              <ScanLine className="w-4 h-4 mr-2" />
              Инвентаризация
            </Button>
          )
        }
      />

      <div className="p-6 space-y-4 flex-1">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, артикулу, УПД..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-medium">УПД</TableHead>
                <TableHead className="text-xs font-medium">Наименование</TableHead>
                <TableHead className="text-xs font-medium">Артикул</TableHead>
                <TableHead className="text-xs font-medium text-right">Кол-во</TableHead>
                <TableHead className="text-xs font-medium">Бренд</TableHead>
                <TableHead className="text-xs font-medium">Дата</TableHead>
                <TableHead className="text-xs font-medium">Статус</TableHead>
                {inventoryMode && <TableHead className="text-xs font-medium w-24"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const scanned = scannedIds.includes(item.id);
                return (
                  <TableRow
                    key={item.id}
                    className={
                      inventoryMode
                        ? scanned
                          ? "bg-success/5"
                          : "bg-destructive/5"
                        : ""
                    }
                  >
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        {item.upd}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{item.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.article}</TableCell>
                    <TableCell className="text-sm text-right font-medium">{item.qty}</TableCell>
                    <TableCell className="text-sm">{item.brand}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.date}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={item.status === "Инвентаризация" ? "warning" : "success"}
                        label={item.status}
                      />
                    </TableCell>
                    {inventoryMode && (
                      <TableCell>
                        {!scanned && (
                          <Button variant="ghost" size="sm" onClick={() => handleScan(item.id)}>
                            <ScanLine className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default StockPage;
