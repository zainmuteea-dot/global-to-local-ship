export interface ServicePrice {
  id: string
  created_at: string
  service_name: string
  price: number
  unit: string | null
  notes: string | null
}
