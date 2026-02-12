export type UserRole = 'student' | 'vendor';
export type OrderStatus = 'pending' | 'accepted' | 'ready' | 'completed' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Canteen {
  id: string;
  vendor_id: string;
  name: string;
  location: string;
  image_url: string | null;
  is_open: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  canteen_id: string;
  name: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  canteen_id: string;
  category: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  prep_time?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  canteen_id: string;
  total: number;
  status: OrderStatus;
  pickup_code: string;
  payment_status?: string;
  payment_id?: string | null;
  payment_session_id?: string | null;
  estimated_ready_time?: string | null;
  qr_token?: string | null;
  qr_used?: boolean;
  order_no?: number | null;
  created_at: string;
  updated_at: string;
  canteen?: Canteen;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
}

export type SizeVariant = 'small' | 'medium' | 'large';

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  size?: SizeVariant;
  priceOverride?: number; // Used when size affects price
}
