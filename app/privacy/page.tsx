"use client";

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12">
                <Link href="/dashboard/settings" className="inline-flex items-center gap-2 text-emerald-600 font-bold mb-8 hover:text-emerald-700 transition-colors">
                    <ArrowLeft size={20} />
                    Back to Settings
                </Link>

                <h1 className="text-3xl font-bold text-slate-800 mb-2">Privacy Policy</h1>
                <p className="text-slate-500 mb-8">Last updated: February 12, 2026</p>

                <div className="space-y-6 text-slate-700 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">1. Information We Collect</h2>
                        <p>We collect information you provide directly to us, such as when you create an account, update your profile, or use our satellite analysis tools. This includes your name, email address, phone number and farm data.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">2. How We Use Your Information</h2>
                        <p>We use the information we collect to provide, maintain, and improve our services, to communicate with you, and to analyze usage patterns.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">3. Data Security</h2>
                        <p>We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">4. Sharing of Information</h2>
                        <p>We do not share your personal information with third parties except as described in this policy or with your consent.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">5. Your Rights</h2>
                        <p>You have the right to access, correct, or delete your personal information. You can manage your account settings within the application.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">6. Contact Us</h2>
                        <p>If you have any questions about this Privacy Policy, please contact us at info@agricheck.farm.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
