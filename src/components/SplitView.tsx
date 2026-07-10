import React, { useState, useEffect } from "react";
import { ReceiptData, ReceiptItem, HistoryItem } from "../types";
import {
  Plus,
  Trash2,
  Users,
  Check,
  Share2,
  Copy,
  RotateCcw,
  UserPlus,
  TrendingUp,
  FileText,
  AlertTriangle,
  BookmarkCheck,
  Sparkles,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface SplitViewProps {
  initialData: ReceiptData;
  onReset: () => void;
  onSaveToHistory: (data: ReceiptData) => void;
}

export default function SplitView({ initialData, onReset, onSaveToHistory }: SplitViewProps) {
  // Primary edit state
  const [store, setStore] = useState(initialData.store || "متجر جديد");
  const [date, setDate] = useState(initialData.date || new Date().toISOString().split("T")[0]);
  const [currency, setCurrency] = useState(initialData.currency || "MAD");
  const [total, setTotal] = useState<number>(initialData.total || 0);
  const [items, setItems] = useState<ReceiptItem[]>(
    initialData.items.map((item, idx) => ({
      ...item,
      id: item.id || `item-${idx}-${Date.now()}`,
      assignedTo: item.assignedTo || ["Shared"],
    }))
  );

  // People List (Default: "You", "Friend 1", "Shared" is a virtual category)
  const [people, setPeople] = useState<string[]>(
    initialData.people && initialData.people.length > 0
      ? initialData.people
      : ["أنت (You)", "صديق 1 (Friend 1)"]
  );

  // New person input state
  const [newPersonName, setNewPersonName] = useState("");
  // New item form inputs
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");

  // UI state
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [proportionalSplit, setProportionalSplit] = useState(true);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Automatically save to history whenever core splitting state changes
  useEffect(() => {
    const dataToSave: ReceiptData = {
      id: initialData.id,
      store,
      date,
      currency,
      total: Number(total),
      items,
      people,
    };
    onSaveToHistory(dataToSave);
  }, [store, date, currency, total, items, people]);

  // Handle toast timers
  useEffect(() => {
    if (shareToast) {
      const timer = setTimeout(() => setShareToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [shareToast]);

  // Quick Action: Add new person
  const handleAddPerson = (nameToAdd?: string) => {
    const trimmed = (nameToAdd || newPersonName).trim();
    if (!trimmed) return;
    if (people.includes(trimmed)) {
      setShareToast("هذا الاسم موجود بالفعل | Person already exists");
      return;
    }
    if (trimmed.toLowerCase() === "shared" || trimmed === "مشترك") {
      setShareToast("الاسم 'Shared' محجوز تلقائياً | 'Shared' is reserved");
      return;
    }

    setPeople([...people, trimmed]);
    if (!nameToAdd) setNewPersonName("");
    setShareToast(`تمت إضافة ${trimmed} | Added ${trimmed}`);
  };

  // Quick Action: Delete person
  const handleDeletePerson = (personName: string) => {
    if (people.length <= 1) {
      setShareToast("يجب أن يكون هناك شخص واحد على الأقل | At least one person required");
      return;
    }
    // Remove person from list
    setPeople(people.filter((p) => p !== personName));
    // Clean up assignments: remove this person from items
    setItems(
      items.map((item) => ({
        ...item,
        assignedTo: item.assignedTo.filter((p) => p !== personName),
      }))
    );
    setShareToast(`تم حذف ${personName} | Removed ${personName}`);
  };

  // Quick Action: Add custom item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(newItemPrice);
    if (!newItemName.trim() || isNaN(priceNum)) {
      setShareToast("يرجى إدخال اسم وسعر صحيحين | Enter valid name and price");
      return;
    }

    const newItem: ReceiptItem = {
      id: `custom-${Date.now()}-${Math.random()}`,
      name: newItemName.trim(),
      price: priceNum,
      assignedTo: ["Shared"], // Default to shared split
    };

    setItems([...items, newItem]);
    setNewItemName("");
    setNewItemPrice("");
    setShareToast("تمت إضافة العنصر بنجاح | Item added");
  };

  // Quick Action: Delete item
  const handleDeleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
    setSelectedItemIds(selectedItemIds.filter((itemId) => itemId !== id));
  };

  // Quick Action: Edit item values inline
  const handleUpdateItemValue = (id: string, updatedFields: Partial<ReceiptItem>) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, ...updatedFields } : item))
    );
  };

  // Assignment logic
  const toggleItemAssignment = (itemId: string, personName: string) => {
    setItems(
      items.map((item) => {
        if (item.id !== itemId) return item;

        let newAssigned = [...item.assignedTo];

        if (personName === "Shared") {
          // If assigned to Shared, clear individual assignments and set to Shared
          if (newAssigned.includes("Shared")) {
            newAssigned = [];
          } else {
            newAssigned = ["Shared"];
          }
        } else {
          // Remove Shared if assigning to individuals
          newAssigned = newAssigned.filter((p) => p !== "Shared");

          if (newAssigned.includes(personName)) {
            newAssigned = newAssigned.filter((p) => p !== personName);
          } else {
            newAssigned.push(personName);
          }

          // If empty, fall back to Shared
          if (newAssigned.length === 0) {
            newAssigned = ["Shared"];
          }
        }

        return { ...item, assignedTo: newAssigned };
      })
    );
  };

  // Batch assignments for selected checkboxes
  const handleBatchAssign = (personName: string) => {
    if (selectedItemIds.length === 0) {
      setShareToast("يرجى تحديد عناصر أولاً | Select items first");
      return;
    }

    setItems(
      items.map((item) => {
        if (!selectedItemIds.includes(item.id)) return item;

        if (personName === "Shared") {
          return { ...item, assignedTo: ["Shared"] };
        } else {
          // If individual assignment, clear Shared
          let newAssigned = item.assignedTo.filter((p) => p !== "Shared");
          if (!newAssigned.includes(personName)) {
            newAssigned.push(personName);
          }
          if (newAssigned.length === 0) {
            newAssigned = ["Shared"];
          }
          return { ...item, assignedTo: newAssigned };
        }
      })
    );

    setSelectedItemIds([]);
    setShareToast(`تم تعيين العناصر لـ ${personName} | Batch assigned`);
  };

  // Selection management
  const toggleSelectAll = () => {
    if (selectedItemIds.length === items.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(items.map((item) => item.id));
    }
  };

  const toggleItemSelection = (id: string) => {
    if (selectedItemIds.includes(id)) {
      setSelectedItemIds(selectedItemIds.filter((itemId) => itemId !== id));
    } else {
      setSelectedItemIds([...selectedItemIds, id]);
    }
  };

  // MATHEMATICAL BILL SPLIT CALCULATOR
  const itemSum = items.reduce((acc, curr) => acc + curr.price, 0);

  // Proportional scaling factor (handles tax, tip, service fee, round-offs)
  const scalingFactor = proportionalSplit && itemSum > 0 ? total / itemSum : 1;

  // Calculate shares
  const calculateFinalShares = () => {
    const individualShares: { [name: string]: { base: number; shared: number; final: number; items: { name: string; price: number; share: number }[] } } = {};

    // Initialize all people
    people.forEach((person) => {
      individualShares[person] = {
        base: 0,
        shared: 0,
        final: 0,
        items: [],
      };
    });

    items.forEach((item) => {
      const isShared = item.assignedTo.includes("Shared") || item.assignedTo.length === 0;

      if (isShared) {
        // Split shared items equally among all people
        const sharePrice = item.price / people.length;
        people.forEach((person) => {
          individualShares[person].shared += sharePrice;
          individualShares[person].items.push({
            name: `${item.name} (مشترك/Shared)`,
            price: item.price,
            share: sharePrice,
          });
        });
      } else {
        // Split item price among selected assignees
        const sharePrice = item.price / item.assignedTo.length;
        item.assignedTo.forEach((person) => {
          if (individualShares[person]) {
            individualShares[person].base += sharePrice;
            individualShares[person].items.push({
              name: item.name,
              price: item.price,
              share: sharePrice,
            });
          }
        });
      }
    });

    // Apply scaling factor for taxes, service, or tips, and compute final totals
    people.forEach((person) => {
      const entry = individualShares[person];
      const baseScaled = entry.base * scalingFactor;
      const sharedScaled = entry.shared * scalingFactor;
      entry.final = baseScaled + sharedScaled;
    });

    return { individualShares, scalingFactor, discrepancy: total - itemSum };
  };

  const { individualShares, discrepancy } = calculateFinalShares();

  // Create shareable state in URL
  const getShareUrl = () => {
    const stateToEncode = {
      id: initialData.id,
      store,
      date,
      currency,
      total,
      people,
      items: items.map((it) => ({
        name: it.name,
        price: it.price,
        assignedTo: it.assignedTo,
      })),
    };

    try {
      const jsonStr = JSON.stringify(stateToEncode);
      // Clean UTF-8 safe base64 encoding
      const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
      return `${window.location.origin}${window.location.pathname}#bill=${base64}`;
    } catch (e) {
      console.error(e);
      return window.location.href;
    }
  };

  // Actions: Clipboard copy functions
  const copyShareLink = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url).then(
      () => setShareToast("تم نسخ رابط الفاتورة بنجاح! 🔗 | Link copied successfully!"),
      () => setShareToast("خطأ في النسخ | Copying failed")
    );
  };

  const copyBreakdownText = () => {
    let text = `🧾 تقسيم فاتورة: ${store}\n📅 التاريخ: ${date}\n💰 الإجمالي: ${total} ${currency}\n`;
    text += `-----------------------------\n`;

    people.forEach((person) => {
      const finalAmt = individualShares[person]?.final || 0;
      text += `• ${person}: ${finalAmt.toFixed(2)} ${currency}\n`;
    });

    text += `-----------------------------\n`;
    text += `🔗 افتح الرابط لعرض التقسيم وإضافة تعديلاتك:\n${getShareUrl()}`;

    navigator.clipboard.writeText(text).then(
      () => setShareToast("تم نسخ تفاصيل الفاتورة! 📋 | Breakdown copied!"),
      () => setShareToast("خطأ في النسخ | Copying failed")
    );
  };

  // WhatsApp individual message generator
  const getWhatsAppLink = (personName: string, amount: number) => {
    // Exact prompt requirements: "فاتورتنا من {store}: أنت عليك {amount} MAD"
    const textMsg = `فاتورتنا من ${store}: أنت عليك ${amount.toFixed(2)} ${currency}.

تفاصيل الفاتورة وتقسيمها عبر الرابط:
${getShareUrl()}`;

    return `https://wa.me/?text=${encodeURIComponent(textMsg)}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6" id="split-view-container">
      {/* Toast Alert Banner */}
      <AnimatePresence>
        {shareToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-2.5 font-medium text-sm backdrop-blur-md"
            id="toast-notification"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{shareToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Bill Details & Itemized List Editor */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Bill Header info card */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full flex items-center gap-1.5">
                <BookmarkCheck className="w-3.5 h-3.5" />
                مراجعة الفاتورة | Reviewing
              </span>
              <button
                onClick={onReset}
                className="inline-flex items-center gap-1.5 text-gray-400 hover:text-red-500 text-xs font-medium transition-colors cursor-pointer"
                id="reset-btn"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                إعادة مسح | Rescan
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  المتجر / Store Name
                </label>
                <input
                  type="text"
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-gray-800 font-bold focus:border-emerald-300 focus:bg-white outline-none transition-all text-sm"
                  id="store-input"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  التاريخ / Transaction Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-gray-800 focus:border-emerald-300 focus:bg-white outline-none transition-all text-sm"
                  id="date-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  العملة / Currency
                </label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-gray-800 font-mono font-semibold focus:border-emerald-300 focus:bg-white outline-none transition-all text-sm"
                  id="currency-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  المبلغ الإجمالي / Total Paid
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={total || ""}
                  onChange={(e) => setTotal(parseFloat(e.target.value) || 0)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-gray-800 font-mono font-bold focus:border-emerald-300 focus:bg-white outline-none transition-all text-sm"
                  id="total-input"
                />
              </div>
            </div>

            {/* Proportional Split Toggle */}
            <div className="pt-2 flex items-center justify-between border-t border-gray-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-medium text-gray-600">
                  توزيع الضرائب والرسوم نسبياً | Distribute Taxes & Tip Proportional
                </span>
              </div>
              <button
                onClick={() => setProportionalSplit(!proportionalSplit)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  proportionalSplit ? "bg-emerald-500" : "bg-gray-200"
                }`}
                id="proportional-toggle"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    proportionalSplit ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 2: Participants list and Manager */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500" />
              الأشخاص المشاركون | Billing Crew
            </h3>

            {/* Quick list of people */}
            <div className="flex flex-wrap gap-2 mb-4" id="people-list-container">
              {/* Virtual Share Person (Read Only) */}
              <span className="inline-flex items-center bg-amber-50 text-amber-800 border border-amber-100 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-2xs">
                🤝 مشترك (Shared)
              </span>

              {people.map((person) => (
                <span
                  key={person}
                  className="inline-flex items-center bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-full pl-3.5 pr-2 py-1.5 text-xs font-semibold gap-1.5 shadow-2xs group"
                  id={`person-pill-${person}`}
                >
                  {person}
                  <button
                    onClick={() => handleDeletePerson(person)}
                    className="w-4 h-4 rounded-full bg-emerald-100 hover:bg-red-100 text-emerald-700 hover:text-red-700 inline-flex items-center justify-center text-[10px] transition-colors cursor-pointer font-bold"
                    title={`حذف ${person}`}
                    id={`delete-person-${person}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Add person form */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="مثال: يوسف، سارة... | Type friend name"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddPerson();
                  }
                }}
                className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-300 focus:bg-white transition-all"
                id="new-person-input"
              />
              <button
                onClick={() => handleAddPerson()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                id="add-person-btn"
              >
                <UserPlus className="w-4 h-4" />
                <span>إضافة | Add</span>
              </button>
            </div>
          </div>

          {/* Section 3: Itemized items list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-emerald-500" />
                العناصر والمنتجات | Bill Items ({items.length})
              </h3>

              {/* Select all checkboxes & batch utilities */}
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleSelectAll}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold cursor-pointer"
                  id="select-all-btn"
                >
                  {selectedItemIds.length === items.length
                    ? "إلغاء تحديد الكل | Deselect All"
                    : "تحديد الكل | Select All"}
                </button>
              </div>
            </div>

            {/* Floating/Sticky Batch action bar if items selected */}
            {selectedItemIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-gray-900 text-white rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3 border border-gray-800"
                id="batch-assign-bar"
              >
                <span className="text-xs text-gray-300 font-medium">
                  تعيين {selectedItemIds.length} عناصر محددة لـ:
                </span>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  <button
                    onClick={() => handleBatchAssign("Shared")}
                    className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold text-[11px] px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    🤝 مشترك (Shared)
                  </button>
                  {people.map((person) => (
                    <button
                      key={person}
                      onClick={() => handleBatchAssign(person)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      {person}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* List of item cards */}
            <div className="space-y-3" id="items-list">
              {items.map((item) => {
                const isSelected = selectedItemIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl p-4 border transition-all flex flex-col gap-3 relative ${
                      isSelected ? "border-emerald-300 bg-emerald-50/10 shadow-xs" : "border-gray-100 hover:border-gray-200"
                    }`}
                    id={`item-card-${item.id}`}
                  >
                    {/* Item row layout */}
                    <div className="flex items-center gap-3">
                      {/* Batch selector Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItemSelection(item.id)}
                        className="w-4 h-4 rounded-sm border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        id={`checkbox-item-${item.id}`}
                      />

                      {/* Name / Price editor */}
                      <div className="flex-1 grid grid-cols-12 gap-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItemValue(item.id, { name: e.target.value })}
                          className="col-span-8 bg-transparent hover:bg-gray-50 focus:bg-gray-50 px-2 py-1 rounded-md text-sm text-gray-800 font-medium border-none outline-none transition-all"
                          id={`input-name-${item.id}`}
                        />
                        <div className="col-span-4 flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="0.01"
                            value={item.price || ""}
                            onChange={(e) =>
                              handleUpdateItemValue(item.id, { price: parseFloat(e.target.value) || 0 })
                            }
                            className="w-20 bg-transparent text-right hover:bg-gray-50 focus:bg-gray-50 px-2 py-1 rounded-md text-sm font-mono font-bold text-gray-900 border-none outline-none transition-all"
                            id={`input-price-${item.id}`}
                          />
                          <span className="text-[10px] text-gray-400 font-semibold font-mono">{currency}</span>
                        </div>
                      </div>

                      {/* Delete Item action */}
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        title="حذف العنصر"
                        id={`delete-item-${item.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Participant assigning tray */}
                    <div className="border-t border-gray-50 pt-3 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-gray-400 mr-1">تقسيم لـ | Split:</span>

                      {/* Shared Toggle Pill */}
                      <button
                        onClick={() => toggleItemAssignment(item.id, "Shared")}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                          item.assignedTo.includes("Shared")
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                        }`}
                        id={`assign-shared-${item.id}`}
                      >
                        🤝 مشترك (Shared)
                      </button>

                      {/* Individual people Toggles */}
                      {people.map((person) => {
                        const isAssigned = item.assignedTo.includes(person);
                        return (
                          <button
                            key={person}
                            onClick={() => toggleItemAssignment(item.id, person)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                              isAssigned
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                            }`}
                            id={`assign-${person}-${item.id}`}
                          >
                            {person}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Form to add item manually */}
            <form
              onSubmit={handleAddItem}
              className="bg-white border border-dashed border-emerald-200 hover:border-emerald-300 rounded-2xl p-4 flex gap-2 items-center"
              id="new-item-form"
            >
              <input
                type="text"
                placeholder="إضافة عنصر يدوي... | Add item manually"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800"
                id="new-item-name"
              />
              <div className="flex items-center gap-1.5 w-24">
                <input
                  type="number"
                  step="0.01"
                  placeholder="سعر | Price"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  className="w-full bg-transparent text-right outline-none text-sm font-mono font-bold"
                  id="new-item-price"
                />
                <span className="text-[10px] text-gray-400 font-semibold font-mono">{currency}</span>
              </div>
              <button
                type="submit"
                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-all cursor-pointer shrink-0"
                id="add-item-submit"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Live Calculation totals & Sharing Panel */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">
          {/* Section 4: Live Totals calculations block */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1 font-display">
                التقسيم المباشر | Split Summary
              </h3>
              <p className="text-xs text-gray-400">
                Calculated live from your selections. Proportional adjustments are auto-applied.
              </p>
            </div>

            {/* Calculations and discrepancies warnings */}
            <div className="space-y-4">
              {people.map((person) => {
                const data = individualShares[person] || { base: 0, shared: 0, final: 0, items: [] };
                return (
                  <div
                    key={person}
                    className="p-4 bg-gray-50/70 hover:bg-gray-50 rounded-2xl border border-gray-100/50 flex items-center justify-between gap-4 transition-all"
                    id={`summary-card-${person}`}
                  >
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm mb-1">{person}</h4>
                      <p className="text-[10px] text-gray-400 flex items-center gap-1 flex-wrap">
                        <span>خاص: {data.base.toFixed(2)}</span>
                        <span>+</span>
                        <span>مشترك: {data.shared.toFixed(2)}</span>
                        {proportionalSplit && scalingFactor !== 1 && (
                          <span className="text-emerald-600 font-medium">
                            (تناسبي / Proportional)
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {/* Big Total amount */}
                      <span className="font-mono text-base font-bold text-gray-900">
                        {data.final.toFixed(2)}{" "}
                        <span className="text-[10px] font-semibold text-gray-400">{currency}</span>
                      </span>

                      {/* WhatsApp share message trigger */}
                      <a
                        href={getWhatsAppLink(person, data.final)}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center hover:scale-105"
                        title={`مشاركة الحصة مع ${person}`}
                        id={`whatsapp-share-${person}`}
                      >
                        {/* WhatsApp icon lookalike */}
                        <svg
                          className="w-4 h-4 fill-current"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
                        </svg>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sum discrepancies alerts (Informational guidelines) */}
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex items-start gap-3 text-emerald-800 text-xs">
              <Info className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">مجموع العناصر المسجلة: {itemSum.toFixed(2)} {currency}</p>
                <p>مجموع الفاتورة الإجمالي: {total.toFixed(2)} {currency}</p>
                {proportionalSplit && scalingFactor !== 1 && (
                  <p className="text-gray-500 leading-relaxed">
                    يتم تعديل الحصص بنسبة <span className="font-mono text-emerald-600 font-bold">×{(scalingFactor).toFixed(3)}</span> لتشمل الضرائب، رسوم الخدمة أو الفوارق تلقائياً.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 5: Global Utilities Sharing Actions */}
          <div className="bg-gray-900 text-white rounded-3xl p-6 border border-gray-800 shadow-md space-y-4">
            <div>
              <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <Share2 className="w-4.5 h-4.5 text-emerald-400" />
                مشاركة الفاتورة مع الأصدقاء
              </h3>
              <p className="text-xs text-gray-400">
                Generate dynamic backup & share links instantly. No login or DB saved.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Copy Shareable State Link */}
              <button
                onClick={copyShareLink}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl text-sm transition-all shadow-sm hover:shadow-md cursor-pointer"
                id="copy-link-btn"
              >
                <Copy className="w-4 h-4" />
                <span>نسخ رابط الفاتورة | Copy Link</span>
              </button>

              {/* Copy Text Breakdown */}
              <button
                onClick={copyBreakdownText}
                className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold py-3 px-4 rounded-xl text-sm transition-all cursor-pointer"
                id="copy-text-btn"
              >
                <FileText className="w-4 h-4" />
                <span>نسخ كرسالة نصية | Copy Text</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
