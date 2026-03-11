'use client';

import React, { Dispatch, SetStateAction } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { signOut } from 'next-auth/react';
import {
  Home,
  Package,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  X,
  Clock,
  ShoppingCart,
  BarChart2,
  Bell,
  Briefcase,
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

export function Sidebar({ isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const pathname = usePathname();

  const handleLogout = () => {
    signOut({ callbackUrl: '/' });
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

        <nav className="flex flex-1 flex-col space-y-2 p-4">
          <NavLink href="/dashboard" setIsMobileOpen={setIsMobileOpen} isActive={pathname === '/dashboard'}>
            <Home className="h-5 w-5" /><span>Dashboard</span>
          </NavLink>

          {/* ✅ Reports added */}
          <NavLink href="/report" setIsMobileOpen={setIsMobileOpen} isActive={pathname === '/report'}>
            <BarChart2 className="h-5 w-5" /><span>Reports</span>
          </NavLink>

          <NavLink href="/inventory" setIsMobileOpen={setIsMobileOpen} isActive={pathname === '/inventory'}>
            <Package className="h-5 w-5" /><span>Inventory</span>
          </NavLink>

          <NavLink href="/services" setIsMobileOpen={setIsMobileOpen} isActive={pathname === '/services'}>
            <Briefcase className="h-5 w-5" /><span>Services</span>
          </NavLink>

          <NavLink href="/billing" setIsMobileOpen={setIsMobileOpen} isActive={pathname === '/billing'}>
            <CreditCard className="h-5 w-5" /><span>Billing</span>
          </NavLink>

          <NavLink href="/billing-history" setIsMobileOpen={setIsMobileOpen} isActive={pathname === '/billing-history'}>
            <Clock className="h-5 w-5" /><span>Billing History</span>
          </NavLink>

          <NavLink href="/purchase" setIsMobileOpen={setIsMobileOpen} isActive={pathname === '/purchase'}>
            <ShoppingCart className="h-5 w-5" /><span>Purchase</span>
          </NavLink>

          <NavLink href="/settings" setIsMobileOpen={setIsMobileOpen} isActive={pathname === '/settings'}>
            <Settings className="h-5 w-5" /><span>Settings</span>
          </NavLink>
        </nav>

        <div className="p-4 mt-auto bg-gray-50 border-t">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-600 transition-all hover:bg-red-50 active:bg-red-100 font-medium"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  const [hasUnread, setHasUnread] = React.useState(false);

  React.useEffect(() => {
    // Check if unread on load
    const checkUnread = async () => {
      try {
        const res = await fetch('/api/notifications/history');
        if (res.ok) {
          const data = await res.json();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (Array.isArray(data) && data.some((n: any) => !n.isRead)) {
            setHasUnread(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch unread notifications", err);
      }
    };
    checkUnread();
  }, []);

  return (
    <header className="z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] items-center justify-between border-b bg-white px-4 shadow-sm lg:hidden">
      <div className="flex items-center gap-3">
        <Image src="/assets/lite-logo.png" alt="BillzzyLite Logo" width={110} height={28} priority />
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/notifications"
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors relative"
          aria-label="Notifications"
        >
          <Bell size={22} strokeWidth={2.3} />
          {hasUnread && (
            <span className="absolute top-1 right-2 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          )}
        </Link>
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
