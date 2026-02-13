import { getBookings, getProperties, getProperty } from '@/lib/data'
import { db } from '@/lib/firebase'
import { addDoc, collection } from 'firebase/firestore'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  const bookings = url.searchParams.get('bookings')

  if (id) {
    const prop = await getProperty(id)
    return NextResponse.json(prop ?? null)
  }

  if (bookings) {
    const email = url.searchParams.get('email')
    const b = await getBookings(email ?? undefined)
    return NextResponse.json(b)
  }

  const props = await getProperties()
  return NextResponse.json(props)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (body?.type === 'booking') {
      if (!db) return NextResponse.json({ message: 'No database configured' }, { status: 500 })
      const col = collection(db, 'bookings')
      const docRef = await addDoc(col, {
        propertyId: body.propertyId,
        name: body.name,
        email: body.email,
        date: body.date,
        status: 'pending',
        timestamp: new Date().toISOString(),
      })
      return NextResponse.json({ ok: true, id: docRef.id }, { status: 201 })
    }

    return NextResponse.json({ message: 'Unsupported POST body' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || 'Bad request' }, { status: 400 })
  }
}
