"use client";

import NDVIImagePanel from '@/components/NDVIImagePanel';
import { db, useAuth } from '@/lib/firebase';
import { checkIsRainy } from '@/lib/weather-logic';
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
import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    CloudRain,
    Download,
    Landmark,
    MapPin,
    Printer,
    Satellite,
    Sun,
    Thermometer,
    TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatDAS(das: number): string {
    if (das < 0) return `Pre-planting (${Math.abs(das)}d until planting)`;
    return `${das} days`;
}

function riskColor(level: string): string {
    const l = level?.toLowerCase() || '';
    if (l.includes('low'))      return 'bg-green-500 border-green-700 text-white';
    if (l.includes('moderate') || l.includes('medium'))
                                return 'bg-yellow-400 border-yellow-600 text-slate-900';
    return 'bg-red-500 border-red-700 text-white';
}

function healthBadge(health: string): string {
    const h = health?.toLowerCase() || '';
    if (h === 'excellent') return 'bg-green-100 text-green-800';
    if (h === 'good')      return 'bg-emerald-100 text-emerald-800';
    return 'bg-yellow-100 text-yellow-800';
}

function signalBadge(signal: string): string {
    const s = signal?.toLowerCase() || '';
    if (['excellent', 'wet', 'high', 'healthy'].includes(s)) return 'bg-green-100 text-green-800';
    if (['good', 'moderate'].includes(s))                     return 'bg-blue-100 text-blue-800';
    if (['alert', 'dry', 'low', 'damaged'].includes(s))       return 'bg-red-100 text-red-800';
    if (['stressed'].includes(s))                             return 'bg-yellow-100 text-yellow-800';
    return 'bg-slate-100 text-slate-600';
}

