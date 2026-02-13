'use client'

import { useAuth } from '@/lib/AuthContext'

export default function SignInButton() {
  const { user, loading, signInWithGoogle, logout } = useAuth()

  if (loading) return null

  return (
    <div className="flex items-center gap-2">
      {!user ? (
        <button
          onClick={signInWithGoogle}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 text-sm"
        >
          Sign In
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-sm">{user.email}</span>
          <button
            onClick={logout}
            className="px-4 py-2 bg-gray-200 text-black rounded hover:bg-gray-300 text-sm"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}
