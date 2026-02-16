import React, { useState } from 'react';
import { Expense, User, Shift, Role, PaymentMethod } from '../types';
import { dataService } from '../services/dataService';
import { TrendingDown, Plus, X, AlertTriangle, FileDown, Edit2, Trash2 } from 'lucide-react';
import Modal from './Modal';

interface ExpensesProps {
  currentUser: User;
  currentShift: Shift | undefined;
}

const Expenses: React.FC<ExpensesProps> = ({ currentUser, currentShift }) => {
  const [expenses, setExpenses] = useState<Expense[]>(dataService.getExpenses());
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Expense>>({
      description: '',
      amount: 0,
      paymentMethod: PaymentMethod.CASH
  });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | 'ALL' | null>(null);

  const isAdmin = currentUser.role === Role.ADMIN;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description) return;
    
    const numAmount = Number(formData.amount);
    // Removed strict > 0 check to allow for informational 0 amount records

    const newExpense: Expense = {
        id: formData.id || Date.now().toString(),
        timestamp: formData.timestamp || Date.now(),
        shiftId: formData.shiftId || (currentShift ? currentShift.id : 'ADMIN_DIRECT'),
        userId: formData.userId || currentUser.id,
        userName: formData.userName || currentUser.name,
        description: formData.description || '',
        amount: numAmount,
        paymentMethod: formData.paymentMethod || PaymentMethod.CASH
    };

    dataService.saveExpense(newExpense);
    setExpenses(dataService.getExpenses());
    
    // Reset
    setFormData({ description: '', amount: 0, paymentMethod: PaymentMethod.CASH });
    setIsFormOpen(false);
  };

  const handleEdit = (record: Expense) => {
      setFormData(record);
      setIsFormOpen(true);
  };

  const initiateDelete = (id: string) => {
      setDeleteId(id);
      setModalOpen(true);
  };

  const initiateDeleteAll = () => {
      setDeleteId('ALL');
      setModalOpen(true);
  };

  const confirmDelete = () => {
      if (deleteId) {
          if (deleteId === 'ALL') {
              dataService.clearExpenses(currentUser.id);
          } else {
              dataService.deleteExpense(deleteId, currentUser.id);
          }
          setExpenses(dataService.getExpenses());
          setModalOpen(false);
          setDeleteId(null);
      }
  };

  const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

  const exportToExcel = () => {
    const filename = `Reporte_Egresos_${new Date().toLocaleDateString().replace(/\//g, '-')}`;
    const tableStyle = `<style>
        table { border-collapse: collapse; width: 100%; }
        th { background-color: #EF4444; color: white; border: 1px solid #000; padding: 5px; text-align: center; }
        td { border: 1px solid #000; padding: 5px; text-align: left; }
    </style>`;

    const tableHTML = `
        ${tableStyle}
        <table>
            <thead>
                <tr>
                    <th>FECHA</th>
                    <th>TURNO / USUARIO</th>
                    <th>DETALLE</th>
                    <th>METODO</th>
                    <th>MONTO</th>
                </tr>
            </thead>
            <tbody>
                ${expenses.map(exp => `
                    <tr>
                        <td>${new Date(exp.timestamp).toLocaleString()}</td>
                        <td>${exp.userName}</td>
                        <td>${exp.description}</td>
                        <td>${exp.paymentMethod || PaymentMethod.CASH}</td>
                        <td>${exp.amount.toFixed(2)}</td>
                    </tr>
                `).join('')}
                <tr>
                    <td colspan="4" style="text-align: right; font-weight: bold;">TOTAL EGRESOS:</td>
                    <td style="font-weight: bold;">${totalExpenses.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>
    `;

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
            <p className="text-gray-500 dark:text-gray-400">Por favor, inicie un turno para registrar egresos de caja.</p>
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
        message={deleteId === 'ALL' ? '¿Está seguro de borrar TODO el historial de egresos?' : '¿Está seguro que desea eliminar este registro?'}
        type={deleteId === 'ALL' ? 'alert' : 'confirm'}
    />

    <div className="h-full flex flex-col space-y-4 animate-in fade-in zoom-in duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-white dark:bg-neutral-800 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <TrendingDown className="text-red-500" /> 
            Gestión de Egresos
        </h2>
        <div className="flex gap-2">
            {isAdmin && (
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
            <button 
                onClick={() => { setFormData({ description: '', amount: 0, paymentMethod: PaymentMethod.CASH }); setIsFormOpen(true); }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg shadow-red-500/20"
            >
                <Plus className="w-4 h-4" /> Nuevo Egreso
            </button>
        </div>
      </div>

      {/* Form Modal (Overlay) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-neutral-800 w-full max-w-md rounded-2xl shadow-2xl border border-red-500/50 p-0 overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="bg-gradient-to-r from-neutral-800 to-neutral-900 p-4 border-b border-neutral-700 flex justify-between items-center">
                    <h3 className="text-red-500 font-bold uppercase tracking-widest text-sm">{formData.id ? 'Editar Egreso' : 'Registrar Egreso'}</h3>
                    <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-white"><X size={20}/></button>
                </div>
                
                <form onSubmit={handleSave} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Turno / Usuario</label>
                        <input 
                            disabled 
                            className="w-full p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 text-gray-500 dark:text-gray-400 cursor-not-allowed font-medium"
                            value={formData.userName || currentUser.name} 
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Detalle</label>
                        <textarea 
                            required 
                            className="w-full p-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                            placeholder="Ingrese motivo del egreso"
                            rows={3}
                            value={formData.description} 
                            onChange={e => setFormData({...formData, description: e.target.value})} 
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Método</label>
                        <select 
                            value={formData.paymentMethod}
                            onChange={(e) => setFormData({...formData, paymentMethod: e.target.value as PaymentMethod})}
                            className="w-full p-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                        >
                            <option value={PaymentMethod.CASH}>Efectivo</option>
                            <option value={PaymentMethod.APP}>Aplicativo</option>
                            <option value={PaymentMethod.TRANSFER}>Transferencia</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-xs text-gray-500 mb-1 uppercase font-bold">Monto (S/)</label>
                        <input 
                            type="number" 
                            step="0.01" 
                            required 
                            className="w-full p-3 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 dark:text-white font-bold text-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
                            placeholder="0.00"
                            value={formData.amount} 
                            onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} 
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                        <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-lg font-medium">
                            Cancelar
                        </button>
                        <button type="submit" className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg shadow-red-500/20">
                            Aceptar
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
             <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                    <thead className="bg-neutral-50 dark:bg-neutral-900 text-xs uppercase text-gray-700 dark:text-gray-300">
                        <tr>
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4">Turno / Usuario</th>
                            <th className="px-6 py-4">Detalle</th>
                            <th className="px-6 py-4">Método</th>
                            <th className="px-6 py-4">Monto</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                        {expenses.sort((a,b) => b.timestamp - a.timestamp).map(exp => (
                            <tr key={exp.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                                <td className="px-6 py-4">{new Date(exp.timestamp).toLocaleString()}</td>
                                <td className="px-6 py-4 font-medium">{exp.userName}</td>
                                <td className="px-6 py-4">{exp.description}</td>
                                <td className="px-6 py-4 text-xs uppercase font-bold text-red-400">{exp.paymentMethod || PaymentMethod.CASH}</td>
                                <td className="px-6 py-4 font-bold text-red-500">- S/ {exp.amount.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button onClick={() => handleEdit(exp)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => initiateDelete(exp.id)} className="text-red-600 hover:text-red-800 dark:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                         {expenses.length === 0 && (
                             <tr>
                                 <td colSpan={6} className="px-6 py-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                                     <AlertTriangle className="w-8 h-8 opacity-50" />
                                     No hay egresos registrados.
                                 </td>
                             </tr>
                         )}
                    </tbody>
            </table>
        </div>
        
        {/* Footer Sum */}
        <div className="bg-neutral-50 dark:bg-neutral-900 p-4 border-t border-neutral-200 dark:border-neutral-700 flex justify-end items-center gap-4">
            <span className="uppercase text-xs font-bold text-gray-500">Total Egresos</span>
            <span className="text-2xl font-bold text-red-600">S/ {totalExpenses.toFixed(2)}</span>
        </div>
      </div>
    </div>
    </>
  );
};

export default Expenses;