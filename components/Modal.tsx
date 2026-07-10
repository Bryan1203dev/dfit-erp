import React from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: 'confirm' | 'alert' | 'success';
  children?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onConfirm, title, message, type = 'confirm', children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-800 w-full max-w-md rounded-2xl border-2 border-gold-500 shadow-[0_0_40px_rgba(234,179,8,0.2)] overflow-hidden transform transition-all scale-100">
        <div className="bg-gradient-to-r from-neutral-800 to-neutral-900 p-4 border-b border-neutral-700 flex justify-between items-center">
            <h3 className="text-gold-500 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
                DFIT ERP
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <X size={20} />
            </button>
        </div>
        
        <div className="p-6 text-center">
            <div className="mb-4 flex justify-center">
                <div className={`w-16 h-16 rounded-full overflow-hidden border-2 shadow-md ${type === 'success' ? 'border-green-500 shadow-green-500/20' : 'border-gold-500/80 shadow-gold-500/10'}`}>
                    <img src="/assets/DFIT_INV.jpeg" alt="Logo" className="w-full h-full object-cover" />
                </div>
            </div>
            
            <h4 className="text-xl font-bold text-white mb-2">{title}</h4>
            <p className="text-neutral-300 mb-6 whitespace-pre-line text-sm">{message}</p>
            
            {children && <div className="mb-6">{children}</div>}
            
            <div className="flex gap-3 justify-center">
                {type !== 'alert' && (
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 rounded-xl border border-neutral-600 text-neutral-300 hover:bg-neutral-700 hover:text-white font-medium transition-all"
                    >
                        Cancelar
                    </button>
                )}
                <button 
                    onClick={() => { onConfirm(); if(type==='alert') onClose(); }}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-gold-600 to-gold-500 text-neutral-900 font-bold hover:shadow-lg hover:shadow-gold-500/20 transition-all"
                >
                    {type === 'alert' ? 'Entendido' : 'Confirmar'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;