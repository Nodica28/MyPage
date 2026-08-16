import React from "react";
import {cn} from "@/lib/utils";
import {
  FileImage,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  FileVideo,
  FileAudio,
  PresentationIcon,
  File
} from "lucide-react";

export interface FileIconProps {
  fileType: string;
  className?: string;
  type?: string; // Adding type as an alias for fileType for compatibility
}

export function FileIcon({fileType, type, className}: FileIconProps) {
  // Define icon based on file type
  const getIcon = () => {
    const fileTypeToUse = (fileType || type || "file").toLowerCase();

    // Images
    if (
      fileTypeToUse === "image" ||
      fileTypeToUse.match(/^(jpg|jpeg|png|gif|svg|webp|bmp|tiff)$/)
    ) {
      return <FileImage className={cn("text-blue-500", className)} />;
    }

    // Documents
    if (
      fileTypeToUse === "document" ||
      fileTypeToUse.match(/^(doc|docx|pdf|txt|rtf|md|tex)$/)
    ) {
      return <FileText className={cn("text-yellow-600", className)} />;
    }

    // Spreadsheets
    if (
      fileTypeToUse === "spreadsheet" ||
      fileTypeToUse.match(/^(xls|xlsx|csv|numbers)$/)
    ) {
      return <FileSpreadsheet className={cn("text-green-600", className)} />;
    }

    // Code files
    if (
      fileTypeToUse === "code" ||
      fileTypeToUse.match(
        /^(html|css|js|jsx|ts|tsx|json|xml|php|py|java|c|cpp|go|rb)$/
      )
    ) {
      return <FileCode className={cn("text-purple-600", className)} />;
    }

    // Compressed files
    if (
      fileTypeToUse === "archive" ||
      fileTypeToUse.match(/^(zip|rar|tar|gz|7z)$/)
    ) {
      return <FileArchive className={cn("text-amber-600", className)} />;
    }

    // Video files
    if (
      fileTypeToUse === "video" ||
      fileTypeToUse.match(/^(mp4|mov|avi|wmv|flv|webm|mkv)$/)
    ) {
      return <FileVideo className={cn("text-red-500", className)} />;
    }

    // Audio files
    if (
      fileTypeToUse === "audio" ||
      fileTypeToUse.match(/^(mp3|wav|ogg|flac|aac)$/)
    ) {
      return <FileAudio className={cn("text-pink-500", className)} />;
    }

    // Presentations
    if (
      fileTypeToUse === "presentation" ||
      fileTypeToUse.match(/^(ppt|pptx|key|odp)$/)
    ) {
      return <PresentationIcon className={cn("text-orange-500", className)} />;
    }

    // Default file icon
    return <File className={cn("text-gray-500", className)} />;
  };

  return getIcon();
}
