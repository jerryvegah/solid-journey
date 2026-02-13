"use client";

import { auth } from '@/lib/firebase';
import { ChevronRight, FileText, Lock, Moon, User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function SettingsPage() {
    const [user, setUser] = useState<any>(null);
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        // Listen for auth changes
        const unsubscribe = auth?.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe?.();
    }, []);

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
                <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-bold shadow-sm">
                    Configuration
                </div>
            </div>

            {/* Profile Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex flex-col items-center text-center">
                <div className="relative mb-4">
                    <div className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                        {user?.photoURL ? (
                            <Image src={user.photoURL} alt="Profile" width={96} height={96} className="object-cover" />
                        ) : (
                            <User size={48} className="text-emerald-600" />
                        )}
                    </div>
                    <button className="absolute bottom-0 right-0 bg-emerald-500 text-white p-1.5 rounded-full shadow-md hover:bg-emerald-600 transition-colors">
                        <i className="fa-solid fa-camera text-xs"></i>
                    </button>
                </div>

                <h2 className="text-xl font-bold text-slate-800 uppercase tracking-wide">
                    {user?.displayName || 'Guest User'}
                </h2>
                <p className="text-slate-500 mb-6">{user?.email || 'No email associated'}</p>

                <button className="bg-emerald-600 text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-emerald-700 transition-colors shadow-md">
                    Edit Profile
                </button>
            </div>

            {/* App Settings */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 px-2">App Settings</h3>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

                    {/* Dark Mode Toggle */}
                    <div className="p-6 flex items-center justify-between border-b border-slate-50">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                                <Moon size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">Dark Mode</h4>
                                <p className="text-xs text-slate-500">Use dark theme</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${darkMode ? 'bg-emerald-500' : 'bg-slate-200'}`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>

                </div>
            </div>

            {/* About Section */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 px-2">About</h3>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">

                    {/* Version */}
                    <div className="p-6">
                        <h4 className="font-bold text-slate-800">Version</h4>
                        <p className="text-sm text-slate-500 mt-1">1.4.0</p>
                    </div>

                    {/* Terms of Service */}
                    <Link href="/terms" className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-white flex items-center justify-center text-slate-600 transition-colors">
                                <FileText size={20} />
                            </div>
                            <span className="font-bold text-slate-700">Terms of Service</span>
                        </div>
                        <ChevronRight size={20} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </Link>

                    {/* Privacy Policy */}
                    <Link href="/privacy" className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-white flex items-center justify-center text-slate-600 transition-colors">
                                <Lock size={20} />
                            </div>
                            <span className="font-bold text-slate-700">Privacy Policy</span>
                        </div>
                        <ChevronRight size={20} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </Link>

                </div>
            </div>

        </div>
    );
}
