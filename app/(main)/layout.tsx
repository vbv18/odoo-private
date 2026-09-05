'use client';

import React from 'react';
import { Sidebar } from '@/components/navigation/Sidebar';
import { SidebarProvider, useSidebar } from '@/components/navigation/LayoutContext';

function MainLayoutInner({ children }: { children: React.ReactNode }) {
  const { mobileSidebarOpen, setMobileSidebarOpen } = useSidebar();

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex">
      {/* Persistent Left Sidebar (spec: Fixed left sidebar, ~240px wide on desktop) */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area (offset by sidebar width 240px on lg screens) */}
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
    <SidebarProvider>
      <MainLayoutInner>{children}</MainLayoutInner>
    </SidebarProvider>
  );
}

