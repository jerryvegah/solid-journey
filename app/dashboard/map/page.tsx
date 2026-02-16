"use client";

import { db, useAuth } from '@/lib/firebase';
import { initiateCheckout } from '@/lib/payment';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet/dist/leaflet.css';
import { CornerUpLeft, CreditCard, Info, Loader2, Lock, MapPinned, MousePointerClick, Satellite, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

export default function MapPage() {
    const { user } = useAuth();
    const router = useRouter();
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const drawnItemsRef = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState('Initializing map...');
    
    // Backend status tracking (hidden from user)
    const [backendStatus, setBackendStatus] = useState<'unknown' | 'warming' | 'ready'>('unknown');

    // Paywall States
    const [assessmentCount, setAssessmentCount] = useState(0);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentApproved, setPaymentApproved] = useState(false); // NEW: Track if payment was made

    // Field Boundary Form States
    const [boundaryCropType, setBoundaryCropType] = useState('maize');
    const [boundaryDescription, setBoundaryDescription] = useState('');
    const [datePlanted, setDatePlanted] = useState('');

    // Analysis Results & UI States
    const [fieldData, setFieldData] = useState<any>(null);
    const [autoRegistrationStatus, setAutoRegistrationStatus] = useState<any>(null);
    const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info' | 'warning', message: string } | null>(null);

    // API Endpoints
    const SATELLITE_BACKEND = 'https://agricheckb2.onrender.com';
    const RISK_BACKEND = 'https://agricheckb.onrender.com';

    const POINT_ASSESSMENT_API_URL = `${RISK_BACKEND}/assess-crop-risk`;
    const FIELD_BOUNDARY_API_URL = `${SATELLITE_BACKEND}/fields`;

    // Helper: Show Alert
    const showAlert = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'error') => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 5000);
    };

    // Silent background wake-up with localStorage lock
    useEffect(() => {
        const wakeUpEngines = async () => {
            try {
                const WAKE_UP_COOLDOWN = 10 * 60 * 1000;
                const STORAGE_KEY = 'agricheck_backend_wakeup';
                
                const lastWakeUpStr = localStorage.getItem(STORAGE_KEY);
                const now = Date.now();
                
                if (lastWakeUpStr) {
                    const lastWakeUp = parseInt(lastWakeUpStr);
                    if (now - lastWakeUp < WAKE_UP_COOLDOWN) {
                        console.log('⏰ Backends recently warmed up');
                        setBackendStatus('warming');
                        const isReady = await quickHealthCheck();
                        if (isReady) {
                            setBackendStatus('ready');
                        } else {
                            monitorBackendReadiness();
                        }
                        return;
                    }
                }
                
                localStorage.setItem(STORAGE_KEY, now.toString());
                console.log('🚀 Waking up backends...');
                setBackendStatus('warming');
                
                const TIMEOUT = 30000;
                
                const fetchWithTimeout = (url: string, timeout: number) => {
                    return Promise.race([
                        fetch(url),
                        new Promise<Response>((_, reject) => 
                            setTimeout(() => reject(new Error('Timeout')), timeout)
                        )
                    ]);
                };
                
                const results = await Promise.allSettled([
                    fetchWithTimeout(`${SATELLITE_BACKEND}/health`, TIMEOUT),
                    fetchWithTimeout(`${RISK_BACKEND}/health`, TIMEOUT)
                ]);
                
                const successCount = results.filter(r => r.status === 'fulfilled').length;
                console.log(`✅ ${successCount}/2 backends responded`);
                
                if (successCount === 2) {
                    setBackendStatus('ready');
                } else {
                    monitorBackendReadiness();
                }
                
            } catch (error) {
                console.warn('⚠️ Backend wake-up issue (non-critical)');
                setBackendStatus('warming');
                monitorBackendReadiness();
            }
        };
        
        wakeUpEngines();
    }, []);

    const quickHealthCheck = async (): Promise<boolean> => {
        try {
            const QUICK_TIMEOUT = 5000;
            
            const fetchWithTimeout = (url: string, timeout: number) => {
                return Promise.race([
                    fetch(url, { method: 'HEAD' }),
                    new Promise<Response>((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout')), timeout)
                    )
                ]);
            };
            
            const results = await Promise.allSettled([
                fetchWithTimeout(`${SATELLITE_BACKEND}/health`, QUICK_TIMEOUT),
                fetchWithTimeout(`${RISK_BACKEND}/health`, QUICK_TIMEOUT)
            ]);
            
            return results.filter(r => r.status === 'fulfilled').length === 2;
        } catch {
            return false;
        }
    };

    const monitorBackendReadiness = () => {
        let attempts = 0;
        const maxAttempts = 6;
        
        const checkInterval = setInterval(async () => {
            attempts++;
            const isReady = await quickHealthCheck();
            
            if (isReady) {
                console.log('✅ Backends ready');
                setBackendStatus('ready');
                clearInterval(checkInterval);
            } else if (attempts >= maxAttempts) {
                console.log('⏱️ Backend check timeout');
                clearInterval(checkInterval);
            }
        }, 10000);
    };

    // Initialize Map
    useEffect(() => {
        let map: any;

        const initMap = async () => {
            if (typeof window === 'undefined') return;

            try {
                const L = (await import('leaflet')).default;
                // @ts-ignore
                await import('leaflet-draw');

                // @ts-ignore
                delete L.Icon.Default.prototype._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                });

                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            setupMap(L, position.coords.latitude, position.coords.longitude);
                        },
                        (error) => {
                            setupMap(L, 5.6037, -0.1870);
                        }
                    );
                } else {
                    setupMap(L, 5.6037, -0.1870);
                }

            } catch (error) {
                console.error("Error initializing map:", error);
                setIsLoading(false);
            }
        };

        const setupMap = (L: any, lat: number, lng: number) => {
            if (!mapContainerRef.current) return;
            if (mapInstanceRef.current) return;

            const mbToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

            const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors'
            });

            const satelliteLayer = L.tileLayer(
                `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${mbToken}`, {
                tileSize: 512,
                zoomOffset: -1,
                maxZoom: 18,
                attribution: '© Mapbox © OpenStreetMap'
            });

            map = L.map(mapContainerRef.current).setView([lat, lng], 16);
            mapInstanceRef.current = map;
            satelliteLayer.addTo(map);

            const baseLayers = {
                'Satellite': satelliteLayer,
                'Streets': osmLayer
            };
            L.control.layers(baseLayers).addTo(map);

            const drawnItems = new L.FeatureGroup();
            map.addLayer(drawnItems);
            drawnItemsRef.current = drawnItems;

            const drawControl = new L.Control.Draw({
                draw: {
                    polygon: {
                        allowIntersection: false,
                        showArea: true,
                        drawError: {
                            color: '#e1e100',
                            message: '<strong>Error:</strong> shape edges cannot cross!'
                        },
                        shapeOptions: {
                            color: '#10b981',
                            weight: 3,
                            opacity: 0.8,
                            fillOpacity: 0.2
                        }
                    },
                    polyline: false,
                    rectangle: false,
                    circle: false,
                    marker: false,
                    circlemarker: false
                },
                edit: {
                    featureGroup: drawnItems,
                    remove: true
                }
            });
            map.addControl(drawControl);

            map.on(L.Draw.Event.CREATED, (e: any) => {
                const layer = e.layer;
                drawnItems.clearLayers();
                drawnItems.addLayer(layer);
                updateFieldAnalysis(L, layer);
            });

            map.on(L.Draw.Event.EDITED, (e: any) => {
                e.layers.eachLayer((layer: any) => {
                    updateFieldAnalysis(L, layer);
                });
            });

            map.on(L.Draw.Event.DELETED, () => {
                setFieldData(null);
                setAutoRegistrationStatus(null);
            });

            setIsLoading(false);
        };

        initMap();

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Load user's assessment count
    useEffect(() => {
        const loadUserData = async () => {
            if (!user || !db) return;
            
            try {
                const assessmentsRef = collection(db, 'assessments');
                const q = query(assessmentsRef, where('userId', '==', user.uid));
                const querySnapshot = await getDocs(q);
                setAssessmentCount(querySnapshot.size);
            } catch (error) {
                console.error("Error loading user data:", error);
            }
        };
        loadUserData();
    }, [user]);

    const updateFieldAnalysis = async (L: any, layer: any) => {
        const geodesicArea = (latLngs: any[]) => {
            const pointsCount = latLngs.length;
            let area = 0;
            const d2r = Math.PI / 180;
            let p1, p2;

            if (pointsCount > 2) {
                for (let i = 0; i < pointsCount; i++) {
                    p1 = latLngs[i];
                    p2 = latLngs[(i + 1) % pointsCount];
                    area += ((p2.lng - p1.lng) * d2r) * (2 + Math.sin(p1.lat * d2r) + Math.sin(p2.lat * d2r));
                }
                area = area * 6378137 * 6378137 / 2;
            }
            return Math.abs(area);
        };

        const latlngs = layer.getLatLngs()[0];
        const areaSqMeters = geodesicArea(latlngs);
        const areaHectares = areaSqMeters / 10000;

        const bounds = layer.getBounds();
        const center = bounds.getCenter();

        setFieldData({
            hectares: areaHectares,
            sqMeters: areaSqMeters,
            center: center,
            coordinates: layer.toGeoJSON().geometry.coordinates
        });

        setAutoRegistrationStatus({
            type: 'success',
            title: 'Ready for Analysis',
            message: 'Field boundary captured. Submit to analyze.'
        });
    };

    const handleGeoJSONUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !mapInstanceRef.current || !drawnItemsRef.current) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                const L = (await import('leaflet')).default;

                drawnItemsRef.current.clearLayers();
                const geoJsonLayer = L.geoJSON(json, {
                    style: { color: '#10b981', weight: 3, opacity: 0.8, fillOpacity: 0.2 }
                });

                drawnItemsRef.current.addLayer(geoJsonLayer);
                mapInstanceRef.current.fitBounds(geoJsonLayer.getBounds());

                const layers = geoJsonLayer.getLayers();
                if (layers.length > 0) {
                    updateFieldAnalysis(L, layers[0]);
                }

                showAlert('GeoJSON loaded successfully', 'success');
            } catch (err) {
                showAlert('Invalid GeoJSON file', 'error');
            }
        };
        reader.readAsText(file);
    };

    const handleFieldSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.uid) return showAlert("Please login first.", "error");
        if (!fieldData) {
            showAlert("Please draw a field boundary first", 'warning');
            return;
        }
        
        if (!db) {
            showAlert("Database not initialized. Please refresh the page.", "error");
            return;
        }

        // CHECK: If user has 2+ assessments AND hasn't paid for this one yet
        if (assessmentCount >= 2 && !paymentApproved) {
            setShowPaymentModal(true);
            return;
        }

        // Check backend status
        if (backendStatus === 'warming') {
            showAlert("Processing engines are starting up. Please wait 10-20 seconds and try again.", "warning");
            return;
        }

        // Run the analysis
        await runFieldAnalysis();
    };

    // SIMPLIFIED: Just run the analysis (no payment logic here)
    const runFieldAnalysis = async () => {
        if (!user?.uid || !fieldData || !db) return;

        setIsLoading(true);
        setLoadingMessage('Analyzing your field...');

        try {
            const riskPayload = {
                latitude: fieldData.center.lat,
                longitude: fieldData.center.lng,
                crop_type: boundaryCropType.toLowerCase(),
                elevation: 1200
            };

            const boundaryPayload = {
                crop_type: boundaryCropType.toLowerCase(),
                field_location: boundaryDescription,
                field_coordinates: fieldData.coordinates,
                planting_date: datePlanted,
                latitude: fieldData.center.lat,
                longitude: fieldData.center.lng
            };

            const fetchWithRetry = async (url: string, options: RequestInit, retries = 2): Promise<Response> => {
                for (let i = 0; i <= retries; i++) {
                    try {
                        const response = await fetch(url, options);
                        if (response.ok) return response;
                        if (i === retries) throw new Error(`Request failed after ${retries} retries`);
                    } catch (error) {
                        if (i === retries) throw error;
                        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                    }
                }
                throw new Error('Retry loop exhausted');
            };

            const [riskRes, satelliteRes] = await Promise.all([
                fetchWithRetry(POINT_ASSESSMENT_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(riskPayload)
                }),
                fetchWithRetry(FIELD_BOUNDARY_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-ID': user.uid
                    },
                    body: JSON.stringify(boundaryPayload)
                })
            ]);

            const riskData = await riskRes.json();
            const satelliteData = await satelliteRes.json();

            await addDoc(collection(db, 'assessments'), {
                userId: user.uid,
                userEmail: user.email,
                type: 'comprehensive_analysis',
                cropType: boundaryCropType,
                fieldLocation: boundaryDescription,
                latitude: fieldData.center.lat,
                longitude: fieldData.center.lng,
                fieldCoordinates: JSON.stringify(fieldData.coordinates),
                datePlanted,
                results: {
                    satellite: satelliteData,
                    risk_ml: riskData
                },
                area_hectares: fieldData.hectares,
                satellite_monitoring_enabled: true,
                createdAt: serverTimestamp()
            });

            // Reset payment approval for next assessment
            setPaymentApproved(false);
            setAssessmentCount(prev => prev + 1);

            showAlert("Comprehensive Analysis Complete! Redirecting to reports...", 'success');
            
            setTimeout(() => {
                router.push('/dashboard/satellite');
            }, 2000);

        } catch (error: any) {
            console.error("Analysis Error:", error);
            showAlert("Connection error. Engines may still be starting. Please wait 30 seconds and try again.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12 relative min-h-screen">
            {isLoading && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
                    <Loader2 className="animate-spin text-emerald-600 mb-4" size={48} />
                    <p className="text-emerald-800 font-bold animate-pulse">{loadingMessage}</p>
                </div>
            )}

            {alert && (
                <div className={`fixed top-4 right-4 z-[9999] px-6 py-4 rounded-xl shadow-2xl border-l-4 flex items-center gap-3 animate-slide-in
                    ${alert.type === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' :
                        alert.type === 'error' ? 'bg-red-50 border-red-500 text-red-800' :
                            alert.type === 'warning' ? 'bg-yellow-50 border-yellow-500 text-yellow-800' :
                                'bg-blue-50 border-blue-500 text-blue-800'}`}>
                    <Info size={20} />
                    <span className="font-bold">{alert.message}</span>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Field Analysis</h1>
                    <p className="text-slate-500 mt-1">Map your field boundary to get instant risk assessment and satellite monitoring</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <CornerUpLeft className="text-emerald-600" />
                            Map Field Boundary
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Draw or upload your field boundary. We'll use the center point for risk analysis.</p>
                    </div>

                    {autoRegistrationStatus && (
                        <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 animate-bounce-in">
                            <Satellite size={16} />
                            {autoRegistrationStatus.title}
                        </div>
                    )}
                </div>

                <div className="relative w-full h-[600px] bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-inner group">
                    <div ref={mapContainerRef} className="w-full h-full z-10" />

                    {!fieldData && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg z-[400] text-xs font-bold text-slate-600 pointer-events-none group-hover:opacity-0 transition-opacity">
                            Use the polygon tool (top left) to draw your field
                        </div>
                    )}
                </div>

                {fieldData && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 animate-fade-in">
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
                            <p className="text-xs uppercase tracking-wider font-bold text-emerald-600 mb-1">Area (Hectares)</p>
                            <p className="text-2xl font-black text-emerald-900">{fieldData.hectares.toFixed(2)}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                            <p className="text-xs uppercase tracking-wider font-bold text-slate-600 mb-1">Area (Sq Meters)</p>
                            <p className="text-xl font-black text-slate-800">{fieldData.sqMeters.toFixed(0)}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center col-span-2 md:col-span-2">
                            <p className="text-xs uppercase tracking-wider font-bold text-slate-600 mb-1">Center Point (Risk Analysis Target)</p>
                            <p className="text-lg font-mono text-slate-800 flex items-center justify-center gap-2">
                                <MapPinned size={16} className="text-emerald-500" />
                                {fieldData.center.lat.toFixed(5)}, {fieldData.center.lng.toFixed(5)}
                            </p>
                        </div>
                    </div>
                )}

                <div className="mt-8 border-t border-slate-100 pt-8">
                    <form onSubmit={handleFieldSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Crop Type</label>
                                <select
                                    value={boundaryCropType}
                                    onChange={(e) => setBoundaryCropType(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 transition-all"
                                    required
                                >
                                    <option value="maize">Maize</option>
                                    <option value="rice">Rice</option>
                                    <option value="soybean">Soybean</option>
                                    <option value="sorghum">Sorghum</option>
                                    <option value="other">Others (Monitoring Only)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                                <input
                                    type="text"
                                    value={boundaryDescription}
                                    onChange={(e) => setBoundaryDescription(e.target.value)}
                                    placeholder="Brief description"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Date Planted</label>
                                <input
                                    type="date"
                                    value={datePlanted}
                                    onChange={(e) => setDatePlanted(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 items-center">
                            <label className="cursor-pointer flex items-center gap-2 px-6 py-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors w-full md:w-auto justify-center">
                                <Upload size={18} /> Upload GeoJSON
                                <input type="file" accept=".json,.geojson" onChange={handleGeoJSONUpload} className="hidden" />
                            </label>

                            <button
                                type="submit"
                                className="flex-1 w-full bg-emerald-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                                disabled={!fieldData}
                            >
                                <MousePointerClick size={24} />
                                {fieldData ? 'Register Field & Run Analysis' : 'Draw Boundary to Enable'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {showPaymentModal && (
                <div className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-bounce-in" onClick={e => e.stopPropagation()}>
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Lock size={40} className="text-amber-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-4">Payment Required</h2>
                            <p className="text-slate-600 mb-2 leading-relaxed">
                                You've completed <strong>{assessmentCount} assessments</strong>.
                            </p>
                            <p className="text-slate-600 mb-8 leading-relaxed">
                                Your first <strong>2 assessments are free</strong>. Each additional analysis requires payment before processing.
                            </p>

                            <div className="space-y-3">
                                <button
                                    className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 group"
                                    onClick={() => {
                                        if (user) {
                                            initiateCheckout(
                                                {
                                                    email: user.email || '',
                                                    name: user.displayName || 'Farmer',
                                                    uid: user.uid
                                                },
                                                'GHS',
                                                'PREMIUM', // Using 'PREMIUM' but it's just a gate
                                                {
                                                    title: `Field Assessment #${assessmentCount + 1}`,
                                                    description: "Comprehensive Field Analysis & Satellite Monitoring"
                                                },
                                                async (ref) => {
                                                    try {
                                                        if (!db) {
                                                            showAlert("Database not initialized. Please contact support.", "error");
                                                            return;
                                                        }
                                                        
                                                        // Just record the payment - no premium status change
                                                        const userRef = doc(db, 'users', user.uid);
                                                        await updateDoc(userRef, {
                                                            lastPaymentRef: ref,
                                                            lastPaymentDate: serverTimestamp()
                                                        });
                                                        
                                                        // Approve payment and close modal
                                                        setPaymentApproved(true);
                                                        setShowPaymentModal(false);
                                                        showAlert("Payment successful! Running analysis...", "success");
                                                        
                                                        // Auto-run the analysis
                                                        setTimeout(() => {
                                                            runFieldAnalysis();
                                                        }, 1000);
                                                        
                                                    } catch (err) {
                                                        console.error("Error recording payment:", err);
                                                        showAlert("Payment successful, but failed to record. Please contact support.", "error");
                                                    }
                                                }
                                            );
                                        }
                                    }}
                                >
                                    <CreditCard size={20} className="group-hover:scale-110 transition-transform" />
                                    Pay & Run Assessment
                                </button>
                                <button
                                    className="w-full bg-slate-100 text-slate-600 font-bold py-4 rounded-xl hover:bg-slate-200 transition-all"
                                    onClick={() => setShowPaymentModal(false)}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-4 border-t border-slate-100">
                            <p className="text-xs text-slate-400">
                                First 2 assessments free. Assessments 3+ require payment.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}