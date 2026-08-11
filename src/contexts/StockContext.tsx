import React, { createContext, useContext, useState, ReactNode } from "react";

export type SKUKind = "unit" | "set";

export interface SKUItem {
  article: string;
  articleSeller: string;
  name: string;
  qty: number;
  barcode: string;
  price?: number;
  brand: string;
  size?: string;
  chzCodes?: string[];
  dateReceived: string;
  marketplace?: string;
  kind: SKUKind;
  setSize?: number;
}

export interface StockBox {
  id: number;
  boxNumber: string;
  upd: string;
  qty: number;
  brand: string;
  dateReceived: string;
  status: "on_stock" | "missing" | "unchecked";
  ip: string;
  marketplace: string;
  /** Ячейка хранения: стеллаж.секция.этаж.номер короба */
  cell?: string;
  items: SKUItem[];
  uploadedFileUrl?: string | null;
  uploadedFileName?: string | null;
}

const initialBoxes: StockBox[] = [
  {
    id: 1, boxNumber: "КРБ-001", upd: "УПЛ-00142", qty: 73,
    brand: "BasicWear", dateReceived: "02.04.2026", status: "on_stock",
    ip: "ИП Иванов А.А.", marketplace: "Wildberries", cell: "1.2.1.1",
    items: [
      { article: "WB-12345", articleSeller: "FB-001-S", name: "Футболка белая S", qty: 40, barcode: "4607012345671-01", price: 850, brand: "BasicWear", size: "S", dateReceived: "02.04.2026", marketplace: "Wildberries", kind: "unit" },
      { article: "WB-12346", articleSeller: "FB-001-M", name: "Футболка белая M", qty: 3, barcode: "4607012345671-02", price: 850, brand: "BasicWear", size: "M", chzCodes: ["010464007456781921CHZ001", "010464007456781921CHZ002", "010464007456781921CHZ003"], dateReceived: "02.04.2026", marketplace: "Wildberries", kind: "unit" },
      { article: "WB-12347", articleSeller: "FB-001-L", name: "Футболка белая L", qty: 30, barcode: "4607012345671-03", price: 850, brand: "BasicWear", size: "L", dateReceived: "02.04.2026", marketplace: "Wildberries", kind: "unit" },
    ],
  },
  {
    id: 2, boxNumber: "КРБ-002", upd: "УПЛ-00143", qty: 53,
    brand: "DenimPro", dateReceived: "01.04.2026", status: "on_stock",
    ip: "ИП Петров Б.Б.", marketplace: "Ozon", cell: "1.3.2.2",
    items: [
      { article: "OZ-99001", articleSeller: "JS-045-30", name: "Джинсы slim 30", qty: 30, barcode: "4607012345672-01", price: 3200, brand: "DenimPro", size: "30", dateReceived: "01.04.2026", marketplace: "Ozon", kind: "unit" },
      { article: "OZ-99002", articleSeller: "JS-045-32", name: "Джинсы slim 32", qty: 3, barcode: "4607012345672-02", price: 3200, brand: "DenimPro", size: "32", chzCodes: ["010464007456781921YXZ001", "010464007456781921YXZ002", "010464007456781921YXZ003"], dateReceived: "01.04.2026", marketplace: "Ozon", kind: "unit" },
      { article: "OZ-99003", articleSeller: "JS-045-34", name: "Джинсы slim 34", qty: 20, barcode: "4607012345672-03", price: 3200, brand: "DenimPro", size: "34", dateReceived: "01.04.2026", marketplace: "Ozon", kind: "unit" },
    ],
  },
  {
    id: 3, boxNumber: "КРБ-003", upd: "УПЛ-00144", qty: 45,
    brand: "RunStyle", dateReceived: "31.03.2026", status: "on_stock",
    ip: "ИП Иванов А.А.", marketplace: "Wildberries", cell: "2.5.1.3",
    items: [
      { article: "WB-55001", articleSeller: "KS-112-41", name: "Кроссовки 41", qty: 15, barcode: "4607012345673-01", price: 5600, brand: "RunStyle", size: "41", dateReceived: "31.03.2026", marketplace: "Wildberries", kind: "unit" },
      { article: "WB-55002", articleSeller: "KS-112-42", name: "Кроссовки 42", qty: 15, barcode: "4607012345673-02", price: 5600, brand: "RunStyle", size: "42", dateReceived: "31.03.2026", marketplace: "Wildberries", kind: "unit" },
      { article: "WB-55003", articleSeller: "KS-112-43", name: "Кроссовки 43", qty: 15, barcode: "4607012345673-03", price: 5600, brand: "RunStyle", size: "43", dateReceived: "31.03.2026", marketplace: "Wildberries", kind: "unit" },
    ],
  },
  {
    id: 4, boxNumber: "КРБ-004", upd: "УПЛ-00145", qty: 50,
    brand: "BasicWear", dateReceived: "30.03.2026", status: "on_stock",
    ip: "ИП Сидоров В.В.", marketplace: "Ozon", cell: "2.1.3.4",
    items: [
      { article: "OZ-77001", articleSeller: "HO-023-S", name: "Худи оверсайз S", qty: 20, barcode: "4607012345674-01", price: 2400, brand: "BasicWear", size: "S", dateReceived: "30.03.2026", marketplace: "Ozon", kind: "unit" },
      { article: "OZ-77002", articleSeller: "NB-BX-5", name: "Трусы набор 5шт", qty: 15, barcode: "4607012345674-02", price: 1200, brand: "BasicWear", size: "L", dateReceived: "30.03.2026", marketplace: "Ozon", kind: "set", setSize: 5 },
      { article: "OZ-77003", articleSeller: "HO-023-L", name: "Худи оверсайз L", qty: 15, barcode: "4607012345674-03", price: 2400, brand: "BasicWear", size: "L", dateReceived: "30.03.2026", marketplace: "Ozon", kind: "unit" },
    ],
  },
  {
    id: 5, boxNumber: "КРБ-005", upd: "УПЛ-00146", qty: 60,
    brand: "UrbanBag", dateReceived: "29.03.2026", status: "on_stock",
    ip: "ИП Петров Б.Б.", marketplace: "Wildberries", cell: "3.4.2.5",
    items: [
      { article: "WB-33001", articleSeller: "RG-008-BK", name: "Рюкзак чёрный", qty: 30, barcode: "4607012345675-01", price: 4100, brand: "UrbanBag", size: "—", dateReceived: "29.03.2026", marketplace: "Wildberries", kind: "unit" },
      { article: "WB-33002", articleSeller: "RG-008-GR", name: "Рюкзак серый", qty: 30, barcode: "4607012345675-02", price: 4100, brand: "UrbanBag", size: "—", dateReceived: "29.03.2026", marketplace: "Wildberries", kind: "unit" },
    ],
  },
];

interface StockContextType {
  boxes: StockBox[];
  setBoxes: React.Dispatch<React.SetStateAction<StockBox[]>>;
  addBoxes: (newBoxes: StockBox[]) => void;
  uploadedOrderIds: Set<number>;
  markOrderUploaded: (orderId: number) => void;
}

const StockContext = createContext<StockContextType | null>(null);

export const useStock = () => {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error("useStock must be used within StockProvider");
  return ctx;
};

export const StockProvider = ({ children }: { children: ReactNode }) => {
  const [boxes, setBoxes] = useState<StockBox[]>(initialBoxes);
  const [uploadedOrderIds, setUploadedOrderIds] = useState<Set<number>>(new Set());

  const addBoxes = (newBoxes: StockBox[]) => {
    setBoxes((prev) => [...newBoxes, ...prev]);
  };

  const markOrderUploaded = (orderId: number) => {
    setUploadedOrderIds((prev) => {
      const next = new Set(prev);
      next.add(orderId);
      return next;
    });
  };

  return (
    <StockContext.Provider value={{ boxes, setBoxes, addBoxes, uploadedOrderIds, markOrderUploaded }}>
      {children}
    </StockContext.Provider>
  );
};
