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

import React, { useState } from 'react';
import { Sidebar, MobileHeader } from '@/components/SideBar';
import { BottomNavBar } from '@/components/BottomNav';
import NotificationPrompt from '@/components/NotificationPrompt';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);


  return (
    <div className="flex min-h-[100dvh] bg-gray-50 overflow-hidden">
      <Sidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <MobileHeader
          onMenuClick={() => setIsMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto pt-[calc(3.5rem+env(safe-area-inset-top))] lg:pt-0 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0 z-10 relative">
          {children}
        </main>
      </div>
      <BottomNavBar />
      <NotificationPrompt />
    </div>
  );
}