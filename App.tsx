import React, { useState, useEffect } from 'react';
import { User, Role } from './types';
import { dataService } from './services/dataService';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Inventory from './components/Inventory';
import ShiftManager from './components/ShiftManager';
import Reports from './components/Reports';
import Memberships from './components/Memberships';
import Expenses from './components/Expenses';
import Extras from './components/Extras';
import Modal from './components/Modal';
import { LayoutDashboard, ShoppingCart, Package, Users, BarChart3, LogOut, Sun, Moon, Menu, X, CreditCard, TrendingDown, Gem } from 'lucide-react';

type ViewState = 'DASHBOARD' | 'POS' | 'INVENTORY' | 'SHIFTS' | 'REPORTS' | 'MEMBERSHIPS' | 'EXPENSES' | 'EXTRAS';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now()); // Forcer refresh on data change
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Transition States
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionType, setTransitionType] = useState<'login' | 'logout' | null>(null);

  const triggerUpdate = () => setLastUpdate(Date.now());

  // Data Fetching hooks
  const products = dataService.getProducts();
  const sales = dataService.getSales();
  const currentShift = dataService.getActiveShift();

  useEffect(() => {
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLogin = (u: User) => {
      // Switch view immediately to animate the entrance of the new screen
      setUser(u);
      setTransitionType('login');
      setIsTransitioning(true);
      
      setTimeout(() => {
        setIsTransitioning(false);
      }, 500);
  };

  const executeLogout = () => {
      // Switch view immediately
      setUser(null);
      setView('DASHBOARD');
      setTransitionType('logout');
      setIsTransitioning(true);
      
      setTimeout(() => {
          setIsTransitioning(false);
      }, 500);
  };

  const NavItem = ({ id, label, icon: Icon }: { id: ViewState, label: string, icon: any }) => (
    <button
      onClick={() => { setView(id); setSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        view === id 
        ? 'bg-gradient-to-r from-red-800 to-red-600 text-white shadow-lg shadow-red-500/25' 
        : 'text-gray-500 dark:text-gray-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
      <div className={`
        relative w-full h-full 
        ${transitionType === 'login' && isTransitioning ? 'animate-fade-in-left' : ''} 
        ${transitionType === 'logout' && isTransitioning ? 'animate-fade-in-right' : ''}
      `}>
          {!user ? (
            <Login onLogin={handleLogin} /> 
          ) : (
            <div className="flex h-screen bg-gray-100 dark:bg-neutral-900 overflow-hidden">
                {/* Mobile Sidebar Overlay */}
                {sidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
                )}

                {/* Sidebar */}
                <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 ease-in-out flex flex-col`}>
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-8">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden border border-red-600/30 shadow-lg shadow-red-500/20 bg-neutral-900">
                      <img src="/assets/DFIT_INV.jpeg" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold dark:text-white leading-none">DFIT</h1>
                        <span className="text-xs text-red-500 uppercase font-bold tracking-widest">Gym ERP</span>
                    </div>
                    </div>

                    <nav className="space-y-2">
                    <NavItem id="DASHBOARD" label="Dashboard" icon={LayoutDashboard} />
                    <NavItem id="POS" label="Punto de Venta" icon={ShoppingCart} />
                    <NavItem id="MEMBERSHIPS" label="Membresías" icon={CreditCard} />
                    <NavItem id="INVENTORY" label="Inventario" icon={Package} />
                    <NavItem id="EXTRAS" label="Extras" icon={Gem} />
                    <NavItem id="EXPENSES" label="Egresos" icon={TrendingDown} />
                    <NavItem id="SHIFTS" label="Turnos y Caja" icon={Users} />
                    <NavItem id="REPORTS" label="Reportes" icon={BarChart3} />
                    </nav>
                </div>

                <div className="mt-auto p-6 border-t border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-3 mb-4 p-3 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-neutral-300 dark:bg-neutral-700 flex items-center justify-center text-lg font-bold text-gray-600 dark:text-gray-300">
                        {user?.name.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                        <p className="text-sm font-bold dark:text-white truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.role}</p>
                        </div>
                    </div>
                    <button 
                    onClick={() => setIsLogoutModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                    <LogOut className="w-4 h-4" /> Cerrar Sesión
                    </button>
                </div>
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Header */}
                <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-neutral-900/50 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-gray-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
                            <Menu className="w-6 h-6" />
                        </button>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-white hidden sm:block">
                            {view === 'DASHBOARD' && 'Resumen General'}
                            {view === 'POS' && 'Punto de Venta & Libres'}
                            {view === 'MEMBERSHIPS' && 'Control de Membresías'}
                            {view === 'INVENTORY' && 'Gestión de Productos'}
                            {view === 'EXTRAS' && 'Ingresos Extras'}
                            {view === 'SHIFTS' && 'Control de Turnos'}
                            {view === 'EXPENSES' && 'Registro de Egresos'}
                            {view === 'REPORTS' && 'Reportes & Cobranzas'}
                        </h2>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {currentShift ? (
                            <span className="hidden md:flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full border border-green-200 dark:border-green-900/50">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                Turno Activo
                            </span>
                        ) : (
                            <span className="hidden md:flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-bold rounded-full border border-red-200 dark:border-red-900/50">
                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                Caja Cerrada
                            </span>
                        )}

                        <button 
                            onClick={() => setDarkMode(!darkMode)}
                            className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 text-gray-600 dark:text-gold-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                        >
                            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                    </div>
                </header>

                {/* Scrollable View Area */}
                <div className="flex-1 overflow-auto p-4 md:p-6 bg-gray-100 dark:bg-neutral-950">
                    {view === 'DASHBOARD' && user && <Dashboard sales={sales} products={products} currentUser={user} currentShift={currentShift} />}
                    {view === 'POS' && user && (
                        <POS 
                            products={products} 
                            currentUser={user} 
                            currentShift={currentShift} 
                            onSaleComplete={triggerUpdate} 
                        />
                    )}
                    {view === 'MEMBERSHIPS' && user && (
                        <Memberships 
                        currentUser={user} 
                        currentShift={currentShift} 
                        onUpdate={triggerUpdate} 
                        />
                    )}
                    {view === 'INVENTORY' && user && <Inventory products={products} currentUser={user} onUpdate={triggerUpdate} />}
                    {view === 'EXPENSES' && user && <Expenses currentUser={user} currentShift={currentShift} />}
                    {view === 'EXTRAS' && user && <Extras currentUser={user} currentShift={currentShift} />}
                    {view === 'SHIFTS' && user && (
                        <ShiftManager 
                            currentUser={user} 
                            currentShift={currentShift} 
                            onShiftChange={triggerUpdate} 
                        />
                    )}
                    {view === 'REPORTS' && user && <Reports sales={sales} onUpdate={triggerUpdate} currentUser={user} />}
                </div>
                </main>
            </div>
          )}
          {user && (
              <Modal
                  isOpen={isLogoutModalOpen}
                  onClose={() => setIsLogoutModalOpen(false)}
                  onConfirm={() => {
                      setIsLogoutModalOpen(false);
                      executeLogout();
                  }}
                  title="Confirmar Salida"
                  message="¿Está seguro de que desea cerrar la sesión actual? Asegúrese de haber guardado su progreso."
                  type="confirm"
              />
          )}
      </div>
  );
};

export default App;