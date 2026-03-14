'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Package, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { authApi } from '@/lib/api';

type Step = 'email' | 'otp' | 'done';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res: any = await authApi.forgotPassword({ email });
      if (res.otp) setDevOtp(res.otp); // dev mode only
      setStep('otp');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await authApi.resetPassword({ email, otp, password });
      setStep('done');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-box"><Package size={22} color="#fff" /></div>
          <span className="auth-logo-name">CoreInventory</span>
        </div>

        {step === 'done' ? (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <CheckCircle size={48} color="var(--success)" style={{ margin:'0 auto 16px' }} />
            <h2 style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Password reset!</h2>
            <p style={{ color:'var(--text-muted)', marginBottom:24 }}>Your password has been updated successfully.</p>
            <Link href="/login" className="btn btn-primary" style={{ display:'inline-flex' }}>Back to Login</Link>
          </div>
        ) : step === 'email' ? (
          <>
            <h1 className="auth-title">Forgot password?</h1>
            <p className="auth-sub">Enter your email to receive a reset OTP</p>
            {error && <div className="alert alert-error mb-4"><AlertCircle size={15}/>{error}</div>}
            <form onSubmit={requestOtp} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input type="email" className="form-input" required value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={loading}
                style={{ justifyContent:'center', padding:'11px 16px' }}>
                {loading ? <><span className="spinner" style={{width:16,height:16}}/> Sending…</> : 'Send OTP'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="auth-title">Reset password</h1>
            <p className="auth-sub">Enter the OTP sent to <strong>{email}</strong></p>
            {devOtp && (
              <div className="alert alert-warning mb-4">
                <AlertCircle size={15}/>Dev mode OTP: <strong>{devOtp}</strong>
              </div>
            )}
            {error && <div className="alert alert-error mb-4"><AlertCircle size={15}/>{error}</div>}
            <form onSubmit={resetPassword} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div className="form-group">
                <label className="form-label">OTP Code</label>
                <input type="text" className="form-input" maxLength={6} required value={otp}
                  onChange={e => setOtp(e.target.value)} placeholder="123456"
                  style={{ letterSpacing:'0.3em', fontSize:20, textAlign:'center' }} />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input type="password" className="form-input" minLength={6} required value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={loading}
                style={{ justifyContent:'center', padding:'11px 16px' }}>
                {loading ? <><span className="spinner" style={{width:16,height:16}}/> Resetting…</> : 'Reset Password'}
              </button>
              <button type="button" className="btn btn-ghost w-full"
                style={{ justifyContent:'center', gap:6 }} onClick={() => setStep('email')}>
                <ArrowLeft size={14}/> Back
              </button>
            </form>
          </>
        )}

        <p className="auth-footer"><Link href="/login">Back to login</Link></p>
      </div>
    </div>
  );
}
