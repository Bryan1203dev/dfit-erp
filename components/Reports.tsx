import React, { useState, useEffect } from 'react';
import { Sale, User, PaymentMethod, Role, ActionLog, Shift } from '../types';
import { dataService } from '../services/dataService';
import { FileDown, CheckSquare, Trash2, Filter, History, AlertTriangle } from 'lucide-react';
import { USERS } from '../constants';
import Modal from './Modal';

interface ReportsProps {
  sales: Sale[];
  currentUser: User;
  onUpdate: () => void;
}

const Reports: React.FC<ReportsProps> = ({ sales, currentUser, onUpdate }) => {
  const [tab, setTab] = useState<'PENDING' | 'HISTORY' | 'LOGS'>('PENDING');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [logs, setLogs] = useState<ActionLog[]>([]);
  
  // Payment Selection State for Modal
  const [pendingSaleId, setPendingSaleId] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  
  // Deletion State
  const [deleteId, setDeleteId] = useState<string | 'ALL' | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<{title: string, message: string, type: 'confirm'|'success'|'alert'}>({
      title: '', message: '', type: 'confirm'
  });

  const isAdmin = currentUser.role === Role.ADMIN;
  const currentShift = dataService.getActiveShift();
  const pendingSales = sales.filter(s => !s.isPaid);
  
  useEffect(() => {
      if (tab === 'LOGS') {
          setLogs(dataService.getLogs());
      }
  }, [tab, sales]); // Refresh on updates

  // Filter Logic for Sales
  const filteredHistory = sales.filter(s => {
    if (tab === 'PENDING') return false;
    
    // Shift Filter Logic: Match userId which represents the shift operator
    const matchesShift = shiftFilter === 'ALL' || s.userId === shiftFilter;

    // Class Filter Logic
    const matchesClass = classFilter === 'ALL' || 
                         (classFilter === 'PRODUCTOS' && !s.isFreePass) ||
                         (classFilter === 'LIBRE' && s.isFreePass);
    
    return matchesShift && matchesClass;
  });
  
  const allProducts = dataService.getProducts();

  // Get unique users who have made sales for the filter dropdown
  const uniqueUserIds = Array.from(new Set(sales.map(s => s.userId)));
  const shiftOptions = uniqueUserIds.map(id => USERS.find(u => u.id === id)).filter(Boolean) as User[];

  const getUserName = (userId: string) => {
      const user = USERS.find(u => u.id === userId);
      return user ? user.name : 'Desconocido';
  };

  const initiatePayPending = (saleId: string) => {
      setPendingSaleId(saleId);
      setSelectedPaymentMethod(PaymentMethod.CASH); // Reset to default
      setModalConfig({
          title: 'Registrar Cobro',
          message: 'Seleccione el método de pago para regularizar la deuda:',
          type: 'confirm'
      });
      setModalOpen(true);
  };

  const initiateDelete = (id: string) => {
      setDeleteId(id);
      setModalConfig({
          title: 'Eliminar Registro',
          message: '¿Está seguro de eliminar este registro? Esta acción es irreversible.',
          type: 'confirm'
      });
      setModalOpen(true);
  };

  const initiateDeleteAll = () => {
      setDeleteId('ALL');
      setModalConfig({
          title: 'ELIMINAR TODO',
          message: '¿ATENCIÓN: Está a punto de borrar TODOS los registros visibles en esta pestaña. ¿Está seguro?',
          type: 'alert'
      });
      setModalOpen(true);
  };

  const handleModalConfirm = () => {
    if (pendingSaleId) {
        // Payment Logic - Transfer ownership to current user/shift
        const currentShiftId = currentShift ? currentShift.id : 'ADMIN_DIRECT';
        
        dataService.markSaleAsPaid(
            pendingSaleId, 
            selectedPaymentMethod,
            currentUser.id,
            currentShiftId
        );
        
        onUpdate();
        setPendingSaleId(null);
        setModalConfig({
            title: 'Pago Exitoso',
            message: `¡Pago registrado correctamente mediante ${selectedPaymentMethod}! El ingreso ha sido asignado a su turno actual.`,
            type: 'success'
        });
    } else if (deleteId) {
        // Deletion Logic
        if (tab === 'HISTORY') {
            if (deleteId === 'ALL') {
                dataService.clearAllSales();
            } else {
                dataService.deleteSale(deleteId);
            }
        } else if (tab === 'LOGS') {
            if (deleteId === 'ALL') {
                dataService.clearLogs();
            } else {
                dataService.deleteLog(deleteId);
            }
            setLogs(dataService.getLogs());
        }
        onUpdate();
        setDeleteId(null);
        setModalOpen(false);
    } else {
        // Generic close
        setModalOpen(false);
    }
  };

  const exportToExcel = () => {
    let tableHTML = '';
    const filename = tab === 'LOGS' ? 'Historial_Acciones' : (tab === 'PENDING' ? 'Reporte_Pendientes' : 'Historial_Ventas');

    const tableStyle = `<style>
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #EAB308; color: white; border: 1px solid #000; padding: 5px; text-align: center; }
        td { border: 1px solid #000; padding: 5px; text-align: left; }
    </style>`;

    if (tab === 'PENDING') {
        tableHTML = `
            ${tableStyle}
            <table>
                <thead>
                    <tr>
                        <th>FECHA</th>
                        <th>TURNO</th>
                        <th>METODO PAGO</th>
                        <th>CLIENTE</th>
                        <th>CANTIDAD</th>
                        <th>PRODUCTOS</th>
                        <th>TOTAL</th>
                        <th>ESTADO</th>
                    </tr>
                </thead>
                <tbody>
                    ${pendingSales.map(s => `
                        <tr>
                            <td>${new Date(s.timestamp).toLocaleString()}</td>
                            <td>${getUserName(s.userId)}</td>
                            <td>${s.paymentMethod}</td>
                            <td>${s.customerName || '-'}</td>
                            <td>${s.items.reduce((acc,i) => acc + i.quantity, 0)}</td>
                            <td>${s.items.map(i => i.productName).join('; ')}</td>
                            <td>${s.totalAmount.toFixed(2)}</td>
                            <td>Pendiente</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else if (tab === 'HISTORY') {
        tableHTML = `
            ${tableStyle}
            <table>
                <thead>
                    <tr>
                        <th>FECHA</th>
                        <th>TURNO</th>
                        <th>CLASE</th>
                        <th>CANTIDAD</th>
                        <th>CATEGORIA</th>
                        <th>PRODUCTOS</th>
                        <th>METODO PAGO</th>
                        <th>TOTAL</th>
                        <th>ESTADO</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredHistory.map(s => {
                        const categories = Array.from(new Set(s.items.map(i => {
                             const p = allProducts.find(prod => prod.id === i.productId);
                             return p ? p.category : (s.isFreePass ? 'INGRESO LIBRE' : 'Otros');
                        }))).join(', ');
                        
                        return `
                        <tr>
                            <td>${new Date(s.timestamp).toLocaleString()}</td>
                            <td>${getUserName(s.userId)}</td>
                            <td>${s.isFreePass ? 'LIBRE' : 'PRODUCTOS'}</td>
                            <td>${s.items.reduce((acc,i) => acc + i.quantity, 0)}</td>
                            <td>${categories}</td>
                            <td>${s.items.map(i => i.productName).join('; ')}</td>
                            <td>${s.paymentMethod}</td>
                            <td>${s.totalAmount.toFixed(2)}</td>
                            <td>${s.isPaid ? 'Pagado' : 'Pendiente'}</td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        `;
    } else {
        // Logs
         tableHTML = `
            ${tableStyle}
            <table>
                <thead>
                    <tr>
                        <th>FECHA</th>
                        <th>TURNO</th>
                        <th>MODULO</th>
                        <th>ACCION</th>
                        <th>DETALLE</th>
                    </tr>
                </thead>
                <tbody>
                    ${logs.map(l => `
                        <tr>
                            <td>${new Date(l.timestamp).toLocaleString()}</td>
                            <td>${l.userName}</td>
                            <td>${l.module}</td>
                            <td>${l.action}</td>
                            <td>${l.detail}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    const dataType = 'application/vnd.ms-excel';
    const tableBlob = new Blob([tableHTML], { type: dataType });
    
    if (window.navigator && (window.navigator as any).msSaveOrOpenBlob) {
         (window.navigator as any).msSaveOrOpenBlob(tableBlob, filename);
    } else {
         const downloadLink = document.createElement("a");
         downloadLink.href = 'data:' + dataType + ', ' + encodeURIComponent(tableHTML);
         downloadLink.download = filename + ".xls";
         document.body.appendChild(downloadLink);
         downloadLink.click();
         document.body.removeChild(downloadLink);
    }
  };

  if (!currentShift && !isAdmin) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-10">
            <div className="bg-yellow-100 dark:bg-yellow-900/20 p-6 rounded-full mb-4">
                <AlertTriangle className="w-12 h-12 text-yellow-600 dark:text-yellow-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Turno Cerrado</h2>
            <p className="text-gray-500 dark:text-gray-400">Por favor, inicie un turno para gestionar reportes y cobranzas.</p>
        </div>
    );
  }

  return (
    <>
    <Modal 
        isOpen={modalOpen} 
        onClose={() => { setModalOpen(false); setPendingSaleId(null); setDeleteId(null); }} 
        onConfirm={handleModalConfirm} 
        title={modalConfig.title} 
        message={modalConfig.message}
        type={modalConfig.type} 
    >
        {/* Render Payment Selector only if we are in the Pending Pay flow */}
        {pendingSaleId && modalConfig.type === 'confirm' && (
            <div className="mt-4 text-left bg-neutral-900 p-4 rounded-xl border border-neutral-700">
                <label className="block text-xs font-medium text-gold-500 mb-2 uppercase">Método de Pago</label>
                <select 
                    value={selectedPaymentMethod}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-neutral-800 text-white p-2 rounded-lg border border-neutral-600 focus:border-gold-500 focus:outline-none"
                >
                    <option value={PaymentMethod.CASH}>Efectivo</option>
                    <option value={PaymentMethod.APP}>Aplicativo (Yape/Plin)</option>
                    <option value={PaymentMethod.TRANSFER}>Transferencia</option>
                </select>
                <p className="text-xs text-gray-400 mt-2 italic">
                    Nota: El ingreso se registrará a nombre de {currentUser.name} en el turno actual.
                </p>
            </div>
        )}
    </Modal>

    <div className="h-full flex flex-col space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm gap-4">
        <div className="flex gap-2">
             <button 
                onClick={() => setTab('PENDING')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'PENDING' ? 'bg-red-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-gray-700 dark:text-gray-300'}`}
            >
                Pendientes ({pendingSales.length})
            </button>
            <button 
                onClick={() => setTab('HISTORY')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'HISTORY' ? 'bg-gold-500 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-gray-700 dark:text-gray-300'}`}
            >
                Historial de Ventas
            </button>
            {isAdmin && (
                <button 
                    onClick={() => setTab('LOGS')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${tab === 'LOGS' ? 'bg-blue-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-gray-700 dark:text-gray-300'}`}
                >
                    <History className="w-4 h-4" /> Historial Acciones
                </button>
            )}
        </div>
        
        <div className="flex gap-2 w-full md:w-auto flex-wrap">
            {tab === 'HISTORY' && (
                <>
                <div className="relative">
                     <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
                         <Filter size={14} />
                     </div>
                     <select
                        value={shiftFilter}
                        onChange={(e) => setShiftFilter(e.target.value)}
                        className="pl-8 pr-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-sm focus:outline-none w-full md:w-48"
                     >
                         <option value="ALL">Todos los Turnos</option>
                         {shiftOptions.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                     </select>
                </div>
                <div className="relative">
                     <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
                         <Filter size={14} />
                     </div>
                     <select
                        value={classFilter}
                        onChange={(e) => setClassFilter(e.target.value)}
                        className="pl-8 pr-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-sm focus:outline-none w-full md:w-40"
                     >
                         <option value="ALL">Todas las Clases</option>
                         <option value="PRODUCTOS">Productos</option>
                         <option value="LIBRE">Libre</option>
                     </select>
                </div>
                </>
            )}
             
             {isAdmin && (tab === 'HISTORY' || tab === 'LOGS') && (
                 <button
                    onClick={initiateDeleteAll}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                 >
                     <Trash2 className="w-4 h-4" /> Borrar Todo
                 </button>
             )}

             <button 
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
                <FileDown className="w-4 h-4" /> Excel
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
             <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                    <thead className="bg-neutral-50 dark:bg-neutral-900 text-xs uppercase text-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-3 text-center">Fecha</th>
                            <th className="px-6 py-3 text-center">Turno</th>
                            {tab === 'LOGS' ? (
                                <>
                                    <th className="px-6 py-3 text-center">Módulo</th>
                                    <th className="px-6 py-3 text-center">Acción</th>
                                    <th className="px-6 py-3">Detalle</th>
                                    <th className="px-6 py-3 text-center">Acción</th>
                                </>
                            ) : (
                                <>
                                    {tab === 'HISTORY' && <th className="px-6 py-3 text-center bg-blue-50 dark:bg-blue-900/10">Clase</th>}
                                    {tab === 'PENDING' ? (
                                        <>
                                            <th className="px-6 py-3 text-center">Método Pago</th>
                                            <th className="px-6 py-3 text-center">Cliente</th>
                                        </>
                                    ) : null}
                                    <th className="px-6 py-3 text-center">Cant</th>
                                    {tab === 'HISTORY' && <th className="px-6 py-3 text-center">Categoría</th>}
                                    <th className="px-6 py-3 text-center">Productos</th>
                                    {tab === 'HISTORY' && <th className="px-6 py-3 text-center">Método Pago</th>}
                                    <th className="px-6 py-3 text-center">Total</th>
                                    <th className="px-6 py-3 text-center">Estado</th>
                                    <th className="px-6 py-3 text-center">Acción</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                        {tab === 'LOGS' ? (
                            logs.sort((a,b) => b.timestamp - a.timestamp).map(l => (
                                <tr key={l.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                                    <td className="px-6 py-4 text-center">{new Date(l.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center">{l.userName}</td>
                                    <td className="px-6 py-4 text-center text-xs uppercase font-bold text-gray-700 dark:text-gray-300">{l.module}</td>
                                    <td className="px-6 py-4 text-center text-xs uppercase font-bold text-blue-600 dark:text-blue-400">{l.action}</td>
                                    <td className="px-6 py-4">{l.detail}</td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => initiateDelete(l.id)}
                                            className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            (tab === 'PENDING' ? pendingSales : filteredHistory).sort((a,b) => b.timestamp - a.timestamp).map(s => (
                                <tr key={s.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                                    <td className="px-6 py-4 text-center">{new Date(s.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center text-xs font-medium text-gray-700 dark:text-gray-300">{getUserName(s.userId)}</td>
                                    {tab === 'HISTORY' && (
                                        <td className="px-6 py-4 text-center text-xs font-bold bg-blue-50/50 dark:bg-blue-900/10">
                                            <span className={`px-2 py-1 rounded border ${s.isFreePass ? 'border-purple-200 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300' : 'border-blue-200 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300'}`}>
                                                {s.isFreePass ? 'LIBRE' : 'PRODUCTOS'}
                                            </span>
                                        </td>
                                    )}
                                    {tab === 'PENDING' ? (
                                        <>
                                            <td className="px-6 py-4 font-bold text-xs uppercase text-center">{s.paymentMethod}</td>
                                            <td className="px-6 py-4 font-bold text-gray-900 dark:text-white text-center">{s.customerName}</td>
                                        </>
                                    ) : null}
                                    <td className="px-6 py-4 font-mono text-xs text-center">{s.items.reduce((acc, i) => acc + i.quantity, 0)}</td>
                                    {tab === 'HISTORY' && (
                                        <td className="px-6 py-4 text-xs uppercase text-center">
                                            {Array.from(new Set(s.items.map(i => {
                                                const p = allProducts.find(prod => prod.id === i.productId);
                                                return p ? p.category : (s.isFreePass ? 'INGRESO LIBRE' : 'OTROS');
                                            }))).join(', ')}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 truncate max-w-xs">{s.items.map(i => i.productName).join(', ')}</td>
                                    {tab === 'HISTORY' && <td className="px-6 py-4 font-bold text-xs uppercase text-center">{s.paymentMethod}</td>}
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white text-center">S/ {s.totalAmount.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${s.isPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {s.isPaid ? 'Pagado' : 'Pendiente'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {tab === 'PENDING' ? (
                                            <button 
                                                onClick={() => initiatePayPending(s.id)}
                                                className="text-green-600 hover:text-green-800 font-medium text-xs flex items-center justify-center gap-1 w-full"
                                            >
                                                <CheckSquare className="w-4 h-4" /> Marcar Pagado
                                            </button>
                                        ) : (
                                            // Allowed for everyone in History tab
                                            <button 
                                                onClick={() => initiateDelete(s.id)}
                                                className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mx-auto"
                                                title="Eliminar Registro"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                         {(tab === 'LOGS' ? logs : (tab === 'PENDING' ? pendingSales : filteredHistory)).length === 0 && (
                             <tr>
                                 <td colSpan={12} className="px-6 py-8 text-center text-gray-400">No hay registros para mostrar.</td>
                             </tr>
                         )}
                    </tbody>
            </table>
        </div>
      </div>
    </div>
    </>
  );
};

export default Reports;