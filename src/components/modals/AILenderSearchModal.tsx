import { useState } from "react";
import { Sparkles, Search, Loader2, Building2, ExternalLink, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toLenderTitleCase } from "@/lib/utils";

interface LenderResult {
  id: string;
  lender_name: string;
  lender_type: string;
  has_email: boolean;
}

interface AILenderSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewLender: (lenderId: string) => void;
  onSelectLenders: (lenderIds: string[]) => void;
}

export function AILenderSearchModal({
  isOpen,
  onClose,
  onViewLender,
  onSelectLenders,
}: AILenderSearchModalProps) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<LenderResult[]>([]);
  const [explanation, setExplanation] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    setResults([]);
    setExplanation("");

    try {
      const { data, error } = await supabase.functions.invoke('ai-lender-search', {
        body: { query: query.trim() }
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Search Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setResults(data.lenders || []);
      setExplanation(data.explanation || "");
      
      if (data.lenders?.length === 0) {
        toast({
          title: "No Results",
          description: "No lenders matched your search criteria.",
        });
      }
    } catch (error) {
      console.error("AI search error:", error);
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Failed to search lenders.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === results.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map(r => r.id)));
    }
  };

  const handleApplySelection = () => {
    onSelectLenders(Array.from(selectedIds));
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSearch();
    }
  };

  const getLenderTypeColor = (type: string) => {
    switch (type) {
      case 'Conventional': return 'bg-blue-500/20 text-blue-700 dark:text-blue-400';
      case 'Non-QM': return 'bg-purple-500/20 text-purple-700 dark:text-purple-400';
      case 'Private': return 'bg-orange-500/20 text-orange-700 dark:text-orange-400';
      case 'HELOC': return 'bg-green-500/20 text-green-700 dark:text-green-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Lender Search
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="e.g., lenders that do non-warrantable condos with 80% LTV"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10"
                disabled={isLoading}
              />
            </div>
            <Button onClick={handleSearch} disabled={isLoading || !query.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>

          {/* Example Queries */}
          {!hasSearched && (
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Example searches:</p>
              <ul className="space-y-1 text-xs">
                <li className="cursor-pointer hover:text-foreground" onClick={() => setQuery("lenders that offer bank statement loans")}>
                  • "lenders that offer bank statement loans"
                </li>
                <li className="cursor-pointer hover:text-foreground" onClick={() => setQuery("non-QM lenders with ITIN programs")}>
                  • "non-QM lenders with ITIN programs"
                </li>
                <li className="cursor-pointer hover:text-foreground" onClick={() => setQuery("lenders for 5-8 unit properties")}>
                  • "lenders for 5-8 unit properties"
                </li>
                <li className="cursor-pointer hover:text-foreground" onClick={() => setQuery("who does foreign national loans")}>
                  • "who does foreign national loans"
                </li>
              </ul>
            </div>
          )}

          {/* Explanation */}
          {explanation && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              <Sparkles className="h-4 w-4 inline mr-2 text-primary" />
              {explanation}
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {results.length} lender{results.length !== 1 ? 's' : ''} found
                </span>
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  {selectedIds.size === results.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {results.map((lender) => (
                    <div
                      key={lender.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                        selectedIds.has(lender.id) ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleSelection(lender.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{toLenderTitleCase(lender.lender_name)}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="secondary" className={`text-xs ${getLenderTypeColor(lender.lender_type)}`}>
                              {lender.lender_type}
                            </Badge>
                            {lender.has_email && (
                              <Mail className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewLender(lender.id);
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* No Results */}
          {hasSearched && !isLoading && results.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No lenders found</p>
              <p className="text-sm">Try adjusting your search criteria</p>
            </div>
          )}

          {/* Action Buttons */}
          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} lender{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <Button onClick={handleApplySelection}>
                <Mail className="h-4 w-4 mr-2" />
                Email Selected
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
