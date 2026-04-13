// types/contract.ts
// Type declarations for the contract module used by lib/contractEngine.ts and lib/contractfirebase.ts

export type ContractStatus =
  | 'draft'
  | 'active'
  | 'pending'
  | 'completed'
  | 'cancelled'
  | 'defaulted'

export type RepaymentStatus = 'pending' | 'partial' | 'completed' | 'overdue'

export interface FarmerProfile {
  uid: string
  name: string
  email: string
  phone: string
  country: string
  currency: string
  preferredLanguage: string
  role: 'farmer' | 'admin' | 'operator'
  createdAt: Date
}

export interface FarmPlot {
  id: string
  userId: string
  area_hectares: number
  area_acres: number
  cropType: string
  fieldLocation: string
  datePlanted: string
  fieldCoordinates: string
  latitude: number
  longitude: number
  createdAt: Date
  risk_score?: number
  risk_level?: string
}

export interface FarmZone {
  countryCode: string
  region?: string
  district?: string
}

export interface FarmContract {
  contractId: string
  contractNumber: string
  farmerId: string
  farmerName?: string
  farmerEmail?: string
  farmId?: string
  cropType: string
  area_hectares?: number
  area_acres?: number
  totalInputValue?: number
  totalProduceDue?: number
  produceType?: string
  bagWeightKg?: number
  repaymentTimeline?: string
  zone: FarmZone
  status: ContractStatus
  repaymentStatus: RepaymentStatus
  signedByFarmer: boolean
  signedAt?: Date
  notes?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}
