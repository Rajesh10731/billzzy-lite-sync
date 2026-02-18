// // // src/app/(lite)/layout.tsx
// // 'use client';

// // import React, { useState } from 'react';
// // import { Sidebar, MobileHeader } from '@/components/SideBar'; 
// // import { BottomNavBar } from '@/components/BottomNav';

// // export default function AppLayout({
// //   children,
// // }: {
// //   // THIS IS THE FIX: Changed 'Node' to 'ReactNode'
// //   children: React.ReactNode; 
// // }) {
// //   const [isMobileOpen, setIsMobileOpen] = useState(false);

// //   return (
// //     <div className="flex h-screen bg-gray-50">
// //       <Sidebar 
// //         isMobileOpen={isMobileOpen} 
// //         setIsMobileOpen={setIsMobileOpen} 
// //       />
// //       <div className="flex-1 flex flex-col">
// //         <MobileHeader 
// //           onMenuClick={() => setIsMobileOpen(true)} 
// //         />
// //         {/* Added z-index to ensure content is properly layered */}
// //         <main className="flex-1 overflow-y-auto pt-14 lg:pt-0 pb-20 lg:pb-0 z-10 relative">
// //           {children}
// //         </main>
// //       </div>
// //       <BottomNavBar />
// //     </div>
// //   );
// // }

// 'use client';

// import React, { useState, useEffect } from 'react'; // Added useEffect
// import { Sidebar, MobileHeader } from '@/components/SideBar'; 
// import { BottomNavBar } from '@/components/BottomNav';
// import { subscribeUserToPush } from '@/lib/push-notifications'; // Import the helper

// export default function AppLayout({
//   children,
// }: {
//   children: React.ReactNode; 
// }) {
//   const [isMobileOpen, setIsMobileOpen] = useState(false);

//   // --- ADDED: Push Notification Subscription Logic ---
//   useEffect(() => {
//     const setupNotifications = async () => {
//       if ('Notification' in window) {
//         // If they already granted permission, ensure they are subscribed in our DB
//         if (Notification.permission === 'granted') {
//           await subscribeUserToPush();
//         } 
//         // If they haven't been asked yet, you might want to show a button 
//         // or prompt them here. For now, we try to subscribe.
//         else if (Notification.permission !== 'denied') {
//           const permission = await Notification.requestPermission();
//           if (permission === 'granted') {
//             await subscribeUserToPush();
//           }
//         }
//       }
//     };

//     setupNotifications();
//   }, []);
//   // --------------------------------------------------

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
import { subscribeUserToPush } from '@/lib/push-notifications';
import { useSession } from 'next-auth/react'; // Add this!

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { data: session, status } = useSession(); // Get session info

  useEffect(() => {
    const setupNotifications = async () => {
      // CRITICAL: Only run if the user is logged in
      if (status !== "authenticated" || !session?.user?.id) return;

      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          await subscribeUserToPush();
        } 
        else if (Notification.permission !== 'denied') {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            await subscribeUserToPush();
          }
        }
      }
    };

    setupNotifications();
  }, [status, session]); // Run when login status changes

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
      <div className="flex-1 flex flex-col">
        <MobileHeader onMenuClick={() => setIsMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto pt-14 lg:pt-0 pb-20 lg:pb-0 z-10 relative">
          {children}
        </main>
      </div>
      <BottomNavBar />
    </div>
  );
}