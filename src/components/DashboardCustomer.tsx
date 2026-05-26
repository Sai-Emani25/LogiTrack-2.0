import React, { useState } from "react";
import { 
  ShoppingBag, 
  Trash2, 
  MapPin, 
  Clock, 
  CheckCircle, 
  RotateCcw, 
  CreditCard, 
  ArrowRight, 
  BadgeHelp,
  Check,
  AlertCircle
} from "lucide-react";
import { Product, Order, User } from "../types";

interface DashboardCustomerProps {
  products: Product[];
  orders: Order[];
  currentUser: User;
  onPlaceOrder: (items: any[], total: number, address: { lat: number; lng: number; address: string }) => Promise<void>;
  onTriggerReturn: (orderId: string, reason: string) => Promise<void>;
  onSelectTrackingOrder: (order: Order) => void;
  activeTrackingOrder: Order | null;
}

export default function DashboardCustomer({
  products,
  orders,
  currentUser,
  onPlaceOrder,
  onTriggerReturn,
  onSelectTrackingOrder,
  activeTrackingOrder
}: DashboardCustomerProps) {
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [checkoutStep, setCheckoutStep] = useState<"idle" | "payment" | "success">("idle");
  const [paymentGateway, setPaymentGateway] = useState<"stripe" | "razorpay">("stripe");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [addressSelect, setAddressSelect] = useState("wall-st");
  const [returnReason, setReturnReason] = useState("");
  const [selectedReturnOrder, setSelectedReturnOrder] = useState<Order | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // NYC Customer Address Presets
  const addressPresets = {
    "wall-st": { lat: 40.7060, lng: -74.0088, address: "Wall Street Suite 4B, New York City" },
    "tribeca": { lat: 40.7196, lng: -74.0066, address: "98 Tribeca Loft Drive, New York City" },
    "chinatown": { lat: 40.7158, lng: -73.9970, address: "Chinatown Market Plaza, New York City" }
  };

  const currentAddress = addressPresets[addressSelect as keyof typeof addressPresets];

  const addToCart = (prod: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === prod.id);
      if (existing) {
        if (existing.quantity >= prod.stock) return prev;
        return prev.map((item) =>
          item.product.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product: prod, quantity: 1 }];
    });
  };

  const removeFromCart = (prodId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== prodId));
  };

  const updateCartQty = (prodId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === prodId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (nextQty > item.product.stock) return item;
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter(Boolean) as any
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setIsSubmittingOrder(true);
    try {
      const itemsPayload = cart.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
      }));
      await onPlaceOrder(itemsPayload, cartTotal, currentAddress);
      setCart([]);
      setCheckoutStep("success");
    } catch (err: any) {
      alert(err.message || "Checkout transaction rejected by Sandbox Gateway");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const processReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturnOrder || !returnReason) return;
    setIsSubmittingReturn(true);
    try {
      await onTriggerReturn(selectedReturnOrder.id, returnReason);
      setSelectedReturnOrder(null);
      setReturnReason("");
    } catch (err: any) {
      alert(err.message || "Failed to issue refund webhook");
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // Filter orders for this specific customer
  const customerOrders = orders.filter((o) => o.customerId === currentUser.id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Product Catalog Column */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-sans tracking-tight text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-blue-600" />
            SME Supply Hardware Storefront
          </h2>
          <span className="text-xs font-mono bg-white border border-slate-200 shadow-sm px-2.5 py-1 rounded-full text-slate-600 font-bold">
            SECURE SANDBOX PORTAL
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {products.map((prod) => {
            const outOfStock = prod.stock <= 0;
            const itemInCart = cart.find((item) => item.product.id === prod.id);
            const isRestockAlarm = prod.stock <= prod.threshold;

            return (
              <div 
                key={prod.id} 
                className={`p-4 rounded-xl bg-white border transition-all flex flex-col justify-between shadow-sm hover:shadow ${
                  isRestockAlarm 
                    ? "border-rose-200 bg-rose-50/10 hover:border-rose-300" 
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] bg-slate-100 text-slate-600 font-mono font-bold px-1.5 py-0.5 rounded tracking-wider uppercase">
                      {prod.sku}
                    </span>
                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 border rounded ${
                      outOfStock
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : isRestockAlarm
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}>
                      {outOfStock ? "OUT OF STOCK" : isRestockAlarm ? `RESTOCKING TRIGGER (${prod.stock} left)` : `STABLE (${prod.stock} units)`}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 font-sans mt-2.5">
                    {prod.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-sans mt-1">
                    Category: {prod.category}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-sm font-bold text-slate-800 font-mono">
                    ${prod.price.toFixed(2)}
                  </span>
                  <button
                    disabled={outOfStock}
                    onClick={() => addToCart(prod)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                      outOfStock
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                        : "bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
                    }`}
                  >
                    Add Component
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Storefront Customer Orders List */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-4">
            My Order Lifecycle Tracking ({customerOrders.length} orders)
          </h3>

          {customerOrders.length === 0 ? (
            <div className="py-8 text-center text-slate-400 font-sans text-xs">
              No orders registered yet. Try checking out components in the sidebar.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {customerOrders.map((order) => {
                const isTracking = activeTrackingOrder?.id === order.id;
                
                return (
                  <div key={order.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-slate-700 font-bold">
                          {order.id}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold tracking-tight border ${
                          order.status === "delivered"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : order.status === "dispatched"
                              ? "bg-sky-50 text-sky-700 border-sky-200 animate-pulse"
                              : order.status === "returned"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-100/80 text-slate-600 border-slate-200"
                        }`}>
                          {order.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-slate-800">
                          ${order.total.toFixed(2)}
                        </span>
                        
                        {/* Map select tracking trigger */}
                        <button
                          onClick={() => onSelectTrackingOrder(order)}
                          className={`text-[10px] px-2.5 py-1 rounded transition-all font-bold border ${
                            isTracking
                              ? "bg-rose-600 text-white border-rose-700 shadow-sm"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {isTracking ? "Live GPS Active" : "Track on Map"}
                        </button>

                        {/* Automated refund webhook simulation portal */}
                        {order.status === "delivered" && (
                          <button
                            onClick={() => setSelectedReturnOrder(order)}
                            className="bg-slate-50 hover:bg-slate-100 border border-slate-205 text-slate-700 text-[10px] px-2.5 py-1 rounded flex items-center gap-1 font-bold"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                            Return Node
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-500 flex flex-col gap-0.5 truncate font-sans">
                      <div><strong className="text-slate-400 font-medium">Address:</strong> {order.deliveryAddress.address}</div>
                      <div className="flex gap-1.5 flex-wrap">
                        <strong className="text-slate-400 font-medium">Components:</strong>
                        {order.items.map((it, idx) => (
                          <span key={idx} className="bg-slate-100 px-1.5 border border-slate-200 rounded text-slate-700 font-mono text-[10px] font-bold">
                            {it.productName} (x{it.quantity})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Shopping Cart & Checkout Portal Column */}
      <div className="space-y-6">
        <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-155 text-slate-800 flex flex-col shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-blue-100 mb-4">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold tracking-tight text-blue-800">Personal SME Client Account</h3>
          </div>
          <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-blue-100">
            <span className="text-xs text-slate-500">Sandbox Wallet Balance:</span>
            <span className="text-sm font-bold text-slate-800 font-mono">${currentUser.balance.toFixed(2)}</span>
          </div>
        </div>

        {/* Shopping Cart Drawer */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 font-sans flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              SME Component Order Cart
            </h3>
            <span className="text-xs font-mono font-bold bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
              {cart.length} SKUs
            </span>
          </div>

          {cart.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-sans">
              Shopping cart is empty. Add modules from the hardware catalog.
            </div>
          ) : checkoutStep !== "payment" ? (
            <div className="space-y-4">
              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.product.id} className="py-2.5 first:pt-0 flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-bold text-slate-800 truncate max-w-[140px]">
                        {item.product.name}
                      </h4>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        ${item.product.price.toFixed(2)} / unit
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-slate-200 bg-slate-50 rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateCartQty(item.product.id, -1)}
                          className="px-2.5 py-1 text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                          -
                        </button>
                        <span className="px-2 text-slate-800 font-bold font-mono">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQty(item.product.id, 1)}
                          className="px-2.5 py-1 text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Subtotal metrics */}
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                <span className="text-slate-550">Gateway Subtotal:</span>
                <span className="text-sm font-bold text-slate-900 font-mono">${cartTotal.toFixed(2)}</span>
              </div>

              {/* Secure Address selectors */}
              <div className="space-y-2 mt-4">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                  Select Delivery Dest Grid:
                </label>
                <select
                  value={addressSelect}
                  onChange={(e) => setAddressSelect(e.target.value)}
                  className="w-full bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 p-2 rounded-lg text-xs outline-none font-sans"
                >
                  <option value="wall-st">Office Hub (Wall St, Manhattan)</option>
                  <option value="tribeca">Residential Compound (Tribeca, Manhattan)</option>
                  <option value="chinatown">Retail Market Hub (Chinatown, Manhattan)</option>
                </select>
                <div className="p-2 rounded bg-slate-50 border border-slate-100 text-[9px] text-slate-400 font-mono">
                  Coordinates: {currentAddress.lat}, {currentAddress.lng}
                </div>
              </div>

              <button
                onClick={() => setCheckoutStep("payment")}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all mt-4 shadow-sm"
              >
                Proceed to Checkout
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            /* Secure Sandbox Stripe / Razorpay modal form */
            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentGateway("stripe")}
                  className={`flex-1 text-center py-1.5 rounded text-[10px] font-bold tracking-wider uppercase border transition-all ${
                    paymentGateway === "stripe"
                      ? "bg-slate-900 text-white border-slate-950 shadow-sm"
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Stripe Sandbox
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentGateway("razorpay")}
                  className={`flex-1 text-center py-1.5 rounded text-[10px] font-bold tracking-wider uppercase border transition-all ${
                    paymentGateway === "razorpay"
                      ? "bg-slate-900 text-white border-slate-950 shadow-sm"
                      : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  Razorpay Sandbox
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 font-mono font-bold">CREDIT CARD HOLDER</label>
                  <input
                    type="text"
                    required
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder={currentUser.name}
                    className="w-full bg-white text-slate-800 border border-slate-200 p-2 rounded-lg text-xs outline-none focus:border-slate-305"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 font-mono font-bold">TEST CARD NUMBER</label>
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full bg-white text-slate-800 border border-slate-200 p-2 rounded-lg text-xs outline-none font-mono focus:border-slate-305"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 font-mono font-bold">CVV</label>
                    <input
                      type="text"
                      maxLength={3}
                      defaultValue="***"
                      placeholder="311"
                      className="w-full bg-white text-slate-800 border border-slate-200 p-2 rounded-lg text-xs outline-none text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-400 font-mono font-bold">EXPIRATION</label>
                    <input
                      type="text"
                      defaultValue="12 / 2030"
                      className="w-full bg-white text-slate-800 border border-slate-200 p-2 rounded-lg text-xs outline-none text-center font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs font-sans text-slate-800">
                <span>Total Charged:</span>
                <span className="text-sm font-bold text-slate-900 font-mono">${cartTotal.toFixed(2)}</span>
              </div>

              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setCheckoutStep("idle")}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 py-2 rounded-lg font-bold transition-all"
                >
                  Back to Cart
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOrder}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all"
                >
                  {isSubmittingOrder ? (
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      PAY NOW
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {checkoutStep === "success" && (
            <div className="text-center py-6 space-y-4 font-sans">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <Check className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-slate-800 font-bold text-xs">Sandbox Webhook Verified!</h4>
                <p className="text-[11px] text-slate-500 px-4">
                  Order was verified, components subtracted from core inventory system successfully.
                </p>
              </div>
              <button
                onClick={() => setCheckoutStep("idle")}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-705 text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded transition-all"
              >
                Assemble New Cart
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Return request panel */}
        {selectedReturnOrder && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
              <h3 className="text-xs font-bold font-sans text-amber-700 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Return & Refund Portal
              </h3>
              <button
                onClick={() => setSelectedReturnOrder(null)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={processReturnSubmit} className="space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 font-mono text-[9px] font-bold">ORDER ID TARGET:</span>
                <div className="text-slate-850 font-mono font-bold mt-0.5">{selectedReturnOrder.id}</div>
              </div>

              <div className="space-y-1.5 font-sans">
                <label className="text-[9px] text-slate-400 font-mono block font-bold">REASON FOR RETURN:</label>
                <textarea
                  required
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g. Defective drone sensor block, or incorrect transceiver module type."
                  className="w-full bg-white text-slate-800 border border-slate-205 p-2 rounded-lg text-[11px] h-16 outline-none resize-none focus:border-amber-300"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingReturn}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all shadow-sm"
              >
                {isSubmittingReturn ? (
                  <Clock className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    APPROVE REFUND
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
