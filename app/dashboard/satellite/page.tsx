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

                // 2. Load Assessments with REAL DATA
                const assessmentsRef = collection(db, 'assessments');
                const q = query(assessmentsRef, where('userId', '==', user.uid));
                const querySnapshot = await getDocs(q);

                const userAssessments = querySnapshot.docs.map((doc) => {
                    const data = doc.data();
                    
                    // FIX: Extract REAL data from Firebase
                    const cropInfo = data.results?.satellite?.crop_info || {};
                    const riskAssessment = data.results?.risk_ml?.risk_assessment?.[data.cropType?.toUpperCase()] || {};
                    
                    return {
                        id: doc.id,
                        title: "AI FIELD ANALYSIS",
                        crop: data.cropType || "Unknown",
                        date: data.createdAt?.toDate?.()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || "N/A",
                        fieldName: data.fieldLocation || "Unknown Field",
                        coordinates: `${data.latitude?.toFixed(4) || '0.0000'}, ${data.longitude?.toFixed(4) || '0.0000'}`,
                        type: "Field Boundary",
                        area: `${data.area_hectares?.toFixed(2) || '0.00'} hectares`,
                        monitoringType: data.satellite_monitoring_enabled ? "Satellite Monitoring" : "Manual Assessment",
                        plantedDate: data.datePlanted || "N/A",
                        // FIX: Pull REAL data from Firebase
                        stage: cropInfo.current_stage?.replace('_', ' ') || "Unknown",
                        daysAfterPlanting: cropInfo.current_das || (data.datePlanted ? Math.floor((new Date().getTime() - new Date(data.datePlanted).getTime()) / (1000 * 60 * 60 * 24)) : 0),
                        expectedSeason: cropInfo.expected_season_length || 120,
                        peakNDVI: cropInfo.expected_peak_ndvi?.toFixed(2) || "0.75",
                        riskLevel: riskAssessment.risk_level || "Unknown",
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

            {selectedReport && (
                <ReportDetailsModal
                    report={selectedReport}
                    onClose={() => setSelectedReport(null)}
                    onViewFull={() => router.push(`/reports/${selectedReport.id}`)}
                />
            )}

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

// --- Report Card Component ---
function ReportCard({ report, onSelect }: { report: any, onSelect: () => void }) {
    return (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-slate-100 transition-hover hover:shadow-lg">
            <div className="bg-emerald-600 px-4 sm:px-6 py-3 flex justify-between items-center gap-2">
                <h2 className="text-white font-bold tracking-wider uppercase text-xs sm:text-sm flex items-center gap-2">
                    <Activity size={16} className="hidden sm:block" />
                    {report.title}
                </h2>
                <div className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold uppercase whitespace-nowrap
                    ${report.riskLevel === 'Low Risk' ? 'bg-green-400 text-green-900' :
                        report.riskLevel === 'Medium Risk' || report.riskLevel === 'Moderate Risk' ? 'bg-yellow-400 text-yellow-900' : 'bg-red-400 text-red-900'}
                `}>
                    {report.riskLevel}
                </div>
            </div>

            <div className="p-4 sm:p-6 md:p-8">
                <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
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

// --- Payment Modal ---
function PaymentModal({ user, onClose, onSuccess }: { user: any, onClose: () => void, onSuccess: () => void }) {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleUpgrade = () => {
        if (!user || !db) return;

        setIsProcessing(true);
        initiateCheckout(
            { email: user.email || '', name: user.displayName || 'Farmer', uid: user.uid },
            'GHS',
            'PREMIUM',
            { title: "Agricheck Premium", description: "Unlimited Field Assessments & Risk Analysis" },
            async (ref) => {
                try {
                    if (!db) return;
                    await updateDoc(doc(db, 'users', user.uid), {
                        isPremium: true,
                        lastPaymentRef: ref,
                        paidAt: serverTimestamp()
                    });
                    onSuccess();
                    onClose();
                } catch (err) {
                    console.error(err);
                } finally {
                    setIsProcessing(false);
                }
            }
        );
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="p-6 sm:p-8 text-center">
                    <div className="bg-emerald-100 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                        <Lock size={32} className="text-emerald-600" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-3">Upgrade to Premium</h2>
                    <p className="text-sm sm:text-base text-slate-600 mb-6">Upgrade to access unlimited detailed reports and advanced analytics.</p>
                    <button onClick={handleUpgrade} disabled={isProcessing} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700">
                        <CreditCard size={20} className="inline mr-2" />
                        {isProcessing ? "Processing..." : "Upgrade Now"}
                    </button>
                    <button onClick={onClose} className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 mt-3">
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Report Details Modal ---
function ReportDetailsModal({ report, onClose, onViewFull }: { report: any, onClose: () => void, onViewFull: () => void }) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);

    useEffect(() => {
        const initMap = async () => {
            if (!mapRef.current || mapInstance.current) return;
            try {
                const L = (await import('leaflet')).default;
                const [lat, lng] = report.coordinates.split(',').map((s: string) => parseFloat(s.trim()));
                const map = L.map(mapRef.current, { center: [lat, lng], zoom: 14, zoomControl: false, attributionControl: false });
                mapInstance.current = map;
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                L.marker([lat, lng]).addTo(map).bindPopup(report.fieldName).openPopup();
            } catch (e) { console.error(e); }
        };
        initMap();
        return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
    }, [report]);

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
            backgroundColor: ['rgba(255, 159, 64, 0.7)', 'rgba(255, 99, 132, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(75, 192, 192, 0.7)'],
            borderRadius: 6,
        }]
    };

    const recommendations = generateRecommendationsArray(report);
    // FIX: Show 14 days in modal
    const forecast = report.results?.risk_ml?.weather_forecast?.daily || report.results?.weather_forecast?.daily || [];

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-4 sm:p-6 border-b flex justify-between items-start sticky top-0 bg-white z-10">
                    <div>
                        <h2 className="text-base sm:text-xl font-bold">Report Details</h2>
                        <h3 className="text-lg sm:text-2xl font-bold mt-1">{report.crop} | <span className="text-emerald-700">{report.fieldName}</span></h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                </div>

                <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
                    <div className="grid md:grid-cols-2 gap-4 sm:gap-8">
                        <div className="h-48 sm:h-64 rounded-xl overflow-hidden border bg-slate-100 relative">
                            <div ref={mapRef} className="w-full h-full" />
                            <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 text-xs rounded shadow font-bold z-[1000]">{report.coordinates}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                            <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border">
                                <p className="text-xs font-bold text-slate-500 uppercase">Field Area</p>
                                <p className="text-base sm:text-xl font-bold">{report.area}</p>
                            </div>
                            <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border">
                                <p className="text-xs font-bold text-slate-500 uppercase">Growth Stage</p>
                                <p className="text-base sm:text-xl font-bold text-emerald-600 uppercase">{report.stage}</p>
                            </div>
                            <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border">
                                <p className="text-xs font-bold text-slate-500 uppercase">Peak NDVI</p>
                                <p className="text-base sm:text-xl font-bold">{report.peakNDVI}</p>
                            </div>
                            <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border">
                                <p className="text-xs font-bold text-slate-500 uppercase">Risk Level</p>
                                <p className={`text-base sm:text-xl font-bold ${report.riskLevel.includes('Low') ? 'text-emerald-500' : 'text-yellow-600'}`}>{report.riskLevel}</p>
                            </div>
                        </div>
                    </div>

                    <hr />

                    <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
                        <div>
                            <h4 className="font-bold mb-4 flex items-center gap-2"><TrendingUp size={20} className="text-emerald-600" /> Risk Analysis</h4>
                            <div className="h-48 sm:h-64 border rounded-xl p-3 sm:p-4">
                                <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }} />
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4 flex items-center gap-2"><AlertTriangle size={20} className="text-emerald-600" /> Recommendations</h4>
                            <div className="bg-emerald-50 rounded-xl p-4 sm:p-6 border h-48 sm:h-64 overflow-y-auto">
                                <ul className="space-y-3">
                                    {recommendations.map((rec: string, i: number) => (
                                        <li key={i} className="flex gap-3 text-xs sm:text-sm text-emerald-900">
                                            <i className="fa-solid fa-check-circle mt-1 text-emerald-500 shrink-0"></i>
                                            {rec}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <hr />

                    <div>
                        <h4 className="font-bold mb-4 flex items-center gap-2"><Thermometer size={20} className="text-emerald-600" /> 14-Day Weather Forecast</h4>
                        {forecast.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 sm:gap-3">
                                {forecast.slice(0, 14).map((day: any, i: number) => {
                                    const date = day.date ? new Date(day.date) : new Date();
                                    return (
                                        <div key={i} className="bg-white border rounded-xl p-2 sm:p-3 text-center">
                                            <p className="text-xs font-bold text-slate-500 mb-1">{date.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                                            <div className="my-2 flex justify-center">
                                                {(day.precipitation_sum || 0) > 0 ? <Droplets size={20} className="text-blue-500" /> : <Wind size={20} className="text-emerald-500" />}
                                            </div>
                                            <div className="text-xs sm:text-sm font-bold">
                                                {(day.temperature_max || 0).toFixed(0)}° <span className="text-slate-400 text-xs">/ {(day.temperature_min || 0).toFixed(0)}°</span>
                                            </div>
                                            <p className="text-xs text-blue-500 mt-1 font-bold">
                                                {(day.precipitation_sum || 0) > 7 ? "Rain" : `${(day.precipitation_sum || 0).toFixed(1)} mm`}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed text-slate-400">No weather data available.</div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t">
                        <button onClick={onClose} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700">Close Report</button>
                        <button onClick={onViewFull} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 flex items-center justify-center gap-2">
                            <Download size={18} /> See Full Report
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}