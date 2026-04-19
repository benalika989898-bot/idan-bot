import { supabase } from '@/lib/supabase';
import { Product, CreateProductData, UpdateProductData } from '@/types/products';
import { uploadImage, deleteImage } from '@/services/imageUpload';
import { decode } from 'base64-arraybuffer';

export interface ProductsResponse {
  data: Product[] | null;
  error: any;
}

export interface ProductResponse {
  data: Product | null;
  error: any;
}

// Extract path from Supabase storage URL
const extractPathFromUrl = (url: string): string | null => {
  try {
    const urlParts = url.split('/storage/v1/object/public/products/');
    return urlParts[1] || null;
  } catch {
    return null;
  }
};

// Get all products for the authenticated user
export const getProducts = async (): Promise<ProductsResponse> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    return { data, error };
  } catch (error) {
    console.error('Error fetching products:', error);
    return { data: null, error };
  }
};

// Get single product by ID
export const getProduct = async (id: string): Promise<ProductResponse> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error fetching product:', error);
    return { data: null, error };
  }
};

// Create new product
export const createProduct = async (productData: CreateProductData): Promise<ProductResponse> => {
  try {
    let imageUrl = productData.image_url;

    // Upload image if provided and it has base64 data
    if (imageUrl && productData.base64) {
      try {
        const fileName = `product-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const result = await uploadImage('products' as any, {
          base64: productData.base64,
          uri: imageUrl,
        }, fileName);
        imageUrl = result.url;
      } catch (error) {
        console.error('Error uploading product image:', error);
        imageUrl = undefined;
      }
    }

    // Create product in database
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: productData.name,
        description: productData.description,
        price: productData.price,
        category: productData.category,
        in_stock: productData.in_stock,
        stock_quantity: productData.stock_quantity ?? null,
        image_url: imageUrl,
        user_id: productData.user_id,
      })
      .select()
      .single();


    return { data, error };
  } catch (error) {
    console.error('Error creating product:', error);
    return { data: null, error };
  }
};

// Update product
export const updateProduct = async (id: string, productData: UpdateProductData): Promise<ProductResponse> => {
  try {
    // Get current product to check for existing image
    const currentProduct = await getProduct(id);
    let imageUrl = productData.image_url;

    // Handle image update
    if (imageUrl && productData.base64) {
      try {
        // Upload new image
        const fileName = `product-${id}-${Date.now()}.jpg`;
        const result = await uploadImage('products' as any, {
          base64: productData.base64,
          uri: imageUrl,
        }, fileName);
        
        // Delete old image if it exists
        if (currentProduct.data?.image_url) {
          const oldPath = extractPathFromUrl(currentProduct.data.image_url);
          if (oldPath) {
            await deleteImage('products' as any, oldPath);
          }
        }
        
        imageUrl = result.url;
      } catch (error) {
        console.error('Error uploading product image:', error);
        // Keep existing image if upload fails
        imageUrl = currentProduct.data?.image_url;
      }
    } else if (imageUrl === '') {
      // User wants to remove image
      if (currentProduct.data?.image_url) {
        const oldPath = extractPathFromUrl(currentProduct.data.image_url);
        if (oldPath) {
          await deleteImage('products' as any, oldPath);
        }
      }
      imageUrl = null;
    }

    // Update product in database
    const updatePayload: Record<string, any> = {
      name: productData.name,
      description: productData.description,
      price: productData.price,
      category: productData.category,
      in_stock: productData.in_stock,
      image_url: imageUrl,
      updated_at: new Date().toISOString(),
    };

    if (productData.stock_quantity !== undefined) {
      updatePayload.stock_quantity = productData.stock_quantity;
    }

    const { data, error } = await supabase
      .from('products')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    console.error('Error updating product:', error);
    return { data: null, error };
  }
};

export const decrementProductStock = async (
  items: { productId: string; quantity: number }[]
): Promise<{ error: any }> => {
  try {
    const results = await Promise.all(
      items.map(async (item) => {
        const { data, error } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.productId)
          .single();

        if (error) return { error };
        if (data?.stock_quantity === null || typeof data?.stock_quantity !== 'number') {
          return { error: null };
        }

        const nextQuantity = Math.max(data.stock_quantity - item.quantity, 0);

        const { error: updateError } = await supabase
          .from('products')
          .update({
            stock_quantity: nextQuantity,
            in_stock: nextQuantity > 0,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.productId);

        return { error: updateError };
      })
    );

    const firstError = results.find((result) => result.error);
    return { error: firstError?.error || null };
  } catch (error) {
    console.error('Error decrementing product stock:', error);
    return { error };
  }
};

// Delete product
export const deleteProduct = async (id: string): Promise<{ error: any }> => {
  try {
    // Get product to check for image
    const currentProduct = await getProduct(id);
    
    // Delete image from storage if it exists
    if (currentProduct.data?.image_url) {
      const imagePath = extractPathFromUrl(currentProduct.data.image_url);
      if (imagePath) {
        await deleteImage('products' as any, imagePath);
      }
    }

    // Delete product from database
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    return { error };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { error };
  }
};
