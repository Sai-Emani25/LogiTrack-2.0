import React, { useState } from "react";
import { 
  Navigation, 
  ToggleLeft, 
  MapPin, 
  ShieldCheck, 
  TrendingUp, 
  DollarSign, 
  Truck, 
  Play, 
  CheckCircle,
  QrCode,
  Smartphone
} from "lucide-react";
import { Order, User, LiveTelemetry } from "../types";

interface DashboardAgentProps {
  currentUser: User;
  orders: Order[];
  activeTelemetry: Record<string, LiveTelemetry>;
  onToggleStatus: (agentId: string) => Promise<void>;
  onUpdateOrderStatus: (id: string, status: string, remarks?: string) => Promise<void>;
  onTriggerAgentTelemetry: (payload: any) => void;
}

export default function DashboardAgent({
  currentUser,
  orders,
  activeTelemetry,
  onToggleStatus,
  onUpdateOrderStatus,
  onTriggerAgentTelemetry
}: DashboardAgentProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedOrderTab, setSelectedOrderTab] = useState<string | null>(null);

  // Filter orders assigned to this agent
  const assignedOrders = orders.filter((o) => o.agentId === currentUser.id);
  const currentTelemetry = activeTelemetry[currentUser.id];

  const handleStatusToggle = async () => {
    setIsUpdating(true);
    try {
      await onToggleStatus(currentUser.id);
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  const startDeliverySequence = async (order: Order) => {
    setIsUpdating(true);
    try {
      // Step 1: Update status to dispatched
      await onUpdateOrderStatus(order.id, "dispatched", `Courier departed main hub. Route navigation calculated.`);
      
      // Step 2: Fire starting telemetry continuous signal
      onTriggerAgentTelemetry({
        type: "telemetry_emit",
        lat: 40.7128, // HQ HUB
        lng: -74.0060,
        bearing: 45,
        orderId: order.id,
        agentId: currentUser.id,
        speed: 38
      });
    } catch (e: any) {
      alert(e.message || "Failed to start active path sequence");
    } finally {
      setIsUpdating(false);
    }
  };

  // Compute stats
  const completedOrders = assignedOrders.filter(o => o.status === "delivered" || o.status === "returned");
  const baseEarnings = completedOrders.length * 12.50;
  const cargoBonuses = completedOrders.reduce((sum, o) => sum + (o.total * 0.05), 0);
  const totalIncentiveEarning = baseEarnings + cargoBonuses;

  return (
    <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl relative font-sans">
      
      {/* Phone Frame Header Bezel */}
      <div className="bg-slate-50 p-3 pt-6 flex items-center justify-between text-slate-500 border-b border-slate-200 text-xs">
        <div className="flex items-center gap-1">
          <Smartphone className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-mono text-[9px] font-bold">PWA COURIER GATE v2.0</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-mono text-emerald-600 font-bold">5G READY</span>
        </div>
      </div>
 
      {/* Main Container */}
      <div className="p-4 space-y-5">
        
        {/* Profile Card & Toggle status */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src={currentUser.avatarUrl} 
              alt={currentUser.name} 
              className="w-10 h-10 rounded-full border border-slate-250 object-cover"
            />
            <div>
              <h3 className="text-xs font-bold text-slate-800">{currentUser.name}</h3>
              <p className="text-[10px] font-mono text-slate-400">OFFLINE-FIRST AGENT</p>
            </div>
          </div>

          <button
            disabled={isUpdating}
            onClick={handleStatusToggle}
            className={`text-[10px] uppercase tracking-wider font-bold py-1 px-2.5 rounded-lg border transition-all ${
              currentUser.isActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-200 text-slate-600 border-slate-300 hover:bg-slate-250"
            }`}
          >
            {currentUser.isActive ? "ACTIVE & LIVE" : "STANDBY"}
          </button>
        </div>

        {/* Dynamic Payout HUD widget */}
        <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-150 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-mono font-bold tracking-wider text-blue-800 uppercase">
              Payout Engine & Incentives
            </h4>
            <span className="text-[9px] font-semibold bg-blue-550 text-blue-700 px-1.5 py-0.5 rounded">
              FREE vs PRO B2B Gate
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-white p-2.5 rounded-xl border border-blue-100">
              <span className="text-[9px] text-slate-400 block">BASE DELIVERIES</span>
              <span className="text-sm font-bold text-slate-800 font-mono">${baseEarnings.toFixed(2)}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-blue-100">
              <span className="text-[9px] text-slate-400 block">5% CARGO BONUS</span>
              <span className="text-sm font-bold text-teal-600 font-mono">${cargoBonuses.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-white p-2 px-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">Total Account Balance:</span>
            <span className="font-bold text-slate-900 text-sm font-mono">${currentUser.balance.toFixed(2)}</span>
          </div>
        </div>

        {/* Assigned Orders List */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
            Assigned Delivery Tasks ({assignedOrders.length})
          </h3>

          {assignedOrders.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs font-sans">
              No tasks currently dispatched to matches. Admin auto-assign coordinates in order board.
            </div>
          ) : (
            <div className="space-y-2.5">
              {assignedOrders.map((order) => {
                const isActiveTelemetry = currentTelemetry?.orderId === order.id;
                
                return (
                  <div 
                    key={order.id} 
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 font-sans text-xs flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-800">{order.id}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 border rounded font-mono font-bold ${
                          order.status === "dispatched"
                            ? "bg-sky-50 text-sky-700 border-sky-200"
                            : order.status === "delivered"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {order.status.toUpperCase()}
                        </span>
                      </div>
                      <span className="font-bold text-slate-800 font-mono">${order.total.toFixed(2)}</span>
                    </div>

                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <div><strong className="text-slate-400 font-medium">Destination:</strong> {order.deliveryAddress.address}</div>
                      <div className="truncate"><strong className="text-slate-400 font-medium">Recipient:</strong> {order.customerName}</div>
                    </div>

                    {/* Simulation departure control button triggers */}
                    {order.status === "assigned" && (
                      <button
                        onClick={() => startDeliverySequence(order)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded-xl uppercase tracking-wider text-[10px] flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Depart for NYC Route
                      </button>
                    )}

                    {order.status === "dispatched" && (
                      <div className="p-2 rounded bg-sky-50 text-sky-700 border border-sky-100 text-[10px] flex items-center gap-2 animate-pulse justify-center">
                        <Truck className="w-4 h-4" />
                        <span>TRANSIT: Continuous telemetry broadcast active...</span>
                      </div>
                    )}

                    {order.status === "delivered" && (
                      <div className="p-2 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] flex items-center gap-1.5 justify-center">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Completed! $12.50 + 5% incentive claimed.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Visual Simulated geofencing parameters HUD */}
        {currentTelemetry && (
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <h4 className="text-[10px] font-mono font-bold tracking-wider text-rose-600 uppercase flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5" />
              Continuous Coordinates Stream
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-600">
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-400 text-[8px] block">LATITUDE</span>
                <span className="text-slate-800 font-bold">{currentTelemetry.lat.toFixed(5)}</span>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                <span className="text-slate-400 text-[8px] block">LONGITUDE</span>
                <span className="text-slate-800 font-bold">{currentTelemetry.lng.toFixed(5)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-[9px] text-slate-400 pt-1 font-mono">
              <span>SPEED: {currentTelemetry.speed} km/h</span>
              <span>BEARING: {currentTelemetry.bearing.toFixed(1)}°</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
