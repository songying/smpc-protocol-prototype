import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import { WagmiProviderWrapper } from '@/components/providers/WagmiProvider';
import { RoleProvider } from '@/contexts/RoleContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'SMPC Protocol - Secure Multi-Party Computation Platform',
  description: 'Privacy-preserving data trading and computation platform powered by advanced cryptographic protocols',
  keywords: ['SMPC', 'privacy', 'blockchain', 'data trading', 'cryptography', 'Web3'],
  authors: [{ name: 'SMPC Protocol Team' }],
  openGraph: {
    title: 'SMPC Protocol',
    description: 'Privacy-preserving data trading and computation platform',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Apply the saved theme before first paint to avoid a flash of the
            wrong theme. Dark is the SSR default; flip to light if persisted. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');if(t==='light'){var r=document.documentElement;r.classList.remove('dark');r.classList.add('light');}}catch(e){}})();",
          }}
        />
      </head>
      <body className="font-sans bg-surface-base text-ink antialiased">
        <WagmiProviderWrapper>
          <ThemeProvider>
            <RoleProvider>
              <div className="min-h-screen bg-surface-base text-ink bg-mesh">
                <Navbar />
                <main className="w-full">
                  {children}
                </main>
              </div>
            </RoleProvider>
          </ThemeProvider>
        </WagmiProviderWrapper>
      </body>
    </html>
  );
}