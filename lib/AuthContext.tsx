'use client'

import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth } from './firebase'

interface AuthContextType {
  user: any
  loading: boolean
  signInWithGoogle: () => Promise<any>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // FIX: Add null check for auth
    if (!auth) {
      console.error('Firebase Auth not initialized')
      setLoading(false)
      return
    }

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  async function signInWithGoogle() {
    // FIX: Add null check for auth
    if (!auth) {
      throw new Error('Firebase Auth not initialized')
    }

    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    setUser(result.user)
    return result.user
  }

  async function logout() {
    // FIX: Add null check for auth
    if (!auth) {
      throw new Error('Firebase Auth not initialized')
    }

    await signOut(auth)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}