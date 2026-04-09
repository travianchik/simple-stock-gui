import { Button } from "@/components/ui/button";
import { Download, Upload, FileText, Printer } from "lucide-react";

export interface UPDDocumentData {
  number: string;
  date: string;
  seller?: string;
  sellerAddress?: string;
  sellerINN?: string;
  buyer?: string;
  buyerAddress?: string;
  currency?: string;
  items: {
    article: string;
    name: string;
    qty: number;
    unit?: string;
    price?: number;
    total?: number;
    vatRate?: string;
    vatAmount?: number;
    totalWithVat?: number;
    barcode?: string;
  }[];
  totalQty?: number;
  totalAmount?: number;
  totalVat?: number;
  totalWithVat?: number;
  uploadedFile?: File | null;
  uploadedFileUrl?: string | null;
}

interface UPDDocumentProps {
  data: UPDDocumentData;
  onDownload?: () => void;
  onUpload?: (file: File) => void;
  showUpload?: boolean;
}

const UPDDocument = ({ data, onDownload, onUpload, showUpload }: UPDDocumentProps) => {
  const totalQty = data.totalQty ?? data.items.reduce((s, i) => s + i.qty, 0);
  const totalAmount = data.totalAmount ?? data.items.reduce((s, i) => s + (i.total ?? i.qty * (i.price ?? 0)), 0);
  const totalVat = data.totalVat ?? data.items.reduce((s, i) => s + (i.vatAmount ?? 0), 0);
  const totalWithVat = data.totalWithVat ?? data.items.reduce((s, i) => s + (i.totalWithVat ?? i.total ?? 0), 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpload) onUpload(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-3">
      {/* Uploaded file preview */}
      {data.uploadedFileUrl && (
        <div className="rounded border border-border overflow-hidden bg-white">
          {data.uploadedFileUrl.startsWith("data:image") || data.uploadedFileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
            <img src={data.uploadedFileUrl} alt="УПД скан" className="w-full max-h-[500px] object-contain" />
          ) : (
            <div className="p-4 flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <div className="text-sm font-medium">Загруженный файл УПД</div>
                <div className="text-xs text-muted-foreground">{data.uploadedFile?.name || "Документ"}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* UPD Document — styled like official form */}
      <div className="border border-border rounded bg-white text-black text-[11px] leading-tight overflow-auto">
        {/* Header */}
        <div className="p-3 border-b border-border">
          <div className="flex justify-between items-start">
            <div>
              <span className="font-bold text-xs">Универсальный передаточный документ</span>
            </div>
            <div className="text-[9px] text-gray-500 text-right max-w-[200px]">
              Приложение № 1 к постановлению Правительства РФ от 26 декабря 2011 г. № 1137
            </div>
          </div>
          <div className="mt-1">
            <span className="font-semibold">Счёт-фактура №</span>{" "}
            <span className="border-b border-black px-1">{data.number}</span>{" "}
            <span>от</span>{" "}
            <span className="border-b border-black px-1">{data.date}</span>
            <span className="ml-3 text-gray-500">(1)</span>
          </div>
        </div>

        {/* Seller / Buyer info */}
        <div className="p-3 border-b border-border space-y-1">
          <div className="flex gap-2">
            <span className="text-gray-600 min-w-[110px]">Продавец:</span>
            <span className="font-medium">{data.seller || 'ООО "Свой Склад"'}</span>
            <span className="text-gray-500 ml-1">(2)</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-600 min-w-[110px]">Адрес:</span>
            <span>{data.sellerAddress || "г. Москва"}</span>
            <span className="text-gray-500 ml-1">(2а)</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-600 min-w-[110px]">ИНН/КПП:</span>
            <span className="font-mono">{data.sellerINN || "0000000000/000000000"}</span>
            <span className="text-gray-500 ml-1">(2б)</span>
          </div>
          <div className="flex gap-2 mt-2">
            <span className="text-gray-600 min-w-[110px]">Покупатель:</span>
            <span className="font-medium">{data.buyer || "—"}</span>
            <span className="text-gray-500 ml-1">(6)</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-600 min-w-[110px]">Адрес:</span>
            <span>{data.buyerAddress || "—"}</span>
            <span className="text-gray-500 ml-1">(6а)</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-600 min-w-[110px]">Валюта:</span>
            <span>{data.currency || "Российский рубль, 643"}</span>
            <span className="text-gray-500 ml-1">(7)</span>
          </div>
        </div>

        {/* Items table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 p-1 text-center font-medium w-8">№ п/п</th>
                <th className="border border-gray-300 p-1 text-center font-medium w-10">Код товара</th>
                <th className="border border-gray-300 p-1 text-center font-medium min-w-[140px]">
                  Наименование товара<br /><span className="font-normal text-gray-500">(описание)</span>
                </th>
                <th className="border border-gray-300 p-1 text-center font-medium w-12">Ед. изм.</th>
                <th className="border border-gray-300 p-1 text-center font-medium w-14">Кол-во</th>
                <th className="border border-gray-300 p-1 text-center font-medium w-16">
                  Цена<br />(тариф)
                </th>
                <th className="border border-gray-300 p-1 text-center font-medium w-20">
                  Стоимость<br />без налога
                </th>
                <th className="border border-gray-300 p-1 text-center font-medium w-12">
                  Налог.<br />ставка
                </th>
                <th className="border border-gray-300 p-1 text-center font-medium w-16">
                  Сумма<br />налога
                </th>
                <th className="border border-gray-300 p-1 text-center font-medium w-20">
                  Стоимость<br />с налогом
                </th>
              </tr>
              <tr className="bg-gray-50 text-gray-500">
                <td className="border border-gray-300 p-0.5 text-center">А</td>
                <td className="border border-gray-300 p-0.5 text-center">Б</td>
                <td className="border border-gray-300 p-0.5 text-center">1</td>
                <td className="border border-gray-300 p-0.5 text-center">2</td>
                <td className="border border-gray-300 p-0.5 text-center">3</td>
                <td className="border border-gray-300 p-0.5 text-center">4</td>
                <td className="border border-gray-300 p-0.5 text-center">5</td>
                <td className="border border-gray-300 p-0.5 text-center">7</td>
                <td className="border border-gray-300 p-0.5 text-center">8</td>
                <td className="border border-gray-300 p-0.5 text-center">9</td>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => {
                const price = item.price ?? 0;
                const total = item.total ?? item.qty * price;
                const vatRate = item.vatRate ?? "20%";
                const vatAmount = item.vatAmount ?? Math.round(total * 0.2 * 100) / 100;
                const totalWithVat = item.totalWithVat ?? total + vatAmount;
                return (
                  <tr key={idx}>
                    <td className="border border-gray-300 p-1 text-center">{idx + 1}</td>
                    <td className="border border-gray-300 p-1 font-mono text-[9px]">{item.article}</td>
                    <td className="border border-gray-300 p-1">{item.name}</td>
                    <td className="border border-gray-300 p-1 text-center">{item.unit ?? "шт"}</td>
                    <td className="border border-gray-300 p-1 text-center font-medium">{item.qty.toLocaleString("ru-RU")}</td>
                    <td className="border border-gray-300 p-1 text-right">{price > 0 ? price.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) : "—"}</td>
                    <td className="border border-gray-300 p-1 text-right">{total > 0 ? total.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) : "—"}</td>
                    <td className="border border-gray-300 p-1 text-center">{vatRate}</td>
                    <td className="border border-gray-300 p-1 text-right">{vatAmount > 0 ? vatAmount.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) : "—"}</td>
                    <td className="border border-gray-300 p-1 text-right font-medium">{totalWithVat > 0 ? totalWithVat.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-medium">
                <td colSpan={4} className="border border-gray-300 p-1 text-right">Всего к оплате</td>
                <td className="border border-gray-300 p-1 text-center">{totalQty}</td>
                <td className="border border-gray-300 p-1"></td>
                <td className="border border-gray-300 p-1 text-right">{totalAmount > 0 ? totalAmount.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) : "—"}</td>
                <td className="border border-gray-300 p-1 text-center">X</td>
                <td className="border border-gray-300 p-1 text-right">{totalVat > 0 ? totalVat.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) : "—"}</td>
                <td className="border border-gray-300 p-1 text-right font-medium">{totalWithVat > 0 ? totalWithVat.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) : "—"}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer / signatures */}
        <div className="p-3 border-t border-border space-y-2">
          <div className="flex gap-8 text-[10px]">
            <div>
              <span className="text-gray-500">Руководитель организации</span>
              <div className="mt-1 border-b border-gray-400 w-32 text-center text-[9px] text-gray-400">(подпись)</div>
            </div>
            <div>
              <span className="text-gray-500">Главный бухгалтер</span>
              <div className="mt-1 border-b border-gray-400 w-32 text-center text-[9px] text-gray-400">(подпись)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end">
        {showUpload && (
          <label>
            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={handleFileChange} />
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                Загрузить УПД
              </span>
            </Button>
          </label>
        )}
        {onDownload && (
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="w-4 h-4 mr-2" />
            Скачать УПД
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />
          Печать
        </Button>
      </div>
    </div>
  );
};

export default UPDDocument;
