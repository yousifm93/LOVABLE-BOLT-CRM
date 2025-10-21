import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Mail, User, ArrowRight } from "lucide-react";

interface ContactInfoCardProps {
  client: any;
  onClose: () => void;
  onConvert?: () => void;
  showConvertButton?: boolean;
}

export function ContactInfoCard({ client, onClose, onConvert, showConvertButton = false }: ContactInfoCardProps) {
  const fullName = `${client.person.firstName} ${client.person.lastName}`;
  const initials = `${client.person.firstName[0]}${client.person.lastName[0]}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="flex items-center justify-center"
            >
              <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity">
                <AvatarImage src={client.person.avatar} />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
            <h2 className="text-xl font-bold text-foreground">{fullName}</h2>
          </div>
        </div>
        <div className="flex gap-2 mb-3">
          <Button variant="outline" size="default" className="px-4 py-2">
            Edit
          </Button>
          {showConvertButton && (
            <Button 
              variant="default" 
              size="default" 
              className="px-4 py-2 bg-primary hover:bg-primary/90"
              onClick={onConvert}
            >
              <ArrowRight className="h-4 w-4 mr-1" />
              Convert
            </Button>
          )}
          <Button variant="outline" size="default" className="px-4 py-2">
            Delete
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Phone Number</p>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-3 w-3 text-muted-foreground" />
                <span>(352) 328-9828</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Email</p>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-3 w-3 text-muted-foreground" />
                <span>{client.person.email}</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Buyer's Agent</p>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-3 w-3 text-muted-foreground" />
                <button className="text-primary hover:underline text-sm">
                  Sarah Johnson
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Loan Amount</p>
              <span className="font-medium text-sm">{client.loan.loanAmount}</span>
            </div>
          </div>
          
          {/* Right Column */}
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Sales Price</p>
              <span className="font-medium text-sm">$425,000</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Transaction Type</p>
              <span className="font-medium text-sm">{client.loan.loanType}</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Property Type</p>
              <span className="font-medium text-sm">Single Family Home</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Loan Program</p>
              <span className="font-medium text-sm">Conventional</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}