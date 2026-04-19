export interface Product {
  id: string;
  user_id: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  in_stock: boolean;
  stock_quantity?: number | null;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProductData {
  name: string;
  description?: string;
  price: number;
  category?: string;
  in_stock: boolean;
  stock_quantity?: number | null;
  image_url?: string;
  base64?: string;
  user_id: string;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  in_stock?: boolean;
  stock_quantity?: number | null;
  image_url?: string;
  base64?: string;
}
