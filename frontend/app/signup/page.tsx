'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/lib/api';

// Password strength checker
function calculatePasswordStrength(password: string): { score: number; color: string; label: string } {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 2) return { score, color: '#ef4444', label: 'Weak' };
  if (score <= 3) return { score, color: '#f97316', label: 'Fair' };
  if (score <= 4) return { score, color: '#eab308', label: 'Good' };
  return { score, color: '#22c55e', label: 'Strong' };
}

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '+91 ',
    password: '',
    role: 'STAFF'
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [strength, setStrength] = useState({ score: 0, color: '#e2e8f0', label: '' });

  useEffect(() => {
    setStrength(calculatePasswordStrength(form.password));
  }, [form.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (strength.score < 2) {
      setError('Please use a stronger password');
      return;
    }
    
    setLoading(true);
    try {
      const res: any = await authApi.signup({
        name: `${form.firstName} ${form.lastName}`,
        email: form.email,
        password: form.password,
        role: form.role,
        mobile: form.mobile
      });
      localStorage.setItem('ci_token', res.token);
      localStorage.setItem('ci_user', JSON.stringify(res.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card" style={{ maxWidth: '480px' }}>
        <div className="auth-logo">
          <div className="auth-logo-box"><Package size={22} color="#fff" /></div>
          <span className="auth-logo-name">CoreInventory</span>
        </div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Start managing your inventory today</p>

        {error && (
          <div className="alert alert-error mb-4"><AlertCircle size={15} />{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* First Name & Last Name */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="form-group">
              <label className="form-label">First Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="John" 
                required
                value={form.firstName} 
                onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Doe" 
                required
                value={form.lastName} 
                onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} 
              />
            </div>
          </div>

          {/* Email & Mobile */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="you@company.com" 
                required
                value={form.email} 
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select 
                  className="form-input" 
                  style={{ width: '90px', flexShrink: 0, fontSize: '13px' }}
                  value={form.mobile.split(' ')[0]}
                  onChange={e => {
                    const number = form.mobile.split(' ').slice(1).join(' ');
                    setForm(p => ({ ...p, mobile: `${e.target.value} ${number}` }));
                  }}
                >
                  <option value="+91">IN +91</option>
                  <option value="+1">US +1</option>
                  <option value="+44">UK +44</option>
                  <option value="+61">AU +61</option>
                  <option value="+86">CN +86</option>
                  <option value="+81">JP +81</option>
                  <option value="+49">DE +49</option>
                  <option value="+33">FR +33</option>
                  <option value="+7">RU +7</option>
                  <option value="+65">SG +65</option>
                  <option value="+971">AE +971</option>
                  <option value="+92">PK +92</option>
                  <option value="+880">BD +880</option>
                  <option value="+94">LK +94</option>
                  <option value="+977">NP +977</option>
                </select>
                <input 
                  type="tel" 
                  className="form-input" 
                  placeholder="98765 43210" 
                  required
                  style={{ flex: 1 }}
                  value={form.mobile.split(' ').slice(1).join(' ')} 
                  onChange={e => {
                    const code = form.mobile.split(' ')[0];
                    setForm(p => ({ ...p, mobile: `${code} ${e.target.value}` }));
                  }}
                />
              </div>
            </div>
          </div>

          {/* Password with Strength Indicator */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position:'relative' }}>
              <input 
                type={showPw ? 'text' : 'password'} 
                className="form-input" 
                placeholder="Create strong password" 
                required 
                minLength={6}
                style={{ paddingRight: 40 }}
                value={form.password} 
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))} 
              />
              <button type="button"
                onClick={() => setShowPw(v => !v)}
                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            
            {/* Password Strength Bar */}
            <div style={{ marginTop: 8 }}>
              <div style={{ 
                display: 'flex', 
                gap: 4, 
                height: 4,
                marginBottom: 6,
                borderRadius: 2,
                overflow: 'hidden'
              }}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    style={{
                      flex: 1,
                      height: '100%',
                      backgroundColor: strength.score >= level ? strength.color : '#e2e8f0',
                      transition: 'background-color 0.3s ease, transform 0.2s ease',
                      transform: strength.score >= level ? 'scaleY(1)' : 'scaleY(0.7)',
                      borderRadius: 1
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: strength.color, fontWeight: 500 }}>
                  {form.password && strength.label}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  Min 6 chars • Uppercase • Number • Special char
                </span>
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-input" value={form.role}
              onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="STAFF">Warehouse Staff</option>
              <option value="MANAGER">Inventory Manager</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary w-full" disabled={loading}
            style={{ justifyContent:'center', padding:'11px 16px', marginTop:4 }}>
            {loading ? <><span className="spinner" style={{width:16,height:16}} /> Creating…</> : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer" style={{ marginTop:20 }}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
