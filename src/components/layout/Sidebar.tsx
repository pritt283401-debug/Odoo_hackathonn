import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightLeft,
  History,
  Settings,
  User,
  LogOut,
  ChevronDown,
  ClipboardList,
} from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function Sidebar({ currentPage, onNavigate, onLogout }: SidebarProps) {
  const [operationsOpen, setOperationsOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Package },
  ];

  const operationItems = [
    { id: 'receipts', label: 'Receipts', icon: ArrowDownToLine },
    { id: 'deliveries', label: 'Delivery Orders', icon: ArrowUpFromLine },
    { id: 'adjustments', label: 'Inventory Adjustment', icon: ClipboardList },
    { id: 'transfers', label: 'Internal Transfers', icon: ArrowRightLeft },
    { id: 'moves', label: 'Move History', icon: History },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">CoreInventory</h1>
        <p className="text-xs text-gray-500 mt-1">Inventory Management</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                currentPage === item.id
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </button>
          );
        })}

        <div className="pt-2">
          <button
            onClick={() => setOperationsOpen(!operationsOpen)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <span>Operations</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${operationsOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {operationsOpen && (
            <div className="mt-1 space-y-1 ml-2">
              {operationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === item.id
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            currentPage === 'settings'
              ? 'bg-gray-900 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </button>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <User className="h-5 w-5" />
            <span>Profile</span>
          </div>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {profileOpen && (
          <div className="mt-1 space-y-1">
            <button
              onClick={() => onNavigate('profile')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                currentPage === 'profile'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <User className="h-5 w-5" />
              <span>My Profile</span>
            </button>
            <button
              onClick={onLogout}
              className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
