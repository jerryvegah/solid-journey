"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

// --- Page Header ---
interface PageHeaderProps {
    title: string;
    description?: string;
    badge?: string;
}

export function PageHeader({ title, description, badge }: PageHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{title}</h1>
                {description && <p className="text-slate-500 mt-1 text-sm md:text-base">{description}</p>}
            </div>
            {badge && (
                <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-bold shadow-sm whitespace-nowrap">
                    {badge}
                </div>
            )}
        </div>
    );
}

// --- Stat Card ---
interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: string | number;
}

export function StatCard({ icon, title, value }: StatCardProps) {
    return (
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                {icon}
            </div>
            <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1 leading-tight">
                {title}
            </h3>
            <p className="text-3xl md:text-4xl font-bold text-slate-800">{value}</p>
        </div>
    );
}

// --- Activity Card ---
interface ActivityCardProps {
    title: string;
    icon: React.ReactNode;
    data: Array<{ label: string; value: string | number }> | null;
    emptyMessage: string;
    ctaData?: { label: string; href: string };
}

export function ActivityCard({ title, icon, data, emptyMessage, ctaData }: ActivityCardProps) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2 font-bold text-slate-700">
                {icon} {title}
            </div>
            <div className="p-5 flex-1 flex flex-col">
                {data ? (
                    <div className="space-y-3">
                        {data.map((item, i) => (
                            <div key={i}>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 text-sm">{item.label}</span>
                                    <span className="font-semibold text-slate-800 text-right">{item.value}</span>
                                </div>
                                {i < data.length - 1 && <div className="w-full h-px bg-slate-100 mt-3"></div>}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 flex-1 flex flex-col items-center justify-center space-y-3">
                        <p className="text-slate-400 text-sm italic">{emptyMessage}</p>
                        {ctaData && (
                            <Link 
                                href={ctaData.href} 
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold hover:bg-emerald-500 hover:text-white transition-all transform active:scale-95"
                            >
                                {ctaData.label} <ArrowRight size={16} />
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
