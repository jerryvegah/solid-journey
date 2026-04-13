"use client";

import Sidebar from '@/components/Sidebar';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth) return;

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                router.push('/signin');
            } else {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
                    <p className="text-slate-500 font-medium animate-pulse">Initializing Farm Security...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <Sidebar />
            <main className="flex-1 ml-0 md:ml-64 p-4 md:p-8 transition-all duration-300 min-w-0">
                {/* Top Bar for Mobile - space for hamburger */}
                <div className="h-14 md:h-0"></div>
                <div className="w-full max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
