'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearSession, getStoredUser } from '@/lib/auth';
import { useEffect, useState } from 'react';
import type { AuthUser } from '@/lib/types';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/engagements', label: 'Engagements' },
  { href: '/tasks', label: 'Tasks' },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  function logout() {
    clearSession();
    router.push('/login');
  }

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80 transition-colors animate-slide-down">
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 font-bold text-xs tracking-wider shadow-sm group-hover:scale-105 group-hover:rotate-2 transition-all duration-300">
            TET
          </div>
          <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-white hidden sm:inline-block group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors">
            Task Engagement Tool
          </span>
        </Link>

        {/* Desktop Centered Navigation Links */}
        <div className="hidden sm:flex sm:absolute sm:left-1/2 sm:-translate-x-1/2 items-center gap-1 bg-zinc-100/80 dark:bg-zinc-800/80 p-1 rounded-lg border border-zinc-200/60 dark:border-zinc-700/60">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ease-out active:scale-95 ${
                  isActive
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs font-semibold animate-scale-in'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right User Profile & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {user && (
            <div className="flex items-center gap-2 group cursor-default">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-900 dark:from-zinc-200 dark:to-zinc-400 text-white dark:text-zinc-900 flex items-center justify-center text-xs font-bold uppercase shadow-xs group-hover:scale-105 transition-transform duration-200">
                {user.name ? user.name.charAt(0) : 'U'}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 leading-none">
                  {user.name}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 capitalize leading-tight">
                  {user.role?.replace('_', ' ')}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={logout}
            className="hidden sm:inline-flex text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 border border-zinc-200 dark:border-zinc-700 hover:border-red-200 dark:hover:border-red-900/50 rounded-lg px-2.5 py-1 transition-all duration-200 active:scale-95 hover:bg-red-50 dark:hover:bg-red-950/30 hover:shadow-xs"
          >
            Sign out
          </button>

          {/* Mobile Hamburger Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            className="sm:hidden p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-4 py-3 flex flex-col gap-3 animate-slide-down shadow-lg">
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                    isActive
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-xs'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {user && (
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {user.name}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 capitalize">
                  {user.role?.replace('_', ' ')}
                </span>
              </div>
              <button
                onClick={logout}
                className="text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-1.5 bg-red-50/50 dark:bg-red-950/20 active:scale-95"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

