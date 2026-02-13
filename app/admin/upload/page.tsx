"use client"

import { useAuth } from '@/lib/AuthContext'
import React, { useState } from 'react'

export default function AdminUploadPage() {
  const { user, loading, signInWithGoogle, logout } = useAuth()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [bedrooms, setBedrooms] = useState('')
  const [bathrooms, setBathrooms] = useState('')
  const [sqft, setSqft] = useState('')
  const [price, setPrice] = useState('')
  const [files, setFiles] = useState<File[]>([])

  async function handleSignIn() {
    try {
      await signInWithGoogle()
    } catch (err: any) {
      setMessage(err?.message || 'Sign in failed')
    }
  }

  async function handleSignOut() {
    await logout()
  }

  function readFileAsBase64(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        const parts = result.split(',')
        resolve(parts[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (selectedFiles) {
      setFiles(Array.from(selectedFiles).slice(0, 5))
    }
  }

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    if (!user) return setMessage('You must be signed in as an admin')
    if (!title || !price) return setMessage('Title and price required')
    if (files.length === 0) return setMessage('Please select at least one image')
    
    setBusy(true)
    try {
      const token = await user.getIdToken()

      const imagesBase64: Array<{ data: string; name: string }> = []
      for (const file of files) {
        const base64 = await readFileAsBase64(file)
        imagesBase64.push({ data: base64, name: file.name })
      }

      const body = {
        property: {
          title,
          description,
          price: Number(price),
          bedrooms: bedrooms ? Number(bedrooms) : undefined,
          bathrooms: bathrooms ? Number(bathrooms) : undefined,
          sqft: sqft ? Number(sqft) : undefined,
        },
        imagesBase64,
      }

      const res = await fetch('/api/admin/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || 'Upload failed')
      setMessage('✅ Property created: ' + json.id + ' with ' + imagesBase64.length + ' images')
      setTitle('')
      setDescription('')
      setPrice('')
      setBedrooms('')
      setBathrooms('')
      setSqft('')
      setFiles([])
    } catch (err: any) {
      setMessage('❌ ' + (err?.message || 'Error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Admin: Create Property</h1>
        {loading ? (
          <div className="mt-3">Loading...</div>
        ) : !user ? (
          <button onClick={handleSignIn} className="mt-3 px-4 py-2 bg-[#D4AF37] text-[#1C1C1C] font-bold rounded">
            Sign in with Google
          </button>
        ) : (
          <div className="mt-3">
            <div>Signed in: {user.email}</div>
            <button onClick={handleSignOut} className="mt-2 px-4 py-2 bg-gray-300 rounded">Sign out</button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 border rounded-lg">
        <div>
          <label className="block text-sm font-semibold mb-1">Title *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g., Luxury 3BR House"
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-[#D4AF37]"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the property..."
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-[#D4AF37] h-24"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1">Price ($) *</label>
          <input
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="e.g., 350000"
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-[#D4AF37]"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-semibold mb-1">Bedrooms</label>
            <input
              type="number"
              value={bedrooms}
              onChange={e => setBedrooms(e.target.value)}
              placeholder="3"
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Bathrooms</label>
            <input
              type="number"
              value={bathrooms}
              onChange={e => setBathrooms(e.target.value)}
              placeholder="2"
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Sq Ft</label>
            <input
              type="number"
              value={sqft}
              onChange={e => setSqft(e.target.value)}
              placeholder="1800"
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Upload Images (up to 5) *</label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            className="w-full p-3 border border-gray-300 rounded"
          />
          <p className="text-xs text-gray-500 mt-1">Selected: {files.length} image(s)</p>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Selected images:</p>
            <div className="space-y-2">
              {files.map((file, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-gray-100 rounded">
                  <span className="text-sm">{idx + 1}. {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="text-red-600 hover:text-red-800 text-sm font-semibold"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-[#D4AF37] text-[#1C1C1C] font-bold py-3 rounded hover:bg-[#FFF44F] disabled:opacity-50 uppercase tracking-widest"
          >
            {busy ? 'Creating Property...' : 'Create Property'}
          </button>
        </div>

        {message && (
          <div className={`p-3 rounded text-sm ${message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message}
          </div>
        )}
      </form>
    </main>
  )
}
