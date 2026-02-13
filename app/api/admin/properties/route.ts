import admin from 'firebase-admin'
import fs from 'fs'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

// Initialize Firebase Admin SDK (service account must be provided either via
// env `FIREBASE_SERVICE_ACCOUNT_KEY` (JSON string) or file at `scripts/serviceAccountKey.json`)
if (!admin.apps.length) {
  let serviceAccount: any = undefined
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY')
    }
  } else {
    const keyPath = path.join(process.cwd(), 'scripts', 'serviceAccountKey.json')
    if (fs.existsSync(keyPath)) {
      try {
        serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'))
      } catch (e) {
        console.error('Failed to read serviceAccountKey.json', e)
      }
    }
  }

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    })
  } else {
    console.warn('Firebase Admin not initialized. Provide service account key.')
  }
}

function detectContentType(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (!ext) return 'application/octet-stream'
  if (['jpg', 'jpeg'].includes(ext)) return 'image/jpeg'
  if (['png'].includes(ext)) return 'image/png'
  if (['webp'].includes(ext)) return 'image/webp'
  return 'application/octet-stream'
}

export async function POST(request: NextRequest) {
  try {
    if (!admin.apps.length) {
      return NextResponse.json({ message: 'Server not configured with service account' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null
    if (!token) return NextResponse.json({ message: 'Missing auth token' }, { status: 401 })

    let decoded: any = null
    let uid: string | null = null
    
    try {
      // Try proper verification first
      decoded = await admin.auth().verifyIdToken(token)
      uid = decoded.uid
    } catch (verifyErr: any) {
      console.error('Token verification error:', verifyErr?.message)
      
      // Fallback for development/offline: decode token manually (extracts user info but doesn't verify signature)
      if (process.env.NODE_ENV === 'development') {
        try {
          const parts = token.split('.')
          if (parts.length !== 3) throw new Error('Invalid token format')
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'))
          decoded = payload
          uid = payload.sub || payload.uid
          console.warn('⚠️ Using development mode token decode (insecure - please ensure network connectivity in production)')
        } catch (e) {
          console.error('Failed to decode token manually', e)
          return NextResponse.json({ message: 'Token verification failed. Make sure you have internet access for Firebase to verify your token.' }, { status: 401 })
        }
      } else {
        return NextResponse.json({ message: 'Token verification failed: ' + verifyErr?.message }, { status: 401 })
      }
    }

    // Check admin status: first try custom claims, then check Firestore admins collection
    let isAdmin = decoded?.admin === true
    
    if (!isAdmin && uid) {
      // Fallback: check if user is in admins collection in Firestore
      try {
        const firestore = admin.firestore()
        const adminDoc = await firestore.collection('admins').doc(uid).get()
        isAdmin = adminDoc.exists && adminDoc.data()?.isAdmin === true
      } catch (err) {
        console.error('Error checking admin status in Firestore:', err)
        // Continue without Firestore check
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ message: 'Admin privileges required' }, { status: 403 })
    }

    const body = await request.json()
    const property = body.property ?? {}
    const imagesBase64 = body.imagesBase64 || []

    const firestore = admin.firestore()
    const bucket = admin.storage().bucket()

    // create document first to get an id
    const docRef = await firestore.collection('properties').add({ ...property, createdAt: admin.firestore.FieldValue.serverTimestamp() })
    const id = docRef.id

    const imageUrls: string[] = []
    
    // Upload all images
    for (let idx = 0; idx < imagesBase64.length; idx++) {
      const { data: imageBase64, name: originalName } = imagesBase64[idx]
      if (imageBase64) {
        try {
          const buffer = Buffer.from(imageBase64, 'base64')
          const ext = originalName?.split('.').pop() || 'jpg'
          const imageName = `image-${idx + 1}.${ext}`
          const remotePath = `properties/${id}/${imageName}`
          const file = bucket.file(remotePath)
          await file.save(buffer, { resumable: false, metadata: { contentType: detectContentType(imageName) } })
          imageUrls.push(remotePath)
        } catch (err) {
          console.error(`Failed to upload image ${idx + 1}:`, err)
        }
      }
    }

    // Update document with image URLs
    const updateData: any = { imageUrls }
    // Keep first image as imageUrl for backward compatibility
    if (imageUrls.length > 0) {
      updateData.imageUrl = imageUrls[0]
    }
    await docRef.update(updateData)

    const docSnap = await docRef.get()
    return NextResponse.json({ ok: true, id, imageUrls, count: imageUrls.length, data: docSnap.data() }, { status: 201 })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ message: err?.message || 'Error' }, { status: 500 })
  }
}
