"use client";

import { db, useAuth } from '@/lib/firebase';
import { initiateCheckout } from '@/lib/payment';
import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    Title,
    Tooltip,
} from 'chart.js';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import 'leaflet/dist/leaflet.css';
import { Activity, AlertTriangle, CreditCard, Download, Droplets, Eye, Layers, Lock, MapPin, Satellite, Thermometer, TrendingUp, Wind, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Bar } from 'react-chartjs-2';

// Register ChartJS
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const ITEMS_PER_PAGE = 5;

// --- Helper Functions ---
function generateRecommendationsArray(data: any) {
    const cropType = data.cropType || data.crop;
    if (!cropType) return ["No recommendations available."];

    const riskData = data.results?.risk_ml?.risk_assessment?.[cropType.toUpperCase()];
    if (!riskData) return ["No recommendations available."];

    const recommendations = [];
    if (riskData.components?.price_volatility > 0.6) recommendations.push('Price volatility is high; consider hedging strategies.');
    if (riskData.components?.short_term_weather_risk > 0.4) recommendations.push('Adverse weather is expected; prepare accordingly.');

    switch (riskData.risk_level) {
        case 'High Risk': recommendations.push('Implement comprehensive risk management strategies.'); break;
        case 'Moderate Risk': recommendations.push('Regular monitoring is recommended.'); break;
        default: recommendations.push('Maintain standard agricultural practices.');
    }
    return [...new Set(recommendations)];
}

