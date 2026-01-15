import { useState, useEffect } from "react";
import { Loader2, Building2, DollarSign, Percent, CreditCard, Package, Star, AlertCircle, Check, X, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { databaseService } from "@/services/database";

interface LenderMarketingData {
  lender_name?: string | null;
  max_loan_amount?: string | null;
  min_loan_amount?: string | null;
  max_ltv?: string | null;
  min_fico?: string | null;
  products?: string[];
  dscr_ltv?: string | null;
  bank_statement_ltv?: string | null;
  non_qm_ltv?: string | null;
  interest_only?: boolean | null;
  prepay_penalty?: string | null;
  special_features?: string[];
  restrictions?: string[];
  notes?: string | null;
  ai_summary?: string | null;
  // Product flags from email extraction
  product_dscr?: string | null;
  product_bank_statement?: string | null;
  product_p_l?: string | null;
  product_1099?: string | null;
  product_asset_depletion?: string | null;
  product_foreign_national?: string | null;
  product_itin?: string | null;
  product_non_warrantable_condo?: string | null;
  product_jumbo?: string | null;
  product_bridge?: string | null;
  product_fix_flip?: string | null;
  product_construction?: string | null;
  product_commercial?: string | null;
}

interface LenderFieldSuggestion {
  id: string;
  email_log_id: string;
  lender_id: string | null;
  is_new_lender: boolean;
  suggested_lender_name: string | null;
  field_name: string;
  current_value: string | null;
  suggested_value: string;
  confidence: number;
  reason: string;
  status: string;
}

interface LenderMarketingPopoverProps {
  emailLogId: string;
  category: string | null;
  subject: string;
  className?: string;
  pendingSuggestionCount?: number;
}

export function LenderMarketingPopover({ emailLogId, category, subject, className, pendingSuggestionCount = 0 }: LenderMarketingPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<LenderMarketingData | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<LenderFieldSuggestion[]>([]);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    if (open && !data) {
      setIsLoading(true);
      try {
        // Fetch the email log to get existing data
        const { data: emailLog, error } = await supabase
          .from('email_logs')
          .select('lender_marketing_data, ai_summary')
          .eq('id', emailLogId)
          .single();

        if (error) {
          console.error('Error fetching email log:', error);
        } else {
          const marketingData = emailLog?.lender_marketing_data as LenderMarketingData | null;
          setData(marketingData);
          setAiSummary(emailLog?.ai_summary || marketingData?.ai_summary || null);
        }

        // Fetch suggestions for this email
        const { data: suggestionsData, error: suggestionsError } = await supabase
          .from('lender_field_suggestions')
          .select('*')
          .eq('email_log_id', emailLogId)
          .order('created_at', { ascending: false });

        if (suggestionsError) {
          console.error('Error fetching suggestions:', suggestionsError);
        } else {
          setSuggestions(suggestionsData || []);
        }
      } catch (error) {
        console.error('Error loading lender marketing data:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleApproveSuggestion = async (suggestion: LenderFieldSuggestion) => {
    setProcessingIds(prev => new Set(prev).add(suggestion.id));
    try {
      if (suggestion.is_new_lender) {
        // Helper functions to parse extracted data
        const parsePercent = (val: string | null | undefined): number | null => {
          if (!val) return null;
          const num = parseFloat(val.replace('%', '').replace(/,/g, ''));
          return isNaN(num) ? null : num;
        };
        const parseNumber = (val: string | null | undefined): number | null => {
          if (!val) return null;
          const num = parseInt(val.replace(/[^0-9]/g, ''));
          return isNaN(num) ? null : num;
        };
        const parseCurrency = (val: string | null | undefined): number | null => {
          if (!val) return null;
          const num = parseInt(val.replace(/[$,\s]/g, ''));
          return isNaN(num) ? null : num;
        };

        // Create new lender with ALL extracted data from the email
        const lenderData: Record<string, any> = {
          lender_name: suggestion.suggested_lender_name || 'Unknown Lender',
          status: 'Pending',
          lender_type: 'Non-QM',
        };

        // Populate fields from extracted data if available
        if (data) {
          // Loan limits
          if (data.max_loan_amount) lenderData.max_loan_amount = parseCurrency(data.max_loan_amount);
          if (data.min_loan_amount) lenderData.min_loan_amount = parseCurrency(data.min_loan_amount);
          
          // LTVs  
          if (data.max_ltv) lenderData.max_ltv = parsePercent(data.max_ltv);
          if (data.dscr_ltv) lenderData.dscr_max_ltv = parsePercent(data.dscr_ltv);
          if (data.bank_statement_ltv) lenderData.bs_loan_max_ltv = parsePercent(data.bank_statement_ltv);
          
          // FICO
          if (data.min_fico) lenderData.min_fico = parseNumber(data.min_fico);
          
          // Product flags - check products array and individual fields
          // Use correct database column names from lenders table
          const products = data.products || [];
          if (products.includes('DSCR') || data.product_dscr === 'Y') lenderData.product_fthb_dscr = 'Y';
          if (products.includes('Bank Statement') || data.product_bank_statement === 'Y') lenderData.product_bs_loan = 'Y';
          if (products.includes('P&L') || data.product_p_l === 'Y') lenderData.product_pl_program = 'Y';
          if (products.includes('1099') || data.product_1099 === 'Y') lenderData.product_1099_program = 'Y';
          // product_asset_depletion - no equivalent column in lenders table, skip
          if (products.includes('Foreign National') || data.product_foreign_national === 'Y') lenderData.product_fn = 'Y';
          if (products.includes('ITIN') || data.product_itin === 'Y') lenderData.product_itin = 'Y';
          if (products.includes('Non-Warrantable Condo') || data.product_non_warrantable_condo === 'Y') lenderData.product_nwc = 'Y';
          if (products.includes('Jumbo') || data.product_jumbo === 'Y') lenderData.product_jumbo = 'Y';
          // product_bridge - no equivalent column in lenders table, skip
          // product_fix_flip - no equivalent column in lenders table, skip
          if (products.includes('Construction') || data.product_construction === 'Y') lenderData.product_construction = 'Y';
          if (products.includes('Commercial') || data.product_commercial === 'Y') lenderData.product_commercial = 'Y';
          
          // Special features as notes
          if (data.special_features && data.special_features.length > 0) {
            lenderData.notes = '• ' + data.special_features.join('\n• ');
          } else if (data.notes) {
            lenderData.notes = data.notes;
          }
        }

        await databaseService.createLender(lenderData);
        toast({
          title: "Lender Added",
          description: `${suggestion.suggested_lender_name} added to Not Approved section with extracted data`,
        });
      } else if (suggestion.lender_id) {
        // Update the lender field
        await databaseService.updateLender(suggestion.lender_id, {
          [suggestion.field_name]: suggestion.suggested_value,
        });
        toast({
          title: "Lender Updated",
          description: `Updated ${formatFieldName(suggestion.field_name)} to ${suggestion.suggested_value}`,
        });
      }

      // Mark suggestion as approved
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('lender_field_suggestions')
        .update({
          status: 'approved',
          processed_at: new Date().toISOString(),
          processed_by: user?.id,
        })
        .eq('id', suggestion.id);

      // Update local state
      setSuggestions(prev => prev.map(s => 
        s.id === suggestion.id ? { ...s, status: 'approved' } : s
      ));
    } catch (error: any) {
      console.error('Error approving suggestion:', error);
      console.error('Suggestion details:', { 
        is_new_lender: suggestion.is_new_lender, 
        lender_name: suggestion.suggested_lender_name,
        field_name: suggestion.field_name 
      });
      toast({
        title: "Error",
        description: `Failed to apply suggestion: ${error?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(suggestion.id);
        return next;
      });
    }
  };

  const handleDenySuggestion = async (suggestion: LenderFieldSuggestion) => {
    setProcessingIds(prev => new Set(prev).add(suggestion.id));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('lender_field_suggestions')
        .update({
          status: 'denied',
          processed_at: new Date().toISOString(),
          processed_by: user?.id,
        })
        .eq('id', suggestion.id);

      setSuggestions(prev => prev.map(s => 
        s.id === suggestion.id ? { ...s, status: 'denied' } : s
      ));
    } catch (error) {
      console.error('Error denying suggestion:', error);
      toast({
        title: "Error",
        description: "Failed to deny suggestion",
        variant: "destructive",
      });
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(suggestion.id);
        return next;
      });
    }
  };

  const formatFieldName = (fieldName: string) => {
    return fieldName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace('Product ', '');
  };

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  const processedSuggestions = suggestions.filter(s => s.status !== 'pending');

  const hasData = data && (
    data.lender_name ||
    data.max_loan_amount ||
    data.max_ltv ||
    data.min_fico ||
    (data.products && data.products.length > 0) ||
    (data.special_features && data.special_features.length > 0)
  );

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "bg-blue-500/20 text-blue-600 border border-blue-500/30 text-[10px] px-1.5 py-0 h-5 rounded-full hover:bg-blue-500/30 transition-colors font-medium inline-flex items-center gap-1",
            className
          )}
        >
          Lender Marketing
          {pendingSuggestionCount > 0 && (
            <span className="bg-blue-600 text-white text-[9px] px-1.5 min-w-[16px] text-center rounded-full">
              {pendingSuggestionCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[520px] p-0" 
        align="end"
        side="bottom"
        sideOffset={5}
        collisionPadding={16}
        avoidCollisions={true}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <h4 className="font-semibold text-sm">
                {data?.lender_name || 'Lender Marketing'}
              </h4>
            </div>
            {category && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 border-blue-500/20">
                {category}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-1">{subject}</p>
        </div>

        <ScrollArea className="max-h-[500px]">
          <div className="p-3 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* AI Summary Section */}
                {aiSummary && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-1.5">AI Summary</h5>
                    <div className="bg-muted/50 rounded-md p-2.5 text-sm">
                      {aiSummary}
                    </div>
                  </div>
                )}

                {/* CRM Update Suggestions Section */}
                {suggestions.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-1.5">
                      CRM Updates {pendingSuggestions.length > 0 && `(${pendingSuggestions.length} pending)`}
                    </h5>
                    <div className="space-y-2">
                      {pendingSuggestions.map((suggestion) => (
                        <div key={suggestion.id} className="border rounded-md p-2.5 bg-card">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              {suggestion.is_new_lender ? (
                                <div className="flex items-center gap-1.5">
                                  <Plus className="h-3.5 w-3.5 text-green-600" />
                                  <span className="text-xs font-medium">Add New Lender</span>
                                </div>
                              ) : (
                                <span className="text-xs font-medium">
                                  {formatFieldName(suggestion.field_name)}
                                </span>
                              )}
                              <div className="text-xs mt-1">
                                {suggestion.is_new_lender ? (
                                  <span className="text-green-600 font-medium">{suggestion.suggested_lender_name}</span>
                                ) : (
                                  <>
                                    <span className="text-muted-foreground">{suggestion.current_value || '∅'}</span>
                                    <span className="mx-1.5">→</span>
                                    <span className="text-green-600 font-medium">{suggestion.suggested_value}</span>
                                  </>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                                {suggestion.reason}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleApproveSuggestion(suggestion)}
                                disabled={processingIds.has(suggestion.id)}
                              >
                                {processingIds.has(suggestion.id) ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDenySuggestion(suggestion)}
                                disabled={processingIds.has(suggestion.id)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Processed suggestions */}
                      {processedSuggestions.map((suggestion) => (
                        <div key={suggestion.id} className="border rounded-md p-2.5 bg-muted/30 opacity-60">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium">
                                  {suggestion.is_new_lender ? 'Add New Lender' : formatFieldName(suggestion.field_name)}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-[9px] px-1 py-0",
                                    suggestion.status === 'approved' 
                                      ? "bg-green-100 text-green-700 border-green-200" 
                                      : "bg-gray-100 text-gray-500 border-gray-200"
                                  )}
                                >
                                  {suggestion.status}
                                </Badge>
                              </div>
                              <div className="text-xs mt-1">
                                {suggestion.is_new_lender ? (
                                  <span>{suggestion.suggested_lender_name}</span>
                                ) : (
                                  <>
                                    <span className="text-muted-foreground">{suggestion.current_value || '∅'}</span>
                                    <span className="mx-1.5">→</span>
                                    <span>{suggestion.suggested_value}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data Collected Section */}
                <div>
                  <h5 className="text-xs font-medium text-muted-foreground mb-1.5">Data Collected</h5>
                  
                  {!hasData ? (
                    <p className="text-xs text-muted-foreground italic py-2">
                      No specific lender data extracted yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {/* Loan Limits */}
                      {(data?.max_loan_amount || data?.min_loan_amount) && (
                        <DataRow 
                          icon={DollarSign}
                          label="Loan Amount"
                          value={[data?.min_loan_amount, data?.max_loan_amount].filter(Boolean).join(' - ')}
                        />
                      )}

                      {/* LTV */}
                      {data?.max_ltv && (
                        <DataRow 
                          icon={Percent}
                          label="Max LTV"
                          value={data.max_ltv}
                        />
                      )}

                      {/* DSCR LTV */}
                      {data?.dscr_ltv && (
                        <DataRow 
                          icon={Percent}
                          label="DSCR LTV"
                          value={data.dscr_ltv}
                        />
                      )}

                      {/* Bank Statement LTV */}
                      {data?.bank_statement_ltv && (
                        <DataRow 
                          icon={Percent}
                          label="Bank Statement LTV"
                          value={data.bank_statement_ltv}
                        />
                      )}

                      {/* Min FICO */}
                      {data?.min_fico && (
                        <DataRow 
                          icon={CreditCard}
                          label="Min FICO"
                          value={data.min_fico}
                        />
                      )}

                      {/* Interest Only */}
                      {data?.interest_only !== null && data?.interest_only !== undefined && (
                        <DataRow 
                          icon={Star}
                          label="Interest Only"
                          value={data.interest_only ? 'Available' : 'Not Available'}
                        />
                      )}

                      {/* Prepay Penalty */}
                      {data?.prepay_penalty && (
                        <DataRow 
                          icon={AlertCircle}
                          label="Prepay Penalty"
                          value={data.prepay_penalty}
                        />
                      )}

                      {/* Products */}
                      {data?.products && data.products.length > 0 && (
                        <div className="border rounded-md p-2.5 bg-card">
                          <div className="flex items-start gap-2">
                            <Package className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <span className="text-xs font-medium text-muted-foreground">Products</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {data.products.map((product, idx) => (
                                  <Badge 
                                    key={idx} 
                                    variant="secondary" 
                                    className="text-[10px] px-1.5 py-0"
                                  >
                                    {product}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Special Features */}
                      {data?.special_features && data.special_features.length > 0 && (
                        <div className="border rounded-md p-2.5 bg-card">
                          <div className="flex items-start gap-2">
                            <Star className="h-3.5 w-3.5 text-yellow-500 mt-0.5" />
                            <div className="flex-1">
                              <span className="text-xs font-medium text-muted-foreground">Special Features</span>
                              <ul className="text-xs mt-1 space-y-0.5">
                                {data.special_features.map((feature, idx) => (
                                  <li key={idx} className="text-foreground">• {feature}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Restrictions */}
                      {data?.restrictions && data.restrictions.length > 0 && (
                        <div className="border rounded-md p-2.5 bg-card border-orange-200">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-3.5 w-3.5 text-orange-500 mt-0.5" />
                            <div className="flex-1">
                              <span className="text-xs font-medium text-orange-600">Restrictions</span>
                              <ul className="text-xs mt-1 space-y-0.5">
                                {data.restrictions.map((restriction, idx) => (
                                  <li key={idx} className="text-foreground">• {restriction}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {data?.notes && (
                        <div className="border rounded-md p-2.5 bg-muted/30">
                          <span className="text-xs font-medium text-muted-foreground">Notes</span>
                          <p className="text-xs mt-1">{data.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

interface DataRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function DataRow({ icon: Icon, label, value }: DataRowProps) {
  return (
    <div className="border rounded-md p-2.5 bg-card">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="flex-1 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <span className="text-sm font-medium">{value}</span>
        </div>
      </div>
    </div>
  );
}
