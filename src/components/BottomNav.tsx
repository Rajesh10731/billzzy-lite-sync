'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Package,
  Clock,
  ScanLine,
  ShoppingCart,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/inventory', icon: Package, label: 'Inventory' },
  { href: '/billing-history', icon: Clock, label: 'History' },
  { href: '/purchase', icon: ShoppingCart, label: 'Purchase' }, // 🆕 added Purchase
];

function NavLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string; }) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-300 ${isActive ? 'text-[#5a4fcf] scale-105' : 'text-gray-400 hover:text-[#5a4fcf]'
        }`}
    >
      <Icon className="w-6 h-6" />
      <span className="text-[11px] font-medium mt-1">{label}</span>
    </Link>
  );
}

export function BottomNavBar() {
  const pathname = usePathname();
  const isBilling = pathname.startsWith('/billing');

  return (
    <nav className="bg-white border-t border-gray-100 z-30 h-[calc(4.5rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] flex items-center justify-between px-3 lg:hidden relative">
      {/* Left two items */}
      <div className="flex flex-1 justify-evenly">
        {navItems.slice(0, 2).map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
          />
        ))}
      </div>

      {/* Center big scanner button */}
      <Link
        href="/billing"
        className={`relative bg-[#5a4fcf] text-white rounded-2xl p-4 shadow-lg shadow-indigo-200 transform transition-all duration-300 -translate-y-6 ${isBilling ? 'scale-110 ring-4 ring-white' : 'hover:scale-105'
          }`}
      >
        <ScanLine className="w-8 h-8" />
      </Link>

      {/* Right two items */}
      <div className="flex flex-1 justify-evenly">
        {navItems.slice(2).map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
          />
        ))}
      </div>
    </nav>
  );
}


// src/components/BottomNav.tsx