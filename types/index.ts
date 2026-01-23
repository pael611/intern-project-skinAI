export type Prediction = {
  id: string
  user_id: string | null
  label: string
  confidence: number
  source: 'upload' | 'camera'
  occurred_at: string
  created_at?: string
}

export type AppUser = {
  id: string
  email: string
  role: 'user' | 'admin'
  created_at?: string
  updated_at?: string
}

export type ProductRating = {
  id?: string
  user_id: string
  product_id: number
  brand?: string | null
  product_name?: string | null
  tag?: string | null
  rating: number
  last_prediction_id?: string | null
  created_at?: string
  updated_at?: string
}
