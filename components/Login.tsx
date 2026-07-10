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
    <div className="min-h-screen bg-[#171717] flex flex-col items-center justify-center p-4">
      <div className="bg-[#222222] px-8 py-12 rounded-3xl shadow-xl w-full max-w-sm relative z-10 group border border-transparent hover:border-[#CA8A04] hover:shadow-[0_0_30px_rgba(202,138,4,0.3)] transition-all duration-500">
        <div className="flex flex-col items-center mb-8">
            <div className="mb-4 relative">
                <div className="w-28 h-28 bg-[#FFE082] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,224,130,0.15)]">
                    <Lock className="text-neutral-900 w-12 h-12" strokeWidth={1.5} />
                </div>
            </div>
            <h1 className="text-3xl font-bold text-white group-hover:text-[#FFE082] tracking-wide mt-2 transition-colors duration-300">DFIT ERP</h1>
            <p className="text-neutral-400 text-sm mt-1">Sistema de Gestión Integral</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
              <label className="block text-sm font-medium text-[#FFE082] mb-1.5">Seleccionar Usuario</label>
              <select 
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-[#1A1A1A] text-white p-3.5 rounded-xl border border-neutral-800 focus:border-[#FFE082] focus:outline-none focus:ring-1 focus:ring-[#FFE082] transition-all appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
              >
                  {USERS.map(u => (
                      <option key={u.id} value={u.id}>{u.name === 'Administrador General' ? 'Administrador' : u.name}</option>
                  ))}
              </select>
          </div>

          <div>
               <label className="block text-sm font-medium text-[#FFE082] mb-1.5">PIN de Acceso</label>
               <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-[#1A1A1A] text-white text-center text-xl tracking-[0.5em] p-3.5 rounded-xl border border-neutral-800 focus:border-[#FFE082] focus:outline-none focus:ring-1 focus:ring-[#FFE082] transition-all placeholder:tracking-widest placeholder:text-neutral-600"
                maxLength={6}
              />
          </div>
          
          {error && <p className="text-red-500 text-center text-sm font-medium animate-pulse">{error}</p>}

          <button
              type="submit"
              className="w-full mt-6 bg-gradient-to-r from-[#FFE082] to-[#FFF3C7] text-neutral-900 font-semibold text-lg py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(255,224,130,0.2)] hover:shadow-[0_8px_25px_rgba(255,224,130,0.4)] hover:-translate-y-1 transition-all duration-300"
          >
              <UserIcon className="w-5 h-5" strokeWidth={2} /> Iniciar Sesión
          </button>
        </form>
      </div>
      
      <div className="mt-8 text-center text-[#A68A56] transition-all duration-300 hover:text-[#FFE082] hover:drop-shadow-[0_0_10px_rgba(255,224,130,0.8)] cursor-default">
        <p className="text-sm font-medium">
            RyanCore System v-1.01 ® {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default Login;