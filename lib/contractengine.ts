// ============================================================
// lib/contractFirebase.ts
// Firebase service layer for the contract module
// Reads from your existing /users and /farms collections
// Writes to new /contracts collection
// ============================================================

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'   // your existing firebase init
import {
  FarmerProfile,
  FarmPlot,
  FarmContract,
  ContractStatus,
} from '@/types/contract'
import { generateContractNumber } from './contractEngine'

// ─── READ: Farmer profile from /users/{uid} ───────────────────────────────────
export async function getFarmerProfile(uid: string): Promise<FarmerProfile | null> {
  try {
    const ref = doc(db, 'users', uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null

    const data = snap.data()
    return {
      uid: snap.id,
      name: data.name ?? '',
      email: data.email ?? '',
      phone: data.phone ?? '',
      country: data.country ?? 'Cameroon',
      currency: data.currency ?? 'XAF',
      preferredLanguage: data.preferredLanguage ?? 'en',
      role: 'farmer',
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
    } as FarmerProfile
  } catch (err) {
    console.error('getFarmerProfile error:', err)
    return null
  }
}

// ─── READ: Farm/plot data ─────────────────────────────────────────────────────
// Adjust the collection name below to match your actual Firestore collection.
// From your data it looks like it could be 'farms', 'fields', or 'plots'.
// Change 'farms' below to whatever collection your farm documents are in.
export async function getFarmPlot(farmId: string): Promise<FarmPlot | null> {
  try {
    // Try 'farms' first — update to match your collection name
    const ref = doc(db, 'farms', farmId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null

    const data = snap.data()
    return {
      id: snap.id,
      userId: data.userId ?? data.uid ?? '',
      area_hectares: data.area_hectares ?? 0,
      area_acres: data.area_acres ?? 0,
      cropType: data.cropType ?? 'maize',
      fieldLocation: data.fieldLocation ?? '',
      datePlanted: data.datePlanted ?? new Date().toISOString().split('T')[0],
      fieldCoordinates: data.fieldCoordinates ?? '[]',
      latitude: data.latitude ?? 0,
      longitude: data.longitude ?? 0,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      risk_score: data.results?.risk_ml?.risk_assessment?.MAIZE?.risk_score,
      risk_level: data.results?.risk_ml?.risk_assessment?.MAIZE?.risk_level,
    } as FarmPlot
  } catch (err) {
    console.error('getFarmPlot error:', err)
    return null
  }
}

// ─── READ: Get all farms for a farmer ────────────────────────────────────────
export async function getFarmerFarms(farmerId: string): Promise<FarmPlot[]> {
  try {
    const q = query(
      collection(db, 'farms'),
      where('userId', '==', farmerId)
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => {
      const data = d.data()
      return {
        id: d.id,
        userId: data.userId ?? '',
        area_hectares: data.area_hectares ?? 0,
        area_acres: data.area_acres ?? 0,
        cropType: data.cropType ?? 'maize',
        fieldLocation: data.fieldLocation ?? '',
        datePlanted: data.datePlanted ?? '',
        fieldCoordinates: data.fieldCoordinates ?? '[]',
        latitude: data.latitude ?? 0,
        longitude: data.longitude ?? 0,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
      } as FarmPlot
    })
  } catch (err) {
    console.error('getFarmerFarms error:', err)
    return []
  }
}

// ─── READ: Get count of existing contracts (for contract number generation) ──
export async function getContractCount(countryCode: string): Promise<number> {
  try {
    const q = query(
      collection(db, 'contracts'),
      where('zone.countryCode', '==', countryCode)
    )
    const snap = await getDocs(q)
    return snap.size
  } catch {
    return 0
  }
}

// ─── WRITE: Save new contract to /contracts/{contractId} ─────────────────────
export async function saveContract(
  contract: Omit<FarmContract, 'contractId' | 'contractNumber' | 'createdAt' | 'updatedAt'>,
  operatorUid: string
): Promise<string> {
  // Generate contract number
  const count = await getContractCount(contract.zone.countryCode)
  const contractNumber = generateContractNumber(contract.zone.countryCode, count)

  // Use auto-generated Firestore ID
  const contractRef = doc(collection(db, 'contracts'))
  const contractId = contractRef.id

  const fullContract: FarmContract = {
    ...contract,
    contractId,
    contractNumber,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: operatorUid,
    signedByFarmer: false,
    status: 'draft',
    repaymentStatus: 'pending',
  }

  // Save to Firestore (convert Dates to Timestamps)
  await setDoc(contractRef, {
    ...fullContract,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return contractId
}

// ─── WRITE: Update contract status ───────────────────────────────────────────
export async function updateContractStatus(
  contractId: string,
  status: ContractStatus,
  notes?: string
): Promise<void> {
  const ref = doc(db, 'contracts', contractId)
  await updateDoc(ref, {
    status,
    notes: notes ?? '',
    updatedAt: serverTimestamp(),
  })
}

// ─── WRITE: Mark contract as farmer-signed ───────────────────────────────────
export async function markContractSigned(contractId: string): Promise<void> {
  const ref = doc(db, 'contracts', contractId)
  await updateDoc(ref, {
    signedByFarmer: true,
    signedAt: serverTimestamp(),
    status: 'active',
    updatedAt: serverTimestamp(),
  })
}

// ─── READ: Get all contracts for a farmer ────────────────────────────────────
export async function getFarmerContracts(farmerId: string): Promise<FarmContract[]> {
  try {
    const q = query(
      collection(db, 'contracts'),
      where('farmerId', '==', farmerId)
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => {
      const data = d.data()
      return {
        ...data,
        contractId: d.id,
        createdAt: (data.createdAt as Timestamp)?.toDate?.() ?? new Date(),
        updatedAt: (data.updatedAt as Timestamp)?.toDate?.() ?? new Date(),
      } as FarmContract
    })
  } catch (err) {
    console.error('getFarmerContracts error:', err)
    return []
  }
}