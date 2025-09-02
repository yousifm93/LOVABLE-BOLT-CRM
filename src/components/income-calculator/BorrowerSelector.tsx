import React, { useState, useEffect } from "react";
import { Search, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Borrower {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  lead_id?: string;
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
}

interface BorrowerSelectorProps {
  selectedBorrower: Borrower | null;
  onBorrowerSelect: (borrower: Borrower | null) => void;
}

export function BorrowerSelector({ selectedBorrower, onBorrowerSelect }: BorrowerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [newBorrower, setNewBorrower] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    lead_id: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    loadBorrowers();
    loadLeads();
  }, []);

  const loadBorrowers = async () => {
    try {
      const { data, error } = await supabase
        .from('borrowers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBorrowers(data || []);
    } catch (error) {
      console.error('Error loading borrowers:', error);
    }
  };

  const loadLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, phone')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error loading leads:', error);
    }
  };

  const handleCreateBorrower = async () => {
    if (!newBorrower.first_name || !newBorrower.last_name) {
      toast({
        title: "Missing Information",
        description: "First name and last name are required",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('borrowers')
        .insert({
          first_name: newBorrower.first_name,
          last_name: newBorrower.last_name,
          email: newBorrower.email || null,
          phone: newBorrower.phone || null,
          lead_id: newBorrower.lead_id || null
        })
        .select()
        .single();

      if (error) throw error;

      await loadBorrowers();
      onBorrowerSelect(data);
      setIsOpen(false);
      setNewBorrower({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        lead_id: ""
      });

      toast({
        title: "Borrower Created",
        description: "New borrower has been created successfully"
      });

    } catch (error) {
      console.error('Error creating borrower:', error);
      toast({
        title: "Creation Failed",
        description: "Failed to create borrower",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFromLead = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setNewBorrower({
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email || "",
        phone: lead.phone || "",
        lead_id: leadId
      });
    }
  };

  const filteredBorrowers = borrowers.filter(borrower => {
    const fullName = `${borrower.first_name} ${borrower.last_name}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || 
           borrower.email?.toLowerCase().includes(query) ||
           borrower.phone?.includes(query);
  });

  return (
    <div className="space-y-4">
      {/* Current Selection */}
      {selectedBorrower ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">
                    {selectedBorrower.first_name} {selectedBorrower.last_name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {selectedBorrower.email && (
                      <span>{selectedBorrower.email}</span>
                    )}
                    {selectedBorrower.phone && (
                      <span>{selectedBorrower.phone}</span>
                    )}
                    {selectedBorrower.lead_id && (
                      <Badge variant="secondary">Linked to Lead</Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={() => setIsOpen(true)}
              >
                Change
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-8">
          <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-medium mb-2">No Borrower Selected</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Select an existing borrower or create a new one to get started
          </p>
          <Button onClick={() => setIsOpen(true)}>
            Select Borrower
          </Button>
        </div>
      )}

      {/* Selection Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select or Create Borrower</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <div className="space-y-4 h-full">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search borrowers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Create New Section */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create New Borrower
                  </h4>
                  
                  <div className="space-y-3">
                    {/* Link from Lead */}
                    <div>
                      <Label htmlFor="lead-select">Link from Existing Lead (Optional)</Label>
                      <Select onValueChange={handleSelectFromLead}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a lead..." />
                        </SelectTrigger>
                        <SelectContent>
                          {leads.map(lead => (
                            <SelectItem key={lead.id} value={lead.id}>
                              {lead.first_name} {lead.last_name}
                              {lead.email && ` - ${lead.email}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="first_name">First Name *</Label>
                        <Input
                          id="first_name"
                          value={newBorrower.first_name}
                          onChange={(e) => setNewBorrower(prev => ({ ...prev, first_name: e.target.value }))}
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name">Last Name *</Label>
                        <Input
                          id="last_name"
                          value={newBorrower.last_name}
                          onChange={(e) => setNewBorrower(prev => ({ ...prev, last_name: e.target.value }))}
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newBorrower.email}
                          onChange={(e) => setNewBorrower(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="john@example.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={newBorrower.phone}
                          onChange={(e) => setNewBorrower(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                    
                    <Button 
                      onClick={handleCreateBorrower}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? "Creating..." : "Create Borrower"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Existing Borrowers */}
              <div>
                <h4 className="font-medium mb-3">Existing Borrowers ({filteredBorrowers.length})</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredBorrowers.map(borrower => (
                    <Card
                      key={borrower.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        onBorrowerSelect(borrower);
                        setIsOpen(false);
                      }}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium">
                              {borrower.first_name} {borrower.last_name}
                            </h5>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {borrower.email && <span>{borrower.email}</span>}
                              {borrower.phone && <span>{borrower.phone}</span>}
                            </div>
                          </div>
                          {borrower.lead_id && (
                            <Badge variant="secondary" className="ml-2">
                              Linked
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {filteredBorrowers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No borrowers found</p>
                      <p className="text-sm">Try adjusting your search or create a new borrower</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
