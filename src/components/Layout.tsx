import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ActivityDropdown } from "@/components/ActivityDropdown";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-subtle">
        <AppSidebar />
        <div className="flex-1 flex flex-col relative">
          {/* Floating Activity Notification */}
          <div className="absolute top-3 right-4 z-40">
            <ActivityDropdown />
          </div>
          
          <main className="flex-1 pt-3 pb-0">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
