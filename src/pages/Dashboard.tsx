import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  Package,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightLeft,
  TrendingUp,
} from 'lucide-react';

interface DashboardStats {
  totalProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  pendingReceipts: number;
  pendingDeliveries: number;
  scheduledTransfers: number;
}

interface RecentActivity {
  id: string;
  type: string;
  reference_number: string;
  product_name: string;
  quantity: number;
  move_date: string;
  warehouse_name: string;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    pendingReceipts: 0,
    pendingDeliveries: 0,
    scheduledTransfers: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [productsRes, stockRes, receiptsRes, deliveriesRes, transfersRes, movesRes] =
        await Promise.all([
          supabase.from('products').select('id', { count: 'exact' }),
          supabase
            .from('stock_locations')
            .select('id, quantity, product:products(min_stock_level)'),
          supabase
            .from('receipts')
            .select('id', { count: 'exact' })
            .in('status', ['draft', 'waiting', 'ready']),
          supabase
            .from('deliveries')
            .select('id', { count: 'exact' })
            .in('status', ['draft', 'waiting', 'ready']),
          supabase
            .from('transfers')
            .select('id', { count: 'exact' })
            .in('status', ['draft', 'waiting', 'ready']),
          supabase
            .from('stock_moves')
            .select(
              `
              id,
              move_type,
              reference_number,
              quantity,
              move_date,
              product:products(name),
              warehouse:warehouses(name)
            `
            )
            .order('move_date', { ascending: false })
            .limit(10),
        ]);

      let lowStock = 0;
      let outOfStock = 0;

      if (stockRes.data) {
        stockRes.data.forEach((loc: any) => {
          if (loc.quantity === 0) {
            outOfStock++;
          } else if (
            loc.product?.min_stock_level &&
            loc.quantity <= loc.product.min_stock_level
          ) {
            lowStock++;
          }
        });
      }

      setStats({
        totalProducts: productsRes.count || 0,
        lowStockItems: lowStock,
        outOfStockItems: outOfStock,
        pendingReceipts: receiptsRes.count || 0,
        pendingDeliveries: deliveriesRes.count || 0,
        scheduledTransfers: transfersRes.count || 0,
      });

      if (movesRes.data) {
        setRecentActivity(
          movesRes.data.map((move: any) => ({
            id: move.id,
            type: move.move_type,
            reference_number: move.reference_number,
            product_name: move.product?.name || 'Unknown',
            quantity: move.quantity,
            move_date: move.move_date,
            warehouse_name: move.warehouse?.name || 'Unknown',
          }))
        );
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Low Stock Items',
      value: stats.lowStockItems,
      icon: AlertTriangle,
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Out of Stock',
      value: stats.outOfStockItems,
      icon: AlertTriangle,
      color: 'bg-red-500',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      label: 'Pending Receipts',
      value: stats.pendingReceipts,
      icon: ArrowDownToLine,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Pending Deliveries',
      value: stats.pendingDeliveries,
      icon: ArrowUpFromLine,
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      label: 'Scheduled Transfers',
      value: stats.scheduledTransfers,
      icon: ArrowRightLeft,
      color: 'bg-cyan-500',
      textColor: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your inventory operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-3xl font-semibold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 ${stat.textColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            </div>
          </div>
          <div className="p-6">
            {recentActivity.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.product_name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.reference_number} • {activity.warehouse_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-medium ${
                          activity.quantity > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {activity.quantity > 0 ? '+' : ''}
                        {activity.quantity}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(activity.move_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => onNavigate('receipts')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:bg-gray-50 transition-all text-left"
              >
                <ArrowDownToLine className="h-6 w-6 text-gray-700 mb-2" />
                <p className="text-sm font-medium text-gray-900">New Receipt</p>
              </button>
              <button 
                onClick={() => onNavigate('deliveries')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:bg-gray-50 transition-all text-left"
              >
                <ArrowUpFromLine className="h-6 w-6 text-gray-700 mb-2" />
                <p className="text-sm font-medium text-gray-900">New Delivery</p>
              </button>
              <button 
                onClick={() => onNavigate('products')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:bg-gray-50 transition-all text-left"
              >
                <Package className="h-6 w-6 text-gray-700 mb-2" />
                <p className="text-sm font-medium text-gray-900">Add Product</p>
              </button>
              <button 
                onClick={() => onNavigate('transfers')}
                className="p-4 border-2 border-gray-200 rounded-lg hover:border-gray-900 hover:bg-gray-50 transition-all text-left"
              >
                <ArrowRightLeft className="h-6 w-6 text-gray-700 mb-2" />
                <p className="text-sm font-medium text-gray-900">New Transfer</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
