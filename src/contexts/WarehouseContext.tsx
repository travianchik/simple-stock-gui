import React, { createContext, useContext, useState, ReactNode } from "react";

/* ============ ПРИЁМКА (ордера) ============ */

export type PickMethod = "barcode" | "kiz";
export type Packaging = "boxes" | "bags";

export interface NomenclatureItem {
  article: string;
  name: string;
  barcode: string;
  brand: string;
  units: number; // кол-во единиц товара в заказе
  chzCount: number; // кол-во ЧЗ (КИЗ) в заказе
  unitsPerBox: number;
  price?: number;
}

export interface PickedBox {
  boxNumber: string; // уникальный неповторяющийся номер короба
  qty: number;
  pickerName: string;
  articles: { article: string; barcode: string; qty: number }[];
  labelPrinted: boolean;
  cell?: string;
}

export type ReceiptOrderStatus =
  | "created" // создан ордер
  | "assigned" // назначен сотрудник
  | "picking" // сотрудник пикает товар
  | "picked" // передан старшему менеджеру
  | "verified" // сверен
  | "on_balance"; // товар на балансе + назначена ячейка

export interface ReceiptOrder {
  id: number;
  orderNumber: string;
  upd: string;
  ip: string;
  marketplace: string;
  packaging: Packaging;
  method: PickMethod;
  items: NomenclatureItem[];
  plannedBoxes: number;
  assigneeId: number | null;
  tableNo: string;
  status: ReceiptOrderStatus;
  boxes: PickedBox[];
  verifiedQty?: number;
  comment?: string;
  createdAt: string;
}

/* ============ ОТГРУЗКА (FBS / FBO) ============ */

export type ShipScheme = "FBS" | "FBO";
export type ShipTaskStatus =
  | "new"
  | "picking"
  | "picked"
  | "packing"
  | "packed"
  | "shipped";

export interface ShipTaskItem {
  article: string;
  name: string;
  barcode: string;
  qty: number;
  cell: string; // номер стеллажа/ячейки
  picked: number;
  labeled: number; // наклеено этикеток WB
}

export interface ShipTask {
  id: number;
  scheme: ShipScheme;
  city: string;
  qrCode: string; // QR заказа маркетплейса
  marketplace: string;
  managerId: number | null;
  packerId: number | null;
  unitsPerBox: number;
  boxesCount: number; // кол-во коробов, указанное упаковщицей
  qrCopies: number; // дубли QR под каждый короб
  items: ShipTaskItem[];
  status: ShipTaskStatus;
  driver?: string;
  createdAt: string;
  source: "api" | "manual"; // автоматически по API или вручную
}

const today = "11.08.2026";

const initialOrders: ReceiptOrder[] = [
  {
    id: 1,
    orderNumber: "ORD-0101",
    upd: "УПЛ-00147",
    ip: "ИП Иванов А.А.",
    marketplace: "Wildberries",
    packaging: "boxes",
    method: "kiz",
    items: [
      { article: "WB-12345", name: "Футболка белая S", barcode: "4607012345671-01", brand: "BasicWear", units: 80, chzCount: 80, unitsPerBox: 40, price: 850 },
    ],
    plannedBoxes: 2,
    assigneeId: 4,
    tableNo: "Стол 3",
    status: "assigned",
    boxes: [],
    createdAt: today,
  },
  {
    id: 2,
    orderNumber: "ORD-0102",
    upd: "УПЛ-00148",
    ip: "ИП Петров Б.Б.",
    marketplace: "Ozon",
    packaging: "bags",
    method: "barcode",
    items: [
      { article: "OZ-99001", name: "Джинсы slim 30", barcode: "4607012345672-01", brand: "DenimPro", units: 40, chzCount: 0, unitsPerBox: 20, price: 3200 },
    ],
    plannedBoxes: 2,
    assigneeId: null,
    tableNo: "",
    status: "created",
    boxes: [],
    createdAt: today,
  },
];

