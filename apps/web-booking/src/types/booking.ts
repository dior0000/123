export interface StorefrontUser {
  id: string;
  name: string;
  timezone: string;
}

export interface StorefrontInfo {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  photoUrl: string | null;
  isActive: boolean;
  requirePayment: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: StorefrontUser;
}

export interface Service {
  id: string;
  name: string;
  durationMin: number;
  priceKopecks: number;
  bufferMin: number;
  isActive: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StorefrontResponse {
  storefront: StorefrontInfo;
  services: Service[];
}

/** Slot as received from API (Dates serialized as ISO strings) */
export interface SlotDto {
  startsAt: string;
  endsAt: string;
}
