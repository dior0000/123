'use client';

import { useEffect, type ReactNode } from 'react';
import posthog from 'posthog-js';

let initialized = false;

export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const key = process.env['NEXT_PUBLIC_POSTHOG_KEY'];
    if (key && !initialized) {
      posthog.init(key, {
        api_host: process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? 'https://app.posthog.com',
        capture_pageview: true,
        autocapture: false,
      });
      initialized = true;
    }
  }, []);

  return <>{children}</>;
}
