'use client';

import React, { Dispatch, SetStateAction } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { signOut } from 'next-auth/react';
import {
  Users,
  UserCheck,
  BellRing,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: Dispatch<SetStateAction<boolean>>;
}

interface MobileHeaderProps {
  onMenuClick: () => void;
}

const NavLink = React.forwardRef<
  HTMLAnchorElement,
  {
    href: string;
    children: React.ReactNode;
    setIsMobileOpen: Dispatch<SetStateAction<boolean>>;
    isActive: boolean;
  }
>(({ href, children, setIsMobileOpen, isActive }, ref) => {
  const handleClick = () => {
    setIsMobileOpen(false);
  };

  return (
    <Link
      ref={ref}
      href={href}
      onClick={handleClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
        ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md'
        : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
        }`}
    >
      {children}
    </Link>
  );
});

NavLink.displayName = 'NavLink';

export function AdminSidebar({ isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const pathname = usePathname();

  const handleLogout = () => {
    signOut({ callbackUrl: '/admin' });
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden transition-opacity duration-300 ease-in-out ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={() => setIsMobileOpen(false)}
      />

      <aside
        className={`fixed top-0 left-0 h-full w-64 flex flex-col bg-white z-50 lg:relative transform transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none lg:border-r ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}
      >
        <div className="flex h-16 items-center justify-between px-5 bg-gradient-to-r from-indigo-50 to-purple-50">
          <Image src="/assets/lite-logo.png" alt="BillzzyLite Logo" width={130} height={32} priority />
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-2 rounded-full hover:bg-white/50 text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        <div className="h-1 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400" />

        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Admin Portal</span>
        </div>

        <nav className="flex flex-1 flex-col space-y-2 p-4">
          <NavLink href="/admin/dashboard" setIsMobileOpen={setIsMobileOpen} isActive={pathname === '/admin/dashboard'}>
            <Users className="h-5 w-5" /><span>Pending Boarding</span>
          </NavLink>

          <NavLink href="/admin/onboard" setIsMobileOpen={setIsMobileOpen} isActive={pathname === '/admin/onboard'}>
            <UserCheck className="h-5 w-5" /><span>Active Clients</span>
          </NavLink>

          <NavLink href="/admin/subscribed" setIsMobileOpen={setIsMobileOpen} isActive={pathname === '/admin/subscribed'}>
            <BellRing className="h-5 w-5" /><span>Notifications</span>
          </NavLink>
        </nav>

        <div className="p-4 mt-auto bg-gray-50 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 bg-red-50 text-red-600 border border-red-100 transition-all hover:bg-red-100 hover:border-red-200 active:scale-95 font-bold shadow-sm"
          >
            <LogOut className="h-5 w-5" />
            <span>Secure Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export function AdminMobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] items-center justify-between border-b bg-white px-4 shadow-sm lg:hidden">
      <div className="flex items-center gap-3">
        <Image src="/assets/lite-logo.png" alt="BillzzyLite Logo" width={110} height={28} priority />
        <span className="text-[10px] font-black uppercase tracking-widest text-white bg-indigo-600 px-2 py-0.5 rounded-md ml-2">Admin</span>
      </div>

      <div className="flex items-center">
        <button
          onClick={onMenuClick}
          className="px-3 py-2 rounded-lg bg-[#5a4fcf] text-white shadow-sm hover:bg-[#4c42b8] transition-all duration-200 hover:shadow-md active:scale-95"
          aria-label="Open menu"
        >
          <Menu size={22} strokeWidth={2.3} />
        </button>
      </div>
    </header>
  );
}
