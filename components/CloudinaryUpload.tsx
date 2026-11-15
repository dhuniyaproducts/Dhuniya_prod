"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { deleteCloudinaryImage } from "@/lib/cloudinary";

type CloudinaryUploadProps = {
  value?: string;
  onChange: (url: string) => void;
  onClear?: () => void;
};

export default function CloudinaryUpload({ value, onChange, onClear }: CloudinaryUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const upload = useCallback(
    async (file: File) => {
      setError("");

      if (!cloudName || !uploadPreset) {
        setError("Cloudinary is not configured. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET in your .env.local");
        return;
      }

      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file (JPEG, PNG, WebP, etc.)");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setError("Image must be under 10MB.");
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);
        formData.append("folder", "dhuniya-products");

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: "POST", body: formData }
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Upload failed (${res.status})`);
        }

        const data = await res.json();
        onChange(data.secure_url);
      } catch (err: any) {
        setError(err.message || "Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [cloudName, uploadPreset, onChange]
  );

  const handleFile = (file: File | null | undefined) => {
    if (file) upload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="space-y-3">
      {/* Preview */}
      {value && (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <img
            src={value}
            alt="Product preview"
            className="w-full h-40 object-cover"
          />
          <button
            type="button"
            onClick={() => {
              if (value) deleteCloudinaryImage(value);
              onChange("");
              onClear?.();
            }}
            className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow-sm transition-colors"
            title="Remove image from Cloudinary"
          >
            <X className="size-4" />
          </button>
          <div className="px-3 py-2 text-xs text-slate-500 truncate bg-white border-t border-slate-100">
            {value.split("/").pop()}
          </div>
        </div>
      )}

      {/* Drop zone */}
      {!value && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-7 cursor-pointer transition-all duration-200 ${dragOver
            ? "border-amber-500 bg-amber-50"
            : "border-slate-300 hover:border-amber-400 hover:bg-amber-50/40"
            } ${uploading ? "cursor-not-allowed opacity-70" : ""}`}
        >
          {uploading ? (
            <>
              <Loader2 className="size-8 text-amber-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-600">Uploading to Cloudinary…</p>
            </>
          ) : (
            <>
              <div className="flex size-14 items-center justify-center rounded-xl bg-amber-50 border border-amber-200 text-amber-600">
                {dragOver ? <ImageIcon className="size-6" /> : <Upload className="size-6" />}
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-700">
                  {dragOver ? "Drop image here" : "Click to upload or drag & drop"}
                </p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG, WebP — max 10MB</p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
        disabled={uploading}
      />

      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}

