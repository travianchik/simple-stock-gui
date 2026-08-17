import React, { createContext, useContext, useMemo, useState, ReactNode } from "react";

/* ================= СТОК ================= */

export interface StockRow {
  id: number;
  article: string;      // Номенклатура.Артикул
  size: string;         // Характеристика
  name: string;         // Номенклатура (наименование)
  shk: string;          // ШК
  gtin: string;         // GTIN
  wbArticle: string;    // Артикул WB/Ozon
  unit: string;         // Единица хранения
  total: number;        // Всего (в наличии)
}

export interface StockRowComputed extends StockRow {
  reserved: number;   // FBS «Новое»
  shipped: number;    // FBS «В сборке»
  available: number;  // Всего - В резерве - Отгрузка
  toProvide: number;  // В резерве + Отгрузка
  deficit: number;    // |Доступно| при Доступно < 0
  surplus: number;    // = Доступно (при > 0)
}

/* ================= ПРИЁМКА ================= */

export type ReceiveMethod = "kiz" | "shk";
export type ReceiveOrderStatus = "new" | "in_progress" | "done";

export interface ReceiveOrderItem {
  article: string;
  size: string;
  name: string;
  shk: string;
  gtin: string;
  wbArticle: string;
  unit: string;
  qty: number;      // план по заказу
  kizes?: string[]; // КИЗы из файла заказа
}

export interface UplBoxItem {
  article: string;
  size: string;
  name: string;
  shk: string;
  qty: number;
  kizes: string[];
}

export interface UplBox {
  id: number;
  uplNumber: string;   // номер УПЛ
  uplBarcode: string;  // ШК УПЛ
  orderId: number;
  orderNumber: string;
  closed: boolean;
  closedAt?: string;
  cell?: string;       // ячейка хранения: стеллаж.секция.этаж.короб
  items: UplBoxItem[];
}

export interface ReceiveOrder {
  id: number;
  number: string;
  method: ReceiveMethod;
  fileName: string;
  createdAt: string;
  assigneeId: number | null;
  status: ReceiveOrderStatus;
  items: ReceiveOrderItem[];
}

/* ================= FBS ================= */

export type FbsOrderStatus = "new" | "assembling" | "delivering" | "done";
export type FbsSaleStatus = "bought" | "canceled" | "";

export interface FbsOrder {
  id: number;
  orderNo: string;      // номер сборочного задания
  createdAt: string;    // дата-время поступления
  article: string;
  size: string;
  name: string;
  shk: string;
  wbArticle: string;
  price: number;
  warehouse: string;    // склад продавца WB
  status: FbsOrderStatus;
  supplyId: number | null;
  kiz?: string;
  stickerPrinted?: boolean;
  saleStatus?: FbsSaleStatus;
  updGenerated?: boolean;
}

export interface Trbx {
  id: string; // грузоместо
}

export interface Supply {
  id: number;
  supplyNo: string;
  name: string;
  qrCode: string;
  warehouse: string;
  createdAt: string;
  status: "assembling" | "delivering" | "done";
  trbx: Trbx[];
  qrPrinted?: boolean;
}

export const wbWarehouses = [
  { id: 1, name: "Курбанов - FBS Москва (Белая дача)", address: "Москва, Белая дача", type: "Склад продавца" },
  { id: 2, name: "Курбанов - FBS Казань", address: "Казань, Технополис", type: "Склад продавца" },
  { id: 3, name: "Курбанов - FBS СПб (Шушары)", address: "Санкт-Петербург, Шушары", type: "Склад продавца" },
];

/* ================= НАЧАЛЬНЫЕ ДАННЫЕ ================= */

