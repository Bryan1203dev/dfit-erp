import React, { useState } from 'react';
import { Shift, Sale, User, PaymentMethod, Role, ProductCategory, MembershipRecord } from '../types';
import { dataService } from '../services/dataService';
import { PlayCircle, StopCircle, DollarSign, Wallet, ClipboardCheck, LayoutList, Package, Users, CreditCard, ShieldCheck, PlusCircle, FileSpreadsheet } from 'lucide-react';
import Modal from './Modal';
import * as XLSX from 'xlsx';
import { USERS } from '../constants';

interface ShiftManagerProps {
  currentUser: User;
  currentShift: Shift | undefined;
  onShiftChange: () => void;
}

const ShiftManager: React.FC<ShiftManagerProps> = ({ currentUser, currentShift, onShiftChange }) => {
  const [startCash, setStartCash] = useState<string>('0');
  const [activeTab, setActiveTab] = useState<'CONSOLIDATED' | 'PRODUCTS' | 'FREEPASS' | 'MEMBERSHIPS'>('CONSOLIDATED');
  const [showStartShiftUI, setShowStartShiftUI] = useState(false);
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{title: string, message: string, action: () => void}>({
      title: '', message: '', action: () => {}
  });

  const isAdmin = currentUser.role === Role.ADMIN;

  const handleStartShift = () => {
    dataService.startShift(currentUser.id, currentUser.role, parseFloat(startCash));
    setShowStartShiftUI(false);
    onShiftChange();
  };

  const confirmCloseShift = () => {
      if (!currentShift) return;
      setModalConfig({
          title: 'Cerrar Turno',
          message: 'NO OLVIDE QUE ANTES DE CERRAR SU TURNO DEBE GENERAR SU REPORTE FINAL, SI YA LO HIZO PROCEDA CON EL CIERRE',
          action: executeCloseShift
      });
      setModalOpen(true);
  };

  const executeCloseShift = () => {
    if (currentShift) {
        dataService.closeShift(currentShift.id);
        setModalOpen(false);
        onShiftChange();
    }
  };

  const renderStartShiftScreen = () => (
      <div className="flex flex-col items-center justify-center h-full p-8 animate-in fade-in zoom-in duration-300">
        <div className="max-w-md w-full bg-white dark:bg-neutral-800 p-8 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700 text-center relative">
          {isAdmin && (
              <button 
                onClick={() => setShowStartShiftUI(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                  ✕
              </button>
          )}
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <PlayCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Iniciar Turno</h2>
          <p className="text-gray-500 mb-6">Hola {currentUser.name}, ingrese el fondo de caja inicial para comenzar.</p>
          
          <div className="mb-6 text-left">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fondo Inicial (S/)</label>
            <input
              type="number"
              value={startCash}
              onChange={(e) => setStartCash(e.target.value)}
              className="w-full text-center text-2xl font-bold p-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-gold-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleStartShift}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30"
          >
            ABRIR TURNO
          </button>
        </div>
      </div>
  );

  if ((!currentShift && !isAdmin) || (isAdmin && !currentShift && showStartShiftUI)) {
      return renderStartShiftScreen();
  }

  // --- Calculations ---

  const relevantSales = isAdmin ? dataService.getTodaySales() : (currentShift ? dataService.getShiftSales(currentShift.id) : []);
  const relevantMemberships = isAdmin ? dataService.getTodayMemberships() : (currentShift ? dataService.getShiftMemberships(currentShift.id) : []);
  const relevantAbonos = isAdmin ? dataService.getTodayAbonos() : (currentShift ? dataService.getShiftAbonos(currentShift.id) : []);
  const relevantExpenses = isAdmin ? dataService.getTodayExpenses() : (currentShift ? dataService.getShiftExpenses(currentShift.id) : []);
  const relevantExtras = isAdmin ? dataService.getTodayExtras() : (currentShift ? dataService.getShiftExtras(currentShift.id) : []);

  // Splits for Details
  const productSales = relevantSales.filter(s => !s.isFreePass);
  const freePassSales = relevantSales.filter(s => s.isFreePass);

  // --- Specific Cash Breakdown for Closing Report ---
  const cashMembershipsOnly = relevantMemberships.filter(m => m.paymentMethod === PaymentMethod.CASH).reduce((sum, m) => sum + m.abono, 0);
  const cashAbonos = relevantAbonos.filter(a => a.paymentMethod === PaymentMethod.CASH).reduce((sum, a) => sum + a.amount, 0);
  
  // Total Cash Membership Income (New Memberships + New Abonos) - CASH ONLY
  const totalCashMembershipIncome = cashMembershipsOnly + cashAbonos;

  // UPDATED: Include Mixed Cash Parts
  const calculateCashPortion = (sales: Sale[]) => {
      return sales.filter(s => s.isPaid).reduce((sum, s) => {
          if (s.paymentMethod === PaymentMethod.CASH) return sum + s.totalAmount;
          if (s.paymentMethod === PaymentMethod.MIXED && s.paymentDetails) return sum + s.paymentDetails.cash;
          return sum;
      }, 0);
  };

  const cashProducts = calculateCashPortion(productSales);
  const cashFreePass = calculateCashPortion(freePassSales);
  
  const cashExtras = relevantExtras.filter(e => e.paymentMethod === PaymentMethod.CASH).reduce((sum, e) => sum + e.amount, 0);
  
  const currentStartCash = currentShift ? currentShift.startCash : 0; 
  
  // Total Income (Cash)
  const totalCashIncome = totalCashMembershipIncome + cashProducts + cashFreePass + cashExtras + currentStartCash;
  const totalExpenses = relevantExpenses.reduce((acc, e) => acc + e.amount, 0);
  
  const totalNeto = totalCashIncome - totalExpenses;
  const deposit = totalNeto - currentStartCash;

  // --- Digital Income (App + Transfer + Mixed App Part) ---
  const digitalMemberships = relevantMemberships.filter(m => m.paymentMethod === PaymentMethod.APP || m.paymentMethod === PaymentMethod.TRANSFER).reduce((sum, m) => sum + m.abono, 0);
  const digitalAbonos = relevantAbonos.filter(a => a.paymentMethod === PaymentMethod.APP || a.paymentMethod === PaymentMethod.TRANSFER).reduce((sum, a) => sum + a.amount, 0);
  
  const calculateDigitalPortion = (sales: Sale[]) => {
      return sales.filter(s => s.isPaid).reduce((sum, s) => {
          if (s.paymentMethod === PaymentMethod.APP || s.paymentMethod === PaymentMethod.TRANSFER) return sum + s.totalAmount;
          if (s.paymentMethod === PaymentMethod.MIXED && s.paymentDetails) return sum + s.paymentDetails.app;
          return sum;
      }, 0);
  };

  const digitalSales = calculateDigitalPortion(relevantSales);
  const digitalExtras = relevantExtras.filter(e => e.paymentMethod === PaymentMethod.APP || e.paymentMethod === PaymentMethod.TRANSFER).reduce((sum, e) => sum + e.amount, 0);
  
  const totalDigital = digitalMemberships + digitalAbonos + digitalSales + digitalExtras;

  // --- Global Stats for Top Cards ---
  const salesPending = relevantSales.filter(s => !s.isPaid).reduce((sum, s) => sum + s.totalAmount, 0);
  
  // Total Generated Today = (Effective to Deposit) + (Total Digital Income)
  const totalGeneratedToday = deposit + totalDigital;

  // --- Detail Breakdowns ---
  const totalProductRevenue = productSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalFreePassRevenue = freePassSales.reduce((acc, s) => acc + s.totalAmount, 0);
  // Separate Membership revenue totals for display
  const totalNewMemRevenue = relevantMemberships.reduce((acc, m) => acc + m.abono, 0);
  const totalNewAbonoRevenue = relevantAbonos.reduce((acc, a) => acc + a.amount, 0);
  const totalMembershipCombined = totalNewMemRevenue + totalNewAbonoRevenue;

  // Product Categorization
  const allProducts = dataService.getProducts();
  const productRevenueByCategory = productSales.reduce((acc, sale) => {
      sale.items.forEach(item => {
          const prod = allProducts.find(p => p.id === item.productId);
          const cat = prod?.category || ProductCategory.OTHER;
          if (!acc[cat]) acc[cat] = 0;
          acc[cat] += item.total;
      });
      return acc;
  }, {} as Record<string, number>);

  // Product Revenue by Method (Cash vs Digital)
  const productRevenueCash = cashProducts; // Reusing calculation
  const productRevenueDigital = calculateDigitalPortion(productSales); // Reusing calculation logic

  // Free Pass Breakdown for Tab
  const freePassCashDisplay = cashFreePass;
  const freePassApp = freePassSales.filter(s => s.paymentMethod === PaymentMethod.APP).reduce((acc, s) => acc + s.totalAmount, 0) 
                    + freePassSales.filter(s => s.paymentMethod === PaymentMethod.MIXED && s.paymentDetails).reduce((acc, s) => acc + (s.paymentDetails?.app || 0), 0);
  const freePassTransfer = freePassSales.filter(s => s.paymentMethod === PaymentMethod.TRANSFER).reduce((acc, s) => acc + s.totalAmount, 0);

  // Mem Breakdown for Tab (Combined New + Abonos)
  const memCashTotal = cashMembershipsOnly + cashAbonos;
  const memAppTotal = relevantMemberships.filter(m => m.paymentMethod === PaymentMethod.APP).reduce((sum, m) => sum + m.abono, 0) + 
                      relevantAbonos.filter(a => a.paymentMethod === PaymentMethod.APP).reduce((sum, a) => sum + a.amount, 0);
  const memTransferTotal = relevantMemberships.filter(m => m.paymentMethod === PaymentMethod.TRANSFER).reduce((sum, m) => sum + m.abono, 0) +
                           relevantAbonos.filter(a => a.paymentMethod === PaymentMethod.TRANSFER).reduce((sum, a) => sum + a.amount, 0);


  const getUserName = (userId: string) => USERS.find(u => u.id === userId)?.name || 'Desconocido';

  // --- FINAL REPORT EXCEL GENERATION ---
  const generateFinalReport = () => {
    const wb = XLSX.utils.book_new();
    const timestamp = new Date().toLocaleDateString().replace(/\//g, '-');

    // 1. Resumen Caja (Summary Sheet)
    const summaryData = [
        ["CONCEPTO", "MONTO (S/)"],
        ["+ Total Ingreso Membresías (Efectivo)", totalCashMembershipIncome], // Combined
        ["+ Total Ingreso Productos (Efectivo)", cashProducts],
        ["+ Total Ingreso Libres (Efectivo)", cashFreePass],
        ["+ Ingresos Extras (Efectivo)", cashExtras],
        ["+ Total Fondo Inicial", currentStartCash],
        ["(=) TOTAL INGRESOS", totalCashIncome],
        ["(-) TOTAL EGRESOS", totalExpenses],
        ["(=) TOTAL NETO CAJA", totalNeto],
        ["", ""],
        ["EFECTIVO A DEPOSITAR", deposit],
        ["TOTAL INGRESOS APP (App + Transf + Extras + Mixto App)", totalDigital],
        ["", ""],
        ["TOTAL GENERADO (Depósito + Digital)", totalGeneratedToday]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen Caja");

    // 2. Membresías (New)
    const memData = relevantMemberships.map(m => ({
        Fecha: new Date(m.timestamp).toLocaleString(),
        Turno: m.shiftName,
        Codigo: m.code,
        Cliente: m.clientName,
        Tipo: m.membershipType,
        Precio: m.price,
        Abono: m.abono,
        Metodo: m.paymentMethod
    }));
    const wsMem = XLSX.utils.json_to_sheet(memData);
    XLSX.utils.book_append_sheet(wb, wsMem, "Nuevas Membresías");

    // 2b. Abonos (New)
    const abonoData = relevantAbonos.map(a => ({
        Fecha: new Date(a.timestamp).toLocaleString(),
        Turno: a.shiftName,
        Codigo: a.code,
        Cliente: a.clientName,
        Detalle: a.detail,
        Abono: a.amount,
        Metodo: a.paymentMethod
    }));
    const wsAbono = XLSX.utils.json_to_sheet(abonoData);
    XLSX.utils.book_append_sheet(wb, wsAbono, "Nuevos Abonos");

    // 3. Inventario (Full Snapshot)
    const invData = allProducts.map(p => ({
        SKU: p.sku,
        Producto: p.name,
        Categoria: p.category,
        Precio: p.price,
        Stock: p.stock,
        MinStock: p.minStock,
        Estado: p.stock <= p.minStock ? 'BAJO STOCK' : 'OK'
    }));
    const wsInv = XLSX.utils.json_to_sheet(invData);
    XLSX.utils.book_append_sheet(wb, wsInv, "Inventario");

    // 4. Egresos
    const expData = relevantExpenses.map(e => ({
        Fecha: new Date(e.timestamp).toLocaleString(),
        Usuario: e.userName,
        Detalle: e.description,
        Monto: e.amount
    }));
    const wsExp = XLSX.utils.json_to_sheet(expData);
    XLSX.utils.book_append_sheet(wb, wsExp, "Egresos");
    
    // 5. Extras (New Tab)
    const extraData = relevantExtras.map(ext => ({
        Fecha: new Date(ext.timestamp).toLocaleString(),
        Usuario: ext.userName,
        Detalle: ext.description,
        Metodo: ext.paymentMethod,
        Monto: ext.amount
    }));
    const wsExtra = XLSX.utils.json_to_sheet(extraData);
    XLSX.utils.book_append_sheet(wb, wsExtra, "Extras");

    // 6. Pendientes de Cobro (All Pending)
    const allSales = dataService.getSales();
    const pendingData = allSales.filter(s => !s.isPaid).map(s => ({
        Fecha: new Date(s.timestamp).toLocaleString(),
        Vendedor: getUserName(s.userId),
        Cliente: s.customerName,
        Items: s.items.map(i => i.productName).join(', '),
        Total: s.totalAmount,
        Metodo: s.paymentMethod
    }));
    const wsPending = XLSX.utils.json_to_sheet(pendingData);
    XLSX.utils.book_append_sheet(wb, wsPending, "Pendientes Cobro");

    // 7. Historial Ventas (Relevant History)
    // We use the same filter as the current view (Admin=Day, User=Shift)
    const histData = relevantSales.filter(s => s.isPaid).map(s => {
        let metodoStr: string = s.paymentMethod;
        if (s.paymentMethod === PaymentMethod.MIXED && s.paymentDetails) {
            metodoStr = `Mixto (E:${s.paymentDetails.cash}/A:${s.paymentDetails.app})`;
        }
        return {
            Fecha: new Date(s.timestamp).toLocaleString(),
            Vendedor: getUserName(s.userId),
            Clase: s.isFreePass ? 'LIBRE' : 'PRODUCTOS',
            Items: s.items.map(i => i.productName).join(', '),
            Total: s.totalAmount,
            Metodo: metodoStr
        };
    });
    const wsHist = XLSX.utils.json_to_sheet(histData);
    XLSX.utils.book_append_sheet(wb, wsHist, "Historial Ventas");

    // 8. Historial Acciones (Logs)
    const logs = dataService.getLogs();
    const logData = logs.map(l => ({
        Fecha: new Date(l.timestamp).toLocaleString(),
        Turno: l.userName,
        Modulo: l.module,
        Accion: l.action,
        Detalle: l.detail
    }));
    const wsLogs = XLSX.utils.json_to_sheet(logData);
    XLSX.utils.book_append_sheet(wb, wsLogs, "Historial Acciones");

    // Write File with dynamic name
    const userNameClean = currentUser.name.replace(/\s+/g, '_');
    XLSX.writeFile(wb, `Reporte_Final_${isAdmin ? 'Admin' : userNameClean}_${timestamp}.xlsx`);
  };

  return (
    <>
    <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onConfirm={modalConfig.action} 
        title={modalConfig.title} 
        message={modalConfig.message} 
    />
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
        <div className="bg-gradient-to-r from-neutral-800 to-neutral-900 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    {isAdmin ? <ShieldCheck className="text-gold-500" /> : <ClipboardCheck className="text-gold-500" />}
                    {isAdmin ? 'Reporte General Diario (Todos los Turnos)' : 'Gestión de Turno'}
                </h2>
                <p className="text-neutral-400 text-sm mt-1">
                    {isAdmin ? 'Vista de Supervisor' : `Operador: ${currentUser.name}`}
                    {!isAdmin && currentShift && ` | Inicio: ${new Date(currentShift.startTime).toLocaleTimeString()}`}
                </p>
            </div>
            
            <div className="flex gap-2 items-center flex-wrap justify-end">
                {/* FINAL REPORT BUTTON */}
                {(currentShift || isAdmin) && (
                    <button 
                        onClick={generateFinalReport}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-500/20 transition-all"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        REPORTE FINAL
                    </button>
                )}

                {currentShift ? (
                    <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-full text-xs font-bold border border-green-500/30 uppercase tracking-wider">
                        Turno Abierto
                    </div>
                ) : (
                    isAdmin && (
                        <button 
                            onClick={() => setShowStartShiftUI(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
                        >
                            <PlusCircle className="w-4 h-4" />
                            ABRIR TURNO
                        </button>
                    )
                )}
                
                {isAdmin && !currentShift && (
                    <div className="bg-gold-500/20 text-gold-400 px-4 py-2 rounded-full text-xs font-bold border border-gold-500/30 uppercase tracking-wider">
                        Acceso Total
                    </div>
                )}
            </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-700 overflow-x-auto">
            <button 
                onClick={() => setActiveTab('CONSOLIDATED')}
                className={`flex-1 py-4 px-2 text-sm font-medium border-b-2 transition-colors flex justify-center items-center gap-2 whitespace-nowrap ${activeTab === 'CONSOLIDATED' ? 'border-gold-500 text-gold-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <LayoutList className="w-4 h-4" /> Consolidado
            </button>
            <button 
                onClick={() => setActiveTab('PRODUCTS')}
                className={`flex-1 py-4 px-2 text-sm font-medium border-b-2 transition-colors flex justify-center items-center gap-2 whitespace-nowrap ${activeTab === 'PRODUCTS' ? 'border-gold-500 text-gold-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <Package className="w-4 h-4" /> Ingresos por Productos
            </button>
            <button 
                onClick={() => setActiveTab('FREEPASS')}
                className={`flex-1 py-4 px-2 text-sm font-medium border-b-2 transition-colors flex justify-center items-center gap-2 whitespace-nowrap ${activeTab === 'FREEPASS' ? 'border-gold-500 text-gold-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <Users className="w-4 h-4" /> Ingresos por Libres
            </button>
            <button 
                onClick={() => setActiveTab('MEMBERSHIPS')}
                className={`flex-1 py-4 px-2 text-sm font-medium border-b-2 transition-colors flex justify-center items-center gap-2 whitespace-nowrap ${activeTab === 'MEMBERSHIPS' ? 'border-gold-500 text-gold-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
                <CreditCard className="w-4 h-4" /> Ingresos por Membresía
            </button>
        </div>

        <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <SummaryCard title="Total Generado Hoy" amount={totalGeneratedToday} icon={DollarSign} color="text-gold-500" />
                <SummaryCard 
                    title="FONDO INICIAL" 
                    amount={currentStartCash} 
                    sub="Monto de Apertura"
                    icon={Wallet} 
                    color="text-green-500" 
                />
                <SummaryCard title="Total Aplicativos" amount={totalDigital} icon={DollarSign} color="text-purple-500" />
                <SummaryCard title="Total Por Cobrar" amount={salesPending} icon={ClipboardCheck} color="text-red-500" />
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-900 rounded-xl p-6 border border-neutral-200 dark:border-neutral-700 mb-8 min-h-[200px]">
                {activeTab === 'CONSOLIDATED' && (
                    <div className="animate-in fade-in duration-300">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-4 uppercase tracking-wide">Resumen General de Caja (CIERRE)</h3>
                        <div className="space-y-1 text-sm bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
                            
                            {/* Income Breakdown */}
                            <div className="flex justify-between p-2 border-b border-dashed border-gray-200 dark:border-gray-700">
                                <span className="text-gray-500">+ Total Ingreso Membresías (Efectivo - Nuevas + Abonos)</span>
                                <span className="font-medium dark:text-gray-200">S/ {totalCashMembershipIncome.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between p-2 border-b border-dashed border-gray-200 dark:border-gray-700">
                                <span className="text-gray-500">+ Total Ingreso Productos (Efectivo)</span>
                                <span className="font-medium dark:text-gray-200">S/ {cashProducts.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between p-2 border-b border-dashed border-gray-200 dark:border-gray-700">
                                <span className="text-gray-500">+ Total Ingreso Libres (Efectivo)</span>
                                <span className="font-medium dark:text-gray-200">S/ {cashFreePass.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between p-2 border-b border-dashed border-gray-200 dark:border-gray-700 bg-emerald-50/50 dark:bg-emerald-900/10">
                                <span className="text-emerald-700 dark:text-emerald-400 font-medium">+ Ingresos Extras (Efectivo)</span>
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">S/ {cashExtras.toFixed(2)}</span>
                            </div>
                             <div className="flex justify-between p-2 border-b border-gray-300 dark:border-gray-600">
                                <span className="text-gray-500 font-bold">+ Total Fondo Inicial</span>
                                <span className="font-bold text-gray-700 dark:text-gray-300">S/ {currentStartCash.toFixed(2)}</span>
                            </div>
                            
                            {/* TOTAL INGRESO */}
                             <div className="flex justify-between p-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-lg mt-2">
                                <span className="text-gray-800 dark:text-white font-bold uppercase">(=) TOTAL INGRESOS</span>
                                <span className="font-bold text-green-600 dark:text-green-400 text-lg">S/ {totalCashIncome.toFixed(2)}</span>
                            </div>

                             {/* EXPENSES */}
                            <div className="flex justify-between p-3 mt-2">
                                <span className="text-red-500 font-bold">(-) TOTAL EGRESOS</span>
                                <span className="font-bold text-red-500">S/ {totalExpenses.toFixed(2)}</span>
                            </div>

                            {/* TOTAL NETO */}
                             <div className="flex justify-between p-3 bg-neutral-100 dark:bg-neutral-700/50 rounded-lg mt-2 border-l-4 border-gold-500">
                                <span className="text-gray-800 dark:text-white font-bold uppercase">(=) TOTAL NETO</span>
                                <span className="font-bold text-gold-600 dark:text-gold-500 text-lg">S/ {totalNeto.toFixed(2)}</span>
                            </div>

                             {/* DEPOSIT */}
                            <div className="flex justify-between p-4 bg-gray-900 text-white rounded-lg mt-4 shadow-lg">
                                <span className="font-bold uppercase tracking-wider flex items-center gap-2">
                                    <Wallet className="w-5 h-5 text-gold-500" />
                                    EFECTIVO A DEPOSITAR
                                </span>
                                <span className="font-bold text-2xl text-gold-500">S/ {deposit.toFixed(2)}</span>
                            </div>
                        </div>

                        {/* DIGITAL SUMMARY */}
                        <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-900/30 flex justify-between items-center">
                             <div className="flex items-center gap-2">
                                 <CreditCard className="text-purple-600 dark:text-purple-400" />
                                 <span className="text-purple-800 dark:text-purple-300 font-bold text-sm uppercase">TOTAL INGRESOS APP (Aplicativo & Transferencia)</span>
                             </div>
                             <span className="text-2xl font-bold text-purple-700 dark:text-purple-400">S/ {totalDigital.toFixed(2)}</span>
                        </div>
                    </div>
                )}

                {activeTab === 'PRODUCTS' && (
                     <div className="animate-in fade-in duration-300">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-4">Detalle de Productos por Categoría</h3>
                         
                         {/* Payment Method Breakdown for Products */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                             <div className="p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 flex justify-between items-center shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span className="text-sm text-gray-500 font-medium">Efectivo Total</span>
                                </div>
                                <span className="font-bold text-lg dark:text-white">S/ {productRevenueCash.toFixed(2)}</span>
                            </div>
                            <div className="p-4 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 flex justify-between items-center shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                    <span className="text-sm text-gray-500 font-medium">Aplicativo + Transferencia</span>
                                </div>
                                <span className="font-bold text-lg dark:text-white">S/ {productRevenueDigital.toFixed(2)}</span>
                            </div>
                        </div>

                         <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30 mb-6">
                            <span className="text-blue-800 dark:text-blue-200 font-medium">Total Ingresos por Productos</span>
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">S/ {totalProductRevenue.toFixed(2)}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {Object.entries(productRevenueByCategory).map(([cat, amount]) => (
                                <div key={cat} className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                    <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">{cat}</p>
                                    <p className="font-bold text-lg dark:text-white">S/ {amount.toFixed(2)}</p>
                                </div>
                            ))}
                            {Object.keys(productRevenueByCategory).length === 0 && (
                                <div className="col-span-full text-center text-gray-500 text-sm py-4">No hay ventas de productos registradas.</div>
                            )}
                        </div>
                     </div>
                )}

                {activeTab === 'FREEPASS' && (
                     <div className="animate-in fade-in duration-300">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-4">Desglose de Ingresos Libres</h3>
                         <div className="flex items-center justify-between p-4 bg-gold-50 dark:bg-neutral-800 rounded-lg border border-gold-200 dark:border-gold-500/30 mb-6">
                            <span className="text-gold-800 dark:text-gold-500 font-medium">Total Ingresos Libres</span>
                            <span className="text-2xl font-bold text-gold-600 dark:text-gold-400">S/ {totalFreePassRevenue.toFixed(2)}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                <p className="text-xs text-gray-500 mb-1">Efectivo</p>
                                <p className="font-bold text-lg dark:text-white">S/ {freePassCashDisplay.toFixed(2)}</p>
                            </div>
                            <div className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                <p className="text-xs text-gray-500 mb-1">Aplicativo</p>
                                <p className="font-bold text-lg dark:text-white">S/ {freePassApp.toFixed(2)}</p>
                            </div>
                            <div className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                <p className="text-xs text-gray-500 mb-1">Transferencia</p>
                                <p className="font-bold text-lg dark:text-white">S/ {freePassTransfer.toFixed(2)}</p>
                            </div>
                        </div>
                     </div>
                )}

                {activeTab === 'MEMBERSHIPS' && (
                    <div className="animate-in fade-in duration-300">
                        <h3 className="font-bold text-gray-800 dark:text-white mb-4">Desglose de Membresías y Abonos</h3>
                         <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-500/30 mb-6">
                            <span className="text-purple-800 dark:text-purple-400 font-medium">Total Ingresos (Nuevas + Abonos)</span>
                            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">S/ {totalMembershipCombined.toFixed(2)}</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                <p className="text-xs text-gray-500 mb-1">Efectivo Total</p>
                                <p className="font-bold text-lg dark:text-white">S/ {memCashTotal.toFixed(2)}</p>
                            </div>
                            <div className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                <p className="text-xs text-gray-500 mb-1">Aplicativo Total</p>
                                <p className="font-bold text-lg dark:text-white">S/ {memAppTotal.toFixed(2)}</p>
                            </div>
                            <div className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                                <p className="text-xs text-gray-500 mb-1">Transferencia Total</p>
                                <p className="font-bold text-lg dark:text-white">S/ {memTransferTotal.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* New Memberships Section */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 border-b border-gray-200 dark:border-gray-700 pb-1">Nuevas Membresías</h4>
                                <div className="space-y-2">
                                    {relevantMemberships.length === 0 ? <p className="text-sm italic text-gray-400">Sin registros.</p> : 
                                    relevantMemberships.slice(0, 5).map(m => (
                                        <div key={m.id} className="flex justify-between text-sm p-2 bg-neutral-50 dark:bg-neutral-800 rounded">
                                            <span>{m.clientName}</span>
                                            <span className="font-bold">S/ {m.abono.toFixed(2)}</span>
                                        </div>
                                    ))}
                                    <div className="text-right text-xs font-bold text-gray-400 pt-1">Total: S/ {totalNewMemRevenue.toFixed(2)}</div>
                                </div>
                            </div>

                            {/* New Abonos Section */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 border-b border-gray-200 dark:border-gray-700 pb-1">Nuevos Abonos</h4>
                                <div className="space-y-2">
                                     {relevantAbonos.length === 0 ? <p className="text-sm italic text-gray-400">Sin registros.</p> : 
                                     relevantAbonos.slice(0, 5).map(a => (
                                        <div key={a.id} className="flex justify-between text-sm p-2 bg-neutral-50 dark:bg-neutral-800 rounded">
                                            <span>{a.clientName}</span>
                                            <span className="font-bold">S/ {a.amount.toFixed(2)}</span>
                                        </div>
                                    ))}
                                    <div className="text-right text-xs font-bold text-gray-400 pt-1">Total: S/ {totalNewAbonoRevenue.toFixed(2)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {(currentShift || (!isAdmin && !currentShift)) && (
                <button
                    onClick={confirmCloseShift}
                    className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-red-500/30"
                >
                    <StopCircle className="w-6 h-6" />
                    CERRAR TURNO
                </button>
            )}
        </div>
      </div>
    </div>
    </>
  );
};

const SummaryCard = ({ title, amount, sub, icon: Icon, color }: any) => (
    <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm flex items-center justify-between">
        <div>
            <p className="text-xs text-gray-500 uppercase font-medium">{title}</p>
            <h4 className={`text-xl font-bold ${color}`}>S/ {amount.toFixed(2)}</h4>
            {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 ${color}`}>
            <Icon className="w-5 h-5" />
        </div>
    </div>
);

export default ShiftManager;