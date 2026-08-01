import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Telegram Gallery',
  description: 'Photo & Video Gallery from Telegram',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0a]">
        <nav className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-white flex items-center gap-2">
              <span>{'\uD83D\uDCF7'}</span>
              <span>Gallery</span>
            </a>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
