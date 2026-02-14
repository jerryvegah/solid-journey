"use client";

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import { FileText, Package, Satellite, Loader2 } from 'lucide-react';

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
            console.error('Firestore not initialized');
            setLoading(false);
            return;
        }

        try {
            // 1. Fetch Assessments/Reports
            const assessmentsQuery = query(
                collection(db, "assessments"), 
                where("userId", "==", uid),
                orderBy("createdAt", "desc")
            );
            
            const assessmentsSnapshot = await getDocs(assessmentsQuery);
            const assessmentsCount = assessmentsSnapshot.size;
            
            setStats(prev => ({ ...prev, satelliteReports: assessmentsCount }));
            
            if (!assessmentsSnapshot.empty) {
                const latestAssessment = assessmentsSnapshot.docs[0].data();
                setLatestReport({
                    cropType: latestAssessment.cropType || 'Unknown',
                    fieldLocation: latestAssessment.fieldLocation || 'Unknown',
                    area: latestAssessment.area_hectares || 0,
                    date: latestAssessment.createdAt?.toDate().toLocaleDateString() || 'N/A'
                });
            }

            // 2. Fetch Contracts
            const contractsQuery = query(
                collection(db, "FarmerContracts"), 
                where("farmerId", "==", uid),
                orderBy("createdAt", "desc")
            );
            
            const contractsSnapshot = await getDocs(contractsQuery);
            const contractsCount = contractsSnapshot.size;
            
            setStats(prev => ({ ...prev, activeContracts: contractsCount }));
            
            if (!contractsSnapshot.empty) {
                const latestContractData = contractsSnapshot.docs[0].data();
                setLatestContract({
                    cropType: latestContractData.cropType || 'Unknown',
                    totalProduceDue: latestContractData.totalProduceDue || 0,
                    status: latestContractData.status || 'Unknown'
                });
            }

            // 3. Fetch Inputs/Payments
            const paymentsQuery = query(
                collection(db, "payments"), 
                where("userId", "==", uid)
            );
            
            const paymentsSnapshot = await getDocs(paymentsQuery);
            const paymentsCount = paymentsSnapshot.size;
            
            setStats(prev => ({ ...prev, inputsOrdered: paymentsCount }));
            
            if (!paymentsSnapshot.empty) {
                const latestPaymentData = paymentsSnapshot.docs[0].data();
                setLatestInput({
                    productName: latestPaymentData.productName || 'Unknown',
                    amount: latestPaymentData.amount || 0,
                    date: latestPaymentData.createdAt?.toDate().toLocaleDateString() || 'N/A'
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
        <div className="space-y-8 max-w-7xl mx-auto p-4">
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
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={<FileText />} title="Active Contracts" value={stats.activeContracts} />
                <StatCard icon={<Package />} title="Inputs Ordered" value={stats.inputsOrdered} />
                <StatCard icon={<Satellite />} title="Satellite Reports" value={stats.satelliteReports} />
            </div>

            {/* Recent Activity Section */}
            <div>
                <h2 className="text-xl font-bold text-slate-800 mb-6">Recent Activity</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Latest Contract Card */}
                    <ActivityCard 
                        title="Latest Contract" 
                        icon={<FileText size={18} className="text-emerald-500" />}
                        data={latestContract ? [
                            { label: "Crop Type", value: latestContract.cropType },
                            { label: "Produce Due", value: `${latestContract.totalProduceDue} Bags` },
                            { label: "Status", value: latestContract.status }
                        ] : null}
                        emptyMessage="No active contracts found."
                    />

                    {/* Latest Satellite Report */}
                    <ActivityCard 
                        title="Latest Satellite Report" 
                        icon={<Satellite size={18} className="text-emerald-500" />}
                        data={latestReport ? [
                            { label: "Crop Type", value: latestReport.cropType },
                            { label: "Location", value: latestReport.fieldLocation },
                            { label: "Area", value: `${latestReport.area.toFixed(2)} ha` }
                        ] : null}
                        emptyMessage="No reports available yet."
                    />

                    {/* Latest Input Package */}
                    <ActivityCard 
                        title="Latest Input Package" 
                        icon={<Package size={18} className="text-emerald-500" />}
                        data={latestInput ? [
                            { label: "Product", value: latestInput.productName },
                            { label: "Amount", value: `GH₵ ${latestInput.amount}` },
                            { label: "Date", value: latestInput.date }
                        ] : null}
                        emptyMessage="No recent orders."
                    />
                </div>
            </div>
        </div>
    );
}

// Helper Sub-components for cleaner code
function StatCard({ icon, title, value }: { icon: any, title: string, value: number }) {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                {icon}
            </div>
            <h3 className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">{title}</h3>
            <p className="text-4xl font-bold text-slate-800">{value}</p>
        </div>
    );
}

function ActivityCard({ title, icon, data, emptyMessage }: { title: string, icon: any, data: any[] | null, emptyMessage: string }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                <div className="flex items-center gap-2 font-bold text-slate-700">
                    {icon} {title}
                </div>
            </div>
            <div className="p-6 space-y-4">
                {data ? data.map((item, i) => (
                    <div key={i}>
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 text-sm">{item.label}</span>
                            <span className="font-semibold text-slate-800 text-right">{item.value}</span>
                        </div>
                        {i < data.length - 1 && <div className="w-full h-px bg-slate-100 mt-4"></div>}
                    </div>
                )) : (
                    <p className="text-slate-400 text-sm italic">{emptyMessage}</p>
                )}
            </div>
        </div>
    );
}