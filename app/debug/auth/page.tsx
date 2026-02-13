'use client'

import { useAuth } from '@/lib/AuthContext'

export default function DebugAuthPage() {
  const { user, loading } = useAuth()

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold mb-6">Debug: Auth Info</h1>
      
      {loading && <div>Loading...</div>}
      
      {!loading && !user && <div>Not signed in. <a href="/admin/upload" className="text-blue-600 underline">Sign in here</a></div>}
      
      {!loading && user && (
        <div className="space-y-4 bg-gray-100 p-6 rounded">
          <div>
            <strong>Email:</strong>
            <div className="font-mono text-sm break-all">{user.email}</div>
          </div>
          
          <div>
            <strong>UID:</strong>
            <div className="font-mono text-sm break-all bg-white p-2 rounded border border-gray-300">
              {user.uid}
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(user.uid)
                alert('UID copied to clipboard!')
              }}
              className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Copy UID
            </button>
          </div>

          <div>
            <strong>Full User Object:</strong>
            <pre className="bg-white p-3 rounded border border-gray-300 text-xs overflow-auto max-h-96">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>

          <div className="mt-6 p-4 bg-yellow-100 border border-yellow-300 rounded">
            <strong>Next Steps:</strong>
            <ol className="list-decimal ml-5 mt-2">
              <li>Copy your UID above</li>
              <li>Run: <code className="bg-white px-2 py-1 rounded">node scripts/manageAdmin.js</code></li>
              <li>Paste your UID when prompted</li>
              <li>Choose "grant" action</li>
              <li>Visit <a href="/admin/upload" className="text-blue-600 underline">/admin/upload</a> to create properties</li>
            </ol>
          </div>
        </div>
      )}
    </main>
  )
}
