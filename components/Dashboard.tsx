import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { DollarSign, ShoppingBag, Users, AlertTriangle } from 'lucide-react';
import { Sale, Product, ProductCategory, User, Shift, Role } from '../types';

interface DashboardProps {
  sales: Sale[];
  products: Product[];
  currentUser: User;
  currentShift: Shift | undefined;
}

const Dashboard: React.FC<DashboardProps> = ({ sales, products, currentUser, currentShift }) => {
  // KPIs Calculation
  const today = new Date().toDateString();
  let relevantSales = sales.filter(s => new Date(s.timestamp).toDateString() === today);
  
  // Logic: 
  // If Admin: See ALL sales for today.
  // If Normal User: 
  //    - If Shift Open: See sales for current shift only.
  //    - If Shift Closed: See sales for this user today (effectively 0 if they haven't opened a shift yet, or previous shift data if persistent, but prompt asks to reset).
  //    - Prompt requirement: "Cuando un usuario cierra su turno e ingresa el nuevo usuario, la información... debe reiniciarse"
  
  if (currentUser.role !== Role.ADMIN) {
      if (currentShift) {
          relevantSales = relevantSales.filter(s => s.shiftId === currentShift.id);
      } else {
          // If no shift is open, show 0 or only personal sales not linked to a closed shift (edge case). 
          // Safest interpretation of "reset": show only what belongs to the active context.
          // Since no shift is active, likely 0. 
          relevantSales = []; 
      }
  }

  // Update: "Ventas Hoy" only sums PAID product sales (excluding Free Pass and Pending)
  const totalRevenue = relevantSales
    .filter(s => !s.isFreePass && s.isPaid)
    .reduce((acc, curr) => acc + curr.totalAmount, 0);

  const totalTransactions = relevantSales.length;
  
  // Stock stats remain GLOBAL regardless of user
  const lowStockProducts = products.filter(p => p.stock <= p.minStock);

  // Clients Count: Only from Free Pass entries (isFreePass = true)
  // Logic: Sum of quantity of free pass items within the relevant sales
  const totalClients = relevantSales
    .filter(s => s.isFreePass)
    .reduce((acc, s) => acc + (s.items[0]?.quantity || 0), 0);

  // Chart Data: Sales by Category (Show ALL categories) based on relevant sales
  const categoryData = Object.values(ProductCategory).reduce((acc, cat) => {
    acc[cat] = 0;
    return acc;
  }, {} as Record<string, number>);

  relevantSales.forEach(sale => {
    if (!sale.isFreePass && sale.isPaid) {
        sale.items.forEach(item => {
            // Find product category if not in item
            const prod = products.find(p => p.id === item.productId);
            const cat = prod?.category || ProductCategory.OTHER;
            if (categoryData[cat] !== undefined) {
                categoryData[cat] += item.total;
            }
        });
    }
  });

  const chartData = Object.entries(categoryData).map(([name, value]) => ({ name, value }));

  const StatCard = ({ title, value, icon: Icon, color, subText }: any) => (
    <div className="bg-white dark:bg-neutral-800 p-6 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{value}</h3>
          {subText && <p className="text-xs text-gray-400 mt-1">{subText}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={currentUser.role === Role.ADMIN ? "Ventas Globales Hoy" : "Ventas Turno Actual"}
          value={`S/ ${totalRevenue.toFixed(2)}`} 
          icon={DollarSign} 
          color="bg-emerald-500" 
          subText="Solo Ingresos de Productos"
        />
        <StatCard 
          title="Transacciones" 
          value={totalTransactions} 
          icon={ShoppingBag} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Stock Crítico" 
          value={lowStockProducts.length} 
          icon={AlertTriangle} 
          color="bg-red-500" 
          subText="Productos por debajo del mínimo"
        />
        <StatCard 
          title="Clientes Totales" 
          value={totalClients} 
          icon={Users} 
          color="bg-gold-500" 
          subText="Solo Ingresos Libres"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-neutral-800 p-6 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm h-[28rem]">
          <h3 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">Ventas por Categoría ({currentUser.role === Role.ADMIN ? 'Global' : 'Turno'})</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#404040" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#888888" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                interval={0}
                angle={-15}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `S/${value}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#171717', border: '1px solid #EAB308', borderRadius: '8px' }}
                itemStyle={{ color: '#FACC15' }}
                formatter={(value: number) => [`S/ ${value.toFixed(2)}`, 'Venta']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.value > 0 ? '#EAB308' : '#333'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-1 bg-white dark:bg-neutral-800 p-6 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden h-[28rem]">
          <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white flex items-center gap-2">
            <AlertTriangle className="text-red-500 w-5 h-5" />
            Alertas de Inventario
          </h3>
          <div className="overflow-y-auto h-[calc(100%-3rem)] space-y-3 pr-2">
            {lowStockProducts.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 italic">
                    Todo el stock está en orden.
                </div>
            ) : (
                lowStockProducts.map(product => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg">
                    <div>
                    <p className="font-medium text-red-800 dark:text-red-200">{product.name}</p>
                    <p className="text-xs text-red-600 dark:text-red-400">SKU: {product.sku}</p>
                    </div>
                    <div className="text-right">
                    <p className="font-bold text-red-700 dark:text-red-300">{product.stock} Unid.</p>
                    <p className="text-xs text-red-500">Mínimo: {product.minStock}</p>
                    </div>
                </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;