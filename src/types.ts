export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  assignedTo: string[]; // person names or ID assigned, e.g., ["You", "Friend 1"] or ["Shared"]
}

export interface ReceiptData {
  id: string;
  store: string;
  date: string;
  currency: string;
  total: number;
  items: ReceiptItem[];
  people: string[]; // List of custom names, default: ["You", "Friend 1"]
}

export interface HistoryItem {
  id: string;
  store: string;
  date: string;
  total: number;
  currency: string;
  scannedAt: string;
  data: ReceiptData;
}
