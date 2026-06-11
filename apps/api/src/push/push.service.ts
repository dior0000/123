import { Injectable } from '@nestjs/common';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  sound: string;
  data: Record<string, unknown>;
}

@Injectable()
export class PushService {
  async sendToTokens(
    tokens: string[],
    notification: { title: string; body: string; data?: Record<string, unknown> },
  ): Promise<void> {
    if (!tokens.length) return;
    const messages: PushMessage[] = tokens.map((to) => ({
      to,
      title: notification.title,
      body: notification.body,
      sound: 'default',
      data: notification.data ?? {},
    }));
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      });
      if (!res.ok) {
        console.warn('[PushService] Expo push API returned', res.status);
      }
    } catch (err) {
      console.warn('[PushService] fetch failed:', err);
    }
  }
}
