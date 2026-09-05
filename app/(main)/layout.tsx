'use client';

import React from 'react';
import { Sidebar } from '@/components/navigation/Sidebar';
import { SidebarProvider, useSidebar } from '@/components/navigation/LayoutContext';
import { AuthProvider, useAuth } from '@/components/navigation/AuthContext';

function MainLayoutInner({ children }: { children: React.ReactNode }) {
  const { mobileSidebarOpen, setMobileSidebarOpen } = useSidebar();
  const { isLoading, user } = useAuth();

  // Show nothing while checking auth (prevents sidebar flash)
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-[#667085]">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user after loading, AuthContext already redirected to /login — render nothing
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex">
      {/* Fixed Left Sidebar */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content — offset right of 240px sidebar on lg+ */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-60">
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <SidebarProvider>
        <MainLayoutInner>{children}</MainLayoutInner>
      </SidebarProvider>
    </AuthProvider>
  );
}
