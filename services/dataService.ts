import { Product, Sale, InventoryMovement, Shift, AuditRecord, User, PaymentMethod, Role, MembershipRecord, Expense, ExtraIncome, ActionLog, AbonoRecord } from '../types';
import { INITIAL_PRODUCTS, USERS } from '../constants';

// Simple mock persistence using LocalStorage
const STORAGE_KEYS = {
  PRODUCTS: 'dfit_products',
  SALES: 'dfit_sales',
  MOVEMENTS: 'dfit_movements',
  SHIFTS: 'dfit_shifts',
  AUDITS: 'dfit_audits',
  MEMBERSHIPS: 'dfit_memberships',
  ABONOS: 'dfit_abonos',
  EXPENSES: 'dfit_expenses',
  EXTRAS: 'dfit_extras',
  LOGS: 'dfit_logs',
  AUDIT_DRAFT: 'dfit_audit_draft',
  LAST_RESET_DATE: 'dfit_last_reset_date',
};

export class DataService {
  private products: Product[] = [];
  private sales: Sale[] = [];
  private movements: InventoryMovement[] = [];
  private shifts: Shift[] = [];
  private audits: AuditRecord[] = [];
  private memberships: MembershipRecord[] = [];
  private abonos: AbonoRecord[] = [];
  private expenses: Expense[] = [];
  private extras: ExtraIncome[] = [];
  private logs: ActionLog[] = [];

  constructor() {
    this.checkDailyReset();
    this.loadData();
  }

  private checkDailyReset() {
      // Get current date in Lima, Peru
      const limaDate = new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
      const lastReset = localStorage.getItem(STORAGE_KEYS.LAST_RESET_DATE);

      if (lastReset !== limaDate) {
          // It's a new day, clear specific operational data
          console.log(`Resetting data for new day: ${limaDate}`);
          
          // Clear Sales, Memberships, Extras, Expenses, Abonos
          // Note: Logs usually persist for audit, but prompt says "Reportes (Solo del tab Historial de ventas)" should reset.
          // Since "Historial de ventas" is derived from `sales` array, clearing `sales` achieves this.
          
          this.sales = [];
          this.memberships = [];
          this.abonos = [];
          this.extras = [];
          this.expenses = [];
          
          // Save the cleared state to LocalStorage immediately
          this.saveData(STORAGE_KEYS.SALES, []);
          this.saveData(STORAGE_KEYS.MEMBERSHIPS, []);
          this.saveData(STORAGE_KEYS.ABONOS, []);
          this.saveData(STORAGE_KEYS.EXTRAS, []);
          this.saveData(STORAGE_KEYS.EXPENSES, []);
          
          // Update the reset date
          localStorage.setItem(STORAGE_KEYS.LAST_RESET_DATE, limaDate);
      }
  }

  private loadData() {
    const p = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    this.products = p ? JSON.parse(p) : INITIAL_PRODUCTS;

    const s = localStorage.getItem(STORAGE_KEYS.SALES);
    this.sales = s ? JSON.parse(s) : [];

    const m = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
    this.movements = m ? JSON.parse(m) : [];

    const sh = localStorage.getItem(STORAGE_KEYS.SHIFTS);
    this.shifts = sh ? JSON.parse(sh) : [];

    const a = localStorage.getItem(STORAGE_KEYS.AUDITS);
    this.audits = a ? JSON.parse(a) : [];

    const mem = localStorage.getItem(STORAGE_KEYS.MEMBERSHIPS);
    this.memberships = mem ? JSON.parse(mem) : [];

    const abo = localStorage.getItem(STORAGE_KEYS.ABONOS);
    this.abonos = abo ? JSON.parse(abo) : [];

    const exp = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    this.expenses = exp ? JSON.parse(exp) : [];

    const ext = localStorage.getItem(STORAGE_KEYS.EXTRAS);
    this.extras = ext ? JSON.parse(ext) : [];

    const l = localStorage.getItem(STORAGE_KEYS.LOGS);
    this.logs = l ? JSON.parse(l) : [];
  }

