import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Adjustments() {
  const { user } = useAuth();
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    warehouse_id: '',
    reason: 'count_correction',
    adjustment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [lines, setLines] = useState<any[]>([
    { product_id: '', counted_quantity: 0, system_quantity: 0 },
  ]);

  useEffect(() => {
    loadAdjustments();
    loadProducts();
    loadWarehouses();
  }, []);

  const loadAdjustments = async () => {
    try {
      const { data, error } = await supabase
        .from('adjustments')
        .select(
          `
          *,
          warehouse:warehouses(name)
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdjustments(data || []);
    } catch (error) {
      console.error('Error loading adjustments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, unit_of_measure')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadWarehouses = async () => {
    try {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setWarehouses(data || []);
    } catch (error) {
      console.error('Error loading warehouses:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: adjustmentNumber } = await supabase.rpc('generate_document_number', {
        prefix: 'ADJ',
      });

      const { data: adjustment, error: adjustmentError } = await supabase
        .from('adjustments')
        .insert([
          {
            adjustment_number: adjustmentNumber,
            ...formData,
            created_by: user?.id,
            status: 'done',
            validated_at: new Date().toISOString(),
            validated_by: user?.id,
          },
        ])
        .select()
        .single();

      if (adjustmentError) throw adjustmentError;

      const validLines = lines.filter((l) => l.product_id);

      for (const line of validLines) {
        const difference = line.counted_quantity - line.system_quantity;

        await supabase.from('adjustment_lines').insert({
          adjustment_id: adjustment.id,
          product_id: line.product_id,
          counted_quantity: line.counted_quantity,
          system_quantity: line.system_quantity,
          difference: difference,
          unit_of_measure: products.find((p) => p.id === line.product_id)?.unit_of_measure || 'pcs',
        });

        if (difference !== 0) {
          await supabase.rpc('update_stock_location', {
            p_product_id: line.product_id,
            p_warehouse_id: formData.warehouse_id,
            p_quantity: difference,
          });

          await supabase.from('stock_moves').insert({
            product_id: line.product_id,
            warehouse_id: formData.warehouse_id,
            quantity: difference,
            move_type: 'adjustment',
            reference_type: 'adjustments',
            reference_id: adjustment.id,
            reference_number: adjustmentNumber,
            created_by: user?.id,
            notes: formData.reason,
          });
        }
      }

      setShowModal(false);
      resetForm();
      loadAdjustments();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      warehouse_id: '',
      reason: 'count_correction',
      adjustment_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setLines([{ product_id: '', counted_quantity: 0, system_quantity: 0 }]);
  };

  const loadSystemQuantity = async (productId: string, index: number) => {
    if (!formData.warehouse_id || !productId) return;

    const { data } = await supabase
      .from('stock_locations')
      .select('quantity')
      .eq('product_id', productId)
      .eq('warehouse_id', formData.warehouse_id)
      .maybeSingle();

    const newLines = [...lines];
    newLines[index].system_quantity = data?.quantity || 0;
    setLines(newLines);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading adjustments...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Inventory Adjustments</h1>
          <p className="text-gray-600 mt-1">Correct stock discrepancies</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
        >
          <Plus className="h-5 w-5" />
          <span>New Adjustment</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Adjustment #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Warehouse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {adjustments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No adjustments found
                  </td>
                </tr>
              ) : (
                adjustments.map((adjustment) => (
                  <tr key={adjustment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {adjustment.adjustment_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {adjustment.warehouse?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {adjustment.reason.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(adjustment.adjustment_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {adjustment.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">New Stock Adjustment</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Warehouse *
                  </label>
                  <select
                    required
                    value={formData.warehouse_id}
                    onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                  <select
                    required
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    <option value="count_correction">Count Correction</option>
                    <option value="damage">Damage</option>
                    <option value="theft">Theft</option>
                    <option value="expired">Expired</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Products *</label>
                  <button
                    type="button"
                    onClick={() =>
                      setLines([
                        ...lines,
                        { product_id: '', counted_quantity: 0, system_quantity: 0 },
                      ])
                    }
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    + Add Line
                  </button>
                </div>

                <div className="space-y-3">
                  {lines.map((line, index) => (
                    <div key={index} className="grid grid-cols-4 gap-3">
                      <select
                        value={line.product_id}
                        onChange={(e) => {
                          const newLines = [...lines];
                          newLines[index].product_id = e.target.value;
                          setLines(newLines);
                          loadSystemQuantity(e.target.value, index);
                        }}
                        className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      >
                        <option value="">Select Product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="System Qty"
                        value={line.system_quantity}
                        readOnly
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                      <input
                        type="number"
                        placeholder="Counted Qty"
                        min="0"
                        step="0.01"
                        value={line.counted_quantity || ''}
                        onChange={(e) => {
                          const newLines = [...lines];
                          newLines[index].counted_quantity = Number(e.target.value);
                          setLines(newLines);
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium"
                >
                  Create Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
