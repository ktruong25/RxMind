'use client';

import { UserButton } from '@clerk/nextjs';
import { Bell } from 'lucide-react';

interface TopbarProps {
  title: string;
}

export function Topbar({ title }: TopbarProps) {
  return (
    <header className="h-14 border-b border-border bg-surface/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
      <h1 className="text-sm font-semibold text-text">{title}</h1>
      <div className="flex items-center gap-3">
        <button className="relative text-muted hover:text-text transition-colors">
          <Bell className="h-4.5 w-4.5" />
        </button>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </header>
  );
}
