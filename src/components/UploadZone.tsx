import React, { useRef, useState } from "react";
import { Upload, Camera, FileImage, AlertCircle, History } from "lucide-react";
import { motion } from "motion/react";

interface UploadZoneProps {
  onImageSelected: (base64: string, mimeType: string) => void;
  isLoading: boolean;
  onShowHistory?: () => void;
  hasHistory?: boolean;
}

export default function UploadZone({
  onImageSelected,
  isLoading,
  onShowHistory,
  hasHistory = false,
}: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (!file) return;

    // Validate type (JPG/PNG only)
    if (!file.type.match(/image\/(jpeg|png|jpg|webp)/)) {
      setError("يرجى اختيار صورة صالحة (JPG, PNG, WEBP) | Only JPG, PNG, or WEBP images are supported.");
      return;
    }

    // Validate size (Max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت | Image too large. Max size is 5MB.");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onImageSelected(reader.result, file.type);
      }
    };
    reader.onerror = () => {
      setError("خطأ في قراءة الملف. حاول مرة أخرى | Error reading file. Please try again.");
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const triggerCameraInput = () => {
    cameraInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4" id="upload-container">
      {/* Arabic Call-to-action subtitle */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold font-display text-gray-900 mb-3 tracking-tight">
          صور الفاتورة وخل الباقي علينا
        </h2>
        <p className="text-gray-500 font-sans text-sm md:text-base leading-relaxed">
          Snap a photo of your restaurant or grocery bill. Let our AI extract all items and prices instantly, then split them with friends in seconds.
        </p>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-3xl p-8 md:p-12 transition-all duration-300 flex flex-col items-center justify-center min-h-[300px] text-center bg-white ${
          isDragActive
            ? "border-emerald-500 bg-emerald-50/40 shadow-inner scale-[1.01]"
            : "border-gray-200 hover:border-emerald-300 hover:bg-gray-50/50 shadow-xs"
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        id="drop-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,image/jpg,image/webp"
          onChange={handleChange}
          disabled={isLoading}
          id="file-upload-input"
        />

        {/* Dedicated mobile camera capture input */}
        <input
          ref={cameraInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          capture="environment"
          onChange={handleChange}
          disabled={isLoading}
          id="camera-capture-input"
        />

        <div className="bg-emerald-50 text-emerald-600 p-4 rounded-full mb-6">
          <Upload className="w-8 h-8" id="upload-icon" />
        </div>

        <div className="space-y-4 mb-8">
          <p className="text-gray-700 font-medium text-lg">
            قم بسحب وإفلات صورة الفاتورة هنا
          </p>
          <p className="text-gray-400 text-xs md:text-sm">
            Drag & drop your receipt, or select an option below
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          {/* Camera Capture Trigger */}
          <button
            onClick={triggerCameraInput}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-2xl transition-all shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
            id="camera-btn"
          >
            <Camera className="w-5 h-5" />
            <span>كاميرا / Camera</span>
          </button>

          {/* File Browser Trigger */}
          <button
            onClick={triggerFileInput}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-2xl transition-all cursor-pointer disabled:opacity-50"
            id="browse-btn"
          >
            <FileImage className="w-5 h-5 text-gray-600" />
            <span>ملف / File</span>
          </button>
        </div>

        <div className="mt-6 text-gray-400 text-xs space-y-1">
          <p>يدعم صيغ JPG, PNG, WEBP (بحد أقصى 5 ميجابايت)</p>
          <p>Supports JPG, PNG, WEBP up to 5MB</p>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-3 text-red-700 text-sm"
          id="upload-error"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="font-medium">{error}</p>
        </motion.div>
      )}

      {/* History quick access if present */}
      {hasHistory && onShowHistory && (
        <div className="text-center mt-8">
          <button
            onClick={onShowHistory}
            className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-medium text-sm transition-all bg-emerald-50 hover:bg-emerald-100/80 px-4 py-2 rounded-full cursor-pointer"
            id="view-history-btn"
          >
            <History className="w-4 h-4" />
            <span>عرض آخر الفواتير الممسوحة | Saved Bills</span>
          </button>
        </div>
      )}
    </div>
  );
}
