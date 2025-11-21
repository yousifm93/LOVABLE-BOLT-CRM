import { Settings, FileQuestion, Shield, Layout } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PasswordsVault from "@/pages/PasswordsVault";
import PipelineViews from "@/pages/admin/PipelineViews";

export default function AdminSettings() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings 2</h1>
            <p className="text-muted-foreground">Additional system configuration and management</p>
          </div>
        </div>

        <Tabs defaultValue="system" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              System Settings
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileQuestion className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="passwords" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Passwords
            </TabsTrigger>
            <TabsTrigger value="pipeline-views" className="flex items-center gap-2">
              <Layout className="h-4 w-4" />
              Pipeline Views
            </TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  System configuration options will be available here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  System reports and analytics will be available here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="passwords" className="space-y-4">
            <PasswordsVault />
          </TabsContent>

          <TabsContent value="pipeline-views" className="space-y-4">
            <PipelineViews />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
