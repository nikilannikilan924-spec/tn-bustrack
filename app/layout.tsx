import type { Metadata, Viewport } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import PwaRegister from '@/components/PwaRegister';
import { LanguageProvider } from '@/lib/LanguageContext';
import { AuthProvider } from '@/lib/AuthContext';
import { Space_Grotesk, Orbitron, JetBrains_Mono, Noto_Sans_Tamil } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap'
});

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-orbitron',
  display: 'swap'
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
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
    other: [{ rel: 'mask-icon', url: '/icon.svg', color: '#0EA5E9' }]
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
          <AuthProvider>
            <div className="min-h-screen min-h-dvh" style={{ background: 'var(--bg-primary)' }}>
              <Sidebar />
              <PwaRegister />
              <main className="min-h-screen min-h-dvh pl-0 md:ml-80 md:pl-0 lg:px-8">
                <div className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-6">
                  {children}
                </div>
              </main>
            </div>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
