export type Property = {
  id: string
  title: string
  description: string
  price: number
  imageUrl?: string
  imageUrls?: string[]
  status?: string // e.g., "Newly Listed"
  bedrooms?: number
  bathrooms?: number
  sqft?: number
  features?: string[] // e.g., ["Smart Home", "Gated Security"]
  [key: string]: any
}

export type Booking = {
  id: string
  propertyId: string
  name?: string
  email?: string
  date: string
  status?: 'pending' | 'confirmed' | 'cancelled'
  timestamp?: string | number | Date
}

export type ApiResponse<T> = {
  ok?: boolean
  message?: string
  data?: T
}
