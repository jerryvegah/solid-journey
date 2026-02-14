// app/reports/[reportId]/page.tsx - COMPLETE FILE
// Just copy this entire file - no Python needed!

"use client";
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db, useAuth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Download, AlertTriangle, CheckCircle, Satellite, Activity, CloudRain, Thermometer, Droplets } from 'lucide-react';

export default function FullReportPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    
    const loadReport = async () => {
      // FIX: Add null check for db
      if (!db) {
        console.error('Firestore not initialized');
        setLoading(false);
        return;
      }
      
      try {
        const reportDoc = await getDoc(doc(db, 'assessments', params.reportId as string));
        if (reportDoc.exists()) setReport({ id: reportDoc.id, ...reportDoc.data() });
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    loadReport();
  }, [user, params.reportId, router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div>Loading...</div></div>;
  if (!report) return <div className="min-h-screen flex items-center justify-center"><div>Report not found</div></div>;

  const riskData = getRiskData(report);
  const forecast = report.results?.risk_ml?.weather_forecast?.daily || [];
  const monthly = report.results?.risk_ml?.weather_forecast?.monthly || [];
  const stress = getStressData(report);
  const cropInfo = report.results?.satellite?.crop_info || {};

  return (
    <div className="min-h-screen bg-gray-50">
      <style jsx global>{`@media print { .no-print { display: none !important; } .print-break { page-break-after: always; }}`}</style>
      
      <div className="no-print sticky top-0 bg-white border-b shadow-sm z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft size={20} /> Back
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700">
            <Download size={18} /> Download PDF
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        
        {/* PAGE 1: RISK */}
        <div className="bg-white rounded-lg shadow-lg p-8 print-break">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-emerald-600 mb-2">FIELD RISK ASSESSMENT</h1>
            <h2 className="text-xl text-gray-700">{report.fieldLocation} - {report.cropType.toUpperCase()}</h2>
            <p className="text-gray-500 mt-2">{report.createdAt?.toDate?.()?.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) || 'N/A'}</p>
          </div>

          <div className="border-2 border-emerald-600 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><AlertTriangle className="text-emerald-600" />Overall Risk</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-lg ${getRiskBgColor(riskData.risk_level)}`}>
                <div className="text-sm text-gray-600 mb-1">Risk Level</div>
                <div className="text-2xl font-bold">{riskData.risk_level}</div>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Risk Score</div>
                <div className="text-2xl font-bold">{riskData.risk_score.toFixed(2)}/1.00</div>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Field Area</div>
                <div className="text-xl font-bold">{report.area_hectares.toFixed(2)} ha</div>
              </div>
              <div className="bg-gray-100 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Crop Stage</div>
                <div className="text-xl font-bold">{cropInfo.current_stage?.replace('_', ' ').toUpperCase() || 'N/A'}</div>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-bold mb-4">Risk Factor Breakdown</h3>
          <div className="space-y-3">
            <RiskBar label="Price Volatility" score={riskData.components.price_volatility || 0} />
            <RiskBar label="Weather Risk" score={riskData.components.short_term_weather_risk || 0} />
            <RiskBar label="Seasonal Risk" score={riskData.components.long_term_seasonal_risk || 0} />
            <RiskBar label="Crop Suitability" score={riskData.components.suitability_score || 0} inverse />
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-bold mb-3">Key Risk Factors:</h3>
            <ul className="space-y-2">{riskData.risk_factors.slice(0, 5).map((f: string, i: number) => <li key={i} className="flex gap-2"><span className="text-emerald-600">•</span>{f}</li>)}</ul>
          </div>
        </div>

        {/* PAGE 2: WEATHER */}
        <div className="bg-white rounded-lg shadow-lg p-8 print-break">
          <h2 className="text-2xl font-bold text-emerald-600 mb-6 flex items-center gap-2"><CloudRain /> Weather Analysis</h2>
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">14-Day Forecast</h3>
            <table className="w-full text-sm">
              <thead className="bg-emerald-600 text-white"><tr><th className="p-3 text-left">Date</th><th className="p-3">Max °C</th><th className="p-3">Min °C</th><th className="p-3">Rain</th><th className="p-3">Humidity</th></tr></thead>
              <tbody>{forecast.slice(0, 14).map((d: any, i: number) => <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}><td className="p-3">{d.date.substring(0, 10)}</td><td className="p-3 text-center">{d.temperature_max.toFixed(1)}</td><td className="p-3 text-center">{d.temperature_min.toFixed(1)}</td><td className="p-3 text-center">{d.precipitation_sum.toFixed(1)}</td><td className="p-3 text-center">{d.relativehumidity_mean?.toFixed(0) || '-'}</td></tr>)}</tbody>
            </table>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">6-Month Outlook</h3>
            <div className="grid grid-cols-3 gap-4">
              {monthly.slice(0, 6).map((m: any, i: number) => {
                const tAnomaly = m.temperature?.mean_anomaly?.[0] || 0;
                const pAnomaly = m.precipitation?.mean_anomaly?.[0] || 0;
                return (<div key={i} className="border rounded p-4"><div className="font-bold mb-2">{m.month.substring(0, 7)}</div><div className="text-sm space-y-1"><div className="flex items-center gap-2"><Thermometer size={16} /><span className={tAnomaly > 5 ? 'text-red-600' : tAnomaly < -5 ? 'text-blue-600' : ''}>{tAnomaly > 5 ? 'Above Avg' : tAnomaly < -5 ? 'Below Avg' : 'Normal'}</span></div><div className="flex items-center gap-2"><Droplets size={16} /><span className={pAnomaly > 20 ? 'text-blue-600' : pAnomaly < -20 ? 'text-red-600' : ''}>{pAnomaly > 20 ? 'Above Avg' : pAnomaly < -20 ? 'Below Avg' : 'Normal'}</span></div></div></div>);
              })}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4">Stress Indicators</h3>
            <div className="grid grid-cols-2 gap-4">
              <StressCard label="Cold Stress" value={`${stress.cold_stress_days} days`} pct={stress.cold_stress_fraction * 100} />
              <StressCard label="Heat Stress" value={`${stress.heat_stress_days} days`} pct={stress.heat_stress_fraction * 100} />
              <StressCard label="High Humidity" value={`${stress.high_humidity_days} days`} />
              <StressCard label="Precipitation" value={`${(stress.precipitation_adequacy_ratio * 100).toFixed(0)}% adequate`} />
            </div>
          </div>
        </div>

        {/* PAGE 3: CROP HEALTH */}
        <div className="bg-white rounded-lg shadow-lg p-8 print-break">
          <h2 className="text-2xl font-bold text-emerald-600 mb-6 flex items-center gap-2"><Activity /> Crop Health</h2>
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">NDVI</h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoCard label="Peak NDVI" value={cropInfo.expected_peak_ndvi?.toFixed(2) || 'N/A'} />
              <InfoCard label="Stage" value={cropInfo.current_stage?.replace('_', ' ').toUpperCase() || 'N/A'} />
              <InfoCard label="Days After Planting" value={cropInfo.current_das || 'N/A'} />
              <InfoCard label="Season Length" value={`${cropInfo.expected_season_length || 'N/A'} days`} />
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">Drought Assessment</h3>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded grid grid-cols-3 gap-4">
              <div><div className="text-sm text-gray-600">Deficit</div><div className="text-xl font-bold">{stress.precipitation_deficit_mm?.toFixed(1) || '0'} mm</div></div>
              <div><div className="text-sm text-gray-600">Adequacy</div><div className="text-xl font-bold">{(stress.precipitation_adequacy_ratio * 100).toFixed(0)}%</div></div>
              <div><div className="text-sm text-gray-600">Risk</div><div className="text-xl font-bold">{stress.precipitation_adequacy_ratio < 0.5 ? 'HIGH' : stress.precipitation_adequacy_ratio < 0.8 ? 'MODERATE' : 'LOW'}</div></div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">Disease Pressure</h3>
            <div className={`p-6 rounded-lg ${stress.disease_pressure_risk > 0.6 ? 'bg-red-50 border-2 border-red-300' : stress.disease_pressure_risk > 0.3 ? 'bg-yellow-50 border-2 border-yellow-300' : 'bg-green-50 border-2 border-green-300'}`}>
              <div className="text-3xl font-bold mb-2">{stress.disease_pressure_risk?.toFixed(2) || '0.00'}</div>
              <div className="text-lg font-semibold mb-3">{stress.disease_pressure_risk > 0.6 ? 'HIGH RISK' : stress.disease_pressure_risk > 0.3 ? 'MODERATE' : 'LOW RISK'}</div>
              <div className="text-sm">High Humidity: {stress.high_humidity_days} days</div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4">Location</h3>
            <div className="grid grid-cols-3 gap-4">
              <InfoCard label="Coordinates" value={`${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`} />
              <InfoCard label="Elevation" value={`${report.results?.risk_ml?.coordinates?.elevation || 'N/A'} m`} />
              <InfoCard label="Zone" value={report.results?.risk_ml?.coordinates?.ghana_zone?.toUpperCase() || 'N/A'} />
            </div>
          </div>
        </div>

        {/* PAGE 4: MONITORING */}
        <div className="bg-white rounded-lg shadow-lg p-8 print-break">
          <h2 className="text-2xl font-bold text-emerald-600 mb-6 flex items-center gap-2"><Satellite /> Monitoring</h2>
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">Satellite Status</h3>
            <div className={`p-6 rounded-lg ${report.satellite_monitoring_enabled ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-3 mb-2">{report.satellite_monitoring_enabled ? <CheckCircle className="text-green-600" size={24} /> : <AlertTriangle className="text-gray-400" size={24} />}<span className="text-xl font-bold">{report.satellite_monitoring_enabled ? 'ACTIVE' : 'INACTIVE'}</span></div>
              <p className="text-sm text-gray-600">{report.satellite_monitoring_enabled ? 'Satellite imagery enabled' : 'Enable for advanced analytics'}</p>
              {report.satellite_monitoring_enabled && <div className="mt-3 text-sm"><span className="font-semibold">Polygon ID:</span> {report.results?.satellite?.poly_id || 'N/A'}</div>}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4">Data Sources</h3>
            <div className="grid grid-cols-2 gap-3">{Object.entries(report.results?.risk_ml?.data_sources_used || {}).map(([source, available]) => <div key={source} className="flex items-center gap-2 p-3 bg-gray-50 rounded">{available ? <CheckCircle className="text-green-600" size={18} /> : <span className="text-red-600">×</span>}<span className="capitalize">{source.replace('_', ' ')}</span></div>)}</div>
          </div>
        </div>

        {/* PAGE 5: RECOMMENDATIONS */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-emerald-600 mb-6 flex items-center gap-2"><CheckCircle /> Recommendations</h2>
          {generateRecommendations(report, riskData, stress).map((rec, i) => <div key={i} className="mb-6"><div className={`p-4 rounded-lg mb-3 ${rec.priority === 'CRITICAL' ? 'bg-red-100 border-l-4 border-red-500' : rec.priority === 'HIGH' ? 'bg-orange-100 border-l-4 border-orange-500' : 'bg-yellow-100 border-l-4 border-yellow-500'}`}><h3 className="text-lg font-bold mb-2">{i + 1}. {rec.title} <span className="text-sm">[ {rec.priority} ]</span></h3><ul className="space-y-2 ml-4">{rec.actions.map((a, j) => <li key={j} className="flex gap-2"><span className="text-emerald-600 font-bold">→</span>{a}</li>)}</ul></div></div>)}

          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-bold mb-4">Best Practices</h3>
            <ul className="space-y-2">{['Keep accurate records', 'Regular inspections', 'Monitor weather', 'Network with farmers', 'Join cooperatives'].map((p, i) => <li key={i} className="flex gap-2"><CheckCircle className="text-emerald-600 mt-0.5" size={18} />{p}</li>)}</ul>
          </div>

          <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
            <p>Generated: {new Date().toLocaleString()}</p>
            <p className="mt-2">Support: support@agricheck.farm</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Components
function RiskBar({ label, score, inverse = false }: any) {
  const displayScore = inverse ? 1 - score : score;
  const pct = displayScore * 100;
  const color = pct > 60 ? 'bg-red-500' : pct > 30 ? 'bg-yellow-500' : 'bg-green-500';
  return <div><div className="flex justify-between mb-1"><span className="font-semibold">{label}</span><span>{score.toFixed(2)}</span></div><div className="w-full bg-gray-200 rounded-full h-4"><div className={`${color} h-4 rounded-full`} style={{ width: `${pct}%` }} /></div></div>;
}

function StressCard({ label, value, pct }: any) {
  return <div className="bg-gray-50 p-4 rounded-lg"><div className="text-sm text-gray-600 mb-1">{label}</div><div className="text-xl font-bold">{value}</div>{pct !== undefined && <div className="text-sm text-gray-500 mt-1">{pct.toFixed(0)}%</div>}</div>;
}

function InfoCard({ label, value }: any) {
  return <div className="bg-gray-50 p-4 rounded-lg"><div className="text-sm text-gray-600 mb-1">{label}</div><div className="text-lg font-bold">{value}</div></div>;
}

// Helpers
function getRiskData(report: any) {
  const riskAssessment = report.results?.risk_ml?.risk_assessment?.[report.cropType.toUpperCase()] || {};
  return { risk_level: riskAssessment.risk_level || 'Unknown', risk_score: riskAssessment.risk_score || 0, components: riskAssessment.components || {}, risk_factors: riskAssessment.risk_factors || [] };
}

function getStressData(report: any) {
  return report.results?.risk_ml?.risk_computation?.crop_risk_analysis?.[report.cropType]?.stress_indicators || { cold_stress_days: 0, cold_stress_fraction: 0, heat_stress_days: 0, heat_stress_fraction: 0, high_humidity_days: 0, precipitation_adequacy_ratio: 0, precipitation_deficit_mm: 0, disease_pressure_risk: 0 };
}

function getRiskBgColor(level: string) {
  if (level.toLowerCase().includes('low')) return 'bg-green-100 border-2 border-green-300';
  if (level.toLowerCase().includes('moderate')) return 'bg-yellow-100 border-2 border-yellow-300';
  return 'bg-red-100 border-2 border-red-300';
}

function generateRecommendations(report: any, riskData: any, stress: any) {
  const recommendations = [];
  const c = riskData.components;
  if (riskData.risk_level.includes('High')) recommendations.push({ priority: 'CRITICAL', title: 'High Risk Alert', actions: ['Act immediately', 'Increase monitoring', 'Secure insurance', 'Consult experts'] });
  if (c.short_term_weather_risk > 0.5) recommendations.push({ priority: 'HIGH', title: 'Weather Risk', actions: ['Monitor forecasts', 'Check drainage', 'Prepare irrigation', 'Inspect fields'] });
  if (c.price_volatility > 0.6) recommendations.push({ priority: 'HIGH', title: 'Market Risk', actions: ['Forward contracts', 'Crop insurance', 'Diversify markets', 'Track prices'] });
  if (stress.disease_pressure_risk > 0.5) recommendations.push({ priority: 'MEDIUM', title: 'Disease Prevention', actions: ['Apply fungicides', 'Weekly scouting', 'Remove infected plants', 'Improve circulation'] });
  if (stress.precipitation_adequacy_ratio < 0.6) recommendations.push({ priority: 'MEDIUM', title: 'Water Management', actions: ['Plan irrigation', 'Apply mulch', 'Monitor moisture', 'Drought varieties'] });
  return recommendations;
}