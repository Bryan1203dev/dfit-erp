import React, { useState } from 'react';
import { MembershipRecord, User, PaymentMethod, Shift, Role, AbonoRecord } from '../types';
import { dataService } from '../services/dataService';
import { CreditCard, Plus, FileDown, Search, X, Edit2, Trash2, AlertTriangle, Filter, Coins } from 'lucide-react';
import Modal from './Modal';

interface MembershipsProps {
  currentUser: User;
  currentShift: Shift | undefined;
  onUpdate: () => void;
}

const Memberships: React.FC<MembershipsProps> = ({ currentUser, currentShift, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'NEW_MEMBERSHIP' | 'NEW_ABONO'>('NEW_MEMBERSHIP');
  const [memberships, setMemberships] = useState<MembershipRecord[]>(dataService.getMemberships());
  const [abonos, setAbonos] = useState<AbonoRecord[]>(dataService.getAbonos());
  
  const [filter, setFilter] = useState('');
  const [filterShift, setFilterShift] = useState('ALL');
  
  // Membership Form State
  const [isMemFormOpen, setIsMemFormOpen] = useState(false);
  const [memFormData, setMemFormData] = useState<Partial<MembershipRecord>>({
      shiftName: currentUser.name,
      paymentMethod: PaymentMethod.CASH
  });

  // Abono Form State
  const [isAbonoFormOpen, setIsAbonoFormOpen] = useState(false);
  const [abonoFormData, setAbonoFormData] = useState<Partial<AbonoRecord>>({
      shiftName: currentUser.name,
      paymentMethod: PaymentMethod.CASH,
      detail: ''
  });

  // Delete Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | 'ALL' | null>(null);
  const [deleteType, setDeleteType] = useState<'MEMBERSHIP' | 'ABONO'>('MEMBERSHIP');

  const isAdmin = currentUser.role === Role.ADMIN;
  
  // Refresh Data
  const refreshData = () => {
      setMemberships(dataService.getMemberships());
      setAbonos(dataService.getAbonos());
      onUpdate();
  };

  // --- Filtering ---
  const uniqueShifts = Array.from(new Set([...memberships, ...abonos].map(m => m.shiftName)));

  const filteredMemberships = memberships.filter(m => {
    const term = filter.toLowerCase();
    const matchesSearch = m.clientName.toLowerCase().includes(term) || 
                          m.code.toLowerCase().includes(term) ||
                          m.membershipType.toLowerCase().includes(term);
    const matchesShift = filterShift === 'ALL' || m.shiftName === filterShift;
    return matchesSearch && matchesShift;
  });

  const filteredAbonos = abonos.filter(a => {
      const term = filter.toLowerCase();
      const matchesSearch = a.clientName.toLowerCase().includes(term) || a.code.toLowerCase().includes(term);
      const matchesShift = filterShift === 'ALL' || a.shiftName === filterShift;
      return matchesSearch && matchesShift;
  });

  const totalAbono = activeTab === 'NEW_MEMBERSHIP' 
    ? filteredMemberships.reduce((acc, m) => acc + m.abono, 0)
    : filteredAbonos.reduce((acc, a) => acc + a.amount, 0);

  // --- Actions ---

  const initiateDelete = (id: string, type: 'MEMBERSHIP' | 'ABONO') => {
      setDeleteId(id);
      setDeleteType(type);
      setModalOpen(true);
  };
  
  const initiateDeleteAll = (type: 'MEMBERSHIP' | 'ABONO') => {
      setDeleteId('ALL');
      setDeleteType(type);
      setModalOpen(true);
  };

  const confirmDelete = () => {
      if (deleteId) {
          if (deleteType === 'MEMBERSHIP') {
             if (deleteId === 'ALL') dataService.clearMemberships(currentUser.id);
             else dataService.deleteMembership(deleteId, currentUser.id);
          } else {
             if (deleteId === 'ALL') {
                 // Implement Clear Abonos if needed, or iterate
                 // dataService currently only has deleteAbono single. Let's loop for now or add clear method.
                 // Ideally add clearAbonos to dataService, but looping is okay for small scale localstorage
                 const allAbonos = dataService.getAbonos();
                 allAbonos.forEach(a => dataService.deleteAbono(a.id));
             }
             else dataService.deleteAbono(deleteId, currentUser.id);
          }
          refreshData();
          setModalOpen(false);
          setDeleteId(null);
      }
  };

  // --- Save Membership ---
  const handleSaveMembership = (e: React.FormEvent) => {
      e.preventDefault();
      if (!memFormData.code || !memFormData.clientName || !memFormData.membershipType || !memFormData.price || !memFormData.abono) {
          alert('Por favor complete todos los campos requeridos');
          return;
      }
      if (!currentShift && !memFormData.id && !isAdmin) {
          alert("Error: No hay turno activo.");
          return;
      }

      const newRecord: MembershipRecord = {
          id: memFormData.id || Date.now().toString(),
          timestamp: memFormData.timestamp || Date.now(),
          shiftId: memFormData.shiftId || (currentShift ? currentShift.id : 'ADMIN_DIRECT'), 
          userId: memFormData.userId || currentUser.id,
          shiftName: memFormData.shiftName || currentUser.name,
          code: memFormData.code || '',
          clientName: memFormData.clientName || '',
          membershipType: memFormData.membershipType || '',
          price: Number(memFormData.price),
          abono: Number(memFormData.abono),
          paymentMethod: memFormData.paymentMethod || PaymentMethod.CASH
      };

      dataService.saveMembership(newRecord, currentUser.id);
      refreshData();
      setIsMemFormOpen(false);
      setMemFormData({ shiftName: currentUser.name, paymentMethod: PaymentMethod.CASH });
  };

  // --- Save Abono ---
  const handleSaveAbono = (e: React.FormEvent) => {
      e.preventDefault();
      if (!abonoFormData.code || !abonoFormData.clientName || !abonoFormData.amount) {
          alert('Por favor complete todos los campos requeridos');
          return;
      }
       if (!currentShift && !abonoFormData.id && !isAdmin) {
          alert("Error: No hay turno activo.");
          return;
      }

      const newAbono: AbonoRecord = {
          id: abonoFormData.id || Date.now().toString(),
          timestamp: abonoFormData.timestamp || Date.now(),
          shiftId: abonoFormData.shiftId || (currentShift ? currentShift.id : 'ADMIN_DIRECT'),
          userId: abonoFormData.userId || currentUser.id,
          shiftName: abonoFormData.shiftName || currentUser.name,
          code: abonoFormData.code || '',
          clientName: abonoFormData.clientName || '',
          amount: Number(abonoFormData.amount),
          paymentMethod: abonoFormData.paymentMethod || PaymentMethod.CASH,
          detail: abonoFormData.detail || ''
      };

      dataService.saveAbono(newAbono, currentUser.id);
      refreshData();
      setIsAbonoFormOpen(false);
      setAbonoFormData({ shiftName: currentUser.name, paymentMethod: PaymentMethod.CASH, detail: '' });
  };

  const exportToExcel = () => {
    let tableHTML = '';
    const isMem = activeTab === 'NEW_MEMBERSHIP';
    const filename = isMem ? 'Reporte_Membresias' : 'Reporte_Abonos';

    const tableStyle = `<style>
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #EAB308; color: white; border: 1px solid #000; padding: 5px; text-align: center; }
        td { border: 1px solid #000; padding: 5px; text-align: left; }
    </style>`;

    if (isMem) {
        tableHTML = `
            ${tableStyle}
            <table>
                <thead>
                    <tr>
                        <th>FECHA</th>
                        <th>TURNO</th>
                        <th>CODIGO</th>
                        <th>CLIENTE</th>
                        <th>TIPO MEMBRESIA</th>
                        <th>PRECIO</th>
                        <th>ABONO</th>
                        <th>METODO PAGO</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredMemberships.map(m => `
                        <tr>
                            <td>${new Date(m.timestamp).toLocaleString()}</td>
                            <td>${m.shiftName}</td>
                            <td>${m.code}</td>
                            <td>${m.clientName}</td>
                            <td>${m.membershipType}</td>
                            <td>${m.price.toFixed(2)}</td>
                            <td>${m.abono.toFixed(2)}</td>
                            <td>${m.paymentMethod}</td>
                        </tr>
                    `).join('')}
                    <tr>
                        <td colspan="6" style="text-align: right; font-weight: bold;">TOTAL ABONO:</td>
                        <td style="font-weight: bold;">${totalAbono.toFixed(2)}</td>
                        <td></td>
                    </tr>
                </tbody>
            </table>
        `;
    } else {
         tableHTML = `
            ${tableStyle}
            <table>
                <thead>
                    <tr>
                        <th>FECHA</th>
                        <th>TURNO</th>
                        <th>CODIGO</th>
                        <th>CLIENTE</th>
                        <th>DETALLE</th>
                        <th>METODO PAGO</th>
                        <th>ABONO</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredAbonos.map(a => `
                        <tr>
                            <td>${new Date(a.timestamp).toLocaleString()}</td>
                            <td>${a.shiftName}</td>
                            <td>${a.code}</td>
                            <td>${a.clientName}</td>
                            <td>${a.detail}</td>
                            <td>${a.paymentMethod}</td>
                            <td>${a.amount.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                    <tr>
                        <td colspan="6" style="text-align: right; font-weight: bold;">TOTAL ABONOS:</td>
                        <td style="font-weight: bold;">${totalAbono.toFixed(2)}</td>
                    </tr>
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
            <p className="text-gray-500 dark:text-gray-400">Por favor, inicie un turno para registrar nuevas membresías.</p>
        </div>
    );
  }

  return (
    <>
    <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onConfirm={confirmDelete} 
        title={deleteId === 'ALL' ? 'Eliminar Historial' : 'Eliminar Registro'} 
        message={deleteId === 'ALL' ? '¿Está seguro de borrar TODO el historial visible?' : '¿Está seguro que desea eliminar este registro?'}
        type={deleteId === 'ALL' ? 'alert' : 'confirm'}
    />

    <div className="h-full flex flex-col space-y-4">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm gap-4">
        <div className="flex items-center gap-4">
             <button 
                onClick={() => setActiveTab('NEW_MEMBERSHIP')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'NEW_MEMBERSHIP' ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/20' : 'bg-neutral-100 dark:bg-neutral-700 text-gray-500'}`}
             >
                 <CreditCard className="w-4 h-4" /> Nuevas Membresías
             </button>
             <button 
                onClick={() => setActiveTab('NEW_ABONO')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'NEW_ABONO' ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/20' : 'bg-neutral-100 dark:bg-neutral-700 text-gray-500'}`}
             >
                 <Coins className="w-4 h-4" /> Nuevos Abonos
             </button>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto flex-wrap md:flex-nowrap justify-end">
             {isAdmin && (
                 <>
                 <div className="relative">
                     <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">
                         <Filter size={14} />
                     </div>
                     <select
                        value={filterShift}
                        onChange={(e) => setFilterShift(e.target.value)}
                        className="pl-8 pr-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-sm focus:outline-none w-full md:w-40"
                     >
                         <option value="ALL">Todos los Turnos</option>
                         {uniqueShifts.map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                 </div>
                 <button
                    onClick={() => initiateDeleteAll(activeTab === 'NEW_MEMBERSHIP' ? 'MEMBERSHIP' : 'ABONO')}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                 >
                     <Trash2 className="w-4 h-4" /> Borrar Todo
                 </button>
                 </>
             )}

             <div className="relative flex-1 md:w-64">
                <input 
                    className="w-full pl-8 pr-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-sm focus:outline-none"
                    placeholder="Buscar cliente, código..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
             <button 
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
                <FileDown className="w-4 h-4" /> Excel
            </button>
            <button 
                onClick={() => { 
                    if (activeTab === 'NEW_MEMBERSHIP') {
                        setMemFormData({ shiftName: currentUser.name, paymentMethod: PaymentMethod.CASH }); 
                        setIsMemFormOpen(true); 
                    } else {
                        setAbonoFormData({ shiftName: currentUser.name, paymentMethod: PaymentMethod.CASH, detail: '' });
                        setIsAbonoFormOpen(true);
                    }
                }}
                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
                <Plus className="w-4 h-4" /> {activeTab === 'NEW_MEMBERSHIP' ? 'Nueva Membresía' : 'Nuevo Abono'}
            </button>
        </div>
      </div>

      {/* --- Membership Form Modal --- */}
      {isMemFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-neutral-800 w-full max-w-lg rounded-2xl shadow-2xl border border-gold-500 p-0 overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-gradient-to-r from-neutral-800 to-neutral-900 p-4 border-b border-neutral-700 flex justify-between items-center">
                    <h3 className="text-gold-500 font-bold uppercase tracking-widest text-sm">{memFormData.id ? 'Editar Membresía' : 'Nueva Membresía'}</h3>
                    <button onClick={() => setIsMemFormOpen(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
                </div>
                
                <form onSubmit={handleSaveMembership} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Turno</label>
                            <input
                                disabled
                                className="w-full p-2 rounded border border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-900 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                value={memFormData.shiftName || currentUser.name}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Código</label>
                            <input required className="w-full p-2 rounded border dark:bg-neutral-900 dark:border-neutral-600 dark:text-white"
                                value={memFormData.code || ''} onChange={e => setMemFormData({...memFormData, code: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Cliente</label>
                            <input required className="w-full p-2 rounded border dark:bg-neutral-900 dark:border-neutral-600 dark:text-white"
                                value={memFormData.clientName || ''} onChange={e => setMemFormData({...memFormData, clientName: e.target.value})} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Tipo de Membresía</label>
                            <input required className="w-full p-2 rounded border dark:bg-neutral-900 dark:border-neutral-600 dark:text-white"
                                placeholder="Ej. Mensual, Anual..."
                                value={memFormData.membershipType || ''} onChange={e => setMemFormData({...memFormData, membershipType: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Precio (S/)</label>
                            <input type="number" required className="w-full p-2 rounded border dark:bg-neutral-900 dark:border-neutral-600 dark:text-white"
                                value={memFormData.price || ''} onChange={e => setMemFormData({...memFormData, price: parseFloat(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Abono (S/)</label>
                            <input type="number" required className="w-full p-2 rounded border dark:bg-neutral-900 dark:border-neutral-600 dark:text-white font-bold text-gold-600"
                                value={memFormData.abono || ''} onChange={e => setMemFormData({...memFormData, abono: parseFloat(e.target.value)})} />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Método de Pago</label>
                            <select 
                                className="w-full p-2 rounded border dark:bg-neutral-900 dark:border-neutral-600 dark:text-white"
                                value={memFormData.paymentMethod}
                                onChange={(e) => setMemFormData({...memFormData, paymentMethod: e.target.value as PaymentMethod})}
                            >
                                <option value={PaymentMethod.CASH}>Efectivo</option>
                                <option value={PaymentMethod.APP}>Aplicativo</option>
                                <option value={PaymentMethod.TRANSFER}>Transferencia</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                        <button type="button" onClick={() => setIsMemFormOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg">Cancelar</button>
                        <button type="submit" className="px-6 py-2 bg-gold-500 hover:bg-gold-600 text-white rounded-lg font-bold shadow-lg shadow-gold-500/20">Aceptar</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* --- Abono Form Modal --- */}
      {isAbonoFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-neutral-800 w-full max-w-lg rounded-2xl shadow-2xl border border-gold-500 p-0 overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-gradient-to-r from-neutral-800 to-neutral-900 p-4 border-b border-neutral-700 flex justify-between items-center">
                    <h3 className="text-gold-500 font-bold uppercase tracking-widest text-sm">{abonoFormData.id ? 'Editar Abono' : 'Nuevo Abono'}</h3>
                    <button onClick={() => setIsAbonoFormOpen(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
                </div>
                
                <form onSubmit={handleSaveAbono} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                         <div className="col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Turno</label>
                            <input disabled className="w-full p-2 rounded border border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-900 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                value={abonoFormData.shiftName || currentUser.name} />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Código</label>
                            <input required className="w-full p-2 rounded border dark:bg-neutral-900 dark:border-neutral-600 dark:text-white"
                                value={abonoFormData.code || ''} onChange={e => setAbonoFormData({...abonoFormData, code: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Cliente</label>
                            <input required className="w-full p-2 rounded border dark:bg-neutral-900 dark:border-neutral-600 dark:text-white"
                                value={abonoFormData.clientName || ''} onChange={e => setAbonoFormData({...abonoFormData, clientName: e.target.value})} />
                        </div>
                         <div>
                            <label className="block text-xs text-gray-500 mb-1">Abono (S/)</label>
                            <input type="number" required className="w-full p-2 rounded border dark:bg-neutral-900 dark:border-neutral-600 dark:text-white font-bold text-gold-600"
                                value={abonoFormData.amount || ''} onChange={e => setAbonoFormData({...abonoFormData, amount: parseFloat(e.target.value)})} />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Método de Pago</label>
                            <select className="w-full p-2 rounded border dark:bg-neutral-900 dark:border-neutral-600 dark:text-white"
                                value={abonoFormData.paymentMethod}
                                onChange={(e) => setAbonoFormData({...abonoFormData, paymentMethod: e.target.value as PaymentMethod})}
                            >
                                <option value={PaymentMethod.CASH}>Efectivo</option>
                                <option value={PaymentMethod.APP}>Aplicativo</option>
                                <option value={PaymentMethod.TRANSFER}>Transferencia</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Detalle</label>
                            <textarea className="w-full p-2 rounded border dark:bg-neutral-900 dark:border-neutral-600 dark:text-white"
                                placeholder="Ingrese detalles del nuevo abono"
                                rows={2}
                                value={abonoFormData.detail || ''} onChange={e => setAbonoFormData({...abonoFormData, detail: e.target.value})} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                        <button type="button" onClick={() => setIsAbonoFormOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg">Cancelar</button>
                        <button type="submit" className="px-6 py-2 bg-gold-500 hover:bg-gold-600 text-white rounded-lg font-bold shadow-lg shadow-gold-500/20">Aceptar</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Tables Area */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden flex-1 flex flex-col">
        {activeTab === 'NEW_MEMBERSHIP' ? (
            // MEMBERSHIP TABLE
             <div className="overflow-auto flex-1">
                <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                        <thead className="bg-neutral-50 dark:bg-neutral-900 text-xs uppercase text-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3">FECHA</th>
                                <th className="px-6 py-3">Turno</th>
                                <th className="px-6 py-3">Código</th>
                                <th className="px-6 py-3">Cliente</th>
                                <th className="px-6 py-3">Membresía</th>
                                <th className="px-6 py-3">Precio</th>
                                <th className="px-6 py-3">Abono</th>
                                <th className="px-6 py-3">Pago</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                            {filteredMemberships.sort((a,b) => b.timestamp - a.timestamp).map(m => (
                                <tr key={m.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                                    <td className="px-6 py-4">{new Date(m.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-xs">{m.shiftName}</td>
                                    <td className="px-6 py-4 font-mono text-xs">{m.code}</td>
                                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{m.clientName}</td>
                                    <td className="px-6 py-4">{m.membershipType}</td>
                                    <td className="px-6 py-4">S/ {m.price.toFixed(2)}</td>
                                    <td className="px-6 py-4 font-bold text-green-600">S/ {m.abono.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-xs uppercase">{m.paymentMethod}</td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button 
                                            onClick={() => { setMemFormData(m); setIsMemFormOpen(true); }}
                                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => initiateDelete(m.id, 'MEMBERSHIP')}
                                            className="text-red-600 hover:text-red-800 dark:text-red-400"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredMemberships.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-6 py-8 text-center text-gray-400">No hay membresías registradas.</td>
                                </tr>
                            )}
                        </tbody>
                </table>
            </div>
        ) : (
            // ABONO TABLE
             <div className="overflow-auto flex-1">
                <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                        <thead className="bg-neutral-50 dark:bg-neutral-900 text-xs uppercase text-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="px-6 py-3">FECHA</th>
                                <th className="px-6 py-3">Turno</th>
                                <th className="px-6 py-3">Código</th>
                                <th className="px-6 py-3">Cliente</th>
                                <th className="px-6 py-3">Detalle</th>
                                <th className="px-6 py-3">Pago</th>
                                <th className="px-6 py-3">Abono</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                            {filteredAbonos.sort((a,b) => b.timestamp - a.timestamp).map(ab => (
                                <tr key={ab.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                                    <td className="px-6 py-4">{new Date(ab.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-xs">{ab.shiftName}</td>
                                    <td className="px-6 py-4 font-mono text-xs">{ab.code}</td>
                                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{ab.clientName}</td>
                                    <td className="px-6 py-4">{ab.detail}</td>
                                    <td className="px-6 py-4 text-xs uppercase">{ab.paymentMethod}</td>
                                    <td className="px-6 py-4 font-bold text-green-600">S/ {ab.amount.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button 
                                            onClick={() => { setAbonoFormData(ab); setIsAbonoFormOpen(true); }}
                                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => initiateDelete(ab.id, 'ABONO')}
                                            className="text-red-600 hover:text-red-800 dark:text-red-400"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredAbonos.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-gray-400">No hay abonos registrados.</td>
                                </tr>
                            )}
                        </tbody>
                </table>
            </div>
        )}
        
        {/* Footer Sum */}
        <div className="bg-neutral-50 dark:bg-neutral-900 p-4 border-t border-neutral-200 dark:border-neutral-700 flex justify-end items-center gap-4">
            <span className="uppercase text-xs font-bold text-gray-500">{activeTab === 'NEW_MEMBERSHIP' ? 'Total Membresías' : 'Total Abonos'}</span>
            <span className="text-2xl font-bold text-gold-600 dark:text-gold-500">S/ {totalAbono.toFixed(2)}</span>
        </div>
      </div>
    </div>
    </>
  );
};

export default Memberships;