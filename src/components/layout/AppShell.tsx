'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, BookOpen, Ticket, BarChart2, Calendar } from 'lucide-react';
import { useSidebar } from '@/context/SidebarContext';
import { useAuth } from '@/context/AuthContext';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isCollapsed } = useSidebar();
  const { isAuthenticated, isLoading } = useAuth();

  const isAuthRoute = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isAuthRoute) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, router, pathname, isAuthRoute]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8faf9] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#3ECE92] animate-pulse flex items-center justify-center shadow-xs">
            <div className="w-3 h-3 bg-[#121614] rounded-[2px]" />
          </div>
          <span className="text-xs font-semibold text-gray-500 font-mono">Authenticating...</span>
        </div>
      </div>
    );
  }

  if (isAuthRoute) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  const mobileTabs = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Courses', href: '/courses', icon: BookOpen },
    { name: 'Support', href: '/support', icon: Ticket },
    { name: 'Analytics', href: '/performance', icon: BarChart2 },
    { name: 'Events', href: '/events', icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col lg:flex-row text-gray-900 font-sans">
      {/* Desktop Left Sidebar: Pinned/Sticky & Retractable */}
      <div className="hidden lg:block shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer Backdrop & Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onCloseMobile={() => setMobileOpen(false)} isMobileDrawer={true} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0 transition-all duration-300 ease-in-out">
        <Header onOpenMobile={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 px-3 py-2 flex items-center justify-around">
        {mobileTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors ${
                isActive ? 'text-[#059669]' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-[#3ECE92]' : 'text-gray-400'}`} />
              <span>{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
