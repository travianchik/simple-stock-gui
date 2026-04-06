import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScanLine, FileText } from "lucide-react";

const mockReturns = [
  { id: 1, upd: "УПД-00130", order: "ORD-2035", name: "Футболка базовая белая", qty: 10, reason: "Брак", date: "03.04.2026", status: "new" as const },
  { id: 2, upd: "УПД-00131", order: "ORD-2036", name: "Кроссовки спортивные", qty: 5, reason: "Пересорт", date: "02.04.2026", status: "processing" as const },
  { id: 3, upd: "УПД-00132", order: "ORD-2037", name: "Худи оверсайз", qty: 15, reason: "Возврат покупателя", date: "01.04.2026", status: "completed" as const },
];

const statusMap = {
  new: { label: "Новый", type: "default" as const },
  processing: { label: "В обработке", type: "primary" as const },
  completed: { label: "Завершён", type: "success" as const },
};

const ReturnsPage = () => {
  const [returnMode, setReturnMode] = useState(false);
  const [scannedIds, setScannedIds] = useState<number[]>([]);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Возврат товара"
        description="Обработка возвращённого товара"
        actions={
          returnMode ? (
            <Button size="sm" onClick={() => { setReturnMode(false); setScannedIds([]); }}>
              Завершить возврат
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setReturnMode(true)}>
              <ScanLine className="w-4 h-4 mr-2" />
              Запустить возврат
            </Button>
          )
        }
      />

      <div className="p-6 flex-1">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-medium">УПД</TableHead>
                <TableHead className="text-xs font-medium">Заказ</TableHead>
                <TableHead className="text-xs font-medium">Наименование</TableHead>
                <TableHead className="text-xs font-medium text-right">Кол-во</TableHead>
                <TableHead className="text-xs font-medium">Причина</TableHead>
                <TableHead className="text-xs font-medium">Дата</TableHead>
                <TableHead className="text-xs font-medium">Статус</TableHead>
                {returnMode && <TableHead className="text-xs font-medium w-24"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockReturns.map((r) => {
                const scanned = scannedIds.includes(r.id);
                return (
                  <TableRow key={r.id} className={scanned ? "bg-success/5" : ""}>
                    <TableCell className="font-mono text-sm">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        {r.upd}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.order}</TableCell>
                    <TableCell className="text-sm">{r.name}</TableCell>
                    <TableCell className="text-sm text-right font-medium">{r.qty}</TableCell>
                    <TableCell className="text-sm">{r.reason}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.date}</TableCell>
                    <TableCell><StatusBadge status={statusMap[r.status].type} label={statusMap[r.status].label} /></TableCell>
                    {returnMode && (
                      <TableCell>
                        {!scanned && r.status !== "completed" && (
                          <Button variant="ghost" size="sm" onClick={() => setScannedIds((p) => [...p, r.id])}>
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

export default ReturnsPage;
