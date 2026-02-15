"use client";

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TermsOfServicePage() {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-12">
                <Link href="/dashboard/settings" className="inline-flex items-center gap-2 text-emerald-600 font-bold mb-8 hover:text-emerald-700 transition-colors">
                    <ArrowLeft size={20} />
                    Back to Settings
                </Link>

                <h1 className="text-3xl font-bold text-slate-800 mb-2">Terms of Service</h1>
                <p className="text-slate-500 mb-8">Last updated: February 12, 2026</p>

                <div className="space-y-6 text-slate-700 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">1. Introduction</h2>
                        <p>Welcome to Agricheck. By accessing or using our website and services, you agree to be bound by these Terms of Service.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">2. Use of Services</h2>
                        <p>You agree to use Agricheck only for lawful purposes and in accordance with these Terms. You are responsible for maintaining the confidentiality of your account information.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">3. Intellectual Property</h2>
                        <p>The content, features, and functionality of Agricheck are owned by us and are protected by international copyright, trademark, and other intellectual property laws.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">4. Limitation of Liability</h2>
                        <p>In no event shall Agricheck be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the services. This is risk analysis and we may be wrong and ask that you verify the data.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">5. Changes to Terms</h2>
                        <p>We reserve the right to modify these Terms at any time. We will provide notice of any material changes by posting the new Terms on this page.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-3">6. Contact Us</h2>
                        <p>If you have any questions about these Terms, please contact us at info@agricheck.farm.</p>
                    </section>
                </div>
            </div>
        </div>
    );
}
