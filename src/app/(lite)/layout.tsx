// // src/app/(lite)/layout.tsx
// 'use client';

// import React, { useState } from 'react';
// import { Sidebar, MobileHeader } from '@/components/SideBar'; 
// import { BottomNavBar } from '@/components/BottomNav';

// export default function AppLayout({
//   children,
// }: {
//   // THIS IS THE FIX: Changed 'Node' to 'ReactNode'
//   children: React.ReactNode; 
// }) {
//   const [isMobileOpen, setIsMobileOpen] = useState(false);

//   return (
//     <div className="flex h-screen bg-gray-50">
//       <Sidebar 
//         isMobileOpen={isMobileOpen} 
//         setIsMobileOpen={setIsMobileOpen} 
//       />
//       <div className="flex-1 flex flex-col">
//         <MobileHeader 
//           onMenuClick={() => setIsMobileOpen(true)} 
//         />
//         {/* Added z-index to ensure content is properly layered */}
//         <main className="flex-1 overflow-y-auto pt-14 lg:pt-0 pb-20 lg:pb-0 z-10 relative">
//           {children}
//         </main>
//       </div>
//       <BottomNavBar />
//     </div>
//   );
// }

'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar, MobileHeader } from '@/components/SideBar';
import { BottomNavBar } from '@/components/BottomNav';
import NotificationPrompt from '@/components/NotificationPrompt';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // FINAL FAILSAFE: Redirect if user is logged in but has no phone (and is not admin)
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const isAdmin = session.user.role === 'admin';
      const hasPhone = session.user.phoneNumber && session.user.phoneNumber.trim().length > 0;

      if (!isAdmin && !hasPhone && pathname !== '/verify-phone') {
        console.log('[Layout Failsafe] Redirecting to /verify-phone');
        router.push('/verify-phone');
      }
    }
  }, [session, status, pathname, router]);

  // Prevent flicker: Show loading screen while checking status
  if (status === 'loading') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5a4fcf]"></div>
          <p className="text-sm font-medium text-gray-500 font-bold">Loading Workspace...</p>
        </div>
      </div>
    );
  }

  // Block rendering dashboard content for unverified users while redirecting
  const isAdmin = session?.user?.role === 'admin';
  const hasPhone = session?.user?.phoneNumber && session.user.phoneNumber.trim().length > 0;
  if (status === 'authenticated' && !isAdmin && !hasPhone && pathname !== '/verify-phone') {
    return null; // Keep screen empty while router.push works
  }


  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-gray-50">
      <div className="flex-shrink-0">
        <MobileHeader onMenuClick={() => setIsMobileOpen(true)} />
      </div>

      <div className="flex-1 flex overflow-hidden lg:flex-row">
        <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />

        <main className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </main>
      </div>

      <div className="flex-shrink-0 border-t border-gray-100 shadow-lg">
        <BottomNavBar />
      </div>
      <NotificationPrompt />
    </div>
  );
}