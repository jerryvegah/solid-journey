"use client";

import {
    calculateProduceDueDynamic,
    checkUserHasFarm,
    createContract
} from '@/lib/contracts';
import { Currency, formatPrice } from '@/lib/currency';
import { db, useAuth } from '@/lib/firebase';
import { initiateCheckout } from '@/lib/payment';
import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { CheckCircle2, CreditCard, MapPin, X } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Product {
    id: string;
    name: string;
    price: number;
    image: string;
    inStock?: boolean;
    quantity?: number;
    tag?: string;
    description?: string;
    cropType?: string;
}

export default function InputsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showContractModal, setShowContractModal] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
    const [farmData, setFarmData] = useState<any>(null);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [expectedHarvestDate, setExpectedHarvestDate] = useState('');
    const [creatingContract, setCreatingContract] = useState(false);
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
    const [checkoutQuantity, setCheckoutQuantity] = useState(1);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [userCurrency, setUserCurrency] = useState<Currency>('GHS');

    // Load user currency from Firestore
    useEffect(() => {
        const fetchUserCurrency = async () => {
            if (!user || !db) return;
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    if (data.currency) {
                        setUserCurrency(data.currency as Currency);
                    }
                }
            } catch (error) {
                console.error("Error fetching user currency:", error);
            }
        };
        fetchUserCurrency();
    }, [user]);

    // Load products from Firebase
    useEffect(() => {
        const loadProducts = async () => {
            // FIX: Add null check for db
            if (!db) {
                console.error('Firestore not initialized');
                setLoading(false);
                return;
            }

            try {
                const productsRef = collection(db, 'InputProducts');
                const q = query(productsRef, orderBy('name', 'asc'));
                const querySnapshot = await getDocs(q);

                const loadedProducts = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data()
                } as Product));

                setProducts(loadedProducts);
            } catch (error) {
                console.error("Error loading products:", error);
            } finally {
                setLoading(false);
            }
        };

        loadProducts();
    }, []);

    // Handle direct "Buy Now" button (opens checkout modal)
    const handleBuyNow = (product: Product) => {
        if (!user) {
            alert('Please sign in to make a purchase');
            return;
        }

        setCheckoutProduct(product);
        setCheckoutQuantity(1);
        setShowCheckoutModal(true);
    };

    // Process Flutterwave payment after capturing delivery details
    const processCheckout = () => {
        if (!user || !db || !checkoutProduct) return;
        
        if (!deliveryAddress.trim() || !phoneNumber.trim()) {
            alert('Please provide delivery address and phone number.');
            return;
        }

        const totalAmount = checkoutProduct.price * checkoutQuantity;

        initiateCheckout(
            {
                email: user.email || '',
                name: user.displayName || 'Farmer',
                uid: user.uid,
                phone: phoneNumber
            },
            userCurrency,
            totalAmount,
            {
                title: `Buy ${checkoutProduct.name}`,
                description: `Purchasing ${checkoutQuantity}x ${checkoutProduct.name}`,
                logo: checkoutProduct.image
            },
            async (ref) => {
                try {
                    if (!db) return;

                    await addDoc(collection(db, 'InputOrders'), {
                        userId: user.uid,
                        userEmail: user.email,
                        productName: checkoutProduct.name,
                        productId: checkoutProduct.id,
                        quantity: checkoutQuantity,
                        deliveryAddress,
                        phoneNumber,
                        originalAmount: totalAmount,
                        originalCurrency: 'GHS',
                        amount: totalAmount,
                        currency: userCurrency,
                        paymentRef: ref,
                        status: 'paid',
                        createdAt: serverTimestamp()
                    });
                    alert(`Success! Your order for ${checkoutProduct.name} has been placed. We will contact you for delivery.`);
                    setShowCheckoutModal(false);
                    setDeliveryAddress('');
                    setPhoneNumber('');
                } catch (error) {
                    console.error("Error recording order:", error);
                    alert("Payment successful, but we failed to record your order. Please contact support with ref: " + ref);
                }
            }
        );
    };

    // Handle Buy on Credit click
    const handleBuyOnCredit = async (product: Product) => {
        if (!user) {
            alert('Please sign in to use Buy on Credit');
            return;
        }

        // Check if user has mapped farm
        const { hasFarm, farmData: userFarm } = await checkUserHasFarm(user.uid);

        if (!hasFarm) {
            if (confirm('You need to map your farm first. Go to Map Farm page?')) {
                router.push('/dashboard/map');
            }
            return;
        }

        setSelectedProduct(product);
        setSelectedQuantity(1);
        setFarmData(userFarm);
        setShowContractModal(true);
    };

    // Extract crop type from product name/tag
    const extractCropTypeFromProduct = (product: Product): string => {
        const name = product.name.toLowerCase();
        const tag = product.tag?.toLowerCase() || '';

        if (name.includes('maize') || tag.includes('maize')) return 'Maize';
        if (name.includes('soy') || tag.includes('soy')) return 'Soybean';
        if (name.includes('rice') || tag.includes('rice')) return 'Rice';
        if (name.includes('sorghum') || tag.includes('sorghum')) return 'Sorghum';

        return 'Maize'; // Default
    };

    // Handle contract signing
    const handleSignContract = async () => {
        if (!termsAccepted) {
            alert('Please accept the terms and conditions');
            return;
        }

        if (!expectedHarvestDate) {
            alert('Please select expected harvest date');
            return;
        }

        if (!user || !selectedProduct || !farmData) return;

        setCreatingContract(true);

        const cropType = extractCropTypeFromProduct(selectedProduct) || farmData?.cropType || 'Maize';

        const result = await createContract(
            user.uid,
            user.email || '',
            {
                id: selectedProduct.id,
                name: selectedProduct.name,
                quantity: selectedQuantity,
                price: selectedProduct.price
            },
            cropType,
            farmData,
            expectedHarvestDate
        );

        setCreatingContract(false);

        if (result.success) {
            alert('Contract signed successfully! Check the Contracts page to view your agreement.');
            setShowContractModal(false);
            setTermsAccepted(false);
            setExpectedHarvestDate('');
            router.push('/dashboard/contracts');
        } else {
            alert(`Failed to create contract: ${result.error}`);
        }
    };

    if (loading) {
        return (
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-center items-center h-64">
                    <div className="text-slate-500 text-lg">Loading products...</div>
                </div>
            </div>
        );
    }

    const totalAcres = farmData ? (farmData.area_hectares * 2.47105) : 0;
    
    const contractCropType = selectedProduct ? (extractCropTypeFromProduct(selectedProduct) || farmData?.cropType || 'Maize') : 'Maize';
    const totalInputCostGHS = selectedProduct ? selectedProduct.price * selectedQuantity : 0;
    const totalProduceDue = selectedProduct ? calculateProduceDueDynamic(totalInputCostGHS, contractCropType, 100) : 0;

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Shop Farm Inputs</h1>
                    <p className="text-slate-500 mt-2">Select your recommended package or buy on credit.</p>
                </div>
                <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm font-bold">
                    Input Marketplace
                </div>
            </div>

            {products.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-md p-12 text-center border border-slate-100">
                    <i className="fa-solid fa-box-open text-6xl text-slate-300 mb-4"></i>
                    <h2 className="text-2xl font-bold text-slate-700 mb-2">No Products Available</h2>
                    <p className="text-slate-500">Products will appear here once they are added to the inventory.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map((product) => (
                        <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-all group flex flex-col">
                            <div className="relative h-48 w-full bg-slate-50 p-4">
                                <div className="relative h-full w-full">
                                    <Image
                                        src={product.image}
                                        alt={product.name}
                                        fill
                                        className="object-contain group-hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                                {product.tag && (
                                    <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-md">
                                        <i className="fa-solid fa-leaf mr-1"></i> {product.tag}
                                    </div>
                                )}
                            </div>

                            <div className="p-6 flex-1 flex flex-col">
                                <h3 className="font-bold text-slate-800 text-lg mb-2 line-clamp-2 min-h-[3.5rem]">{product.name}</h3>

                                <div className="mt-auto">
                                    <div className="flex flex-col items-center mb-4">
                                        <span className="text-2xl font-extrabold text-emerald-600">{formatPrice(product.price, userCurrency)}</span>
                                        <span className="text-xs text-slate-400 font-medium mt-1">
                                            {product.inStock === false || (product.quantity !== undefined && product.quantity <= 0)
                                                ? 'Out of Stock'
                                                : 'In Stock'}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {(() => {
                                            const isCurrentlyInStock = product.inStock !== false && (product.quantity === undefined || product.quantity > 0);
                                            return (
                                                <>
                                                    <button
                                                        onClick={() => handleBuyNow(product)}
                                                        className={`w-full font-bold py-3 rounded-xl transition-colors shadow-md hover:shadow-lg active:scale-95 ${isCurrentlyInStock
                                                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                                            : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                                            }`}
                                                        disabled={!isCurrentlyInStock}
                                                    >
                                                        {isCurrentlyInStock ? 'Buy Now' : 'Out of Stock'}
                                                    </button>

                                                    {isCurrentlyInStock && (
                                                        <button
                                                            onClick={() => handleBuyOnCredit(product)}
                                                            className="w-full font-bold py-3 rounded-xl transition-colors border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 flex items-center justify-center gap-2"
                                                        >
                                                            <CreditCard size={18} />
                                                            Buy on Credit
                                                        </button>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Contract Preview Modal */}
            {showContractModal && selectedProduct && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowContractModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white z-10">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">Contract Preview</h2>
                                <p className="text-slate-500 text-sm mt-1">{selectedProduct.name}</p>
                            </div>
                            <button onClick={() => setShowContractModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Farm Info */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <MapPin size={18} className="text-emerald-600" />
                                    Your Farm Details
                                </h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-slate-500">Location</p>
                                        <p className="font-bold text-slate-800">{farmData?.fieldLocation || 'Unknown'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500">Total Acres</p>
                                        <p className="font-bold text-slate-800">{totalAcres.toFixed(2)} acres</p>
                                    </div>
                                </div>
                            </div>

                            {/* Contract Details */}
                            <div>
                                <h3 className="font-bold text-slate-800 mb-3">Contract Terms</h3>
                                <div className="space-y-4 text-sm">
                                    
                                    {/* Product Quantity Prompt */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Quantity Needed</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={selectedQuantity}
                                            onChange={(e) => setSelectedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>

                                    <div className="flex justify-between border-b border-slate-100 pb-2">
                                        <span className="text-slate-600">Product</span>
                                        <span className="font-bold text-slate-800">{selectedProduct.name}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-2">
                                        <span className="text-slate-600">Crop Type (For Repayment)</span>
                                        <span className="font-bold text-slate-800">{contractCropType}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-2">
                                        <span className="text-slate-600">Total Input Cost</span>
                                        <span className="font-bold text-slate-800">{formatPrice(totalInputCostGHS, userCurrency)}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-100 pb-2">
                                        <span className="text-slate-600">Repayment Mode</span>
                                        <span className="font-bold text-slate-800">Dynamic (Based on Farmgate Price)</span>
                                    </div>
                                </div>
                            </div>

                            {/* Total Due */}
                            <div className="bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200">
                                <h3 className="font-bold text-emerald-800 mb-2">Total Produce Due</h3>
                                <p className="text-3xl font-extrabold text-emerald-600">
                                    {totalProduceDue.toFixed(2)} Bags
                                </p>
                                <p className="text-xs text-emerald-700 mt-1">
                                    Calculated using fixed farmgate price for ({contractCropType})
                                </p>
                            </div>

                            {/* Expected Harvest Date */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Expected Harvest Date</label>
                                <input
                                    type="date"
                                    value={expectedHarvestDate}
                                    onChange={(e) => setExpectedHarvestDate(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    required
                                />
                            </div>

                            {/* Terms Acceptance */}
                            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                                <div className="flex items-start gap-3">
                                    <input
                                        type="checkbox"
                                        id="terms"
                                        checked={termsAccepted}
                                        onChange={(e) => setTermsAccepted(e.target.checked)}
                                        className="mt-1 w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                                    />
                                    <label htmlFor="terms" className="text-sm text-slate-700">
                                        I have read and agree to the{' '}
                                        <button
                                            onClick={() => setShowTermsModal(true)}
                                            className="text-emerald-600 hover:underline font-bold"
                                        >
                                            Terms & Conditions
                                        </button>
                                        . I understand my repayment obligations and the consequences of default.
                                    </label>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowContractModal(false)}
                                    className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSignContract}
                                    disabled={!termsAccepted || !expectedHarvestDate || creatingContract}
                                    className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {creatingContract ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            Signing...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={20} />
                                            Sign Contract
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Terms & Conditions Modal */}
            {showTermsModal && (
                <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowTermsModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white z-10">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">Terms & Conditions</h2>
                                <p className="text-slate-500 text-sm mt-1">Buy Now Pay Later Program</p>
                            </div>
                            <button onClick={() => setShowTermsModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6">
                            <iframe
                                src="/terms-contracts"
                                className="w-full h-[600px] border-0 rounded-xl"
                                title="Terms and Conditions"
                            />
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={() => setShowTermsModal(false)}
                                    className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Checkout & Delivery Modal */}
            {showCheckoutModal && checkoutProduct && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowCheckoutModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white z-10">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">Checkout</h2>
                                <p className="text-slate-500 text-sm mt-1">{checkoutProduct.name}</p>
                            </div>
                            <button onClick={() => setShowCheckoutModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Quantity</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={checkoutQuantity}
                                    onChange={(e) => setCheckoutQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Delivery Address</label>
                                <textarea
                                    value={deliveryAddress}
                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                    placeholder="Enter your full farm or home address"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[80px]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Phone Number</label>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="e.g. +233..."
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    required
                                />
                            </div>

                            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200 mt-6">
                                <span className="font-bold text-slate-700">Total Price:</span>
                                <span className="text-2xl font-bold text-emerald-600">
                                    {formatPrice(checkoutProduct.price * checkoutQuantity, userCurrency)}
                                </span>
                            </div>

                            <button
                                onClick={processCheckout}
                                className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition-colors mt-4 flex items-center justify-center gap-2"
                            >
                                <CreditCard size={20} />
                                Proceed to Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}