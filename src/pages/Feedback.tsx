import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Send, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FeedbackSection {
  key: string;
  label: string;
}

// User ID to sections mapping
const userSections: Record<string, FeedbackSection[]> = {
  // Herman
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
  // Salma
  '159376ae-30e9-4997-b61f-76ab8d7f224b': [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'pipeline', label: 'Pipeline' },
    { key: 'real_estate_agents', label: 'Real Estate Agents' },
  ],
};

interface SectionFeedback {
  items: string[];
  saved: boolean;
  loading: boolean;
}

export default function Feedback() {
  const { crmUser } = useAuth();
  const { toast } = useToast();
  const [feedbackData, setFeedbackData] = useState<Record<string, SectionFeedback>>({});
  const [loading, setLoading] = useState(true);

  // Get sections for current user
  const sections = crmUser?.id ? userSections[crmUser.id] || [] : [];

  // Initialize feedback data for each section
  useEffect(() => {
    if (!crmUser?.id || sections.length === 0) {
      setLoading(false);
      return;
    }

    const loadExistingFeedback = async () => {
      setLoading(true);
      const initialData: Record<string, SectionFeedback> = {};

      // Initialize all sections with 3 empty items
      sections.forEach(section => {
        initialData[section.key] = {
          items: ['', '', ''],
          saved: false,
          loading: false,
        };
      });

      // Fetch existing feedback from database
      const { data: existingFeedback } = await supabase
        .from('team_feedback')
        .select('*')
        .eq('user_id', crmUser.id);

      if (existingFeedback) {
        existingFeedback.forEach(fb => {
          const items = (fb.feedback_items as string[]) || [];
          // Ensure at least 3 items
          while (items.length < 3) {
            items.push('');
          }
          initialData[fb.section_key] = {
            items,
            saved: true,
            loading: false,
          };
        });
      }

      setFeedbackData(initialData);
      setLoading(false);
    };

    loadExistingFeedback();
  }, [crmUser?.id, sections.length]);

  const updateFeedbackItem = (sectionKey: string, index: number, value: string) => {
    setFeedbackData(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        items: prev[sectionKey].items.map((item, i) => i === index ? value : item),
        saved: false,
      },
    }));
  };

  const addMoreFeedback = (sectionKey: string) => {
    setFeedbackData(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        items: [...prev[sectionKey].items, ''],
        saved: false,
      },
    }));
  };

  const removeFeedbackItem = (sectionKey: string, index: number) => {
    setFeedbackData(prev => {
      const items = prev[sectionKey].items.filter((_, i) => i !== index);
      // Ensure at least 3 items
      while (items.length < 3) {
        items.push('');
      }
      return {
        ...prev,
        [sectionKey]: {
          ...prev[sectionKey],
          items,
          saved: false,
        },
      };
    });
  };

  const submitFeedback = async (sectionKey: string, sectionLabel: string) => {
    if (!crmUser?.id) return;

    setFeedbackData(prev => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], loading: true },
    }));

    try {
      // Filter out empty feedback items
      const nonEmptyItems = feedbackData[sectionKey].items.filter(item => item.trim());

      const { error } = await supabase
        .from('team_feedback')
        .upsert({
          user_id: crmUser.id,
          section_key: sectionKey,
          section_label: sectionLabel,
          feedback_items: nonEmptyItems,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,section_key',
        });

      if (error) throw error;

      setFeedbackData(prev => ({
        ...prev,
        [sectionKey]: { ...prev[sectionKey], saved: true, loading: false },
      }));

      toast({
        title: "Feedback Saved",
        description: `Your feedback for ${sectionLabel} has been saved.`,
      });
    } catch (error: any) {
      console.error('Error saving feedback:', error);
      toast({
        title: "Error",
        description: "Failed to save feedback. Please try again.",
        variant: "destructive",
      });
      setFeedbackData(prev => ({
        ...prev,
        [sectionKey]: { ...prev[sectionKey], loading: false },
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Team Feedback</CardTitle>
            <CardDescription>
              No feedback sections have been assigned to your account yet. Please contact your administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Team Feedback</h1>
        <p className="text-muted-foreground mt-2">
          Help us improve BOLT CRM by sharing your feedback on each section you're testing.
          Please provide at least 3 things you'd like to see changed or improved.
        </p>
      </div>

      <div className="grid gap-6">
        {sections.map(section => {
          const sectionData = feedbackData[section.key] || { items: ['', '', ''], saved: false, loading: false };
          
          return (
            <Card key={section.key}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{section.label}</CardTitle>
                    <CardDescription>
                      What would you like to change or improve?
                    </CardDescription>
                  </div>
                  {sectionData.saved && (
                    <div className="flex items-center gap-1 text-sm text-green-600">
                      <Check className="h-4 w-4" />
                      Saved
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {sectionData.items.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`${section.key}-${index}`}>
                        Feedback {index + 1}
                      </Label>
                      {index >= 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFeedbackItem(section.key, index)}
                          className="text-muted-foreground hover:text-destructive h-6 px-2"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <Textarea
                      id={`${section.key}-${index}`}
                      value={item}
                      onChange={(e) => updateFeedbackItem(section.key, index, e.target.value)}
                      placeholder="Describe what you'd like to see changed or improved..."
                      className="min-h-[80px]"
                    />
                  </div>
                ))}

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addMoreFeedback(section.key)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add More Feedback
                  </Button>

                  <Button
                    onClick={() => submitFeedback(section.key, section.label)}
                    disabled={sectionData.loading}
                  >
                    {sectionData.loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Submit Feedback
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
