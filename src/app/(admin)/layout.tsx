'use client';

import React, { useState } from 'react';
import { AdminSidebar, AdminMobileHeader } from '@/components/AdminSidebar';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  if (pathname === '/admin') {
    return <>{children}</>;
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-gray-50">
      {/* Mobile Top Header (Hidden on LG screens) */}
      <div className="flex-shrink-0 lg:hidden">
        <AdminMobileHeader onMenuClick={() => setIsMobileOpen(true)} />
      </div>

      <div className="flex-1 flex overflow-hidden lg:flex-row">
        {/* Responsive Admin Sidebar */}
        <AdminSidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

        {/* Main Content Area */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
