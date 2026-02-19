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
import { useSession } from 'next-auth/react'; // check auth status
import { Sidebar, MobileHeader } from '@/components/SideBar';
import { BottomNavBar } from '@/components/BottomNav';
import { subscribeUserToPush } from '@/lib/push-notifications'; // Import the helper

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // --- ADDED: Push Notification Subscription Logic ---
  const { data: session, status } = useSession(); // Get session status

  useEffect(() => {
    const setupNotifications = async () => {
      console.log("🔍 Checking Notification Setup. Status:", status, "User ID:", session?.user?.id);
      // Only run if user is authenticated
      if (status !== 'authenticated' || !session?.user?.id) return;

      if ('Notification' in window && 'serviceWorker' in navigator) {
        console.log("📱 SW and Notification supported. Permission:", Notification.permission);
        // If they already granted permission, ensure they are subscribed in our DB
        if (Notification.permission === 'granted') {
          await subscribeUserToPush();
        }
      } else {
        console.warn("❌ SW or Notification NOT supported in this browser.");
      }
    };

    setupNotifications();
  }, [status, session]); // Run when session status changes
  // --------------------------------------------------

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      <div className="flex-1 flex flex-col">
        <MobileHeader
          onMenuClick={() => setIsMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto pt-14 lg:pt-0 pb-20 lg:pb-0 z-10 relative">
          {children}
        </main>
      </div>
      <BottomNavBar />
    </div>
  );
}