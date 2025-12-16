import { useState, useEffect } from "react";
import { Loader2, Building2, DollarSign, Percent, CreditCard, Package, Star, AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

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
}

interface LenderMarketingPopoverProps {
  emailLogId: string;
  category: string | null;
  subject: string;
  className?: string;
}

export function LenderMarketingPopover({ emailLogId, category, subject, className }: LenderMarketingPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<LenderMarketingData | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

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
      } catch (error) {
        console.error('Error loading lender marketing data:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

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
            "bg-blue-500/20 text-blue-600 border border-blue-500/30 text-[10px] px-1.5 py-0 h-5 rounded-full hover:bg-blue-500/30 transition-colors font-medium inline-flex items-center",
            className
          )}
        >
          Lender Marketing
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[480px] p-0" 
        align="end"
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

        <ScrollArea className="max-h-[450px]">
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
