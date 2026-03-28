"use client";

/**
 * NDVIImagePanel
 * ==============
 * Renders the colour-map NDVI image from Sentinel Hub with:
 *  - The field polygon boundary drawn as an SVG overlay
 *  - A compact NDVI legend
 *  - Mean NDVI badge
 *  - Acquisition date
 *
 * Props
 * -----
 * imageB64        — base64 PNG string (the COLOR_MAP output from sentinel1.py)
 * meanNDVI        — float, e.g. 0.0182
 * acquisitionDate — ISO date string, e.g. "2026-03-22"
 * bbox            — [minLon, minLat, maxLon, maxLat] from the API response
 * fieldCoordinates— raw JSON string from Firestore, e.g. "[[[-0.193,5.607],...]]"
 */

import { useEffect, useRef, useState } from "react";
import { Satellite } from "lucide-react";

interface Props {
    imageB64: string;
    meanNDVI: number | null;
    acquisitionDate: string;
    bbox?: [number, number, number, number] | null;
    fieldCoordinates?: string | null;
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

// ─── Project [lon, lat] → pixel (x, y) given a bbox and image dimensions ────
function project(
    lon: number,
    lat: number,
    bbox: [number, number, number, number],
    w: number,
    h: number,
): [number, number] {
    const [minLon, minLat, maxLon, maxLat] = bbox;
    const x = ((lon - minLon) / (maxLon - minLon)) * w;
    // lat axis is inverted in image coordinates (top = maxLat)
    const y = ((maxLat - lat) / (maxLat - minLat)) * h;
    return [x, y];
}

export default function NDVIImagePanel({
    imageB64,
    meanNDVI,
    acquisitionDate,
    bbox,
    fieldCoordinates,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

    // Measure the rendered image so the SVG overlay matches pixel-perfect
    useEffect(() => {
        const el = containerRef.current?.querySelector("img");
        if (!el) return;
        const update = () => setDims({ w: el.clientWidth, h: el.clientHeight });
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, [imageB64]);

    // Parse field polygon coordinates from the Firestore JSON string
    // Format stored: "[[[-0.193,5.607],[-0.193,5.606],...]]"  (wrapped once)
    let ringCoords: [number, number][] | null = null;
    if (fieldCoordinates && bbox) {
        try {
            let parsed = JSON.parse(fieldCoordinates);
            // Unwrap one extra array level if present  [[[lon,lat],...]] → [[lon,lat],...]
            if (
                Array.isArray(parsed) &&
                parsed.length === 1 &&
                Array.isArray(parsed[0]) &&
                Array.isArray(parsed[0][0])
            ) {
                parsed = parsed[0];
            }
            if (Array.isArray(parsed) && Array.isArray(parsed[0])) {
                ringCoords = parsed as [number, number][];
            }
        } catch {
            // silently ignore bad JSON
        }
    }

    // Build SVG polygon points string from geographic coordinates
    const polygonPoints =
        ringCoords && bbox && dims
            ? ringCoords
                  .map(([lon, lat]) => {
                      const [x, y] = project(lon, lat, bbox, dims.w, dims.h);
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(" ")
            : null;

    const dateStr = acquisitionDate
        ? new Date(acquisitionDate).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
          })
        : null;

    return (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                    <Satellite className="text-emerald-600 shrink-0" size={22} />
                    <div>
                        <h3 className="text-lg font-black text-slate-900">NDVI Satellite Image</h3>
                        {dateStr && (
                            <p className="text-xs text-slate-400 mt-0.5">
                                {dateStr} · Sentinel-2 L2A · 30-day best scene
                            </p>
                        )}
                    </div>
                </div>

                {/* Mean NDVI badge */}
                {meanNDVI !== null && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-right shrink-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mean NDVI</p>
                        <p className="text-xl font-black text-slate-900">{meanNDVI.toFixed(4)}</p>
                        <p className="text-[10px] text-slate-500">{ndviLabel(meanNDVI)}</p>
                    </div>
                )}
            </div>

            {/* Image + polygon overlay */}
            <div
                ref={containerRef}
                className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100"
                style={{ maxWidth: "100%" }}
            >
                {/* The NDVI colour-map PNG — natural size capped, crisp rendering */}
                <img
                    src={`data:image/png;base64,${imageB64}`}
                    alt="NDVI colour map"
                    className="block w-full"
                    style={{
                        imageRendering: "pixelated",   // keeps satellite pixels sharp
                        maxHeight: "340px",
                        objectFit: "contain",
                        objectPosition: "center",
                        background: "#f1efe8",
                    }}
                    draggable={false}
                />

                {/* SVG polygon boundary overlay — positioned absolutely on top */}
                {polygonPoints && dims && (
                    <svg
                        className="absolute inset-0 pointer-events-none"
                        width={dims.w}
                        height={dims.h}
                        viewBox={`0 0 ${dims.w} ${dims.h}`}
                        style={{ top: 0, left: 0 }}
                    >
                        {/* Outer glow for contrast on any background */}
                        <polygon
                            points={polygonPoints}
                            fill="none"
                            stroke="rgba(0,0,0,0.45)"
                            strokeWidth="4"
                            strokeLinejoin="round"
                        />
                        {/* Main boundary line */}
                        <polygon
                            points={polygonPoints}
                            fill="rgba(16,185,129,0.08)"
                            stroke="#10b981"
                            strokeWidth="2"
                            strokeLinejoin="round"
                            strokeDasharray="6 3"
                        />
                        {/* Corner dots at each vertex */}
                        {ringCoords!.map(([lon, lat], i) => {
                            const [x, y] = project(lon, lat, bbox!, dims.w, dims.h);
                            return (
                                <circle
                                    key={i}
                                    cx={x}
                                    cy={y}
                                    r={3}
                                    fill="#10b981"
                                    stroke="white"
                                    strokeWidth="1.5"
                                />
                            );
                        })}
                    </svg>
                )}
            </div>

            {/* Legend */}
            <div className="mt-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Colour legend</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {LEGEND.map(({ color, label }) => (
                        <div key={label} className="flex items-center gap-1.5">
                            <span
                                className="inline-block rounded-sm shrink-0"
                                style={{ width: 12, height: 12, background: color, border: "1px solid rgba(0,0,0,0.1)" }}
                            />
                            <span className="text-[11px] text-slate-500">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Caption */}
            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                Image streamed directly from Sentinel Hub — no bulk download. Green dashed outline shows your registered field boundary.
                {!polygonPoints && bbox && (
                    <span className="ml-1 text-slate-300">(Boundary overlay requires field coordinates.)</span>
                )}
            </p>
        </div>
    );
}