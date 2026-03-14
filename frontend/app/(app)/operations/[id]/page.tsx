'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, Package } from 'lucide-react';
import { operationsApi } from '@/lib/api';

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>;
}
function TypeBadge({ type }: { type: string }) {
  const lbl: any = { RECEIPT:'Receipt', DELIVERY:'Delivery', TRANSFER:'Transfer', ADJUSTMENT:'Adjustment' };
  return <span className={`badge badge-${type.toLowerCase()}`}>{lbl[type] || type}</span>;
}

export default function OperationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [op, setOp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await operationsApi.get(id);
      setOp(res.data);
    } catch { setError('Operation not found'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleValidate = async () => {
    if (!confirm('Validate this operation? Stock will be updated immediately.')) return;
    setValidating(true); setError('');
    try {
      await operationsApi.validate(id);
      load();
    } catch(err: any) { setError(err.message); }
    finally { setValidating(false); }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel this operation?')) return;
    await operationsApi.cancel(id);
    load();
  };

  if (loading) return (
    <div className="page-loading" style={{ height:'100vh' }}><div className="spinner"/></div>
  );
  if (!op) return (
    <div style={{ padding:40, color:'var(--text-muted)', textAlign:'center' }}>Operation not found.</div>
  );

  const canAct = !['DONE','CANCELED'].includes(op.status);

  return (
    <>
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => router.back()}><ArrowLeft size={18}/></button>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <h1 className="page-title">{op.reference}</h1>
              <TypeBadge type={op.type} />
              <StatusBadge status={op.status} />
            </div>
            <p className="page-subtitle">Responsible: {op.responsible_name}</p>
          </div>
        </div>
        {canAct && (
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-danger" onClick={handleCancel}><XCircle size={15}/> Cancel</button>
            <button className="btn btn-primary" onClick={handleValidate} disabled={validating}>
              {validating ? <><span className="spinner" style={{width:14,height:14}}/> Validating…</> : <><CheckCircle size={15}/> Validate</>}
            </button>
          </div>
        )}
      </div>

      <div className="page-body">
        {error && <div className="alert alert-error mb-4">{error}</div>}
        {op.status === 'DONE' && (
          <div className="alert alert-success mb-4">
            <CheckCircle size={15}/> Operation validated on {op.effective_date ? new Date(op.effective_date).toLocaleString() : '—'}. Stock has been updated.
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
          <div className="card">
            <h3 style={{ fontSize:13, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:14 }}>Details</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[
                ['Type',        <TypeBadge key="t" type={op.type} />],
                ['Status',      <StatusBadge key="s" status={op.status} />],
                ['From',        op.from_location_name || '—'],
                ['To',          op.to_location_name || '—'],
                ['Responsible', op.responsible_name],
                ['Created',     new Date(op.created_at).toLocaleString()],
                ['Effective',   op.effective_date ? new Date(op.effective_date).toLocaleString() : '—'],
              ].map(([label, value]) => (
                <div key={String(label)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:10, borderBottom:'1px solid var(--border)' }}>
                  <span style={{ color:'var(--text-muted)', fontSize:13 }}>{label}</span>
                  <span style={{ fontWeight:500, fontSize:13 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {op.notes && (
            <div className="card">
              <h3 style={{ fontSize:13, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:10 }}>Notes</h3>
              <p style={{ color:'var(--text-muted)', fontSize:14, lineHeight:1.7 }}>{op.notes}</p>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontSize:13, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:14 }}>
            Items ({op.items?.length || 0})
          </h3>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Product</th><th>SKU</th><th>UOM</th>
                <th>Demanded</th><th>Done</th>
              </tr></thead>
              <tbody>
                {(op.items || []).map((item: any) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight:500 }}>{item.product_name}</td>
                    <td><span style={{ fontFamily:'monospace', fontSize:12, background:'var(--bg-input)', padding:'2px 6px', borderRadius:4 }}>{item.sku}</span></td>
                    <td style={{ color:'var(--text-muted)', fontSize:12 }}>{item.uom}</td>
                    <td>{Number(item.quantity_demand).toLocaleString()}</td>
                    <td style={{ fontWeight:600, color: item.quantity_done > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                      {Number(item.quantity_done).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
