import React, { useMemo, useState } from "react";
import { MoveUpRight, Navigation, MapPin, Warehouse, RefreshCw, Sun, Moon } from "lucide-react";

interface Coordinate {
  lat: number;
  lng: number;
}

interface Pin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "hub" | "customer" | "agent";
  bearing?: number;
  speed?: number;
  orderId?: string;
  status?: string;
}

interface LiveRouteMapProps {
  hub: { lat: number; lng: number; address: string };
  agents: Pin[];
  customers: { id: string; name: string; lat: number; lng: number }[];
  activeRouteTo?: Coordinate | null;
  selectedAgentId?: string | null;
}

export default function LiveRouteMap({
  hub,
  agents,
  customers,
  activeRouteTo,
  selectedAgentId
}: LiveRouteMapProps) {
  const [zoom, setZoom] = useState(1.0);
  const [mapTheme, setMapTheme] = useState<"dark" | "light">("dark");
  const isDark = mapTheme === "dark";

  const handleZoomChange = (delta: number) => {
    setZoom((prev) => Math.max(1.0, Math.min(3.0, prev + delta)));
  };

  // Base Bounding Box: Manhattan downtown sector
  const baseBounds = {
    latMin: 40.7020,
    latMax: 40.7300,
    lngMin: -74.0150,
    lngMax: -73.9820,
  };

  const bounds = useMemo(() => {
    const latCenter = (baseBounds.latMin + baseBounds.latMax) / 2;
    const lngCenter = (baseBounds.lngMin + baseBounds.lngMax) / 2;

    const latHalfSpan = ((baseBounds.latMax - baseBounds.latMin) / 2) / zoom;
    const lngHalfSpan = ((baseBounds.lngMax - baseBounds.lngMin) / 2) / zoom;

    return {
      latMin: latCenter - latHalfSpan,
      latMax: latCenter + latHalfSpan,
      lngMin: lngCenter - lngHalfSpan,
      lngMax: lngCenter + lngHalfSpan,
    };
  }, [zoom]);

  // Convert GPS Coordinates to SVG X, Y percentages (0% to 100%)
  const gpsToPct = (lat: number, lng: number) => {
    const latRange = bounds.latMax - bounds.latMin;
    const lngRange = bounds.lngMax - bounds.lngMin;

    // Y axis in SVGs/HTML goes top-to-bottom, so latMax corresponds to Y=0%
    const y = ((bounds.latMax - lat) / latRange) * 100;
    const x = ((lng - bounds.lngMin) / lngRange) * 100;

    return { x, y };
  };

  // Helper helper to filter pins rendering outside the visible screen coordinates
  const isOutOfView = (x: number, y: number) => {
    return x < -5 || x > 105 || y < -5 || y > 105;
  };

  // Pre-mapped constant landmarks (NYC streets, East River outline, avenues)
  const gridLines = useMemo(() => {
    return [
      // Avenues (Vertical-ish)
      { id: "broadway", path: [ { lat: 40.703, lng: -74.012 }, { lat: 40.712, lng: -74.009 }, { lat: 40.725, lng: -73.996 } ] },
      { id: "ave-a", path: [ { lat: 40.709, lng: -74.001 }, { lat: 40.718, lng: -73.988 }, { lat: 40.729, lng: -73.984 } ] },
      { id: "hudson", path: [ { lat: 40.705, lng: -74.015 }, { lat: 40.718, lng: -74.011 }, { lat: 40.729, lng: -74.007 } ] },
      { id: "fdr-drive", path: [ { lat: 40.702, lng: -73.998 }, { lat: 40.708, lng: -73.978 }, { lat: 40.722, lng: -73.972 } ] },
      
      // Streets (Horizontal-ish)
      { id: "canal-st", path: [ { lat: 40.721, lng: -74.013 }, { lat: 40.718, lng: -74.001 }, { lat: 40.714, lng: -73.991 } ] },
      { id: "houston-st", path: [ { lat: 40.728, lng: -74.010 }, { lat: 40.725, lng: -73.995 }, { lat: 40.721, lng: -73.983 } ] },
      { id: "chambers-st", path: [ { lat: 40.716, lng: -74.014 }, { lat: 40.714, lng: -74.008 }, { lat: 40.712, lng: -74.002 } ] },
      { id: "wall-st", path: [ { lat: 40.707, lng: -74.011 }, { lat: 40.706, lng: -74.007 }, { lat: 40.705, lng: -74.003 } ] },
    ];
  }, []);

  const hubPos = gpsToPct(hub.lat, hub.lng);

  return (
    <div className={`relative w-full h-[380px] rounded-2xl overflow-hidden flex flex-col font-sans select-none shadow-lg transition-colors duration-300 border ${
      isDark
        ? "bg-slate-950 border-slate-900 text-slate-100 shadow-black/35"
        : "bg-white border-slate-200 text-slate-900 shadow-slate-200/40"
    }`}>
      {/* Grid Coordinates Overlay */}
      <div className="absolute top-3 left-4 z-10 flex flex-col gap-0.5 pointer-events-none">
        <span className={`text-[10px] font-mono tracking-wider uppercase font-bold transition-colors ${
          isDark ? "text-blue-400" : "text-blue-600"
        }`}>Smart Telemetry Grid v2</span>
        <span className={`text-[9px] font-mono transition-colors ${
          isDark ? "text-slate-500" : "text-slate-400"
        }`}>BOUNDS: 40.70N - 74.01W • NEW YORK</span>
      </div>

      <div className="absolute top-3 right-4 z-10 flex items-center gap-1.5 cursor-crosshair">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        <span className={`text-[10px] font-mono uppercase font-bold transition-colors ${
          isDark ? "text-emerald-400" : "text-emerald-500"
        }`}>FEED ACTIVE</span>
      </div>

      {/* Primary Map Stage */}
      <div className={`relative flex-1 w-full transition-colors duration-300 ${isDark ? "bg-slate-950" : "bg-slate-100"}`}>
        <svg className="absolute inset-0 w-full h-full p-2" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* NYC Vector Grid Backdrop */}
          {gridLines.map((line) => {
            const mappedPoints = line.path.map((pt) => gpsToPct(pt.lat, pt.lng));
            const pathData = mappedPoints
              .map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`)
              .join(" ");

            return (
              <path
                key={line.id}
                d={pathData}
                fill="none"
                stroke={isDark ? "rgba(255, 255, 255, 0.07)" : "rgba(15, 23, 42, 0.09)"}
                strokeWidth="0.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* East River Graphical outline overlay */}
          <path
            d="M 85 0 C 80 20, 75 45, 68 62 C 63 74, 55 90, 48 100"
            fill="none"
            stroke={isDark ? "rgba(59, 130, 246, 0.08)" : "rgba(59, 130, 246, 0.16)"}
            strokeWidth="9"
            strokeLinecap="round"
          />

          {/* Golden Hub Radial Ping */}
          <circle cx={hubPos.x} cy={hubPos.y} r="3" fill="none" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="0.5">
            <animate attributeName="r" values="2;9;2" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0;0.8" dur="3s" repeatCount="indefinite" />
          </circle>

          {/* Static Route Polylines to all customer nodes if route active */}
          {activeRouteTo && (
            <>
              {/* Dynamic Optimized Path */}
              <line
                x1={hubPos.x}
                y1={hubPos.y}
                x2={gpsToPct(activeRouteTo.lat, activeRouteTo.lng).x}
                y2={gpsToPct(activeRouteTo.lat, activeRouteTo.lng).y}
                stroke="#2563eb"
                strokeWidth="1.2"
                strokeDasharray="2 1"
                className="stroke-blue-500"
              >
                <animate attributeName="stroke-dashoffset" values="10;0" dur="2s" repeatCount="indefinite" />
              </line>
              {/* Glowing Route Target Ring */}
              <circle
                cx={gpsToPct(activeRouteTo.lat, activeRouteTo.lng).x}
                cy={gpsToPct(activeRouteTo.lat, activeRouteTo.lng).y}
                r="4"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="0.8"
              >
                <animate attributeName="r" values="2;7;2" dur="1.5s" repeatCount="indefinite" />
              </circle>
            </>
          )}

          {/* Map Polyline Connecting Active Agents currently tracking routes */}
          {agents.map((agent) => {
            if (activeRouteTo && agent.id === selectedAgentId) {
              const agentPos = gpsToPct(agent.lat, agent.lng);
              const destPos = gpsToPct(activeRouteTo.lat, activeRouteTo.lng);
              return (
                <g key={`route-${agent.id}`}>
                  {/* Drone/Courier path traveled path (Warehouse to Agent) */}
                  <line
                    x1={hubPos.x}
                    y1={hubPos.y}
                    x2={agentPos.x}
                    y2={agentPos.y}
                    stroke="rgba(59, 130, 246, 0.2)"
                    strokeWidth="0.75"
                  />
                  {/* Remaining route segment (Agent to Recipient) */}
                  <line
                    x1={agentPos.x}
                    y1={agentPos.y}
                    x2={destPos.x}
                    y2={destPos.y}
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeDasharray="1.5 1.5"
                  />
                </g>
              );
            }
            return null;
          })}
        </svg>

        {/* DOM Anchored High-fidelity elements - Hub Pin */}
        {!isOutOfView(hubPos.x, hubPos.y) && (
          <div
            style={{ left: `${hubPos.x}%`, top: `${hubPos.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer"
          >
            <div className="p-1 px-1.5 rounded bg-amber-500 text-slate-950 font-bold border border-amber-300 text-[10px] flex items-center gap-1 shadow-lg transform active:scale-95 transition-all">
              <Warehouse className="w-3.5 h-3.5" />
              <span>HUB</span>
            </div>
            {/* Tooltip */}
            <div className="absolute pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-slate-100 text-[9px] p-2 rounded border border-slate-700 w-32 left-1/2 -translate-x-1/2 -top-12 shadow-xl text-center z-30">
              <div className="font-semibold text-amber-400">Main Warehouse</div>
              <div className="text-[8px] text-slate-400 truncate">{hub.address}</div>
            </div>
          </div>
        )}

        {/* DOM Anchored - Customer Pins */}
        {customers.map((cust) => {
          const pos = gpsToPct(cust.lat, cust.lng);
          if (isOutOfView(pos.x, pos.y)) return null;
          const hasActivePath = activeRouteTo && activeRouteTo.lat === cust.lat && activeRouteTo.lng === cust.lng;
          return (
            <div
              key={cust.id}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer"
            >
              <div className={`p-1.5 rounded-full border transition-all ${
                hasActivePath 
                  ? "bg-blue-600 text-white border-blue-400 pulse-glow scale-110 shadow-blue-500/50" 
                  : "bg-slate-900 text-slate-400 border-slate-700 hover:text-white hover:border-slate-500"
              }`}>
                <MapPin className="w-3 h-3" />
              </div>
              {/* Tooltip */}
              <div className="absolute pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-slate-100 text-[9px] p-2 rounded border border-slate-700 w-28 left-1/2 -translate-x-1/2 -top-14 shadow-xl text-center z-30">
                <div className="font-semibold truncate">{cust.name}</div>
                <div className="text-[8px] text-slate-400">NY Destination</div>
                <div className="text-[7px] text-sky-400 font-mono mt-0.5">{cust.lat.toFixed(4)}, {cust.lng.toFixed(4)}</div>
              </div>
            </div>
          );
        })}

        {/* DOM Anchored - Pulsing Active Agent Pins */}
        {agents.map((agent) => {
          const pos = gpsToPct(agent.lat, agent.lng);
          if (isOutOfView(pos.x, pos.y)) return null;
          const isSelected = agent.id === selectedAgentId;
          const isAutonomous = agent.name.includes("Drone");
          return (
            <div
              key={agent.id}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-30 group cursor-pointer"
            >
              <div 
                style={{ transform: `rotate(${agent.bearing || 0}deg)` }}
                className={`p-1.5 rounded-xl border flex items-center justify-center transition-all ${
                  isSelected 
                    ? "bg-rose-500 text-white border-rose-300 scale-125 shadow-lg shadow-rose-500/50 active-ping" 
                    : isAutonomous 
                      ? "bg-violet-600 text-violet-100 border-violet-400" 
                      : "bg-emerald-600 text-emerald-100 border-emerald-400"
                }`}
              >
                <Navigation className="w-3 h-3 fill-current" />
              </div>
              
              {/* Telemetry Radial Ring */}
              <div className={`absolute -inset-2 rounded-xl border border-dashed pointer-events-none ${
                isSelected ? "border-rose-400 animate-spin" : "border-slate-700"
              }`} />

              {/* Miniature Tag label */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-[7px] font-mono font-bold tracking-wider max-w-[80px] truncate uppercase">
                {agent.name.split(" ")[0]}
              </div>

              {/* Tooltip */}
              <div className="absolute pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-slate-100 text-[9px] p-2 rounded border border-slate-700 w-32 left-1/2 -translate-x-1/2 -top-16 shadow-xl text-center z-40">
                <div className="font-semibold text-rose-400 truncate">{agent.name}</div>
                <div className="text-[8px] flex items-center justify-center gap-1">
                  <span>Speed:</span>
                  <span className="font-mono text-white">{(agent.speed || 0).toFixed(1)} km/h</span>
                </div>
                {agent.orderId && (
                  <div className="text-[8px] text-emerald-400 font-mono mt-0.5">
                    Order: {agent.orderId}
                  </div>
                )}
                <div className="text-[7px] text-slate-400 font-mono mt-0.5">{agent.lat.toFixed(5)}, {agent.lng.toFixed(5)}</div>
              </div>
            </div>
          );
        })}

        {/* Zoom Controls Overlay */}
        <div className={`absolute bottom-4 right-4 z-40 flex flex-col gap-1.5 p-1 px-1.5 rounded-xl shadow-xl backdrop-blur-sm border transition-colors duration-300 ${
          isDark 
            ? "bg-slate-900/90 border-slate-800 text-slate-400" 
            : "bg-white/95 border-slate-200 text-slate-600"
        }`}>
          <button
            id="map-zoom-in-btn"
            onClick={() => handleZoomChange(0.25)}
            disabled={zoom >= 3.0}
            className={`p-1 px-2 rounded-lg font-mono font-bold transition-all text-xs flex items-center justify-center border border-transparent disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer ${
              isDark
                ? "hover:bg-slate-800 hover:text-white hover:border-slate-700"
                : "hover:bg-slate-100 hover:text-slate-900 hover:border-slate-200"
            }`}
            title="Increase Zoom Level"
          >
            ＋
          </button>
          <div className={`text-[9px] text-center font-mono font-bold my-0.5 py-0.5 select-none md:px-0.5 border-y transition-colors ${
            isDark 
              ? "text-slate-400 border-slate-800/80" 
              : "text-slate-500 border-slate-200/80"
          }`}>
            {zoom.toFixed(2)}x
          </div>
          <button
            id="map-zoom-out-btn"
            onClick={() => handleZoomChange(-0.25)}
            disabled={zoom <= 1.0}
            className={`p-1 px-2 rounded-lg font-mono font-bold transition-all text-xs flex items-center justify-center border border-transparent disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer ${
              isDark
                ? "hover:bg-slate-800 hover:text-white hover:border-slate-700"
                : "hover:bg-slate-100 hover:text-slate-900 hover:border-slate-200"
            }`}
            title="Decrease Zoom Level"
          >
            －
          </button>
          
          <div className={`border-t my-0.5 ${isDark ? "border-slate-800/80" : "border-slate-200/80"}`} />
          
          <button
            id="map-theme-toggle-btn"
            onClick={() => setMapTheme(prev => prev === "dark" ? "light" : "dark")}
            className={`p-1.5 rounded-lg transition-all text-xs flex items-center justify-center border border-transparent cursor-pointer ${
              isDark
                ? "hover:bg-slate-800 hover:text-amber-400 hover:border-slate-700 text-slate-400"
                : "hover:bg-slate-100 hover:text-slate-900 hover:border-slate-200 text-slate-500"
            }`}
            title={`Switch to ${isDark ? "Light" : "Dark"} Map Theme`}
          >
            {isDark ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-700" />
            )}
          </button>
        </div>
      </div>

      {/* Map Footer HUD displaying status numbers */}
      <div className={`border-t p-2.5 px-4 flex items-center justify-between text-[10px] font-mono transition-colors duration-300 ${
        isDark ? "bg-slate-900 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
      }`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Warehouse className="w-3 h-3 text-amber-500" />
            <span>HQ HUB ONLINE</span>
          </div>
          <div className={`h-3 w-[1px] transition-colors duration-300 ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />
          <div className="flex items-center gap-1">
            <MapPin className={`w-3 h-3 ${isDark ? "text-blue-400" : "text-blue-600"}`} />
            <span>ACTIVE DEST: {customers.length} BINS</span>
          </div>
        </div>

        <div className={`flex items-center gap-1 transition-colors duration-300 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
          <span>LATENCY:</span>
          <span className={`font-semibold ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>{Math.floor(12 + Math.random() * 8)}ms</span>
          <span className="ml-[1px]">REFRESH: 4s</span>
        </div>
      </div>
    </div>
  );
}
