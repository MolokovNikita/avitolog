export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  created_at?: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
}

export interface Client {
  id: number;
  user_id: number;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;
  client_id: number;
  name: string;
  description?: string;
  price?: number;
  stock: number;
  sku?: string;
  category?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ListingMedia {
  id: number;
  listing_id: number;
  file_path: string;
  file_type?: string;
  is_primary: boolean;
  sort_order: number;
}

export interface Listing {
  id: number;
  product_id: number;
  marketplace: string;
  external_id?: string;
  title?: string;
  description?: string;
  price?: number;
  status: string;
  views: number;
  favorites: number;
  published_at?: string;
  created_at: string;
  updated_at: string;
  media?: ListingMedia[];
}

export interface ContentPost {
  id: number;
  user_id: number;
  title?: string;
  content: string;
  media_urls?: string[];
  social_platform?: string;
  status: string;
  scheduled_at?: string;
  published_at?: string;
  views: number;
  likes: number;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  price: number;
  unit?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

