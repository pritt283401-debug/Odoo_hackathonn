import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Transfers() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    from_warehouse_id: '',
    to_warehouse_id: '',
    transfer_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [lines, setLines] = useState<any[]>([
    { product_id: '', quantity: 0, unit_of_measure: 'pcs', notes: '' },
  ]);

  useEffect(() => {
    loadTransfers();
    loadProducts();
    loadWarehouses();
  }, []);

  const loadTransfers = async () => {
    try {
      const { data, error } = await supabase
        .from('transfers')
        .select(
          `
          *,
          from_warehouse:from_warehouse_id(name),
          to_warehouse:to_warehouse_id(name)
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransfers(data || []);
    } catch (error) {
      console.error('Error loading transfers:', error);
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

    if (formData.from_warehouse_id === formData.to_warehouse_id) {
      alert('Source and destination warehouses must be different');
      return;
    }

    try {
      const { data: transferNumber } = await supabase.rpc('generate_document_number', {
        prefix: 'TRF',
      });

      const { data: transfer, error: transferError } = await supabase
        .from('transfers')
        .insert([
          {
            transfer_number: transferNumber,
            ...formData,
            created_by: user?.id,
            status: 'done',
            validated_at: new Date().toISOString(),
            validated_by: user?.id,
          },
        ])
        .select()
        .single();

      if (transferError) throw transferError;

      const validLines = lines.filter((l) => l.product_id && l.quantity > 0);

      for (const line of validLines) {
        await supabase.from('transfer_lines').insert({
          transfer_id: transfer.id,
          ...line,
        });

        await supabase.rpc('update_stock_location', {
          p_product_id: line.product_id,
          p_warehouse_id: formData.from_warehouse_id,
          p_quantity: -line.quantity,
        });

        await supabase.rpc('update_stock_location', {
          p_product_id: line.product_id,
          p_warehouse_id: formData.to_warehouse_id,
          p_quantity: line.quantity,
        });

        await supabase.from('stock_moves').insert([
          {
            product_id: line.product_id,
            warehouse_id: formData.from_warehouse_id,
            quantity: -line.quantity,
            move_type: 'transfer_out',
            reference_type: 'transfers',
            reference_id: transfer.id,
            reference_number: transferNumber,
            created_by: user?.id,
          },
          {
            product_id: line.product_id,
            warehouse_id: formData.to_warehouse_id,
            quantity: line.quantity,
            move_type: 'transfer_in',
            reference_type: 'transfers',
            reference_id: transfer.id,
            reference_number: transferNumber,
            created_by: user?.id,
          },
        ]);
      }

      setShowModal(false);
      resetForm();
      loadTransfers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      from_warehouse_id: '',
      to_warehouse_id: '',
      transfer_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setLines([{ product_id: '', quantity: 0, unit_of_measure: 'pcs', notes: '' }]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading transfers...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Internal Transfers</h1>
          <p className="text-gray-600 mt-1">Move stock between warehouses</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
        >
          <Plus className="h-5 w-5" />
          <span>New Transfer</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Transfer #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  From
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  To
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
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No transfers found
                  </td>
                </tr>
              ) : (
                transfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transfer.transfer_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transfer.from_warehouse?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transfer.to_warehouse?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transfer.transfer_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {transfer.status}
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
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">New Internal Transfer</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Warehouse *
                  </label>
                  <select
                    required
                    value={formData.from_warehouse_id}
                    onChange={(e) =>
                      setFormData({ ...formData, from_warehouse_id: e.target.value })
                    }
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Warehouse *
                  </label>
                  <select
                    required
                    value={formData.to_warehouse_id}
                    onChange={(e) =>
                      setFormData({ ...formData, to_warehouse_id: e.target.value })
                    }
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
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Products *</label>
                  <button
                    type="button"
                    onClick={() =>
                      setLines([
                        ...lines,
                        { product_id: '', quantity: 0, unit_of_measure: 'pcs', notes: '' },
                      ])
                    }
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    + Add Line
                  </button>
                </div>

                <div className="space-y-3">
                  {lines.map((line, index) => (
                    <div key={index} className="flex gap-3 items-start">
                      <select
                        value={line.product_id}
                        onChange={(e) => {
                          const newLines = [...lines];
                          newLines[index].product_id = e.target.value;
                          const product = products.find((p) => p.id === e.target.value);
                          if (product) {
                            newLines[index].unit_of_measure = product.unit_of_measure;
                          }
                          setLines(newLines);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
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
                        placeholder="Qty"
                        min="0"
                        step="0.01"
                        value={line.quantity || ''}
                        onChange={(e) => {
                          const newLines = [...lines];
                          newLines[index].quantity = Number(e.target.value);
                          setLines(newLines);
                        }}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                      <input
                        type="text"
                        placeholder="UOM"
                        value={line.unit_of_measure}
                        onChange={(e) => {
                          const newLines = [...lines];
                          newLines[index].unit_of_measure = e.target.value;
                          setLines(newLines);
                        }}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
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
                  Create Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
