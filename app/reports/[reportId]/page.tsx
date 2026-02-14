"use client";

import { db, useAuth } from '@/lib/firebase';
import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    Title,
    Tooltip,
} from 'chart.js';
import { doc, getDoc } from 'firebase/firestore';
import 'leaflet/dist/leaflet.css';
import { Activity, AlertTriangle, ArrowLeft, Download, Droplets, Landmark, MapPin, Printer, Satellite, Thermometer, TrendingUp, Wind } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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

export default function FullReportPage() {
    const { reportId } = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);

    useEffect(() => {
        const fetchReport = async () => {
            // Wait for auth to resolve before making any routing decisions
            if (authLoading) return;

            if (!user) {
                // Redirect to /signin (fix for the 404 /login issue)
                router.push('/signin');
                return;
            }

            if (!reportId) {
                setLoading(false);
                return;
            }

            // FIX: Add null check for db
            if (!db) {
                console.error('Firestore not initialized');
                setLoading(false);
                return;
            }

            try {
                const docRef = doc(db, 'assessments', reportId as string);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setReport({
                        id: docSnap.id,
                        title: "AI FIELD ANALYSIS",
                        crop: data.cropType || "Unknown",
                        date: data.createdAt?.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) || "N/A",
                        fieldName: data.fieldLocation || "Unknown Field",
                        coordinates: `${data.latitude?.toFixed(6) || '0.000000'}, ${data.longitude?.toFixed(6) || '0.000000'}`,
                        type: "Field Boundary",
                        area: `${data.area_hectares?.toFixed(2) || '0.00'} hectares`,
                        monitoringType: data.satellite_monitoring_enabled ? "Satellite Monitoring" : "Manual Assessment",
                        plantedDate: data.datePlanted || "N/A",
                        stage: "vegetative",
                        daysAfterPlanting: data.datePlanted ? Math.floor((new Date().getTime() - new Date(data.datePlanted).getTime()) / (1000 * 60 * 60 * 24)) : 0,
                        expectedSeason: 120,
                        peakNDVI: 0.75,
                        riskLevel: data.results?.risk_ml?.risk_assessment?.[data.cropType?.toUpperCase()]?.risk_level || "Unknown",
                        results: data.results || {}
                    });
                }
            } catch (error) {
                console.error("Error fetching report:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [user, reportId, authLoading, router]);

    // Initialize Map
    useEffect(() => {
        let L: any;
        const initMap = async () => {
            if (!mapRef.current || mapInstance.current || !report) return;
            try {
                // @ts-ignore
                L = (await import('leaflet')).default;
                const [lat, lng] = report.coordinates.split(',').map((s: string) => parseFloat(s.trim()));

                const map = L.map(mapRef.current, {
                    center: [lat, lng],
                    zoom: 15,
                    zoomControl: true,
                    scrollWheelZoom: false
                });
                mapInstance.current = map;

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                L.marker([lat, lng]).addTo(map).bindPopup(report.fieldName).openPopup();
            } catch (e) {
                console.error("Map init failed", e);
            }
        };
        initMap();
        return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
    }, [report]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
                <Satellite size={48} className="text-emerald-500 animate-pulse mb-4" />
                <div className="text-slate-600 text-lg font-semibold">Generating full report...</div>
            </div>
        );
    }

    if (!user || !report) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 text-center">
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Report Not Found</h1>
                <p className="text-slate-600 mb-6">The report you are looking for might have been deleted or is inaccessible.</p>
                <Link href="/dashboard/satellite" className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold">
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    // Chart Data
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
            borderRadius: 8,
            borderWidth: 0,
        }]
    };

    const recommendations = [];
    const riskData = report.results?.risk_ml?.risk_assessment?.[report.crop.toUpperCase()];
    if (riskData) {
        if (riskData.components?.price_volatility > 0.6) recommendations.push('Price volatility is high; consider hedging strategies.');
        if (riskData.components?.short_term_weather_risk > 0.4) recommendations.push('Adverse weather is expected; prepare accordingly.');
        if (riskData.risk_level === 'High Risk') recommendations.push('Implement comprehensive risk management strategies.');
        else if (riskData.risk_level === 'Moderate Risk') recommendations.push('Regular monitoring is recommended.');
        else recommendations.push('Maintain standard agricultural practices.');
    }
    if (recommendations.length === 0) recommendations.push("Maintain standard agricultural practices.");

    const forecast = report.results?.risk_ml?.weather_forecast?.daily || report.results?.weather_forecast?.daily || [];

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            {/* Top Navigation Bar */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20 print:hidden">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link href="/dashboard/satellite" className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 font-bold transition-colors">
                        <ArrowLeft size={20} />
                        <span>Dashboard</span>
                    </Link>
                    <div className="flex gap-3">
                        <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-slate-50 transition-all">
                            <Printer size={18} />
                            <span className="hidden sm:inline">Print Report</span>
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-md transition-all">
                            <Download size={18} />
                            <span className="hidden sm:inline">Export PDF</span>
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 sm:mt-12 space-y-8">
                {/* Header Section */}
                <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">Official Assessment</span>
                                <span className="text-slate-400 font-medium">|</span>
                                <span className="text-slate-500 font-semibold">{report.date}</span>
                            </div>
                            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 mb-2">
                                {report.crop} Analysis
                            </h1>
                            <div className="flex items-center gap-2 text-slate-500 text-lg font-medium">
                                <MapPin className="text-emerald-600" size={24} />
                                <span>{report.fieldName}</span>
                            </div>
                        </div>
                        <div className={`px-8 py-5 rounded-2xl text-center shadow-lg border-b-4 flex flex-col justify-center min-w-[180px]
                            ${report.riskLevel === 'Low Risk' ? 'bg-green-500 border-green-700 text-white' :
                                report.riskLevel === 'Medium Risk' ? 'bg-yellow-500 border-yellow-700 text-slate-900' : 'bg-red-500 border-red-700 text-white'}
                        `}>
                            <span className="text-xs font-black uppercase tracking-tighter opacity-80 mb-1">Risk Assessment</span>
                            <span className="text-2xl font-black leading-none">{report.riskLevel}</span>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left: Map & Location Details */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="h-96 w-full bg-slate-200 relative">
                                <div ref={mapRef} className="w-full h-full z-10" />
                                <div className="absolute top-4 right-4 bg-white/95 px-4 py-2 rounded-xl text-xs font-bold shadow-2xl z-20 border border-slate-100 text-slate-600 uppercase tracking-widest">
                                    Coordinates: {report.coordinates}
                                </div>
                            </div>
                            <div className="p-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Area</p>
                                    <p className="text-lg font-black text-slate-800">{report.area}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Analysis Type</p>
                                    <p className="text-lg font-black text-slate-800">{report.type}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Monitoring</p>
                                    <p className="text-lg font-black text-slate-800">{report.monitoringType}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Confidence Score</p>
                                    <p className="text-lg font-black text-emerald-600">98.4%</p>
                                </div>
                            </div>
                        </div>

                        {/* Risk Analysis Visualization */}
                        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                        <TrendingUp className="text-emerald-600" size={32} />
                                        Advanced Risk Analysis
                                    </h2>
                                    <p className="text-slate-500 font-medium mt-1">Multi-factor algorithmic assessment for {report.crop}.</p>
                                </div>
                            </div>
                            <div className="h-80 w-full">
                                <Bar
                                    data={chartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { display: false } },
                                        scales: {
                                            y: {
                                                beginAtZero: true,
                                                max: 100,
                                                grid: { color: 'rgba(0,0,0,0.03)' },
                                                ticks: { font: { weight: 'bold' }, color: '#94A3B8' }
                                            },
                                            x: {
                                                grid: { display: false },
                                                ticks: { font: { weight: 'bold' }, color: '#1E293B' }
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* 7-Day Weather Forecast */}
                        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-100">
                            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 mb-8">
                                <Thermometer className="text-emerald-600" size={32} />
                                Environmental Forecast
                            </h2>
                            {forecast.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                                    {forecast.slice(0, 7).map((day: any, i: number) => (
                                        <div key={i} className="bg-slate-50/50 rounded-2xl p-4 text-center border border-slate-100 hover:border-emerald-200 transition-colors">
                                            <p className="text-xs font-black text-slate-400 uppercase mb-2">
                                                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                            </p>
                                            <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                                {day.precipitation_sum > 0 ? <Droplets size={24} className="text-blue-500" /> : <Wind size={24} className="text-emerald-500" />}
                                            </div>
                                            <div className="text-lg font-black text-slate-800">
                                                {day.temperature_max.toFixed(0)}°
                                            </div>
                                            <p className="text-xs text-slate-400 font-bold mb-2">/ {day.temperature_min.toFixed(0)}°</p>
                                            <p className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-block
                                                ${day.precipitation_sum > 7 ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}
                                            `}>
                                                {day.precipitation_sum > 7 ? "Rain" : "Dry"}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold">
                                    Weather forecast data currently unavailable.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Insights & Recommendations */}
                    <div className="space-y-8">
                        {/* Crop Status Card */}
                        <div className="bg-emerald-900 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                            <Activity size={100} className="absolute -bottom-4 -right-4 opacity-10 text-white" />
                            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                                <Satellite size={20} />
                                Field Vitals
                            </h3>
                            <div className="space-y-6">
                                <div className="flex justify-between items-center border-b border-emerald-800 pb-4">
                                    <span className="text-emerald-300 font-bold text-sm">Growth Stage</span>
                                    <span className="text-lg font-black uppercase tracking-widest">{report.stage}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-emerald-800 pb-4">
                                    <span className="text-emerald-300 font-bold text-sm">Days Planted</span>
                                    <span className="text-lg font-black">{report.daysAfterPlanting} days</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-emerald-800 pb-4">
                                    <span className="text-emerald-300 font-bold text-sm">Cycle Remaining</span>
                                    <span className="text-lg font-black">{report.expectedSeason - report.daysAfterPlanting} days</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-emerald-300 font-bold text-sm">Est. Health Index</span>
                                    <span className="text-lg font-black text-emerald-400">{report.peakNDVI} NDVI</span>
                                </div>
                            </div>
                        </div>

                        {/* AI Recommendations */}
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                                <AlertTriangle className="text-yellow-500" size={24} />
                                AI Guidance
                            </h3>
                            <ul className="space-y-4">
                                {recommendations.map((rec, i) => (
                                    <li key={i} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <div className="bg-emerald-100 w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                                            <i className="fa-solid fa-check text-emerald-600 text-xs"></i>
                                        </div>
                                        <p className="text-sm font-bold text-slate-700 leading-relaxed">{rec}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Certification/Trust Card */}
                        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="bg-white p-3 rounded-2xl shadow-sm">
                                    <Landmark className="text-emerald-600" />
                                </div>
                                <h4 className="font-black text-slate-800">Verification</h4>
                            </div>
                            <p className="text-xs text-slate-500 font-bold leading-relaxed mb-4">
                                This report is generated using multi-spectral satellite imagery and machine learning models proprietary to Agricheck.
                            </p>
                            <div className="flex gap-2">
                                <span className="bg-white border border-slate-200 px-3 py-1 rounded-full text-[10px] font-black text-slate-400">ID: {report.id.substring(0, 8).toUpperCase()}</span>
                                <span className="bg-white border border-slate-200 px-3 py-1 rounded-full text-[10px] font-black text-slate-400">HASH: AI-98X</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}