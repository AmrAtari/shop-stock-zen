// File: src/components/FileImport.tsx
import React, { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FileImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

const FileImport: React.FC<FileImportProps> = ({ open, onOpenChange, onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setIsLoading(true);

    // TODO: Add your file processing logic
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setIsLoading(false);
    onImportComplete();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="p-4">
        <h2 className="text-lg font-bold mb-2">Import File</h2>
        <input type="file" onChange={handleFileChange} />
        <div className="mt-4 flex justify-end space-x-2">
          <Button onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!file || isLoading}>
            {isLoading ? "Importing..." : "Import"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default FileImport;