const initialStock: StockRow[] = [
  { id: 1, article: "FAPPE/БРАЗ_КРУЖК/466С", size: "2XL", name: "Комплект трусов женских FAPPE/БРАЗ_КРУЖК/466С", shk: "4610547700972", gtin: "4610547700972", wbArticle: "288015345", unit: "шт", total: 552 },
  { id: 2, article: "FAPPE/БРАЗ_КРУЖК/466С", size: "M", name: "Комплект трусов женских FAPPE/БРАЗ_КРУЖК/466С", shk: "2041941632583", gtin: "4660546067903", wbArticle: "288015345", unit: "шт", total: 2694 },
  { id: 3, article: "FAPPE/БРАЗ_КРУЖК/466С", size: "S", name: "Комплект трусов женских FAPPE/БРАЗ_КРУЖК/466С", shk: "2041941632590", gtin: "4660546067897", wbArticle: "288015345", unit: "шт", total: 2583 },
  { id: 4, article: "FAPPE/БРАЗ_КРУЖК/4К66", size: "XS", name: "Комплект трусов женских FAPPE/БРАЗ_КРУЖК/4К66", shk: "4610547700989", gtin: "4610547700989", wbArticle: "288015344", unit: "шт", total: 804 },
  { id: 5, article: "FAPPE/БРАЗ_КРУЖК/4444", size: "S", name: "Комплект трусов женских FAPPE/БРАЗ_КРУЖК/4444", shk: "4610478702816", gtin: "4610478702816", wbArticle: "372101565", unit: "шт", total: 512 },
  { id: 6, article: "LILAC/СЛИПЫ-ЦВЕТОК/ОПРСЛ46", size: "M", name: "Трусы женские бесшовные слипы набор 7 шт MY LILAC", shk: "4660546067552", gtin: "4660546067552", wbArticle: "248282707", unit: "шт", total: 74 },
];

const nowRu = () => new Date().toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const initialOrders: ReceiveOrder[] = [
  {
    id: 1,
    number: "ЗАК-0231",
    method: "kiz",
    fileName: "order_0231_kiz.xlsx",
    createdAt: "14.08.2026 09:12",
    assigneeId: 4,
    status: "in_progress",
    items: [
      { article: "FAPPE/БРАЗ_КРУЖК/466С", size: "M", name: "Комплект трусов женских FAPPE/БРАЗ_КРУЖК/466С", shk: "2041941632583", gtin: "4660546067903", wbArticle: "288015345", unit: "шт", qty: 60 },
      { article: "FAPPE/БРАЗ_КРУЖК/466С", size: "S", name: "Комплект трусов женских FAPPE/БРАЗ_КРУЖК/466С", shk: "2041941632590", gtin: "4660546067897", wbArticle: "288015345", unit: "шт", qty: 40 },
    ],
  },
  {
    id: 2,
    number: "ЗАК-0232",
    method: "shk",
    fileName: "order_0232_shk.xlsx",
    createdAt: "14.08.2026 11:40",
    assigneeId: null,
    status: "new",
    items: [
      { article: "FAPPE/БРАЗ_КРУЖК/4444", size: "S", name: "Комплект трусов женских FAPPE/БРАЗ_КРУЖК/4444", shk: "4610478702816", gtin: "4610478702816", wbArticle: "372101565", unit: "шт", qty: 120 },
    ],
  },
];

const initialFbs: FbsOrder[] = [
  { id: 1, orderNo: "5488422979", createdAt: "14.08.2026 10:02", article: "LILAC/СЛИПЫ-ЦВЕТОК/ОПРСЛ46", size: "M", name: "Трусы женские бесшовные слипы набор 7 шт MY LILAC", shk: "4660546067552", wbArticle: "248282707", price: 923, warehouse: wbWarehouses[0].name, status: "new", supplyId: null },
  { id: 2, orderNo: "5488422980", createdAt: "14.08.2026 10:14", article: "FAPPE/БРАЗ_КРУЖК/466С", size: "M", name: "Комплект трусов женских FAPPE/БРАЗ_КРУЖК/466С", shk: "2041941632583", wbArticle: "288015345", price: 1016, warehouse: wbWarehouses[0].name, status: "new", supplyId: null },
  { id: 3, orderNo: "5488422981", createdAt: "13.08.2026 18:31", article: "FAPPE/БРАЗ_КРУЖК/466С", size: "S", name: "Комплект трусов женских FAPPE/БРАЗ_КРУЖК/466С", shk: "2041941632590", wbArticle: "288015345", price: 1016, warehouse: wbWarehouses[1].name, status: "new", supplyId: null },
  { id: 4, orderNo: "5488422982", createdAt: "13.08.2026 12:05", article: "FAPPE/БРАЗ_КРУЖК/4444", size: "S", name: "Комплект трусов женских FAPPE/БРАЗ_КРУЖК/4444", shk: "4610478702816", wbArticle: "372101565", price: 780, warehouse: wbWarehouses[0].name, status: "new", supplyId: null },
];

/* ================= КОНТЕКСТ ================= */

