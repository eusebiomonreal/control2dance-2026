export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          catalog_number: string;
          name: string;
          brand: string | null;
          slug: string;
          description: string | null;
          price: number;
          year: string | null;
          label: string | null;
          genre: string | null;
          styles: string[] | null;
          format: string | null;
          country: string | null;
          cover_image: string | null;
          audio_previews: AudioPreview[] | null;
          master_file_path: string | null;
          master_file_size: number | null;
          meta_title: string | null;
          meta_description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      orders: {
        Row: {
          id: string;
          user_id: string | null;
          stripe_session_id: string | null;
          stripe_payment_intent: string | null;
          stripe_customer_id: string | null;
          subtotal: number;
          tax: number;
          total: number;
          currency: string;
          status: OrderStatus;
          payment_status: string | null;
          customer_email: string;
          customer_name: string | null;
          created_at: string;
          paid_at: string | null;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          product_catalog_number: string | null;
          price: number;
          quantity: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['order_items']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>;
      };
      download_tokens: {
        Row: {
          id: string;
          order_item_id: string;
          user_id: string | null;
          product_id: string | null;
          token: string;
          max_downloads: number;
          download_count: number;
          expires_at: string;
          is_active: boolean;
          last_download_ip: string | null;
          last_download_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['download_tokens']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['download_tokens']['Insert']>;
      };
      download_logs: {
        Row: {
          id: string;
          download_token_id: string | null;
          user_id: string | null;
          product_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          downloaded_at: string;
        };
        Insert: Omit<Database['public']['Tables']['download_logs']['Row'], 'id' | 'downloaded_at'>;
        Update: Partial<Database['public']['Tables']['download_logs']['Insert']>;
      };
      activity_log: {
        Row: {
          id: string;
          user_id: string;
          action: ActivityAction;
          description: string | null;
          metadata: Record<string, unknown> | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['activity_log']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['activity_log']['Insert']>;
      };
    };
  };
}

export interface AudioPreview {
  url: string;
  track_name: string;
  duration?: number;
}

export interface MasterFile {
  path: string;
  file_name: string;
  file_size: number;
}

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type ActivityAction = 'login' | 'logout' | 'purchase' | 'download' | 'password_change' | 'profile_update';

// Tipos base
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type DownloadToken = Database['public']['Tables']['download_tokens']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type Activity = Database['public']['Tables']['activity_log']['Row'];

// Tipos extendidos para el dashboard
export interface OrderWithItems extends Order {
  items: (OrderItem & {
    product?: Pick<Product, 'id' | 'name' | 'cover_image' | 'catalog_number'>;
    download_token?: DownloadToken;
  })[];
}

export interface DownloadWithProduct extends DownloadToken {
  product?: Product;
  order_item?: OrderItem;
}

export interface ActivityWithMetadata extends Activity {
  metadata: {
    product_name?: string;
    order_id?: string;
    order_total?: number;
    ip_address?: string;
  } | null;
}
