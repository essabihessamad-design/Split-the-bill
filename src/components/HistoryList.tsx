import React from "react";
import { HistoryItem } from "../types";
import { Clock, ArrowRight, Trash2, Calendar, ShoppingBag } from "lucide-react";

interface HistoryListProps {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export default function HistoryList({ items, onSelect, onDelete, onBack }: HistoryListProps) {
  return (
    <div className="w-full max-w-xl mx-auto px-4" id="history-container">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors cursor-pointer"
          id="history-back-btn"
        >
          <ArrowRight className="w-4 h-4" />
          <span>الرجوع | Back</span>
        </button>
        <h2 className="text-xl font-bold text-gray-900 font-display">
          آخر الفواتير الممسوحة | Recent Bills
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-gray-100 text-center text-gray-400">
          <Clock className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="font-medium text-gray-600 mb-1">لا توجد فواتير ممسوحة مسبقاً</p>
          <p className="text-xs text-gray-400">No scanned receipts found yet. Start by scanning one!</p>
        </div>
      ) : (
        <div className="space-y-4" id="history-list">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-emerald-200 hover:shadow-xs transition-all flex items-center justify-between group"
              id={`history-item-${item.id}`}
            >
              <div
                onClick={() => onSelect(item)}
                className="flex-1 cursor-pointer pr-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-gray-800 text-base">
                    {item.store || "متجر غير معروف / Unknown"}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {item.date || new Date(item.scannedAt).toLocaleDateString()}
                  </span>
                  <span className="font-mono text-emerald-600 font-semibold text-sm">
                    {item.total} {item.currency || "MAD"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelect(item)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
                  id={`history-load-${item.id}`}
                >
                  فتح | Load
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                  title="حذف الفاتورة"
                  id={`history-delete-${item.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
