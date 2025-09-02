import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Plus, Mail, Send, Users, Upload, Download, Filter, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const EmailMarketingNav = ({ currentPath }: { currentPath: string }) => {
  const navItems = [
    { title: "Campaigns", path: "campaigns", icon: Mail },
    { title: "Templates", path: "templates", icon: Mail },
    { title: "Audiences", path: "audiences", icon: Mail },
    { title: "Analytics", path: "analytics", icon: BarChart3 },
    { title: "Senders", path: "senders", icon: Send },
    { title: "Settings", path: "settings", icon: Mail }
  ];

  return (
    <div className="border-b border-border mb-6">
      <nav className="flex space-x-8">
        {navItems.map((item) => {
          const isActive = currentPath.includes(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {item.title}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

interface EmailList {
  id: string;
  name: string;
  description: string;
  is_public: boolean;
  created_at: string;
  member_count?: number;
}

interface EmailContact {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  city: string;
  state: string;
  object_type: string;
  unsubscribed: boolean;
  created_at: string;
}

interface EmailSegment {
  id: string;
  name: string;
  description: string;
  rules_json: any;
  created_at: string;
}

export default function EmailAudiences() {
  const location = useLocation();
  const [lists, setLists] = useState<EmailList[]>([]);
  const [contacts, setContacts] = useState<EmailContact[]>([]);
  const [segments, setSegments] = useState<EmailSegment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [listsResponse, contactsResponse, segmentsResponse] = await Promise.all([
        supabase.from('email_lists').select('*').order('created_at', { ascending: false }),
        supabase.from('email_contacts').select('*').eq('unsubscribed', false).order('created_at', { ascending: false }).limit(10),
        supabase.from('email_segments').select('*').order('created_at', { ascending: false })
      ]);

      if (listsResponse.error) throw listsResponse.error;
      if (contactsResponse.error) throw contactsResponse.error;
      if (segmentsResponse.error) throw segmentsResponse.error;

      // Get member counts for lists
      const listsWithCounts = await Promise.all(
        (listsResponse.data || []).map(async (list) => {
          const { count } = await supabase
            .from('email_list_memberships')
            .select('*', { count: 'exact' })
            .eq('list_id', list.id)
            .eq('subscribed', true);
          
          return { ...list, member_count: count || 0 };
        })
      );

      setLists(listsWithCounts);
      setContacts(contactsResponse.data || []);
      setSegments(segmentsResponse.data || []);
    } catch (error: any) {
      console.error('Error fetching audience data:', error);
      toast({
        title: "Error",
        description: "Failed to load audience data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <EmailMarketingNav currentPath={location.pathname} />
        <div>Loading audiences...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EmailMarketingNav currentPath={location.pathname} />
      
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Audiences</h2>
          <p className="text-muted-foreground">Manage your contact lists and segments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            New List
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contacts.length}</div>
            <p className="text-xs text-muted-foreground">Active subscribers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Lists</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lists.length}</div>
            <p className="text-xs text-muted-foreground">Active lists</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Segments</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segments.length}</div>
            <p className="text-xs text-muted-foreground">Dynamic segments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. List Size</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lists.length > 0 ? Math.round(lists.reduce((sum, list) => sum + (list.member_count || 0), 0) / lists.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground">Contacts per list</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lists" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="lists">Lists</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
        </TabsList>

        <TabsContent value="lists" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Lists</CardTitle>
              <CardDescription>Organize your contacts into targeted lists</CardDescription>
            </CardHeader>
            <CardContent>
              {lists.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No lists yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first email list to organize your contacts.</p>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Create List
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>List Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Contacts</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lists.map((list) => (
                      <TableRow key={list.id}>
                        <TableCell className="font-medium">{list.name}</TableCell>
                        <TableCell>{list.description}</TableCell>
                        <TableCell>{list.member_count || 0}</TableCell>
                        <TableCell>
                          <Badge variant={list.is_public ? "default" : "secondary"}>
                            {list.is_public ? "Public" : "Private"}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(list.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Contacts</CardTitle>
                  <CardDescription>Manage individual contact records</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {contacts.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No contacts yet</h3>
                  <p className="text-muted-foreground mb-4">Import contacts or add them manually to get started.</p>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Upload className="mr-2 h-4 w-4" />
                    Import Contacts
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          {contact.first_name} {contact.last_name}
                        </TableCell>
                        <TableCell>{contact.email}</TableCell>
                        <TableCell>{contact.city}, {contact.state}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{contact.object_type}</Badge>
                        </TableCell>
                        <TableCell>{new Date(contact.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dynamic Segments</CardTitle>
              <CardDescription>Create rule-based audience segments that update automatically</CardDescription>
            </CardHeader>
            <CardContent>
              {segments.length === 0 ? (
                <div className="text-center py-8">
                  <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No segments yet</h3>
                  <p className="text-muted-foreground mb-4">Create dynamic segments to target specific audience groups.</p>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Segment
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Segment Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Rules</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {segments.map((segment) => (
                      <TableRow key={segment.id}>
                        <TableCell className="font-medium">{segment.name}</TableCell>
                        <TableCell>{segment.description}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {Object.keys(segment.rules_json || {}).length} rules
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(segment.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}