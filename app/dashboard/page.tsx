"use client";

import { auth } from '@/lib/firebase';
import { FileText, Package, Satellite } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        if (auth?.currentUser) {
            setUser(auth.currentUser);
        }
    }, []);

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Welcome Banner */}
            <div className="bg-emerald-500 rounded-3xl p-8 md:p-12 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl md:text-4xl font-bold mb-4">
                        Welcome back{user?.displayName ? `, ${user.displayName}` : ''}!
                    </h1>
                    <p className="text-emerald-100 text-lg max-w-2xl">
                        Manage your farm inputs, monitor crops, and track contracts all in one place.
                    </p>
                </div>
                {/* Decorative circle */}
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -right-10 bottom-0 w-40 h-40 bg-emerald-400/20 rounded-full blur-2xl"></div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                        <FileText size={24} />
                    </div>
                    <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Active Contracts</h3>
                    <p className="text-4xl font-bold text-slate-800">23</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                        <Package size={24} />
                    </div>
                    <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Inputs Ordered</h3>
                    <p className="text-4xl font-bold text-slate-800">7</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                        <Satellite size={24} />
                    </div>
                    <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">Satellite Reports</h3>
                    <p className="text-4xl font-bold text-slate-800">43</p>
                </div>
            </div>

            {/* Recent Activity Section */}
            <div>
                <h2 className="text-xl font-bold text-slate-800 mb-6">Recent Activity</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Latest Contract Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-2 font-bold text-slate-700">
                                <FileText size={18} className="text-emerald-500" />
                                Latest Contract
                            </div>
                            <button className="text-xs font-bold text-emerald-600 hover:text-emerald-700">View All</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 text-sm">Product</span>
                                <span className="font-semibold text-slate-800 text-right">NPK Compound Fertilizer 50kg</span>
                            </div>
                            <div className="w-full h-px bg-slate-100"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 text-sm">Price</span>
                                <span className="font-semibold text-slate-800">GH₵ 300</span>
                            </div>
                        </div>
                    </div>

                    {/* Latest Satellite Report Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-2 font-bold text-slate-700">
                                <Satellite size={18} className="text-emerald-500" />
                                Latest Satellite Report
                            </div>
                            <button className="text-xs font-bold text-emerald-600 hover:text-emerald-700">View All</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 text-sm">Crop Type</span>
                                <span className="font-semibold text-slate-800">Maize</span>
                            </div>
                            <div className="w-full h-px bg-slate-100"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 text-sm">Type</span>
                                <span className="font-semibold text-slate-800">Field Boundary</span>
                            </div>
                        </div>
                    </div>

                    {/* Latest Input Package Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-2 font-bold text-slate-700">
                                <Package size={18} className="text-emerald-500" />
                                Latest Input Package
                            </div>
                            <button className="text-xs font-bold text-emerald-600 hover:text-emerald-700">View All</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 text-sm">Package</span>
                                <span className="font-semibold text-slate-800 text-right">NPK Compound Fertilizer 50kg</span>
                            </div>
                            <div className="w-full h-px bg-slate-100"></div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500 text-sm">Category</span>
                                <span className="font-semibold text-slate-800">Inorganic</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
