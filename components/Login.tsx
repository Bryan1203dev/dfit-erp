import React, { useState } from 'react';
import { User } from '../types';
import { USERS } from '../constants';
import { Lock, User as UserIcon } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [selectedUserId, setSelectedUserId] = useState(USERS[0].id);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = USERS.find(u => u.id === selectedUserId);
    if (user && user.pin === pin) {
      onLogin(user);
    } else {
      setError('PIN Incorrecto');
      setPin('');
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 overflow-hidden bg-[#171717]">
      {/* Background Banner with Blur */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0" 
        style={{ 
          backgroundImage: `url('/assets/banner.png')`,
          filter: 'blur(4px)',
          transform: 'scale(1.05)'
        }}
      />
      {/* Overlay for premium dark tech look */}
      <div className="absolute inset-0 bg-black/35 z-0" />

      <div className="bg-[#222222]/90 backdrop-blur-md px-8 py-12 rounded-3xl shadow-xl w-full max-w-sm relative z-10 group border border-transparent hover:border-[#8B0000] hover:shadow-[0_0_40px_rgba(139,0,0,0.65)] transition-all duration-500">
        <div className="flex flex-col items-center mb-8">
            <div className="mb-4 relative group/logo">
                <div className="w-28 h-28 bg-neutral-800 rounded-full flex items-center justify-center overflow-hidden border border-neutral-700 shadow-md group-hover/logo:scale-110 group-hover/logo:shadow-[0_0_30px_rgba(220,38,38,0.7)] transition-all duration-300">
                    <img src="/assets/DFIT_INV.jpeg" alt="Logo" className="w-full h-full object-cover" />
                </div>
            </div>
            <h1 className="text-3xl font-bold tracking-wide mt-2">
                <span className="text-white">DFIT</span>{' '}
                <span className="text-white group-hover:text-[#DC2626] transition-colors duration-300">ERP</span>
            </h1>
            <p className="text-neutral-400 text-sm mt-1">Sistema de Gestión Integral</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Seleccionar Usuario</label>
              <select 
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-[#1A1A1A] text-white p-3.5 rounded-xl border border-neutral-800 focus:border-[#DC2626] focus:outline-none focus:ring-1 focus:ring-[#DC2626] hover:border-[#DC2626] hover:shadow-[0_0_12px_rgba(220,38,38,0.35)] transition-all appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
              >
                  {USERS.map(u => (
                      <option key={u.id} value={u.id}>{u.name === 'Administrador General' ? 'Administrador' : u.name}</option>
                  ))}
              </select>
          </div>

          <div>
               <label className="block text-sm font-medium text-neutral-300 mb-1.5">PIN de Acceso</label>
               <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-[#1A1A1A] text-white text-center text-xl tracking-[0.5em] p-3.5 rounded-xl border border-neutral-800 focus:border-[#DC2626] focus:outline-none focus:ring-1 focus:ring-[#DC2626] hover:border-[#DC2626] hover:shadow-[0_0_12px_rgba(220,38,38,0.35)] transition-all placeholder:tracking-widest placeholder:text-neutral-600"
                maxLength={6}
              />
          </div>
          
          {error && <p className="text-red-500 text-center text-sm font-medium animate-pulse">{error}</p>}

          <button
              type="submit"
              className="w-full mt-6 bg-gradient-to-r from-[#8B0000] to-[#DC2626] text-white font-semibold text-lg py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(139,0,0,0.35)] hover:from-[#DC2626] hover:to-[#FF3E3E] hover:shadow-[0_8px_25px_rgba(220,38,38,0.65)] hover:-translate-y-1 transition-all duration-300"
          >
              <UserIcon className="w-5 h-5" strokeWidth={2} /> Iniciar Sesión
          </button>
        </form>
      </div>
      
      <div className="mt-8 text-center text-[#A68A56] relative z-10 transition-all duration-300 hover:text-[#FFE082] hover:drop-shadow-[0_0_10px_rgba(255,224,130,0.8)] cursor-default">
        <p className="text-sm font-medium">
            RyanCore System v-1.01 ® {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default Login;