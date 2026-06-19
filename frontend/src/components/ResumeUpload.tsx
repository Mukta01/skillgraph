"use client";

import { useCallback, useState } from "react";

interface ResumeUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

export default function ResumeUpload({
  onFileSelect,
  selectedFile,
}: ResumeUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && isValidFile(file)) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && isValidFile(file)) {
        onFileSelect(file);
      }
    },
    [onFileSelect]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-2xl p-8
        transition-all duration-300 cursor-pointer
        flex flex-col items-center justify-center gap-3 min-h-[180px]
        ${
          isDragging
            ? "border-indigo-400 bg-indigo-500/10 scale-[1.02]"
            : selectedFile
            ? "border-emerald-400/60 bg-emerald-500/5"
            : "border-white/20 bg-white/5 hover:border-indigo-400/50 hover:bg-white/[0.07]"
        }
      `}
    >
      <input
        type="file"
        accept=".pdf,.docx,.txt,image/*"
        onChange={handleFileInput}
        className="absolute inset-0 opacity-0 cursor-pointer"
        id="resume-upload"
      />

      {selectedFile ? (
        <>
          {/* Check icon */}
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-emerald-300 font-medium">{selectedFile.name}</p>
          <p className="text-sm text-white/40">
            {(selectedFile.size / 1024).toFixed(1)} KB • Click or drag to replace
          </p>
        </>
      ) : (
        <>
          {/* Upload icon */}
          <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-white/70 font-medium">
            Drop your resume here, or{" "}
            <span className="text-indigo-400 underline underline-offset-2">browse</span>
          </p>
          <p className="text-sm text-white/40">PDF, DOCX, TXT, or Image (JPEG/PNG/WebP) • Max 5MB</p>
        </>
      )}
    </div>
  );
}

function isValidFile(file: File): boolean {
  const validTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "image/jpeg",
    "image/png",
    "image/webp"
  ];
  const validExtensions = [".pdf", ".docx", ".txt", ".jpg", ".jpeg", ".png", ".webp"];
  const hasValidExtension = validExtensions.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );
  return (validTypes.includes(file.type) || hasValidExtension) && file.size <= 5 * 1024 * 1024;
}
