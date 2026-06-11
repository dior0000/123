import { notFound } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import type { StorefrontResponse } from '@/types/booking';
import BookingClient from './BookingClient';

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const initialServiceId = sp['serviceId'] ?? null;

  const res = await apiFetch<StorefrontResponse>(`/public/storefront/${slug}`).catch(() => null);
  if (!res) notFound();

  return (
    <BookingClient
      slug={slug}
      storefront={res.storefront}
      services={res.services}
      initialServiceId={initialServiceId}
    />
  );
}
