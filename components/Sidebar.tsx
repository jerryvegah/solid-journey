"use client";

import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import {
    FileText,
    LayoutDashboard,
    LogOut,
    Map as MapIcon,
    Menu,
    Package,
    Satellite,
    Settings,
    X
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const sidebarItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Inputs & Packages', href: '/dashboard/inputs', icon: Package },
    { name: 'Map Farm', href: '/dashboard/map', icon: MapIcon },
    { name: 'Contracts', href: '/dashboard/contracts', icon: FileText },
    { name: 'Satellite Reports', href: '/dashboard/satellite', icon: Satellite },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = async () => {
        try {
            if (auth) {
                await signOut(auth);
                router.push('/signin');
            }
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-emerald-600 text-white rounded-md shadow-lg"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sidebar Container */}
            <aside className={`
        fixed top-0 left-0 z-40 h-screen w-64 bg-emerald-600 text-white transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>
                <div className="flex flex-col h-full">
                    {/* Logo Area */}
                    <div className="p-6 border-b border-emerald-500">
                        <h1 className="text-2xl font-bold">Agricheck</h1>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                        {sidebarItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                    ${isActive
                                            ? 'bg-white/20 font-bold shadow-sm'
                                            : 'hover:bg-white/10 hover:translate-x-1'
                                        }
                  `}
                                    onClick={() => setIsOpen(false)} // Close on mobile click
                                >
                                    <Icon size={20} />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Logout Button */}
                    <div className="p-4 border-t border-emerald-500">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg hover:bg-white/10 transition-all text-left"
                        >
                            <LogOut size={20} />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
