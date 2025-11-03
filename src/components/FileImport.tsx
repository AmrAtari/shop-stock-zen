import React from "react";
import { FileImportProps } from "@/types";

export const FileImport: React.FC<FileImportProps> = ({ open, onOpenChange, onImportComplete }) => {
  if (!open) return null;

  const handleImport = () => {
    // Placeholder for your file import logic
    onImportComplete();
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="bg-white p-4 rounded w-96">
        <h2 className="text-lg font-bold">Import File</h2>
        <input type="file" className="mt-2" />
        <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded" onClick={handleImport}>
          Import
        </button>
        <button className="mt-2 px-4 py-2 bg-gray-300 rounded" onClick={() => onOpenChange(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
};
