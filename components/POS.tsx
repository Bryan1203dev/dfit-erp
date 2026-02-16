import React, { useState, useMemo, useEffect } from 'react';
import { Product, PaymentMethod, User, Shift, Sale, SaleItem, ProductCategory, Role } from '../types';
import { FREE_PASS_OPTIONS } from '../constants';
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, User as UserIcon, Search, Split } from 'lucide-react';
import { dataService } from '../services/dataService';
import Modal from './Modal';

interface POSProps {
  products: Product[];
  currentUser: User;
  currentShift: Shift | undefined;
  onSaleComplete: () => void;
}

const POS: React.FC<POSProps> = ({ products, currentUser, currentShift, onSaleComplete }) => {
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [customerName, setCustomerName] = useState('');
  
  // Mixed Payment State
  const [mixedCashAmount, setMixedCashAmount] = useState<string>(''); // String to handle empty input
  
  // Free Pass State - Default to 10
  const [freePassType, setFreePassType] = useState<number>(10);
  const [freePassCount, setFreePassCount] = useState<number>(1);
  const [freePassPaymentMethod, setFreePassPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{title: string, message: string, action: () => void}>({
      title: '', message: '', action: () => {}
  });

  const isAdmin = currentUser.role === Role.ADMIN;
  const cartTotal = cart.reduce((acc, item) => acc + item.total, 0);

  // Reset payment method if cart becomes empty
  useEffect(() => {
      if (cart.length === 0) {
          setPaymentMethod(PaymentMethod.CASH);
          setMixedCashAmount('');
      }
  }, [cart]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice } 
          : item
        );
      }
      return [...prev, { 
          productId: product.id, 
          productName: product.name, 
          quantity: 1, 
          unitPrice: product.price, 
          total: product.price, 
          category: product.category 
        }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty, total: newQty * item.unitPrice };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const confirmCheckout = () => {
    if (!currentShift && !isAdmin) {
      alert("No hay un turno activo para procesar ventas.");
      return;
    }
    if (cart.length === 0) return;

    if (paymentMethod === PaymentMethod.PENDING && !customerName.trim()) {
        alert("Debe ingresar el nombre del cliente para ventas a crédito.");
        return;
    }
    
    // Validation for Mixed Payment
    let detailMsg = `Método: ${paymentMethod}`;
    if (paymentMethod === PaymentMethod.MIXED) {
        const cash = parseFloat(mixedCashAmount) || 0;
        const app = cartTotal - cash;
        if (cash < 0 || cash > cartTotal) {
            alert("El monto en efectivo no es válido.");
            return;
        }
        detailMsg = `Método Excepcional:\nEfectivo: S/ ${cash.toFixed(2)}\nAplicativo: S/ ${app.toFixed(2)}`;
    }

    // Build Product List String
    const productList = cart.map(item => `• ${item.productName} (x${item.quantity}) - S/ ${item.total.toFixed(2)}`).join('\n');

    // Trigger Custom Modal
    setModalConfig({
        title: 'Confirmar Venta',
        message: `Detalle de Productos:\n${productList}\n\n----------------------------\nTotal a Pagar: S/ ${cartTotal.toFixed(2)}\n${detailMsg}`,
        action: executeCheckout
    });
    setModalOpen(true);
  };

  const executeCheckout = () => {
    let paymentDetails = undefined;
    
    if (paymentMethod === PaymentMethod.MIXED) {
        const cash = parseFloat(mixedCashAmount) || 0;
        const app = cartTotal - cash;
        paymentDetails = { cash, app };
    }

    const sale: Sale = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      shiftId: currentShift ? currentShift.id : 'ADMIN_DIRECT',
      userId: currentUser.id,
      items: cart,
      totalAmount: cartTotal,
      paymentMethod,
      paymentDetails,
      customerName: customerName || undefined,
      isPaid: paymentMethod !== PaymentMethod.PENDING
    };

    dataService.createSale(sale);
    setCart([]);
    setCustomerName('');
    setPaymentMethod(PaymentMethod.CASH);
    setMixedCashAmount('');
    setModalOpen(false);
    onSaleComplete();
  };

  const confirmFreePass = () => {
      if (!currentShift && !isAdmin) {
          alert("No hay un turno activo.");
          return;
      }
      if (freePassCount <= 0) return;

      const total = freePassType * freePassCount;
      
      setModalConfig({
        title: 'Confirmar Ingreso Libre',
        message: `¿Registrar ${freePassCount} Ingreso(s) Libre(s) de S/ ${freePassType} cada uno?\n\nTotal: S/ ${total.toFixed(2)} (${freePassPaymentMethod})`,
        action: executeFreePass
      });
      setModalOpen(true);
  };

  const executeFreePass = () => {
      const total = freePassType * freePassCount;
      const sale: Sale = {
          id: `FP-${Date.now()}`,
          timestamp: Date.now(),
          shiftId: currentShift ? currentShift.id : 'ADMIN_DIRECT',
          userId: currentUser.id,
          items: [{
              productId: 'FREE-PASS',
              productName: `Entrada Libre S/${freePassType}`,
              quantity: freePassCount,
              unitPrice: freePassType,
              total: total
          }],
          totalAmount: total,
          paymentMethod: freePassPaymentMethod,
          isPaid: true,
          isFreePass: true
      };

      dataService.createSale(sale);
      setModalOpen(false);
      onSaleComplete();
      
      // Reset defaults
      setFreePassCount(1);
      setFreePassType(10); // Reset to 10 as default
      setFreePassPaymentMethod(PaymentMethod.CASH);
  };

  if (!currentShift && !isAdmin) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-10">
            <div className="bg-yellow-100 dark:bg-yellow-900/20 p-6 rounded-full mb-4">
                <AlertTriangleIcon className="w-12 h-12 text-yellow-600 dark:text-yellow-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Turno Cerrado</h2>
            <p className="text-gray-500 dark:text-gray-400">Por favor, inicie un turno para acceder al punto de venta.</p>
        </div>
    );
  }

  return (
    <>
    <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onConfirm={modalConfig.action} 
        title={modalConfig.title} 
        message={modalConfig.message} 
    />

    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-100px)] h-auto gap-4">
      {/* Left: Product Catalog */}
      <div className="flex-1 flex flex-col bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 lg:overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 space-y-4">
           {/* Free Pass Quick Widget */}
           <div className="bg-gold-50 dark:bg-neutral-900/50 p-3 rounded-lg border border-gold-200 dark:border-neutral-700 flex flex-wrap items-center gap-4">
                <span className="font-bold text-gold-700 dark:text-gold-500 text-sm uppercase tracking-wide">Ingreso Libre</span>
                <select 
                    value={freePassType}
                    onChange={(e) => setFreePassType(Number(e.target.value))}
                    className="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded px-3 py-1 text-sm"
                >
                    {FREE_PASS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                <div className="flex items-center gap-2">
                    <span className="text-xs">Cant:</span>
                    <input 
                        type="number" 
                        min="1" 
                        value={freePassCount}
                        onChange={(e) => setFreePassCount(Number(e.target.value))}
                        className="w-16 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-sm"
                    />
                </div>
                
                {/* Payment Method Selector for Free Pass */}
                <select 
                    value={freePassPaymentMethod}
                    onChange={(e) => setFreePassPaymentMethod(e.target.value as PaymentMethod)}
                    className="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded px-3 py-1 text-sm text-gray-700 dark:text-gray-300"
                >
                    <option value={PaymentMethod.CASH}>Efectivo</option>
                    <option value={PaymentMethod.APP}>Aplicativo</option>
                    <option value={PaymentMethod.TRANSFER}>Transferencia</option>
                </select>

                <div className="font-bold text-gray-800 dark:text-white ml-auto">Total: S/ {(freePassType * freePassCount).toFixed(2)}</div>
                <button 
                    onClick={confirmFreePass}
                    disabled={!currentShift && !isAdmin}
                    className="bg-gold-500 hover:bg-gold-600 text-white px-4 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Registrar
                </button>
           </div>

           <div className="flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                    type="text"
                    placeholder="Buscar producto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:border-gold-500"
                    />
                </div>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-sm focus:outline-none focus:border-gold-500"
                >
                    <option value="ALL">Todas las Categorías</option>
                    {Object.values(ProductCategory).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
           </div>
        </div>

        {/* Grid */}
        <div className="flex-1 lg:overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(product => (
            <div 
                key={product.id} 
                onClick={() => product.stock > 0 ? addToCart(product) : null}
                className={`group relative flex flex-col justify-between bg-neutral-50 dark:bg-neutral-700/50 p-4 rounded-xl border border-transparent hover:border-gold-500/50 transition-all cursor-pointer ${product.stock === 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'active:scale-95'}`}
            >
              <div>
                <span className="text-[10px] font-bold text-gold-600 dark:text-gold-500 uppercase tracking-wider">{product.category}</span>
                <h3 className="font-semibold text-gray-800 dark:text-gray-100 leading-tight mt-1">{product.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{product.sku}</p>
              </div>
              <div className="mt-4 flex justify-between items-end">
                <span className="font-bold text-lg text-gray-900 dark:text-white">S/ {product.price.toFixed(2)}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${product.stock <= product.minStock ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                    Stock: {product.stock}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Cart */}
      <div className="w-full lg:w-96 flex flex-col bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 lg:h-full h-auto">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex justify-between items-center bg-neutral-50 dark:bg-neutral-900/50">
            <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-gold-500" /> Carrito de Venta
            </h2>
            <span className="text-xs text-gray-500">{cart.length} items</span>
        </div>

        <div className="flex-1 lg:overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50 py-10 lg:py-0">
                <ShoppingCart className="w-12 h-12 mb-2" />
                <p>Carrito vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.productId} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-700/30 rounded-lg">
                <div className="flex-1">
                    <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{item.productName}</p>
                    <p className="text-xs text-gold-600 dark:text-gold-500 font-bold">S/ {item.total.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => updateQuantity(item.productId, -1)} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded"><Minus className="w-4 h-4" /></button>
                    <span className="w-4 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, 1)} className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded"><Plus className="w-4 h-4" /></button>
                    <button onClick={() => removeFromCart(item.productId)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded ml-2"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 space-y-4">
            <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase">Método de Pago</label>
                <div className="grid grid-cols-2 gap-2">
                    {Object.values(PaymentMethod)
                        .filter(m => m !== PaymentMethod.MIXED) // Render standard methods first
                        .map(method => (
                        <button
                            key={method}
                            onClick={() => {
                                setPaymentMethod(method);
                                setMixedCashAmount(''); // Reset mixed state
                            }}
                            className={`px-2 py-2 text-xs rounded border transition-colors ${
                                paymentMethod === method 
                                ? 'bg-gold-500 border-gold-600 text-white font-bold' 
                                : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-gray-600 dark:text-gray-300 hover:bg-neutral-100'
                            }`}
                        >
                            {method}
                        </button>
                    ))}
                    {/* Botón Método Excepcional */}
                    <button
                        onClick={() => setPaymentMethod(PaymentMethod.MIXED)}
                        className={`col-span-2 px-2 py-2 text-xs rounded border transition-colors flex items-center justify-center gap-2 ${
                            paymentMethod === PaymentMethod.MIXED
                            ? 'bg-purple-600 border-purple-700 text-white font-bold'
                            : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-purple-600 dark:text-purple-400 hover:bg-neutral-100'
                        }`}
                    >
                        <Split className="w-3 h-3" /> Método Excepcional (Dividir Pago)
                    </button>
                </div>
            </div>

            {/* Mixed Payment Inputs */}
            {paymentMethod === PaymentMethod.MIXED && (
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800 space-y-2 animate-in fade-in slide-in-from-top-2">
                    <p className="text-[10px] text-purple-800 dark:text-purple-300 font-bold uppercase mb-1">Distribución del Pago</p>
                    <div className="flex gap-2 items-center">
                        <div className="flex-1">
                            <label className="block text-[10px] text-gray-500 mb-1">Efectivo (S/)</label>
                            <input 
                                type="number" 
                                value={mixedCashAmount}
                                onChange={(e) => setMixedCashAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full p-2 text-sm rounded border border-purple-300 dark:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-500 text-right font-bold"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] text-gray-500 mb-1">Aplicativo (S/)</label>
                            <div className="w-full p-2 text-sm rounded border border-transparent bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 text-right font-bold">
                                {((cartTotal - (parseFloat(mixedCashAmount) || 0))).toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {paymentMethod === PaymentMethod.PENDING && (
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre del Cliente</label>
                    <div className="flex items-center bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg px-3 py-2">
                        <UserIcon className="w-4 h-4 text-gray-400 mr-2" />
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Ej. Juan Pérez"
                            className="bg-transparent w-full text-sm focus:outline-none"
                        />
                    </div>
                </div>
            )}

            <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400">Total a Pagar</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">S/ {cartTotal.toFixed(2)}</span>
            </div>

            <button
                onClick={confirmCheckout}
                disabled={(cart.length === 0 || (!currentShift && !isAdmin))}
                className="w-full bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gold-600 dark:to-gold-500 text-white font-bold py-3 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl transition-all"
            >
                <div className="flex items-center justify-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    {currentShift ? 'CONFIRMAR VENTA' : (isAdmin ? 'VENTA ADMINISTRATIVA' : 'TURNO CERRADO')}
                </div>
            </button>
        </div>
      </div>
    </div>
    </>
  );
};

// Simple Alert Icon helper
const AlertTriangleIcon = ({className}: {className: string}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
)

export default POS;