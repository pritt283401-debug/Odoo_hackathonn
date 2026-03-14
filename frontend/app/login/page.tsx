'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { authApi } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res: any = await authApi.login(form);
      localStorage.setItem('ci_token', res.token);
      localStorage.setItem('ci_user', JSON.stringify(res.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-box"><Package size={22} color="#fff" /></div>
          <span className="auth-logo-name">CoreInventory</span>
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to your inventory dashboard</p>

        {error && (
          <div className="alert alert-error mb-4">
            <AlertCircle size={15} />{error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              type="email" className="form-input" placeholder="you@company.com"
              value={form.email} required
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position:'relative' }}>
              <input
                type={showPw ? 'text' : 'password'} className="form-input"
                placeholder="••••••••" value={form.password} required
                style={{ paddingRight: 40 }}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              />
              <button type="button"
                onClick={() => setShowPw(v => !v)}
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div style={{ textAlign:'right' }}>
              <Link href="/forgot-password" style={{ fontSize:12, color:'var(--primary)' }}>Forgot password?</Link>
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={loading}
            style={{ justifyContent:'center', padding:'11px 16px', fontSize:14, marginTop:8 }}>
            {loading ? <><span className="spinner" style={{width:16,height:16}} /> Signing in…</> : 'Sign in'}
          </button>
        </form>

        <p className="auth-footer" style={{ marginTop:24 }}>
          Don't have an account? <Link href="/signup">Create one</Link>
        </p>
      </div>
    </div>
  );
}
