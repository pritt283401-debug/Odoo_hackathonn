'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, RefreshCw } from 'lucide-react';
import { operationsApi } from '@/lib/api';

type OpType = 'RECEIPT' | 'DELIVERY' | 'TRANSFER' | 'ADJUSTMENT';

const TYPE_CONFIG: Record<OpType, { label: string; color: string }> = {
  RECEIPT:    { label: 'Receipts',    color: 'var(--primary)' },
  DELIVERY:   { label: 'Deliveries',  color: 'var(--warning)' },
  TRANSFER:   { label: 'Transfers',   color: 'var(--info)' },
  ADJUSTMENT: { label: 'Adjustments', color: 'var(--success)' },
};

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>;
}

interface OperationsListProps {
  type: OpType;
  title: string;
}

export function OperationsList({ type, title }: OperationsListProps) {
  const [ops, setOps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const cfg = TYPE_CONFIG[type];

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ type });
    if (status) params.set('status', status);
    const res: any = await operationsApi.list('?' + params);
    setOps(res.data || []);
    setLoading(false);
  }, [type, status]);

  useEffect(() => { load(); }, [load]);

  const handleValidate = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm('Validate this operation? Stock will be updated.')) return;
    try {
      await operationsApi.validate(id);
      load();
    } catch(err: any) { alert('Validation failed: ' + err.message); }
  };

  const handleCancel = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm('Cancel this operation?')) return;
    await operationsApi.cancel(id);
    load();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle" style={{ color: cfg.color }}>
            {type === 'RECEIPT' ? 'Track incoming goods from vendors' :
             type === 'DELIVERY' ? 'Outgoing stock for customer orders' :
             type === 'TRANSFER' ? 'Move stock between locations' :
             'Fix stock discrepancies'}
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-secondary" onClick={load}><RefreshCw size={14}/>Refresh</button>
          <Link href={`/operations/new?type=${type}`} className="btn btn-primary">
            <Plus size={15}/>New {TYPE_CONFIG[type].label.replace(/s$/, '')}
          </Link>
        </div>
      </div>

      <div className="page-body">
        <div className="filters-bar">
          <select className="filter-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {['DRAFT','WAITING','READY','DONE','CANCELED'].map(s =>
              <option key={s} value={s}>{s}</option>
            )}
          </select>
        </div>

        {loading ? <div className="page-loading"><div className="spinner"/></div> : (
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>Reference</th>
                <th>{type === 'TRANSFER' ? 'From → To' : type === 'RECEIPT' ? 'Destination' : 'Source'}</th>
                <th>Items</th><th>Status</th><th>Date</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {ops.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>
                    No {title.toLowerCase()} yet.{' '}
                    <Link href={`/operations/new?type=${type}`} style={{ color:'var(--primary)' }}>Create one →</Link>
                  </td></tr>
                ) : ops.map((op: any) => (
                  <tr key={op.id} style={{ cursor:'pointer' }}>
                    <td>
                      <Link href={`/operations/${op.id}`} style={{ color:'var(--primary)', fontWeight:600 }}>{op.reference}</Link>
                      {op.notes && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{op.notes}</div>}
                    </td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>
                      {type === 'TRANSFER'
                        ? <>{op.from_location_name} → {op.to_location_name}</>
                        : op.to_location_name || op.from_location_name || '—'}
                    </td>
                    <td style={{ fontWeight:500 }}>{op.item_count}</td>
                    <td><StatusBadge status={op.status} /></td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>
                      {new Date(op.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        {!['DONE','CANCELED'].includes(op.status) && (
                          <button className="btn btn-sm btn-primary"
                            onClick={(e) => handleValidate(op.id, e)}>Validate</button>
                        )}
                        {!['DONE','CANCELED'].includes(op.status) && (
                          <button className="btn btn-sm btn-danger"
                            onClick={(e) => handleCancel(op.id, e)}>Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
