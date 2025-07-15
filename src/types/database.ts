
export interface Product {
  id: string;
  name: string;
  cost_price: number;
  sale_price: number;
  quantity: number;
  category_id: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  is_order_product: boolean;
  categories?: {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
  };
}

export interface Customer {
  id: string;
  name: string;
  whatsapp?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  customer_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  sale_date: string;
  seller?: string;
  created_at: string;
  customers?: {
    id: string;
    name: string;
    whatsapp?: string;
    email?: string;
    created_at: string;
    updated_at: string;
  };
  products?: {
    id: string;
    name: string;
    cost_price: number;
    sale_price: number;
    quantity: number;
    category_id: string;
    image_url?: string;
    created_at: string;
    updated_at: string;
    categories?: {
      id: string;
      name: string;
      created_at: string;
      updated_at: string;
    };
  };
}

export interface AuthorizedUser {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  customer_name: string;
  notes?: string;
  total_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  cost_price: number;
  quantity: number;
  subtotal: number;
  created_at: string;
}

export interface AuditLog {
  id: string;
  table_name: string;
  operation: string;
  record_id: string;
  old_values?: any;
  new_values?: any;
  user_name: string;
  created_at: string;
}

export interface Reinvestment {
  id: string;
  amount: number;
  date: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductOrderRequest {
  id: string;
  product_id: string;
  customer_name: string;
  requested_quantity: number;
  cost_price?: number;
  sale_price?: number;
  notes?: string;
  status: string;
  created_at: string;
  updated_at: string;
  products?: {
    id: string;
    name: string;
    cost_price: number;
    sale_price: number;
    quantity: number;
    category_id: string;
    image_url?: string;
    created_at: string;
    updated_at: string;
    categories?: {
      id: string;
      name: string;
      created_at: string;
      updated_at: string;
    };
  };
}
