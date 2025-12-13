import { ReactNode } from "react";
import { Bell } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-subtle">
        <AppSidebar />
        <div className="flex-1 flex flex-col relative">
          {/* Floating Notification Bell */}
          <div className="absolute top-3 right-4 z-40">
            <Button variant="ghost" size="sm" className="relative h-8 w-8 p-0">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </Button>
          </div>
          
          <main className="flex-1 py-0">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