export default function SatelliteReportsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isPremium, setIsPremium] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [pendingReport, setPendingReport] = useState<any>(null);

    // Load user's assessments and premium status from Firebase
    useEffect(() => {
        const loadUserData = async () => {
            // Don't start loading until auth is complete
            if (authLoading) return;

            if (!user) {
                setLoading(false);
                return;
            }

            if (!db) {
                console.error('Firestore not initialized');
                setLoading(false);
                return;
            }

            try {
                // 1. Check Premium Status
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    setIsPremium(userDoc.data().isPremium || false);
                }

                // 2. Load Assessments
                const assessmentsRef = collection(db, 'assessments');
                const q = query(assessmentsRef, where('userId', '==', user.uid));
                const querySnapshot = await getDocs(q);

                const userAssessments = querySnapshot.docs.map((doc, index) => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        title: "AI FIELD ANALYSIS",
                        crop: data.cropType || "Unknown",
                        date: data.createdAt?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || "N/A",
                        fieldName: data.fieldLocation || "Unknown Field",
                        coordinates: `${data.latitude?.toFixed(4) || '0.0000'}, ${data.longitude?.toFixed(4) || '0.0000'}`,
                        type: "Field Boundary",
                        area: `${data.area_hectares?.toFixed(2) || '0.00'} hectares`,
                        monitoringType: data.satellite_monitoring_enabled ? "Satellite Monitoring" : "Manual Assessment",
                        plantedDate: data.datePlanted || "N/A",
                        stage: "vegetative",
                        daysAfterPlanting: data.datePlanted ? Math.floor((new Date().getTime() - new Date(data.datePlanted).getTime()) / (1000 * 60 * 60 * 24)) : 0,
                        expectedSeason: 120,
                        peakNDVI: 0.75,
                        riskLevel: data.results?.risk_ml?.risk_assessment?.[data.cropType?.toUpperCase()]?.risk_level || "Unknown",
                        boundaryPoints: data.fieldCoordinates ? JSON.parse(data.fieldCoordinates).length : 0,
                        results: data.results || {}
                    };
                });

                setReports(userAssessments);
            } catch (error) {
                console.error("Error loading assessments:", error);
            } finally {
                setLoading(false);
            }
        };

        loadUserData();
    }, [user, authLoading]);

    // Handle report selection
    const handleReportSelect = (report: any) => {
        setSelectedReport(report);
    };

    // Pagination Logic
    const totalPages = Math.ceil(reports.length / ITEMS_PER_PAGE);
    const displayedReports = reports.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) setCurrentPage(page);
    };

    // Show loading spinner while checking auth or loading data
    if (authLoading || loading) {
        return (
            <div className="max-w-7xl mx-auto relative pb-20 px-4">
                <div className="flex flex-col justify-center items-center h-96">
                    <Satellite size={48} className="text-emerald-500 animate-pulse mb-4" />
                    <div className="text-slate-600 text-lg font-semibold">Loading your assessments...</div>
                </div>
            </div>
        );
    }

    // Show sign-in message if not authenticated
    if (!user) {
        return (
            <div className="max-w-7xl mx-auto relative pb-20 px-4">
                <div className="flex justify-center items-center h-64">
                    <div className="text-slate-500 text-lg">Please sign in to view your assessments.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto relative pb-20 px-4">
            {/* Header - Mobile Responsive */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Satellite Reports</h1>
                <div className="flex gap-3 items-center">
                    <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-bold shadow-sm">
                        {reports.length} Report{reports.length !== 1 ? 's' : ''}
                    </div>
                </div>
            </div>

            {reports.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-md p-8 sm:p-12 text-center border border-slate-100">
                    <Satellite size={64} className="mx-auto text-slate-300 mb-4" />
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-700 mb-2">No Assessments Yet</h2>
                    <p className="text-slate-500 mb-6">Create your first field assessment using the Map Farm page.</p>
                    <a href="/dashboard/map" className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 transition-colors">
                        Go to Map Farm
                    </a>
                </div>
            ) : (
                <>
                    <div className="space-y-6 sm:space-y-8">
                        {displayedReports.map((report) => (
                            <ReportCard
                                key={report.id}
                                report={report}
                                onSelect={() => handleReportSelect(report)}
                            />
                        ))}
                    </div>

                    {/* Pagination Controls - Mobile Responsive */}
                    {totalPages > 1 && (
                        <div className="flex justify-center mt-8 sm:mt-12 gap-2 flex-wrap">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 sm:px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                Previous
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <button
                                    key={page}
                                    onClick={() => handlePageChange(page)}
                                    className={`w-10 h-10 rounded-lg font-bold flex items-center justify-center transition-colors text-sm
                                    ${currentPage === page ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-3 sm:px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Report Details Modal */}
            {selectedReport && (
                <ReportDetailsModal
                    report={selectedReport}
                    onClose={() => setSelectedReport(null)}
                    onViewFull={() => router.push(`/reports/${selectedReport.id}`)}
                />
            )}

            {/* Payment Modal */}
            {showPaymentModal && (
                <PaymentModal
                    user={user}
                    onClose={() => { setShowPaymentModal(false); setPendingReport(null); }}
                    onSuccess={() => setIsPremium(true)}
                />
            )}
        </div>
    );
}

// --- Report Card Component - Mobile Responsive ---
function ReportCard({ report, onSelect }: { report: any, onSelect: () => void }) {
    return (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-slate-100 transition-hover hover:shadow-lg">
            {/* Header */}
            <div className="bg-emerald-600 px-4 sm:px-6 py-3 flex justify-between items-center gap-2">
                <h2 className="text-white font-bold tracking-wider uppercase text-xs sm:text-sm flex items-center gap-2">
                    <Activity size={16} className="hidden sm:block" />
                    {report.title}
                </h2>
                <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold uppercase whitespace-nowrap
                    ${report.riskLevel === 'Low Risk' ? 'bg-green-400 text-green-900' :
                        report.riskLevel === 'Medium Risk' ? 'bg-yellow-400 text-yellow-900' : 'bg-red-400 text-red-900'}
                `}>
                    {report.riskLevel}
                </div>
            </div>

            <div className="p-4 sm:p-6 md:p-8">
                <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
                    {/* Left Column */}
                    <div className="space-y-4">
                        <h3 className="text-xl sm:text-2xl font-bold text-slate-800">
                            {report.crop}: <span className="text-slate-500 font-medium text-base sm:text-lg">{report.date}</span>
                        </h3>
                        <div className="space-y-2 text-sm sm:text-base text-slate-600">
                            <div className="flex items-start gap-3">
                                <MapPin size={20} className="text-emerald-500 mt-1 shrink-0" />
                                <div>
                                    <p className="font-semibold">{report.fieldName}</p>
                                    <p className="text-xs sm:text-sm font-mono text-slate-400 break-all">{report.coordinates}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Layers size={20} className="text-emerald-500 shrink-0" />
                                <span className="text-sm">{report.type} • {report.area}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Satellite size={20} className="text-emerald-500 shrink-0" />
                                <span className="text-sm">{report.monitoringType}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="bg-slate-50 rounded-xl p-4 sm:p-6 border border-slate-100">
                        <h4 className="font-bold text-emerald-800 mb-4 flex items-center gap-2 text-sm sm:text-base">
                            <i className="fa-solid fa-seedling"></i> Crop Intelligence
                        </h4>
                        <div className="space-y-3 text-xs sm:text-sm">
                            <div className="flex justify-between border-b border-slate-200 pb-2">
                                <span className="text-slate-500">Planted Date</span>
                                <span className="font-semibold text-slate-700">{report.plantedDate}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200 pb-2">
                                <span className="text-slate-500">Current Stage</span>
                                <span className="font-bold text-emerald-600 uppercase">{report.stage}</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200 pb-2">
                                <span className="text-slate-500">Days After Planting</span>
                                <span className="font-semibold text-slate-700">{report.daysAfterPlanting} days</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Expected Season</span>
                                <span className="font-semibold text-slate-700">{report.expectedSeason} days</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-100 flex gap-3 sm:gap-4">
                    <button onClick={onSelect} className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 border-2 border-emerald-600 text-emerald-700 font-bold rounded-lg hover:bg-emerald-50 transition-colors text-sm sm:text-base">
                        <Eye size={18} />
                        <span className="hidden sm:inline">View Details</span>
                        <span className="sm:hidden">Details</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Payment Modal Component ---
function PaymentModal({ user, onClose, onSuccess }: { user: any, onClose: () => void, onSuccess: () => void }) {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleUpgrade = () => {
        if (!user) return;

        if (!db) {
            alert('Database not initialized. Please refresh the page.');
            return;
        }

        setIsProcessing(true);
        initiateCheckout(
            {
                email: user.email || '',
                name: user.displayName || 'Farmer',
                uid: user.uid
            },
            'GHS',
            'PREMIUM',
            {
                title: "Agricheck Premium",
                description: "Unlimited Field Assessments & Risk Analysis"
            },
            async (ref) => {
                try {
                    if (!db) {
                        alert("Database error. Please contact support.");
                        return;
                    }

                    const userRef = doc(db, 'users', user.uid);
                    await updateDoc(userRef, {
                        isPremium: true,
                        lastPaymentRef: ref,
                        paidAt: serverTimestamp()
                    });
                    onSuccess();
                    onClose();
                    alert("Welcome to Premium! Your unlimited access is now active.");
                } catch (err) {
                    console.error("Error updating verification:", err);
                    alert("Payment confirmed, but profile update failed. Please refresh or contact support.");
                } finally {
                    setIsProcessing(false);
                }
            }
        );
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-6 sm:p-8 text-center">
                    <div className="bg-emerald-100 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                        <Lock size={32} className="sm:w-10 sm:h-10 text-emerald-600" />
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-3">Upgrade to Premium</h2>
                    <p className="text-sm sm:text-base text-slate-600 mb-6">
                        You've used your 2 free assessments. Upgrade to Premium to access unlimited detailed reports and advanced analytics.
                    </p>

                    <div className="bg-slate-50 rounded-xl p-4 sm:p-6 mb-6 border border-slate-200">
                        <ul className="text-left space-y-2 text-xs sm:text-sm text-slate-600">
                            <li className="flex items-start gap-2">
                                <i className="fa-solid fa-check text-emerald-500 mt-1"></i>
                                <span>Unlimited detailed assessment reports</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <i className="fa-solid fa-check text-emerald-500 mt-1"></i>
                                <span>Advanced risk analysis & charts</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <i className="fa-solid fa-check text-emerald-500 mt-1"></i>
                                <span>7-day weather forecasts</span>
                            </li>
                        </ul>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleUpgrade}
                            disabled={isProcessing}
                            className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
                        >
                            <CreditCard size={20} />
                            {isProcessing ? "Processing..." : "Upgrade Now - GHS 35"}
                        </button>
                        <button onClick={onClose} className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors text-sm sm:text-base">
                            Maybe Later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Report Details Modal Component - Mobile Responsive ---
function ReportDetailsModal({ report, onClose, onViewFull }: { report: any, onClose: () => void, onViewFull: () => void }) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);

    // Initialize Mini-Map
    useEffect(() => {
        let L: any;
        const initMap = async () => {
            if (!mapRef.current || mapInstance.current) return;
            try {
                // @ts-ignore
                L = (await import('leaflet')).default;

                const [lat, lng] = report.coordinates.split(',').map((s: string) => parseFloat(s.trim()));

                const map = L.map(mapRef.current, {
                    center: [lat, lng],
                    zoom: 14,
                    zoomControl: false,
                    attributionControl: false
                });
                mapInstance.current = map;

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                L.marker([lat, lng]).addTo(map).bindPopup(report.fieldName).openPopup();

            } catch (e) { console.error("Map init failed", e); }
        };
        initMap();
        return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
    }, [report]);

    // Format Data for Chart
    const riskComponents = report.results?.risk_ml?.risk_assessment?.[report.crop.toUpperCase()]?.components || {};
    const chartData = {
        labels: ['Price Volatility', 'Weather Risk', 'Seasonal Risk', 'Suitability'],
        datasets: [{
            label: 'Risk Level %',
            data: [
                (riskComponents.price_volatility || 0) * 100,
                (riskComponents.short_term_weather_risk || 0) * 100,
                (riskComponents.long_term_seasonal_risk || 0) * 100,
                (riskComponents.suitability_score || 0) * 100
            ],
            backgroundColor: [
                'rgba(255, 159, 64, 0.7)',
                'rgba(255, 99, 132, 0.7)',
                'rgba(255, 206, 86, 0.7)',
                'rgba(75, 192, 192, 0.7)'
            ],
            borderRadius: 6,
        }]
    };

    const recommendations = generateRecommendationsArray(report);
    const forecast = report.results?.risk_ml?.weather_forecast?.daily || report.results?.weather_forecast?.daily || [];

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

                {/* Modal Header */}
                <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white z-10">
                    <div className="flex-1 min-w-0 pr-2">
                        <h2 className="text-base sm:text-xl font-bold text-slate-800">Report Details</h2>
                        <h3 className="text-lg sm:text-2xl font-bold mt-1 text-slate-900 flex items-center gap-2 flex-wrap">
                            <span className="truncate">{report.crop}</span>
                            <span className="text-slate-400 hidden sm:inline">|</span>
                            <span className="text-emerald-700 truncate">{report.fieldName}</span>
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0">
                        <X size={20} className="sm:w-6 sm:h-6" />
                    </button>
                </div>

                <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">

                    {/* Top Section: Map & Key Stats */}
                    <div className="grid md:grid-cols-2 gap-4 sm:gap-8">
                        {/* Interactive Mini Map */}
                        <div className="h-48 sm:h-64 rounded-xl overflow-hidden shadow-inner border border-slate-200 relative bg-slate-100">
                            <div ref={mapRef} className="w-full h-full" />
                            <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 text-xs rounded shadow font-bold text-slate-600 z-[1000]">
                                {report.coordinates}
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-500 uppercase">Field Area</p>
                                <p className="text-base sm:text-xl font-bold text-slate-800">{report.area}</p>
                            </div>
                            <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-500 uppercase">Growth Stage</p>
                                <p className="text-base sm:text-xl font-bold text-emerald-600 uppercase">{report.stage}</p>
                            </div>
                            <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-500 uppercase">Peak NDVI</p>
                                <p className="text-base sm:text-xl font-bold text-slate-800">{report.peakNDVI}</p>
                            </div>
                            <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-100">
                                <p className="text-xs font-bold text-slate-500 uppercase">Risk Level</p>
                                <p className={`text-base sm:text-xl font-bold ${report.riskLevel.includes('Low') ? 'text-emerald-500' : 'text-yellow-600'}`}>{report.riskLevel}</p>
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Chart & Recommendations */}
                    <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
                        <div>
                            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm sm:text-base">
                                <TrendingUp size={20} className="text-emerald-600" /> Risk Analysis
                            </h4>
                            <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-100 shadow-sm h-48 sm:h-64">
                                <Bar
                                    data={chartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { display: false } },
                                        scales: { y: { beginAtZero: true, max: 100 } }
                                    }}
                                />
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm sm:text-base">
                                <AlertTriangle size={20} className="text-emerald-600" /> Recommendations
                            </h4>
                            <div className="bg-emerald-50 rounded-xl p-4 sm:p-6 border border-emerald-100 h-48 sm:h-64 overflow-y-auto custom-scrollbar">
                                <ul className="space-y-3">
                                    {recommendations.map((rec: string, i: number) => (
                                        <li key={i} className="flex gap-3 text-xs sm:text-sm text-emerald-900 leading-relaxed">
                                            <i className="fa-solid fa-check-circle mt-1 text-emerald-500 shrink-0"></i>
                                            {rec}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Weather Forecast */}
                    <div>
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm sm:text-base">
                            <Thermometer size={20} className="text-emerald-600" /> 7-Day Weather Forecast
                        </h4>
                        {forecast.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 sm:gap-3">
                                {forecast.slice(0, 7).map((day: any, i: number) => (
                                    <div key={i} className="bg-white border border-slate-200 rounded-xl p-2 sm:p-3 text-center shadow-sm">
                                        <p className="text-xs font-bold text-slate-500 mb-1">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</p>
                                        <div className="text-emerald-500 my-2 flex justify-center">
                                            {day.precipitation_sum > 0 ? <Droplets size={20} className="sm:w-6 sm:h-6" /> : <Wind size={20} className="sm:w-6 sm:h-6" />}
                                        </div>
                                        <div className="text-xs sm:text-sm font-bold text-slate-800">
                                            {day.temperature_max.toFixed(0)}° <span className="text-slate-400 text-xs">/ {day.temperature_min.toFixed(0)}°</span>
                                        </div>
                                        <p className="text-xs text-blue-500 mt-1 font-bold">
                                            {day.precipitation_sum > 7 ? "Rain" : `${day.precipitation_sum} mm`}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400 text-sm">
                                No weather data available for this report.
                            </div>
                        )}
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-slate-100">
                        <button onClick={onClose} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base">
                            Close Report
                        </button>
                        <button
                            onClick={onViewFull}
                            className="flex-1 sm:flex-initial px-6 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                        >
                            <Download size={18} /> <span className="hidden sm:inline">See Full Report</span><span className="sm:hidden">Download</span>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}