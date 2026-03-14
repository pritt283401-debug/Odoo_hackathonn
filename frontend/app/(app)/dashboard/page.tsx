'use client';
import { useEffect, useState } from 'react';
import {
  Package, AlertTriangle, ArrowDownToLine, ArrowUpToLine, ArrowLeftRight, TrendingUp, Plus
} from 'lucide-react';
import { dashboardApi } from '@/lib/api';
import Link from 'next/link';

function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>;
}
function TypeBadge({ type }: { type: string }) {
  const labels: any = { RECEIPT:'Receipt', DELIVERY:'Delivery', TRANSFER:'Transfer', ADJUSTMENT:'Adjustment' };
  return <span className={`badge badge-${type.toLowerCase()}`}>{labels[type] || type}</span>;
}

function KpiCard({ icon: Icon, label, value, colorClass }: {
  icon: any; label: string; value: string | number; colorClass: string;
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-top">
        <div className="kpi-card-label">{label}</div>
        <div className={`kpi-card-icon ${colorClass}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="kpi-card-value count-in">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.get().then((r: any) => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-content">
      <div className="page-header"><h1 className="page-title">Dashboard</h1></div>
      <div className="page-body"><div className="page-loading"><div className="spinner"/></div></div>
    </div>
  );

  const kpis = data?.kpis || {};
  const recentOps: any[] = data?.recent_operations || [];

  return (
    <>
      <div className="page-header" style={{ alignItems: 'flex-start', paddingTop: 32, height: 'auto', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your inventory operations</p>
        </div>
      </div>
      
      <div className="page-body" style={{ paddingTop: 0 }}>
        {/* Low stock alert */}
        {kpis.low_stock_count > 0 && (
          <div className="lowstock-banner">
            <AlertTriangle size={18} />
            <div style={{ flex: 1 }}>
              <strong>{kpis.low_stock_count} product{kpis.low_stock_count>1?'s':''}</strong> are below minimum stock levels.
              {kpis.out_of_stock_count > 0 && <span> ({kpis.out_of_stock_count} out of stock)</span>}
            </div>
            <Link href="/products?lowStock=true" style={{ color:'#92400e', fontWeight:600, textDecoration:'underline' }}>View items →</Link>
          </div>
        )}

        {/* KPIs (3x2 Grid) */}
        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          <KpiCard icon={Package}       label="Total Products"       value={kpis.total_products ?? 0}     colorClass="icon-blue" />
          <KpiCard icon={AlertTriangle} label="Low Stock Items"      value={kpis.low_stock_count ?? 0}    colorClass="icon-orange" />
          <KpiCard icon={AlertTriangle} label="Out of Stock"         value={kpis.out_of_stock_count ?? 0} colorClass="icon-red" />
          
          <KpiCard icon={ArrowDownToLine} label="Pending Receipts"   value={kpis.pending_receipts ?? 0}   colorClass="icon-green" />
          <KpiCard icon={ArrowUpToLine}   label="Pending Deliveries" value={kpis.pending_deliveries ?? 0} colorClass="icon-orange" />
          <KpiCard icon={ArrowLeftRight}  label="Scheduled Transfers"value={kpis.pending_transfers ?? 0}  colorClass="icon-teal" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, paddingBottom: 32 }}>
          {/* Recent Activity */}
          <div className="card">
            <div className="section-header">
              <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={18} color="var(--text-muted)" />
                Recent Activity
              </h2>
            </div>
            {recentOps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                No recent activity
              </div>
            ) : (
              <div className="table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
                <table>
                  <thead><tr>
                    <th>Reference</th><th>Type</th><th>Status</th><th>Date</th>
                  </tr></thead>
                  <tbody>
                    {recentOps.map((op: any) => (
                      <tr key={op.id}>
                        <td><Link href={`/operations/${op.id}`} style={{ color:'var(--primary)', fontWeight:500 }}>{op.reference}</Link></td>
                        <td><TypeBadge type={op.type} /></td>
                        <td><StatusBadge status={op.status} /></td>
                        <td style={{ fontSize:12, color:'var(--text-muted)' }}>
                          {new Date(op.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="section-header">
              <h2 className="section-title">Quick Actions</h2>
            </div>
            <div className="dash-grid-2">
              <Link href="/operations/receipts?new=true" className="quick-action-btn">
                <ArrowDownToLine size={20} />
                New Receipt
              </Link>
              <Link href="/operations/deliveries?new=true" className="quick-action-btn">
                <ArrowUpToLine size={20} />
                New Delivery
              </Link>
              <Link href="/products?new=true" className="quick-action-btn">
                <Package size={20} />
                Add Product
              </Link>
              <Link href="/operations/transfers?new=true" className="quick-action-btn">
                <ArrowLeftRight size={20} />
                New Transfer
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
