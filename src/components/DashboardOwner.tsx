import React, { useState } from "react";
import { 
  BarChart3, 
  Sparkles, 
  Gauge, 
  Users, 
  TrendingDown, 
  Plus, 
  RotateCw, 
  UsersRound, 
  Percent, 
  Crown,
  FileSpreadsheet,
  AlertTriangle,
  Info
} from "lucide-react";
import { 
  Product, 
  Order, 
  User, 
  DemandForecastResult, 
  ChurnResult, 
  InventoryHistory 
} from "../types";

interface DashboardOwnerProps {
  products: Product[];
  orders: Order[];
  users: User[];
  inventoryHistory: InventoryHistory[];
  currentUser: User;
  onRestockProduct: (productId: string, qty: number) => Promise<void>;
  onTriggerAutoAssign: () => Promise<any>;
  demandForecasts: DemandForecastResult[];
  demandInsights: string;
  onRefreshDemandData: () => Promise<void>;
  churnResults: ChurnResult[];
  onRefreshChurnData: () => Promise<void>;
  onChangeSubscription: (tier: "Free" | "Pro") => Promise<void>;
}

export default function DashboardOwner({
  products,
  orders,
  users,
  inventoryHistory,
  currentUser,
  onRestockProduct,
  onTriggerAutoAssign,
  demandForecasts,
  demandInsights,
  onRefreshDemandData,
  churnResults,
  onRefreshChurnData,
  onChangeSubscription
}: DashboardOwnerProps) {
  const [activeTab, setActiveTab] = useState<"inventory" | "forecasting" | "routing" | "churn">("inventory");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [restockAmts, setRestockAmts] = useState<Record<string, number>>({});
  const [routingMessage, setRoutingMessage] = useState<string | null>(null);

  const handleRestock = async (productId: string) => {
    const qty = restockAmts[productId] || 50;
    try {
      await onRestockProduct(productId, qty);
      // clean field
      setRestockAmts(prev => ({ ...prev, [productId]: 0 }));
    } catch (e: any) {
      alert(e.message || "Failed to submit restock");
    }
  };

  const handleRunAutoAssign = async () => {
    setIsRefreshing(true);
    setRoutingMessage(null);
    try {
      const res = await onTriggerAutoAssign();
      setRoutingMessage(res.routeSummary || "Proximity-optimized TSP routing completed.");
    } catch (e: any) {
      alert(e.message || "Auto assignment failed");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefreshDemand = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshDemandData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefreshChurn = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshChurnData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSubscriptionSwitch = async (tier: "Free" | "Pro") => {
    try {
      await onChangeSubscription(tier);
    } catch (err: any) {
      alert(err.message || "Failed to switch subscription tiers");
    }
  };

  // Safe checks for subscription
  const isPro = currentUser.subscriptionTier === "Pro";

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top metrics summary line & subscription gateway header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-md font-bold text-slate-900 font-sans tracking-tight">
            HQ Inventory Ops Panel
          </h2>
          <p className="text-xs text-slate-500">
            Current Subscription: <strong className="text-blue-600 uppercase font-mono">{currentUser.subscriptionTier || "Free"}</strong>
          </p>
        </div>

        {/* Subscription gateway controller */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">B2B PLAN:</span>
          <button
            onClick={() => handleSubscriptionSwitch("Free")}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all border ${
              !isPro
                ? "bg-slate-900 text-white border-slate-950"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-800"
            }`}
          >
            SME Free Plan
          </button>
          <button
            onClick={() => handleSubscriptionSwitch("Pro")}
            className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all border ${
              isPro
                ? "bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/10"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-800"
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-600" />
            Enterprise Pro
          </button>
        </div>
      </div>

      {/* Grid Dashboard Control Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto scroller-hidden">
        <button
          onClick={() => setActiveTab("inventory")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 shrink-0 ${
            activeTab === "inventory"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-800"
          }`}
        >
          Catalog Inventory
        </button>
        <button
          onClick={() => setActiveTab("forecasting")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === "forecasting"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-800"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          AI SKU Forecast
        </button>
        <button
          onClick={() => setActiveTab("routing")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === "routing"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-800"
          }`}
        >
          Proximity TSP Auto-Assign
        </button>
        <button
          onClick={() => setActiveTab("churn")}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
            activeTab === "churn"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-800"
          }`}
        >
          Customer Re-engagement
        </button>
      </div>

      {/* Main Container Content */}

      {/* Tab 1: Inventory Management */}
      {activeTab === "inventory" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] text-slate-400 font-mono font-bold block uppercase">TOTAL PRODUCTS</span>
                <span className="text-xl font-bold text-slate-900 font-mono mt-1 block">{products.length} cataloged</span>
              </div>
              <FileSpreadsheet className="w-8 h-8 text-slate-300" />
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] text-slate-400 font-mono font-bold block uppercase">RESTOCK ALARMS</span>
                <span className="text-xl font-bold font-mono text-rose-600 mt-1 block">
                  {products.filter(p => p.stock <= p.threshold).length} SKUs flagged
                </span>
              </div>
              <AlertTriangle className="w-8 h-8 text-rose-300" />
            </div>

            <div className="p-5 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] text-slate-400 font-mono font-bold block uppercase">PAST 30D TRANSACTIONS</span>
                <span className="text-xl font-bold text-slate-900 font-mono mt-1 block">{inventoryHistory.length} ledger events</span>
              </div>
              <Gauge className="w-8 h-8 text-slate-300" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center text-xs font-mono font-bold tracking-wider text-slate-500">
              <span>STOCK ALLOCATIONS</span>
              <span>UPDATE LEDGER</span>
            </div>

            <div className="divide-y divide-slate-100 bg-white">
              {products.map((p) => {
                const isAlarm = p.stock <= p.threshold;
                const restockInputVal = restockAmts[p.id] || 0;

                return (
                  <div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{p.name}</span>
                        <span className="text-[10px] bg-slate-100 font-mono text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold">
                          {p.sku}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Category: {p.category} | Current Stock:{" "}
                        <strong className={isAlarm ? "text-rose-600 font-mono font-bold" : "text-emerald-600 font-mono font-bold"}>
                          {p.stock} {p.unit}
                        </strong>{" "}
                        (Threshold: {p.threshold})
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        placeholder="Qty"
                        value={restockInputVal || ""}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setRestockAmts((prev) => ({ ...prev, [p.id]: isNaN(val) ? 0 : val }));
                        }}
                        className="w-20 bg-slate-50 border border-slate-200 text-slate-800 p-1 px-2 rounded-lg text-xs outline-none text-center font-mono focus:border-slate-300"
                      />
                      <button
                        onClick={() => handleRestock(p.id)}
                        className="bg-slate-100 hover:bg-slate-200 text-blue-600 border border-slate-200 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Refill
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Predictive Demand Forecasting */}
      {activeTab === "forecasting" && (
        <div className="space-y-4">
          
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Machine Learning SKU Time-Series Projections (7-day ahead lookback)
            </h3>
            
            <button
              disabled={isRefreshing}
              onClick={handleRefreshDemand}
              className="px-2.5 py-1 text-[10px] bg-indigo-50 border border-indigo-200 hover:border-indigo-300 text-indigo-700 rounded font-mono uppercase font-bold tracking-wider flex items-center gap-1 transition-all"
            >
              <RotateCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
              Re-forecast catalog
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {demandForecasts.map((f) => (
              <div 
                key={f.productId} 
                className={`p-4 rounded-2xl bg-white border font-sans text-xs flex flex-col justify-between shadow-sm transition-all hover:shadow ${
                  f.isCritical ? "border-rose-200 bg-rose-50/20" : "border-slate-200"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tight">{f.sku}</span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      f.isCritical ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                    }`}>
                      {f.isCritical ? "CRITICAL RISK" : "BUFFER STABLE"}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 mt-2">{f.productName}</h4>
                  
                  <div className="mt-3.5 space-y-1.5 border-t border-slate-100 pt-3 text-[11px] text-slate-500 font-sans">
                    <div className="flex justify-between">
                      <span>Warehouse Stock:</span>
                      <strong className="text-slate-800 font-mono">{f.currentStock} units</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Depletion Projection:</span>
                      <strong className={f.isCritical ? "text-rose-600 font-mono font-bold" : "text-slate-700 font-mono"}>
                        {f.predictedDepletionDays <= 7 ? `${f.predictedDepletionDays} days remaining` : "Stable run limits"}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>7D Recommended Purchase:</span>
                      <strong className="text-blue-600 font-mono font-bold">+{f.recommendedRestockQty} units</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-100 flex justify-between items-center text-[9px] font-mono text-slate-400">
                  <span>ML CONFIDENCE SCORE:</span>
                  <span className="text-emerald-600 font-bold">{(f.confidence * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Gemini text insights */}
          <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 text-slate-800 font-sans leading-relaxed shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-blue-800">
                Gemini AI Predictive Supply Advisor
              </h4>
            </div>
            
            <p className="text-xs text-slate-600 block select-text whitespace-pre-wrap">
              {demandInsights}
            </p>
          </div>

        </div>
      )}

      {/* Tab 3: Proximity TSP Auto-Assign */}
      {activeTab === "routing" && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <div className="max-w-xl pr-4">
              <h3 className="text-sm font-bold tracking-tight text-slate-800 mb-1">
                Smart Agent Dynamic Auto-Assign
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Calculate nearest optimal available drivers based on active order coordinates, vehicle weight-capacity thresholds, and multi-drop Manhattan TSP routes.
              </p>

              {/* Pro plan gate check */}
              {isPro ? (
                <button
                  disabled={isRefreshing}
                  onClick={handleRunAutoAssign}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all outline-none"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                  Solve Assignment & Routing
                </button>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl space-y-2 flex gap-3 text-xs">
                  <div>
                    <Crown className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="space-y-1">
                    <strong className="font-bold">Pro Account Upgrade Required</strong>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Auto-assign TSP routing optimization systems are exclusively available to Premium Multi-tenant subscribers. Toggle "Enterprise Pro" plan in the header block above to test.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Routing notification note */}
            {routingMessage && (
              <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 select-text whitespace-pre-wrap">
                <div className="flex items-center gap-1 text-slate-800 font-bold tracking-wider uppercase text-[10px] mb-2 font-mono">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  Dispatcher routing advisories:
                </div>
                {routingMessage}
              </div>
            )}
          </div>

          {/* Pending unassigned orders tracker */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-xs font-sans">
            <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-3">
              Pending Order Queues ({orders.filter(o => o.status === "pending" || !o.agentId).length} orders)
            </h4>

            {orders.filter(o => o.status === "pending" || !o.agentId).length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                All order buffers are securely matched to active field courier lines.
              </div>
            ) : (
              <div className="space-y-2">
                {orders.filter(o => o.status === "pending" || !o.agentId).map(order => (
                  <div key={order.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <strong className="text-slate-800 font-mono tracking-wider">{order.id}</strong>
                      <span className="text-slate-500 block mt-0.5 truncate max-w-sm">
                        Address: {order.deliveryAddress.address} | Value: ${order.total.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-[10px] bg-amber-50 text-amber-700 font-mono px-2 py-0.5 rounded uppercase font-bold">
                      UNASSIGNED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Customer Churn & Re-Engagement Predictor */}
      {activeTab === "churn" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
              Customer Churn Alerts (&gt; 30 days stagnant orders)
            </h3>
            
            <button
              disabled={isRefreshing}
              onClick={handleRefreshChurn}
              className="px-2.5 py-1 text-[10px] bg-slate-100 text-slate-700 border border-slate-200 rounded font-mono uppercase font-bold tracking-wider flex items-center gap-1 transition-all"
            >
              <RotateCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
              Scan dormant accounts
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {churnResults.map((c) => (
              <div key={c.userId} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-xs font-sans space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                    <div>
                      <h4 className="font-bold text-slate-900">{c.name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">{c.email}</span>
                    </div>
                    <span className="bg-rose-50 text-rose-700 border border-rose-100 font-mono text-[9px] px-2 py-0.5 rounded font-bold">
                      {c.daysStagnant} DAYS STAGNANT
                    </span>
                  </div>

                  {/* Generated campaign mock emails styled elegantly */}
                  <div className="mt-3.5 space-y-2">
                    <span className="text-[9px] text-slate-400 font-mono font-bold block">GENERATED RE-ENGAGEMENT EMAIL</span>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-[11px] leading-relaxed text-slate-700 select-text">
                      <div className="flex gap-1">
                        <span className="text-slate-400 font-medium">Subject:</span>
                        <strong className="text-slate-800">{c.promotionPayload.subject}</strong>
                      </div>
                      <div className="text-slate-600 font-sans whitespace-pre-wrap">{c.promotionPayload.body}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-center font-mono">
                  <div className="bg-indigo-50 text-indigo-700 p-2 rounded border border-indigo-100 font-bold">
                    <span className="text-slate-400 text-[8px] block font-mono">PROMO CODE</span>
                    <strong className="font-semibold">{c.promotionPayload.discountCode}</strong>
                  </div>
                  <div className="bg-blue-50 text-blue-700 p-2 rounded border border-blue-100 font-bold">
                    <span className="text-slate-400 text-[8px] block font-mono">BENEFIT</span>
                    <strong className="font-semibold">{c.promotionPayload.benefit}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
