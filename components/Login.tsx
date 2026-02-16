import React, { useState } from 'react';
import { User } from '../types';
import { USERS } from '../constants';


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
      {/* Background Image with Blur */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat blur-sm"
        style={{ backgroundImage: 'url(/assets/banner.png)' }}
      />
      {/* Overlay to ensure text readability if needed, though blur helps */}
      <div className="absolute inset-0 z-0 bg-black/60" />

      <div className="bg-neutral-800/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl border border-neutral-700 w-full max-w-md transition-all duration-300 hover:shadow-[0_0_40px_rgba(185,28,28,0.6)] hover:border-red-600/50 group relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-6 relative group/logo">
            <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-transparent group-hover/logo:border-red-600 group-hover/logo:shadow-[0_0_30px_rgba(220,38,38,0.5)] transition-all duration-500">
              <img
                src="/assets/DFIT_INV.jpeg"
                alt="DFIT Logo"
                className="w-full h-full object-cover transition-transform duration-500 group-hover/logo:scale-110"
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-wider transition-colors">DFIT <span className="text-white group-hover:text-red-600 transition-colors duration-300">ERP</span></h1>
          <p className="text-neutral-400 text-sm mt-2">Sistema de Gestión Integral</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-red-500 mb-2 uppercase tracking-wide">Seleccionar Usuario</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-neutral-900 text-white p-4 rounded-xl border border-neutral-600 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 transition-all"
            >
              {USERS.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-red-500 mb-2 uppercase tracking-wide">PIN de Acceso</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="****"
              className="w-full bg-neutral-900 text-white text-center text-2xl tracking-widest p-4 rounded-xl border border-neutral-600 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600 transition-all"
              maxLength={6}
            />
          </div>

          {error && <p className="text-red-500 text-center text-sm font-medium animate-pulse">{error}</p>}

          <button
            type="submit"
            className="w-full mt-4 bg-gradient-to-r from-red-700 to-red-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-900/40 hover:shadow-red-600/40 transform hover:-translate-y-1 transition-all"
          >
            INGRESAR
          </button>
        </form>
      </div>

      <div className="mt-8 text-center opacity-60 hover:opacity-100 transition-opacity duration-500 relative z-10">
        <p className="text-[10px] text-white font-mono tracking-widest uppercase">
          RyanCore System V-1.01 ® 2026
        </p>
      </div>
    </div>
  );
};

export default Login;