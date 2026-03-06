"use client";

import { detectCountryFromPhone } from '@/lib/currency';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const translations: Record<string, any> = {
    en: {
        title: "Create your account",
        subtitle: "Access input packages, financing, and monitoring",
        label_name: "Full Name",
        label_phone: "Phone Number",
        label_email: "Email address",
        label_password: "Password",
        label_confirm: "Confirm Password",
        btn_signup: "Sign up",
        btn_creating: "Creating account...",
        link_signin: "sign in to your existing account",
        or: "Or",
        error_match: "Passwords do not match",
        error_failed: "Failed to create an account",
        footer_rights: "Agricheck © 2026"
    },
    fr: {
        title: "Créer votre compte",
        subtitle: "Accédez aux forfaits d'intrants, au financement et au suivi",
        label_name: "Nom complet",
        label_phone: "Numéro de téléphone",
        label_email: "Adresse e-mail",
        label_password: "Mot de passe",
        label_confirm: "Confirmer le mot de passe",
        btn_signup: "S'inscrire",
        btn_creating: "Création du compte...",
        link_signin: "connectez-vous à votre compte existant",
        or: "Ou",
        error_match: "Les mots de passe ne correspondent pas",
        error_failed: "Échec de la création du compte",
        footer_rights: "Agricheck © 2026"
    }
};

export default function SignUpPage() {
    const router = useRouter();
    const [lang, setLang] = useState('en');
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        const savedLang = localStorage.getItem('preferredLanguage');
        if (savedLang && translations[savedLang]) setLang(savedLang);
    }, []);

    const t = translations[lang];

    const changeLanguage = (newLang: string) => {
        setLang(newLang);
        localStorage.setItem('preferredLanguage', newLang);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (formData.password !== formData.confirmPassword) {
            setError(t.error_match);
            setLoading(false);
            return;
        }

        try {
            if (!auth || !db) {
                throw new Error("Firebase is not initialized");
            }

            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

            // 1. Update Profile (DisplayName)
            await updateProfile(userCredential.user, {
                displayName: formData.name
            });

            // 2. Detect Country and Currency
            const { country, currency } = detectCountryFromPhone(formData.phone);

            // 3. Save to Firestore (users collection)
            await setDoc(doc(db, "users", userCredential.user.uid), {
                uid: userCredential.user.uid,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                preferredLanguage: lang,
                country: country,
                currency: currency,
                role: 'farmer',
                createdAt: serverTimestamp()
            });

            router.push('/dashboard');
        } catch (err: any) {
            console.error(err);
            setError(err.message || t.error_failed);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-emerald-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
            {/* Language Switcher */}
            <div className="absolute top-6 right-6 flex items-center gap-2 text-sm font-semibold">
                <button
                    onClick={() => changeLanguage('en')}
                    className={`${lang === 'en' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}
                >EN</button>
                <span className="text-slate-200">|</span>
                <button
                    onClick={() => changeLanguage('fr')}
                    className={`${lang === 'fr' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}
                >FR</button>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <Link href="/" className="flex justify-center mb-6">
                    <div className="relative w-40 h-16">
                        <Image src="/Agriguard logo new s.png" alt="Agricheck" fill className="object-contain" />
                    </div>
                </Link>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 leading-tight">
                    {t.title}
                </h2>
                <p className="mt-2 text-center text-sm text-slate-600">
                    {t.subtitle}
                </p>
                <p className="mt-2 text-center text-sm text-slate-600">
                    {t.or}{' '}
                    <Link href="/signin" className="font-medium text-emerald-600 hover:text-emerald-500">
                        {t.link_signin}
                    </Link>
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                                {t.label_name}
                            </label>
                            <div className="mt-1">
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-slate-700">
                                {t.label_phone}
                            </label>
                            <div className="mt-1">
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    autoComplete="tel"
                                    required
                                    placeholder="+237..."
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                                {t.label_email}
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                                {t.label_password}
                            </label>
                            <div className="mt-1 relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm pr-10"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-emerald-600 transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
                                {t.label_confirm}
                            </label>
                            <div className="mt-1 relative">
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm pr-10"
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-emerald-600 transition-colors"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <i className={`fa-solid ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-md bg-red-50 p-4">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <i className="fa-solid fa-circle-exclamation text-red-400"></i>
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-red-800">
                                            {error}
                                        </h3>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? t.btn_creating : t.btn_signup}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-300" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-slate-500">
                                    {t.footer_rights}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
