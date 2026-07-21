import React, { useState } from 'react';
import { User } from '../types';
import { USERS } from '../constants';
import { User as UserIcon } from 'lucide-react';

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
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background Banner with blur */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{ backgroundImage: "url('/assets/banner.png')" }}
      />
      <div className="absolute inset-0 z-1 bg-black/40 backdrop-blur-[3px]" />

      {/* Login Card */}
      <div className="bg-[#222222]/95 px-8 py-12 rounded-3xl w-full max-w-sm relative z-10 group border border-neutral-800 hover:border-red-600 hover:shadow-[0_0_35px_rgba(220,38,38,0.45)] transition-all duration-500">
        <div className="flex flex-col items-center mb-8">
            <div className="mb-4 relative">
                {/* Circular Brand Logo with zooming hover & glow effects */}
                <div className="w-28 h-28 bg-neutral-900 rounded-full flex items-center justify-center overflow-hidden border-2 border-red-600 shadow-[0_0_25px_rgba(220,38,38,0.3)] transition-all duration-500 group-hover:scale-105 group-hover:shadow-[0_0_35px_rgba(220,38,38,0.61)]">
                    <img 
                      src="/assets/DFIT_INV.jpeg" 
                      alt="Logo DFIT" 
                      className="w-full h-full object-cover transition-transform duration-700 hover:scale-125"
                    />
                </div>
            </div>
            <h1 className="text-3xl font-bold tracking-wide mt-2 text-white">
              DFIT <span className="text-white group-hover:text-red-650 transition-colors duration-300">ERP</span>
            </h1>
            <p className="text-neutral-400 text-sm mt-1">Sistema de Gestión Integral</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
              <label className="block text-sm font-medium text-red-500 mb-1.5 transition-colors duration-300 group-hover:text-red-400">Seleccionar Usuario</label>
              <select 
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-[#1A1A1A] text-white p-3.5 rounded-xl border border-neutral-800 hover:border-red-600 hover:shadow-[0_0_15px_rgba(220,38,38,0.25)] focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2500/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
              >
                  {USERS.map(u => (
                      <option key={u.id} value={u.id}>{u.name === 'Administrador General' ? 'Administrador' : u.name}</option>
                  ))}
              </select>
          </div>

          <div>
               <label className="block text-sm font-medium text-red-500 mb-1.5 transition-colors duration-300 group-hover:text-red-400">PIN de Acceso</label>
               <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-[#1A1A1A] text-white text-center text-xl tracking-[0.5em] p-3.5 rounded-xl border border-neutral-800 hover:border-red-600 hover:shadow-[0_0_15px_rgba(220,38,38,0.25)] focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all placeholder:tracking-widest placeholder:text-neutral-600"
                maxLength={6}
              />
          </div>
          
          {error && <p className="text-red-500 text-center text-sm font-medium animate-pulse">{error}</p>}

          <button
              type="submit"
              className="w-full mt-6 bg-gradient-to-r from-red-800 to-red-600 text-white font-semibold text-lg py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(220,38,38,0.25)] hover:shadow-[0_8px_25px_rgba(220,38,38,0.5)] hover:-translate-y-0.5 transition-all duration-300"
          >
              <UserIcon className="w-5 h-5 text-white" strokeWidth={2} /> Iniciar Sesión
          </button>
        </form>
      </div>
      
      <div className="mt-8 text-center text-neutral-500 transition-all duration-300 hover:text-red-500 hover:drop-shadow-[0_0_10px_rgba(220,38,38,0.6)] cursor-default relative z-10">
        <p className="text-sm font-medium">
            RyanCore System v-1.01 ® {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default Login;