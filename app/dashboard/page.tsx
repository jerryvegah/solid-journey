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

        if (!uid || uid.trim() === '') {
            console.error('❌ Invalid user ID');
            setLoading(false);
            return;
        }

        const isDev = process.env.NODE_ENV === 'development';
        
        if (isDev) console.log('🔍 Fetching dashboard data for user:', uid);

        try {
            // 1. Fetch Assessments
            try {
                const assessmentsQuery = query(
                    collection(db, "assessments"), 
                    where("userId", "==", uid)
                );
                
                const assessmentsSnapshot = await getDocs(assessmentsQuery);
                const assessmentsCount = assessmentsSnapshot.size;
                
                if (isDev) console.log(`📊 Found ${assessmentsCount} assessments`);
                
                setStats(prev => ({ ...prev, satelliteReports: assessmentsCount }));
                
                if (!assessmentsSnapshot.empty) {
                    // FIX: Properly type the document data
                    const assessmentsDocs = assessmentsSnapshot.docs
                        .map(doc => ({ 
                            id: doc.id, 
                            ...doc.data() 
                        } as any)) // Cast to any to access properties
                        .sort((a, b) => {
                            const timeA = a.createdAt?.toMillis?.() || 0;
                            const timeB = b.createdAt?.toMillis?.() || 0;
                            return timeB - timeA;
                        });

                    const latestAssessment = assessmentsDocs[0];
                    if (isDev) console.log('✅ Latest assessment:', latestAssessment);
                    
                    setLatestReport({
                        cropType: latestAssessment?.cropType || 'Unknown',
                        fieldLocation: latestAssessment?.fieldLocation || 'Unknown',
                        area: latestAssessment?.area_hectares || 0,
                        date: latestAssessment?.createdAt?.toDate?.() 
                            ? latestAssessment.createdAt.toDate().toLocaleDateString() 
                            : 'N/A',
                        lat: latestAssessment?.latitude || latestAssessment?.farmLocation?.lat || 5.6037,
                        lng: latestAssessment?.longitude || latestAssessment?.farmLocation?.lng || -0.1870
                    });
                }
            } catch (error) {
                console.error("Error fetching assessments:", error);
            }

            // 2. Fetch Contracts
            try {
                const contractsQuery = query(
                    collection(db, "FarmerContracts"), 
                    where("userId", "==", uid)
                );
                
                const contractsSnapshot = await getDocs(contractsQuery);
                const contractsCount = contractsSnapshot.size;
                
                if (isDev) console.log(`📊 Found ${contractsCount} contracts`);
                
                setStats(prev => ({ ...prev, activeContracts: contractsCount }));
                
                if (!contractsSnapshot.empty) {
                    // FIX: Properly type the document data
                    const contractsDocs = contractsSnapshot.docs
                        .map(doc => ({ 
                            id: doc.id, 
                            ...doc.data() 
                        } as any)) // Cast to any to access properties
                        .sort((a, b) => {
                            const timeA = a.createdAt?.toMillis?.() || 0;
                            const timeB = b.createdAt?.toMillis?.() || 0;
                            return timeB - timeA;
                        });

                    const latestContractData = contractsDocs[0];
                    if (isDev) console.log('✅ Latest contract:', latestContractData);
                    
                    setLatestContract({
                        cropType: latestContractData?.cropType || 'Unknown',
                        totalProduceDue: latestContractData?.totalProduceDue || 0,
                        status: latestContractData?.status || 'Unknown'
                    });
                }
            } catch (error) {
                console.error("❌ Error fetching contracts:", error);
            }

            // 3. Fetch Input Orders
            let totalInputsCount = 0;
            let allInputs: any[] = [];

            // Try InputOrders collection
            try {
                const inputOrdersQuery = query(
                    collection(db, "InputOrders"), 
                    where("userId", "==", uid)
                );
                
                const inputOrdersSnapshot = await getDocs(inputOrdersQuery);
                
                if (isDev) console.log(`📦 Found ${inputOrdersSnapshot.size} input orders`);
                
                // FIX: Properly type the document data
                const inputOrdersDocs = inputOrdersSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    source: 'InputOrders'
                } as any)); // Cast to any
                
                allInputs.push(...inputOrdersDocs);
                totalInputsCount += inputOrdersSnapshot.size;
            } catch (error) {
                if (isDev) console.error("❌ Error fetching InputOrders:", error);
            }

            // Try payments collection
            try {
                const paymentsQuery = query(
                    collection(db, "payments"), 
                    where("userId", "==", uid)
                );
                
                const paymentsSnapshot = await getDocs(paymentsQuery);
                
                if (isDev) console.log(`💳 Found ${paymentsSnapshot.size} payments`);
                
                // FIX: Properly type the document data
                const paymentsDocs = paymentsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    source: 'payments'
                } as any)); // Cast to any
                
                allInputs.push(...paymentsDocs);
                totalInputsCount += paymentsSnapshot.size;
            } catch (error) {
                if (isDev) console.error("❌ Error fetching payments:", error);
            }

            if (isDev) console.log(`📊 Total inputs/orders: ${totalInputsCount}`);
            
            setStats(prev => ({ ...prev, inputsOrdered: totalInputsCount }));
            
            // Get latest input
            if (allInputs.length > 0) {
                const sortedInputs = allInputs.sort((a, b) => {
                    const timeA = a.createdAt?.toMillis?.() || 
                                  (a.createdAt instanceof Date ? a.createdAt.getTime() : 0) ||
                                  (typeof a.createdAt === 'number' ? a.createdAt : 0);
                    const timeB = b.createdAt?.toMillis?.() || 
                                  (b.createdAt instanceof Date ? b.createdAt.getTime() : 0) ||
                                  (typeof b.createdAt === 'number' ? b.createdAt : 0);
                    return timeB - timeA;
                });

                const latestInputData = sortedInputs[0];
                if (isDev) console.log('✅ Latest input:', latestInputData);
                
                let formattedDate = 'N/A';
                if (latestInputData?.createdAt) {
                    if (typeof latestInputData.createdAt.toDate === 'function') {
                        formattedDate = latestInputData.createdAt.toDate().toLocaleDateString();
                    } else if (latestInputData.createdAt instanceof Date) {
                        formattedDate = latestInputData.createdAt.toLocaleDateString();
                    } else if (typeof latestInputData.createdAt === 'string') {
                        formattedDate = new Date(latestInputData.createdAt).toLocaleDateString();
                    } else if (typeof latestInputData.createdAt === 'number') {
                        formattedDate = new Date(latestInputData.createdAt).toLocaleDateString();
                    }
                }
                
                setLatestInput({
                    productName: latestInputData?.productName || 'Unknown Product',
                    amount: latestInputData?.amount || 0,
                    date: formattedDate,
                    source: latestInputData?.source || 'unknown'
                });
            }

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="h-96 flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-500" size={48} />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 py-4">
            {/* Welcome Banner */}
            <div className="bg-emerald-500 rounded-2xl p-6 md:p-12 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4">
                        Welcome back{user?.displayName ? `, ${user.displayName}` : ''}!
                    </h1>
                    <p className="text-emerald-50 text-sm md:text-lg max-w-2xl font-medium">
                        Manage your farm inputs, monitor crops, and track contracts all in one place.
                    </p>
                </div>
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"></div>
            </div>

            {/* Quick Actions Hub */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link href="/dashboard/inputs" className="bg-white p-4 rounded-2xl shadow-md border border-emerald-50 flex items-center justify-between hover:bg-emerald-50/50 hover:border-emerald-200 hover:-translate-y-1 transition-all group">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors"><Store size={20} /></div>
                        <span className="font-bold text-slate-700 group-hover:text-emerald-800 transition-colors">Order Inputs</span>
                    </div>
                    <ArrowRight size={20} className="text-emerald-200 group-hover:text-emerald-600 transition-colors" />
                </Link>

                <Link href="/dashboard/satellite" className="bg-white p-4 rounded-2xl shadow-md border border-blue-50 flex items-center justify-between hover:bg-blue-50/50 hover:border-blue-200 hover:-translate-y-1 transition-all group">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors"><Map size={20} /></div>
                        <span className="font-bold text-slate-700 group-hover:text-blue-800 transition-colors">Scan Crop Health</span>
                    </div>
                    <ArrowRight size={20} className="text-blue-200 group-hover:text-blue-600 transition-colors" />
                </Link>

                <Link href="/dashboard/contracts" className="bg-white p-4 rounded-2xl shadow-md border border-purple-50 flex items-center justify-between hover:bg-purple-50/50 hover:border-purple-200 hover:-translate-y-1 transition-all group">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-100 p-2.5 rounded-xl text-purple-600 group-hover:bg-purple-500 group-hover:text-white transition-colors"><PenTool size={20} /></div>
                        <span className="font-bold text-slate-700 group-hover:text-purple-800 transition-colors">Create Contract</span>
                    </div>
                    <ArrowRight size={20} className="text-purple-200 group-hover:text-purple-600 transition-colors" />
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 md:gap-6">
                <StatCard icon={<FileText size={18} />} title="Active Contracts" value={stats.activeContracts} />
                <StatCard icon={<Package size={18} />} title="Inputs Ordered" value={stats.inputsOrdered} />
                <StatCard icon={<Satellite size={18} />} title="Satellite Reports" value={stats.satelliteReports} />
            </div>

            {/* Live Weather Forecast */}
            <DashboardWeather 
                latitude={latestReport?.lat || 5.6037} 
                longitude={latestReport?.lng || -0.1870} 
            />

            {/* Recent Activity Section */}
            <div>
                <h2 className="text-xl font-bold text-slate-800 mb-4">Recent Activity</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    <ActivityCard 
                        title="Latest Contract" 
                        icon={<FileText size={18} className="text-emerald-500" />}
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
                        icon={<Satellite size={18} className="text-emerald-500" />}
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
                        icon={<Package size={18} className="text-emerald-500" />}
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

            {/* Debug Info (Remove in production) */}
            {process.env.NODE_ENV === 'development' && (
                <div className="bg-slate-100 rounded-xl p-4">
                    <h3 className="font-bold text-slate-700 mb-2">🔧 Debug Info</h3>
                    <div className="text-xs text-slate-600 space-y-1 font-mono">
                        <div>User ID: {user?.uid}</div>
                        <div>Contracts: {stats.activeContracts}</div>
                        <div>Inputs: {stats.inputsOrdered}</div>
                        <div>Reports: {stats.satelliteReports}</div>
                        <div className="text-yellow-600">Check browser console for detailed logs</div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper Sub-components
function StatCard({ icon, title, value }: { icon: any, title: string, value: number }) {
    return (
        <div className="bg-white p-3 md:p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-all">
            <div className="w-9 h-9 md:w-12 md:h-12 bg-emerald-100 text-emerald-600 rounded-lg md:rounded-xl flex items-center justify-center mb-2 md:mb-4">
                {icon}
            </div>
            <h3 className="text-slate-500 text-xs md:text-sm font-bold uppercase tracking-wider mb-1 leading-tight">{title}</h3>
            <p className="text-xl md:text-4xl font-bold text-slate-800">{value}</p>
        </div>
    );
}

function ActivityCard({ title, icon, data, emptyMessage, ctaData }: { title: string, icon: any, data: any[] | null, emptyMessage: string, ctaData?: {label: string, href: string} }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2 font-bold text-slate-700">
                {icon} {title}
            </div>
            <div className="p-5">
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
                    <div className="text-center py-4 space-y-3">
                        <p className="text-slate-400 text-sm italic">{emptyMessage}</p>
                        {ctaData && (
                            <Link href={ctaData.href} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold hover:bg-emerald-500 hover:text-white transition-all">
                                {ctaData.label} <ArrowRight size={16} />
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}