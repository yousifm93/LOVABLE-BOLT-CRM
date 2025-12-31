import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Check, Loader2, Trash2, ChevronDown, ChevronRight, ImagePlus, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface FeedbackSection {
  key: string;
  label: string;
}

const userSections: Record<string, FeedbackSection[]> = {
  'fa92a4c6-890d-4d69-99a8-c3adc6c904ee': [
    { key: 'tasks', label: 'Tasks' },
    { key: 'pipeline', label: 'Pipeline' },
    { key: 'bolt_bot', label: 'Bolt Bot' },
    { key: 'preapproval_letter', label: 'Pre-Approval Letter' },
    { key: 'loan_pricer', label: 'Loan Pricer' },
    { key: 'property_value', label: 'Property Value' },
    { key: 'income_calculator', label: 'Income Calculator' },
    { key: 'loan_estimate', label: 'Loan Estimate' },
  ],
  '159376ae-30e9-4997-b61f-76ab8d7f224b': [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'pipeline', label: 'Pipeline' },
    { key: 'real_estate_agents', label: 'Real Estate Agents' },
  ],
};

interface FeedbackItemData {
  text: string;
  image_url?: string;
}

interface ItemStatusData {
  feedback_id: string;
  item_index: number;
  status: 'pending' | 'complete' | 'needs_help' | 'idea';
}

interface SectionFeedback {
  id?: string;
  items: FeedbackItemData[];
  saved: boolean;
  loading: boolean;
}