interface OrbitaContextType {
  /* сток */
  stock: StockRow[];
  stockComputed: StockRowComputed[];
  importStock: (rows: Omit<StockRow, "id">[]) => { added: number; merged: number };
  lastWbSync: string | null;
  syncStockToWb: () => void;
  /* приёмка */
  orders: ReceiveOrder[];
  boxes: UplBox[];
  addOrder: (o: Omit<ReceiveOrder, "id" | "status" | "createdAt">) => void;
  assignOrder: (orderId: number, assigneeId: number) => void;
  openBox: (orderId: number) => UplBox;
  addToBox: (boxId: number, item: Omit<UplBoxItem, "kizes"> & { kiz?: string }) => void;
  closeBox: (boxId: number) => void;
  finishOrder: (orderId: number) => void;
  boxesOfOrder: (orderId: number) => UplBox[];
  pickedQty: (orderId: number, shk: string) => number;
  findBoxByBarcode: (code: string) => UplBox | undefined;
  /* FBS */
  fbsOrders: FbsOrder[];
  supplies: Supply[];
  syncFbsNew: () => number;
  createSupply: (orderIds: number[], warehouse: string) => Supply | null;
  addTrbx: (supplyId: number) => void;
  attachKiz: (supplyId: number, kiz: string) => { ok: boolean; message: string };
  printSticker: (orderId: number) => void;
  printSupplyQr: (supplyId: number) => void;
  deliverSupply: (supplyId: number) => void;
  refreshSaleStatuses: (supplyId: number) => number;
  markUpdGenerated: (orderIds: number[]) => void;
  ordersOfSupply: (supplyId: number) => FbsOrder[];
}

const OrbitaContext = createContext<OrbitaContextType | null>(null);

export const useOrbita = () => {
  const ctx = useContext(OrbitaContext);
  if (!ctx) throw new Error("useOrbita must be used within OrbitaProvider");
  return ctx;
};

