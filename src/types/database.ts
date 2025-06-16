
export interface Product {
  id: string;
  name: string;
  cost_price: number;
  sale_price: number;
  quantity: number;
  category: string;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  customer?: Customer;
  product?: Product;
}

export interface AuthorizedUser {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
}
