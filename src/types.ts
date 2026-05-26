export type UserRole = "owner" | "agent" | "customer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  balance: number; // For Agent payouts or Customer wallet
  isActive: boolean; // Agent toggles active state
  lastOrderedAt?: string; // ISO date for churn prediction
  subscriptionTier?: "Free" | "Pro"; // For B2B Multi-tenant Owner
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  threshold: number;
  unit: string;
}

export interface InventoryHistory {
  id: string;
  productId: string;
  timestamp: string; // ISO String for past 30 days
  quantityChanged: number; // e.g., -5 for sales, +50 for restocks
  type: "sale" | "restock" | "waste";
}

export type OrderStatus =
  | "pending"
  | "assigned"
  | "dispatched"
  | "delivered"
  | "returned"
  | "refunded";

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  agentId?: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  deliveryAddress: {
    lat: number;
    lng: number;
    address: string;
  };
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }[];
}

export interface LiveTelemetry {
  lat: number;
  lng: number;
  bearing: number;
  orderId: string;
  agentId: string;
  speed: number;
  timestamp: string;
}

export interface DeliveryLog {
  id: string;
  orderId: string;
  status: OrderStatus;
  timestamp: string;
  notes: string;
}

export interface DemandForecastResult {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  predictedDepletionDays: number; // Calculated days remaining
  recommendedRestockQty: number; // 7-day projection buffer
  confidence: number; // MLOps value
  isCritical: boolean; // Flag if stock will deplete below threshold
  aiInsights?: string; // Enhanced insights from Gemini
}

export interface AutoAssignResult {
  assignments: {
    orderId: string;
    agentId: string;
    agentName: string;
    distanceMinutes: number;
    optRouteLength: number;
  }[];
  unassignedOrders: string[];
}

export interface ChurnResult {
  userId: string;
  name: string;
  email: string;
  daysStagnant: number;
  promotionPayload: {
    subject: string;
    body: string;
    discountCode: string;
    benefit: string;
  };
}
