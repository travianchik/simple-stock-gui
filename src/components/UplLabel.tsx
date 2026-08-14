import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UplBox } from "@/contexts/OrbitaContext";

/** Псевдо-штрихкод (Code128-подобная графика) из цифр номера ШК */
const Barcode = ({ value }: { value: string }) => {
  const bars = value
    .split("")
    .flatMap((ch) => {
      const d = Number(ch) || 1;
      return [d % 4 + 1, (d % 3) + 1];
    });
  return (
    <div className="flex items-end gap-[1px] h-14">
      {bars.map((w, i) => (
        <div
          key={i}
          style={{ width: `${w}px` }}
          className={i % 2 === 0 ? "bg-foreground h-full" : "bg-transparent h-full"}
        />
      ))}
    </div>
  );
};

interface Props {
  box: UplBox;
}

/** Упаковочный лист (УПЛ) — стандартная этикетка короба, редактирование не предусмотрено */
const UplLabel = ({ box }: Props) => {
  const total = box.items.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="space-y-3">
      <div id={`upl-${box.id}`} className="border-2 border-foreground rounded-sm p-4 bg-card text-foreground">
        <div className="text-center">
          <div className="text-base font-bold uppercase tracking-wide">Упаковочный лист</div>
          <div className="text-xs text-muted-foreground">{box.uplNumber} · заказ {box.orderNumber}</div>
        </div>

        <div className="flex flex-col items-center my-3">
          <Barcode value={box.uplBarcode} />
          <div className="font-mono text-sm tracking-[0.2em] mt-1">{box.uplBarcode}</div>
        </div>

        <div className="flex justify-between text-sm font-semibold border-y border-foreground/30 py-1.5">
          <span>Количество в коробе</span>
          <span>{total} шт</span>
        </div>

        <table className="w-full text-[11px] mt-2">
          <thead>
            <tr className="border-b border-foreground/30 text-left">
              <th className="py-1">Артикул</th>
              <th className="py-1">Баркод</th>
              <th className="py-1">Размер</th>
              <th className="py-1 text-right">Кол-во</th>
            </tr>
          </thead>
          <tbody>
            {box.items.map((i) => (
              <tr key={i.shk} className="border-b border-border last:border-0">
                <td className="py-1 pr-2">{i.article}</td>
                <td className="py-1 pr-2 font-mono">{i.shk}</td>
                <td className="py-1 pr-2">{i.size}</td>
                <td className="py-1 text-right">{i.qty}</td>
              </tr>
            ))}
            {!box.items.length && (
              <tr>
                <td colSpan={4} className="py-3 text-center text-muted-foreground">Короб пуст</td>
              </tr>
            )}
          </tbody>
        </table>

        {box.closedAt && (
          <div className="text-[10px] text-muted-foreground mt-2">Закрыт: {box.closedAt}</div>
        )}
      </div>

      <Button variant="outline" size="sm" className="w-full" onClick={() => window.print()}>
        <Printer className="w-4 h-4 mr-2" /> Печать УПЛ
      </Button>
    </div>
  );
};

export default UplLabel;