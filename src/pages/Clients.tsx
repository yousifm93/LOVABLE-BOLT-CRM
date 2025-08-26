import { useState } from "react";
import { Search, Plus, Filter, Phone, Mail, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const clients = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "(555) 123-4567",
    status: "Pre-approval",
    loanAmount: "$450,000",
    lastContact: "2024-01-15",
    creditScore: 780
  },
  {
    id: 2,
    name: "Mike Thompson", 
    email: "mike.t@email.com",
    phone: "(555) 234-5678",
    status: "Underwriting",
    loanAmount: "$320,000",
    lastContact: "2024-01-14",
    creditScore: 720
  },
  {
    id: 3,
    name: "Emily Chen",
    email: "emily.c@email.com", 
    phone: "(555) 345-6789",
    status: "Closing",
    loanAmount: "$580,000",
    lastContact: "2024-01-13",
    creditScore: 810
  },
  {
    id: 4,
    name: "David Wilson",
    email: "david.w@email.com",
    phone: "(555) 456-7890", 
    status: "Application",
    loanAmount: "$275,000",
    lastContact: "2024-01-12",
    creditScore: 690
  }
];

const statusColors = {
  "Pre-approval": "bg-info text-info-foreground",
  "Underwriting": "bg-warning text-warning-foreground",
  "Closing": "bg-success text-success-foreground", 
  "Application": "bg-muted text-muted-foreground"
};

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground">Manage your client relationships and loan applications</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      <Card className="bg-gradient-card shadow-soft">
        <CardHeader>
          <CardTitle>Client Directory</CardTitle>
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Loan Amount</TableHead>
                <TableHead>Credit Score</TableHead>
                <TableHead>Last Contact</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id} className="hover:bg-background/50 transition-colors">
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center text-sm">
                        <Mail className="h-3 w-3 mr-1 text-muted-foreground" />
                        {client.email}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Phone className="h-3 w-3 mr-1" />
                        {client.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[client.status as keyof typeof statusColors]}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{client.loanAmount}</TableCell>
                  <TableCell>
                    <span className={`font-medium ${client.creditScore >= 750 ? 'text-success' : client.creditScore >= 700 ? 'text-warning' : 'text-destructive'}`}>
                      {client.creditScore}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{client.lastContact}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}