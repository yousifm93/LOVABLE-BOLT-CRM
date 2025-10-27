import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Search, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface EmailLog {
  id: string;
  lead_id: string | null;
  user_id: string;
  timestamp: string;
  direction: string;
  to_email: string;
  from_email: string;
  subject: string;
  snippet: string | null;
  provider_message_id: string | null;
  delivery_status: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  error_details: string | null;
  leads?: {
    first_name: string;
    last_name: string;
  };
}

export default function EmailHistory() {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("email_logs")
      .select(`
        *,
        leads:lead_id (
          first_name,
          last_name
        )
      `)
      .eq("direction", "Out")
      .order("timestamp", { ascending: false })
      .limit(100);

    if (error) {
      toast({
        title: "Error loading email history",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setEmails(data || []);
    }
    setLoading(false);
  };

  const getStatusBadge = (email: EmailLog) => {
    if (email.bounced_at) {
      return <Badge variant="destructive">Bounced</Badge>;
    }
    if (email.delivery_status === 'complained') {
      return <Badge variant="destructive">Spam Complaint</Badge>;
    }
    if (email.clicked_at) {
      return <Badge className="bg-blue-500">Clicked</Badge>;
    }
    if (email.opened_at) {
      return <Badge className="bg-cyan-500">Opened</Badge>;
    }
    if (email.delivery_status === 'delivered') {
      return <Badge className="bg-green-500">Delivered</Badge>;
    }
    if (email.delivery_status === 'sent') {
      return <Badge variant="secondary">Sent</Badge>;
    }
    return <Badge variant="outline">Unknown</Badge>;
  };

  const filteredEmails = emails.filter((email) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      email.to_email?.toLowerCase().includes(searchLower) ||
      email.subject?.toLowerCase().includes(searchLower) ||
      email.leads?.first_name?.toLowerCase().includes(searchLower) ||
      email.leads?.last_name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Email History</h2>
        <p className="text-muted-foreground">Track all sent emails and their delivery status</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by recipient, subject, or lead name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={fetchEmails} variant="outline">
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : filteredEmails.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No emails found matching your search" : "No emails sent yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEmails.map((email) => (
                <div
                  key={email.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <Mail className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{email.subject}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <span>To: {email.to_email}</span>
                          {email.leads && (
                            <>
                              <span>•</span>
                              <span>
                                Lead: {email.leads.first_name} {email.leads.last_name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getStatusBadge(email)}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(email.timestamp), "MMM d, h:mm a")}
                        </span>
                      </div>
                    </div>
                    {email.snippet && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{email.snippet}</p>
                    )}
                    {email.error_details && (
                      <p className="text-sm text-destructive mt-2">Error: {email.error_details}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {email.opened_at && (
                        <span>Opened: {format(new Date(email.opened_at), "MMM d, h:mm a")}</span>
                      )}
                      {email.clicked_at && (
                        <span>Clicked: {format(new Date(email.clicked_at), "MMM d, h:mm a")}</span>
                      )}
                      {email.bounced_at && (
                        <span>Bounced: {format(new Date(email.bounced_at), "MMM d, h:mm a")}</span>
                      )}
                    </div>
                  </div>
                  {email.lead_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="flex-shrink-0"
                    >
                      <a href={`/leads?id=${email.lead_id}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
