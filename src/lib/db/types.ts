/**
 * Hand-maintained types mirroring supabase/migrations/0001_init.sql.
 * Kept in sync by hand for this slice; can be replaced by
 * `supabase gen types typescript` once the CLI is linked.
 */

export type RequestStatus =
  | "open"
  | "sourcing"
  | "candidate_sent"
  | "approved"
  | "purchased"
  | "received"
  | "shipped"
  | "released"
  | "refunded"
  | "cancelled";

export type MinCondition = "new" | "like_new" | "good" | "acceptable" | "any";
export type RushTier = "standard" | "priority" | "express";
export type CandidateStatus = "proposed" | "approved" | "rejected";
export type ReceiptStatus = "pending" | "accepted" | "rejected";
export type PaymentStatus =
  | "pending"
  | "held"
  | "released"
  | "refunded"
  | "failed";
export type MessageSender = "customer" | "team";

export type Profile = {
  id: string;
  email: string | null;
  shipping_country: string | null;
  currency_pref: string;
  avatar_url: string | null;
  is_staff: boolean;
  notify_action_needed: boolean;
  notify_messages: boolean;
  notify_shipped: boolean;
  created_at: string;
}

export type Address = {
  id: string;
  user_id: string;
  recipient_name: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postal_code: string;
  country: string;
  phone: string | null;
  is_default: boolean;
  created_at: string;
}

/** Frozen address copy stored on a request at deposit time. */
export type AddressSnapshot = {
  recipient_name: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postal_code: string;
  country: string;
  phone: string | null;
}

export type Request = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  reference_image_url: string | null;
  reference_url: string | null;
  min_condition: MinCondition;
  must_haves: string[];
  nice_to_haves: string[];
  budget_cap_jpy: number | null;
  rush_tier: RushTier;
  status: RequestStatus;
  deadline_at: string | null;
  in_stock: boolean;
  shipping_address: AddressSnapshot | null;
  est_value_jpy: number | null;
  est_value_low_jpy: number | null;
  est_value_high_jpy: number | null;
  est_confidence: number | null;
  est_needs_review: boolean;
  est_category: string | null;
  est_sources: string[];
  est_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export type Candidate = {
  id: string;
  request_id: string;
  listing_url: string | null;
  listing_images: string[];
  price_jpy: number | null;
  notes: string | null;
  status: CandidateStatus;
  created_at: string;
}

export type Order = {
  id: string;
  request_id: string;
  candidate_id: string | null;
  item_cost_jpy: number;
  finder_fee_jpy: number;
  shipping_jpy: number;
  tax_jpy: number;
  total_jpy: number;
  received_image_urls: string[];
  receipt_status: ReceiptStatus;
  created_at: string;
}

export type Shipment = {
  id: string;
  order_id: string;
  carrier: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  created_at: string;
}

export type Message = {
  id: string;
  request_id: string;
  sender: MessageSender;
  body: string;
  created_at: string;
}

export type Payment = {
  id: string;
  request_id: string;
  stripe_payment_intent_id: string | null;
  amount_jpy: number;
  status: PaymentStatus;
  captured_jpy: number | null;
  refunded_jpy: number | null;
  created_at: string;
}

/** Generic table shape for the typed Supabase client. */
type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, Partial<Profile> & { id: string }>;
      addresses: Table<
        Address,
        Omit<Address, "id" | "created_at"> & { id?: string }
      >;
      requests: Table<
        Request,
        Omit<
          Request,
          | "id"
          | "created_at"
          | "updated_at"
          | "status"
          | "in_stock"
          | "shipping_address"
          | "est_value_jpy"
          | "est_value_low_jpy"
          | "est_value_high_jpy"
          | "est_confidence"
          | "est_needs_review"
          | "est_category"
          | "est_sources"
          | "est_updated_at"
        > & {
          id?: string;
          status?: RequestStatus;
          in_stock?: boolean;
          shipping_address?: AddressSnapshot | null;
          est_value_jpy?: number | null;
          est_value_low_jpy?: number | null;
          est_value_high_jpy?: number | null;
          est_confidence?: number | null;
          est_needs_review?: boolean;
          est_category?: string | null;
          est_sources?: string[];
          est_updated_at?: string | null;
        }
      >;
      candidates: Table<Candidate, Omit<Candidate, "id" | "created_at">>;
      orders: Table<Order, Omit<Order, "id" | "created_at" | "total_jpy">>;
      shipments: Table<Shipment, Omit<Shipment, "id" | "created_at">>;
      messages: Table<Message, Omit<Message, "id" | "created_at">>;
      payments: Table<
        Payment,
        Omit<Payment, "id" | "created_at" | "captured_jpy" | "refunded_jpy"> & {
          captured_jpy?: number | null;
          refunded_jpy?: number | null;
        }
      >;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      request_status: RequestStatus;
      min_condition: MinCondition;
      rush_tier: RushTier;
      candidate_status: CandidateStatus;
      receipt_status: ReceiptStatus;
      payment_status: PaymentStatus;
      message_sender: MessageSender;
    };
    CompositeTypes: { [_ in never]: never };
  };
};
