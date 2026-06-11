export function parseRedisUrl(url: string): { host: string; port: number; password?: string } {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: +parsed.port || 6379,
    ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
  };
}
