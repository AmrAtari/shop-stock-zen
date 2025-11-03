import React from "react";
import { FileImportProps } from "@/types";

export const FileImport: React.FC<FileImportProps> = ({ open, onOpenChange, onImportComplete }) => {
  if (!open) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate import
    console.log("File imported:", file.name);
    onImportComplete();
    onOpenChange(false);
  };

  return (
    <div className="dialog-backdrop">
      <div className="dialog">
        <h2>Import File</h2>
        <input type="file" onChange={handleFileUpload} />
        <button onClick={() => onOpenChange(false)}>Cancel</button>
      </div>
    </div>
  );
};
