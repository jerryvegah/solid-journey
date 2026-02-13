"use client";

import { FarmerContract, getPackageDetails, getUserContracts, InputPackage } from '@/lib/contracts';
import { useAuth } from '@/lib/firebase';
import { Calendar, FileText, MapPin, Package, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function ContractsPage() {
    const { user, loading: authLoading } = useAuth();
    const [contracts, setContracts] = useState<FarmerContract[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedContract, setSelectedContract] = useState<FarmerContract | null>(null);
    const [selectedPackage, setSelectedPackage] = useState<InputPackage | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);

    // Load user contracts
    useEffect(() => {
        const loadContracts = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const userContracts = await getUserContracts(user.uid);
                setContracts(userContracts);
            } catch (error) {
                console.error('Error loading contracts:', error);
            } finally {
                setLoading(false);
            }
        };

        loadContracts();
    }, [user]);

    // Handle view contract details
    const handleViewContract = async (contract: FarmerContract) => {
        setSelectedContract(contract);
        const packageData = await getPackageDetails(contract.packageId);
        setSelectedPackage(packageData);
    };

    // Initialize map when modal opens
    useEffect(() => {
        if (!selectedContract || !mapRef.current) return;

        const initMap = async () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }

            try {
                // @ts-ignore
                const L = (await import('leaflet')).default;

                // Parse farm boundary
                const coordinates = JSON.parse(selectedContract.farmBoundary);

                if (coordinates.length === 0) return;

                // Calculate center
                const lats = coordinates.map((c: any) => c.lat || c[0]);
                const lngs = coordinates.map((c: any) => c.lng || c[1]);
                const centerLat = lats.reduce((a: number, b: number) => a + b, 0) / lats.length;
                const centerLng = lngs.reduce((a: number, b: number) => a + b, 0) / lngs.length;

                const map = L.map(mapRef.current, {
                    center: [centerLat, centerLng],
                    zoom: 14,
                    zoomControl: false,
                    attributionControl: false
                });
                mapInstance.current = map;

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

                // Draw polygon
                const polygonCoords = coordinates.map((c: any) => [c.lat || c[0], c.lng || c[1]]);
                L.polygon(polygonCoords, {
                    color: '#10b981',
                    fillColor: '#10b981',
                    fillOpacity: 0.3,
                    weight: 2
                }).addTo(map);

            } catch (error) {
                console.error('Error initializing map:', error);
            }
        };

        initMap();

        return () => {
            if (mapInstance.current) {
                mapInstance.current.remove();
                mapInstance.current = null;
            }
        };
    }, [selectedContract]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active': return 'bg-emerald-100 text-emerald-800';
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            case 'Harvested': return 'bg-blue-100 text-blue-800';
            case 'Completed': return 'bg-green-100 text-green-800';
            case 'Defaulted': return 'bg-red-100 text-red-800';
            default: return 'bg-slate-100 text-slate-800';
        }
    };

    if (authLoading || loading) {
        return (
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-center items-center h-64">
                    <div className="text-slate-500 text-lg">Loading contracts...</div>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-center items-center h-64">
                    <div className="text-slate-500 text-lg">Please sign in to view contracts.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-slate-800">Farmer Contracts</h1>
                <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-bold shadow-sm">
                    {contracts.length} Contract{contracts.length !== 1 ? 's' : ''}
                </div>
            </div>

            {contracts.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-md p-12 text-center border border-slate-100">
                    <FileText size={64} className="mx-auto text-slate-300 mb-4" />
                    <h2 className="text-2xl font-bold text-slate-700 mb-2">No Contracts Yet</h2>
                    <p className="text-slate-500 mb-6">Sign up for Buy Now Pay Later on the Inputs page to get started.</p>
                    <a href="/dashboard/inputs" className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-emerald-700 transition-colors">
                        Browse Inputs
                    </a>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {contracts.map((contract) => (
                        <div key={contract.id} className="bg-white rounded-xl shadow-md border-l-4 border-emerald-500 overflow-hidden hover:shadow-lg transition-all flex flex-col">
                            <div className="p-6 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-bold text-slate-800 text-lg w-3/4 leading-tight">{contract.cropType} Contract</h3>
                                    <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${getStatusColor(contract.status)}`}>
                                        {contract.status}
                                    </span>
                                </div>

                                <div className="space-y-3 mt-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-bold text-slate-700">Field:</span>
                                        <span className="text-slate-500 text-right max-w-[60%]">{contract.fieldLocation}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="font-bold text-slate-700">Total Acres:</span>
                                        <span className="text-slate-500">{contract.totalAcres} acres</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="font-bold text-slate-700">Produce Due:</span>
                                        <span className="text-emerald-600 font-bold">{contract.totalProduceDue} bags</span>
                                    </div>
                                    {contract.expectedHarvestDate && (
                                        <div className="flex justify-between text-sm">
                                            <span className="font-bold text-slate-700">Expected Harvest:</span>
                                            <span className="text-slate-500">{new Date(contract.expectedHarvestDate).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100">
                                <button
                                    onClick={() => handleViewContract(contract)}
                                    className="w-full bg-emerald-500 text-white font-bold py-3 rounded-lg hover:bg-emerald-600 transition-colors shadow hover:shadow-md active:scale-95"
                                >
                                    View Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Contract Details Modal */}
            {selectedContract && selectedPackage && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedContract(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white z-10">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">Contract Details</h2>
                                <p className="text-slate-500 text-sm mt-1">{selectedPackage.packageName}</p>
                            </div>
                            <button onClick={() => setSelectedContract(null)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Status Banner */}
                            <div className={`rounded-xl p-4 border-2 ${selectedContract.status === 'Active' ? 'bg-emerald-50 border-emerald-200' :
                                selectedContract.status === 'Pending' ? 'bg-yellow-50 border-yellow-200' :
                                    selectedContract.status === 'Completed' ? 'bg-green-50 border-green-200' :
                                        'bg-slate-50 border-slate-200'
                                }`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-slate-600">Contract Status</p>
                                        <p className="text-2xl font-bold text-slate-800">{selectedContract.status}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-600">Signed On</p>
                                        <p className="text-lg font-bold text-slate-800">
                                            {selectedContract.signedAt?.toDate ? selectedContract.signedAt.toDate().toLocaleDateString() : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Farm Map */}
                            <div>
                                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <MapPin size={18} className="text-emerald-600" />
                                    Farm Boundary
                                </h3>
                                <div className="h-64 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                                    <div ref={mapRef} className="w-full h-full" />
                                </div>
                                <p className="text-sm text-slate-500 mt-2">
                                    <strong>Location:</strong> {selectedContract.fieldLocation} | <strong>Total Acres:</strong> {selectedContract.totalAcres}
                                </p>
                            </div>

                            {/* Contract Terms */}
                            <div>
                                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <FileText size={18} className="text-emerald-600" />
                                    Contract Terms
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Crop Type</p>
                                        <p className="text-lg font-bold text-slate-800">{selectedContract.cropType}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Input Value</p>
                                        <p className="text-lg font-bold text-slate-800">GH₵ {selectedPackage.totalInputValue.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Repayment Rate</p>
                                        <p className="text-lg font-bold text-slate-800">{selectedPackage.produceRepaymentPerAcre} bags/acre</p>
                                    </div>
                                    <div className="bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200">
                                        <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Total Produce Due</p>
                                        <p className="text-lg font-bold text-emerald-700">{selectedContract.totalProduceDue} bags</p>
                                    </div>
                                </div>
                            </div>

                            {/* Inputs Included */}
                            <div>
                                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <Package size={18} className="text-emerald-600" />
                                    Inputs Included
                                </h3>
                                <div className="space-y-2">
                                    {selectedPackage.inputsIncluded.map((input, index) => (
                                        <div key={index} className="flex justify-between items-center bg-slate-50 rounded-lg p-3 border border-slate-200">
                                            <span className="font-bold text-slate-700">{input.productName}</span>
                                            <span className="text-slate-500">Qty: {input.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Timeline */}
                            <div>
                                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <Calendar size={18} className="text-emerald-600" />
                                    Timeline
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between border-b border-slate-100 pb-2">
                                        <span className="text-slate-600">Contract Signed</span>
                                        <span className="font-bold text-slate-800">
                                            {selectedContract.signedAt?.toDate ? selectedContract.signedAt.toDate().toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                    {selectedContract.expectedHarvestDate && (
                                        <div className="flex justify-between border-b border-slate-100 pb-2">
                                            <span className="text-slate-600">Expected Harvest</span>
                                            <span className="font-bold text-slate-800">
                                                {new Date(selectedContract.expectedHarvestDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Repayment Deadline</span>
                                        <span className="font-bold text-slate-800">{selectedPackage.repaymentTimeline}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="pt-4 border-t border-slate-200">
                                <button
                                    onClick={() => setSelectedContract(null)}
                                    className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
