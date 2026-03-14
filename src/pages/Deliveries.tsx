import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Eye, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Delivery {
  id: string;
  delivery_number: string;
  warehouse_id: string;
  customer_name: string;
  status: string;
  delivery_date: string;
  notes: string;
  warehouse?: { name: string };
}

interface DeliveryLine {
  id?: string;
  product_id: string;
  quantity: number;
  unit_of_measure: string;
  notes: string;
  product?: { name: string; sku: string };
}

interface Product {
  id: string;
  name: string;
  sku: string;
  unit_of_measure: string;
}

interface Warehouse {
  id: string;
  name: string;
}

export function Deliveries() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [viewingDelivery, setViewingDelivery] = useState<Delivery | null>(null);
  const [deliveryLines, setDeliveryLines] = useState<DeliveryLine[]>([]);

  const [formData, setFormData] = useState({
    warehouse_id: '',
    customer_name: '',
    delivery_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [lines, setLines] = useState<DeliveryLine[]>([
    { product_id: '', quantity: 0, unit_of_measure: 'pcs', notes: '' },
  ]);

  useEffect(() => {
    loadDeliveries();
    loadProducts();
    loadWarehouses();
  }, []);

  const loadDeliveries = async () => {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select(
          `
          *,
          warehouse:warehouses(name)
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeliveries(data || []);
    } catch (error) {
      console.error('Error loading deliveries:', error);
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

    if (lines.filter((l) => l.product_id && l.quantity > 0).length === 0) {
      alert('Please add at least one product line');
      return;
    }

    try {
      const { data: deliveryNumber } = await supabase.rpc('generate_document_number', {
        prefix: 'DEL',
      });

      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .insert([
          {
            delivery_number: deliveryNumber,
            ...formData,
            created_by: user?.id,
          },
        ])
        .select()
        .single();

      if (deliveryError) throw deliveryError;

      const validLines = lines
        .filter((l) => l.product_id && l.quantity > 0)
        .map((line) => ({
          delivery_id: delivery.id,
          product_id: line.product_id,
          quantity: line.quantity,
          unit_of_measure: line.unit_of_measure,
          notes: line.notes,
        }));

      const { error: linesError } = await supabase.from('delivery_lines').insert(validLines);

      if (linesError) throw linesError;

      setShowModal(false);
      resetForm();
      loadDeliveries();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleValidate = async (delivery: Delivery) => {
    if (!confirm('Validate this delivery? This will decrease stock levels.')) return;

    try {
      const { data: lines, error: linesError } = await supabase
        .from('delivery_lines')
        .select('*')
        .eq('delivery_id', delivery.id);

      if (linesError) throw linesError;

      for (const line of lines || []) {
        await supabase.rpc('update_stock_location', {
          p_product_id: line.product_id,
          p_warehouse_id: delivery.warehouse_id,
          p_quantity: -line.quantity,
        });

        await supabase.from('stock_moves').insert({
          product_id: line.product_id,
          warehouse_id: delivery.warehouse_id,
          quantity: -line.quantity,
          move_type: 'delivery',
          reference_type: 'deliveries',
          reference_id: delivery.id,
          reference_number: delivery.delivery_number,
          created_by: user?.id,
        });
      }

      await supabase
        .from('deliveries')
        .update({
          status: 'done',
          validated_at: new Date().toISOString(),
          validated_by: user?.id,
        })
        .eq('id', delivery.id);

      loadDeliveries();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleCancel = async (delivery: Delivery) => {
    if (!confirm('Cancel this delivery?')) return;

    try {
      await supabase.from('deliveries').update({ status: 'canceled' }).eq('id', delivery.id);
      loadDeliveries();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleView = async (delivery: Delivery) => {
    try {
      const { data, error } = await supabase
        .from('delivery_lines')
        .select(
          `
          *,
          product:products(name, sku)
        `
        )
        .eq('delivery_id', delivery.id);

      if (error) throw error;
      setDeliveryLines(data || []);
      setViewingDelivery(delivery);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      warehouse_id: '',
      customer_name: '',
      delivery_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setLines([{ product_id: '', quantity: 0, unit_of_measure: 'pcs', notes: '' }]);
  };

  const addLine = () => {
    setLines([...lines, { product_id: '', quantity: 0, unit_of_measure: 'pcs', notes: '' }]);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof DeliveryLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };

    if (field === 'product_id' && value) {
      const product = products.find((p) => p.id === value);
      if (product) {
        newLines[index].unit_of_measure = product.unit_of_measure;
      }
    }

    setLines(newLines);
  };

  const filteredDeliveries = deliveries.filter((delivery) => {
    const matchesSearch =
      delivery.delivery_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.customer_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || delivery.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      waiting: 'bg-blue-100 text-blue-800',
      ready: 'bg-amber-100 text-amber-800',
      done: 'bg-green-100 text-green-800',
      canceled: 'bg-red-100 text-red-800',
    };
    return styles[status as keyof typeof styles] || styles.draft;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading deliveries...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Delivery Orders</h1>
          <p className="text-gray-600 mt-1">Outgoing stock management</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
        >
          <Plus className="h-5 w-5" />
          <span>New Delivery</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search deliveries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="waiting">Waiting</option>
              <option value="ready">Ready</option>
              <option value="done">Done</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Delivery #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Warehouse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No deliveries found
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {delivery.delivery_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {delivery.customer_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {delivery.warehouse?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(delivery.delivery_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(
                          delivery.status
                        )}`}
                      >
                        {delivery.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleView(delivery)}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        <Eye className="h-4 w-4 inline" />
                      </button>
                      {delivery.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleValidate(delivery)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Check className="h-4 w-4 inline" />
                          </button>
                          <button
                            onClick={() => handleCancel(delivery)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <X className="h-4 w-4 inline" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 my-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">New Delivery Order</h2>

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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.customer_name}
                    onChange={(e) =>
                      setFormData({ ...formData, customer_name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.delivery_date}
                    onChange={(e) =>
                      setFormData({ ...formData, delivery_date: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Products *</label>
                  <button
                    type="button"
                    onClick={addLine}
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
                        onChange={(e) => updateLine(index, 'product_id', e.target.value)}
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
                        onChange={(e) =>
                          updateLine(index, 'quantity', Number(e.target.value))
                        }
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                      <input
                        type="text"
                        placeholder="UOM"
                        value={line.unit_of_measure}
                        onChange={(e) => updateLine(index, 'unit_of_measure', e.target.value)}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                      {lines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
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
                  Create Delivery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Delivery Details: {viewingDelivery.delivery_number}
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Customer</p>
                <p className="font-medium">{viewingDelivery.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Warehouse</p>
                <p className="font-medium">{viewingDelivery.warehouse?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Date</p>
                <p className="font-medium">
                  {new Date(viewingDelivery.delivery_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span
                  className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                    viewingDelivery.status
                  )}`}
                >
                  {viewingDelivery.status}
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Products</h3>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                      Product
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">SKU</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                      Quantity
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">UOM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {deliveryLines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3 text-sm">{line.product?.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{line.product?.sku}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {line.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm">{line.unit_of_measure}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setViewingDelivery(null)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
