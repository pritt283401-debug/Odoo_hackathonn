'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Box, ArrowDownToLine, ArrowUpToLine, ArrowLeftRight,
  History, Settings, User, ChevronUp, ClipboardCheck, LogOut
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', href: '/products', icon: Box },
  { label: 'Receipts', href: '/operations/receipts', icon: ArrowDownToLine },
  { label: 'Delivery Orders', href: '/operations/deliveries', icon: ArrowUpToLine },
  { label: 'Inventory Adjustment', href: '/operations/adjustments', icon: ClipboardCheck },
  { label: 'Internal Transfers', href: '/operations/transfers', icon: ArrowLeftRight },
  { label: 'Move History', href: '/history', icon: History },
  { label: 'Settings', href: '/settings/warehouses', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem('ci_user') || 'null')); } catch {}
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.sidebar-footer')) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowProfileMenu(false);
    localStorage.removeItem('ci_token');
    localStorage.removeItem('ci_user');
    router.push('/login');
  };

  const handleProfileClick = () => {
    setShowProfileMenu(false);
    router.push('/profile');
  };

  return (
    <aside className="sidebar">
      {/* Logo - Clickable */}
      <Link href="/dashboard" style={{ textDecoration: 'none' }}>
        <div className="sidebar-header" style={{ cursor: 'pointer' }}>
          <span className="sidebar-logo-text">CoreInventory</span>
          <span className="sidebar-logo-sub">Inventory Management</span>
        </div>
      </Link>

      {/* Navigation */}
      <div className="sidebar-nav">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              style={{ padding: '10px 14px', marginBottom: 6, fontWeight: isActive ? 600 : 400 }}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Footer Profile */}
      <div 
        className="sidebar-footer" 
        style={{ position: 'relative', cursor: 'pointer' }}
        onClick={() => setShowProfileMenu(!showProfileMenu)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <User size={20} style={{ color: 'var(--text-muted)' }} />
          <span>{user?.name || 'Profile'}</span>
        </div>
        <div style={{ 
          transform: showProfileMenu ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease'
        }}>
          <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} />
        </div>
        
        {showProfileMenu && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '8px 0',
            marginBottom: '8px',
            boxShadow: 'var(--shadow)',
            zIndex: 1000
          }}>
            <div
              style={{
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                color: 'var(--text)',
                fontSize: '14px'
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleProfileClick();
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <User size={16} style={{ color: 'var(--text-muted)' }} />
              My Profile
            </div>
            <div
              style={{
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                color: 'var(--danger)',
                fontSize: '14px'
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--danger-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <LogOut size={16} />
              Logout
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
