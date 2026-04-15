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
    }, [currentFrame.image_b64]);

    // Parse field polygon coordinates
    let ringCoords: [number, number][] | null = null;
    const frameBbox = currentFrame.bbox || bbox;
    
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600">
                        <Satellite size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 leading-none">Weekly Crop Growth</h3>
                        {dateStr && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <Calendar size={12} className="text-slate-400" />
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Week {selectedIndex + 1} · {dateStr}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Dynamic Mean NDVI badge */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-2.5 text-right w-full sm:w-auto">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Mean NDVI</p>
                    <div className="flex items-baseline justify-end gap-1.5">
                        <span className="text-2xl font-black text-slate-900">{(currentFrame.mean_ndvi || 0).toFixed(4)}</span>
                    </div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">{ndviLabel(currentFrame.mean_ndvi)}</p>
                </div>
            </div>

            {/* Main Panel: Image Stack + Overlay */}
            <div
                ref={containerRef}
                className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 aspect-square sm:aspect-video shadow-inner"
                style={{ maxHeight: "400px" }}
            >
                {/* Images Stack for Cross-Fade */}
                {frames.map((f, i) => (
                    <img
                        key={i}
                        src={`data:image/png;base64,${f.ndvi?.image_b64}`}
                        alt={`NDVI Frame ${i}`}
                        className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ease-in-out ${i === selectedIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                        style={{ 
                            imageRendering: "pixelated",
                            background: "#0f172a" 
                        }}
                    />
                ))}

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
                            fill="rgba(16,185,129,0.05)"
                            stroke="#10b981"
                            strokeWidth="2.5"
                            strokeLinejoin="round"
                            strokeDasharray="6 4"
                            className="drop-shadow-sm"
                        />
                    </svg>
                )}

                {/* Frame Badge Overlay */}
                <div className="absolute top-4 left-4 z-30 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[10px] font-black text-white uppercase tracking-widest">
                    Frame {selectedIndex + 1} / {frames.length}
                </div>
            </div>

            {/* ─── Timeline Slider ──────────────────────────────────────────────── */}
            {frames.length > 1 && (
                <div className="mt-8 bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-100">
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
                        {/* Track */}
                        <div className="absolute inset-x-4 h-1 bg-slate-200 rounded-full" />
                        
                        {/* Active Track */}
                        <div 
                            className="absolute left-4 h-1 bg-emerald-500 rounded-full transition-all duration-300" 
                            style={{ width: `${(selectedIndex / (frames.length - 1)) * 100}%` }}
                        />

                        {/* Steps / Input */}
                        <input 
                            type="range"
                            min={0}
                            max={frames.length - 1}
                            step={1}
                            value={selectedIndex}
                            onChange={(e) => setSelectedIndex(parseInt(e.target.value))}
                            className="absolute inset-x-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />

                        {/* Labels & Markers */}
                        <div className="absolute inset-x-0 flex justify-between px-2">
                            {frames.map((f, i) => (
                                <div key={i} className="flex flex-col items-center">
                                    <div 
                                        className={`w-3 h-3 rounded-full border-2 transition-all ${i <= selectedIndex ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`} 
                                    />
                                    <span className={`text-[9px] font-bold mt-2 transition-colors ${i === selectedIndex ? 'text-emerald-600' : 'text-slate-400'}`}>
                                        Week {i + 1}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
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
                Slide the timeline to visualize crop development over the last weeks. CSS cross-fade handles growth transitions.
            </p>
        </div>
    );
}