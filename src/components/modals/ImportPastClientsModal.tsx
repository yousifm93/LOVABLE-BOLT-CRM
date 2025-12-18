import { useState } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ImportPastClientsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ParsedRecord {
  [key: string]: string | null;
}

type ImportStatus = "idle" | "parsing" | "preview" | "importing" | "success" | "error";

export function ImportPastClientsModal({
  open,
  onOpenChange,
  onImportComplete,
}: ImportPastClientsModalProps) {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [records, setRecords] = useState<ParsedRecord[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const { toast } = useToast();

  const cleanValue = (value: any): string | null => {
    if (value === null || value === undefined || value === "") return null;
    // Clean escaped characters (like backslash in emails)
    let cleaned = String(value).trim();
    cleaned = cleaned.replace(/\\/g, "");
    // Handle Excel date serial numbers
    if (typeof value === "number" && value > 25000 && value < 60000) {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
      }
    }
    return cleaned || null;
  };

  const parseExcelFile = async (file: File) => {
    setStatus("parsing");
    setProgress(10);

    try {
      const arrayBuffer = await file.arrayBuffer();
      setProgress(30);

      const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
      setProgress(50);

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with headers from first row
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
        raw: false,
        defval: null,
      });
      setProgress(70);

      // Clean all values
      const cleanedData: ParsedRecord[] = jsonData.map((row) => {
        const cleanedRow: ParsedRecord = {};
        for (const [key, value] of Object.entries(row)) {
          cleanedRow[key] = cleanValue(value);
        }
        return cleanedRow;
      });

      setProgress(100);
      setRecords(cleanedData);
      setStatus("preview");
    } catch (error) {
      console.error("Error parsing Excel:", error);
      toast({
        title: "Parse Error",
        description: "Failed to parse the Excel file. Please check the format.",
        variant: "destructive",
      });
      setStatus("error");
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      parseExcelFile(file);
    }
    // Reset input so same file can be selected again
    event.target.value = "";
  };

  const handleImport = async () => {
    setStatus("importing");
    setProgress(0);

    try {
      // Call edge function with parsed data
      const { data, error } = await supabase.functions.invoke("import-past-clients", {
        body: { mode: "APPLY", data: records },
      });

      if (error) {
        throw error;
      }

      setResult({
        imported: data.imported || 0,
        errors: data.errors || [],
      });
      setStatus("success");

      toast({
        title: "Import Complete",
        description: `Successfully imported ${data.imported} past clients`,
      });

      onImportComplete();
    } catch (error: any) {
      console.error("Import error:", error);
      setResult({
        imported: 0,
        errors: [error.message || "Unknown error occurred"],
      });
      setStatus("error");

      toast({
        title: "Import Failed",
        description: error.message || "Failed to import records",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setStatus("idle");
    setRecords([]);
    setProgress(0);
    setResult(null);
    onOpenChange(false);
  };

  const getSampleColumns = () => {
    if (records.length === 0) return [];
    const keys = Object.keys(records[0]);
    return keys.slice(0, 8);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Past Clients
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file (.xlsx) to import past client records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {status === "idle" && (
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
                id="excel-upload"
              />
              <label
                htmlFor="excel-upload"
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                <Upload className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="font-medium">Click to upload Excel file</p>
                  <p className="text-sm text-muted-foreground">
                    Supports .xlsx, .xls, and .csv files
                  </p>
                </div>
                <Button variant="outline" type="button">
                  Select File
                </Button>
              </label>
            </div>
          )}

          {status === "parsing" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Parsing Excel file...</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {status === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-base px-3 py-1">
                  {records.length} records found
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatus("idle");
                    setRecords([]);
                  }}
                >
                  Choose different file
                </Button>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium mb-2">Columns detected:</p>
                <div className="flex flex-wrap gap-1.5">
                  {getSampleColumns().map((col) => (
                    <Badge key={col} variant="outline" className="text-xs">
                      {col}
                    </Badge>
                  ))}
                  {Object.keys(records[0] || {}).length > 8 && (
                    <Badge variant="outline" className="text-xs">
                      +{Object.keys(records[0]).length - 8} more
                    </Badge>
                  )}
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium mb-2">Sample records:</p>
                <ScrollArea className="h-32">
                  <div className="space-y-1.5 text-xs">
                    {records.slice(0, 5).map((record, idx) => (
                      <div key={idx} className="bg-background rounded px-2 py-1">
                        {record["Borrower FN"] || record["Name"]?.split(" ")[0]} {record["Borrower LN"] || record["Name"]?.split(" ").slice(1).join(" ")} 
                        {record["CLOSE DATE"] && ` — Closed: ${record["CLOSE DATE"]}`}
                        {record["LOAN AMT"] && ` — $${Number(record["LOAN AMT"]).toLocaleString()}`}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  <strong>Note:</strong> This will replace all existing Past Clients records.
                  Existing Past Client leads will be soft-deleted before importing.
                </p>
              </div>
            </div>
          )}

          {status === "importing" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Importing {records.length} records...</span>
              </div>
              <Progress value={undefined} className="animate-pulse" />
            </div>
          )}

          {status === "success" && result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Import completed successfully!</span>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-sm">
                  <strong>{result.imported}</strong> past clients imported
                </p>
                {result.errors.length > 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.errors.length} records had errors
                  </p>
                )}
              </div>
            </div>
          )}

          {status === "error" && result && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Import failed</span>
              </div>
              {result.errors.length > 0 && (
                <ScrollArea className="h-24">
                  <div className="space-y-1 text-sm text-destructive">
                    {result.errors.slice(0, 10).map((err, idx) => (
                      <div key={idx}>{err}</div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {status === "success" ? "Close" : "Cancel"}
          </Button>
          {status === "preview" && (
            <Button onClick={handleImport}>
              Import {records.length} Records
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
