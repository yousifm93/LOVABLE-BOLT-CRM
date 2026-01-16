import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";
import * as XLSX from 'xlsx';

interface ParsedCondo {
  condo_name: string;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  source_uwm: boolean;
  source_ad: boolean;
  review_type: string | null;
  approval_expiration_date: string | null;
  primary_down: string | null;
  second_down: string | null;
  investment_down: string | null;
}

// Excel stores dates as serial numbers (days since Dec 30, 1899)
function excelSerialToDate(serial: number | string | null | undefined): string | null {
  if (serial === null || serial === undefined || serial === '' || serial === '-') {
    return null;
  }
  
  // If it's already a string date like "June 16, 2027"
  if (typeof serial === 'string' && isNaN(Number(serial))) {
    try {
      const date = new Date(serial);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {
      return null;
    }
    return null;
  }
  
  // Excel serial number
  const numSerial = Number(serial);
  if (isNaN(numSerial) || numSerial < 1) return null;
  
  // Excel epoch: December 30, 1899
  const excelEpoch = new Date(1899, 11, 30);
  const date = new Date(excelEpoch.getTime() + numSerial * 24 * 60 * 60 * 1000);
  
  return date.toISOString().split('T')[0];
}

// Convert decimal (0.25) or number (25) to percentage string ("25%")
function formatPercentage(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === '' || value === '-') return null;
  
  const str = String(value).trim();
  
  // Already has % sign
  if (str.includes('%')) {
    return str;
  }
  
  const num = Number(str);
  if (isNaN(num)) {
    return str; // Return as-is if not a number
  }
  
  // Convert decimal to percentage (0.25 → "25%")
  if (num > 0 && num < 1) {
    return `${Math.round(num * 100)}%`;
  }
  
  // Already a percentage number (25 → "25%")
  if (num >= 1 && num <= 100) {
    return `${Math.round(num)}%`;
  }
  
  return `${num}%`;
}

export default function ImportCondos() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedCondos, setParsedCondos] = useState<ParsedCondo[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setImported(false);
    
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
      
      // Skip header row
      const condos: ParsedCondo[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !row[0]) continue; // Skip empty rows
        
        const condo: ParsedCondo = {
          condo_name: String(row[0] || '').trim(),
          street_address: row[1] !== undefined && row[1] !== null && String(row[1]).trim() !== '' 
            ? String(row[1]).trim() 
            : null,
          city: row[2] ? String(row[2]).trim() : null,
          state: row[3] ? String(row[3]).trim().replace(/[^A-Z]/gi, '') : null,
          zip: row[4] ? String(row[4]).trim() : null,
          source_uwm: String(row[5] || '').toUpperCase() === 'YES',
          source_ad: String(row[6] || '').toUpperCase() === 'YES',
          review_type: row[7] ? String(row[7]).trim() : null,
          approval_expiration_date: excelSerialToDate(row[8]),
          primary_down: formatPercentage(row[9]),
          second_down: formatPercentage(row[10]),
          investment_down: formatPercentage(row[11]),
        };
        
        // Only add if condo_name is not empty
        if (condo.condo_name) {
          condos.push(condo);
        }
      }
      
      setParsedCondos(condos);
      toast({
        title: "File parsed",
        description: `Found ${condos.length} condos to import`,
      });
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: "Error",
        description: "Failed to parse Excel file",
        variant: "destructive"
      });
    }
  };

  const handleImport = async () => {
    if (parsedCondos.length === 0) {
      toast({
        title: "No data",
        description: "Please select a file first",
        variant: "destructive"
      });
      return;
    }
    
    setImporting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('import-condos', {
        body: { condos: parsedCondos, clearExisting: true }
      });
      
      if (error) throw error;
      
      setImported(true);
      toast({
        title: "Import complete",
        description: `Successfully imported ${data.inserted} of ${data.total} condos`,
      });
    } catch (error) {
      console.error('Error importing condos:', error);
      toast({
        title: "Error",
        description: "Failed to import condos",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Import Condos</h1>
        <p className="text-muted-foreground">Upload your Excel file to import condos</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Excel File
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Select Excel file (.xlsx)</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
          </div>
          
          {parsedCondos.length > 0 && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm font-medium">Ready to import {parsedCondos.length} condos</p>
              <p className="text-xs text-muted-foreground">
                This will replace all existing condos in the database.
              </p>
              
              <div className="text-xs space-y-1 mt-2">
                <p><strong>Sample entries:</strong></p>
                {parsedCondos.slice(0, 3).map((condo, idx) => (
                  <p key={idx} className="text-muted-foreground truncate">
                    {idx + 1}. {condo.condo_name} - {condo.city}, {condo.state}
                  </p>
                ))}
                {parsedCondos.length > 3 && (
                  <p className="text-muted-foreground">...and {parsedCondos.length - 3} more</p>
                )}
              </div>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              disabled={parsedCondos.length === 0 || importing || imported}
              className="flex items-center gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : imported ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Imported!
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Import {parsedCondos.length} Condos
                </>
              )}
            </Button>
            
            {imported && (
              <Button variant="outline" onClick={() => window.location.href = '/resources/condolist'}>
                View Condo List
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
