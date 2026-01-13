import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Loader2, Building2, Eye, AlertCircle, CheckCircle2, Clock, Image } from "lucide-react";
import { format } from "date-fns";

interface CondoSearchResult {
  unit?: string;
  close_date?: string;
  sold_price?: number;
  mortgage_amount?: number;
  lender_name?: string;
  loan_type?: string;
}

interface CondoSearch {
  id: string;
  user_id: string;
  status: string;
  street_num: string;
  direction: string;
  street_name: string;
  street_type: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  days_back: number | null;
  max_results: number | null;
  screenshot_url: string | null;
  results_json: { sales?: CondoSearchResult[] } | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

// Flattened row type for display - each result becomes its own row
interface FlattenedSearchRow {
  searchId: string;
  rowNumber: number;
  isFirstRow: boolean;
  totalResults: number;
  search: CondoSearch;
  result: CondoSearchResult | null;
}

const DIRECTION_OPTIONS = ["", "N", "S", "E", "W", "NE", "NW", "SE", "SW"];
const STREET_TYPE_OPTIONS = ["Blvd", "St", "Ave", "Dr", "Ct", "Pl", "Ln", "Way", "Rd", "Ter", "Cir", "Pkwy", "Hwy"];

export default function CondoSearch() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [streetNum, setStreetNum] = useState("");
  const [direction, setDirection] = useState("");
  const [streetName, setStreetName] = useState("");
  const [streetType, setStreetType] = useState("Blvd");
  const [city, setCity] = useState("");
  const [state, setState] = useState("FL");
  const [zip, setZip] = useState("");
  const [daysBack, setDaysBack] = useState("180");
  const [maxResults, setMaxResults] = useState("10");
  const [selectedSearch, setSelectedSearch] = useState<CondoSearch | null>(null);

  // Fetch searches
  const { data: searches, isLoading } = useQuery({
    queryKey: ["condo-searches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("condo_searches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as CondoSearch[];
    },
    enabled: !!user,
  });

