import React, { useState } from 'react';
import { User } from '../types';
import { USERS } from '../constants';
import { Lock } from 'lucide-react';

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
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4">
      <div className="bg-neutral-800 p-8 rounded-2xl shadow-2xl border border-neutral-700 w-full max-w-md transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(234,179,8,0.3)] hover:border-gold-500/50 group relative z-10">
        <div className="flex flex-col items-center mb-8">
            <div className="mb-6 relative">
                <img 
                    src="./DFIT_LOGO.jpeg" 
                    alt="DFIT Logo" 
                    className="w-40 h-40 object-contain drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]"
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                />
                <div className="hidden w-32 h-32 bg-gradient-to-br from-gold-400 to-gold-700 rounded-full flex items-center justify-center shadow-lg shadow-gold-500/20">
                    <Lock className="text-white w-12 h-12" />
                </div>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-wider group-hover:text-gold-400 transition-colors">DFIT <span className="text-gold-500">ERP</span></h1>
            <p className="text-neutral-400 text-sm mt-2">Sistema de Gestión Integral</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
              <label className="block text-xs font-medium text-gold-500 mb-2 uppercase tracking-wide">Seleccionar Usuario</label>
              <select 
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-neutral-900 text-white p-4 rounded-xl border border-neutral-600 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-all"
              >
                  {USERS.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
              </select>
          </div>

          <div>
               <label className="block text-xs font-medium text-gold-500 mb-2 uppercase tracking-wide">PIN de Acceso</label>
               <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="****"
                className="w-full bg-neutral-900 text-white text-center text-2xl tracking-widest p-4 rounded-xl border border-neutral-600 focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 transition-all"
                maxLength={6}
              />
          </div>
          
          {error && <p className="text-red-500 text-center text-sm font-medium animate-pulse">{error}</p>}

          <button
              type="submit"
              className="w-full mt-4 bg-gradient-to-r from-gold-600 to-gold-400 text-neutral-900 font-bold py-4 rounded-xl shadow-lg shadow-gold-500/20 hover:shadow-gold-500/40 transform hover:-translate-y-1 transition-all"
          >
              INGRESAR
          </button>
        </form>
      </div>
      
      <div className="mt-8 text-center opacity-40 hover:opacity-100 transition-opacity duration-500">
        <p className="text-[10px] text-gold-500 font-mono tracking-widest uppercase">
            RyanCore System V-1.01 ® 2026
        </p>
      </div>
    </div>
  );
};

export default Login;