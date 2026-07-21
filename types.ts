
export enum Role {
  ADMIN = 'ADMIN',
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
}

export enum PaymentMethod {
  CASH = 'Efectivo',
  APP = 'Aplicativo (Yape/Plin)',
  TRANSFER = 'Transferencia',
  PENDING = 'Pendiente (Crédito)',
  MIXED = 'Método Excepcional (Efec/App)',
  COLLABORATOR_ADVANCE = 'Adelanto (Colaboradores)',
}

export enum ProductCategory {
  SUPPLEMENTS = 'Suplementos',
  DRINKS = 'Bebidas',
  ACCESSORIES = 'Accesorios',
  CLOTHING = 'Ropa',
  FOOD = 'Comestibles',
  OTHER = 'Otros',
}

export interface User {
  id: string;
  name: string;
  role: Role;
  pin: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  price: number;
  stock: number;
  minStock: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category?: string; // Added for easier reporting
}

export interface Sale {
  id: string;
  timestamp: number;
  shiftId: string; // Links sale to a specific shift
  userId: string;
  items: SaleItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  customerName?: string; // For pending payments
  paymentDetails?: { // For Mixed payments
    cash: number;
    app: number;
  };
  isPaid: boolean; // For pending payments status
  isFreePass?: boolean; // If true, it's a day pass sale
}

export interface MembershipRecord {
  id: string;
  timestamp: number;
  shiftId: string; // To link to cash register logic
  userId: string;
  
  // Specific fields requested
  shiftName: string; // "Colaborador Mañana" | "Colaborador Tarde"
  code: string;
  clientName: string;
  membershipType: string;
  price: number;
  abono: number;
  paymentMethod: PaymentMethod;
  paymentDetails?: {
    cash: number;
    app: number;
  };
}

export interface AbonoRecord {
  id: string;
  timestamp: number;
  shiftId: string;
  userId: string;
  shiftName: string;
  code: string;
  clientName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  detail: string;
  paymentDetails?: {
    cash: number;
    app: number;
  };
}

export interface Expense {
  id: string;
  timestamp: number;
  shiftId: string;
  userId: string;
  userName: string; // The "Turno" string requested
  description: string;
  amount: number;
  paymentMethod: PaymentMethod; // Added field
}

export interface ExtraIncome {
  id: string;
  timestamp: number;
  shiftId: string;
  userId: string;
  userName: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
}

export interface InventoryMovement {
  id: string;
  timestamp: number;
  productId: string;
  productName: string;
  userId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
}

export interface Shift {
  id: string;
  userId: string;
  role: Role; // Morning or Afternoon
  startTime: number;
  endTime: number | null;
  startCash: number; // Optional float fund
  status: 'OPEN' | 'CLOSED';
}

export interface AuditRecord {
  id: string;
  timestamp: number;
  userId: string;
  productId: string;
  productName: string;
  systemStock: number;
  physicalStock: number;
  difference: number;
}

export interface ActionLog {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  module: string;
  action: 'AGREGAR' | 'EDITAR' | 'ELIMINAR';
  detail: string;
  products?: string;
}