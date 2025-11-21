import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Send, ThumbsUp } from 'lucide-react';
import { generatePreApprovalPDF } from '@/lib/pdfGenerator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  address1: z.string().optional(),
  address2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  loanType: z.string().min(1, 'Please select a loan type'),
  salesPrice: z.string().min(1, 'Sales price is required'),
  loanAmount: z.string().min(1, 'Loan amount is required'),
  noAddressYet: z.boolean().default(false),
  primaryEmail: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  secondaryEmail: z.string().email('Please enter a valid email address').optional().or(z.literal(''))
});

type FormData = z.infer<typeof formSchema>;

interface PublicPreApprovalFormProps {
  formVisible?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
}

const LOAN_TYPES = ['Conventional', 'Jumbo', 'NON-QM', 'FHA', 'VA'];

export function PublicPreApprovalForm({ 
  formVisible: externalFormVisible, 
  onExpand, 
  onCollapse 
}: PublicPreApprovalFormProps = {}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noAddressYet, setNoAddressYet] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const addressSectionRef = useRef<HTMLDivElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);

  // Use external form visibility if provided, otherwise use internal state
  const formVisible = externalFormVisible !== undefined ? externalFormVisible : isFormVisible;

  const { toast } = useToast();

  // Check URL parameters and sessionStorage on mount
  useEffect(() => {
    // Only use internal state management if external props are not provided
    if (externalFormVisible === undefined) {
      const urlParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      const sessionFormOpen = sessionStorage.getItem('preapproval-form-open');

      if (urlParams.get('open') === 'form' || hash === '#start' || sessionFormOpen === 'true') {
        setIsFormVisible(true);
      }
    }
  }, [externalFormVisible]);

  // Save form visibility state to sessionStorage
  useEffect(() => {
    if (formVisible) {
      sessionStorage.setItem('preapproval-form-open', 'true');
    }
  }, [formVisible]);

  const handleStartClick = async () => {
    setIsAnimating(true);

    if (onExpand) {
      onExpand();
    } else {
      setIsFormVisible(true);
      sessionStorage.setItem('preapproval-form-open', 'true');
    }

    // Wait for animation to complete, then focus on first name field and scroll
    setTimeout(() => {
      setIsAnimating(false);
      if (firstNameRef.current) {
        firstNameRef.current.focus();
      }

      // Scroll to position the bottom of the browser at the bottom of the gray card box
      setTimeout(() => {
        const cardElement = document.querySelector('.border-neutral-200.shadow-large') as HTMLElement;
        if (cardElement) {
          const cardRect = cardElement.getBoundingClientRect();
          const cardBottom = cardRect.bottom + window.scrollY;
          const viewportHeight = window.innerHeight;
          const extraPadding = 36; // About 0.5 inch extra to reach bottom of gray box
          const targetScrollY = cardBottom - viewportHeight + extraPadding;

          window.scrollTo({
            top: Math.max(0, targetScrollY),
            behavior: 'smooth'
          });
        }
      }, 100);
    }, 300);
  };

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      zip: '',
      loanType: '',
      salesPrice: '',
      loanAmount: '',
      noAddressYet: false,
      primaryEmail: '',
      secondaryEmail: ''
    }
  });

  const formatCurrency = (value: string) => {
    const number = value.replace(/\D/g, '');
    return number ? new Intl.NumberFormat('en-US').format(parseInt(number)) : '';
  };

  const handleCurrencyChange = (field: string, value: string) => {
    const formatted = formatCurrency(value);
    form.setValue(field as keyof FormData, formatted);
  };

  const handleNoAddressYet = () => {
    setNoAddressYet(!noAddressYet);
    if (!noAddressYet) {
      form.setValue('address1', 'TBD');
      form.setValue('address2', '');
      form.setValue('city', '');
      form.setValue('state', '');
      form.setValue('zip', '');
      form.setValue('noAddressYet', true);
    } else {
      form.setValue('address1', '');
      form.setValue('noAddressYet', false);
    }
  };

  const onSubmit = async (data: FormData) => {
    console.log('onSubmit called with data:', data);
    console.log('noAddressYet:', noAddressYet);

    // Validate email is provided for sending
    if (!data.primaryEmail || data.primaryEmail.trim() === '') {
      toast({
        title: "Email Required",
        description: "Please enter your email address to receive the pre-approval letter",
        variant: "destructive"
      });
      return;
    }

    // Check if address is missing and not marked as "No Address Yet"
    if (!noAddressYet && (!data.address1 || !data.city || !data.state || !data.zip)) {
      console.log('Address validation failed, showing toast');
      toast({
        title: "Property Address Required",
        description: "Please enter property address or select 'No Address Yet'",
        variant: "destructive"
      });
      return;
    }

    console.log('Form submission started');
    setIsSubmitting(true);

    try {
      const fullName = `${data.firstName} ${data.lastName}`;
      console.log('Processing form for:', fullName);

      const propertyAddress = noAddressYet ? 'TBD' : `${data.address1}${data.address2 ? `, ${data.address2}` : ''}, ${data.city}, ${data.state} ${data.zip}`;
      const salesPriceNumber = data.salesPrice.replace(/,/g, '');
      const loanAmountNumber = data.loanAmount.replace(/,/g, '');
      const formattedSalesPrice = `$${parseInt(salesPriceNumber).toLocaleString()}`;
      const formattedLoanAmount = `$${parseInt(loanAmountNumber).toLocaleString()}`;

      console.log('Starting PDF generation...');
      // Generate PDF
      const pdfBytes = await generatePreApprovalPDF({
        fullName,
        propertyAddress,
        loanType: data.loanType,
        salesPrice: formattedSalesPrice,
        loanAmount: formattedLoanAmount
      });
      console.log('PDF generated successfully, size:', pdfBytes.length);

      if (!pdfBytes || pdfBytes.length === 0) {
        throw new Error('PDF generation failed - empty result');
      }

      // Convert PDF to base64
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const base64PDF = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          if (!result || !result.includes(',')) {
            reject(new Error('Invalid FileReader result'));
            return;
          }
          const base64Data = result.split(',')[1];
          if (!base64Data || base64Data.length === 0) {
            reject(new Error('Empty base64 data after conversion'));
            return;
          }
          resolve(base64Data);
        };
        reader.onerror = () => reject(new Error('FileReader failed'));
        reader.readAsDataURL(blob);
      });
      console.log('PDF converted to base64, length:', base64PDF.length);

      // Create filename
      const firstInitial = data.firstName?.charAt(0)?.toUpperCase() || '';
      const lastInitial = data.lastName?.charAt(0)?.toUpperCase() || '';
      const today = new Date();
      const formattedDate = `${today.getMonth() + 1}.${today.getDate()}.${today.getFullYear().toString().slice(-2)}`;
      const fileName = `Pre-Approval Letter - ${firstInitial}${lastInitial} ${formattedDate}.pdf`;

      if (!base64PDF || base64PDF.length === 0) {
        throw new Error('Base64 PDF conversion failed - empty result');
      }

      console.log('Sending email...');
      const requestBody = {
        primaryEmail: data.primaryEmail,
        secondaryEmail: data.secondaryEmail || undefined,  
        customerName: fullName,
        pdfAttachment: base64PDF,
        fileName: fileName
      };

      console.log('Public: Request body structure:', {
        primaryEmail: !!requestBody.primaryEmail,
        secondaryEmail: !!requestBody.secondaryEmail,
        customerName: !!requestBody.customerName,
        pdfAttachment: !!requestBody.pdfAttachment && requestBody.pdfAttachment.length > 0,
        fileName: !!requestBody.fileName,
        pdfAttachmentLength: requestBody.pdfAttachment?.length || 0
      });

      // Send email
      const { data: emailResult, error } = await supabase.functions.invoke('send-preapproval-email', {
        body: requestBody
      });

      if (error) {
        console.error('Email sending error:', error);
        throw error;
      }

      console.log('Email sent successfully:', emailResult);
      toast({
        title: "Success!",
        description: "Your pre-approval letter has been sent to your email address."
      });

      console.log('About to show success modal, current state:', showSuccessModal);
      // Show success modal
      setShowSuccessModal(true);
      console.log('Success modal state set to true');

      // Reset form after successful submission
      form.reset();
      setNoAddressYet(false);
    } catch (error) {
      console.error('Error processing request:', error);
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      toast({
        title: "Form Incomplete",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const data = form.getValues();

    // Check if address is missing and not marked as "No Address Yet"
    if (!noAddressYet && (!data.address1 || !data.city || !data.state || !data.zip)) {
      toast({
        title: "Property Address Required",
        description: "Please enter property address or select 'No Address Yet'",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const fullName = `${data.firstName} ${data.lastName}`;
      const propertyAddress = noAddressYet ? 'TBD' : `${data.address1}${data.address2 ? `, ${data.address2}` : ''}, ${data.city}, ${data.state} ${data.zip}`;
      const salesPriceNumber = data.salesPrice.replace(/,/g, '');
      const loanAmountNumber = data.loanAmount.replace(/,/g, '');
      const formattedSalesPrice = `$${parseInt(salesPriceNumber).toLocaleString()}`;
      const formattedLoanAmount = `$${parseInt(loanAmountNumber).toLocaleString()}`;

      // Generate and download PDF
      await generatePreApprovalPDF({
        fullName,
        propertyAddress,
        loanType: data.loanType,
        salesPrice: formattedSalesPrice,
        loanAmount: formattedLoanAmount
      }, true);

      toast({
        title: "Success!",
        description: "Pre-approval letter downloaded successfully"
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Error",
        description: "Failed to download pre-approval letter. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Start Button - only visible when form is hidden */}
      {!formVisible && (
        <div className="flex justify-center">
          <Button
            onClick={handleStartClick}
            size="lg"
            className="text-lg px-12 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
          >
            Start
          </Button>
        </div>
      )}

      {/* Form - only visible after Start button is clicked */}
      <div className={cn(
        "transition-all duration-300",
        formVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
      )}>
        <Card className="border-neutral-200 shadow-large">
          <CardHeader>
            <CardTitle className="text-2xl">Pre-Approval Letter</CardTitle>
            <CardDescription>
              Enter your details below to generate or email your pre-approval letter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} ref={firstNameRef} placeholder="John" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Doe" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Property Address Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <FormLabel>Property Address</FormLabel>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={handleNoAddressYet}
                      className="text-sm h-auto p-0"
                    >
                      {noAddressYet ? '✓ No Address Yet' : 'No Address Yet'}
                    </Button>
                  </div>

                  {!noAddressYet && (
                    <>
                      <FormField
                        control={form.control}
                        name="address1"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} placeholder="Street Address" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="address2"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input {...field} placeholder="Apt, Suite, etc. (optional)" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} placeholder="City" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} placeholder="State" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="zip"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input {...field} placeholder="ZIP" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="loanType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select loan type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LOAN_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="salesPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sales Price</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input 
                              {...field} 
                              placeholder="500,000" 
                              className="pl-7"
                              onChange={(e) => handleCurrencyChange('salesPrice', e.target.value)}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="loanAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loan Amount</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            <Input 
                              {...field} 
                              placeholder="400,000" 
                              className="pl-7"
                              onChange={(e) => handleCurrencyChange('loanAmount', e.target.value)}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Email and Submit Section */}
                <div className="space-y-4 pt-4 border-t">
                  {/* Email Information Section */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="primaryEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your Email Address *</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="john@example.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="secondaryEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Email (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="spouse@example.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                        Sending Your Pre-Approval Letter...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Pre-Approval Letter
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>

            {/* Download Button */}
            <div className="mt-6">
              <Button 
                type="button" 
                variant="outline"
                disabled={isSubmitting}
                onClick={handleDownload}
                className="w-full"
              >
                Download Pre-Approval Letter
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Modal */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ThumbsUp className="h-5 w-5 text-primary" />
              Success
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-4">
              <p className="text-base">Good luck with the offer!</p>
              <p className="text-sm italic">- Jay, Mortgage Bolt Office Manager</p>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