  // Real-time subscription for status updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("condo-searches-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "condo_searches",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["condo-searches"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Create search mutation
  const createSearchMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!streetNum || !streetName) {
        throw new Error("Street number and street name are required");
      }

      // Create search record
      const { data: searchRecord, error: insertError } = await supabase
        .from("condo_searches")
        .insert({
          user_id: user.id,
          street_num: streetNum,
          direction: direction || "",
          street_name: streetName,
          street_type: streetType || "",
          city: city || null,
          state: state || "FL",
          zip: zip || null,
          days_back: parseInt(daysBack) || 180,
          max_results: parseInt(maxResults) || 10,
          status: "pending",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Trigger edge function
      const { error: fnError } = await supabase.functions.invoke("condo-search-axiom", {
        body: { search_id: searchRecord.id },
      });

      if (fnError) {
        // Update status to failed
        await supabase
          .from("condo_searches")
          .update({ status: "failed", error_message: fnError.message })
          .eq("id", searchRecord.id);
        throw fnError;
      }

      return searchRecord;
    },
    onSuccess: () => {
      toast.success("MLS search started");
      queryClient.invalidateQueries({ queryKey: ["condo-searches"] });
      // Clear form
      setStreetNum("");
      setDirection("");
      setStreetName("");
      setStreetType("Blvd");
      setCity("");
      setZip("");
      setDaysBack("180");
      setMaxResults("10");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start search");
    },
  });

  const formatAddress = (search: CondoSearch) => {
    const parts = [
      search.street_num,
      search.direction,
      search.street_name,
      search.street_type,
    ].filter(Boolean);
    const street = parts.join(" ");
    const cityStateZip = [search.city, search.state, search.zip].filter(Boolean).join(", ");
    return cityStateZip ? `${street}, ${cityStateZip}` : street;
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "running":
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Running
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Pending
          </Badge>
        );
    }
  };

  const runningCount = searches?.filter((s) => s.status === "running" || s.status === "pending").length || 0;
  const completedCount = searches?.filter((s) => s.status === "completed").length || 0;
  const failedCount = searches?.filter((s) => s.status === "failed").length || 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Building2 className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Condo Sales Search</h1>
          <p className="text-muted-foreground">
            Search the MLS for recent closed condo sales to uncover lender and mortgage history.
          </p>
        </div>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search Property Address</CardTitle>
          <CardDescription>
            Enter the property address components to match MLS search fields
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="street-num">Street Number *</Label>
              <Input
                id="street-num"
                placeholder="90"
                value={streetNum}
                onChange={(e) => setStreetNum(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="direction">Direction</Label>
              <Select value={direction} onValueChange={setDirection}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {DIRECTION_OPTIONS.map((dir) => (
                    <SelectItem key={dir || "none"} value={dir || "none"}>
                      {dir || "None"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="street-name">Street Name *</Label>
              <Input
                id="street-name"
                placeholder="Biscayne"
                value={streetName}
                onChange={(e) => setStreetName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="street-type">Street Type</Label>
              <Select value={streetType} onValueChange={setStreetType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {STREET_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Miami"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                placeholder="FL"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                placeholder="33132"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="days-back">Days Back</Label>
              <Input
                id="days-back"
                type="number"
                placeholder="180"
                value={daysBack}
                onChange={(e) => setDaysBack(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Search closed sales from 0 to X days ago
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-results">Max Results</Label>
              <Input
                id="max-results"
                type="number"
                placeholder="10"
                value={maxResults}
                onChange={(e) => setMaxResults(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Top X results to return
              </p>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => createSearchMutation.mutate()}
                disabled={createSearchMutation.isPending || !streetNum || !streetName}
                className="w-full"
              >
                {createSearchMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Run MLS Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{searches?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Total Searches</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{runningCount}</div>
            <p className="text-xs text-muted-foreground">Running</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{failedCount}</div>
            <p className="text-xs text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search History & Results</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !searches?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No searches yet. Run your first MLS search to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Search Date & Time</TableHead>
                    <TableHead>Mortgage Date</TableHead>
                    <TableHead>Mortgage Amount</TableHead>
                    <TableHead>Mortgage Lender</TableHead>
                    <TableHead>Sales Price</TableHead>
                    <TableHead className="w-20">Screenshot</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // Flatten all searches into individual rows
                    const flattenedRows: FlattenedSearchRow[] = [];
                    
                    searches.forEach((search) => {
                      const results = search.results_json?.sales || [];
                      
                      if (results.length === 0) {
                        // No results yet - show single row for the search
                        flattenedRows.push({
                          searchId: search.id,
                          rowNumber: 1,
                          isFirstRow: true,
                          totalResults: 0,
                          search,
                          result: null,
                        });
                      } else {
                        // Multiple results - each becomes its own row
                        results.forEach((result, idx) => {
                          flattenedRows.push({
                            searchId: search.id,
                            rowNumber: idx + 1,
                            isFirstRow: idx === 0,
                            totalResults: results.length,
                            search,
                            result,
                          });
                        });
                      }
                    });
                    
                    return flattenedRows.map((row, index) => (
                      <TableRow key={`${row.searchId}-${row.rowNumber}`}>
                        <TableCell className="font-medium text-muted-foreground">
                          {row.rowNumber}
                        </TableCell>
                        <TableCell>
                          {row.isFirstRow ? getStatusBadge(row.search.status) : null}
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.isFirstRow ? formatAddress(row.search) : null}
                        </TableCell>
                        <TableCell>
                          {row.result?.unit || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.isFirstRow ? (
                            <div className="flex flex-col">
                              <span>{format(new Date(row.search.created_at), "MMM d, yyyy")}</span>
                              <span className="text-xs">{format(new Date(row.search.created_at), "h:mm a")}</span>
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {row.search.status === "completed" && row.result?.close_date
                            ? format(new Date(row.result.close_date), "MMM d, yyyy")
                            : row.search.status === "failed" && row.isFirstRow
                            ? <span className="text-destructive text-xs">{row.search.error_message || "Error"}</span>
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {row.search.status === "completed" && row.result
                            ? formatCurrency(row.result.mortgage_amount)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {row.search.status === "completed" && row.result
                            ? (row.result.lender_name || "-")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {row.search.status === "completed" && row.result
                            ? formatCurrency(row.result.sold_price)
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {row.isFirstRow && row.search.screenshot_url ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <button className="w-16 h-12 rounded border overflow-hidden hover:opacity-80 transition-opacity">
                                  <img 
                                    src={row.search.screenshot_url} 
                                    alt="MLS Screenshot" 
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl">
                                <DialogHeader>
                                  <DialogTitle>MLS Search Results Screenshot</DialogTitle>
                                </DialogHeader>
                                <img 
                                  src={row.search.screenshot_url} 
                                  alt="MLS Screenshot" 
                                  className="w-full rounded"
                                />
                              </DialogContent>
                            </Dialog>
                          ) : row.isFirstRow ? (
                            <div className="w-16 h-12 rounded border bg-muted flex items-center justify-center">
                              <Image className="w-4 h-4 text-muted-foreground" />
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {row.isFirstRow && row.search.status === "completed" && row.totalResults > 1 && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedSearch(row.search)}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View All ({row.totalResults})
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>
                                    Sales Results - {formatAddress(row.search)}
                                  </DialogTitle>
                                </DialogHeader>
                                <div className="mt-4">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>#</TableHead>
                                        <TableHead>Unit</TableHead>
                                        <TableHead>Close Date</TableHead>
                                        <TableHead>Sold Price</TableHead>
                                        <TableHead>Mortgage Amount</TableHead>
                                        <TableHead>Lender Name</TableHead>
                                        <TableHead>Loan Type</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {(row.search.results_json?.sales || []).map((result, idx) => (
                                        <TableRow key={idx}>
                                          <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                                          <TableCell>{result.unit || "-"}</TableCell>
                                          <TableCell>
                                            {result.close_date
                                              ? format(new Date(result.close_date), "MMM d, yyyy")
                                              : "-"}
                                          </TableCell>
                                          <TableCell>{formatCurrency(result.sold_price)}</TableCell>
                                          <TableCell>{formatCurrency(result.mortgage_amount)}</TableCell>
                                          <TableCell>{result.lender_name || "-"}</TableCell>
                                          <TableCell>{result.loan_type || "-"}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
