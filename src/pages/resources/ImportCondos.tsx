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

// Parse date strings like "June 16, 2027" to "2027-06-16"
function parseExpirationDate(dateStr: string | null): string | null {
  if (!dateStr || dateStr === '' || dateStr === '-') return null;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
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
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // Skip header row
      const condos: ParsedCondo[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !row[0]) continue; // Skip empty rows
        
        const condo: ParsedCondo = {
          condo_name: String(row[0] || '').trim(),
          street_address: row[1] ? String(row[1]).trim() : null,
          city: row[2] ? String(row[2]).trim() : null,
          state: row[3] ? String(row[3]).trim().replace(/[^A-Z]/gi, '') : null,
          zip: row[4] ? String(row[4]).trim() : null,
          source_uwm: String(row[5] || '').toUpperCase() === 'YES',
          source_ad: String(row[6] || '').toUpperCase() === 'YES',
          review_type: row[7] ? String(row[7]).trim() : null,
          approval_expiration_date: parseExpirationDate(row[8] ? String(row[8]) : null),
          primary_down: row[9] ? String(row[9]).trim() : null,
          second_down: row[10] ? String(row[10]).trim() : null,
          investment_down: row[11] ? String(row[11]).trim() : null,
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