export default function Feedback() {
  const { crmUser } = useAuth();
  const { toast } = useToast();
  const [feedbackData, setFeedbackData] = useState<Record<string, SectionFeedback>>({});
  const [itemStatuses, setItemStatuses] = useState<ItemStatusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [completedSectionsOpen, setCompletedSectionsOpen] = useState<Record<string, boolean>>({});

  const sections = crmUser?.id ? userSections[crmUser.id] || [] : [];

  useEffect(() => {
    const loadExistingFeedback = async () => {
      if (!crmUser?.id || sections.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('team_feedback')
          .select('*')
          .eq('user_id', crmUser.id);

        if (error) throw error;

        // Fetch item statuses for this user's feedback
        const feedbackIds = data?.map(f => f.id) || [];
        let statusData: ItemStatusData[] = [];
        if (feedbackIds.length > 0) {
          const { data: statuses } = await supabase
            .from('team_feedback_item_status')
            .select('*')
            .in('feedback_id', feedbackIds);
          statusData = (statuses || []) as ItemStatusData[];
        }
        setItemStatuses(statusData);

        const initialData: Record<string, SectionFeedback> = {};
        const initialExpanded: Record<string, boolean> = {};
        
        sections.forEach(section => {
          const existingFeedback = data?.find(f => f.section_key === section.key);
          const feedbackItems = existingFeedback?.feedback_items;
          let items: FeedbackItemData[] = [{ text: '' }, { text: '' }, { text: '' }];
          if (Array.isArray(feedbackItems)) {
            items = feedbackItems.map((item: any) => 
              typeof item === 'string' ? { text: item } : { text: item.text || '', image_url: item.image_url }
            );
          }
          initialData[section.key] = {
            id: existingFeedback?.id,
            items,
            saved: !!existingFeedback,
            loading: false,
          };
          initialExpanded[section.key] = true;
        });

        setFeedbackData(initialData);
        setExpandedSections(initialExpanded);
      } catch (error) {
        console.error('Error loading feedback:', error);
        toast({ title: "Error", description: "Failed to load existing feedback.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    loadExistingFeedback();
  }, [crmUser?.id, sections.length, toast]);

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const updateFeedbackItem = (sectionKey: string, index: number, text: string) => {
    setFeedbackData(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], items: prev[sectionKey].items.map((item, i) => i === index ? { ...item, text } : item), saved: false }
    }));
  };

  const handleImageUpload = async (sectionKey: string, index: number, file: File) => {
    if (!crmUser?.id) return;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${crmUser.id}/${sectionKey}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('feedback-attachments')
      .upload(fileName, file);
    
    if (error) {
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
      return;
    }
    
    const { data: { publicUrl } } = supabase.storage.from('feedback-attachments').getPublicUrl(fileName);
    
    setFeedbackData(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], items: prev[sectionKey].items.map((item, i) => i === index ? { ...item, image_url: publicUrl } : item), saved: false }
    }));
  };

  const removeImage = (sectionKey: string, index: number) => {
    setFeedbackData(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], items: prev[sectionKey].items.map((item, i) => i === index ? { ...item, image_url: undefined } : item), saved: false }
    }));
  };

  const addMoreFeedback = (sectionKey: string) => {
    setFeedbackData(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], items: [...prev[sectionKey].items, { text: '' }], saved: false }
    }));
  };

  const removeFeedbackItem = (sectionKey: string, index: number) => {
    setFeedbackData(prev => {
      const items = prev[sectionKey].items.filter((_, i) => i !== index);
      while (items.length < 3) items.push({ text: '' });
      return { ...prev, [sectionKey]: { ...prev[sectionKey], items, saved: false } };
    });
  };

  const getItemStatus = (feedbackId: string | undefined, itemIndex: number): 'pending' | 'complete' | 'needs_help' | 'idea' => {
    if (!feedbackId) return 'pending';
    return itemStatuses.find(s => s.feedback_id === feedbackId && s.item_index === itemIndex)?.status || 'pending';
  };

  const submitFeedback = async (sectionKey: string, sectionLabel: string) => {
    if (!crmUser?.id) return;

    setFeedbackData(prev => ({ ...prev, [sectionKey]: { ...prev[sectionKey], loading: true } }));

    try {
      const feedbackItems = feedbackData[sectionKey].items.filter(item => item.text.trim() !== '' || item.image_url);

      const { data, error } = await supabase
        .from('team_feedback')
        .upsert({
          user_id: crmUser.id,
          section_key: sectionKey,
          section_label: sectionLabel,
          feedback_items: feedbackItems.length > 0 ? feedbackItems : [{ text: '' }],
          updated_at: new Date().toISOString()
        } as any, { onConflict: 'user_id,section_key' })
        .select()
        .single();

      if (error) throw error;

      setFeedbackData(prev => ({ ...prev, [sectionKey]: { ...prev[sectionKey], id: data.id, saved: true, loading: false } }));
      toast({ title: "Feedback Saved", description: `Your ${sectionLabel} feedback has been saved.` });
    } catch (error) {
      console.error('Error saving feedback:', error);
      setFeedbackData(prev => ({ ...prev, [sectionKey]: { ...prev[sectionKey], loading: false } }));
      toast({ title: "Error", description: "Failed to save feedback. Please try again.", variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (sections.length === 0) return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Submit Feedback</h1>
      <Card><CardContent className="py-8 text-center text-muted-foreground">No feedback sections are assigned to your account.</CardContent></Card>
    </div>
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">Submit Feedback</h1>
      <p className="text-muted-foreground mb-6">Share your thoughts on what could be improved in each section of the CRM.</p>

      <div className="space-y-4">
        {sections.map((section) => {
          const sectionData = feedbackData[section.key] || { items: [{ text: '' }, { text: '' }, { text: '' }], saved: false, loading: false };
          const isExpanded = expandedSections[section.key] ?? true;
          
          // Separate pending and completed items
          const pendingItems = sectionData.items.map((item, index) => ({ item, index })).filter(({ index }) => getItemStatus(sectionData.id, index) !== 'complete');
          const completedItems = sectionData.items.map((item, index) => ({ item, index })).filter(({ index }) => getItemStatus(sectionData.id, index) === 'complete');

          return (
            <Collapsible key={section.key} open={isExpanded} onOpenChange={() => toggleSection(section.key)}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                        <CardTitle className="text-xl">{section.label}</CardTitle>
                      </div>
                      {sectionData.saved && <div className="flex items-center gap-1 text-sm text-green-600"><Check className="h-4 w-4" />Saved</div>}
                    </div>
                    <CardDescription className="ml-7">What would you like to change or improve?</CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {pendingItems.map(({ item, index }) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1"><span className="text-sm font-medium text-muted-foreground">Feedback {index + 1}</span></div>
                            <Textarea placeholder={`Enter your feedback for ${section.label}...`} value={item.text} onChange={(e) => updateFeedbackItem(section.key, index, e.target.value)} className="min-h-[80px]" />
                          </div>
                          {sectionData.items.length > 3 && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={sectionData.saved ? "text-muted-foreground cursor-not-allowed mt-6" : "text-destructive hover:text-destructive mt-6"} 
                              onClick={() => !sectionData.saved && removeFeedbackItem(section.key, index)}
                              disabled={sectionData.saved}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-0">
                          {item.image_url ? (
                            <div className="relative">
                              <img src={item.image_url} alt="Attached" className="h-16 w-16 object-cover rounded border" />
                              <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-5 w-5" onClick={() => removeImage(section.key, index)}><X className="h-3 w-3" /></Button>
                            </div>
                          ) : (
                            <label className="cursor-pointer">
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(section.key, index, e.target.files[0]); }} />
                              <Button variant="outline" size="sm" asChild><span><ImagePlus className="h-4 w-4 mr-1" />Attach Screenshot</span></Button>
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Completed Section */}
                    {completedItems.length > 0 && (
                      <Collapsible open={completedSectionsOpen[section.key]} onOpenChange={(open) => setCompletedSectionsOpen(prev => ({ ...prev, [section.key]: open }))}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-start gap-2 text-green-600 hover:text-green-700 hover:bg-green-50">
                            {completedSectionsOpen[section.key] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <Check className="h-4 w-4" />
                            Completed ({completedItems.length})
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-3 mt-2">
                          {completedItems.map(({ item, index }) => (
                            <div key={index} className="p-3 rounded-lg border bg-muted/30 opacity-75">
                              <div className="flex items-start gap-2">
                                <Check className="h-4 w-4 text-green-600 mt-0.5" />
                                <p className="text-sm line-through text-muted-foreground">{item.text || '(No text)'}</p>
                              </div>
                              {item.image_url && (
                                <img src={item.image_url} alt="Attached" className="h-16 w-16 object-cover rounded border mt-2 ml-6" />
                              )}
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                    
                    <div className="flex items-center justify-between pt-2">
                      <Button variant="outline" size="sm" onClick={() => addMoreFeedback(section.key)} className="flex items-center gap-1"><Plus className="h-4 w-4" />Add More Feedback</Button>
                      <Button onClick={() => submitFeedback(section.key, section.label)} disabled={sectionData.loading}>{sectionData.loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : 'Submit Feedback'}</Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
