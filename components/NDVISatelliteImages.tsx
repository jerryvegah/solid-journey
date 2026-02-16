// components/NDVISatelliteImages.tsx
// COMPLETE FIX: HTTPS + Pre-Planting Detection + Mobile Responsive
"use client";

import { useEffect, useState } from 'react';

interface ImageryData {
  date: string;
  ndvi_mean: number;
  cloud_coverage: number;
  image_type?: string;
  available_types?: string[];
  images?: {
    ndvi?: string;
    truecolor?: string;
    falsecolor?: string;
  };
  satellite?: string;
  timestamp?: number;
  health_status?: string;
}

interface NDVIStats {
  current_ndvi: number;
  health_status: string;
  growth_stage: string;
  current_das: number;
  is_pre_planting?: boolean;
}

interface NDVISatelliteImagesProps {
  reportId: string;
  userId: string;
  polyId?: string;
  cropInfo?: {
    current_stage?: string;
    current_das?: number;
    expected_peak_ndvi?: number;
    planting_date?: string;
  };
}

export default function NDVISatelliteImages({ reportId, userId, polyId, cropInfo }: NDVISatelliteImagesProps) {
  const [imageryData, setImageryData] = useState<ImageryData[]>([]);
  const [ndviStats, setNdviStats] = useState<NDVIStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!polyId) {
      setError('No polygon ID available for satellite imagery');
      setLoading(false);
      return;
    }

    loadNDVIData();
  }, [reportId, userId, polyId]);

  const loadNDVIData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading satellite data from Agromonitoring for poly_id:', polyId);

      const AGRO_API_KEY = process.env.NEXT_PUBLIC_AGRO_API_KEY;
      
      if (!AGRO_API_KEY) {
        console.error('❌ AGRO_API_KEY not configured');
        setError('Satellite monitoring not configured');
        setLoading(false);
        return;
      }

      const endDate = Math.floor(Date.now() / 1000);
      const startDate = endDate - (60 * 24 * 60 * 60);

      const imageSearchUrl = `https://api.agromonitoring.com/agro/1.0/image/search?start=${startDate}&end=${endDate}&polyid=${polyId}&appid=${AGRO_API_KEY}`;
      
      console.log('📡 Calling Agromonitoring API...');
      const response = await fetch(imageSearchUrl);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Agromonitoring API error:', response.status, errorText);
        setError(`Agromonitoring API error: ${response.status}`);
        setLoading(false);
        return;
      }

      const imagery = await response.json();
      console.log('✅ Agromonitoring API response:', imagery.length, 'images');

      if (!imagery || imagery.length === 0) {
        console.warn('⚠️ No imagery data returned');
        setError('No satellite imagery available');
        setImageryData([]);
        setLoading(false);
        return;
      }

      // Fetch NDVI stats for each image
      const transformedImagery = await Promise.all(
        imagery.map(async (img: any) => {
          let ndviMean = 0;
          
          if (img.stats?.ndvi) {
            if (typeof img.stats.ndvi === 'object' && img.stats.ndvi.mean !== undefined) {
              ndviMean = img.stats.ndvi.mean;
            } else if (typeof img.stats.ndvi === 'string') {
              try {
                // ✅ CRITICAL FIX: Force HTTPS to prevent mixed content errors
                const statsUrl = img.stats.ndvi.replace('http://', 'https://');
                const statsResponse = await fetch(statsUrl);
                if (statsResponse.ok) {
                  const statsData = await statsResponse.json();
                  ndviMean = statsData.mean || 0;
                }
              } catch (err) {
                console.error('❌ Stats fetch failed:', err);
              }
            }
          }
          
          if (ndviMean === 0 && img.data?.mean) {
            ndviMean = img.data.mean;
          }

          const cloudCoverage = img.cl !== undefined ? img.cl : (img.cloud || 0);
          
          return {
            date: new Date(img.dt * 1000).toISOString().split('T')[0],
            timestamp: img.dt,
            ndvi_mean: ndviMean,
            cloud_coverage: cloudCoverage,
            image_type: img.type || 'image',
            available_types: img.image ? Object.keys(img.image) : [],
            satellite: img.type || 'Unknown',
            images: {
              // ✅ Force HTTPS on image URLs too
              ndvi: img.image?.ndvi?.replace('http://', 'https://'),
              truecolor: img.image?.truecolor?.replace('http://', 'https://'),
              falsecolor: img.image?.falsecolor?.replace('http://', 'https://')
            },
            health_status: getNDVIHealthStatus(ndviMean)
          };
        })
      );

      transformedImagery.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      console.log('✅ Transformed imagery:', transformedImagery.length);
      setImageryData(transformedImagery);

      // Check pre-planting status
      const plantingDateStr = cropInfo?.planting_date;
      const isPrePlanting = plantingDateStr ? new Date(plantingDateStr) > new Date() : false;
      const currentDAS = cropInfo?.current_das ?? 0;

      if (isPrePlanting || currentDAS < 0) {
        const expectedNDVI = cropInfo?.expected_peak_ndvi || 0.75;
        setNdviStats({
          current_ndvi: expectedNDVI,
          health_status: 'Pre-Planting',
          growth_stage: 'Not Yet Planted',
          current_das: currentDAS,
          is_pre_planting: true
        });
      } else {
        const latestWithNDVI = transformedImagery.find(img => img.ndvi_mean > 0);
        
        if (latestWithNDVI) {
          setNdviStats({
            current_ndvi: latestWithNDVI.ndvi_mean,
            health_status: latestWithNDVI.health_status || getNDVIHealthStatus(latestWithNDVI.ndvi_mean),
            growth_stage: cropInfo?.current_stage || 'Unknown',
            current_das: currentDAS,
            is_pre_planting: false
          });
        } else {
          const fallbackNDVI = cropInfo?.expected_peak_ndvi || 0;
          setNdviStats({
            current_ndvi: fallbackNDVI,
            health_status: getNDVIHealthStatus(fallbackNDVI),
            growth_stage: cropInfo?.current_stage || 'Unknown',
            current_das: currentDAS,
            is_pre_planting: false
          });
        }
      }

    } catch (err) {
      console.error('💥 Error loading satellite data:', err);
      setError('Failed to load satellite data');
    } finally {
      setLoading(false);
    }
  };

  const getNDVIHealthStatus = (ndvi: number): string => {
    if (ndvi >= 0.7) return 'Excellent';
    if (ndvi >= 0.5) return 'Good';
    if (ndvi >= 0.3) return 'Moderate';
    if (ndvi >= 0.1) return 'Poor';
    return 'Critical';
  };

  const getHealthColor = (health: string): string => {
    switch (health) {
      case 'Pre-Planting': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Excellent': return 'text-green-600 bg-green-50 border-green-200';
      case 'Good': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'Moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Poor': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>, backupUrl: string, index: number) => {
    const img = event.currentTarget;
    const container = img.parentElement;
    
    if (!container) return;

    const loadingIndicator = container.querySelector('.loading-indicator');
    if (loadingIndicator) {
      (loadingIndicator as HTMLElement).style.display = 'none';
    }

    if (backupUrl && backupUrl !== img.src) {
      img.src = backupUrl;
      img.alt = `Backup image`;
      img.onerror = () => showImageError(container, index);
      return;
    }

    showImageError(container, index);
  };

  const showImageError = (container: Element, index: number) => {
    const errorPlaceholder = document.createElement('div');
    errorPlaceholder.className = 'flex flex-col items-center justify-center w-full h-full bg-gray-100 text-gray-500';
    errorPlaceholder.innerHTML = `
      <i class="fas fa-image text-3xl sm:text-4xl mb-2 opacity-50"></i>
      <div class="font-semibold text-xs sm:text-sm">Image Unavailable</div>
    `;
    container.innerHTML = '';
    container.appendChild(errorPlaceholder);
  };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const container = img.parentElement;
    
    if (!container) return;

    img.style.opacity = '1';
    
    const loadingIndicator = container.querySelector('.loading-indicator');
    if (loadingIndicator) {
      (loadingIndicator as HTMLElement).style.display = 'none';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 sm:py-12">
        <i className="fas fa-spinner fa-spin text-3xl sm:text-4xl text-blue-600 mb-3 sm:mb-4"></i>
        <p className="text-sm sm:text-base text-gray-600">Loading satellite imagery...</p>
      </div>
    );
  }

  if (error && imageryData.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
        <i className="fas fa-satellite-dish text-3xl sm:text-4xl text-red-500 mb-3 sm:mb-4 opacity-50"></i>
        <p className="text-sm sm:text-base text-gray-500 font-bold px-4">{error}</p>
        <button 
          onClick={loadNDVIData}
          className="mt-4 px-4 py-2 bg-emerald-600 text-white text-sm sm:text-base rounded-lg hover:bg-emerald-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* NDVI Stats - Mobile Responsive Grid */}
      {ndviStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {/* NDVI Card */}
          <div className={`p-3 sm:p-4 rounded-xl border shadow-sm ${
            ndviStats.is_pre_planting ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
          }`}>
            <h5 className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1 sm:mb-2">
              {ndviStats.is_pre_planting ? 'Expected NDVI' : 'Current NDVI'}
            </h5>
            <div className={`text-xl sm:text-2xl font-black ${
              ndviStats.is_pre_planting ? 'text-blue-600' :
              ndviStats.current_ndvi >= 0.5 ? 'text-emerald-600' : 
              ndviStats.current_ndvi >= 0.3 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {ndviStats.current_ndvi.toFixed(3)}
            </div>
            {ndviStats.is_pre_planting && (
              <div className="text-[10px] sm:text-xs text-blue-600 mt-1 font-semibold">
                <i className="fas fa-calendar mr-1"></i>
                Field prep
              </div>
            )}
          </div>
          
          {/* Health Status Card */}
          <div className={`p-3 sm:p-4 rounded-xl border shadow-sm ${getHealthColor(ndviStats.health_status)}`}>
            <h5 className="text-[10px] sm:text-xs font-bold uppercase mb-1 sm:mb-2 opacity-75">Health</h5>
            <div className="text-lg sm:text-2xl font-black">{ndviStats.health_status}</div>
          </div>
          
          {/* Growth Stage Card */}
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm">
            <h5 className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1 sm:mb-2">Stage</h5>
            <div className="text-sm sm:text-lg font-black text-slate-800 capitalize leading-tight">
              {ndviStats.growth_stage.replace('_', ' ')}
            </div>
          </div>
          
          {/* Days Card */}
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm">
            <h5 className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase mb-1 sm:mb-2">
              {ndviStats.is_pre_planting ? 'Days to Plant' : 'DAS'}
            </h5>
            <div className="text-xl sm:text-2xl font-black text-slate-800">
              {ndviStats.is_pre_planting ? Math.abs(ndviStats.current_das) : ndviStats.current_das}
            </div>
          </div>
        </div>
      )}

      {/* Pre-Planting Notice */}
      {ndviStats?.is_pre_planting && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
          <div className="flex items-start gap-2 sm:gap-3">
            <i className="fas fa-info-circle text-blue-600 text-base sm:text-xl mt-0.5"></i>
            <div>
              <h4 className="font-bold text-blue-900 text-sm sm:text-base mb-1">Field Preparation Phase</h4>
              <p className="text-xs sm:text-sm text-blue-700">
                This field has not been planted yet. Satellite imagery shows current conditions before planting.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Satellite Images Grid - Mobile Responsive */}
      <h3 className="text-base sm:text-lg font-black text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
        <i className="fas fa-images text-emerald-600 text-sm sm:text-base"></i>
        <span>Recent Imagery ({imageryData.length})</span>
      </h3>

      {imageryData.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <i className="fas fa-satellite text-3xl sm:text-4xl text-gray-400 mb-3 sm:mb-4 opacity-50"></i>
          <p className="text-sm sm:text-base text-gray-500 font-bold">No recent imagery available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {imageryData.slice(0, 6).map((img, index) => {
            const ndviUrl = img.images?.ndvi || '';
            const truecolorUrl = img.images?.truecolor || '';
            const primaryImage = ndviUrl || truecolorUrl;

            return (
              <div key={index} className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 shadow-sm hover:shadow-md transition-shadow">
                <div className="relative w-full h-48 sm:h-64 bg-gray-100 overflow-hidden">
                  {primaryImage ? (
                    <>
                      <img
                        src={primaryImage}
                        alt={`NDVI ${img.date}`}
                        className="w-full h-full object-cover absolute inset-0 z-10 opacity-0 transition-opacity duration-300"
                        onError={(e) => handleImageError(e, truecolorUrl, index)}
                        onLoad={(e) => handleImageLoad(e)}
                        loading="lazy"
                      />
                      
                      <div className="absolute top-2 right-2 bg-emerald-600 text-white px-2 py-1 rounded text-[10px] sm:text-xs font-bold z-20">
                        {ndviUrl ? 'NDVI' : 'True Color'}
                      </div>

                      <div className="loading-indicator absolute inset-0 flex flex-col items-center justify-center z-30">
                        <i className="fas fa-spinner fa-spin text-2xl sm:text-3xl text-blue-600 mb-2"></i>
                        <span className="text-[10px] sm:text-xs text-gray-600">Loading...</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full">
                      <i className="fas fa-image text-3xl sm:text-4xl text-gray-400 mb-2"></i>
                      <span className="text-xs sm:text-sm text-gray-500">No Image</span>
                    </div>
                  )}
                </div>

                <div className="p-3 sm:p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-xs sm:text-sm text-gray-800">
                      {new Date(img.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className={`px-2 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold ${getHealthColor(img.health_status || 'Critical')}`}>
                      {img.health_status}
                    </div>
                  </div>
                  
                  <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>NDVI:</span>
                      <span className={`font-semibold ${
                        img.ndvi_mean >= 0.5 ? 'text-emerald-600' : 
                        img.ndvi_mean >= 0.3 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {img.ndvi_mean > 0 ? img.ndvi_mean.toFixed(3) : 'N/A'}
                      </span>
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-400 flex justify-between">
                      <span>Cloud:</span>
                      <span>{img.cloud_coverage}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}