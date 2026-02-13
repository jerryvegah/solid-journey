import { Booking, Property } from '@/types'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { getDownloadURL, ref as storageRef } from 'firebase/storage'
import { db, storage } from './firebase'

const MOCK_PROPERTIES: Property[] = [
  { id: '1', title: 'Charming 3BR House', description: 'Spacious home with garden.', price: 350000, imageUrl: '/placeholder-1.jpg', status: 'Newly Listed', bedrooms: 3, bathrooms: 2, sqft: 1800 },
  { id: '2', title: 'City Apartment', description: 'Central 2BR apartment.', price: 220000, imageUrl: '/placeholder-2.jpg', status: 'For Sale', bedrooms: 2, bathrooms: 1, sqft: 900 },
]

export async function getProperties(): Promise<Property[]> {
  try {
    if (!db) throw new Error('No db')
    const col = collection(db, 'properties')
    const snap = await getDocs(col)
    const items: Property[] = []
    snap.forEach(d => items.push({ id: d.id, ...(d.data() as any) }))
    if (items.length === 0) return MOCK_PROPERTIES

    // Ensure all items have IDs and filter out any without
    const itemsWithIds = items.filter(item => item.id && typeof item.id === 'string')

    // Convert storage paths to download URLs when necessary
    const resolved = await Promise.all(itemsWithIds.map(async (item) => {
      // Process single imageUrl
      try {
        const url = item.imageUrl
        if (url && !/^https?:\/\//i.test(url) && storage) {
          const sRef = storageRef(storage, url)
          item.imageUrl = await getDownloadURL(sRef)
        }
      } catch (err) {
        console.warn('Failed to resolve storage image URL for', item.id, err)
      }

      // Process imageUrls array
      if (item.imageUrls && Array.isArray(item.imageUrls)) {
        try {
          item.imageUrls = await Promise.all(
            item.imageUrls.map(async (url) => {
              if (url && !/^https?:\/\//i.test(url) && storage) {
                try {
                  const sRef = storageRef(storage, url)
                  return await getDownloadURL(sRef)
                } catch (err) {
                  console.warn('Failed to resolve image URL:', url, err)
                  return url
                }
              }
              return url
            })
          )
        } catch (err) {
          console.warn('Failed to resolve imageUrls for', item.id, err)
        }
      }

      return item
    }))

    return resolved.length === 0 ? MOCK_PROPERTIES : resolved
  } catch (e) {
    return MOCK_PROPERTIES
  }
}

export async function getProperty(id: string): Promise<Property | null> {
  try {
    if (!db) throw new Error('No db')
    if (!id) {
      console.error('getProperty called with empty ID')
      return null
    }
    
    const ref = doc(db, 'properties', id)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      console.warn('Property not found:', id)
      return null
    }
    
    const item: Property = { id: snap.id, ...(snap.data() as any) }
    
    // Ensure ID is set
    if (!item.id) {
      item.id = id
    }
    
    // Process single imageUrl
    try {
      const url = item.imageUrl
      if (url && !/^https?:\/\//i.test(url) && storage) {
        const sRef = storageRef(storage, url)
        item.imageUrl = await getDownloadURL(sRef)
      }
    } catch (err) {
      console.warn('Failed to resolve storage image URL for', item.id, err)
    }

    // Process imageUrls array
    if (item.imageUrls && Array.isArray(item.imageUrls)) {
      try {
        item.imageUrls = await Promise.all(
          item.imageUrls.map(async (url) => {
            if (url && !/^https?:\/\//i.test(url) && storage) {
              try {
                const sRef = storageRef(storage, url)
                return await getDownloadURL(sRef)
              } catch (err) {
                console.warn('Failed to resolve image URL:', url, err)
                return url
              }
            }
            return url
          })
        )
      } catch (err) {
        console.warn('Failed to resolve imageUrls for', item.id, err)
      }
    }

    return item
  } catch (e) {
    console.error('getProperty error:', e)
    const found = MOCK_PROPERTIES.find(p => p.id === id) || null
    return found
  }
}

export async function getBookings(email?: string): Promise<Booking[]> {
  try {
    if (!db) throw new Error('No db')
    const col = collection(db, 'bookings')
    let snap
    if (email) {
      const q = query(col, where('email', '==', email))
      snap = await getDocs(q)
    } else {
      snap = await getDocs(col)
    }
    const items: Booking[] = []
    snap.forEach(d => items.push({ id: d.id, ...(d.data() as any) }))
    return items
  } catch (e) {
    return []
  }
}
