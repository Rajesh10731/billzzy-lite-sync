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