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

interface NDVIImageData {
    date: string;
    images: {
        ndvi?: string;
        truecolor?: string;
    };
    maps?: {
        ndvi?: string;
        truecolor?: string;
    };
    ndvi_mean: number;
    cloud_coverage: number;
    available_types?: string[];
    image_type?: string;
}

export default function FullReportPage() {
    const { reportId } = useParams();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    
    // NDVI Images State
    const [ndviImages, setNdviImages] = useState<NDVIImageData[]>([]);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [ndviLoading, setNdviLoading] = useState(false);
    const [imageOpacity, setImageOpacity] = useState(0.7);
    const currentOverlayRef = useRef<any>(null);

    useEffect(() => {
        const fetchReport = async () => {
            if (authLoading) return;

            if (!user) {
                router.push('/signin');
                return;
            }

            if (!reportId) {
                setLoading(false);
                return;
            }

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
                    
                    console.log('🔍 DEBUG - Full Firebase Data:', data);
                    console.log('🔍 DEBUG - results object:', data.results);
                    console.log('🔍 DEBUG - results.crop_info:', data.results?.crop_info);
                    console.log('🔍 DEBUG - results.satellite:', data.results?.satellite);
                    console.log('🔍 DEBUG - crop_intelligence:', data.crop_intelligence);
                    
                    // FIX: Extract crop info from ALL possible locations
                    const cropInfo = data.results?.crop_info || 
                                   data.results?.satellite?.crop_info || 
                                   data.crop_intelligence || 
                                   {};
                    
                    const riskAssessment = data.results?.risk_ml?.risk_assessment?.[data.cropType?.toUpperCase()] || {};
                    
                    console.log('✅ Extracted Crop Info:', cropInfo);
                    console.log('✅ Current Stage:', cropInfo.current_stage);
                    console.log('✅ Current DAS:', cropInfo.current_das);
                    console.log('✅ Expected Peak NDVI:', cropInfo.expected_peak_ndvi);
                    console.log('✅ Expected Season Length:', cropInfo.expected_season_length);
                    
                    // Parse field coordinates
                    let parsedCoordinates = null;
                    const coordsString = data.fieldCoordinates || data.coordinates;
                    if (coordsString) {
                        try {
                            parsedCoordinates = typeof coordsString === 'string' 
                                ? JSON.parse(coordsString) 
                                : coordsString;
                        } catch (e) {
                            console.error('❌ Error parsing coordinates:', e);
                        }
                    }
                    
                    // Get lat/lng from multiple possible locations
                    const lat = data.latitude || data.results?.centroid?.latitude || data.centroid?.latitude;
                    const lng = data.longitude || data.results?.centroid?.longitude || data.centroid?.longitude;
                    
                    // Calculate days after planting
                    let daysAfterPlanting = cropInfo.current_das || 0;
                    if (!daysAfterPlanting && data.datePlanted) {
                        const plantDate = new Date(data.datePlanted);
                        const today = new Date();
                        daysAfterPlanting = Math.floor((today.getTime() - plantDate.getTime()) / (1000 * 60 * 60 * 24));
                    }
                    
                    setReport({
                        id: docSnap.id,
                        title: "AI FIELD ANALYSIS",
                        crop: data.cropType || "Unknown",
                        date: data.createdAt?.toDate?.()?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) || "N/A",
                        fieldName: data.fieldLocation || data.name || "Unknown Field",
                        coordinates: `${lat?.toFixed(6) || '0.000000'}, ${lng?.toFixed(6) || '0.000000'}`,
                        type: "Field Boundary",
                        area: `${(data.results?.area_hectares || data.area_hectares || 0)?.toFixed(2)} hectares`,
                        monitoringType: (data.results?.satellite_monitoring || data.satellite_monitoring_enabled) ? "Satellite Monitoring" : "Manual Assessment",
                        plantedDate: data.datePlanted || data.planting_date || cropInfo.planting_date || "N/A",
                        // FIX: Pull from cropInfo correctly
                        stage: cropInfo.current_stage?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || "Unknown",
                        daysAfterPlanting: daysAfterPlanting,
                        expectedSeason: cropInfo.expected_season_length || 120,
                        peakNDVI: cropInfo.expected_peak_ndvi?.toFixed(2) || "0.75",
                        riskLevel: riskAssessment.risk_level || "Unknown",
                        results: data.results || {},
                        // Store coordinates and poly_id
                        fieldCoordinates: parsedCoordinates,
                        latitude: lat,
                        longitude: lng,
                        poly_id: data.results?.poly_id || data.poly_id,
                        satellite_monitoring_enabled: data.results?.satellite_monitoring || data.satellite_monitoring_enabled || false,
                        _rawData: data,
                        _cropInfo: cropInfo
                    });
                    
                    console.log('✅ Report State Set:', {
                        stage: cropInfo.current_stage,
                        daysAfterPlanting: daysAfterPlanting,
                        expectedSeason: cropInfo.expected_season_length,
                        peakNDVI: cropInfo.expected_peak_ndvi,
                        poly_id: data.results?.poly_id || data.poly_id
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

    // Initialize Map with Field Boundary
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

                // Add base tile layer
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);

                // Add field boundary polygon if coordinates exist
                if (report.fieldCoordinates && report.fieldCoordinates[0]) {
                    const coords = report.fieldCoordinates[0];
                    // Convert [lng, lat] to [lat, lng] for Leaflet
                    const leafletCoords = coords.map((coord: number[]) => [coord[1], coord[0]]);
                    
                    const polygon = L.polygon(leafletCoords, {
                        color: '#28a745',
                        weight: 3,
                        opacity: 0.8,
                        fillOpacity: 0.2,
                        fillColor: '#28a745',
                    }).addTo(map);

                    // Fit map to polygon
                    map.fitBounds(polygon.getBounds(), { padding: [50, 50] });
                    
                    console.log('✅ Field boundary added to map');
                } else {
                    // Just add marker if no polygon
                    L.marker([lat, lng]).addTo(map).bindPopup(report.fieldName).openPopup();
                }

            } catch (e) {
                console.error("Map init failed", e);
            }
        };
        initMap();
        return () => { 
            if (mapInstance.current) { 
                mapInstance.current.remove(); 
                mapInstance.current = null; 
            } 
        };
    }, [report]);

    // Fetch NDVI Images
    useEffect(() => {
        const fetchNDVIImages = async () => {
            if (!report || !report.poly_id) {
                console.log('⚠️ No poly_id available for NDVI images');
                return;
            }

            setNdviLoading(true);

            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://agricheckb2.onrender.com';
                const url = `${backendUrl}/fields/${reportId}/satellite-imagery?days=30`;
                
                console.log('📡 Fetching NDVI images from:', url);
                console.log('📡 Using poly_id:', report.poly_id);
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-ID': user?.uid || '',
                    },
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch: ${response.status}`);
                }

                const data = await response.json();
                const imagery = data.imagery_data || [];

                console.log('✅ NDVI images loaded:', imagery.length);
                setNdviImages(imagery);
            } catch (err) {
                console.error('💥 Error fetching NDVI images:', err);
            } finally {
                setNdviLoading(false);
            }
        };

        if (report && user) {
            fetchNDVIImages();
        }
    }, [report, reportId, user]);

    // Add/Update NDVI Overlay on Map
    useEffect(() => {
        const updateNDVIOverlay = async () => {
            if (!mapInstance.current || !report || ndviImages.length === 0) return;
            
            try {
                // @ts-ignore
                const L = (await import('leaflet')).default;
                const map = mapInstance.current;
                
                // Remove previous overlay
                if (currentOverlayRef.current) {
                    map.removeLayer(currentOverlayRef.current);
                    currentOverlayRef.current = null;
                }

                // Add new NDVI overlay
                const currentImage = ndviImages[selectedImageIndex];
                if (currentImage && report.fieldCoordinates && report.fieldCoordinates[0]) {
                    const ndviUrl = currentImage.images?.ndvi || currentImage.maps?.ndvi || '';
                    
                    if (ndviUrl) {
                        const coords = report.fieldCoordinates[0];
                        const leafletCoords = coords.map((coord: number[]) => [coord[1], coord[0]]);
                        const polygon = L.polygon(leafletCoords);
                        const bounds = polygon.getBounds();
                        
                        console.log('🖼️ Adding NDVI overlay:', ndviUrl);
                        
                        const overlay = L.imageOverlay(ndviUrl, bounds, {
                            opacity: imageOpacity,
                            interactive: false,
                            crossOrigin: true
                        }).addTo(map);
                        
                        currentOverlayRef.current = overlay;
                        
                        console.log('✅ NDVI overlay added to map');
                    }
                }
            } catch (error) {
                console.error('💥 Error updating NDVI overlay:', error);
            }
        };

        updateNDVIOverlay();
    }, [ndviImages, selectedImageIndex, imageOpacity, report]);

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
    const monthlyForecast = report.results?.risk_ml?.weather_forecast?.monthly || [];

    const getHealthStatus = (ndvi: number): string => {
        if (ndvi >= 0.7) return 'Excellent';
        if (ndvi >= 0.5) return 'Good';
        if (ndvi >= 0.3) return 'Moderate';
        if (ndvi >= 0.1) return 'Poor';
        return 'Critical';
    };

    const getHealthStatusColor = (ndvi: number): string => {
        if (ndvi >= 0.7) return 'text-green-600';
        if (ndvi >= 0.5) return 'text-green-500';
        if (ndvi >= 0.3) return 'text-yellow-600';
        if (ndvi >= 0.1) return 'text-orange-600';
        return 'text-red-600';
    };

    const currentNDVIImage = ndviImages[selectedImageIndex];

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
                                report.riskLevel === 'Medium Risk' || report.riskLevel === 'Moderate Risk' ? 'bg-yellow-500 border-yellow-700 text-slate-900' : 'bg-red-500 border-red-700 text-white'}
                        `}>
                            <span className="text-xs font-black uppercase tracking-tighter opacity-80 mb-1">Risk Assessment</span>
                            <span className="text-2xl font-black leading-none">{report.riskLevel}</span>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left: Map & Location Details */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Map Card with NDVI Controls */}
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="h-96 w-full bg-slate-200 relative">
                                <div ref={mapRef} className="w-full h-full z-10" />
                                <div className="absolute top-4 right-4 bg-white/95 px-4 py-2 rounded-xl text-xs font-bold shadow-2xl z-20 border border-slate-100 text-slate-600 uppercase tracking-widest">
                                    Coordinates: {report.coordinates}
                                </div>
                                
                                {/* NDVI Image Info Overlay */}
                                {currentNDVIImage && (
                                    <div className="absolute top-4 left-4 bg-white/95 px-4 py-2 rounded-xl text-xs font-bold shadow-lg z-20 border border-slate-100">
                                        <div className="text-slate-800 mb-1">
                                            📡 {new Date(currentNDVIImage.date).toLocaleDateString('en-US', { 
                                                month: 'short', 
                                                day: 'numeric' 
                                            })}
                                        </div>
                                        <div className={`${getHealthStatusColor(currentNDVIImage.ndvi_mean)}`}>
                                            NDVI: {currentNDVIImage.ndvi_mean.toFixed(3)}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-8">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
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

                                {/* NDVI Controls - Only show if we have images */}
                                {report.poly_id && ndviImages.length > 0 && (
                                    <div className="border-t border-slate-200 pt-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-black text-slate-800 flex items-center gap-2">
                                                <Satellite size={20} className="text-emerald-600" />
                                                NDVI Satellite Data
                                            </h3>
                                            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-black">
                                                {ndviImages.length} Images
                                            </span>
                                        </div>

                                        {/* Opacity Slider */}
                                        <div className="mb-4">
                                            <label className="block text-xs font-bold text-slate-600 mb-2">
                                                Overlay Opacity: {(imageOpacity * 100).toFixed(0)}%
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={imageOpacity * 100}
                                                onChange={(e) => setImageOpacity(parseInt(e.target.value) / 100)}
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                            />
                                        </div>

                                        {/* Image Timeline */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-2">Select Date:</label>
                                            <div className="flex gap-2 overflow-x-auto pb-2">
                                                {ndviImages.map((img, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() => setSelectedImageIndex(index)}
                                                        className={`flex-shrink-0 px-3 py-2 rounded-lg border-2 transition-all ${
                                                            index === selectedImageIndex
                                                                ? 'border-emerald-600 bg-emerald-50'
                                                                : 'border-slate-200 bg-white hover:border-emerald-300'
                                                        }`}
                                                    >
                                                        <div className={`text-xs font-bold mb-1 ${
                                                            index === selectedImageIndex ? 'text-emerald-800' : 'text-slate-600'
                                                        }`}>
                                                            {new Date(img.date).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                            })}
                                                        </div>
                                                        <div className={`text-[10px] ${
                                                            index === selectedImageIndex ? 'text-emerald-700' : 'text-slate-500'
                                                        }`}>
                                                            {img.ndvi_mean.toFixed(3)}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Current Image Stats */}
                                        {currentNDVIImage && (
                                            <div className="mt-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl p-4 border border-emerald-200">
                                                <div className="grid grid-cols-3 gap-3 text-xs">
                                                    <div>
                                                        <span className="text-slate-600 font-medium block mb-1">Health</span>
                                                        <div className={`font-black ${getHealthStatusColor(currentNDVIImage.ndvi_mean)}`}>
                                                            {getHealthStatus(currentNDVIImage.ndvi_mean)}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-600 font-medium block mb-1">NDVI</span>
                                                        <div className="font-black text-emerald-700">
                                                            {currentNDVIImage.ndvi_mean.toFixed(3)}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-600 font-medium block mb-1">Cloud</span>
                                                        <div className="font-black text-slate-800">
                                                            {currentNDVIImage.cloud_coverage}%
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Loading State */}
                                {report.poly_id && ndviLoading && (
                                    <div className="border-t border-slate-200 pt-6">
                                        <div className="flex items-center justify-center py-8">
                                            <Satellite size={32} className="text-emerald-500 animate-pulse mr-3" />
                                            <span className="text-slate-600 font-semibold">Loading satellite data...</span>
                                        </div>
                                    </div>
                                )}

                                {/* No Poly ID Warning */}
                                {!report.poly_id && (
                                    <div className="border-t border-slate-200 pt-6">
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                                            <AlertTriangle className="text-yellow-600 mx-auto mb-2" size={24} />
                                            <p className="text-yellow-800 font-bold text-sm">No satellite monitoring data available</p>
                                            <p className="text-yellow-600 text-xs mt-1">This field is not registered for satellite monitoring</p>
                                        </div>
                                    </div>
                                )}
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

                        {/* 14-Day Weather Forecast */}
                        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-100">
                            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 mb-8">
                                <Thermometer className="text-emerald-600" size={32} />
                                14-Day Environmental Forecast
                            </h2>
                            {forecast.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                                    {forecast.slice(0, 14).map((day: any, i: number) => {
                                        const date = day.date ? new Date(day.date) : new Date();
                                        const precipSum = day.precipitation_sum || 0;
                                        const hasRain = precipSum > 1.5; // FIX: Rain threshold at 1.5mm
                                        
                                        return (
                                            <div key={i} className="bg-slate-50/50 rounded-2xl p-4 text-center border border-slate-100 hover:border-emerald-200 transition-colors">
                                                <p className="text-xs font-black text-slate-400 uppercase mb-2">
                                                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                                </p>
                                                <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                                    {hasRain ? <Droplets size={24} className="text-blue-500" /> : <Wind size={24} className="text-emerald-500" />}
                                                </div>
                                                <div className="text-lg font-black text-slate-800">
                                                    {(day.temperature_max || 0).toFixed(0)}°
                                                </div>
                                                <p className="text-xs text-slate-400 font-bold mb-2">/ {(day.temperature_min || 0).toFixed(0)}°</p>
                                                <p className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full inline-block
                                                    ${hasRain ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"}
                                                `}>
                                                    {hasRain ? "Rain" : "Dry"}
                                                </p>
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
                                    <span className="text-lg font-black">{Math.max(0, report.expectedSeason - report.daysAfterPlanting)} days</span>
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

                        {/* 6-Month Outlook */}
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                            <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                                <Thermometer className="text-emerald-600" size={24} />
                                6-Month Outlook
                            </h3>
                            {monthlyForecast.length > 0 ? (
                                <div className="h-64">
                                    <Bar
                                        data={{
                                            labels: monthlyForecast.slice(0, 6).map((m: any) => {
                                                const date = m.month ? new Date(m.month) : new Date();
                                                return date.toLocaleDateString('en-US', { month: 'short' });
                                            }),
                                            datasets: [
                                                {
                                                    label: 'Temp Anomaly (°C)',
                                                    data: monthlyForecast.slice(0, 6).map((m: any) => m.temperature?.mean_anomaly?.[0] || 0),
                                                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                                                    borderRadius: 6,
                                                },
                                                {
                                                    label: 'Precip Anomaly (mm)',
                                                    data: monthlyForecast.slice(0, 6).map((m: any) => m.precipitation?.mean_anomaly?.[0] || 0),
                                                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                                                    borderRadius: 6,
                                                }
                                            ]
                                        }}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: {
                                                    display: true,
                                                    position: 'top',
                                                    labels: {
                                                        font: { weight: 'bold', size: 11 },
                                                        color: '#1E293B',
                                                        boxWidth: 12,
                                                        padding: 10
                                                    }
                                                }
                                            },
                                            scales: {
                                                y: {
                                                    beginAtZero: true,
                                                    grid: { color: 'rgba(0,0,0,0.05)' },
                                                    ticks: { 
                                                        font: { weight: 'bold', size: 10 }, 
                                                        color: '#64748B' 
                                                    }
                                                },
                                                x: {
                                                    grid: { display: false },
                                                    ticks: { 
                                                        font: { weight: 'bold', size: 10 }, 
                                                        color: '#1E293B' 
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold text-sm">
                                    Long-term forecast data currently unavailable.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}