export const OrbitaProvider = ({ children }: { children: ReactNode }) => {
  const [stock, setStock] = useState<StockRow[]>(initialStock);
  const [orders, setOrders] = useState<ReceiveOrder[]>(initialOrders);
  const [boxes, setBoxes] = useState<UplBox[]>([]);
  const [fbsOrders, setFbsOrders] = useState<FbsOrder[]>(initialFbs);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [lastWbSync, setLastWbSync] = useState<string | null>(null);
  const [seq, setSeq] = useState(1);

  const nextSeq = () => {
    const v = seq + 1;
    setSeq(v);
    return v;
  };

  /* ---- расчёт динамических столбцов стока ---- */
  const stockComputed = useMemo<StockRowComputed[]>(() => {
    return stock.map((r) => {
      const reserved = fbsOrders.filter((o) => o.shk === r.shk && o.status === "new" && o.saleStatus !== "canceled").length;
      const shipped = fbsOrders.filter((o) => o.shk === r.shk && o.status === "assembling" && o.saleStatus !== "canceled").length;
      const available = r.total - reserved - shipped;
      return {
        ...r,
        reserved,
        shipped,
        available,
        toProvide: reserved + shipped,
        deficit: available < 0 ? Math.abs(available) : 0,
        surplus: available > 0 ? available : 0,
      };
    });
  }, [stock, fbsOrders]);

  /* ---- сток ---- */
  const importStock: OrbitaContextType["importStock"] = (rows) => {
    let added = 0;
    let merged = 0;
    setStock((prev) => {
      const next = [...prev];
      rows.forEach((row) => {
        const idx = next.findIndex((s) => s.shk && s.shk === row.shk);
        if (idx >= 0) {
          next[idx] = { ...next[idx], total: next[idx].total + row.total };
          merged++;
        } else {
          next.push({ ...row, id: Date.now() + Math.random() });
          added++;
        }
      });
      return next;
    });
    return { added, merged };
  };

  const syncStockToWb = () => setLastWbSync(nowRu());

  /* ---- приёмка ---- */
  const addOrder: OrbitaContextType["addOrder"] = (o) =>
    setOrders((prev) => [
      { ...o, id: Date.now(), status: o.assigneeId ? "in_progress" : "new", createdAt: nowRu() },
      ...prev,
    ]);

  const assignOrder = (orderId: number, assigneeId: number) =>
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, assigneeId, status: o.status === "new" ? "in_progress" : o.status } : o)));

  const openBox: OrbitaContextType["openBox"] = (orderId) => {
    const order = orders.find((o) => o.id === orderId);
    const n = nextSeq();
    const box: UplBox = {
      id: Date.now(),
      uplNumber: `УПЛ-${String(1000 + n)}`,
      uplBarcode: `20${String(1000000000 + n * 7919).slice(0, 11)}`,
      orderId,
      orderNumber: order?.number ?? "",
      closed: false,
      cell: `${((n - 1) % 12) + 1}.${((n * 3) % 8) + 1}.${((n * 5) % 4) + 1}.${((n * 7) % 20) + 1}`,
      items: [],
    };
    setBoxes((prev) => [box, ...prev]);
    return box;
  };

  const addToBox: OrbitaContextType["addToBox"] = (boxId, item) =>
    setBoxes((prev) =>
      prev.map((b) => {
        if (b.id !== boxId) return b;
        const idx = b.items.findIndex((i) => i.shk === item.shk);
        const items = [...b.items];
        if (idx >= 0) {
          items[idx] = {
            ...items[idx],
            qty: items[idx].qty + item.qty,
            kizes: item.kiz ? [...items[idx].kizes, item.kiz] : items[idx].kizes,
          };
        } else {
          items.push({
            article: item.article,
            size: item.size,
            name: item.name,
            shk: item.shk,
            qty: item.qty,
            kizes: item.kiz ? [item.kiz] : [],
          });
        }
        return { ...b, items };
      })
    );

  const closeBox = (boxId: number) =>
    setBoxes((prev) => prev.map((b) => (b.id === boxId ? { ...b, closed: true, closedAt: nowRu() } : b)));

  const boxesOfOrder = (orderId: number) => boxes.filter((b) => b.orderId === orderId);

  const pickedQty = (orderId: number, shk: string) =>
    boxes
      .filter((b) => b.orderId === orderId)
      .reduce((sum, b) => sum + b.items.filter((i) => i.shk === shk).reduce((s, i) => s + i.qty, 0), 0);

  const findBoxByBarcode = (code: string) => {
    const c = code.trim();
    return boxes.find((b) => b.uplBarcode === c || b.uplNumber.toLowerCase() === c.toLowerCase());
  };

  /** Завершение приёмки: товар из коробов уходит в Сток (совпадение по ШК → +количество) */
  const finishOrder = (orderId: number) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const orderBoxes = boxes.filter((b) => b.orderId === orderId);
    const flat: Record<string, number> = {};
    orderBoxes.forEach((b) => b.items.forEach((i) => (flat[i.shk] = (flat[i.shk] || 0) + i.qty)));
    setStock((prev) => {
      const next = [...prev];
      Object.entries(flat).forEach(([shk, qty]) => {
        const idx = next.findIndex((s) => s.shk === shk);
        if (idx >= 0) {
          next[idx] = { ...next[idx], total: next[idx].total + qty };
        } else {
          const src = order.items.find((i) => i.shk === shk);
          next.push({
            id: Date.now() + Math.random(),
            article: src?.article ?? "—",
            size: src?.size ?? "—",
            name: src?.name ?? "—",
            shk,
            gtin: src?.gtin ?? "",
            wbArticle: src?.wbArticle ?? "",
            unit: src?.unit ?? "шт",
            total: qty,
          });
        }
      });
      return next;
    });
    setBoxes((prev) => prev.map((b) => (b.orderId === orderId ? { ...b, closed: true, closedAt: b.closedAt ?? nowRu() } : b)));
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "done" } : o)));
  };

  /* ---- FBS ---- */
  const syncFbsNew = () => {
    const base = fbsOrders.length;
    const pool = stock.length ? stock : initialStock;
    const created: FbsOrder[] = Array.from({ length: 3 }).map((_, k) => {
      const src = pool[(base + k) % pool.length];
      return {
        id: Date.now() + k,
        orderNo: String(5488423000 + base + k),
        createdAt: nowRu(),
        article: src.article,
        size: src.size,
        name: src.name,
        shk: src.shk,
        wbArticle: src.wbArticle,
        price: 900 + k * 57,
        warehouse: wbWarehouses[k % wbWarehouses.length].name,
        status: "new",
        supplyId: null,
      };
    });
    setFbsOrders((prev) => [...created, ...prev]);
    return created.length;
  };

  const createSupply: OrbitaContextType["createSupply"] = (orderIds, warehouse) => {
    if (!orderIds.length) return null;
    const n = nextSeq();
    const supply: Supply = {
      id: Date.now(),
      supplyNo: `WB-GI-${262000000 + n}`,
      name: `Поставка ${new Date().toLocaleDateString("ru-RU")}`,
      qrCode: `WB-GI-${262000000 + n}`,
      warehouse,
      createdAt: nowRu(),
      status: "assembling",
      trbx: [],
    };
    setSupplies((prev) => [supply, ...prev]);
    setFbsOrders((prev) =>
      prev.map((o) => (orderIds.includes(o.id) ? { ...o, status: "assembling", supplyId: supply.id } : o))
    );
    return supply;
  };

  const addTrbx = (supplyId: number) =>
    setSupplies((prev) =>
      prev.map((s) => (s.id === supplyId ? { ...s, trbx: [...s.trbx, { id: `ГМ-${s.trbx.length + 1}` }] } : s))
    );

  const attachKiz: OrbitaContextType["attachKiz"] = (supplyId, kiz) => {
    const code = kiz.trim();
    if (!code) return { ok: false, message: "Пустой КИЗ" };
    const target = fbsOrders.find(
      (o) => o.supplyId === supplyId && !o.kiz && (code.includes(o.shk) || code.includes(o.article) || code === o.shk)
    );
    if (!target) return { ok: false, message: "Товар по КИЗу не найден в поставке (нет совпадения по ШК/артикулу/размеру)" };
    setFbsOrders((prev) => prev.map((o) => (o.id === target.id ? { ...o, kiz: code } : o)));
    return { ok: true, message: `КИЗ привязан: ${target.article} · ${target.size} · задание ${target.orderNo}` };
  };

  const printSticker = (orderId: number) =>
    setFbsOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, stickerPrinted: true } : o)));

  const printSupplyQr = (supplyId: number) =>
    setSupplies((prev) => prev.map((s) => (s.id === supplyId ? { ...s, qrPrinted: true } : s)));

  /** Передача в доставку: списываем товар из «Всего» */
  const deliverSupply = (supplyId: number) => {
    const inSupply = fbsOrders.filter((o) => o.supplyId === supplyId && o.status === "assembling" && o.saleStatus !== "canceled");
    const bySkl: Record<string, number> = {};
    inSupply.forEach((o) => (bySkl[o.shk] = (bySkl[o.shk] || 0) + 1));
    setStock((prev) =>
      prev.map((s) => (bySkl[s.shk] ? { ...s, total: s.total - bySkl[s.shk] } : s))
    );
    setFbsOrders((prev) =>
      prev.map((o) => (o.supplyId === supplyId && o.status === "assembling" ? { ...o, status: "delivering" } : o))
    );
    setSupplies((prev) => prev.map((s) => (s.id === supplyId ? { ...s, status: "delivering" } : s)));
  };

  /** Обновление статусов заданий: отказ покупателя → задание удаляется из поставки */
  const refreshSaleStatuses = (supplyId: number) => {
    const candidates = fbsOrders.filter((o) => o.supplyId === supplyId && o.status === "assembling" && !o.kiz);
    if (!candidates.length) return 0;
    const canceled = candidates[0];
    setFbsOrders((prev) =>
      prev.map((o) => (o.id === canceled.id ? { ...o, saleStatus: "canceled", status: "done", supplyId: null } : o))
    );
    return 1;
  };

  const markUpdGenerated = (orderIds: number[]) =>
    setFbsOrders((prev) => prev.map((o) => (orderIds.includes(o.id) ? { ...o, updGenerated: true } : o)));

  const ordersOfSupply = (supplyId: number) => fbsOrders.filter((o) => o.supplyId === supplyId);

  return (
    <OrbitaContext.Provider
      value={{
        stock,
        stockComputed,
        importStock,
        lastWbSync,
        syncStockToWb,
        orders,
        boxes,
        addOrder,
        assignOrder,
        openBox,
        addToBox,
        closeBox,
        finishOrder,
        boxesOfOrder,
        pickedQty,
        findBoxByBarcode,
        fbsOrders,
        supplies,
        syncFbsNew,
        createSupply,
        addTrbx,
        attachKiz,
        printSticker,
        printSupplyQr,
        deliverSupply,
        refreshSaleStatuses,
        markUpdGenerated,
        ordersOfSupply,
      }}
    >
      {children}
    </OrbitaContext.Provider>
  );
};