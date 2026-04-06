import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScanLine, FileText, Package } from "lucide-react";

const mockUpds = [
  { id: 1, upd: "УПД-00142", order: "ORD-2041", items: 30, brand: "BasicWear" },
  { id: 2, upd: "УПД-00143", order: "ORD-2041", items: 25, brand: "BasicWear" },
  { id: 3, upd: "УПД-00144", order: "ORD-2042", items: 40, brand: "DenimPro" },
  { id: 4, upd: "УПД-00145", order: "ORD-2044", items: 50, brand: "BasicWear" },
  { id: 5, upd: "УПД-00146", order: "ORD-2042", items: 35, brand: "DenimPro" },
];

const mockShipments = [
  { id: 1, number: "SHP-001", upds: ["УПД-00140", "УПД-00141"], totalItems: 90, date: "28.03.2026", destination: "Wildberries" },
  { id: 2, number: "SHP-002", upds: ["УПД-00138", "УПД-00139"], totalItems: 75, date: "25.03.2026", destination: "OZON" },
];

const ShippingPage = () => {
  const [shippingMode, setShippingMode] = useState(false);
  const [scannedIds, setScannedIds] = useState<number[]>([]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Отгрузка товара"
        description="Формирование паллет и отправка на маркетплейсы"
        actions={
          shippingMode ? (
            <Button size="sm" onClick={() => { setShippingMode(false); setScannedIds([]); }}>
              Завершить отгрузку
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShippingMode(true)}>
              <Package className="w-4 h-4 mr-2" />
              Начать отгрузку
            </Button>
          )
        }
      />

      <div className="p-6 space-y-6 flex-1">
        <div>
          <h2 className="text-sm font-medium text-foreground mb-3">Доступные УПД</h2>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-medium">УПД</TableHead>
                  <TableHead className="text-xs font-medium">Заказ</TableHead>
                  <TableHead className="text-xs font-medium">Бренд</TableHead>
                  <TableHead className="text-xs font-medium text-right">Товаров</TableHead>
                  {shippingMode && <TableHead className="text-xs font-medium w-24"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockUpds.map((u) => {
                  const scanned = scannedIds.includes(u.id);
                  return (
                    <TableRow key={u.id} className={scanned ? "bg-success/5" : ""}>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                          {u.upd}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.order}</TableCell>
                      <TableCell className="text-sm">{u.brand}</TableCell>
                      <TableCell className="text-sm text-right font-medium">{u.items}</TableCell>
                      {shippingMode && (
                        <TableCell>
                          {!scanned && (
                            <Button variant="ghost" size="sm" onClick={() => setScannedIds((p) => [...p, u.id])}>
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

        <div>
          <h2 className="text-sm font-medium text-foreground mb-3">Завершённые отгрузки</h2>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-medium">Номер</TableHead>
                  <TableHead className="text-xs font-medium">УПД</TableHead>
                  <TableHead className="text-xs font-medium text-right">Всего товаров</TableHead>
                  <TableHead className="text-xs font-medium">Направление</TableHead>
                  <TableHead className="text-xs font-medium">Дата</TableHead>
                  <TableHead className="text-xs font-medium">Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockShipments.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-sm font-medium">{s.number}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.upds.join(", ")}</TableCell>
                    <TableCell className="text-sm text-right">{s.totalItems}</TableCell>
                    <TableCell className="text-sm">{s.destination}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.date}</TableCell>
                    <TableCell><StatusBadge status="success" label="Отгружено" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShippingPage;
