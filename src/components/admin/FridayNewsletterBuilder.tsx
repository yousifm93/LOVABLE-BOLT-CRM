import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, Copy, Smartphone, Monitor, Check, ChevronDown, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import templateHtml from "../email-templates/mortgage-newsletter.html?raw";

export default function FridayNewsletterBuilder() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<"mobile" | "desktop">("desktop");
  const [copied, setCopied] = useState(false);

  // Section toggles
  const [showMarketUpdates, setShowMarketUpdates] = useState(true);
  const [showReview, setShowReview] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showListing, setShowListing] = useState(true);
  const [showClosing, setShowClosing] = useState(true);
  const [showAgents, setShowAgents] = useState(true);
  const [showRefinancing, setShowRefinancing] = useState(true);
  const [showTeam, setShowTeam] = useState(true);

  // Market Updates
  const [rate10, setRate10] = useState("4.99");
  const [apr10, setApr10] = useState("5.05");
  const [rate15, setRate15] = useState("5.44");
  const [apr15, setApr15] = useState("5.50");
  const [rate30, setRate30] = useState("6.19");
  const [apr30, setApr30] = useState("6.25");
  const [marketCommentary, setMarketCommentary] = useState(
    '"Mortgage rates remain elevated but stable this week, with 30-year fixed loans hanging in the low-to-mid 6% range, so if you\'re considering buying or refinancing, locking in now may cost less than waiting for a significant drop."'
  );

  // Review of the Week
  const [reviewText, setReviewText] = useState(
    "Working with Mortgage Bolt was an absolute game-changer! They made the entire process seamless and stress-free. From the initial consultation to closing day, their team was professional, responsive, and truly had our best interests at heart. We couldn't be happier with our new home!"
  );
  const [reviewName, setReviewName] = useState("Sarah & Michael Johnson");
  const [reviewDesc, setReviewDesc] = useState("First-Time Homebuyers");
  const [reviewDate, setReviewDate] = useState("November 2024");
  const [reviewBtnUrl, setReviewBtnUrl] = useState("https://mortgagebolt.com/reviews");

  // Events (3)
  const [event1Image, setEvent1Image] = useState("https://zpsvatonxakysnbqnfcc.supabase.co/storage/v1/object/public/pics/newsletter%20media/1.png");
  const [event1Title, setEvent1Title] = useState("Amazonico is now open!");
  const [event1Desc, setEvent1Desc] = useState("The newest hotspot in Brickell is here! Reach out to us if you need to secure a reservation - we have the connects for all of our past clients & agent partners!<br><br>Reach out to us if you need help.");
  const [event1BtnText, setEvent1BtnText] = useState("Make a Reservation");
  const [event1BtnUrl, setEvent1BtnUrl] = useState("#");

  const [event2Image, setEvent2Image] = useState("https://zpsvatonxakysnbqnfcc.supabase.co/storage/v1/object/public/pics/newsletter%20media/2.png");
  const [event2Title, setEvent2Title] = useState("Florida Gators, am I right?!");
  const [event2Desc, setEvent2Desc] = useState("Mortgage Bolt loves a good game day! Catch us at Batch in Brickell every Saturday cheering our alma mater on!<br><br>Reach out to us if you're around.");
  const [event2BtnText, setEvent2BtnText] = useState("Let Us Know");
  const [event2BtnUrl, setEvent2BtnUrl] = useState("#");

  const [event3Image, setEvent3Image] = useState("https://zpsvatonxakysnbqnfcc.supabase.co/storage/v1/object/public/pics/newsletter%20media/3.png");
  const [event3Title, setEvent3Title] = useState("An Epic Brokers open!");
  const [event3Desc, setEvent3Desc] = useState("In case you missed it, this $5.6mm penthouse is on the market and priced to sell. Reach out to us or our agent partner David Freed for more info!<br><br>Reach out to us if you're around.");
  const [event3BtnText, setEvent3BtnText] = useState("More Details Here");
  const [event3BtnUrl, setEvent3BtnUrl] = useState("#");

  // Featured Listing
  const [listingImage, setListingImage] = useState("https://images.unsplash.com/photo-1600596542815-ffad4c1539a9");
  const [listingStreet, setListingStreet] = useState("1900 Pizarro Street");
  const [listingCity, setListingCity] = useState("Coral Gables, FL 33134");
  const [listingBeds, setListingBeds] = useState("4");
  const [listingBaths, setListingBaths] = useState("3");
  const [listingSqft, setListingSqft] = useState("3,359");
  const [listingAgent, setListingAgent] = useState("Edwin Meza");
  const [listingPrice, setListingPrice] = useState("$2,600,000");
  const [listingContactEmail, setListingContactEmail] = useState("edwin@mortgagebolt.com");
  const [listingSeeMoreUrl, setListingSeeMoreUrl] = useState("https://mortgagebolt.com/listings");

  // Closing of the Week
  const [closingImage, setClosingImage] = useState("https://zpsvatonxakysnbqnfcc.supabase.co/storage/v1/object/public/pics/closing%20pic%201.jpeg");
  const [closingTitle, setClosingTitle] = useState("The Martinez Family");
  const [closingLocation, setClosingLocation] = useState("Coral Gables, FL");
  const [closingPrice, setClosingPrice] = useState("$485,000");
  const [closingDescription, setClosingDescription] = useState("Successfully closed on their dream home with a competitive rate and smooth process. This lovely family found the perfect neighborhood for their growing needs.");

  // Featured Agents (3)
  const [agent1Image, setAgent1Image] = useState("https://zpsvatonxakysnbqnfcc.supabase.co/storage/v1/object/public/pics/ym%20circle%20headshot.JPG");
  const [agent1Name, setAgent1Name] = useState("Eric Leibbaum");
  const [agent2Image, setAgent2Image] = useState("https://zpsvatonxakysnbqnfcc.supabase.co/storage/v1/object/public/pics/ym%20circle%20headshot.JPG");
  const [agent2Name, setAgent2Name] = useState("David Rocca");
  const [agent3Image, setAgent3Image] = useState("https://zpsvatonxakysnbqnfcc.supabase.co/storage/v1/object/public/pics/ym%20circle%20headshot.JPG");
  const [agent3Name, setAgent3Name] = useState("Tristan Castillo");

  // Image upload handler
  const handleImageUpload = async (file: File, setterFn: (url: string) => void) => {
    if (!file) return;
    
    if (file.size > 1024 * 1024) {
      toast({ title: "Error", description: "File size must be under 1MB", variant: "destructive" });
      return;
    }

    try {
      const fileName = `newsletter/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage.from("pics").upload(fileName, file);
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage.from("pics").getPublicUrl(fileName);
      setterFn(urlData.publicUrl);
      
      toast({ title: "Success", description: "Image uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Generate final HTML
  const finalHtml = useMemo(() => {
    let html = templateHtml;

    // Replace all dynamic content markers
    html = html.replace(/<!-- RATE_10_YEAR -->.*?<!-- \/RATE_10_YEAR -->/g, `<!-- RATE_10_YEAR -->${rate10}<!-- /RATE_10_YEAR -->`);
    html = html.replace(/<!-- APR_10_YEAR -->.*?<!-- \/APR_10_YEAR -->/g, `<!-- APR_10_YEAR -->${apr10}<!-- /APR_10_YEAR -->`);
    html = html.replace(/<!-- RATE_15_YEAR -->.*?<!-- \/RATE_15_YEAR -->/g, `<!-- RATE_15_YEAR -->${rate15}<!-- /RATE_15_YEAR -->`);
    html = html.replace(/<!-- APR_15_YEAR -->.*?<!-- \/APR_15_YEAR -->/g, `<!-- APR_15_YEAR -->${apr15}<!-- /APR_15_YEAR -->`);
    html = html.replace(/<!-- RATE_30_YEAR -->.*?<!-- \/RATE_30_YEAR -->/g, `<!-- RATE_30_YEAR -->${rate30}<!-- /RATE_30_YEAR -->`);
    html = html.replace(/<!-- APR_30_YEAR -->.*?<!-- \/APR_30_YEAR -->/g, `<!-- APR_30_YEAR -->${apr30}<!-- /APR_30_YEAR -->`);
    html = html.replace(/<!-- MARKET_COMMENTARY -->.*?<!-- \/MARKET_COMMENTARY -->/gs, `<!-- MARKET_COMMENTARY -->${marketCommentary}<!-- /MARKET_COMMENTARY -->`);

    html = html.replace(/<!-- REVIEW_TEXT -->.*?<!-- \/REVIEW_TEXT -->/gs, `<!-- REVIEW_TEXT -->${reviewText}<!-- /REVIEW_TEXT -->`);
    html = html.replace(/<!-- REVIEW_NAME -->.*?<!-- \/REVIEW_NAME -->/g, `<!-- REVIEW_NAME -->${reviewName}<!-- /REVIEW_NAME -->`);
    html = html.replace(/<!-- REVIEW_DESC -->.*?<!-- \/REVIEW_DESC -->/g, `<!-- REVIEW_DESC -->${reviewDesc}<!-- /REVIEW_DESC -->`);
    html = html.replace(/<!-- REVIEW_DATE -->.*?<!-- \/REVIEW_DATE -->/g, `<!-- REVIEW_DATE -->${reviewDate}<!-- /REVIEW_DATE -->`);
    html = html.replace(/<!-- REVIEW_BTN_URL -->.*?<!-- \/REVIEW_BTN_URL -->/g, `<!-- REVIEW_BTN_URL -->${reviewBtnUrl}<!-- /REVIEW_BTN_URL -->`);

    html = html.replace(/<!-- EVENT_1_IMAGE -->.*?<!-- \/EVENT_1_IMAGE -->/gs, `<!-- EVENT_1_IMAGE --><img src="${event1Image}" alt="Event 1" style="width: 160px; height: 160px; border-radius: 12px; object-fit: cover; flex-shrink: 0;"><!-- /EVENT_1_IMAGE -->`);
    html = html.replace(/<!-- EVENT_1_TITLE -->.*?<!-- \/EVENT_1_TITLE -->/g, `<!-- EVENT_1_TITLE -->${event1Title}<!-- /EVENT_1_TITLE -->`);
    html = html.replace(/<!-- EVENT_1_DESC -->.*?<!-- \/EVENT_1_DESC -->/gs, `<!-- EVENT_1_DESC -->${event1Desc}<!-- /EVENT_1_DESC -->`);
    html = html.replace(/<!-- EVENT_1_BTN_TEXT -->.*?<!-- \/EVENT_1_BTN_TEXT -->/g, `<!-- EVENT_1_BTN_TEXT -->${event1BtnText}<!-- /EVENT_1_BTN_TEXT -->`);
    html = html.replace(/<!-- EVENT_1_BTN_URL -->.*?<!-- \/EVENT_1_BTN_URL -->/g, `<!-- EVENT_1_BTN_URL -->${event1BtnUrl}<!-- /EVENT_1_BTN_URL -->`);

    html = html.replace(/<!-- EVENT_2_IMAGE -->.*?<!-- \/EVENT_2_IMAGE -->/gs, `<!-- EVENT_2_IMAGE --><img src="${event2Image}" alt="Event 2" style="width: 160px; height: 160px; border-radius: 12px; object-fit: cover; flex-shrink: 0;"><!-- /EVENT_2_IMAGE -->`);
    html = html.replace(/<!-- EVENT_2_TITLE -->.*?<!-- \/EVENT_2_TITLE -->/g, `<!-- EVENT_2_TITLE -->${event2Title}<!-- /EVENT_2_TITLE -->`);
    html = html.replace(/<!-- EVENT_2_DESC -->.*?<!-- \/EVENT_2_DESC -->/gs, `<!-- EVENT_2_DESC -->${event2Desc}<!-- /EVENT_2_DESC -->`);
    html = html.replace(/<!-- EVENT_2_BTN_TEXT -->.*?<!-- \/EVENT_2_BTN_TEXT -->/g, `<!-- EVENT_2_BTN_TEXT -->${event2BtnText}<!-- /EVENT_2_BTN_TEXT -->`);
    html = html.replace(/<!-- EVENT_2_BTN_URL -->.*?<!-- \/EVENT_2_BTN_URL -->/g, `<!-- EVENT_2_BTN_URL -->${event2BtnUrl}<!-- /EVENT_2_BTN_URL -->`);

    html = html.replace(/<!-- EVENT_3_IMAGE -->.*?<!-- \/EVENT_3_IMAGE -->/gs, `<!-- EVENT_3_IMAGE --><img src="${event3Image}" alt="Event 3" style="width: 160px; height: 160px; border-radius: 12px; object-fit: cover; flex-shrink: 0;"><!-- /EVENT_3_IMAGE -->`);
    html = html.replace(/<!-- EVENT_3_TITLE -->.*?<!-- \/EVENT_3_TITLE -->/g, `<!-- EVENT_3_TITLE -->${event3Title}<!-- /EVENT_3_TITLE -->`);
    html = html.replace(/<!-- EVENT_3_DESC -->.*?<!-- \/EVENT_3_DESC -->/gs, `<!-- EVENT_3_DESC -->${event3Desc}<!-- /EVENT_3_DESC -->`);
    html = html.replace(/<!-- EVENT_3_BTN_TEXT -->.*?<!-- \/EVENT_3_BTN_TEXT -->/g, `<!-- EVENT_3_BTN_TEXT -->${event3BtnText}<!-- /EVENT_3_BTN_TEXT -->`);
    html = html.replace(/<!-- EVENT_3_BTN_URL -->.*?<!-- \/EVENT_3_BTN_URL -->/g, `<!-- EVENT_3_BTN_URL -->${event3BtnUrl}<!-- /EVENT_3_BTN_URL -->`);

    html = html.replace(/<!-- LISTING_IMAGE -->.*?<!-- \/LISTING_IMAGE -->/gs, `<!-- LISTING_IMAGE --><img src="${listingImage}" alt="Featured Property" style="width: 100%; height: auto; border-radius: 10px; object-fit: cover;"><!-- /LISTING_IMAGE -->`);
    html = html.replace(/<!-- LISTING_STREET -->.*?<!-- \/LISTING_STREET -->/g, `<!-- LISTING_STREET -->${listingStreet}<!-- /LISTING_STREET -->`);
    html = html.replace(/<!-- LISTING_CITY -->.*?<!-- \/LISTING_CITY -->/g, `<!-- LISTING_CITY -->${listingCity}<!-- /LISTING_CITY -->`);
    html = html.replace(/<!-- LISTING_BEDS -->.*?<!-- \/LISTING_BEDS -->/g, `<!-- LISTING_BEDS -->${listingBeds}<!-- /LISTING_BEDS -->`);
    html = html.replace(/<!-- LISTING_BATHS -->.*?<!-- \/LISTING_BATHS -->/g, `<!-- LISTING_BATHS -->${listingBaths}<!-- /LISTING_BATHS -->`);
    html = html.replace(/<!-- LISTING_SQFT -->.*?<!-- \/LISTING_SQFT -->/g, `<!-- LISTING_SQFT -->${listingSqft}<!-- /LISTING_SQFT -->`);
    html = html.replace(/<!-- LISTING_AGENT -->.*?<!-- \/LISTING_AGENT -->/g, `<!-- LISTING_AGENT -->${listingAgent}<!-- /LISTING_AGENT -->`);
    html = html.replace(/<!-- LISTING_PRICE -->.*?<!-- \/LISTING_PRICE -->/g, `<!-- LISTING_PRICE -->${listingPrice}<!-- /LISTING_PRICE -->`);
    html = html.replace(/<!-- LISTING_CONTACT_EMAIL -->.*?<!-- \/LISTING_CONTACT_EMAIL -->/g, `<!-- LISTING_CONTACT_EMAIL -->${listingContactEmail}<!-- /LISTING_CONTACT_EMAIL -->`);
    html = html.replace(/<!-- LISTING_SEE_MORE_URL -->.*?<!-- \/LISTING_SEE_MORE_URL -->/g, `<!-- LISTING_SEE_MORE_URL -->${listingSeeMoreUrl}<!-- /LISTING_SEE_MORE_URL -->`);

    html = html.replace(/<!-- CLOSING_IMAGE -->.*?<!-- \/CLOSING_IMAGE -->/gs, `<!-- CLOSING_IMAGE --><img src="${closingImage}" alt="Happy family at closing" style="width: 85%; max-width: 450px; aspect-ratio: 16/9; border-radius: 8px; object-fit: cover; margin: 0 auto 20px auto; display: block;"><!-- /CLOSING_IMAGE -->`);
    html = html.replace(/<!-- CLOSING_TITLE -->.*?<!-- \/CLOSING_TITLE -->/g, `<!-- CLOSING_TITLE -->${closingTitle}<!-- /CLOSING_TITLE -->`);
    html = html.replace(/<!-- CLOSING_LOCATION -->.*?<!-- \/CLOSING_LOCATION -->/g, `<!-- CLOSING_LOCATION -->${closingLocation}<!-- /CLOSING_LOCATION -->`);
    html = html.replace(/<!-- CLOSING_PRICE -->.*?<!-- \/CLOSING_PRICE -->/g, `<!-- CLOSING_PRICE -->${closingPrice}<!-- /CLOSING_PRICE -->`);
    html = html.replace(/<!-- CLOSING_DESCRIPTION -->.*?<!-- \/CLOSING_DESCRIPTION -->/g, `<!-- CLOSING_DESCRIPTION -->${closingDescription}<!-- /CLOSING_DESCRIPTION -->`);

    html = html.replace(/<!-- AGENT_1_IMAGE -->.*?<!-- \/AGENT_1_IMAGE -->/gs, `<!-- AGENT_1_IMAGE --><img src="${agent1Image}" alt="Featured Agent 1" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin: 0 auto 10px auto; border: 3px solid #FFD700; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: block;"><!-- /AGENT_1_IMAGE -->`);
    html = html.replace(/<!-- AGENT_1_NAME -->.*?<!-- \/AGENT_1_NAME -->/g, `<!-- AGENT_1_NAME -->${agent1Name}<!-- /AGENT_1_NAME -->`);
    html = html.replace(/<!-- AGENT_2_IMAGE -->.*?<!-- \/AGENT_2_IMAGE -->/gs, `<!-- AGENT_2_IMAGE --><img src="${agent2Image}" alt="Featured Agent 2" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin: 0 auto 10px auto; border: 3px solid #FFD700; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: block;"><!-- /AGENT_2_IMAGE -->`);
    html = html.replace(/<!-- AGENT_2_NAME -->.*?<!-- \/AGENT_2_NAME -->/g, `<!-- AGENT_2_NAME -->${agent2Name}<!-- /AGENT_2_NAME -->`);
    html = html.replace(/<!-- AGENT_3_IMAGE -->.*?<!-- \/AGENT_3_IMAGE -->/gs, `<!-- AGENT_3_IMAGE --><img src="${agent3Image}" alt="Featured Agent 3" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin: 0 auto 10px auto; border: 3px solid #FFD700; box-shadow: 0 2px 8px rgba(0,0,0,0.1); display: block;"><!-- /AGENT_3_IMAGE -->`);
    html = html.replace(/<!-- AGENT_3_NAME -->.*?<!-- \/AGENT_3_NAME -->/g, `<!-- AGENT_3_NAME -->${agent3Name}<!-- /AGENT_3_NAME -->`);

    // Remove sections that are toggled off
    if (!showMarketUpdates) html = html.replace(/<!-- START: market-updates -->.*?<!-- END: market-updates -->/gs, "");
    if (!showReview) html = html.replace(/<!-- START: review-week -->.*?<!-- END: review-week -->/gs, "");
    if (!showEvents) html = html.replace(/<!-- START: events-activities -->.*?<!-- END: events-activities -->/gs, "");
    if (!showListing) html = html.replace(/<!-- START: featured-listing -->.*?<!-- END: featured-listing -->/gs, "");
    if (!showClosing) html = html.replace(/<!-- START: closing-week -->.*?<!-- END: closing-week -->/gs, "");
    if (!showAgents) html = html.replace(/<!-- START: featured-agents -->.*?<!-- END: featured-agents -->/gs, "");
    if (!showRefinancing) html = html.replace(/<!-- START: refinancing -->.*?<!-- END: refinancing -->/gs, "");
    if (!showTeam) html = html.replace(/<!-- START: meet-team -->.*?<!-- END: meet-team -->/gs, "");

    return html;
  }, [
    rate10, apr10, rate15, apr15, rate30, apr30, marketCommentary,
    reviewText, reviewName, reviewDesc, reviewDate, reviewBtnUrl,
    event1Image, event1Title, event1Desc, event1BtnText, event1BtnUrl,
    event2Image, event2Title, event2Desc, event2BtnText, event2BtnUrl,
    event3Image, event3Title, event3Desc, event3BtnText, event3BtnUrl,
    listingImage, listingStreet, listingCity, listingBeds, listingBaths, listingSqft,
    listingAgent, listingPrice, listingContactEmail, listingSeeMoreUrl,
    closingImage, closingTitle, closingLocation, closingPrice, closingDescription,
    agent1Image, agent1Name, agent2Image, agent2Name, agent3Image, agent3Name,
    showMarketUpdates, showReview, showEvents, showListing, showClosing, showAgents, showRefinancing, showTeam
  ]);

  const handleCopyHtml = () => {
    navigator.clipboard.writeText(finalHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Success", description: "HTML copied to clipboard" });
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([finalHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "friday-newsletter.html";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Success", description: "HTML file downloaded" });
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header Toolbar */}
      <div className="sticky top-0 z-10 bg-background border-b px-6 py-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Friday Newsletter Builder</h2>
        <div className="flex items-center gap-3">
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "mobile" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("mobile")}
              className="rounded-r-none"
            >
              <Smartphone className="h-4 w-4 mr-1" />
              Mobile
            </Button>
            <Button
              variant={viewMode === "desktop" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("desktop")}
              className="rounded-l-none"
            >
              <Monitor className="h-4 w-4 mr-1" />
              Desktop
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleCopyHtml}>
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            Copy HTML
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadHtml}>
            <Download className="h-4 w-4 mr-1" />
            Download HTML
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Collapsible Editor */}
        <div className="w-80 border-r overflow-y-auto bg-muted/30">
          <div className="p-4 space-y-4">
            {/* Market Updates */}
            <Collapsible>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox checked={showMarketUpdates} onCheckedChange={(checked) => setShowMarketUpdates(checked === true)} />
                  <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium">
                    Market Updates <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                </div>
              </div>
              <CollapsibleContent className="mt-3 space-y-3 pl-6">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">10yr Rate</Label>
                    <Input value={rate10} onChange={(e) => setRate10(e.target.value)} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">10yr APR</Label>
                    <Input value={apr10} onChange={(e) => setApr10(e.target.value)} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">15yr Rate</Label>
                    <Input value={rate15} onChange={(e) => setRate15(e.target.value)} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">15yr APR</Label>
                    <Input value={apr15} onChange={(e) => setApr15(e.target.value)} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">30yr Rate</Label>
                    <Input value={rate30} onChange={(e) => setRate30(e.target.value)} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">30yr APR</Label>
                    <Input value={apr30} onChange={(e) => setApr30(e.target.value)} className="h-8" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Market Commentary</Label>
                  <Textarea value={marketCommentary} onChange={(e) => setMarketCommentary(e.target.value)} rows={3} className="text-xs" />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Review of the Week */}
            <Collapsible>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox checked={showReview} onCheckedChange={(checked) => setShowReview(checked === true)} />
                  <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium">
                    Review of the Week <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                </div>
              </div>
              <CollapsibleContent className="mt-3 space-y-3 pl-6">
                <div>
                  <Label className="text-xs">Review Text</Label>
                  <Textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={4} className="text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Customer Name</Label>
                  <Input value={reviewName} onChange={(e) => setReviewName(e.target.value)} className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Input value={reviewDesc} onChange={(e) => setReviewDesc(e.target.value)} className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">Date</Label>
                  <Input value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">Button URL</Label>
                  <Input value={reviewBtnUrl} onChange={(e) => setReviewBtnUrl(e.target.value)} className="h-8" />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Events & Activities */}
            <Collapsible>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox checked={showEvents} onCheckedChange={(checked) => setShowEvents(checked === true)} />
                  <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium">
                    Events & Activities <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                </div>
              </div>
              <CollapsibleContent className="mt-3 space-y-4 pl-6">
                {/* Event 1 */}
                <div className="space-y-2 p-2 border rounded">
                  <Label className="text-xs font-semibold">Event 1</Label>
                  <div>
                    <Label className="text-xs">Image</Label>
                    <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], setEvent1Image)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input value={event1Title} onChange={(e) => setEvent1Title(e.target.value)} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Textarea value={event1Desc} onChange={(e) => setEvent1Desc(e.target.value)} rows={2} className="text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Button Text</Label>
                    <Input value={event1BtnText} onChange={(e) => setEvent1BtnText(e.target.value)} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Button URL</Label>
                    <Input value={event1BtnUrl} onChange={(e) => setEvent1BtnUrl(e.target.value)} className="h-8" />
                  </div>
                </div>

                {/* Event 2 */}
                <div className="space-y-2 p-2 border rounded">
                  <Label className="text-xs font-semibold">Event 2</Label>
                  <div>
                    <Label className="text-xs">Image</Label>
                    <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], setEvent2Image)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input value={event2Title} onChange={(e) => setEvent2Title(e.target.value)} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Textarea value={event2Desc} onChange={(e) => setEvent2Desc(e.target.value)} rows={2} className="text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Button Text</Label>
                    <Input value={event2BtnText} onChange={(e) => setEvent2BtnText(e.target.value)} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Button URL</Label>
                    <Input value={event2BtnUrl} onChange={(e) => setEvent2BtnUrl(e.target.value)} className="h-8" />
                  </div>
                </div>

                {/* Event 3 */}
                <div className="space-y-2 p-2 border rounded">
                  <Label className="text-xs font-semibold">Event 3</Label>
                  <div>
                    <Label className="text-xs">Image</Label>
                    <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], setEvent3Image)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input value={event3Title} onChange={(e) => setEvent3Title(e.target.value)} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Description</Label>
                    <Textarea value={event3Desc} onChange={(e) => setEvent3Desc(e.target.value)} rows={2} className="text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Button Text</Label>
                    <Input value={event3BtnText} onChange={(e) => setEvent3BtnText(e.target.value)} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Button URL</Label>
                    <Input value={event3BtnUrl} onChange={(e) => setEvent3BtnUrl(e.target.value)} className="h-8" />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Featured Listing */}
            <Collapsible>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox checked={showListing} onCheckedChange={(checked) => setShowListing(checked === true)} />
                  <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium">
                    Featured Listing <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                </div>
              </div>
              <CollapsibleContent className="mt-3 space-y-3 pl-6">
                <div>
                  <Label className="text-xs">Image</Label>
                  <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], setListingImage)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Street Address</Label>
                  <Input value={listingStreet} onChange={(e) => setListingStreet(e.target.value)} className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">City, State, Zip</Label>
                  <Input value={listingCity} onChange={(e) => setListingCity(e.target.value)} className="h-8" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Beds</Label>
                    <Input value={listingBeds} onChange={(e) => setListingBeds(e.target.value)} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Baths</Label>
                    <Input value={listingBaths} onChange={(e) => setListingBaths(e.target.value)} className="h-8" />
                  </div>
                  <div>
                    <Label className="text-xs">Sq Ft</Label>
                    <Input value={listingSqft} onChange={(e) => setListingSqft(e.target.value)} className="h-8" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Agent Name</Label>
                  <Input value={listingAgent} onChange={(e) => setListingAgent(e.target.value)} className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">Price</Label>
                  <Input value={listingPrice} onChange={(e) => setListingPrice(e.target.value)} className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">Contact Email</Label>
                  <Input value={listingContactEmail} onChange={(e) => setListingContactEmail(e.target.value)} className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">See More URL</Label>
                  <Input value={listingSeeMoreUrl} onChange={(e) => setListingSeeMoreUrl(e.target.value)} className="h-8" />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Closing of the Week */}
            <Collapsible>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox checked={showClosing} onCheckedChange={(checked) => setShowClosing(checked === true)} />
                  <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium">
                    Closing of the Week <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                </div>
              </div>
              <CollapsibleContent className="mt-3 space-y-3 pl-6">
                <div>
                  <Label className="text-xs">Image</Label>
                  <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], setClosingImage)} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Family Name</Label>
                  <Input value={closingTitle} onChange={(e) => setClosingTitle(e.target.value)} className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">Location</Label>
                  <Input value={closingLocation} onChange={(e) => setClosingLocation(e.target.value)} className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">Price</Label>
                  <Input value={closingPrice} onChange={(e) => setClosingPrice(e.target.value)} className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea value={closingDescription} onChange={(e) => setClosingDescription(e.target.value)} rows={3} className="text-xs" />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Featured Agents */}
            <Collapsible>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox checked={showAgents} onCheckedChange={(checked) => setShowAgents(checked === true)} />
                  <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium">
                    Featured Agents <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                </div>
              </div>
              <CollapsibleContent className="mt-3 space-y-4 pl-6">
                <div className="space-y-2 p-2 border rounded">
                  <Label className="text-xs font-semibold">Agent 1</Label>
                  <div>
                    <Label className="text-xs">Image</Label>
                    <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], setAgent1Image)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input value={agent1Name} onChange={(e) => setAgent1Name(e.target.value)} className="h-8" />
                  </div>
                </div>
                <div className="space-y-2 p-2 border rounded">
                  <Label className="text-xs font-semibold">Agent 2</Label>
                  <div>
                    <Label className="text-xs">Image</Label>
                    <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], setAgent2Image)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input value={agent2Name} onChange={(e) => setAgent2Name(e.target.value)} className="h-8" />
                  </div>
                </div>
                <div className="space-y-2 p-2 border rounded">
                  <Label className="text-xs font-semibold">Agent 3</Label>
                  <div>
                    <Label className="text-xs">Image</Label>
                    <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], setAgent3Image)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input value={agent3Name} onChange={(e) => setAgent3Name(e.target.value)} className="h-8" />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Refinancing & Team (Static) */}
            <div className="flex items-center gap-2">
              <Checkbox checked={showRefinancing} onCheckedChange={(checked) => setShowRefinancing(checked === true)} />
              <Label className="text-sm font-medium">Interested in Refinancing?</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={showTeam} onCheckedChange={(checked) => setShowTeam(checked === true)} />
              <Label className="text-sm font-medium">Meet the Team</Label>
            </div>
          </div>
        </div>

        {/* Main Preview Area */}
        <div className="flex-1 flex items-center justify-center bg-muted/10 p-8 overflow-auto">
          <div
            className="bg-white shadow-2xl"
            style={{
              width: viewMode === "mobile" ? "375px" : "600px",
              transform: viewMode === "mobile" ? "scale(0.9)" : "scale(1)",
              transformOrigin: "top center",
            }}
          >
            <iframe
              srcDoc={finalHtml}
              title="Newsletter Preview"
              className="w-full border-0"
              style={{ height: "80vh", minHeight: "600px" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}