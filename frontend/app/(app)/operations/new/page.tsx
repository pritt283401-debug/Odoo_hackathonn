'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { operationsApi, productsApi, warehousesApi } from '@/lib/api';

type OpType = 'RECEIPT' | 'DELIVERY' | 'TRANSFER' | 'ADJUSTMENT';

const TYPE_CONFIG: Record<OpType, {
  label: string;
  needsFrom: boolean;
  needsTo: boolean;
  fromLabel: string;
  toLabel: string;
}> = {
  RECEIPT:    { label:'Receipt',    needsFrom:false, needsTo:true,  fromLabel:'Vendor',      toLabel:'Destination Location' },
  DELIVERY:   { label:'Delivery',   needsFrom:true,  needsTo:false, fromLabel:'Source Location', toLabel:'Customer' },
  TRANSFER:   { label:'Transfer',   needsFrom:true,  needsTo:true,  fromLabel:'From Location', toLabel:'To Location' },
  ADJUSTMENT: { label:'Adjustment', needsFrom:false, needsTo:true,  fromLabel:'',            toLabel:'Stock Location' },
};

function NewOperationForm() {
  const params   = useSearchParams();
  const router   = useRouter();
  const opType   = (params.get('type') || 'RECEIPT') as OpType;
  const cfg      = TYPE_CONFIG[opType];

  const [locations, setLocations] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [fromLocId, setFromLocId] = useState('');
  const [toLocId,   setToLocId]   = useState('');
  const [notes,     setNotes]     = useState('');
  const [items,     setItems]     = useState([{ product_id:'', quantity_demand:1 }]);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    warehousesApi.allLocations().then((r: any) => setLocations(r.data || []));
    productsApi.list('?limit=200').then((r: any) => setAllProducts(r.data || []));
  }, []);

  const stockLocations   = locations.filter(l => l.type === 'STOCK');
  const vendorLocations  = locations.filter(l => l.type === 'VENDOR');
  const customerLocations = locations.filter(l => l.type === 'CUSTOMER');
  const fromOptions      = opType === 'RECEIPT' ? vendorLocations : stockLocations;
  const toOptions        = opType === 'DELIVERY' ? customerLocations : stockLocations;

  const addItem = () => setItems(p => [...p, { product_id:'', quantity_demand:1 }]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: any) =>
    setItems(p => p.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      const payload: any = {
        type: opType, notes, items,
        from_location_id: fromLocId || undefined,
        to_location_id:   toLocId   || undefined,
      };
      const res: any = await operationsApi.create(payload);
      router.push(`/operations/${res.data.id}`);
    } catch(err: any) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  const typeColors: Record<OpType, string> = {
    RECEIPT: 'var(--primary)', DELIVERY: 'var(--warning)',
    TRANSFER: 'var(--info)', ADJUSTMENT: 'var(--success)',
  };

  return (
    <>
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button className="btn btn-ghost btn-icon" type="button" onClick={() => router.back()}><ArrowLeft size={18}/></button>
          <div>
            <h1 className="page-title">New {cfg.label}</h1>
            <p className="page-subtitle" style={{ color: typeColors[opType] }}>Create a new {cfg.label.toLowerCase()} operation</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ maxWidth:720 }}>
          {error && <div className="alert alert-error mb-4">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="card" style={{ marginBottom:16 }}>
              <h3 style={{ fontSize:14, fontWeight:600, marginBottom:16, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>Operation Details</h3>
              <div className="form-row" style={{ marginBottom:14 }}>
                {cfg.needsFrom && (
                  <div className="form-group">
                    <label className="form-label">{cfg.fromLabel} *</label>
                    <select className="form-input" required value={fromLocId}
                      onChange={e => setFromLocId(e.target.value)}>
                      <option value="">Select location</option>
                      {fromOptions.map(l => (
                        <option key={l.id} value={l.id}>{l.warehouse_name ? `${l.warehouse_name} – ` : ''}{l.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {cfg.needsTo && (
                  <div className="form-group">
                    <label className="form-label">{cfg.toLabel} *</label>
                    <select className="form-input" required value={toLocId}
                      onChange={e => setToLocId(e.target.value)}>
                      <option value="">Select location</option>
                      {toOptions.map(l => (
                        <option key={l.id} value={l.id}>{l.warehouse_name ? `${l.warehouse_name} – ` : ''}{l.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <textarea className="form-input" rows={2} value={notes}
                  onChange={e => setNotes(e.target.value)} placeholder="Internal notes…" />
              </div>
            </div>

            <div className="card" style={{ marginBottom:16 }}>
              <div className="section-header">
                <h3 style={{ fontSize:14, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>
                  Items ({items.length})
                </h3>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}><Plus size={13}/>Add Item</button>
              </div>

              {/* Header row */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 150px 36px', gap:8, marginBottom:6 }}>
                <span style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', color:'var(--text-dim)' }}>Product</span>
                <span style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', color:'var(--text-dim)' }}>
                  {opType === 'ADJUSTMENT' ? 'Target Quantity' : 'Quantity'}
                </span>
                <span></span>
              </div>

              {items.map((item, i) => (
                <div key={i} className="item-row" style={{ marginBottom:8 }}>
                  <select className="form-input" required value={item.product_id}
                    onChange={e => updateItem(i, 'product_id', e.target.value)}>
                    <option value="">Select product</option>
                    {allProducts.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                  <input type="number" className="form-input" min={0} step="any" required
                    value={item.quantity_demand}
                    onChange={e => updateItem(i, 'quantity_demand', e.target.value)} />
                  <button type="button" className="btn btn-danger btn-icon btn-sm" disabled={items.length === 1}
                    onClick={() => removeItem(i)}><Trash2 size={13}/></button>
                </div>
              ))}

              {opType === 'ADJUSTMENT' && (
                <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:8, background:'var(--bg-input)', padding:'8px 10px', borderRadius:'var(--radius-sm)' }}>
                  💡 For adjustments, enter the <strong>new physical count</strong>. The system will calculate the difference automatically.
                </p>
              )}
            </div>

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="spinner" style={{width:14,height:14}}/> Creating…</> : `Create ${cfg.label}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export default function NewOperationPage() {
  return (
    <Suspense fallback={<div className="page-loading"><div className="spinner"/></div>}>
      <NewOperationForm />
    </Suspense>
  );
}
