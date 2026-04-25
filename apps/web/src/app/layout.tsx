import type { Metadata } from 'next';
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
        {children}
      </body>
    </html>
  );
}
