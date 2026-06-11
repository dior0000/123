import type { Metadata } from 'next';
import './globals.css';
import { PostHogProvider } from './PostHogProvider';

export const metadata: Metadata = {
  title: 'PocketBiz — онлайн запись',
  description: 'Запишитесь онлайн к вашему мастеру',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
