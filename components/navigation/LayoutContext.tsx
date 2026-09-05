'use client';

import React, { createContext, useContext, useState } from 'react';

interface SidebarContextType {
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarContext = createContext<SidebarContextType>({
  mobileSidebarOpen: false,
  setMobileSidebarOpen: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <SidebarContext.Provider value={{ mobileSidebarOpen, setMobileSidebarOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  return useContext(SidebarContext);
}
