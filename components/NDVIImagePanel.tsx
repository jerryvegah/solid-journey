"use client";

/**
 * NDVIImagePanel
 * ==============
 * Renders the colour-map NDVI image from Sentinel Hub with:
 *  - Interactive Timeline Slider (up to 6 frames)
 *  - Field polygon boundary drawn as an SVG overlay
 *  - Compact NDVI legend
 *  - Dynamic Mean NDVI badge & labels
 *  - CSS Cross-fade animations between growth stages
 */

import { useEffect, useRef, useState } from "react";
import { Satellite, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface HistoryFrame {
    ndvi?: {
        image_b64: string;
        mean_ndvi: number | null;
        acquisition_date: string;
        bbox?: [number, number, number, number] | null;
    };
    sar_features?: any;
    intelligence?: any;
    latest_product?: any;
}

interface Props {
    imageB64: string;
    meanNDVI: number | null;
    acquisitionDate: string;
    bbox?: [number, number, number, number] | null;
    fieldCoordinates?: string | null;
    history?: HistoryFrame[];
}

// ─── Colour legend entries ───────────────────────────────────────────────────
const LEGEND = [
    { color: "#808080", label: "No data / cloud" },
    { color: "#BDB669", label: "< 0.0 (bare / water)" },
    { color: "#FFFACC", label: "0.0 – 0.1" },
    { color: "#CCEd66", label: "0.1 – 0.2" },
    { color: "#91D252", label: "0.2 – 0.3" },
    { color: "#59B33D", label: "0.3 – 0.4" },
    { color: "#2E942E", label: "0.4 – 0.5" },
    { color: "#1A7A1A", label: "0.5 – 0.6" },
    { color: "#005910", label: "> 0.6 (dense canopy)" },
];

function ndviLabel(v: number | null): string {
    if (v === null) return "N/A";
    if (v < 0)    return "Bare / water";
    if (v < 0.15) return "Very sparse vegetation";
    if (v < 0.3)  return "Sparse / establishing";
    if (v < 0.5)  return "Moderate vegetation";
    if (v < 0.7)  return "Good vegetation";
    return "Dense canopy";
}

// ─── Project [lon, lat] → pixel (x, y) ───────────────────────────────────────
function project(
    lon: number,
    lat: number,
    bbox: [number, number, number, number],
    w: number,
    h: number,
): [number, number] {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const x = ((lon - minLon) / (maxLon - minLon)) * w;
    const y = ((maxLat - lat) / (maxLat - minLat)) * h;
    return [x, y];
}

export default function NDVIImagePanel({
    imageB64,
    meanNDVI,
    acquisitionDate,
    bbox,
    fieldCoordinates,
    history = [],
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

    // ─── Timeline State ─────────────────────────────────────────────────────
    // Normalize data: combine current props with history list
    const frames = history.length > 0 
        ? history.filter(f => f.ndvi?.image_b64)
        : [{ 
            ndvi: { 
                image_b64: imageB64, 
                mean_ndvi: meanNDVI, 
                acquisition_date: acquisitionDate, 
                bbox: bbox 
            } 
        }];

    const [selectedIndex, setSelectedIndex] = useState(frames.length - 1);
    const [compareMode, setCompareMode] = useState(false);
    const [compareIndexLeft, setCompareIndexLeft] = useState(0);
    const [compareIndexRight, setCompareIndexRight] = useState(frames.length - 1);
    const [swipePosition, setSwipePosition] = useState(50);

    const currentFrame = frames[selectedIndex]?.ndvi || { image_b64: imageB64, mean_ndvi: meanNDVI, acquisition_date: acquisitionDate, bbox: bbox };

    // Measure the rendered image so the SVG overlay matches
    useEffect(() => {
        const el = containerRef.current?.querySelector("img");
        if (!el) return;
        const update = () => setDims({ w: el.clientWidth, h: el.clientHeight });
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [currentFrame.image_b64, compareMode]);

    // Parse field polygon coordinates
    let ringCoords: [number, number][] | null = null;
    const frameBbox = compareMode 
        ? (frames[compareIndexRight]?.ndvi?.bbox || bbox)
        : (currentFrame.bbox || bbox);
    
    if (fieldCoordinates && frameBbox) {
        try {
            let parsed = JSON.parse(fieldCoordinates);
            if (Array.isArray(parsed) && parsed.length === 1 && Array.isArray(parsed[0]) && Array.isArray(parsed[0][0])) {
                parsed = parsed[0];
            }
            if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
                ringCoords = parsed as [number, number][];
            }
        } catch { /* ignore */ }
    }

    const polygonPoints = ringCoords && frameBbox && dims ? ringCoords.map(([lon, lat]) => {
        const [x, y] = project(lon, lat, frameBbox, dims.w, dims.h);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ") : null;

    const dateStr = currentFrame.acquisition_date ? new Date(currentFrame.acquisition_date).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric"
    }) : null;

    return (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 transition-all duration-300">
            
            {/* Mode Switcher Tabs */}
            {frames.length > 1 && (
                <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 max-w-xs print:hidden">
                    <button
                        onClick={() => setCompareMode(false)}
                        className={`flex-1 text-center py-1.5 rounded-lg text-xs font-black transition-all ${!compareMode ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Timeline Mode
                    </button>
                    <button
                        onClick={() => setCompareMode(true)}
                        className={`flex-1 text-center py-1.5 rounded-lg text-xs font-black transition-all ${compareMode ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Compare Swipe
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
                        <Satellite size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 leading-none">Weekly Crop Growth</h3>
                        {!compareMode ? (
                            dateStr && (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    <Calendar size={12} className="text-slate-400" />
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        Week {selectedIndex + 1} · {dateStr}
                                    </p>
                                </div>
                            )
                        ) : (
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <span className="w-2 h-2 rounded-full bg-slate-600" />
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Swipe to see progress
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Dynamic Mean NDVI badge / Dual Badge for comparison */}
                {!compareMode ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-2.5 text-right w-full sm:w-auto">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Mean NDVI</p>
                        <div className="flex items-baseline justify-end gap-1.5">
                            <span className="text-2xl font-black text-slate-900">{(currentFrame.mean_ndvi || 0).toFixed(4)}</span>
                        </div>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">{ndviLabel(currentFrame.mean_ndvi)}</p>
                    </div>
                ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 text-right w-full sm:w-auto flex items-center justify-end gap-4 shadow-sm">
                        <div className="text-left">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Left (W{compareIndexLeft + 1})</p>
                            <span className="text-sm font-black text-slate-700">{(frames[compareIndexLeft]?.ndvi?.mean_ndvi || 0).toFixed(3)}</span>
                        </div>
                        <div className="text-slate-300 font-extrabold text-xs">VS</div>
                        <div className="text-right">
                            <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest leading-none mb-0.5">Right (W{compareIndexRight + 1})</p>
                            <span className="text-sm font-black text-emerald-600">{(frames[compareIndexRight]?.ndvi?.mean_ndvi || 0).toFixed(3)}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Panel: Image Stack / Swipe Overlay */}
            <div
                ref={containerRef}
                className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 aspect-square shadow-inner z-10"
                style={{ maxHeight: "400px" }}
            >
                {!compareMode ? (
                    /* Standard Images Stack for Cross-Fade */
                    frames.map((f, i) => (
                        <img
                            key={i}
                            src={`data:image/png;base64,${f.ndvi?.image_b64}`}
                            alt={`NDVI Frame ${i}`}
                            className={`absolute inset-0 w-full h-full object-fill transition-opacity duration-700 ease-in-out ${i === selectedIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                            style={{ 
                                imageRendering: "pixelated",
                                background: "#0f172a" 
                            }}
                        />
                    ))
                ) : (
                    /* Swipe Compare Mode Split Layout */
                    <div className="absolute inset-0 w-full h-full">
                        {/* Left Image (Base Layer - shown on the left) */}
                        <img
                            src={`data:image/png;base64,${frames[compareIndexLeft]?.ndvi?.image_b64}`}
                            alt={`NDVI Compare Left W${compareIndexLeft + 1}`}
                            className="absolute inset-0 w-full h-full object-fill"
                            style={{ imageRendering: "pixelated", background: "#0f172a" }}
                        />
                        
                        {/* Right Image (Top Layer - clipped to show only on the right) */}
                        <div 
                            className="absolute inset-y-0 right-0 left-0"
                            style={{ 
                                clipPath: `polygon(${swipePosition}% 0, 100% 0, 100% 100%, ${swipePosition}% 100%)` 
                            }}
                        >
                            <img
                                src={`data:image/png;base64,${frames[compareIndexRight]?.ndvi?.image_b64}`}
                                alt={`NDVI Compare Right W${compareIndexRight + 1}`}
                                className="absolute inset-0 w-full h-full object-fill"
                                style={{ imageRendering: "pixelated", background: "#0f172a" }}
                            />
                        </div>

                        {/* Divider Line */}
                        <div 
                            className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] pointer-events-none z-30 flex items-center justify-center"
                            style={{ left: `${swipePosition}%` }}
                        >
                            {/* Glassmorphic Draggable Handle */}
                            <div className="w-8 h-8 rounded-full bg-emerald-600 border-2 border-white shadow-2xl flex items-center justify-center pointer-events-none select-none text-white font-extrabold text-sm leading-none">
                                ↔
                            </div>
                        </div>

                        {/* Invisible input range control covering the entire image for mouse/touch scrubbing */}
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={swipePosition}
                            onChange={(e) => setSwipePosition(Number(e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-40"
                        />
                    </div>
                )}

                {/* SVG polygon boundary overlay */}
                {polygonPoints && dims && (
                    <svg
                        className="absolute inset-0 pointer-events-none z-20"
                        width={dims.w}
                        height={dims.h}
                        viewBox={`0 0 ${dims.w} ${dims.h}`}
                    >
                        <polygon
                            points={polygonPoints}
                            fill="rgba(16,185,129,0.04)"
                            stroke="#10b981"
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                            strokeDasharray="6 4"
                            className="drop-shadow-sm"
                        />
                    </svg>
                )}

                {/* Frame Badge Overlay */}
                <div className="absolute top-4 left-4 z-30 bg-black/45 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] font-black text-white uppercase tracking-widest pointer-events-none">
                    {!compareMode 
                        ? `Week ${selectedIndex + 1} / ${frames.length}` 
                        : `Left: W${compareIndexLeft + 1} vs Right: W${compareIndexRight + 1}`
                    }
                </div>
            </div>

            {/* ─── Dynamic Timeline Slider / Custom Selector Controls ─── */}
            {frames.length > 1 && (
                <div className="mt-8 bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-100 print:hidden">
                    {!compareMode ? (
                        /* standard week-by-week timeline slider */
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Historical Timeline</span>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
                                        className="p-1 rounded-md hover:bg-white hover:shadow-sm text-slate-400 transition-all disabled:opacity-30"
                                        disabled={selectedIndex === 0}
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button 
                                        onClick={() => setSelectedIndex(Math.min(frames.length - 1, selectedIndex + 1))}
                                        className="p-1 rounded-md hover:bg-white hover:shadow-sm text-slate-400 transition-all disabled:opacity-30"
                                        disabled={selectedIndex === frames.length - 1}
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="relative h-10 flex items-center px-2">
                                <div className="absolute inset-x-4 h-1 bg-slate-200 rounded-full" />
                                <div 
                                    className="absolute left-4 h-1 bg-emerald-500 rounded-full transition-all duration-300" 
                                    style={{ width: `${(selectedIndex / (frames.length - 1)) * 100}%` }}
                                />
                                <input 
                                    type="range"
                                    min={0}
                                    max={frames.length - 1}
                                    step={1}
                                    value={selectedIndex}
                                    onChange={(e) => setSelectedIndex(parseInt(e.target.value))}
                                    className="absolute inset-x-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="absolute inset-x-0 flex justify-between px-2 pointer-events-none">
                                    {frames.map((f, i) => (
                                        <div key={i} className="flex flex-col items-center">
                                            <div 
                                                className={`w-3 h-3 rounded-full border-2 transition-all ${i <= selectedIndex ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`} 
                                            />
                                            <span className={`text-[9px] font-bold mt-2 transition-colors ${i === selectedIndex ? 'text-emerald-600 font-extrabold' : 'text-slate-400'}`}>
                                                Week {i + 1}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        /* Custom selector buttons for compare left and right side images */
                        <div className="space-y-4">
                            <div className="flex flex-col md:flex-row gap-4 justify-between">
                                <div className="flex-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Compare Left Frame (Base Layer)</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {frames.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setCompareIndexLeft(i)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${compareIndexLeft === i ? 'bg-slate-800 text-white shadow-md' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'}`}
                                            >
                                                Week {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Compare Right Frame (Top Slider Layer)</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {frames.map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setCompareIndexRight(i)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${compareIndexRight === i ? 'bg-emerald-600 text-white shadow-md' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'}`}
                                            >
                                                Week {i + 1}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <p className="text-[10px] font-semibold text-slate-400 italic">
                                👉 Drag the interactive split bar on the crop growth image above to swipe between the two selected weeks.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Legend */}
            <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">NDVI Colour Legend</p>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {LEGEND.map(({ color, label }) => (
                        <div key={label} className="flex items-center gap-2">
                            <span
                                className="inline-block rounded-[3px] shrink-0 shadow-sm"
                                style={{ width: 14, height: 14, background: color, border: "1px solid rgba(0,0,0,0.05)" }}
                            />
                            <span className="text-[11px] font-medium text-slate-500">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Note */}
            <p className="text-[11px] text-slate-400 mt-6 leading-relaxed italic bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">
                {!compareMode 
                    ? "Slide the timeline to visualize crop development over the last weeks. CSS cross-fade handles growth transitions."
                    : "Using Compare Swipe: Drag the slider overlay left or right to directly compare crop health changes over time."
                }
            </p>
        </div>
    );
}