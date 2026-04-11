"use client";

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ContractTermsPage() {
    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="max-w-4xl mx-auto px-4">
                <Link href="/dashboard/inputs" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold mb-6">
                    <ArrowLeft size={20} />
                    Back to Inputs
                </Link>

                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 md:p-12">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Buy Now Pay Later (BNPL) Terms & Conditions</h1>
                    <p className="text-slate-500 mb-8">Effective Date: February 2026</p>

                    <div className="space-y-8 text-slate-700 leading-relaxed">

                        {/* Section 1 */}
                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-3">1. Program Overview</h2>
                            <p>
                                The Agricheck Buy Now Pay Later (BNPL) program allows smallholder farmers to receive agricultural inputs on credit and repay with produce after harvest. This agreement is between Agricheck ("the Company") and the farmer ("the Borrower").
                            </p>
                        </section>

                        {/* Section 2 */}
                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-3">2. Eligibility Requirements</h2>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Borrower must have a verified Agricheck account</li>
                                <li>Borrower must have mapped their farm boundary using the Map Farm tool</li>
                                <li>Farm must be located within Cameroon or Ghana</li>
                                <li>Borrower must be cultivating one of the supported crops: Maize, Rice, Soybean, or Sorghum</li>
                            </ul>
                        </section>

                        {/* Section 3 */}
                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-3">3. Credit Facility & Dynamic Inputs</h2>
                            <p className="mb-3">
                                The Company provides farm inputs where the repayment is dynamically calculated based on the total monetary cost of the inputs taken, converted into a produce equivalent. Base farmgate prices used for conversions are:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li><strong>Maize:</strong> 120 FCFA/kg</li>
                                <li><strong>Soybean:</strong> 400 FCFA/kg</li>
                                <li><strong>Rice:</strong> 300 FCFA/kg</li>
                                <li><strong>Sorghum:</strong> 400 FCFA/kg</li>
                            </ul>
                            <p className="mt-3 text-sm text-slate-600">
                                All bags are standardized at 100kg. Total repayment is calculated as: <strong>(Total Input Value / Fixed Crop Price per kg) / 100</strong>.
                            </p>
                        </section>

                        {/* Section 4 */}
                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-3">4. Repayment Obligations</h2>
                            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
                                <p className="font-bold text-yellow-800">⚠️ Critical Requirement</p>
                                <p className="text-yellow-700 text-sm mt-1">
                                    The Borrower agrees to deliver the specified quantity of produce to Agricheck's designated collection center within the stipulated timeline.
                                </p>
                            </div>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li><strong>Maize:</strong> Within 14 days of harvest completion</li>
                                <li><strong>Soybean:</strong> Within 21 days of harvest</li>
                                <li><strong>Rice:</strong> Immediately upon threshing</li>
                                <li><strong>Sorghum:</strong> Post-harvest drying phase</li>
                            </ul>
                            <p className="mt-3">
                                Produce must meet quality standards: Grade A, clean, dried, and free from contaminants.
                            </p>
                        </section>

                        {/* Section 5 */}
                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-3">5. Default & Consequences</h2>
                            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                                <p className="font-bold text-red-800">🚨 Default Conditions</p>
                                <p className="text-red-700 text-sm mt-1">
                                    Failure to deliver the agreed produce within the timeline constitutes a default.
                                </p>
                            </div>
                            <p className="mb-3">In the event of default, the following actions may be taken:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Suspension of future credit facilities</li>
                                <li>Reporting to credit bureaus</li>
                                <li>Legal action to recover the monetary value of inputs plus interest (15% per annum)</li>
                                <li>Seizure of collateral (if applicable)</li>
                            </ul>
                        </section>

                        {/* Section 6 */}
                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-3">6. Crop Failure & Force Majeure</h2>
                            <p className="mb-3">
                                The Company and the Borrower recognizes that farming involves inherent risks. In cases of documented crop failure due to:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>Natural disasters (floods, droughts, pests)</li>
                                <li>Government-mandated restrictions</li>
                                <li>Other force majeure events</li>
                            </ul>
                            <p className="mt-3">
                                The Borrower must notify Agricheck within 7 days of the event. The Company will conduct a field assessment and may offer:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                                <li>Repayment restructuring</li>
                                <li>Partial debt forgiveness (case-by-case basis)</li>
                                <li>Extension of repayment timeline</li>
                            </ul>
                            <p className="mt-3 text-sm text-slate-600">
                                <strong>Note:</strong> Crop failure due to negligence or poor farming practices does not qualify for relief.
                            </p>
                        </section>

                        {/* Section 7 */}
                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-3">7. Pricing & Calculations</h2>
                            <p>
                                The produce repayment quantity is strictly fixed at the time of contract signing using the dynamic calculation above. The Company assumes market price risk post-signing. The bag-to-value conversion includes built-in considerations to cover:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                                <li>Logistics and transportation</li>
                                <li>Storage costs</li>
                                <li>Financing risk</li>
                                <li>Inflation protection</li>
                            </ul>
                        </section>

                        {/* Section 8 */}
                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-3">8. Dispute Resolution</h2>
                            <p>
                                Any disputes arising from this agreement shall be resolved through:
                            </p>
                            <ol className="list-decimal list-inside space-y-2 ml-4 mt-2">
                                <li>Good-faith negotiation between parties</li>
                                <li>Mediation by a neutral third party (if negotiation fails)</li>
                                <li>Arbitration under the laws of Ghana and Cameroon</li>
                                <li> (final resort)</li>
                            </ol>
                        </section>

                        {/* Section 9 */}
                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-3">9. Data & Privacy</h2>
                            <p>
                                By signing this agreement, the Borrower consents to:
                            </p>
                            <ul className="list-disc list-inside space-y-2 ml-4 mt-2">
                                <li>Satellite monitoring of the mapped farm</li>
                                <li>Collection of farm data (NDVI, weather, soil conditions)</li>
                                <li>Sharing of credit history with partner financial institutions (if applicable)</li>
                            </ul>
                            <p className="mt-3 text-sm text-slate-600">
                                All data is handled in accordance with Agricheck's <Link href="/privacy" className="text-emerald-600 hover:underline">Privacy Policy</Link>.
                            </p>
                        </section>

                        {/* Section 10 */}
                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-3">10. Legal Jurisdiction</h2>
                            <p>
                                This agreement is governed by the laws of the Republic of Cameroon and Ghana. Any legal proceedings shall be conducted in the courts of Ghana.
                            </p>
                        </section>

                        {/* Section 11 */}
                        <section>
                            <h2 className="text-xl font-bold text-slate-800 mb-3">11. Acceptance</h2>
                            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4">
                                <p className="font-bold text-emerald-800">✓ By Signing the Contract</p>
                                <p className="text-emerald-700 text-sm mt-1">
                                    You acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions.
                                </p>
                            </div>
                        </section>

                    </div>

                    {/* Footer */}
                    <div className="mt-12 pt-8 border-t border-slate-200 text-center">
                        <p className="text-sm text-slate-500">
                            For questions or clarifications, contact: <strong>info@agricheck.farm</strong>
                        </p>
                        <Link href="/dashboard/inputs" className="inline-block mt-4 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors">
                            Return to Inputs
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
