import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  Warehouse, 
  Truck, 
  User as UserIcon, 
  Zap, 
  Sparkles,
  RefreshCw,
  Bell,
  CheckCircle,
  HelpCircle,
  Settings,
  ShieldAlert,
  Download
} from "lucide-react";
import { User, Product, Order, InventoryHistory, LiveTelemetry, DemandForecastResult, ChurnResult } from "./types";
import LiveRouteMap from "./components/LiveRouteMap";
import DashboardOwner from "./components/DashboardOwner";
import DashboardAgent from "./components/DashboardAgent";
import DashboardCustomer from "./components/DashboardCustomer";

export default function App() {
  const [roleMode, setRoleMode] = useState<"owner" | "agent" | "customer">("owner");
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventoryHistory, setInventoryHistory] = useState<InventoryHistory[]>([]);
  const [activeTelemetry, setActiveTelemetry] = useState<Record<string, LiveTelemetry>>({});
  
  // AI Metrics
  const [demandForecasts, setDemandForecasts] = useState<DemandForecastResult[]>([]);
  const [demandInsights, setDemandInsights] = useState("");
  const [churnResults, setChurnResults] = useState<ChurnResult[]>([]);

  // Tracking states
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState<Order | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null);

  // Trigger data export downloads as CSV files
  const handleExportData = () => {
    try {
      if (products.length === 0 && orders.length === 0) {
        setNotification({
          message: "No inventory or order data is available to export currently.",
          type: "warning"
        });
        setTimeout(() => setNotification(null), 4000);
        return;
      }

      // 1. Export Inventory (Products)
      const inventoryHeaders = ["Product ID", "Name", "SKU", "Category", "Stock Level", "Unit", "Price ($)", "Restock Threshold"];
      const inventoryRows = products.map((p) => [
        p.id,
        p.name,
        p.sku,
        p.category,
        p.stock.toString(),
        p.unit,
        p.price.toFixed(2),
        p.threshold.toString()
      ]);
      const csvInventory = [
        inventoryHeaders.join(","),
        ...inventoryRows.map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(","))
      ].join("\r\n");

      // 2. Export Orders
      const orderHeaders = ["Order ID", "Customer ID", "Customer Name", "Agent ID", "Total Amount ($)", "Order Status", "Delivery Address", "Items List", "Created At"];
      const orderRows = orders.map((o) => {
        const itemsDescriptor = o.items.map((it) => `${it.productName} (x${it.quantity})`).join("; ");
        return [
          o.id,
          o.customerId,
          o.customerName,
          o.agentId || "Unassigned",
          o.total.toFixed(2),
          o.status,
          o.deliveryAddress.address,
          itemsDescriptor,
          o.createdAt
        ];
      });
      const csvOrders = [
        orderHeaders.join(","),
        ...orderRows.map((row) => row.map((val) => `"${val.replace(/"/g, '""')}"`).join(","))
      ].join("\r\n");

      // Trigger downloads for both files
      downloadCSV(csvInventory, "logitrack_inventory.csv");
      
      setTimeout(() => {
        downloadCSV(csvOrders, "logitrack_orders.csv");
        setNotification({
          message: "Inventory and orders exported successfully to CSV!",
          type: "success"
        });
        setTimeout(() => setNotification(null), 4500);
      }, 150);

    } catch (err) {
      console.error("Export error: ", err);
      setNotification({
        message: "Failed to generate CSV export, please retry.",
        type: "warning"
      });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const downloadCSV = (csvContent: string, fileName: string) => {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Load backend states
  const fetchData = async () => {
    try {
      const [uRes, pRes, oRes, iRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/products"),
        fetch("/api/orders"),
        fetch("/api/inventory-history")
      ]);

      if (uRes.ok && pRes.ok && oRes.ok && iRes.ok) {
        setUsers(await uRes.json());
        setProducts(await pRes.json());
        setOrders(await oRes.json());
        setInventoryHistory(await iRes.json());
      }
    } catch (err) {
      console.error("Failed to load standard system tables: ", err);
    }
  };

  const fetchDemandForecast = async () => {
    try {
      const res = await fetch("/api/ai/demand-forecast");
      if (res.ok) {
        const data = await res.json();
        setDemandForecasts(data.forecasts || []);
        setDemandInsights(data.aiInsights || "");
      }
    } catch (e) {
      console.error("Forecaster error: ", e);
    }
  };

  const fetchChurnResults = async () => {
    try {
      const res = await fetch("/api/ai/churn-prediction");
      if (res.ok) {
        const data = await res.json();
        setChurnResults(data.results || []);
      }
    } catch (e) {
      console.error("Churn scan error: ", e);
    }
  };

  useEffect(() => {
    fetchData();
    fetchDemandForecast();
    fetchChurnResults();
  }, []);

  // Set up WebSocket connection to the Express server for telemetry coordinate updates
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: any;

    function connectWS() {
      try {
        const secureProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const finalUrl = `${secureProtocol}//${window.location.host}`;
        ws = new WebSocket(finalUrl);

        ws.onopen = () => {
          console.log("Registered WS tracking hub!");
          
          // Request continuous updates for all agents and orders
          ws.send(JSON.stringify({ type: "subscribe", orderId: "all_owners" }));
          
          if (selectedTrackingOrder) {
            ws.send(JSON.stringify({ type: "subscribe", orderId: selectedTrackingOrder.id }));
          }
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            
            if (payload.type === "telemetry_broadcast") {
              const tel: LiveTelemetry = payload.telemetry;
              setActiveTelemetry((prev) => ({
                ...prev,
                [tel.agentId]: tel,
              }));

              // If customer tracking an active dispatched order, sync map
              setOrders(prevOrders => 
                prevOrders.map(o => 
                  o.id === tel.orderId ? { ...o, status: "dispatched" } : o
                )
              );
            } else if (payload.type === "order_delivered") {
              const { orderId } = payload;
              setNotification({
                message: `Automated Simulation Alert: Order ${orderId} reached customer grid destination successfully!`,
                type: "success"
              });
              fetchData();
            }
          } catch (e) {
            console.error("Telemetry channel parsing error: ", e);
          }
        };

        ws.onclose = () => {
          console.log("Telemetry connection lost. Attempting reconnect...");
          reconnectTimer = setTimeout(connectWS, 4000);
        };
      } catch (err) {
        console.error("Failed to boot WS channel: ", err);
      }
    }

    connectWS();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimer);
    };
  }, [selectedTrackingOrder]);

  const triggerToastNotification = (msg: string, typ: "success" | "info" | "warning") => {
    setNotification({ message: msg, type: typ });
    setTimeout(() => setNotification(null), 5000);
  };

  // Helper APIs for Child Components
  const handlePlaceOrder = async (items: any[], total: number, address: { lat: number; lng: number; address: string }) => {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: "user-cust-4", // Sophia Martinez selected default
        items,
        address,
        total
      })
    });

    if (res.ok) {
      triggerToastNotification("Component check out approved! Routing allocated.", "success");
      await fetchData();
    } else {
      const data = await res.json();
      throw new Error(data.error || "Order rejected");
    }
  };

  const handleTriggerReturn = async (orderId: string, reason: string) => {
    const res = await fetch(`/api/orders/${orderId}/return`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });

    if (res.ok) {
      triggerToastNotification("Sandbox Returns approves! Automated refund webhook succeeded.", "success");
      await fetchData();
    } else {
      const data = await res.json();
      throw new Error(data.error || "Refund webhook error");
    }
  };

  const handleUpdateOrderStatus = async (id: string, status: string, remarks?: string) => {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, remarks })
    });

    if (res.ok) {
      await fetchData();
    } else {
      throw new Error("Failed to transition status");
    }
  };

  const handleToggleAgentStatus = async (agentId: string) => {
    const res = await fetch(`/api/users/${agentId}/toggle`, { method: "POST" });
    if (res.ok) {
      await fetchData();
    }
  };

  const handleRestockProduct = async (productId: string, qty: number) => {
    const res = await fetch(`/api/products/${productId}/restock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qty })
    });

    if (res.ok) {
      triggerToastNotification("Stock replenished. Ledger updated successfully.", "success");
      await fetchData();
      await fetchDemandForecast();
    }
  };

  const handleTriggerAutoAssign = async () => {
    const res = await fetch("/api/ai/auto-assign", { method: "POST" });
    if (res.ok) {
      triggerToastNotification("Nearest-neighbor TSP optimization completed.", "info");
      await fetchData();
      return await res.json();
    } else {
      throw new Error("No assignees matches calculated.");
    }
  };

  const handleSubscriptionChange = async (tier: "Free" | "Pro") => {
    const res = await fetch("/api/users/user-owner-1/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier })
    });

    if (res.ok) {
      triggerToastNotification(`Plan changed to ${tier}`, "success");
      await fetchData();
    }
  };

  const handleTriggerAgentTelemetry = (payload: any) => {
    // Manually trigger local stream update to mimic actual physical emit if WS server not bound
    setActiveTelemetry(prev => ({
      ...prev,
      [payload.agentId]: {
        lat: payload.lat,
        lng: payload.lng,
        bearing: payload.bearing,
        orderId: payload.orderId,
        agentId: payload.agentId,
        speed: payload.speed,
        timestamp: new Date().toISOString()
      }
    }));
  };

  // Static user references for dashboards
  const businessOwner = users.find(u => u.role === "owner") || users[0];
  const activeAgent = users.find(u => u.id === "user-agent-1") || users[1];
  const activeCustomer = users.find(u => u.id === "user-cust-4") || users[4];

  // Dynamic values parsed for custom maps
  const mapAgents = Object.values(activeTelemetry).map((t: LiveTelemetry) => {
    const matchedAgent = users.find((u) => u.id === t.agentId);
    return {
      id: t.agentId,
      name: matchedAgent?.name || "Active Courier",
      lat: t.lat,
      lng: t.lng,
      bearing: t.bearing,
      speed: t.speed,
      orderId: t.orderId,
      type: "agent" as const,
    };
  });

  const nycMappableCustomers = [
    { id: "cust-preset-1", name: "Wall Street Suite 4B", lat: 40.7060, lng: -74.0088 },
    { id: "cust-preset-2", name: "98 Tribeca Loft", lat: 40.7196, lng: -74.0066 },
    { id: "cust-preset-3", name: "Chinatown Markets Portal", lat: 40.7158, lng: -73.9970 }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none antialiased">
      
      {/* Dynamic Global Top notification toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 p-4 border rounded-2xl shadow-xl flex items-center gap-3 max-w-sm bg-white border-blue-200 text-slate-800 transition-all duration-300">
          <Zap className="w-5 h-5 text-blue-600" />
          <div className="text-xs">
            <span className="font-bold text-slate-900 block">System Dispatch Msg:</span>
            <span className="text-slate-600">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Top Brand Control Bar */}
      <header className="border-b border-slate-200 bg-white p-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-sm flex items-center justify-center">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-md font-bold tracking-tight text-slate-900 flex items-center gap-1.5 font-sans">
                LogiTrack 2.0
                <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 font-mono px-1 rounded font-bold">
                  AI ENTERPRISE
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono">
                Global Supply Chain & Real-Time Fleet Intelligence
              </p>
            </div>
          </div>

          {/* Switcher & Action buttons grouping container */}
          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            {/* Dynamic Switch System Roles Tabbed navigation */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-sm">
              <button
                onClick={() => setRoleMode("owner")}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-bold font-sans flex items-center gap-1.5 transition-all ${
                  roleMode === "owner"
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                SME Manager
              </button>
              <button
                onClick={() => setRoleMode("agent")}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-bold font-sans flex items-center gap-1.5 transition-all ${
                  roleMode === "agent"
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                Agent App
              </button>
              <button
                onClick={() => setRoleMode("customer")}
                className={`text-xs px-3.5 py-1.5 rounded-lg font-bold font-sans flex items-center gap-1.5 transition-all ${
                  roleMode === "customer"
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" />
                Customer Store
              </button>
            </div>

            {/* Export Current Tables CSV button with unique identity */}
            <button
              id="export-data-btn"
              onClick={handleExportData}
              className="text-xs px-3.5 py-2.5 rounded-xl font-bold bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 shadow-sm flex items-center gap-1.5 transition-all outline-none"
              title="Download real-time inventory & orders records to CSV"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Export Data</span>
            </button>
          </div>
        </div>
      </header>

      {/* Primary Layout Map Stage */}
      <div className="max-w-7xl mx-auto w-full p-4 lg:p-6 grid grid-cols-1 gap-6 flex-1">
        
        {/* Live coordinate map tracker spanning full width always */}
        <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-mono font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse inline-block"></span>
              Live Delivery Vector Network Tracker (WebSockets Active)
            </h3>
            {selectedTrackingOrder && (
              <span className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full font-mono text-slate-700 flex items-center gap-1">
                Active Node: <strong className="text-blue-600">{selectedTrackingOrder.id}</strong>
                <button 
                  onClick={() => setSelectedTrackingOrder(null)}
                  className="hover:text-rose-600 font-bold ml-1"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
          <LiveRouteMap
            hub={{ lat: 40.7128, lng: -74.0060, address: "NYC Smart Supply Hub" }}
            agents={mapAgents}
            customers={nycMappableCustomers}
            activeRouteTo={selectedTrackingOrder?.deliveryAddress || null}
            selectedAgentId={selectedTrackingOrder?.agentId || null}
          />
        </div>

        {/* Dynamic Inner Dashboard Modules */}
        <main className="">
          {roleMode === "owner" && businessOwner && (
            <DashboardOwner
              products={products}
              orders={orders}
              users={users}
              inventoryHistory={inventoryHistory}
              currentUser={businessOwner}
              onRestockProduct={handleRestockProduct}
              onTriggerAutoAssign={handleTriggerAutoAssign}
              demandForecasts={demandForecasts}
              demandInsights={demandInsights}
              onRefreshDemandData={fetchDemandForecast}
              churnResults={churnResults}
              onRefreshChurnData={fetchChurnResults}
              onChangeSubscription={handleSubscriptionChange}
            />
          )}

          {roleMode === "agent" && activeAgent && (
            <DashboardAgent
              currentUser={activeAgent}
              orders={orders}
              activeTelemetry={activeTelemetry}
              onToggleStatus={handleToggleAgentStatus}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onTriggerAgentTelemetry={handleTriggerAgentTelemetry}
            />
          )}

          {roleMode === "customer" && activeCustomer && (
            <DashboardCustomer
              products={products}
              orders={orders}
              currentUser={activeCustomer}
              onPlaceOrder={handlePlaceOrder}
              onTriggerReturn={handleTriggerReturn}
              onSelectTrackingOrder={(ord) => {
                setSelectedTrackingOrder(ord);
                triggerToastNotification(`Routing coordinates engaged for ${ord.id}! Tracking active.`, "info");
              }}
              activeTrackingOrder={selectedTrackingOrder}
            />
          )}
        </main>
      </div>

      {/* Footer System Status line info */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between text-[10px] font-mono text-slate-500 gap-2 mt-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <Warehouse className="w-3.5 h-3.5 text-slate-400" />
          <span>&copy; 2026 LogiTrack 2.0. Clean Relational DDL Verified.</span>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>PRISMA SCHEMA SYNCED</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>STRIPE/RAZORPAY GATE COMPLIANT</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>GEMINI 3.5 AGENTS ENGAGED</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
