import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { TestProvider } from '@/context/TestContext';
import { ProjectSubmissionsProvider } from '@/context/ProjectSubmissionsContext';
import { AttendanceProvider } from '@/context/AttendanceContext';
import { EnrollmentProvider } from '@/context/EnrollmentContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { SupportTicketProvider } from '@/context/SupportTicketContext';

import { CourseProvider } from '@/context/CourseContext';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AIvalytics LMS - Learning Management System',
  description: 'Enterprise Course Management and AI Learning Analytics Platform',
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#f8faf9] text-gray-900" suppressHydrationWarning>
        <AuthProvider>
          <SidebarProvider>
            <CourseProvider>
              <TestProvider>
                <ProjectSubmissionsProvider>
                  <NotificationProvider>
                    <AttendanceProvider>
                      <EnrollmentProvider>
                        <SupportTicketProvider>{children}</SupportTicketProvider>
                      </EnrollmentProvider>
                    </AttendanceProvider>
                  </NotificationProvider>
                </ProjectSubmissionsProvider>
              </TestProvider>
            </CourseProvider>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
