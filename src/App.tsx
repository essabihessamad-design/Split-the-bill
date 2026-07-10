import React, { useState, useEffect } from "react";
import { ReceiptData, HistoryItem } from "./types";
import UploadZone from "./components/UploadZone";
import SplitView from "./components/SplitView";
import HistoryList from "./components/HistoryList";
import { Sparkles, Loader2, RefreshCw, Smartphone, History, ArrowRight, BookOpen, Receipt, FileSearch, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [activeView, setActiveView] = useState<"upload" | "split" | "history">("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Status updates during long scan
  const [loadingStep, setLoadingStep] = useState(0);

  // Load history & look for shared bill links on mount
  useEffect(() => {
    // 1. Load History
    const saved = localStorage.getItem("splitreceipt_history");
    if (saved) {
      try {
        setRecentHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading history", e);
      }
    }

    // 2. Parse shared state from hash
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#bill=")) {
        const base64 = hash.substring(6);
        try {
          const jsonStr = decodeURIComponent(escape(atob(base64)));
          const parsed = JSON.parse(jsonStr);
          if (parsed && parsed.items) {
            const loadedData: ReceiptData = {
              id: parsed.id || `shared-${Date.now()}`,
              store: parsed.store || "فاتورة مشتركة",
              date: parsed.date || new Date().toISOString().split("T")[0],
              currency: parsed.currency || "MAD",
              total: parseFloat(parsed.total) || 0,
              people: parsed.people || ["أنت (You)", "صديق 1 (Friend 1)"],
              items: parsed.items.map((it: any, idx: number) => ({
                id: it.id || `item-${idx}-${Date.now()}`,
                name: it.name || `عنصر ${idx + 1}`,
                price: parseFloat(it.price) || 0,
                assignedTo: it.assignedTo || ["Shared"],
              })),
            };
            setReceiptData(loadedData);
            setActiveView("split");
          }
        } catch (e) {
          console.error("Failed to decode URL split state", e);
          setErrorMsg("رابط الفاتورة المشترك تالف أو غير صالح | Invalid or corrupted share link.");
        }
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Set up loading subtitle rotation for better visual experience
  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % 4);
    }, 2500);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Loading subtexts in Arabic & English
  const loadingMessages = [
    { ar: "جاري رفع الصورة وتحليلها...", en: "Uploading image and parsing layout..." },
    { ar: "جاري قراءة الفاتورة بالذكاء الاصطناعي...", en: "Scanning receipt text with advanced AI..." },
    { ar: "استخراج المنتجات، الأسعار والإجمالي...", en: "Extracting store items, prices and totals..." },
    { ar: "تنظيم جدول تقسيم الفواتير الحصري...", en: "Formatting your interactive splitting layout..." }
  ];

  // Communicate with the backend API
  const handleImageScan = async (base64: string, mimeType: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setLoadingStep(0);

    try {
      const response = await fetch("/api/scan-receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64, mimeType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "الصورة غير واضحة، حاول مرة ثانية");
      }

      // Format parsed items correctly with unique IDs
      const formattedItems = (data.items || []).map((it: any, idx: number) => ({
        id: `item-${idx}-${Date.now()}`,
        name: it.name || `عنصر ${idx + 1}`,
        price: typeof it.price === "number" ? it.price : parseFloat(it.price) || 0,
        assignedTo: ["Shared"], // Default to shared split
      }));

      // Calculate total if not provided
      let parsedTotal = typeof data.total === "number" ? data.total : parseFloat(data.total) || 0;
      if (!parsedTotal) {
        parsedTotal = formattedItems.reduce((acc: number, cur: any) => acc + cur.price, 0);
      }

      const structuredReceipt: ReceiptData = {
        id: `receipt-${Date.now()}`,
        store: data.store || "متجر جديد",
        date: data.date || new Date().toISOString().split("T")[0],
        currency: data.currency || "MAD",
        total: parsedTotal,
        items: formattedItems,
        people: ["أنت (You)", "صديق 1 (Friend 1)"], // Initial billing crew
      };

      setReceiptData(structuredReceipt);
      saveToHistory(structuredReceipt);
      setActiveView("split");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "الصورة غير واضحة، حاول مرة ثانية. تأكد من إضاءة الفاتورة ووضوح الأرقام.");
    } finally {
      setIsLoading(false);
    }
  };

  // Local storage history syncing (keeps exactly last 3 receipts)
  const saveToHistory = (data: ReceiptData) => {
    setRecentHistory((prevHistory) => {
      // Avoid duplicate IDs
      const filtered = prevHistory.filter((item) => item.id !== data.id);
      const newItem: HistoryItem = {
        id: data.id,
        store: data.store,
        date: data.date,
        total: data.total,
        currency: data.currency,
        scannedAt: new Date().toISOString(),
        data,
      };
      const updatedHistory = [newItem, ...filtered].slice(0, 3);
      localStorage.setItem("splitreceipt_history", JSON.stringify(updatedHistory));
      return updatedHistory;
    });
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setReceiptData(item.data);
    setActiveView("split");
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = recentHistory.filter((item) => item.id !== id);
    setRecentHistory(updated);
    localStorage.setItem("splitreceipt_history", JSON.stringify(updated));
  };

  const handleReset = () => {
    setReceiptData(null);
    window.location.hash = ""; // Clear hash state
    setActiveView("upload");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-800 flex flex-col font-sans" id="app-root">
      {/* Visual background accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-radial from-emerald-50/60 via-transparent to-transparent pointer-events-none -z-10" />

      {/* Top Header navbar */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo brand */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleReset}>
            <div className="bg-emerald-500 text-white p-2.5 rounded-2xl shadow-sm flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-gray-900 font-display flex items-center gap-1.5">
                SplitReceipt <span className="text-emerald-600">Free</span>
              </h1>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">AI OCR Bill Splitter</p>
            </div>
          </div>

          {/* Quick history navigation */}
          {recentHistory.length > 0 && activeView === "upload" && (
            <button
              onClick={() => setActiveView("history")}
              className="inline-flex items-center gap-1.5 text-gray-500 hover:text-emerald-600 font-semibold text-xs md:text-sm bg-gray-50 hover:bg-emerald-50/80 border border-gray-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              id="history-btn-header"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">السجلات | Recent ({recentHistory.length})</span>
            </button>
          )}

          {activeView !== "upload" && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-gray-500 hover:text-emerald-600 font-semibold text-xs md:text-sm transition-all cursor-pointer"
              id="new-scan-btn-header"
            >
              <ArrowRight className="w-4 h-4" />
              <span>جديد | New Scan</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 py-10 flex flex-col justify-center items-center">
        {isLoading ? (
          /* Loading Scanning state */
          <div className="flex flex-col items-center text-center px-4 max-w-md animate-fade-in" id="loading-container">
            {/* Spinning AI Scan circle indicator */}
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin flex items-center justify-center" />
              <div className="absolute inset-0 flex items-center justify-center text-emerald-500">
                <Sparkles className="w-8 h-8 animate-pulse" />
              </div>
            </div>

            {/* Title / Description */}
            <h3 className="text-2xl font-bold font-display text-gray-900 mb-2">
              {loadingMessages[loadingStep].ar}
            </h3>
            <p className="text-gray-400 font-medium text-sm">
              {loadingMessages[loadingStep].en}
            </p>

            <div className="mt-12 p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100/50 w-full flex items-center gap-3 text-emerald-800 text-xs text-left">
              <Loader2 className="w-4 h-4 shrink-0 text-emerald-500 animate-spin" />
              <p>يستغرق استخراج البيانات عادة أقل من 10 ثوانٍ بفضل محرك الذكاء الاصطناعي السريع.</p>
            </div>
          </div>
        ) : (
          /* Main Router Views rendering */
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="w-full flex justify-center"
            >
              {activeView === "upload" && (
                <div className="w-full space-y-6">
                  {/* General scan view */}
                  <UploadZone
                    onImageSelected={handleImageScan}
                    isLoading={isLoading}
                    onShowHistory={() => setActiveView("history")}
                    hasHistory={recentHistory.length > 0}
                  />

                  {errorMsg && (
                    <div className="w-full max-w-xl mx-auto px-4" id="global-error-box">
                      <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-700 text-sm">
                        <FileSearch className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
                        <div>
                          <p className="font-bold mb-1">عذراً، لم نتمكن من قراءة الفاتورة</p>
                          <p className="font-medium text-xs leading-relaxed">{errorMsg}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Informative tutorial blocks */}
                  <div className="max-w-2xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 text-center text-gray-500 border-t border-gray-100">
                    <div className="space-y-2">
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mx-auto font-bold font-display text-sm">1</div>
                      <h4 className="font-bold text-gray-800 text-sm">صور الفاتورة | Snap</h4>
                      <p className="text-xs">التقط صورة للفاتورة بوضوح أو ارفع ملف الصورة مباشرة.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mx-auto font-bold font-display text-sm">2</div>
                      <h4 className="font-bold text-gray-800 text-sm">قراءة آلية | Extract</h4>
                      <p className="text-xs">يتعرف الذكاء الاصطناعي على كافة المنتجات، الأسعار والتاريخ تلقائياً.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 mx-auto font-bold font-display text-sm">3</div>
                      <h4 className="font-bold text-gray-800 text-sm">شارك الحساب | Split</h4>
                      <p className="text-xs">عين المنتجات لأصدقائك بلمسة وشاركهم رابط الفاتورة والتقسيم.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeView === "split" && receiptData && (
                <SplitView
                  initialData={receiptData}
                  onReset={handleReset}
                  onSaveToHistory={saveToHistory}
                />
              )}

              {activeView === "history" && (
                <HistoryList
                  items={recentHistory}
                  onSelect={handleSelectHistoryItem}
                  onDelete={handleDeleteHistoryItem}
                  onBack={() => setActiveView("upload")}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Footer copyright */}
      <footer className="border-t border-gray-100 bg-white py-6 px-6 text-center text-xs text-gray-400 space-y-2">
        <p className="font-bold text-gray-500 flex items-center justify-center gap-1">
          <span>SplitReceipt Free - AI Scanner & Bill Splitter</span>
        </p>
        <p>مبني بالكامل كمنتج محلي آمن لحفظ الخصوصية بدون تخزين سحابي.</p>
        <p className="font-mono text-[10px]">No databases or analytics. Your receipts stay completely inside your browser.</p>
      </footer>
    </div>
  );
}
