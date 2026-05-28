import type { Metadata, Viewport } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import PwaRegister from '@/components/PwaRegister';
import { LanguageProvider } from '@/lib/LanguageContext';
import { Space_Grotesk, Orbitron, JetBrains_Mono, Noto_Sans_Tamil } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk'
});

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  display: 'swap'
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap'
});

const notoSansTamil = Noto_Sans_Tamil({
  subsets: ['tamil'],
  variable: '--font-tamil',
  display: 'swap'
});

const APP_NAME = 'TN BusTrack';
const APP_DESCRIPTION = 'Tamil Nadu smart bus tracking with live GPS, routes, alerts, and saved trips.';

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: APP_NAME
  },
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }, { url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { url: '/icon.svg', type: 'image/svg+xml' }],
    other: [{ rel: 'mask-icon', url: '/icon.svg', color: '#E53935' }]
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#F8FAFC'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${orbitron.variable} ${jetbrainsMono.variable} ${notoSansTamil.variable} bg-[var(--bg-primary)] text-[var(--text-primary)]`}>
        <LanguageProvider>
          <div className="min-h-screen min-h-dvh" style={{ background: 'var(--bg-primary)' }}>
            <Sidebar />
            <MobileNav />
            <PwaRegister />
            <main className="min-h-screen min-h-dvh pb-20 pl-0 md:ml-80 md:pb-0 md:pl-0 lg:px-8">
              <div className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-6">
                {children}
              </div>
            </main>
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