function riskPill(level: string): string {
    const l = level?.toLowerCase() || '';
    if (l === 'low')    return 'bg-green-100 text-green-800';
    if (l === 'medium') return 'bg-yellow-100 text-yellow-800';
    if (l === 'high')   return 'bg-red-100 text-red-800';
    return 'bg-slate-100 text-slate-600';
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function FullReportPage() {
    const { reportId } = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);

    // ── Fetch Firestore doc ──────────────────
    useEffect(() => {
        const fetchReport = async () => {
            if (authLoading) return;
            if (!user) { router.push('/signin'); return; }
            if (!reportId || !db) { setLoading(false); return; }

            try {
                const snap = await getDoc(doc(db, 'assessments', reportId as string));
                if (!snap.exists()) { setLoading(false); return; }

                const d = snap.data();

                // ── Satellite block (from our new backend) ──
                // Stored at: results.satellite  (set by app.py fields_endpoint)
                // Firestore: results.satellite = outer wrapper;
                //            results.satellite.satellite = inner data (ndvi, sar_features, etc.)
                const satOuter = d.results?.satellite          || {};
                const sat      = satOuter.satellite             || {};
                const ndvi     = sat.ndvi                       || {};
                const sarF     = sat.sar_features               || {};
                const cropHlt  = sat.crop_health                || {};

                // ── Intelligence block ──────────────────────
                // Stored at: results.satellite.satellite.intelligence
                const intel   = sat.intelligence    || {};
                const signals = intel.signals       || {};
                const risks   = intel.risks         || {};
                const overall = intel.overall       || {};

                // ── Risk ML block (existing system) ─────────
                const riskML      = d.results?.risk_ml || {};
                const riskAssess  = riskML.risk_assessment?.[d.cropType?.toUpperCase()] || {};
                const components  = riskAssess.components || {};

                // ── Weather ─────────────────────────────────
                const forecast        = riskML.weather_forecast?.daily || [];
                const monthlyForecast = riskML.weather_forecast?.monthly || [];

                // ── AI Guidance from intelligence model ─────
                // Build actionable recommendations from the intelligence signals + risks
                const guidance: string[] = [];

                if (overall.health === 'at_risk' || overall.health === 'poor') {
                    guidance.push(`Crop health is ${overall.health.replace('_', ' ')} — increase monitoring frequency and inspect the field for visible stress signs.`);
                }
                if (risks.drought === 'high') {
                    guidance.push('High drought risk detected. Consider irrigation if available, and apply mulching to retain soil moisture.');
                } else if (risks.drought === 'medium') {
                    guidance.push('Moderate drought risk. Monitor soil moisture and prepare irrigation as a contingency.');
                }
                if (risks.damage === 'high') {
                    guidance.push('High damage risk. Inspect for pest or disease pressure and consider protective measures.');
                } else if (risks.damage === 'medium') {
                    guidance.push('Moderate damage risk detected. Scout field edges and apply preventive treatments if needed.');
                }
                if (signals.moisture === 'dry') {
                    guidance.push('SAR backscatter indicates dry soil conditions. Water stress may be developing.');
                }
                if (signals.structure === 'damaged') {
                    guidance.push('Crop canopy structure appears damaged in SAR data. Physical inspection recommended.');
                } else if (signals.structure === 'stressed') {
                    guidance.push('Canopy structure shows stress signals. Check for lodging, compaction, or waterlogging.');
                }
                if (signals.ndvi === 'alert') {
                    const das = intel.days_after_planting || 0;
                    if (das < 14) {
                        guidance.push(`NDVI of ${ndvi.mean_ndvi?.toFixed(3)} is expected this early (day ${das}) — crop is still establishing. Target NDVI builds from day ~25.`);
                    } else {
                        guidance.push(`NDVI is below the healthy range for ${intel.stage || 'this'} stage. Consider soil testing and top-dressing if nutrient deficiency is suspected.`);
                    }
                }
                if (overall.health === 'excellent') {
                    guidance.push('Crop is developing excellently. Maintain current management practices.');
                } else if (overall.health === 'good') {
                    guidance.push('Crop is in good condition. Continue standard monitoring and agronomic practices.');
                }
                // Fallback from risk_ml if intelligence produced nothing
                if (guidance.length === 0) {
                    if (components.price_volatility > 0.6) guidance.push('Price volatility is high — consider hedging strategies.');
                    if (components.short_term_weather_risk > 0.4) guidance.push('Adverse weather expected — prepare accordingly.');
                    if (riskAssess.risk_level === 'High Risk') guidance.push('Implement comprehensive risk management strategies.');
                    else guidance.push('Maintain standard agricultural practices and monitoring schedule.');
                }

                setReport({
                    id:           snap.id,
                    crop:         d.cropType || 'Unknown',
                    date:         d.createdAt?.toDate?.()?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) || 'N/A',
                    fieldName:    d.fieldLocation || 'Unknown Field',
                    coordinates:  `${d.latitude?.toFixed(6) || '0'}, ${d.longitude?.toFixed(6) || '0'}`,
                    area:         `${d.area_hectares?.toFixed(2) || '0.00'} ha`,
                    plantedDate:  d.datePlanted || 'N/A',
                    fieldCoordinates: d.fieldCoordinates,

                    // Intelligence-derived fields
                    stage:              intel.stage || 'Unknown',
                    daysAfterPlanting:  intel.days_after_planting ?? 0,
                    expectedSeason:     120,  // default; could store in intel if needed
                    signals,
                    risks,
                    overall,
                    intelligenceAvailable: !!intel.stage,

                    // NDVI
                    meanNDVI:       ndvi.mean_ndvi,
                    ndviImageB64:   ndvi.image_b64,
                    ndviIndexB64:   ndvi.index_b64,
                    ndviDate:       ndvi.acquisition_date,
                    bbox:           ndvi.bbox,         // ← passed through to NDVIImagePanel

                    // SAR
                    vvMean:     sarF.vv_mean_db,
                    vhMean:     sarF.vh_mean_db,
                    dataQuality: sarF.data_quality,

                    // Crop health (SAR-derived percentages)
                    soilMoisture:    cropHlt.soil_moisture_estimate,
                    biomass:         cropHlt.biomass_estimate,
                    cropStructure:   cropHlt.crop_structure_index,
                    cropHealthScore: cropHlt.crop_health_score,

                    // Risk ML (existing system)
                    riskLevel:    riskAssess.risk_level || 'Unknown',
                    components,
                    forecast,
                    monthlyForecast,

                    // AI guidance (built above from intelligence)
                    guidance,

                    satellite_monitoring_enabled: d.satellite_monitoring_enabled || false,
                    poly_id:  satOuter.poly_id,
                    field_id: satOuter.field_id,
                });

            } catch (err) {
                console.error('Error fetching report:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [user, reportId, authLoading, router]);

    // ── Map ──────────────────────────────────
    useEffect(() => {
        const initMap = async () => {
            if (!mapRef.current || mapInstance.current || !report) return;
            try {
                const L = (await import('leaflet')).default;
                const [lat, lng] = report.coordinates.split(',').map((s: string) => parseFloat(s.trim()));
                const map = L.map(mapRef.current, { center: [lat, lng], zoom: 15, scrollWheelZoom: false });
                mapInstance.current = map;
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                const marker = L.marker([lat, lng]).addTo(map).bindPopup(report.fieldName);
                if (!report.fieldCoordinates) marker.openPopup();
                if (report.fieldCoordinates) {
                    try {
                        const coords = JSON.parse(report.fieldCoordinates);
                        const layer = L.geoJSON({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: coords } } as any, {
                            style: { color: '#10b981', weight: 3, opacity: 0.8, fillOpacity: 0.2 },
                        }).addTo(map);
                        map.fitBounds(layer.getBounds(), { padding: [20, 20] });
                    } catch { /* ignore */ }
                }
            } catch (e) { console.error('Map init failed', e); }
        };
        initMap();
        return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
    }, [report]);

    // ── Loading / not found ──────────────────
    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
                <Satellite size={48} className="text-emerald-500 animate-pulse mb-4" />
                <div className="text-slate-600 text-lg font-semibold">Generating full report…</div>
            </div>
        );
    }
    if (!user || !report) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 text-center">
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Report Not Found</h1>
                <p className="text-slate-600 mb-6">This report may have been deleted or is inaccessible.</p>
                <Link href="/dashboard/satellite" className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold">Back to Reports</Link>
            </div>
        );
    }

    // ── Chart data (risk ML components) ─────
    const chartData = {
        labels: ['Price Volatility', 'Weather Risk', 'Seasonal Risk', 'Suitability'],
        datasets: [{
            label: 'Risk Level %',
            data: [
                (report.components.price_volatility         || 0) * 100,
                (report.components.short_term_weather_risk  || 0) * 100,
                (report.components.long_term_seasonal_risk  || 0) * 100,
                (report.components.suitability_score        || 0) * 100,
            ],
            backgroundColor: [
                'rgba(255,159,64,0.7)',
                'rgba(255,99,132,0.7)',
                'rgba(255,206,86,0.7)',
                'rgba(75,192,192,0.7)',
            ],
            borderRadius: 8,
            borderWidth: 0,
        }],
    };

    const remainingDays = report.daysAfterPlanting >= 0
        ? Math.max(0, report.expectedSeason - report.daysAfterPlanting)
        : report.expectedSeason;

    // ── Render ────────────────────────────────
    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24">

            {/* Nav */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20 print:hidden">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link href="/dashboard/satellite" className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 font-bold transition-colors">
                        <ArrowLeft size={20} />
                        <span>Satellite Reports</span>
                    </Link>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 sm:px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-slate-50 transition-all">
                            <Printer size={16} /><span className="hidden sm:inline">Print</span>
                        </button>
                        <button className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all">
                            <Download size={16} /><span className="hidden sm:inline">Export PDF</span>
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 mt-8 sm:mt-12 space-y-8">

                {/* ── Header ── */}
                <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-100">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <span className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">Official Assessment</span>
                                <span className="text-slate-400">|</span>
                                <span className="text-slate-500 font-semibold">{report.date}</span>
                            </div>
                            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 mb-2">{report.crop} Analysis</h1>
                            <div className="flex items-center gap-2 text-slate-500 text-lg font-medium">
                                <MapPin className="text-emerald-600" size={24} />
                                <span>{report.fieldName}</span>
                            </div>
                        </div>
                        <div className={`w-full md:w-auto px-6 py-4 rounded-2xl text-center shadow-lg border-b-4 ${riskColor(report.riskLevel)}`}>
                            <span className="text-xs font-black uppercase tracking-tighter opacity-80 block mb-1">Risk Assessment</span>
                            <span className="text-2xl font-black leading-none">{report.riskLevel}</span>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-5 sm:gap-8">

                    {/* ── Left column ── */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Map */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="h-56 sm:h-72 md:h-96 w-full bg-slate-200 relative">
                                <div ref={mapRef} className="w-full h-full z-10" />
                                <div className="absolute top-4 right-4 bg-white/95 px-4 py-2 rounded-xl text-xs font-bold shadow-2xl z-20 border border-slate-100 text-slate-600">
                                    {report.coordinates}
                                </div>
                            </div>
                            <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {[
                                    ['Total Area', report.area],
                                    ['Analysis Type', 'Field Boundary'],
                                    ['Monitoring', report.satellite_monitoring_enabled ? 'Satellite' : 'Manual'],
                                    ['Data Quality', report.dataQuality != null ? `${report.dataQuality}%` : 'N/A'],
                                ].map(([label, value]) => (
                                    <div key={label} className="space-y-1">
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</p>
                                        <p className="text-lg font-black text-slate-800">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── NDVI Satellite Images ── */}
                        {report.ndviImageB64 && (
                            <NDVIImagePanel
                                imageB64={report.ndviImageB64}
                                meanNDVI={report.meanNDVI}
                                acquisitionDate={report.ndviDate}
                                bbox={report.bbox}
                                fieldCoordinates={report.fieldCoordinates}
                            />
                        )}

                        {/* ── SAR Crop Health Bars ── */}
                        {(report.soilMoisture != null || report.biomass != null) && (
                            <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-100">
                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3 mb-6">
                                    <Activity className="text-emerald-600" size={24} />
                                    SAR Crop Health Indicators
                                </h2>
                                <div className="space-y-5">
                                    {[
                                        { label: 'Soil moisture',    value: report.soilMoisture,    color: '#1D9E75' },
                                        { label: 'Biomass estimate', value: report.biomass,          color: '#EF9F27' },
                                        { label: 'Crop structure',   value: report.cropStructure,    color: '#378ADD' },
                                    ].map(({ label, value, color }) => value != null && (
                                        <div key={label}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-slate-500 font-medium">{label}</span>
                                                <span className="font-black text-slate-800">{value.toFixed(1)}%</span>
                                            </div>
                                            <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, background: color }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {report.vvMean != null && (
                                    <div className="mt-6 grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 rounded-xl p-4">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">SAR VV</p>
                                            <p className="text-xl font-black text-slate-900">{report.vvMean.toFixed(2)} dB</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-4">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">SAR VH</p>
                                            <p className="text-xl font-black text-slate-900">{report.vhMean?.toFixed(2)} dB</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Risk ML Chart ── */}
                        <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-100">
                            <div className="mb-6">
                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3">
                                    <TrendingUp className="text-emerald-600" size={24} />
                                    Advanced Risk Analysis
                                </h2>
                                <p className="text-slate-500 font-medium mt-1">Multi-factor algorithmic assessment for {report.crop}.</p>
                            </div>
                            <div className="h-60 sm:h-80 w-full">
                                <Bar data={chartData} options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: false } },
                                    scales: {
                                        y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.03)' }, ticks: { font: { weight: 'bold' }, color: '#94A3B8' } },
                                        x: { grid: { display: false }, ticks: { font: { weight: 'bold' }, color: '#1E293B' } },
                                    },
                                }} />
                            </div>
                        </div>

                        {/* ── 14-Day Weather ── */}
                        <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-100">
                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-3 mb-6">
                                <Thermometer className="text-emerald-600" size={24} />
                                14-Day Environmental Forecast
                            </h2>
                            {report.forecast.length > 0 ? (
                                <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-3">
                                    {report.forecast.slice(0, 14).map((day: any, i: number) => {
                                        const date = new Date(day.date);
                                        const prevDay = i > 0 ? report.forecast[i - 1] : undefined;
                                        const isRainy = checkIsRainy(day, prevDay);
                                        return (
                                            <div key={i} className="bg-slate-50 rounded-xl p-2 sm:p-4 text-center border border-slate-100 hover:border-emerald-200 transition-colors">
                                                <p className="text-xs font-black text-slate-400 uppercase mb-2">
                                                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                                </p>
                                                <div className="bg-white w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                                    {isRainy ? <CloudRain size={20} className="text-blue-500" /> : <Sun size={20} className="text-amber-500" />}
                                                </div>
                                                <p className="text-base font-black text-slate-800">{(day.temperature_max || 0).toFixed(0)}°</p>
                                                <p className="text-xs text-slate-400 font-bold mb-2">/ {(day.temperature_min || 0).toFixed(0)}°</p>
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${isRainy ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {isRainy ? 'Rain' : 'Dry'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold">
                                    Weather forecast data currently unavailable.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Right column ── */}
                    <div className="space-y-8">

                        {/* Field Vitals */}
                        <div className="bg-emerald-900 text-white rounded-3xl p-5 sm:p-8 shadow-2xl relative overflow-hidden">
                            <Activity size={100} className="absolute -bottom-4 -right-4 opacity-10" />
                            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                                <Satellite size={20} /> Field Vitals
                            </h3>
                            <div className="space-y-5">
                                {[
                                    ['Growth stage',       report.stage || 'Unknown'],
                                    ['Days after planting', formatDAS(report.daysAfterPlanting)],
                                    ['Cycle remaining',    `${remainingDays} days`],
                                    ['Mean NDVI',          report.meanNDVI != null ? report.meanNDVI.toFixed(4) : 'N/A'],
                                ].map(([label, value]) => (
                                    <div key={label} className="flex justify-between items-center border-b border-emerald-800 pb-4 last:border-0">
                                        <span className="text-emerald-300 font-bold text-sm">{label}</span>
                                        <span className="font-black text-right">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Intelligence signals */}
                        {report.intelligenceAvailable && (
                            <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-100">
                                <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-5 flex items-center gap-2">
                                    <Activity className="text-emerald-600" size={20} />
                                    Intelligence signals
                                </h3>
                                <div className="space-y-3">
                                    {Object.entries(report.signals).map(([key, value]) => (
                                        <div key={key} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                                            <span className="text-sm text-slate-500 capitalize">{key}</span>
                                            <span className={`text-xs font-black px-3 py-1 rounded-full capitalize ${signalBadge(value as string)}`}>{value as string}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-5 pt-5 border-t border-slate-100 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-500">Drought risk</span>
                                        <span className={`text-xs font-black px-3 py-1 rounded-full capitalize ${riskPill(report.risks.drought)}`}>{report.risks.drought}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-500">Damage risk</span>
                                        <span className={`text-xs font-black px-3 py-1 rounded-full capitalize ${riskPill(report.risks.damage)}`}>{report.risks.damage}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-500">Overall health</span>
                                        <span className={`text-xs font-black px-3 py-1 rounded-full capitalize ${healthBadge(report.overall.health)}`}>{report.overall.health?.replace('_', ' ')}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-500">Confidence</span>
                                        <span className="text-sm font-black text-slate-700 capitalize">{report.overall.confidence}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── AI Guidance (from intelligence model) ── */}
                        <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-100">
                            <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-5 flex items-center gap-3">
                                <AlertTriangle className="text-yellow-500" size={22} />
                                AI Guidance
                            </h3>
                            <ul className="space-y-4">
                                {report.guidance.map((rec: string, i: number) => (
                                    <li key={i} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                        <div className="bg-emerald-100 w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-emerald-600 font-black text-xs">
                                            {i + 1}
                                        </div>
                                        <p className="text-sm font-bold text-slate-700 leading-relaxed">{rec}</p>
                                    </li>
                                ))}
                            </ul>
                            {report.intelligenceAvailable && (
                                <p className="text-xs text-slate-400 mt-4">
                                    Guidance generated from satellite SAR + NDVI fusion model · Stage: {report.stage} · Day {report.daysAfterPlanting}
                                </p>
                            )}
                        </div>

                        {/* Verification */}
                        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 sm:p-8">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="bg-white p-3 rounded-2xl shadow-sm">
                                    <Landmark className="text-emerald-600" />
                                </div>
                                <h4 className="font-black text-slate-800">Verification</h4>
                            </div>
                            <p className="text-xs text-slate-500 font-bold leading-relaxed mb-4">
                                Report generated using multi-spectral satellite imagery (Sentinel-1 SAR + Sentinel-2 NDVI) and machine learning models proprietary to Agricheck.
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                <span className="bg-white border border-slate-200 px-3 py-1 rounded-full text-[10px] font-black text-slate-400">
                                    ID: {report.id.substring(0, 8).toUpperCase()}
                                </span>
                                <span className="bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full text-[10px] font-black text-emerald-700">
                                    Sentinel Hub
                                </span>
                                {report.ndviDate && (
                                    <span className="bg-blue-100 border border-blue-200 px-3 py-1 rounded-full text-[10px] font-black text-blue-700">
                                        SAR {new Date(report.ndviDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 6-Month Outlook */}
                        {report.monthlyForecast.length > 0 && (
                            <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-slate-100">
                                <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-5 flex items-center gap-3">
                                    <Thermometer className="text-emerald-600" size={22} />
                                    6-Month Outlook
                                </h3>
                                <div className="h-52 sm:h-64">
                                    <Bar
                                        data={{
                                            labels: report.monthlyForecast.slice(0, 6).map((m: any) =>
                                                new Date(m.month).toLocaleDateString('en-US', { month: 'short' })
                                            ),
                                            datasets: [
                                                {
                                                    label: 'Temp anomaly (°C)',
                                                    data: report.monthlyForecast.slice(0, 6).map((m: any) => m.temperature?.mean_anomaly?.[0] || 0),
                                                    backgroundColor: 'rgba(239,68,68,0.7)',
                                                    borderRadius: 6,
                                                },
                                                {
                                                    label: 'Precip anomaly (mm)',
                                                    data: report.monthlyForecast.slice(0, 6).map((m: any) => m.precipitation?.mean_anomaly?.[0] || 0),
                                                    backgroundColor: 'rgba(59,130,246,0.7)',
                                                    borderRadius: 6,
                                                },
                                            ],
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: { display: true, position: 'top', labels: { font: { weight: 'bold', size: 11 }, color: '#1E293B', boxWidth: 12, padding: 10 } },
                                            },
                                            scales: {
                                                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { weight: 'bold', size: 10 }, color: '#64748B' } },
                                                x: { grid: { display: false }, ticks: { font: { weight: 'bold', size: 10 }, color: '#1E293B' } },
                                            },
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </main>
        </div>
    );
}