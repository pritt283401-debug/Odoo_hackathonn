'use client';

import { useEffect, useState } from 'react';
import { User, Mail, Shield, Calendar } from 'lucide-react';
import { authApi } from '@/lib/api';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    authApi.me()
      .then((res: any) => {
        setUser(res.user);
        setLoading(false);
      })
      .catch((err: any) => {
        setError(err.message || 'Failed to load profile');
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="page-content">
      <div className="page-header"><h1 className="page-title">Profile</h1></div>
      <div className="page-body"><div className="page-loading"><div className="spinner"/></div></div>
    </div>
  );

  if (error) return (
    <div className="page-content">
      <div className="page-header"><h1 className="page-title">Profile</h1></div>
      <div className="page-body">
        <div className="alert alert-error">{error}</div>
      </div>
    </div>
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Profile</h1>
          <p className="page-subtitle">Manage your account settings</p>
        </div>
      </div>
      
      <div className="page-body">
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '24px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', 
              backgroundColor: 'var(--primary)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', fontWeight: 'bold'
            }}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 4px 0' }}>{user?.name}</h2>
              <span className={`badge badge-${user?.role?.toLowerCase() === 'manager' ? 'primary' : 'gray'}`}>
                {user?.role}
              </span>
            </div>
          </div>
          
          <div style={{ display: 'grid', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <User style={{ color: 'var(--text-muted)' }} size={20} />
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Full Name</div>
                <div style={{ fontWeight: '500' }}>{user?.name}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Mail style={{ color: 'var(--text-muted)' }} size={20} />
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Email Address</div>
                <div style={{ fontWeight: '500' }}>{user?.email}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Shield style={{ color: 'var(--text-muted)' }} size={20} />
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Role</div>
                <div style={{ fontWeight: '500' }}>{user?.role}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Calendar style={{ color: 'var(--text-muted)' }} size={20} />
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Account Created</div>
                <div style={{ fontWeight: '500' }}>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