  private saveData(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // --- LOGGING ---
  logAction(userId: string, module: string, action: 'AGREGAR' | 'EDITAR' | 'ELIMINAR', detail: string, products?: string) {
      const user = USERS.find(u => u.id === userId);
      const log: ActionLog = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          userId,
          userName: user ? user.name : 'Sistema',
          module,
          action,
          detail,
          products
      };
      this.logs.push(log);
      this.saveData(STORAGE_KEYS.LOGS, this.logs);
  }

  getLogs(): ActionLog[] {
      return [...this.logs];
  }
  
  clearLogs(): void {
      this.logs = [];
      this.saveData(STORAGE_KEYS.LOGS, this.logs);
  }

  deleteLog(id: string): void {
      this.logs = this.logs.filter(l => l.id !== id);
      this.saveData(STORAGE_KEYS.LOGS, this.logs);
  }

  // --- Auth ---
  login(pin: string): User | undefined {
    return USERS.find(u => u.pin === pin);
  }

  // --- Products ---
  getProducts(): Product[] {
    return [...this.products];
  }

  saveProduct(product: Product, userId: string): void {
    const existingIndex = this.products.findIndex(p => p.id === product.id);
    if (existingIndex >= 0) {
      this.products[existingIndex] = product;
      this.logAction(userId, 'Inventario', 'EDITAR', `Producto actualizado: ${product.name} (Stock: ${product.stock})`);
    } else {
      this.products.push(product);
      this.logAction(userId, 'Inventario', 'AGREGAR', `Nuevo producto: ${product.name}`);
    }
    this.saveData(STORAGE_KEYS.PRODUCTS, this.products);
  }

  deleteProduct(id: string, userId: string): void {
    const p = this.products.find(x => x.id === id);
    if (p) {
        this.products = this.products.filter(p => p.id !== id);
        this.saveData(STORAGE_KEYS.PRODUCTS, this.products);
        this.logAction(userId, 'Inventario', 'ELIMINAR', `Producto eliminado: ${p.name}`);
    }
  }

