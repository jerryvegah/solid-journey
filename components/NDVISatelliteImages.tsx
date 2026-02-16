// components/NDVISatelliteImages.tsx
// FIXED: Handles pre-planting scenario correctly
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

      console.log('🔄 Loading satellite data directly from Agromonitoring for poly_id:', polyId);

      const AGRO_API_KEY = process.env.NEXT_PUBLIC_AGRO_API_KEY;
      
      if (!AGRO_API_KEY) {
        console.error('❌ AGRO_API_KEY not configured in environment');
        setError('Satellite monitoring not configured');
        setLoading(false);
        return;
      }

      const endDate = Math.floor(Date.now() / 1000);
      const startDate = endDate - (60 * 24 * 60 * 60); // 60 days ago

      // Call Agromonitoring with stats included
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
      console.log('✅ Agromonitoring API response:', imagery);

      if (!imagery || imagery.length === 0) {
        console.warn('⚠️ No imagery data returned from Agromonitoring');
        setError('No satellite imagery available for this field');
        setImageryData([]);
        setLoading(false);
        return;
      }

      // Fetch NDVI stats for each image
      const transformedImagery = await Promise.all(
        imagery.map(async (img: any) => {
          let ndviMean = 0;
          
          // METHOD 1: Check if stats are already in the response
          if (img.stats?.ndvi) {
            if (typeof img.stats.ndvi === 'object' && img.stats.ndvi.mean !== undefined) {
              ndviMean = img.stats.ndvi.mean;
              console.log('✅ Found NDVI stats in response:', ndviMean);
            } else if (typeof img.stats.ndvi === 'string') {
              // Stats URL - need to fetch
              try {
                console.log('🔄 Fetching NDVI stats from:', img.stats.ndvi);
                const statsResponse = await fetch(img.stats.ndvi);
                if (statsResponse.ok) {
                  const statsData = await statsResponse.json();
                  ndviMean = statsData.mean || 0;
                  console.log('✅ Fetched NDVI stats:', ndviMean);
                }
              } catch (err) {
                console.error('❌ Failed to fetch NDVI stats:', err);
              }
            }
          }
          
          // METHOD 2: Check if there's a data.mean field
          if (ndviMean === 0 && img.data?.mean) {
            ndviMean = img.data.mean;
            console.log('✅ Found NDVI in data.mean:', ndviMean);
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
              ndvi: img.image?.ndvi,
              truecolor: img.image?.truecolor,
              falsecolor: img.image?.falsecolor
            },
            health_status: getNDVIHealthStatus(ndviMean)
          };
        })
      );

      // Sort by date (newest first)
      transformedImagery.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      console.log('✅ Transformed imagery with NDVI values:', transformedImagery);
      setImageryData(transformedImagery);

      // ✅ NEW: Check if field is pre-planting
      const plantingDateStr = cropInfo?.planting_date;
      const isPrePlanting = plantingDateStr ? new Date(plantingDateStr) > new Date() : false;
      const currentDAS = cropInfo?.current_das ?? 0;
      
      console.log('📅 Planting check:', {
        plantingDate: plantingDateStr,
        isPrePlanting,
        currentDAS
      });

      if (isPrePlanting || currentDAS < 0) {
        // ✅ BEFORE PLANTING: Show expected NDVI
        const expectedNDVI = cropInfo?.expected_peak_ndvi || 0.75;
        console.log('🌱 Field not yet planted - showing expected NDVI:', expectedNDVI);
        
        setNdviStats({
          current_ndvi: expectedNDVI,
          health_status: 'Pre-Planting',
          growth_stage: 'Not Yet Planted',
          current_das: currentDAS,
          is_pre_planting: true
        });
      } else {
        // ✅ AFTER PLANTING: Show actual NDVI from satellite
        const latestWithNDVI = transformedImagery.find(img => img.ndvi_mean > 0);
        
        if (latestWithNDVI) {
          console.log('✅ NDVI Stats set from latest image:', {
            ndvi: latestWithNDVI.ndvi_mean,
            health: latestWithNDVI.health_status,
            date: latestWithNDVI.date
          });
          
          setNdviStats({
            current_ndvi: latestWithNDVI.ndvi_mean,
            health_status: latestWithNDVI.health_status || getNDVIHealthStatus(latestWithNDVI.ndvi_mean),
            growth_stage: cropInfo?.current_stage || 'Unknown',
            current_das: currentDAS,
            is_pre_planting: false
          });
        } else {
          // Fallback: Use expected peak NDVI
          const fallbackNDVI = cropInfo?.expected_peak_ndvi || 0;
          console.warn('⚠️ No valid NDVI data found, using expected peak:', fallbackNDVI);
          
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

  const forceHttpsUrl = (url: string) => {
    if (!url) return '';
    return url.replace('http://', 'https://');
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

    if (backupUrl && backupUrl !== img.src && backupUrl !== '') {
      console.log(`⚠️ Trying backup image for index ${index}`);
      img.src = forceHttpsUrl(backupUrl);
      img.alt = `True Color Map`;
      
      const overlay = container.querySelector('.image-overlay');
      if (overlay) {
        overlay.textContent = 'True Color';
        (overlay as HTMLElement).style.background = 'rgba(0,123,255,0.8)';
      }
      
      img.onerror = () => showImageError(container, index);
      return;
    }

    showImageError(container, index);
  };

  const showImageError = (container: Element, index: number) => {
    const errorPlaceholder = document.createElement('div');
    errorPlaceholder.className = 'flex flex-col items-center justify-center w-full h-full bg-gray-100 text-gray-500';
    errorPlaceholder.innerHTML = `
      <i class="fas fa-image text-4xl mb-2 opacity-50"></i>
      <div class="font-semibold">Image Unavailable</div>
    `;
    container.innerHTML = '';
    container.appendChild(errorPlaceholder);
  };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>, index: number) => {
    const img = event.currentTarget;
    const container = img.parentElement;
    
    if (!container) return;

    console.log(`✅ Image ${index + 1} loaded successfully`);
    img.style.opacity = '1';
    
    const loadingIndicator = container.querySelector('.loading-indicator');
    if (loadingIndicator) {
      (loadingIndicator as HTMLElement).style.display = 'none';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
        <p className="text-gray-600">Loading satellite imagery...</p>
      </div>
    );
  }

  if (error && imageryData.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
        <i className="fas fa-satellite-dish text-4xl text-red-500 mb-4 opacity-50"></i>
        <p className="text-gray-500 font-bold">{error}</p>
        <button 
          onClick={loadNDVIData}
          className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* NDVI Stats */}
      {ndviStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* ✅ NDVI Card - Different styling for pre-planting */}
          <div className={`p-4 rounded-xl border shadow-sm ${
            ndviStats.is_pre_planting 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-white border-gray-200'
          }`}>
            <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">
              {ndviStats.is_pre_planting ? 'Expected NDVI' : 'Current NDVI'}
            </h5>
            <div className={`text-2xl font-black ${
              ndviStats.is_pre_planting ? 'text-blue-600' :
              ndviStats.current_ndvi >= 0.5 ? 'text-emerald-600' : 
              ndviStats.current_ndvi >= 0.3 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {ndviStats.current_ndvi.toFixed(3)}
            </div>
            {ndviStats.is_pre_planting && (
              <div className="text-xs text-blue-600 mt-1 font-semibold">
                <i className="fas fa-calendar mr-1"></i>
                Field preparation
              </div>
            )}
          </div>
          
          {/* ✅ Health Status Card */}
          <div className={`p-4 rounded-xl border shadow-sm ${getHealthColor(ndviStats.health_status)}`}>
            <h5 className="text-xs font-bold uppercase mb-2 opacity-75">Health Status</h5>
            <div className="text-2xl font-black">{ndviStats.health_status}</div>
            {ndviStats.is_pre_planting && (
              <div className="text-xs mt-1 opacity-75">
                Awaiting planting
              </div>
            )}
          </div>
          
          {/* Growth Stage Card */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Growth Stage</h5>
            <div className="text-lg font-black text-slate-800 capitalize">
              {ndviStats.growth_stage.replace('_', ' ')}
            </div>
          </div>
          
          {/* Days After Planting Card */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">
              {ndviStats.is_pre_planting ? 'Days to Planting' : 'Days After Planting'}
            </h5>
            <div className="text-2xl font-black text-slate-800">
              {ndviStats.is_pre_planting ? Math.abs(ndviStats.current_das) : ndviStats.current_das}
            </div>
          </div>
        </div>
      )}

      {/* ✅ Pre-Planting Notice */}
      {ndviStats?.is_pre_planting && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg mb-6">
          <div className="flex items-start gap-3">
            <i className="fas fa-info-circle text-blue-600 text-xl mt-0.5"></i>
            <div>
              <h4 className="font-bold text-blue-900 mb-1">Field Preparation Phase</h4>
              <p className="text-sm text-blue-700">
                This field has not been planted yet. The NDVI value shown is the expected peak based on crop type. 
                Satellite imagery below shows current field conditions before planting.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Satellite Images Grid */}
      <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
        <i className="fas fa-images text-emerald-600"></i>
        Recent Satellite Imagery ({imageryData.length})
      </h3>

      {imageryData.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <i className="fas fa-satellite text-4xl text-gray-400 mb-4 opacity-50"></i>
          <p className="text-gray-500 font-bold">No recent imagery available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {imageryData.slice(0, 6).map((img, index) => {
            const ndviUrl = forceHttpsUrl(img.images?.ndvi || '');
            const truecolorUrl = forceHttpsUrl(img.images?.truecolor || '');
            const primaryImage = ndviUrl || truecolorUrl;

            return (
              <div key={index} className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 shadow-sm hover:shadow-md transition-shadow">
                <div className="relative w-full h-64 bg-gray-100 overflow-hidden">
                  {primaryImage ? (
                    <>
                      <img
                        src={primaryImage}
                        alt={`NDVI Map for ${new Date(img.date).toLocaleDateString()}`}
                        className="w-full h-full object-cover absolute top-0 left-0 z-10 opacity-0 transition-opacity duration-300"
                        onError={(e) => handleImageError(e, truecolorUrl, index)}
                        onLoad={(e) => handleImageLoad(e, index)}
                        loading="lazy"
                      />
                      
                      <div className="image-overlay absolute top-2 right-2 bg-emerald-600 text-white px-2 py-1 rounded text-xs font-bold z-20">
                        {ndviUrl ? 'NDVI' : 'True Color'}
                      </div>

                      <div className="loading-indicator absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center">
                        <i className="fas fa-spinner fa-spin text-3xl text-blue-600 mb-2"></i>
                        <span className="text-xs text-gray-600">Loading...</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center w-full h-full">
                      <i className="fas fa-image text-4xl text-gray-400 mb-2"></i>
                      <span className="text-sm text-gray-500">No Image</span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-white">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold text-gray-800">
                      {new Date(img.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-xs font-bold ${getHealthColor(img.health_status || 'Critical')}`}>
                      {img.health_status}
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>NDVI:</span>
                      <span className={`font-semibold ${
                        img.ndvi_mean >= 0.5 ? 'text-emerald-600' : 
                        img.ndvi_mean >= 0.3 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {img.ndvi_mean > 0 ? img.ndvi_mean.toFixed(3) : 'N/A'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 flex justify-between">
                      <span>Cloud:</span>
                      <span>{img.cloud_coverage}%</span>
                    </div>
                    <div className="text-xs text-gray-400 flex justify-between">
                      <span>Satellite:</span>
                      <span>{img.satellite}</span>
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