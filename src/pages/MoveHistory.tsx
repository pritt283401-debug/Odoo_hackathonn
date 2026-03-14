import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Filter } from 'lucide-react';

export function MoveHistory() {
  const [moves, setMoves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    loadMoves();
  }, []);

  const loadMoves = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_moves')
        .select(
          `
          *,
          product:products(name, sku),
          warehouse:warehouses(name)
        `
        )
        .order('move_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      setMoves(data || []);
    } catch (error) {
      console.error('Error loading moves:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMoves = moves.filter((move) => {
    const matchesSearch =
      move.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      move.product?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || move.move_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getMoveTypeColor = (type: string) => {
    const colors = {
      receipt: 'text-green-600 bg-green-50',
      delivery: 'text-red-600 bg-red-50',
      transfer_in: 'text-blue-600 bg-blue-50',
      transfer_out: 'text-orange-600 bg-orange-50',
      adjustment: 'text-gray-600 bg-gray-50',
    };
    return colors[type as keyof typeof colors] || colors.adjustment;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading move history...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Move History</h1>
        <p className="text-gray-600 mt-1">Complete ledger of all stock movements</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search moves..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">All Types</option>
              <option value="receipt">Receipt</option>
              <option value="delivery">Delivery</option>
              <option value="transfer_in">Transfer In</option>
              <option value="transfer_out">Transfer Out</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Warehouse
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Quantity
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMoves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No movements found
                  </td>
                </tr>
              ) : (
                filteredMoves.map((move) => (
                  <tr key={move.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(move.move_date).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {move.reference_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getMoveTypeColor(
                          move.move_type
                        )}`}
                      >
                        {move.move_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {move.product?.name}
                      </div>
                      <div className="text-sm text-gray-500">{move.product?.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {move.warehouse?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span
                        className={`text-sm font-medium ${
                          move.quantity > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {move.quantity > 0 ? '+' : ''}
                        {move.quantity}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