const initialTasks: ShipTask[] = [
  {
    id: 1,
    scheme: "FBS",
    city: "Москва",
    qrCode: "QR-WB-MSK-0001",
    marketplace: "Wildberries",
    managerId: 6,
    packerId: null,
    unitsPerBox: 5,
    boxesCount: 0,
    qrCopies: 0,
    items: [
      { article: "WB-12345", name: "Футболка белая S", barcode: "4607012345671-01", qty: 30, cell: "1.2.1.1", picked: 0, labeled: 0 },
      { article: "WB-55001", name: "Кроссовки 41", barcode: "4607012345673-01", qty: 20, cell: "2.5.1.3", picked: 0, labeled: 0 },
    ],
    status: "new",
    createdAt: today,
    source: "api",
  },
  {
    id: 2,
    scheme: "FBS",
    city: "Казань",
    qrCode: "QR-WB-KZN-0002",
    marketplace: "Wildberries",
    managerId: null,
    packerId: null,
    unitsPerBox: 5,
    boxesCount: 0,
    qrCopies: 0,
    items: [
      { article: "WB-33001", name: "Рюкзак чёрный", barcode: "4607012345675-01", qty: 50, cell: "3.4.2.5", picked: 0, labeled: 0 },
    ],
    status: "new",
    createdAt: today,
    source: "api",
  },
  {
    id: 3,
    scheme: "FBO",
    city: "Коледино (FBO)",
    qrCode: "QR-WB-FBO-0003",
    marketplace: "Wildberries",
    managerId: null,
    packerId: null,
    unitsPerBox: 10,
    boxesCount: 0,
    qrCopies: 0,
    items: [
      { article: "OZ-77001", name: "Худи оверсайз S", barcode: "4607012345674-01", qty: 20, cell: "2.1.3.4", picked: 0, labeled: 0 },
    ],
    status: "new",
    createdAt: today,
    source: "manual",
  },
];

interface WarehouseContextType {
  orders: ReceiptOrder[];
  addOrder: (o: Omit<ReceiptOrder, "id" | "boxes" | "status" | "createdAt">) => void;
  updateOrder: (id: number, data: Partial<ReceiptOrder>) => void;
  addPickedBox: (orderId: number, box: PickedBox) => void;
  generateBoxNumber: () => string;
  tasks: ShipTask[];
  addTasks: (t: ShipTask[]) => void;
  updateTask: (id: number, data: Partial<ShipTask>) => void;
  updateTaskItem: (taskId: number, article: string, data: Partial<ShipTaskItem>) => void;
}

const WarehouseContext = createContext<WarehouseContextType | null>(null);

export const useWarehouse = () => {
  const ctx = useContext(WarehouseContext);
  if (!ctx) throw new Error("useWarehouse must be used within WarehouseProvider");
  return ctx;
};

export const WarehouseProvider = ({ children }: { children: ReactNode }) => {
  const [orders, setOrders] = useState<ReceiptOrder[]>(initialOrders);
  const [tasks, setTasks] = useState<ShipTask[]>(initialTasks);
  const [boxSeq, setBoxSeq] = useState(1000);

  const addOrder: WarehouseContextType["addOrder"] = (o) => {
    setOrders((prev) => [
      {
        ...o,
        id: Date.now(),
        status: o.assigneeId ? "assigned" : "created",
        boxes: [],
        createdAt: new Date().toLocaleDateString("ru-RU"),
      },
      ...prev,
    ]);
  };

  const updateOrder = (id: number, data: Partial<ReceiptOrder>) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...data } : o)));

  const addPickedBox = (orderId: number, box: PickedBox) =>
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, boxes: [...o.boxes, box] } : o))
    );

  const generateBoxNumber = () => {
    const next = boxSeq + 1;
    setBoxSeq(next);
    return `КРБ-${next}`;
  };

  const addTasks = (t: ShipTask[]) => setTasks((prev) => [...t, ...prev]);

  const updateTask = (id: number, data: Partial<ShipTask>) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));

  const updateTaskItem = (taskId: number, article: string, data: Partial<ShipTaskItem>) =>
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, items: t.items.map((i) => (i.article === article ? { ...i, ...data } : i)) }
          : t
      )
    );

  return (
    <WarehouseContext.Provider
      value={{ orders, addOrder, updateOrder, addPickedBox, generateBoxNumber, tasks, addTasks, updateTask, updateTaskItem }}
    >
      {children}
    </WarehouseContext.Provider>
  );
};