  updateStock(productId: string, quantityChange: number, type: 'IN' | 'OUT', userId: string, reason: string): void {
    const product = this.products.find(p => p.id === productId);
    if (product) {
      product.stock += quantityChange;
      // We do not saveProduct() here to avoid double logging or complex logging logic in saveProduct
      // Directly saving:
      const existingIndex = this.products.findIndex(p => p.id === product.id);
      if (existingIndex >= 0) this.products[existingIndex] = product;
      this.saveData(STORAGE_KEYS.PRODUCTS, this.products);

      const movement: InventoryMovement = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        productId,
        productName: product.name,
        userId,
        type: type === 'IN' ? 'IN' : 'OUT',
        quantity: Math.abs(quantityChange),
        reason
      };
      this.movements.push(movement);
      this.saveData(STORAGE_KEYS.MOVEMENTS, this.movements);
    }
  }

  // --- Sales ---
  createSale(sale: Sale): void {
    this.sales.push(sale);
    this.saveData(STORAGE_KEYS.SALES, this.sales);

    // Deduct stock for non-free-pass items
    if (!sale.isFreePass) {
        sale.items.forEach(item => {
        this.updateStock(item.productId, -item.quantity, 'OUT', sale.userId, `Venta #${sale.id}`);
        });
    }

    const productsStr = sale.items.map(item => `${item.productName} (x${item.quantity})`).join(', ');

    // LOGGING: Log EVERY sale under 'Punto de Venta' to have it in Action Logs with product details
    let detailMsg = '';
    if (sale.isFreePass) {
        detailMsg = `Ingreso Libre registrado - Total: S/ ${sale.totalAmount.toFixed(2)} (${sale.paymentMethod})`;
    } else if (sale.paymentMethod === PaymentMethod.PENDING) {
        detailMsg = `Pendiente de Pago generado a: ${sale.customerName || 'Cliente'} - Monto: S/ ${sale.totalAmount.toFixed(2)}`;
    } else if (sale.paymentMethod === PaymentMethod.COLLABORATOR_ADVANCE) {
        detailMsg = `Adelanto registrado a colaborador: ${sale.customerName || 'Colaborador'} - Monto a descontar: S/ ${sale.totalAmount.toFixed(2)}`;
    } else {
        detailMsg = `Venta realizada a: ${sale.customerName || 'Cliente'} - Total: S/ ${sale.totalAmount.toFixed(2)} (${sale.paymentMethod})`;
    }

    this.logAction(
        sale.userId,
        'Punto de Venta',
        'AGREGAR',
        detailMsg,
        productsStr
    );
  }

  getSales(): Sale[] {
    return [...this.sales];
  }

  // Updated to support transferring ownership of the debt to the collector
  markSaleAsPaid(saleId: string, paymentMethod: PaymentMethod = PaymentMethod.CASH, collectedByUserId?: string, collectedByShiftId?: string): void {
    const sale = this.sales.find(s => s.id === saleId);
    if (sale) {
      sale.isPaid = true;
      sale.paymentMethod = paymentMethod;
      
      // LOGGING: Log who collected the debt with product details
      const collectorId = collectedByUserId || sale.userId;
      const productsStr = sale.items.map(item => `${item.productName} (x${item.quantity})`).join(', ');
      this.logAction(
          collectorId, 
          'Cobranzas', 
          'EDITAR', 
          `Deuda cobrada a: ${sale.customerName || 'Cliente'} - Monto: S/ ${sale.totalAmount.toFixed(2)} mediante ${paymentMethod}`,
          productsStr
      );

      // If collected by a specific user/shift, transfer ownership so it counts for their cash cut
      if (collectedByUserId) {
          sale.userId = collectedByUserId;
          // Update timestamp to NOW so it appears in today's/current shift's report
          sale.timestamp = Date.now();
      }
      if (collectedByShiftId) {
          sale.shiftId = collectedByShiftId;
      }

      this.saveData(STORAGE_KEYS.SALES, this.sales);
    }
  }

  deleteSale(saleId: string): void {
      this.sales = this.sales.filter(s => s.id !== saleId);
      this.saveData(STORAGE_KEYS.SALES, this.sales);
  }

  clearAllSales(): void {
      this.sales = [];
      this.saveData(STORAGE_KEYS.SALES, this.sales);
  }

  // --- Memberships ---
  saveMembership(record: MembershipRecord, userId?: string): void {
      const existingIndex = this.memberships.findIndex(m => m.id === record.id);
      if (existingIndex >= 0) {
          this.memberships[existingIndex] = record;
          if(userId) this.logAction(userId, 'Membresías', 'EDITAR', `Membresía editada: ${record.clientName} (${record.membershipType})`);
      } else {
          this.memberships.push(record);
          if(userId) this.logAction(userId, 'Membresías', 'AGREGAR', `Nueva membresía: ${record.clientName} - S/ ${record.abono}`);
      }
      this.saveData(STORAGE_KEYS.MEMBERSHIPS, this.memberships);
  }

  deleteMembership(id: string, userId?: string): void {
      const m = this.memberships.find(x => x.id === id);
      if(m) {
          this.memberships = this.memberships.filter(m => m.id !== id);
          this.saveData(STORAGE_KEYS.MEMBERSHIPS, this.memberships);
          if(userId) this.logAction(userId, 'Membresías', 'ELIMINAR', `Membresía eliminada: ${m.clientName}`);
      }
  }
  
  clearMemberships(userId?: string): void {
      this.memberships = [];
      this.saveData(STORAGE_KEYS.MEMBERSHIPS, this.memberships);
      if(userId) this.logAction(userId, 'Membresías', 'ELIMINAR', 'Historial de membresías eliminado completamente');
  }

  getMemberships(): MembershipRecord[] {
      return [...this.memberships];
  }

  getShiftMemberships(shiftId: string): MembershipRecord[] {
      return this.memberships.filter(m => m.shiftId === shiftId);
  }

  // --- Abonos (New) ---
  saveAbono(record: AbonoRecord, userId?: string): void {
      const existingIndex = this.abonos.findIndex(a => a.id === record.id);
      if (existingIndex >= 0) {
          this.abonos[existingIndex] = record;
          if(userId) this.logAction(userId, 'Membresías', 'EDITAR', `Abono editado: ${record.clientName} - S/ ${record.amount}`);
      } else {
          this.abonos.push(record);
          if(userId) this.logAction(userId, 'Membresías', 'AGREGAR', `Nuevo abono: ${record.clientName} - S/ ${record.amount}`);
      }
      this.saveData(STORAGE_KEYS.ABONOS, this.abonos);
  }

  deleteAbono(id: string, userId?: string): void {
      const a = this.abonos.find(x => x.id === id);
      if(a) {
          this.abonos = this.abonos.filter(a => a.id !== id);
          this.saveData(STORAGE_KEYS.ABONOS, this.abonos);
          if(userId) this.logAction(userId, 'Membresías', 'ELIMINAR', `Abono eliminado: ${a.clientName}`);
      }
  }

  getAbonos(): AbonoRecord[] {
      return [...this.abonos];
  }

  getShiftAbonos(shiftId: string): AbonoRecord[] {
      return this.abonos.filter(a => a.shiftId === shiftId);
  }

  getTodayAbonos(): AbonoRecord[] {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      return this.abonos.filter(a => a.timestamp >= startOfDay.getTime());
  }

  // --- Expenses ---
  saveExpense(expense: Expense): void {
    const existingIndex = this.expenses.findIndex(e => e.id === expense.id);
    if (existingIndex >= 0) {
        this.expenses[existingIndex] = expense;
        this.logAction(expense.userId, 'Egresos', 'EDITAR', `Egreso editado: ${expense.description} - S/ ${expense.amount}`);
    } else {
        this.expenses.push(expense);
        this.logAction(expense.userId, 'Egresos', 'AGREGAR', `Nuevo egreso: ${expense.description} - S/ ${expense.amount}`);
    }
    this.saveData(STORAGE_KEYS.EXPENSES, this.expenses);
  }

  deleteExpense(id: string, userId: string): void {
      const e = this.expenses.find(x => x.id === id);
      if (e) {
          this.expenses = this.expenses.filter(x => x.id !== id);
          this.saveData(STORAGE_KEYS.EXPENSES, this.expenses);
          this.logAction(userId, 'Egresos', 'ELIMINAR', `Egreso eliminado: ${e.description}`);
      }
  }

  clearExpenses(userId: string): void {
      this.expenses = [];
      this.saveData(STORAGE_KEYS.EXPENSES, this.expenses);
      this.logAction(userId, 'Egresos', 'ELIMINAR', 'Todos los egresos eliminados');
  }

  getExpenses(): Expense[] {
    return [...this.expenses];
  }

  getShiftExpenses(shiftId: string): Expense[] {
      return this.expenses.filter(e => e.shiftId === shiftId);
  }
  
  getTodayExpenses(): Expense[] {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      return this.expenses.filter(e => e.timestamp >= startOfDay.getTime());
  }

  // --- Extras ---
  saveExtra(extra: ExtraIncome): void {
    const existingIndex = this.extras.findIndex(e => e.id === extra.id);
    if (existingIndex >= 0) {
        this.extras[existingIndex] = extra;
        this.logAction(extra.userId, 'Extras', 'EDITAR', `Extra editado: ${extra.description} - S/ ${extra.amount}`);
    } else {
        this.extras.push(extra);
        this.logAction(extra.userId, 'Extras', 'AGREGAR', `Nuevo ingreso extra: ${extra.description} - S/ ${extra.amount}`);
    }
    this.saveData(STORAGE_KEYS.EXTRAS, this.extras);
  }

  deleteExtra(id: string, userId: string): void {
      const e = this.extras.find(x => x.id === id);
      if (e) {
          this.extras = this.extras.filter(x => x.id !== id);
          this.saveData(STORAGE_KEYS.EXTRAS, this.extras);
          this.logAction(userId, 'Extras', 'ELIMINAR', `Extra eliminado: ${e.description}`);
      }
  }

  clearExtras(userId: string): void {
      this.extras = [];
      this.saveData(STORAGE_KEYS.EXTRAS, this.extras);
      this.logAction(userId, 'Extras', 'ELIMINAR', 'Todos los extras eliminados');
  }

  getExtras(): ExtraIncome[] {
    return [...this.extras];
  }

  getShiftExtras(shiftId: string): ExtraIncome[] {
      return this.extras.filter(e => e.shiftId === shiftId);
  }

  getTodayExtras(): ExtraIncome[] {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      return this.extras.filter(e => e.timestamp >= startOfDay.getTime());
  }

  // --- Shifts ---
  getActiveShift(): Shift | undefined {
    return this.shifts.find(s => s.status === 'OPEN');
  }

  startShift(userId: string, role: Role, startCash: number): Shift {
    const shift: Shift = {
      id: Date.now().toString(),
      userId,
      role,
      startTime: Date.now(),
      endTime: null,
      startCash,
      status: 'OPEN'
    };
    this.shifts.push(shift);
    this.saveData(STORAGE_KEYS.SHIFTS, this.shifts);
    return shift;
  }

  closeShift(shiftId: string): void {
    const shift = this.shifts.find(s => s.id === shiftId);
    if (shift) {
      shift.endTime = Date.now();
      shift.status = 'CLOSED';
      this.saveData(STORAGE_KEYS.SHIFTS, this.shifts);
    }
  }

  getShiftSales(shiftId: string): Sale[] {
    return this.sales.filter(s => s.shiftId === shiftId);
  }

  // --- Admin / Aggregate Helpers ---
  getTodaySales(): Sale[] {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      return this.sales.filter(s => s.timestamp >= startOfDay.getTime());
  }

  getTodayMemberships(): MembershipRecord[] {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      return this.memberships.filter(m => m.timestamp >= startOfDay.getTime());
  }
  
  // --- Audits & Inventory Drafts ---
  addAudit(audit: AuditRecord, userId: string): void {
    this.audits.push(audit);
    this.saveData(STORAGE_KEYS.AUDITS, this.audits);
    
    // Auto adjust stock based on audit
    if (audit.difference !== 0) {
        this.updateStock(audit.productId, audit.difference, 'ADJUSTMENT' as any, audit.userId, 'Corrección de Inventario (Auditoría)');
    }
    this.logAction(userId, 'Inventario', 'EDITAR', `Auditoría: ${audit.productName} (Dif: ${audit.difference})`);
  }

  getAudits(): AuditRecord[] {
    return [...this.audits];
  }

  // Save Inventory Audit Draft
  saveAuditDraft(draft: Record<string, number>): void {
      this.saveData(STORAGE_KEYS.AUDIT_DRAFT, draft);
  }

  // Get Inventory Audit Draft
  getAuditDraft(): Record<string, number> {
      const draft = localStorage.getItem(STORAGE_KEYS.AUDIT_DRAFT);
      return draft ? JSON.parse(draft) : {};
  }

  clearAuditDraft(): void {
      localStorage.removeItem(STORAGE_KEYS.AUDIT_DRAFT);
  }

  // --- Exports ---
  exportToCSV(data: any[], filename: string) {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(val => 
      typeof val === 'string' ? `"${val}"` : val
    ).join(','));
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const dataService = new DataService();