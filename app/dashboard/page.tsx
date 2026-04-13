"use client";

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs
} from 'firebase/firestore';
import { FileText, Package, Satellite, Loader2, ArrowRight, Store, Map, PenTool } from 'lucide-react';
import DashboardWeather from '@/components/DashboardWeather';
import Link from 'next/link';
import { StatCard, ActivityCard } from '@/components/DashboardUI';

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // Stats State
    const [stats, setStats] = useState({
        activeContracts: 0,
        inputsOrdered: 0,
        satelliteReports: 0
    });

    // Recent Activity State
    const [latestContract, setLatestContract] = useState<any>(null);
    const [latestReport, setLatestReport] = useState<any>(null);
    const [latestInput, setLatestInput] = useState<any>(null);

    // Initial check for loading state reconciliation
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!auth) {
            console.error('Firebase Auth not initialized');
            setLoading(false);
            return;
        }

        const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
            if (authUser) {
                setUser(authUser);
                fetchDashboardData(authUser.uid);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    const fetchDashboardData = async (uid: string) => {
        if (!db) {
            console.error('❌ Firestore not initialized');
            setLoading(false);
            return;
        }

        const isDev = process.env.NODE_ENV === 'development';
        
        try {
            // Assessment and Contract data fetching logic (kept same as before for data integrity)
            // 1. Fetch Assessments
            const assessmentsQuery = query(collection(db, "assessments"), where("userId", "==", uid));
            const assessmentsSnapshot = await getDocs(assessmentsQuery);
            setStats(prev => ({ ...prev, satelliteReports: assessmentsSnapshot.size }));
            
            if (!assessmentsSnapshot.empty) {
                const latestAssessment = assessmentsSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as any))
                    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))[0];
                
                setLatestReport({
                    cropType: latestAssessment?.cropType || 'Unknown',
                    fieldLocation: latestAssessment?.fieldLocation || 'Unknown',
                    area: latestAssessment?.area_hectares || 0,
                    lat: latestAssessment?.latitude || latestAssessment?.farmLocation?.lat || 5.6037,
                    lng: latestAssessment?.longitude || latestAssessment?.farmLocation?.lng || -0.1870
                });
            }

            // 2. Fetch Contracts
            const contractsQuery = query(collection(db, "FarmerContracts"), where("userId", "==", uid));
            const contractsSnapshot = await getDocs(contractsQuery);
            setStats(prev => ({ ...prev, activeContracts: contractsSnapshot.size }));
            
            if (!contractsSnapshot.empty) {
                const latestContractData = contractsSnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as any))
                    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))[0];
                
                setLatestContract({
                    cropType: latestContractData?.cropType || 'Unknown',
                    totalProduceDue: latestContractData?.totalProduceDue || 0,
                    status: latestContractData?.status || 'Unknown'
                });
            }

            // 3. Fetch Input Orders & Payments
            const inputOrdersQuery = query(collection(db, "InputOrders"), where("userId", "==", uid));
            const inputOrdersSnapshot = await getDocs(inputOrdersQuery);
            
            const paymentsQuery = query(collection(db, "payments"), where("userId", "==", uid));
            const paymentsSnapshot = await getDocs(paymentsQuery);
            
            setStats(prev => ({ ...prev, inputsOrdered: inputOrdersSnapshot.size + paymentsSnapshot.size }));
            
            const allInputs = [
                ...inputOrdersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'InputOrders' } as any)),
                ...paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'payments' } as any))
            ].sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() || (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
                const timeB = b.createdAt?.toMillis?.() || (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
                return timeB - timeA;
            });

            if (allInputs.length > 0) {
                const latest = allInputs[0];
                setLatestInput({
                    productName: latest?.productName || 'Unknown Product',
                    amount: latest?.amount || 0,
                    date: latest?.createdAt?.toDate?.() ? latest.createdAt.toDate().toLocaleDateString() : 'N/A'
                });
            }

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!mounted || loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <Loader2 className="animate-spin text-emerald-500 mb-4" size={48} />
                <p className="text-slate-400 font-medium">Crunching live data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Welcome Banner */}
            <div className="bg-emerald-500 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden group">
                <div className="relative z-10 transition-transform duration-500 group-hover:translate-x-2">
                    <h1 className="text-3xl md:text-5xl font-bold mb-4">
                        Welcome back{user?.displayName ? `, ${user.displayName}` : ''}!
                    </h1>
                    <p className="text-emerald-50 text-lg max-w-2xl font-medium opacity-90">
                        Manage your farm inputs, monitor crops, and track contracts all in one place.
                    </p>
                </div>
                <div className="absolute -right-16 -top-16 w-80 h-80 bg-white/10 rounded-full blur-3xl transition-transform duration-1000 group-hover:scale-110 pointer-events-none"></div>
                <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"></div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link href="/dashboard/inputs" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md hover:border-emerald-200 transition-all group">
                    <div className="flex items-center gap-4">
                        <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all"><Store size={22} /></div>
                        <span className="font-bold text-slate-700">Order Inputs</span>
                    </div>
                    <ArrowRight size={20} className="text-slate-300 group-hover:text-emerald-600 transition-colors" />
                </Link>

                <Link href="/dashboard/satellite" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md hover:border-blue-200 transition-all group">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-50 p-3 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all"><Map size={22} /></div>
                        <span className="font-bold text-slate-700">Scan Crop Health</span>
                    </div>
                    <ArrowRight size={20} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                </Link>

                <Link href="/dashboard/contracts" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md hover:border-purple-200 transition-all group">
                    <div className="flex items-center gap-4">
                        <div className="bg-purple-50 p-3 rounded-xl text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all"><PenTool size={22} /></div>
                        <span className="font-bold text-slate-700">Create Contract</span>
                    </div>
                    <ArrowRight size={20} className="text-slate-300 group-hover:text-purple-600 transition-colors" />
                </Link>
            </div>

            {/* Stats Grid - STACKED ON MOBILE */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <StatCard icon={<FileText size={20} />} title="Active Contracts" value={stats.activeContracts} />
                <StatCard icon={<Package size={20} />} title="Inputs Ordered" value={stats.inputsOrdered} />
                <StatCard icon={<Satellite size={20} />} title="Satellite Reports" value={stats.satelliteReports} />
            </div>

            {/* Live Weather Forecast */}
            <DashboardWeather 
                latitude={latestReport?.lat || 5.6037} 
                longitude={latestReport?.lng || -0.1870} 
            />

            {/* Recent Activity Section */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6 px-1">Recent Activity</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ActivityCard 
                        title="Latest Contract" 
                        icon={<FileText size={20} className="text-emerald-500" />}
                        data={latestContract ? [
                            { label: "Crop Type", value: latestContract.cropType },
                            { label: "Produce Due", value: `${latestContract.totalProduceDue} Bags` },
                            { label: "Status", value: latestContract.status }
                        ] : null}
                        emptyMessage="No active contracts found."
                        ctaData={{ label: "Start your first contract", href: "/dashboard/contracts" }}
                    />

                    <ActivityCard 
                        title="Latest Satellite Report" 
                        icon={<Satellite size={20} className="text-emerald-500" />}
                        data={latestReport ? [
                            { label: "Crop Type", value: latestReport.cropType },
                            { label: "Location", value: latestReport.fieldLocation },
                            { label: "Area", value: `${latestReport.area.toFixed(2)} ha` }
                        ] : null}
                        emptyMessage="No reports available yet."
                        ctaData={{ label: "Run a farm scan", href: "/dashboard/satellite" }}
                    />

                    <ActivityCard 
                        title="Latest Input Package" 
                        icon={<Package size={20} className="text-emerald-500" />}
                        data={latestInput ? [
                            { label: "Product", value: latestInput.productName },
                            { label: "Amount", value: `GH₵ ${latestInput.amount}` },
                            { label: "Date", value: latestInput.date }
                        ] : null}
                        emptyMessage="No recent orders."
                        ctaData={{ label: "Browse input packages", href: "/dashboard/inputs" }}
                    />
                </div>
            </div>
        </div>
    );
}