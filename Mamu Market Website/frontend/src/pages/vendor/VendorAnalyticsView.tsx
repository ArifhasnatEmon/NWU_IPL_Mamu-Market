import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import PageTitle from '../../components/PageTitle';
import { useOrders } from '../../hooks/useOrders';
import { Order, OrderItem } from '../../types';

const VendorAnalyticsView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalSales: 0,
    pendingRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    topProducts: [] as { name: string; count: number }[]
  });
  const [monthlyData, setMonthlyData] = useState<{ month: string; sales: number }[]>([]);
  const { orders: allOrders } = useOrders(user);

  useEffect(() => {
    const vendorOrders = allOrders.filter((o: Order) => o.items.some((i: OrderItem) => i.vendorId === user?.id));
    
    // Vendor Status Fallback
    const getVendorStatus = (o: Order): string => {
      let st = (o.vendorStatuses && o.vendorStatuses[user?.id!]) ? String(o.vendorStatuses[user?.id!]) : o.status || '';
      const n = st.toLowerCase();
      if (n === 'pending' || n === 'processing') return 'Processing';
      if (n === 'shipped') return 'Shipped';
      if (n === 'delivered') return 'Delivered';
      if (n === 'cancelled' || n === 'failed') return 'Cancelled';
      return st ? st.charAt(0).toUpperCase() + st.slice(1) : 'Processing';
    };
    
    const activeVendorOrders = vendorOrders.filter((o: Order) => getVendorStatus(o) !== 'Cancelled');
    
    let totalSales = 0;
    let pendingRevenue = 0;
    let totalOrders = activeVendorOrders.length;
    let productSales: Record<string, number> = {};

    activeVendorOrders.forEach((o: Order) => {
      const vStatus = getVendorStatus(o);
      o.items.forEach((i: OrderItem) => {
        if (i.vendorId === user?.id) {
          if (vStatus === 'Delivered') {
            totalSales += i.price * i.quantity;
          } else if (['Processing', 'Shipped'].includes(vStatus)) {
            pendingRevenue += i.price * i.quantity;
          }
          productSales[i.productName || i.name || 'Unknown'] = (productSales[i.productName || i.name || 'Unknown'] || 0) + i.quantity;
        }
      });
    });

    const topProducts = Object.entries(productSales)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Monthly data — last 6 months
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    const monthly: { month: string; sales: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = monthNames[d.getMonth()];
      const monthSales = activeVendorOrders
        .filter((o: Order) => {
          const od = new Date(o.createdAt || o.date || '');
          return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth();
        })
        .reduce((s: number, o: Order) => s + o.items
          .filter((i: OrderItem) => i.vendorId === user?.id)
          .reduce((is: number, i: OrderItem) => is + (i.price || 0) * (i.quantity || 0), 0), 0);
      monthly.push({ month: label, sales: Math.round(monthSales) });
    }
    setMonthlyData(monthly);

    setStats({
      totalSales,
      pendingRevenue,
      totalOrders,
      avgOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
      topProducts
    });
  }, [user, allOrders]);
  return (
    <div className="container mx-auto px-4 py-20">
      <PageTitle title="Store Analytics" />
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-gray-900">Store Analytics</h1>
          <button onClick={() => navigate('/dashboard')} className="text-gray-500 font-bold hover:text-gray-900">Back to Dashboard</button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Total Revenue</h3>
            <p className="text-3xl font-black text-emerald-600 tracking-tighter">৳{stats.totalSales.toLocaleString()}</p>
            <p className="text-[10px] font-black text-gray-400 mt-1">Delivered Orders</p>
          </div>
          <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Est. Revenue</h3>
            <p className="text-3xl font-black text-amber-600 tracking-tighter">৳{(stats.pendingRevenue || 0).toLocaleString()}</p>
            <p className="text-[10px] font-black text-gray-400 mt-1">Processing/Shipped</p>
          </div>
          <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Total Orders</h3>
            <p className="text-3xl font-black text-brand-600 tracking-tighter">{stats.totalOrders}</p>
            <p className="text-[10px] font-black text-gray-400 mt-1">All Active Orders</p>
          </div>
          <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Avg. Order Value</h3>
            <p className="text-3xl font-black text-gray-900 tracking-tighter">৳{Math.round(stats.avgOrderValue).toLocaleString()}</p>
            <p className="text-[10px] font-black text-gray-400 mt-1">Per Order Average</p>
          </div>
        </div>

        {/* Monthly Sales Chart */}
        <div className="bg-white rounded-[2rem] p-10 border border-gray-100 shadow-sm mb-6">
          <h3 className="text-xl font-black text-gray-900 mb-8">Monthly Sales (Last 6 Months)</h3>
          {monthlyData.some(d => d.sales > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} barCategoryGap="30%">
                <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fontWeight: 700, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `৳${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: any) => [`৳${Number(value).toLocaleString()}`, 'Sales']}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontWeight: 700, fontSize: 12 }}
                  cursor={{ fill: '#f3f0ff' }}
                />
                <Bar dataKey="sales" radius={[8, 8, 0, 0]} maxBarSize={48}>
                  {monthlyData.map((_, i) => (
                    <Cell key={i} fill={i === monthlyData.length - 1 ? '#7c3aed' : '#e9d5ff'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 font-bold py-10">No sales data yet</p>
          )}
        </div>

        <div className="bg-white rounded-[2rem] p-10 border border-gray-100 shadow-sm">
          <h3 className="text-xl font-black text-gray-900 mb-6">Top Selling Products</h3>
          {stats.topProducts.length > 0 ? (
            <div className="space-y-4">
              {stats.topProducts.map((p, i) => (
                <div key={i} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-black text-xs flex-shrink-0">{i+1}</span>
                      <span className="font-bold text-gray-900 text-sm truncate max-w-[200px]">{p.name}</span>
                    </div>
                    <span className="font-black text-gray-500 text-sm flex-shrink-0">{p.count} sold</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${Math.round((p.count / (stats.topProducts[0]?.count || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 font-bold py-10">No sales data available yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorAnalyticsView;
