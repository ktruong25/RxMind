'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Package, FileX, Pill, LogOut } from 'lucide-react';
import { useClerk } from '@clerk/nextjs';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/patients',  label: 'Patients',   icon: Users },
  { href: '/inventory', label: 'Inventory',  icon: Package },
  { href: '/claims',    label: 'Claims',     icon: FileX },
  { href: '/mtm',       label: 'MTM',        icon: Pill },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col border-r border-border bg-surface h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <Pill className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-text tracking-tight">RxMind</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-accent/15 text-accent'
                : 'text-muted hover:text-text hover:bg-border/40'
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 pb-4">
        <button
          onClick={() => signOut({ redirectUrl: '/sign-in' })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-text hover:bg-border/40 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
