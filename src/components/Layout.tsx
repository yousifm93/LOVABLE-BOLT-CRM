import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
interface LayoutProps {
  children: ReactNode;
}
export function Layout({
  children
}: LayoutProps) {
  return <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-subtle pt-6">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 py-0 my-[20px]">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>;
}