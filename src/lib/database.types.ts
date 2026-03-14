export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      warehouses: {
        Row: {
          id: string
          name: string
          code: string
          address: string
          is_active: boolean
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          code: string
          address?: string
          is_active?: boolean
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          code?: string
          address?: string
          is_active?: boolean
          created_at?: string
          created_by?: string | null
        }
      }
      product_categories: {
        Row: {
          id: string
          name: string
          code: string
          description: string
          parent_id: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          code: string
          description?: string
          parent_id?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          code?: string
          description?: string
          parent_id?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      products: {
        Row: {
          id: string
          name: string
          sku: string
          description: string
          category_id: string | null
          unit_of_measure: string
          min_stock_level: number
          is_active: boolean
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          name: string
          sku: string
          description?: string
          category_id?: string | null
          unit_of_measure?: string
          min_stock_level?: number
          is_active?: boolean
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          sku?: string
          description?: string
          category_id?: string | null
          unit_of_measure?: string
          min_stock_level?: number
          is_active?: boolean
          created_at?: string
          created_by?: string | null
        }
      }
      stock_locations: {
        Row: {
          id: string
          product_id: string
          warehouse_id: string
          quantity: number
          reserved_quantity: number
          last_updated: string
        }
        Insert: {
          id?: string
          product_id: string
          warehouse_id: string
          quantity?: number
          reserved_quantity?: number
          last_updated?: string
        }
        Update: {
          id?: string
          product_id?: string
          warehouse_id?: string
          quantity?: number
          reserved_quantity?: number
          last_updated?: string
        }
      }
      receipts: {
        Row: {
          id: string
          receipt_number: string
          warehouse_id: string
          supplier_name: string
          status: 'draft' | 'waiting' | 'ready' | 'done' | 'canceled'
          receipt_date: string
          notes: string
          created_at: string
          created_by: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          id?: string
          receipt_number: string
          warehouse_id: string
          supplier_name?: string
          status?: 'draft' | 'waiting' | 'ready' | 'done' | 'canceled'
          receipt_date?: string
          notes?: string
          created_at?: string
          created_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          id?: string
          receipt_number?: string
          warehouse_id?: string
          supplier_name?: string
          status?: 'draft' | 'waiting' | 'ready' | 'done' | 'canceled'
          receipt_date?: string
          notes?: string
          created_at?: string
          created_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
      }
      receipt_lines: {
        Row: {
          id: string
          receipt_id: string
          product_id: string
          quantity: number
          unit_of_measure: string
          notes: string
        }
        Insert: {
          id?: string
          receipt_id: string
          product_id: string
          quantity: number
          unit_of_measure?: string
          notes?: string
        }
        Update: {
          id?: string
          receipt_id?: string
          product_id?: string
          quantity?: number
          unit_of_measure?: string
          notes?: string
        }
      }
      deliveries: {
        Row: {
          id: string
          delivery_number: string
          warehouse_id: string
          customer_name: string
          status: 'draft' | 'waiting' | 'ready' | 'done' | 'canceled'
          delivery_date: string
          notes: string
          created_at: string
          created_by: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          id?: string
          delivery_number: string
          warehouse_id: string
          customer_name?: string
          status?: 'draft' | 'waiting' | 'ready' | 'done' | 'canceled'
          delivery_date?: string
          notes?: string
          created_at?: string
          created_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          id?: string
          delivery_number?: string
          warehouse_id?: string
          customer_name?: string
          status?: 'draft' | 'waiting' | 'ready' | 'done' | 'canceled'
          delivery_date?: string
          notes?: string
          created_at?: string
          created_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
      }
      delivery_lines: {
        Row: {
          id: string
          delivery_id: string
          product_id: string
          quantity: number
          unit_of_measure: string
          notes: string
        }
        Insert: {
          id?: string
          delivery_id: string
          product_id: string
          quantity: number
          unit_of_measure?: string
          notes?: string
        }
        Update: {
          id?: string
          delivery_id?: string
          product_id?: string
          quantity?: number
          unit_of_measure?: string
          notes?: string
        }
      }
      transfers: {
        Row: {
          id: string
          transfer_number: string
          from_warehouse_id: string
          to_warehouse_id: string
          status: 'draft' | 'waiting' | 'ready' | 'done' | 'canceled'
          transfer_date: string
          notes: string
          created_at: string
          created_by: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          id?: string
          transfer_number: string
          from_warehouse_id: string
          to_warehouse_id: string
          status?: 'draft' | 'waiting' | 'ready' | 'done' | 'canceled'
          transfer_date?: string
          notes?: string
          created_at?: string
          created_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          id?: string
          transfer_number?: string
          from_warehouse_id?: string
          to_warehouse_id?: string
          status?: 'draft' | 'waiting' | 'ready' | 'done' | 'canceled'
          transfer_date?: string
          notes?: string
          created_at?: string
          created_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
      }
      transfer_lines: {
        Row: {
          id: string
          transfer_id: string
          product_id: string
          quantity: number
          unit_of_measure: string
          notes: string
        }
        Insert: {
          id?: string
          transfer_id: string
          product_id: string
          quantity: number
          unit_of_measure?: string
          notes?: string
        }
        Update: {
          id?: string
          transfer_id?: string
          product_id?: string
          quantity?: number
          unit_of_measure?: string
          notes?: string
        }
      }
      adjustments: {
        Row: {
          id: string
          adjustment_number: string
          warehouse_id: string
          reason: 'damage' | 'theft' | 'count_correction' | 'expired' | 'other'
          status: 'draft' | 'done' | 'canceled'
          adjustment_date: string
          notes: string
          created_at: string
          created_by: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          id?: string
          adjustment_number: string
          warehouse_id: string
          reason?: 'damage' | 'theft' | 'count_correction' | 'expired' | 'other'
          status?: 'draft' | 'done' | 'canceled'
          adjustment_date?: string
          notes?: string
          created_at?: string
          created_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          id?: string
          adjustment_number?: string
          warehouse_id?: string
          reason?: 'damage' | 'theft' | 'count_correction' | 'expired' | 'other'
          status?: 'draft' | 'done' | 'canceled'
          adjustment_date?: string
          notes?: string
          created_at?: string
          created_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
      }
      adjustment_lines: {
        Row: {
          id: string
          adjustment_id: string
          product_id: string
          counted_quantity: number
          system_quantity: number
          difference: number
          unit_of_measure: string
          notes: string
        }
        Insert: {
          id?: string
          adjustment_id: string
          product_id: string
          counted_quantity: number
          system_quantity: number
          difference: number
          unit_of_measure?: string
          notes?: string
        }
        Update: {
          id?: string
          adjustment_id?: string
          product_id?: string
          counted_quantity?: number
          system_quantity?: number
          difference?: number
          unit_of_measure?: string
          notes?: string
        }
      }
      stock_moves: {
        Row: {
          id: string
          product_id: string
          warehouse_id: string
          quantity: number
          move_type: 'receipt' | 'delivery' | 'transfer_in' | 'transfer_out' | 'adjustment'
          reference_type: 'receipts' | 'deliveries' | 'transfers' | 'adjustments'
          reference_id: string
          reference_number: string
          move_date: string
          created_by: string | null
          notes: string
        }
        Insert: {
          id?: string
          product_id: string
          warehouse_id: string
          quantity: number
          move_type: 'receipt' | 'delivery' | 'transfer_in' | 'transfer_out' | 'adjustment'
          reference_type: 'receipts' | 'deliveries' | 'transfers' | 'adjustments'
          reference_id: string
          reference_number: string
          move_date?: string
          created_by?: string | null
          notes?: string
        }
        Update: {
          id?: string
          product_id?: string
          warehouse_id?: string
          quantity?: number
          move_type?: 'receipt' | 'delivery' | 'transfer_in' | 'transfer_out' | 'adjustment'
          reference_type?: 'receipts' | 'deliveries' | 'transfers' | 'adjustments'
          reference_id?: string
          reference_number?: string
          move_date?: string
          created_by?: string | null
          notes?: string
        }
      }
    }
    Functions: {
      generate_document_number: {
        Args: {
          prefix: string
        }
        Returns: string
      }
      update_stock_location: {
        Args: {
          p_product_id: string
          p_warehouse_id: string
          p_quantity: number
        }
        Returns: void
      }
    }
  }
}
