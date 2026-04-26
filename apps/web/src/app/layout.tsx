import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/app/theme-provider';
import { AuthProvider } from '@/hooks/use-auth';
import { LocaleProvider } from '@/i18n/provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Smart E-Learning',
  description: 'Corporate training LMS',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <LocaleProvider>
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
