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
        <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto px-3 sm:px-4 py-4">
            {/* Welcome Banner */}
            <div className="bg-emerald-500 rounded-2xl md:rounded-3xl p-6 sm:p-8 md:p-12 text-white shadow-xl relative overflow-hidden transition-all hover:shadow-2xl">
                <div className="relative z-10">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4 drop-shadow-sm">
                        Welcome back{user?.displayName ? `, ${user.displayName}` : ''}!
                    </h1>
                    <p className="text-emerald-50 text-sm sm:text-lg max-w-2xl font-medium">
                        Manage your farm inputs, monitor crops, and track contracts all in one place.
                    </p>
                </div>
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"></div>
            </div>

            {/* Quick Actions Hub */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 -mt-2 sm:-mt-4 relative z-20 mx-0 md:mx-6">
                <Link href="/dashboard/inputs" className="bg-white p-4 rounded-2xl shadow-md border border-emerald-50 flex items-center justify-between hover:bg-emerald-50/50 hover:border-emerald-200 hover:-translate-y-1 transition-all group">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors"><Store size={20} /></div>
                        <span className="font-bold text-slate-700 group-hover:text-emerald-800 transition-colors">Order Inputs</span>
                    </div>
                    <ArrowRight size={20} className="text-emerald-200 group-hover:text-emerald-600 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link href="/dashboard/satellite" className="bg-white p-4 rounded-2xl shadow-md border border-blue-50 flex items-center justify-between hover:bg-blue-50/50 hover:border-blue-200 hover:-translate-y-1 transition-all group">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2.5 rounded-xl text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors"><Map size={20} /></div>
                        <span className="font-bold text-slate-700 group-hover:text-blue-800 transition-colors">Scan Crop Health</span>
                    </div>
                    <ArrowRight size={20} className="text-blue-200 group-hover:text-blue-600 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link href="/dashboard/contracts" className="bg-white p-4 rounded-2xl shadow-md border border-purple-50 flex items-center justify-between hover:bg-purple-50/50 hover:border-purple-200 hover:-translate-y-1 transition-all group">
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-100 p-2.5 rounded-xl text-purple-600 group-hover:bg-purple-500 group-hover:text-white transition-colors"><PenTool size={20} /></div>
                        <span className="font-bold text-slate-700 group-hover:text-purple-800 transition-colors">Create Contract</span>
                    </div>
                    <ArrowRight size={20} className="text-purple-200 group-hover:text-purple-600 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6">
                <StatCard icon={<FileText />} title="Active Contracts" value={stats.activeContracts} />
                <StatCard icon={<Package />} title="Inputs Ordered" value={stats.inputsOrdered} />
                <StatCard icon={<Satellite />} title="Satellite Reports" value={stats.satelliteReports} />
            </div>

            {/* Live Weather Forecast */}
            <div className="mt-8">
                <DashboardWeather 
                    latitude={latestReport?.lat || 5.6037} 
                    longitude={latestReport?.lng || -0.1870} 
                />
            </div>

            {/* Recent Activity Section */}
            <div className="mt-8">
                <h2 className="text-xl font-bold text-slate-800 mb-6">Recent Activity</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    
                    {/* Latest Contract Card */}
                    <ActivityCard 
                        title="Latest Contract" 
                        icon={<FileText size={18} className="text-emerald-500 group-hover:text-emerald-600" />}
                        data={latestContract ? [
                            { label: "Crop Type", value: latestContract.cropType },
                            { label: "Produce Due", value: `${latestContract.totalProduceDue} Bags` },
                            { label: "Status", value: latestContract.status }
                        ] : null}
                        emptyMessage="No active contracts found."
                        ctaData={{ label: "Start your first contract", href: "/dashboard/contracts" }}
                    />

                    {/* Latest Satellite Report */}
                    <ActivityCard 
                        title="Latest Satellite Report" 
                        icon={<Satellite size={18} className="text-emerald-500 group-hover:text-emerald-600" />}
                        data={latestReport ? [
                            { label: "Crop Type", value: latestReport.cropType },
                            { label: "Location", value: latestReport.fieldLocation },
                            { label: "Area", value: `${latestReport.area.toFixed(2)} ha` }
                        ] : null}
                        emptyMessage="No reports available yet."
                        ctaData={{ label: "Run a farm scan", href: "/dashboard/satellite" }}
                    />

                    {/* Latest Input Package */}
                    <ActivityCard 
                        title="Latest Input Package" 
                        icon={<Package size={18} className="text-emerald-500 group-hover:text-emerald-600" />}
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
                <div className="bg-slate-100 rounded-xl p-4 mt-8">
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
        <div className="bg-white p-3 sm:p-6 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 hover:border-emerald-100 group relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-slate-50 text-slate-500 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors duration-300 [&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-6 sm:[&>svg]:h-6">
                    {icon}
                </div>
                <h3 className="text-slate-500 text-[10px] sm:text-sm font-bold uppercase tracking-wider mb-0.5 sm:mb-1 group-hover:text-emerald-700 transition-colors leading-tight">{title}</h3>
                <p className="text-2xl sm:text-4xl font-bold text-slate-800 group-hover:scale-105 origin-left transition-transform duration-300">
                    {value} 
                </p>
            </div>
        </div>
    );
}

function ActivityCard({ title, icon, data, emptyMessage, ctaData }: { title: string, icon: any, data: any[] | null, emptyMessage: string, ctaData?: {label: string, href: string} }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow group flex flex-col h-full">
            <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center group-hover:bg-slate-100/50 transition-colors">
                <div className="flex items-center gap-2 font-bold text-slate-700">
                    {icon} {title}
                </div>
            </div>
            <div className="p-6 flex-1 flex flex-col justify-center">
                {data ? (
                    <div className="space-y-4">
                        {data.map((item, i) => (
                            <div key={i}>
                                <div className="flex justify-between items-center group/item hover:bg-slate-50 p-1 -mx-1 rounded transition-colors">
                                    <span className="text-slate-500 text-sm">{item.label}</span>
                                    <span className="font-semibold text-slate-800 text-right group-hover/item:text-emerald-700 transition-colors">{item.value}</span>
                                </div>
                                {i < data.length - 1 && <div className="w-full h-px bg-slate-100 mt-3 mb-1"></div>}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4 space-y-4 flex flex-col items-center justify-center h-full">
                        <p className="text-slate-400 text-sm italic">{emptyMessage}</p>
                        {ctaData && (
                            <Link href={ctaData.href} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold hover:bg-emerald-500 hover:text-white transition-all transform hover:-translate-y-0.5 w-full sm:w-auto">
                                {ctaData.label} <ArrowRight size={16} />
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}