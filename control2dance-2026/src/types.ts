
export type Category = 'Guitars' | 'Keyboards' | 'Drums' | 'Studio' | 'Vinyl';
export type UserRole = 'USER' | 'ADMIN';

export interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  description: string;
  image: string;
  category: Category;
  rating: number;
  stock: number;
  tracks: string[];
  audioUrls: string[];
  youtubeUrls?: string[];
  // Discogs Metadata
  year?: string;
  label?: string;
  country?: string;
  format?: string;
  styles?: string[];
  genre?: string;
  catalogNumber?: string;
  released?: string;
  companies?: { name: string; entity_type_name: string }[];
  credits?: { name: string; role: string }[];
  notes?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Order {
  id: string;
  date: number;
  items: CartItem[];
  total: number;
  status: 'Completado' | 'Procesando';
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  orders: Order[];
  favorites: string[]; // IDs de productos
}
