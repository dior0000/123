import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  transpilePackages: ['@pocketbiz/shared'],
};

export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  disableLogger: true,
  sourcemaps: { disable: true },
});
