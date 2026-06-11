import React from 'react';
import { 
  BarChart3, Users, Network, Key, Gift, AlertCircle, ShoppingBag, 
  HelpCircle, ShieldCheck, Database, Sliders, Menu, X, Landmark, Globe, LogOut, UserCheck,
  Sun, Moon, Cpu
} from 'lucide-react';
import { Tenant } from '../types';

interface SidebarProps {
  tenants: Tenant[];
  selectedTenant: Tenant;
  onSelectTenant: (tenant: Tenant) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: string;
  setUserRole: (role: string) => void;
  currentUser?: { fullName: string; email: string; role: string; tenantId: string } | null;
  onLogout?: () => void;
  theme: 'light' | 'dark' | 'auto';
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  isDark: boolean;
}

export default function Sidebar({
  tenants,
  selectedTenant,
  onSelectTenant,
  activeTab,
  setActiveTab,
  userRole,
  setUserRole,
  currentUser,
  onLogout,
  theme,
  setTheme,
  isDark
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Define sidebar menu options based on role permissions
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['Super Admin', 'Tenant Owner', 'Manager', 'Support Agent'] },
    { id: 'admin-users', label: 'Admin Directory', icon: UserCheck, roles: ['Super Admin', 'Tenant Owner', 'Manager'] },
    { id: 'customers', label: 'Customers', icon: Users, roles: ['Super Admin', 'Tenant Owner', 'Manager', 'Support Agent'] },
    { id: 'packages', label: 'Internet Packages', icon: Sliders, roles: ['Super Admin', 'Tenant Owner', 'Manager'] },
    { id: 'mpesa', label: 'M-Pesa Core Billing', icon: Landmark, roles: ['Super Admin', 'Tenant Owner', 'Manager'] },
    { id: 'mikrotik', label: 'MikroTik & RADIUS', icon: Network, roles: ['Super Admin', 'Tenant Owner', 'Manager'] },
    { id: 'vouchers', label: 'Vouchers Manager', icon: Gift, roles: ['Super Admin', 'Tenant Owner', 'Manager', 'Reseller'] },
    { id: 'resellers', label: 'Resellers (Agents)', icon: ShoppingBag, roles: ['Super Admin', 'Tenant Owner'] },
    { id: 'captive', label: 'Captive Portal Design', icon: Globe, roles: ['Super Admin', 'Tenant Owner'] },
    { id: 'customer-portal', label: 'My Customer Portal', icon: ShieldCheck, roles: ['Super Admin', 'Tenant Owner', 'Customer'] },
    { id: 'support', label: 'Support Center', icon: HelpCircle, roles: ['Super Admin', 'Tenant Owner', 'Manager', 'Support Agent', 'Customer'] },
    { id: 'network-monitor', label: 'Security & Monitoring', icon: AlertCircle, roles: ['Super Admin', 'Tenant Owner', 'Manager'] },
    { id: 'database-setup', label: 'Integration Setup', icon: Database, roles: ['Super Admin', 'Tenant Owner'] },
  ];

  // Filter menu items by active role preset, enforcing that administrative dashboards
  // are strictly restricted to the authorized admin email address.
  const isAuthorizedAdmin = !!(currentUser && (
    currentUser.email.toLowerCase() === 'keptonotieno@mail.com' ||
    currentUser.email.toLowerCase() === 'keptonotieno@gmail.com'
  ));
  
  const effectiveRole = isAuthorizedAdmin ? userRole : (userRole === 'Reseller' ? 'Reseller' : 'Customer');

  const filteredItems = menuItems.filter(item => item.roles.includes(effectiveRole));

  return (
    <>
      {/* Mobile Header */}
      <div className={`lg:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-40 transition-colors duration-300 ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100 text-slate-800'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{selectedTenant.logo}</span>
          <span className="font-sans font-bold text-lg tracking-tight">WifiFlow</span>
        </div>
        <button 
          onClick={() => setMobileOpen(!mobileOpen)}
          className={`p-1 rounded-md ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'}`}
          id="mobile-menu-toggle-btn"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {mobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-950/60 z-40 backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside className={`
        fixed inset-y-0 left-0 border-r w-64 p-5 flex flex-col justify-between z-50 transition-all duration-300 overflow-y-auto
        lg:translate-x-0 lg:static lg:h-screen lg:overflow-y-auto
        ${isDark ? 'bg-slate-900 border-slate-800/80 text-white' : 'bg-white border-slate-150 text-slate-800'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="space-y-6">
          {/* Main Logo & Platform Title */}
          <div className={`flex items-center gap-2 border-b pb-4 ${isDark ? 'border-slate-800/80' : 'border-slate-100'}`}>
            <span className="text-2xl">{selectedTenant.logo}</span>
            <div>
              <span className={`font-sans font-bold text-xl tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>WifiFlow</span>
              <span className={`block text-[10px] uppercase tracking-widest font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>WiFi SaaS System</span>
            </div>
          </div>

          {/* SaaS Tenant Selector */}
          <div className="space-y-1">
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Tenant Domain (RLS Active)
            </label>
            <div className="relative">
              <select
                id="tenant-switcher-dropdown"
                value={selectedTenant.id}
                onChange={(e) => {
                  const selected = tenants.find(t => t.id === e.target.value);
                  if (selected) onSelectTenant(selected);
                  setMobileOpen(false);
                }}
                className={`w-full text-xs font-sans font-medium rounded-lg px-2.5 py-1.5 cursor-pointer appearance-none focus:outline-none transition-colors duration-200 ${
                  isDark 
                    ? 'text-slate-100 bg-slate-800 border-slate-700 focus:border-indigo-505 focus:border-indigo-500' 
                    : 'text-slate-700 bg-slate-50 border-slate-200 focus:border-sky-500 focus:bg-white'
                }`}
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
            <span className={`block text-[9px] font-mono italic ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
              ↳ Isolation for: {selectedTenant.domain}
            </span>
          </div>

          {/* Interactive Themes panel (Explicit User Request) */}
          <div className="space-y-1.5 border-t border-b py-3 border-transparent">
            <div className={`flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-slate-400`}>
              <span>Display Theme</span>
              {theme === 'auto' && (
                <span className="text-[9px] px-1 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded font-mono font-semibold animate-pulse">
                  {isDark ? 'Auto: Night' : 'Auto: Day'}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1 bg-slate-950/50 p-1 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[9px] font-medium font-mono transition-all cursor-pointer ${
                  theme === 'light' 
                    ? 'bg-sky-500 text-white shadow-sm font-bold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Force Light Mode"
              >
                <Sun className="w-3.5 h-3.5 mb-1" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[9px] font-medium font-mono transition-all cursor-pointer ${
                  theme === 'dark' 
                    ? 'bg-indigo-600 text-white shadow-sm font-bold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Force Dark Mode"
              >
                <Moon className="w-3.5 h-3.5 mb-1" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('auto')}
                className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[9px] font-medium font-mono transition-all cursor-pointer ${
                  theme === 'auto' 
                    ? 'bg-emerald-600 text-white shadow-sm font-bold' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Dynamic automated theme matching daylight index"
              >
                <Cpu className="w-3.5 h-3.5 mb-1 animate-pulse" />
                <span>Auto</span>
              </button>
            </div>
          </div>          {/* System Role-Based Access Picker - strictly restricted to active keptonotieno email */}
          {currentUser && ['Super Admin', 'Tenant Owner', 'Manager', 'Support Agent'].includes(currentUser.role) && isAuthorizedAdmin && (
            <div className="space-y-1 bg-amber-500/5 p-2 rounded-xl border border-amber-500/10">
              <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                App User Role Preset
              </label>
              <div className="relative">
                <select
                  id="role-preset-picker"
                  value={userRole}
                  onChange={(e) => {
                    setUserRole(e.target.value);
                    setMobileOpen(false);
                    // Default tab when switching roles to make experience smoother
                    if (e.target.value === 'Customer') {
                      setActiveTab('customer-portal');
                    } else if (e.target.value === 'Reseller') {
                      setActiveTab('vouchers');
                    } else {
                      setActiveTab('dashboard');
                    }
                  }}
                  className={`w-full text-xs font-sans font-medium rounded-lg px-2.5 py-1.5 cursor-pointer appearance-none focus:outline-none transition-colors duration-250 ${
                    isDark 
                      ? 'text-amber-205 text-amber-200 bg-amber-950/40 border border-amber-900/40 focus:border-amber-500' 
                      : 'text-amber-800 bg-amber-50 border border-amber-200 focus:border-amber-400 focus:bg-amber-50/50'
                  }`}
                >
                  {['Super Admin', 'Tenant Owner', 'Manager', 'Support Agent', 'Reseller', 'Customer'].map((role) => (
                    <option key={role} value={role} className={isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800'}>
                      {role} Profile
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-amber-500">
                  <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            </div>
          )}

          {/* Main Navigation Menu */}
          <nav className="space-y-1 pt-2">
            <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 mb-2">
              Management Modules
            </label>
            <div className="space-y-0.5 max-h-[calc(100vh-380px)] overflow-y-auto pr-1">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-item-${item.id}`}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-all font-sans cursor-pointer
                      ${isActive 
                        ? (isDark 
                            ? 'bg-slate-800 text-white font-medium border-l-2 border-indigo-500 rounded-l-none font-semibold'
                            : 'bg-slate-100 text-slate-900 font-medium border-l-2 border-slate-900 rounded-l-none font-semibold')
                        : (isDark 
                            ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40' 
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50')
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? (isDark ? 'text-indigo-400' : 'text-slate-950') : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* User Account Drawer & Powered Status / Logout */}
        <div className={`border-t pt-4 space-y-3 mt-auto ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          {currentUser && (
            <div className={`p-3 rounded-xl space-y-2.5 border transition-all duration-300 ${
              isDark ? 'bg-slate-800/55 border-slate-800 text-white' : 'bg-slate-50 border-slate-100 text-slate-950'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 border rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-900 border-slate-800 text-white'
                }`}>
                  {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`block text-xs font-bold truncate ${isDark ? 'text-slate-250' : 'text-slate-900'}`}>{currentUser.fullName}</span>
                  <span className={`block text-[10px] font-mono truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{currentUser.email}</span>
                </div>
              </div>

              <div className={`flex items-center justify-between gap-1 text-[10px] border-t pt-2 font-medium ${isDark ? 'border-slate-800/50' : 'border-slate-200/50'}`}>
                <span className={`px-1.5 py-0.5 border rounded-md font-sans font-semibold ${
                  isDark ? 'bg-slate-900 text-indigo-400 border-slate-800' : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                }`}>
                  {currentUser.role}
                </span>

                {onLogout && (
                  <button 
                    onClick={onLogout}
                    className="flex items-center gap-1 text-red-500 hover:text-red-400 hover:underline cursor-pointer transition-colors font-semibold"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1 bg-emerald-500/5 border border-emerald-500/10 p-2 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              <span className={`text-[10px] font-mono text-emerald-500 font-bold`}>Supabase Sync Active</span>
            </div>
            <p className={`text-[9px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'} truncate`} title="gsgsxnivjbdxdcuetuoy">
              Ref: gsgsxnivjbdxdcuetuoy
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
