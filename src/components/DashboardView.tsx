import React, { useState } from 'react';
import { 
  DollarSign, Users, Radio, Activity, TrendingUp, Sparkles, 
  ArrowUpRight, Wifi, ShieldAlert, Award, Calendar, CheckCircle, Smartphone,
  Cpu, Settings2, Zap, ArrowRight, RotateCw, ServerCog, Layers
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { Tenant, Customer, Payment, Router, ActiveSession, InternetPackage } from '../types';

interface DashboardViewProps {
  tenant: Tenant;
  customers: Customer[];
  payments: Payment[];
  routers: Router[];
  activeSessions: ActiveSession[];
  setActiveSessions?: React.Dispatch<React.SetStateAction<ActiveSession[]>>;
  packages: InternetPackage[];
  isDark?: boolean;
  automationSettings?: {
    autoDisconnectIdle: boolean;
    autoReconcileMpesa: boolean;
    trafficThrottling: boolean;
    lowDiscountRefill: boolean;
    terminateExcessBytes: boolean;
    byteThresholdMB: number;
  };
  setAutomationSettings?: React.Dispatch<React.SetStateAction<{
    autoDisconnectIdle: boolean;
    autoReconcileMpesa: boolean;
    trafficThrottling: boolean;
    lowDiscountRefill: boolean;
    terminateExcessBytes: boolean;
    byteThresholdMB: number;
  }>>;
  onNavigateTab?: (tab: string) => void;
}

export default function DashboardView({
  tenant,
  customers,
  payments,
  routers,
  activeSessions,
  setActiveSessions,
  packages,
  isDark = false,
  automationSettings = {
    autoDisconnectIdle: true,
    autoReconcileMpesa: true,
    trafficThrottling: false,
    lowDiscountRefill: true,
    terminateExcessBytes: true,
    byteThresholdMB: 500,
  },
  setAutomationSettings,
  onNavigateTab
}: DashboardViewProps) {
  
  const [activeLogTab, setActiveLogTab] = useState<'all' | 'billing' | 'radius'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- Dynamic SLA Data Limit Warnings Helper states ---
  const [simulatedCustomerPkg, setSimulatedCustomerPkg] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [throttledDevices, setThrottledDevices] = useState<Set<string>>(new Set());

  // Filter records based on selected tenant_id (Demonstrating RLS isolation in real time)
  const tenantCustomers = customers.filter(c => c.tenant_id === tenant.id);
  const tenantPayments = payments.filter(p => p.tenant_id === tenant.id);
  const tenantRouters = routers.filter(r => r.tenant_id === tenant.id);
  const tenantSessions = activeSessions.filter(s => s.tenant_id === tenant.id);

  // --- Automated Data Limit Warning Alert calculations ---
  const highUsageAlerts = tenantCustomers.map(customer => {
    // Check if the package is simulated or normal
    const activePackageId = simulatedCustomerPkg[customer.id] || customer.activePackageId;
    if (!activePackageId) return null;

    const pkg = packages.find(p => p.id === activePackageId);
    if (!pkg || pkg.dataLimitGB === null || pkg.dataLimitGB <= 0) return null;

    // Sum active sessions bytes for this customer
    const sessions = tenantSessions.filter(s => s.customerName.toLowerCase() === customer.fullName.toLowerCase());
    const totalBytesUsed = sessions.reduce((sum, s) => sum + s.bytesUsed, 0);
    const limitBytes = pkg.dataLimitGB * 1024 * 1024 * 1024;
    const usagePercent = limitBytes > 0 ? (totalBytesUsed / limitBytes) * 100 : 0;

    return {
      customer,
      pkg,
      bytesUsed: totalBytesUsed,
      limitBytes,
      usagePercent,
      sessions
    };
  }).filter(alert => alert !== null && alert.usagePercent >= 80) as Array<{
    customer: Customer;
    pkg: InternetPackage;
    bytesUsed: number;
    limitBytes: number;
    usagePercent: number;
    sessions: ActiveSession[];
  }>;

  // Interactive Simulation Controls
  const handleSimulateKelvinKiprop = () => {
    setSimulatedCustomerPkg(prev => ({
      ...prev,
      'cust-nairobi-1': 'pkg-nairobi-weekly-10gb'
    }));

    if (setActiveSessions) {
      setActiveSessions(prev => {
        const exists = prev.some(s => s.customerName === 'Kelvin Kiprop');
        if (exists) {
          return prev.map(s => s.customerName === 'Kelvin Kiprop' 
            ? { ...s, bytesUsed: 8.6 * 1024 * 1024 * 1024 } 
            : s
          );
        } else {
          const newSess: ActiveSession = {
            id: `sess-sim-kelvin-${Date.now()}`,
            tenant_id: 'tenant-nairobi',
            customerName: 'Kelvin Kiprop',
            macAddress: 'F2:3C:D1:88:EA:33',
            ipAddress: '10.20.50.88',
            deviceName: 'iPhone 15 Pro',
            bytesUsed: 8.6 * 1024 * 1024 * 1024,
            uptimeHours: 5.4,
            routerId: 'router-nbo-ap1'
          };
          return [newSess, ...prev];
        }
      });
    }

    setToastMessage("🧪 Simulated high usage! Kelvin Kiprop overlimit warning triggered (8.6 GB / 10 GB).");
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleSimulateMwangiKamau = () => {
    setSimulatedCustomerPkg(prev => ({
      ...prev,
      'cust-juja-1': 'pkg-juja-student-monthly'
    }));

    if (setActiveSessions) {
      setActiveSessions(prev => {
        const exists = prev.some(s => s.customerName === 'Mwangi Kamau');
        if (exists) {
          return prev.map(s => s.customerName === 'Mwangi Kamau'
            ? { ...s, bytesUsed: 42.5 * 1024 * 1024 * 1024 }
            : s
          );
        } else {
          const newSess: ActiveSession = {
            id: `sess-sim-mwangi-${Date.now()}`,
            tenant_id: 'tenant-juja',
            customerName: 'Mwangi Kamau',
            macAddress: '74:8D:08:B3:2C:99',
            ipAddress: '172.16.101.44',
            deviceName: 'Xiaomi Redmi Note 12',
            bytesUsed: 42.5 * 1024 * 1024 * 1024,
            uptimeHours: 74.5,
            routerId: 'router-juja-ccr'
          };
          return [newSess, ...prev];
        }
      });
    }

    setToastMessage("🧪 Simulated high usage! Mwangi Kamau warning threshold triggered (42.5 GB / 50 GB).");
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleResetSimulations = () => {
    setSimulatedCustomerPkg({});
    setThrottledDevices(new Set());
    if (setActiveSessions) {
      setActiveSessions(prev => {
        return prev.map(s => {
          if (s.customerName === 'Kelvin Kiprop') {
            return { ...s, bytesUsed: 4 * 1024 * 1024 * 1024 }; // Reset to healthy 4 GB or default
          }
          if (s.customerName === 'Mwangi Kamau') {
            return { ...s, bytesUsed: 12 * 1024 * 1024 * 1024 }; // Reset to healthy 12 GB
          }
          return s;
        });
      });
    }
    setToastMessage("🌿 All simulated limits restored to healthy default values.");
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleNotifyWarning = (alertItem: any) => {
    setToastMessage(`📩 Dynamic SMS Warning dispatched to client ${alertItem.customer.fullName} (${alertItem.customer.phoneNumber}): "Warning, your broadband usage has reached ${alertItem.usagePercent.toFixed(1)}% of your data plan limit."`);
    setTimeout(() => setToastMessage(null), 6000);
  };

  const handleThrottleDevice = (customerName: string) => {
    setThrottledDevices(prev => {
      const next = new Set(prev);
      if (next.has(customerName)) {
        next.delete(customerName);
        setToastMessage(`⚡ CoA CoA-Change: Restored full SLA speed bandwidth for ${customerName}.`);
      } else {
        next.add(customerName);
        setToastMessage(`🛡️ Applied QoS rate capping (Throttle to 512Kbps) on ${customerName} to prevent full overdraw.`);
      }
      return next;
    });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleResetSessionBytes = (customerName: string) => {
    if (setActiveSessions) {
      setActiveSessions(prev => prev.map(s => {
        if (s.customerName.toLowerCase() === customerName.toLowerCase()) {
          return { ...s, bytesUsed: 1048576 }; // Reset to 1 MB
        }
        return s;
      }));
    }
    setToastMessage(`🔌 Dispatch CoA-Disconnect Packet: Successfully reset bandwidth volume lease for ${customerName}.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // 1. Calculate Revenue Metrics
  const completedPayments = tenantPayments.filter(p => p.status === 'Completed');
  const currentMonthRevenue = completedPayments.reduce((acc, curr) => acc + curr.amount, 0);
  const weeklyRevenue = Math.round(currentMonthRevenue * 0.45);
  const todayRevenue = Math.round(currentMonthRevenue * 0.12);

  // 2. Customers Metrics
  const activeCustomersCount = tenantCustomers.filter(c => c.status === 'Active' && c.activePackageId !== null).length;
  const expiredCustomersCount = tenantCustomers.filter(c => c.status === 'Active' && c.activePackageId === null).length;
  const suspendedCustomersCount = tenantCustomers.filter(c => c.status === 'Suspended').length;
  const totalCustomers = tenantCustomers.length;

  // 3. Network Metrics
  const onlineRoutersCount = tenantRouters.filter(r => r.status === 'Online').length;
  const offlineRoutersCount = tenantRouters.filter(r => r.status === 'Offline').length;
  const totalRoutersCount = tenantRouters.length;
  const activeSessionsCount = tenantSessions.length;

  // 4. Payment Success Rate
  const totalPaymentsCount = tenantPayments.length;
  const paymentSuccessRate = totalPaymentsCount > 0 
    ? Math.round((completedPayments.length / totalPaymentsCount) * 100) 
    : 100;

  // 5. Create Revenue Trend Chart Data (for selected tenant)
  const trendData = tenant.id === 'tenant-nairobi' 
    ? [
        { date: 'Jun 05', "Revenue (KES)": 12000, "Sessions": 98 },
        { date: 'Jun 06', "Revenue (KES)": 14500, "Sessions": 110 },
        { date: 'Jun 07', "Revenue (KES)": 13800, "Sessions": 105 },
        { date: 'Jun 08', "Revenue (KES)": 16500, "Sessions": 125 },
        { date: 'Jun 09', "Revenue (KES)": 19000, "Sessions": 130 },
        { date: 'Jun 10', "Revenue (KES)": 21000, "Sessions": 142 },
        { date: 'Jun 11', "Revenue (KES)": currentMonthRevenue, "Sessions": activeSessionsCount },
      ]
    : [
        { date: 'Jun 05', "Revenue (KES)": 4100, "Sessions": 110 },
        { date: 'Jun 06', "Revenue (KES)": 4800, "Sessions": 145 },
        { date: 'Jun 07', "Revenue (KES)": 3900, "Sessions": 125 },
        { date: 'Jun 08', "Revenue (KES)": 5200, "Sessions": 180 },
        { date: 'Jun 09', "Revenue (KES)": 6900, "Sessions": 220 },
        { date: 'Jun 10', "Revenue (KES)": 7400, "Sessions": 280 },
        { date: 'Jun 11', "Revenue (KES)": currentMonthRevenue, "Sessions": activeSessionsCount },
      ];

  // 6. Top Packages breakdown calculations
  const packageSales: { [key: string]: { name: string, count: number, value: number, color: string } } = {};
  
  packages.filter(p => p.tenant_id === tenant.id).forEach((p, index) => {
    const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#84cc16', '#6366f1'];
    packageSales[p.id] = {
      name: p.name,
      count: 0,
      value: 0,
      color: colors[index % colors.length]
    };
  });

  completedPayments.forEach(p => {
    const matchedPkg = packages.find(pkg => pkg.price === p.amount && pkg.tenant_id === tenant.id);
    if (matchedPkg && packageSales[matchedPkg.id]) {
      packageSales[matchedPkg.id].count += 1;
      packageSales[matchedPkg.id].value += p.amount;
    }
  });

  const rawPieData = Object.values(packageSales).filter(item => item.count > 0);
  const pieData = rawPieData.length > 0 
    ? rawPieData 
    : [
        { name: 'Monthly Unlimited', count: 3, value: 4500, color: '#0ea5e9' },
        { name: 'Daily Unlimited', count: 8, value: 400, color: '#10b981' },
        { name: 'Weekly Premium', count: 2, value: 700, color: '#f59e0b' },
      ];

  // 7. Simulated automated workflow actions for visual log
  const autoLogs = [
    { type: 'billing', title: 'M-Pesa Auto-Reconciled', desc: 'Safaricom C2B API hook parsed matching receipt payload. Active broadband leash dispatched.', time: 'Just now', icon: '⚡' },
    { type: 'radius', title: 'Idle Session Disconnected', desc: 'Uptime monitor terminated session 18:ae:24:df for overdrawn usage.', time: '2 mins ago', icon: '🔌' },
    { type: 'radius', title: 'Low Inventory Refill', desc: 'Hot-pool stock drop below safety limit. Autogenerated 10 active vouchers.', time: '11 mins ago', icon: '🎫' },
    { type: 'billing', title: 'Reseller STK Reconciled', desc: 'STK Push of KES 1,500 by agent "Mwenda Cyber Booth" cleared successfully.', time: '40 mins ago', icon: '💳' },
    { type: 'radius', title: 'CoA Disconnect Packet Send', desc: 'Sent CoA mandate to router [Juja-Nairobi-Core] for user lease reallocation.', time: '1 hour ago', icon: '📡' },
  ];

  const filteredAutoLogs = activeLogTab === 'all' 
    ? autoLogs 
    : autoLogs.filter(log => log.type === activeLogTab);

  const toggleAutomation = (key: keyof typeof automationSettings) => {
    if (setAutomationSettings) {
      setAutomationSettings(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    }
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1200);
  };

  return (
    <div id="dashboard-view-panel" className={`space-y-8 animate-fade-in transition-colors duration-300 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* Banner / Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 transition-colors duration-300 ${isDark ? 'border-slate-800/80' : 'border-slate-100'}`}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span>{tenant.name} Executive Hub</span>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold tracking-wider ${
              isDark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-100 text-slate-700'
            }`}>
              RLS Client Sandbox Active
            </span>
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Real-time subscriber trends, automated payment loops, and RADIUS cluster load management.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            className={`p-2 rounded-xl border flex items-center justify-center cursor-pointer transition-all ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Refresh current metrics list"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-500' : ''}`} />
          </button>

          <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-xl text-xs font-semibold font-mono ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            LIVE SECURE: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </div>
        </div>
      </div>

      {/* Toast Feedback Notification Feed */}
      {toastMessage && (
        <div className="animate-fade-in p-3.5 rounded-xl border border-sky-400/25 bg-sky-950/20 text-sky-400 text-xs font-mono flex items-center gap-2.5 shadow-md">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SLA Plan Alerts Section */}
      <div className="space-y-4">
        {highUsageAlerts.length > 0 ? (
          <div className={`p-6 rounded-2xl border transition-all duration-300 ${
            isDark 
              ? 'bg-rose-950/20 border-rose-500/25 text-rose-100' 
              : 'bg-rose-50/60 border-rose-200 text-rose-950'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 mb-5 border-rose-500/10">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20 animate-pulse">
                  <ShieldAlert className="w-6 h-6 shrink-0" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                    <span>Data Quota Warning System Active</span>
                    <span className="px-2 py-0.5 text-[10px] bg-rose-500/20 text-rose-400 font-mono font-bold rounded-full animate-bounce">
                      {highUsageAlerts.length} Critical
                    </span>
                  </h3>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    The automated leasor identified devices consuming over 80% of their allocated high-speed data buckets.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono uppercase bg-rose-500/10 px-2.5 py-1 rounded text-rose-400 font-bold tracking-wider">
                  SLA Threshold Limit: 80%
                </span>
              </div>
            </div>

            {/* List of high-usage subscribers */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {highUsageAlerts.map(({ customer, pkg, bytesUsed, limitBytes, usagePercent, sessions }) => {
                const isCritical = usagePercent >= 90;
                const activeSess = sessions[0];
                const throttled = throttledDevices.has(customer.fullName);

                return (
                  <div key={customer.id} className={`p-4 rounded-xl border transition-all duration-200 ${
                    isDark 
                      ? 'bg-slate-900/95 border-slate-800 hover:border-rose-500/30' 
                      : 'bg-white border-slate-100 shadow-sm hover:border-rose-500/25'
                  }`}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`font-bold text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{customer.fullName}</h4>
                          {throttled && (
                            <span className="text-[9px] bg-amber-500/15 text-amber-550 border border-amber-500/25 px-1.5 py-0.2 rounded font-mono font-bold">
                              Throttled (QoS)
                            </span>
                          )}
                        </div>
                        <p className={`text-[10px] font-mono mt-0.5 uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          No: {customer.customerNumber} • Plan: {pkg.name} ({pkg.dataLimitGB}GB max)
                        </p>
                      </div>
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                        isCritical 
                          ? 'bg-rose-500/15 text-rose-450' 
                          : 'bg-amber-500/15 text-amber-550'
                      }`}>
                        {usagePercent.toFixed(1)}% Quota Used
                      </span>
                    </div>

                    {/* Progress details */}
                    <div className="space-y-1.5">
                      <div className={`flex items-center justify-between text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span>Used: {(bytesUsed / (1024 * 1024 * 1024)).toFixed(2)} GB</span>
                        <span>Total Limit: {pkg.dataLimitGB}.00 GB</span>
                      </div>
                      
                      {/* Beautiful Progress Bar */}
                      <div className={`w-full rounded-full h-2 overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            throttled
                              ? 'bg-amber-400'
                              : isCritical 
                                ? 'bg-gradient-to-r from-red-500 to-rose-500 animate-pulse' 
                                : 'bg-gradient-to-r from-amber-500 to-orange-500'
                          }`}
                          style={{ width: `${Math.min(100, usagePercent)}%` }}
                        />
                      </div>
                    </div>

                    {/* Session hardware telemetry */}
                    {activeSess && (
                      <div className={`mt-3 p-2 rounded border text-[10px] font-mono flex flex-wrap items-center justify-between gap-1 ${
                        isDark ? 'bg-slate-950/60 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-100 text-slate-600'
                      }`}>
                        <span>Device: {activeSess.deviceName} ({activeSess.ipAddress})</span>
                        <span>Uptime: {activeSess.uptimeHours} hrs</span>
                      </div>
                    )}

                    {/* Quick Interactive Operator Action commands */}
                    <div className="mt-4 pt-3 border-t border-slate-800/20 flex flex-wrap items-center gap-1.5 justify-end">
                      <button
                        onClick={() => handleNotifyWarning({ customer, usagePercent })}
                        className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-sky-500/25 bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 transition-all cursor-pointer flex items-center gap-1"
                        title="Send SMS threshold warning notice"
                      >
                        <Smartphone className="w-3 h-3 text-sky-500" />
                        <span>📩 Warn Notice</span>
                      </button>

                      <button
                        onClick={() => handleThrottleDevice(customer.fullName)}
                        className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                          throttled
                            ? 'bg-amber-500/15 border-amber-500/25 text-amber-500 hover:bg-amber-500/25 font-black'
                            : 'bg-rose-500/10 border-rose-500/25 text-rose-500 hover:bg-rose-500/20'
                        }`}
                        title="Send RADIUS CoA change-of-authorization speed profile limit"
                      >
                        <Zap className="w-3 h-3" />
                        <span>{throttled ? '⚡ Full SLA speed' : '🛡️ Throttle (QoS)'}</span>
                      </button>

                      <button
                        onClick={() => handleResetSessionBytes(customer.fullName)}
                        className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                          isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-755' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                        }`}
                        title="Dispatch CoA Disconnect to reset bandwidth volume usage"
                      >
                        <span>🔌 Reset Volume (CoA)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
            isDark 
              ? 'bg-emerald-950/10 border-emerald-500/20 text-emerald-300' 
              : 'bg-emerald-50/50 border-emerald-100 text-emerald-905 text-emerald-900'
          }`}>
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 animate-pulse" />
              <div>
                <h4 className="font-bold text-sm">Dynamic SLA Plan Alerter operating normally</h4>
                <p className="text-xs opacity-80 mt-0.5">
                  All active, data-limited broadband sessions are currently operating healthy under the 80% security watermark.
                </p>
              </div>
            </div>
            
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] bg-emerald-500/15 text-emerald-500 px-2.5 py-1 rounded-full font-bold font-mono uppercase">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              Sentry Secured
            </div>
          </div>
        )}

        {/* Live Simulation Control Dashboard */}
        <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50/70 border-slate-200'
        }`}>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-indigo-400 tracking-wider">Telemetry sandbox studio</span>
            <span className="ml-2.5 px-2 py-0.2 text-[9px] bg-sky-500/10 border border-sky-500/20 rounded font-mono font-bold text-sky-400">DEMO READY</span>
            <h4 className="font-bold text-xs mt-0.5">SLA warning simulated triggers</h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Trigger instant overdraft events to verify warning banners, progress thresholds, and CoA actions instantly.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
               onClick={handleSimulateKelvinKiprop}
               className="text-[10px] font-bold font-mono bg-indigo-600 hover:bg-indigo-505 text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm border border-indigo-500/20 shrink-0"
               title="Set Kelvin's package to Weekly 10GB & usage to 8.6GB (86%)"
            >
              🧪 Overdraft Kelvin (Nairobi)
            </button>

            <button
               onClick={handleSimulateMwangiKamau}
               className="text-[10px] font-bold font-mono bg-sky-600 hover:bg-sky-505 text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm border border-sky-500/20 shrink-0"
               title="Set Mwangi's usage to 42.5GB (85% of 50GB plan)"
            >
              🧪 Overdraft Mwangi (Juja)
            </button>

            <button
               onClick={handleResetSimulations}
               className="text-[10px] font-bold font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-sm border border-slate-750 shrink-0"
               title="Restore active session volumes back to healthy defaults"
            >
              🌿 Reset Simulation
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Revenue Metrics */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-500 animate-pulse" />
          <h2 className={`text-xs font-mono font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            1. Income Analytics (Automatic Safaricom Ledger)
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Today Card */}
          <div className={`rounded-xl border p-5 shadow-sm space-y-2 transition-all duration-300 hover:shadow-md ${
            isDark ? 'bg-slate-900/60 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold font-mono tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>TODAY</span>
              <div className="p-1 px-1.5 bg-sky-500/10 text-sky-400 text-[10px] font-bold rounded font-mono">
                +14.2% OVER YESTERDAY
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 pt-1.5">
              <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>KES</span>
              <span className="text-3xl font-black tracking-tight font-mono">{todayRevenue.toLocaleString()}</span>
            </div>
            <p className={`text-[11px] font-medium pt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Safaricom automated C2B & STK callback validation
            </p>
          </div>

          {/* This Week Card */}
          <div className={`rounded-xl border p-5 shadow-sm space-y-2 transition-all duration-300 hover:shadow-md ${
            isDark ? 'bg-slate-900/60 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold font-mono tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>THIS WEEK</span>
              <div className="p-1 px-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded font-mono">
                +22.8% SYSTEM AVG
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 pt-1.5">
              <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>KES</span>
              <span className="text-3xl font-black tracking-tight font-mono">{weeklyRevenue.toLocaleString()}</span>
            </div>
            <p className={`text-[11px] font-medium pt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Includes physical retailer voucher bulk orders
            </p>
          </div>

          {/* This Month Card */}
          <div className={`gradient-indigo-border rounded-xl border p-5 shadow-sm space-y-2 transition-all duration-300 hover:shadow-md ${
            isDark ? 'bg-slate-900/90 border-indigo-950 text-white' : 'bg-white border-slate-100 text-slate-800'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold font-mono tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>TOTAL MONTHLY POOL</span>
              <div className="p-1 px-2.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-black rounded-full font-mono">
                REAL-TIME REVENUE
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 pt-1.5">
              <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>KES</span>
              <span className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400 font-mono">
                {currentMonthRevenue.toLocaleString()}
              </span>
            </div>
            <p className={`text-[11px] font-medium pt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Instant automated ledger reconciliation & database isolation
            </p>
          </div>
        </div>
      </div>

      {/* NEW SECTION: Dynamic ISP Operations Control & Automation Studio (Unique Interaction) */}
      <div className={`rounded-xl border p-6 space-y-5 transition-all duration-300 ${
        isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-50/50 border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-600/10 text-indigo-400 rounded-xl border border-indigo-500/20">
              <ServerCog className="w-5 h-5 text-indigo-500 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">ISP Automation Studio & Intelligent Rules</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Toggle background daemons to automatically resolve leases, prevent theft, and restock vouchers.
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-bold font-mono uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Background Engines Active
          </span>
        </div>

        {/* Toggles grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          
          <div className={`p-4 rounded-xl border transition-all ${
            automationSettings.autoReconcileMpesa 
              ? (isDark ? 'bg-slate-950 border-teal-500/30' : 'bg-white border-teal-500/30 shadow-xs') 
              : (isDark ? 'bg-slate-900/30 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500')
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold font-mono uppercase text-teal-500">Auto Payments</span>
              <button
                onClick={() => toggleAutomation('autoReconcileMpesa')}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-250 ${
                  automationSettings.autoReconcileMpesa ? 'bg-teal-500' : 'bg-slate-700'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-250 ${
                  automationSettings.autoReconcileMpesa ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>
            <h4 className={`text-xs font-bold ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>Instant STK Reconciler</h4>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              Auto-approve payments every 12 sec and update tenant lease table.
            </p>
          </div>

          <div className={`p-4 rounded-xl border transition-all ${
            automationSettings.lowDiscountRefill 
              ? (isDark ? 'bg-slate-950 border-sky-500/30' : 'bg-white border-sky-500/30 shadow-xs') 
              : (isDark ? 'bg-slate-900/30 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500')
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold font-mono uppercase text-sky-400">Coupon Generator</span>
              <button
                onClick={() => toggleAutomation('lowDiscountRefill')}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-250 ${
                  automationSettings.lowDiscountRefill ? 'bg-sky-500' : 'bg-slate-700'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-250 ${
                  automationSettings.lowDiscountRefill ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>
            <h4 className={`text-xs font-bold ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>Dynamic Pool Refilling</h4>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              Automatically mints 10 vouchers if available coupons decrease under 5 codes.
            </p>
          </div>

          <div className={`p-4 rounded-xl border transition-all ${
            automationSettings.autoDisconnectIdle 
              ? (isDark ? 'bg-slate-950 border-amber-500/30' : 'bg-white border-amber-500/30 shadow-xs') 
              : (isDark ? 'bg-slate-900/30 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500')
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold font-mono uppercase text-amber-500">RADIUS Watchdog</span>
              <button
                onClick={() => toggleAutomation('autoDisconnectIdle')}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-250 ${
                  automationSettings.autoDisconnectIdle ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-250 ${
                  automationSettings.autoDisconnectIdle ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>
            <h4 className={`text-xs font-bold ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>COA Lease Purger</h4>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              Disconnects idle/expired client sessions automatically to optimize bandwidth.
            </p>
          </div>

          <div className={`p-4 rounded-xl border transition-all ${
            automationSettings.trafficThrottling 
              ? (isDark ? 'bg-slate-950 border-indigo-500/30' : 'bg-white border-indigo-500/30 shadow-xs') 
              : (isDark ? 'bg-slate-900/30 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500')
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold font-mono uppercase text-indigo-400 font-semibold">QoS Load Optimizer</span>
              <button
                onClick={() => toggleAutomation('trafficThrottling')}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-250 ${
                  automationSettings.trafficThrottling ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-250 ${
                  automationSettings.trafficThrottling ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>
            <h4 className={`text-xs font-bold ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>Throttling Cap</h4>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              Dynamically limit peak rates per customer back to 3 Mbps when users &gt; 200.
            </p>
          </div>

          <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
            automationSettings.terminateExcessBytes 
              ? (isDark ? 'bg-slate-950 border-rose-500/30' : 'bg-white border-rose-500/30 shadow-xs') 
              : (isDark ? 'bg-slate-900/30 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500')
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black font-mono uppercase text-rose-500">RADIUS Byte Cap</span>
                <button
                  onClick={() => toggleAutomation('terminateExcessBytes')}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-250 ${
                    automationSettings.terminateExcessBytes ? 'bg-rose-500' : 'bg-slate-700'
                  }`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-250 ${
                    automationSettings.terminateExcessBytes ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>
              <h4 className={`text-xs font-bold ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>Session Byte Cap</h4>
              
              <div className="mt-2.5 space-y-1">
                <label className="block text-[8px] font-mono text-slate-400 uppercase tracking-wider">
                  Cap Threshold Limit
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="50000"
                    value={automationSettings.byteThresholdMB || 500}
                    onChange={(e) => {
                      const val = Math.max(1, parseInt(e.target.value) || 1);
                      if (setAutomationSettings) {
                        setAutomationSettings(prev => ({
                          ...prev,
                          byteThresholdMB: val
                        }));
                      }
                    }}
                    className={`w-18 text-xs font-mono rounded px-1.5 py-0.5 text-center transition-all ${
                      isDark 
                        ? 'bg-slate-900 text-rose-400 border border-slate-800 focus:border-rose-500/50' 
                        : 'bg-slate-100 text-rose-700 border border-slate-205 focus:border-rose-500/40'
                    }`}
                  />
                  <span className="text-[10px] font-mono text-slate-400 font-semibold">MB</span>
                </div>
              </div>
            </div>
            <p className="text-[9.5px] text-slate-400 mt-2.5 leading-relaxed">
              Auto-kill sessions exceeding cap. Trace runs every 8s.
            </p>
          </div>

        </div>
      </div>

      {/* Grid: Customers Breakdown & Telemetry Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Customers Breakdown Card */}
        <div className={`rounded-xl border p-5 shadow-sm space-y-4 transition-all ${
          isDark ? 'bg-slate-900 border-slate-800/80 text-white' : 'bg-white border-slate-100 text-slate-900'
        }`}>
          <div className="flex items-center justify-between border-b pb-2 border-slate-800/20">
            <h3 className={`text-xs font-mono font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>2. Subscribers Snapshot</h3>
            <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{tenant.domain} pool</span>
          </div>

          <div className="grid grid-cols-4 gap-4 divide-x divide-slate-800/20">
            <div className="text-center">
              <span className="block text-2xl font-black font-mono">{totalCustomers}</span>
              <span className="text-[10px] uppercase font-mono text-slate-500">Total Size</span>
            </div>
            <div className="text-center pl-2">
              <span className="block text-2xl font-black font-mono text-emerald-500">{activeCustomersCount}</span>
              <span className="text-[10px] uppercase font-mono text-slate-500">Live Auth</span>
            </div>
            <div className="text-center pl-2">
              <span className="block text-2xl font-black font-mono text-amber-500">{expiredCustomersCount}</span>
              <span className="text-[10px] uppercase font-mono text-slate-500">Expired</span>
            </div>
            <div className="text-center pl-2">
              <span className="block text-2xl font-black font-mono text-rose-500">{suspendedCustomersCount}</span>
              <span className="text-[10px] uppercase font-mono text-slate-500">Blocked</span>
            </div>
          </div>

          <div className={`border-t pt-4 space-y-2.5 ${isDark ? 'border-slate-800/60' : 'border-slate-100'}`}>
            <div className="flex justify-between items-center text-xs">
              <span className={isDark ? 'text-slate-450 text-slate-400' : 'text-slate-500'}>Hotspot STK Auth Success Rate</span>
              <span className="font-bold text-emerald-400 font-mono">{paymentSuccessRate}%</span>
            </div>
            <div className={`w-full rounded-full h-1.5 overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <div 
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" 
                style={{ width: `${paymentSuccessRate}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Network status card */}
        <div className={`rounded-xl border p-5 shadow-sm space-y-4 transition-all ${
          isDark ? 'bg-slate-900 border-slate-800/80 text-white' : 'bg-white border-slate-100 text-slate-900'
        }`}>
          <div className="flex items-center justify-between border-b pb-2 border-slate-800/20">
            <h3 className={`text-xs font-mono font-bold uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>3. Network Telemetry</h3>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 font-mono rounded px-1.5">Mkr-RADIUS Sync</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-3 rounded-lg border flex items-center gap-3 transition-colors ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/50 border-slate-100'
            }`}>
              <Radio className="w-5 h-5 text-indigo-400 shrink-0" />
              <div>
                <span className={`block text-[10px] uppercase font-mono font-bold ${isDark ? 'text-slate-500' : 'text-slate-450'}`}>Active Leases</span>
                <span className="text-md font-bold text-slate-300 font-mono">{activeSessionsCount} Devices</span>
              </div>
            </div>

            <div className={`p-3 rounded-lg border flex items-center gap-3 transition-colors ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/50 border-slate-100'
            }`}>
              <Wifi className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className={`block text-[10px] uppercase font-mono font-bold ${isDark ? 'text-slate-500' : 'text-slate-450'}`}>Broadband Nodes</span>
                <span className="text-xs font-bold font-mono">
                  {onlineRoutersCount} Online <span className="opacity-50">/ {totalRoutersCount}</span>
                </span>
              </div>
            </div>
          </div>

          {offlineRoutersCount > 0 && (
            <div className="p-2 border border-rose-100/10 bg-rose-500/10 text-rose-400 rounded-lg text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
              <span>
                <strong>Warning:</strong> {offlineRoutersCount} MikroTik AP is offline. RADIUS daemon blocked client access at Nairobi West.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Grid: Charts & Analytics Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Revenue Trends (Area Chart) */}
        <div className={`lg:col-span-8 border rounded-xl p-5 shadow-sm transition-all ${
          isDark ? 'bg-slate-900 border-slate-800/80 text-white' : 'bg-white border-slate-100'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold flex items-center gap-1.5 text-sm md:text-base">
                <TrendingUp className="w-4 h-4 text-emerald-500 animate-pulse" />
                Live Revenue Trends & Active Sessions
              </h3>
              <p className="text-[10px] text-slate-400">Aggregated real-time metrics isolation computed for this tenant</p>
            </div>
            <div className="text-[10px] font-mono text-indigo-400 uppercase font-black">7-Day Period Active</div>
          </div>
          
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1e293b" : "#f1f5f9"} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={
                    isDark 
                      ? { backgroundColor: '#090d16', borderRadius: '12px', border: '1px solid #1e293b', color: '#fff' }
                      : { backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff' }
                  }
                  labelStyle={{ fontWeight: 'bold', fontSize: '11px' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="Revenue (KES)" stroke="#0ea5e9" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Packages Pie Distribution */}
        <div className={`lg:col-span-4 border rounded-xl p-5 shadow-sm flex flex-col justify-between transition-all ${
          isDark ? 'bg-slate-900 border-slate-800/80 text-white' : 'bg-white border-slate-100'
        }`}>
          <div>
            <h3 className="font-semibold flex items-center gap-1.5 mb-1 text-sm md:text-base">
              <Award className="w-4 h-4 text-amber-500 animate-bounce" />
              Core Traffic Products
            </h3>
            <p className="text-[10px] text-slate-400">Total processed revenue splits by speed caps</p>
          </div>

          <div className="h-44 flex items-center justify-center my-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `KES ${value}`} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Summary text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[8px] text-slate-400 uppercase font-mono">Gross Total</span>
              <span className="text-xs font-black text-emerald-400 font-mono">KES {currentMonthRevenue}</span>
            </div>
          </div>

          {/* Legend Details */}
          <div className="space-y-1.5 mt-2">
            {pieData.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="truncate max-w-[120px] font-sans text-slate-400">{item.name}</span>
                </div>
                <span className="font-mono font-semibold text-slate-300">KES {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NEW SECTION: Automation Logs & Live Activity Streamer */}
      <div className={`rounded-xl border p-5 space-y-4 transition-all ${
        isDark ? 'bg-slate-900 border-slate-800/80' : 'bg-white border-slate-100'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
          <div className="space-y-0.5">
            <h3 className="font-bold flex items-center gap-2 text-sm md:text-base">
              <Cpu className="w-4 h-4 text-teal-400" />
              Automated Operator Event Logs
            </h3>
            <p className="text-[11px] text-slate-400">Real-time trace logs from background payment listener hooks and RADIUS.</p>
          </div>
          
          {/* Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-white/5 self-start sm:self-auto">
            <button
              onClick={() => setActiveLogTab('all')}
              className={`px-3 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                activeLogTab === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Signals
            </button>
            <button
              onClick={() => setActiveLogTab('billing')}
              className={`px-3 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                activeLogTab === 'billing' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Ledger
            </button>
            <button
              onClick={() => setActiveLogTab('radius')}
              className={`px-3 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                activeLogTab === 'radius' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              RADIUS Daemons
            </button>
          </div>
        </div>

        {/* Log table/list */}
        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
          {filteredAutoLogs.map((log, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-lg border text-xs flex items-start gap-3 transition-colors ${
                isDark ? 'bg-slate-950 border-slate-850 hover:bg-slate-900' : 'bg-slate-50/70 border-slate-150 hover:bg-slate-50'
              }`}
            >
              <span className="text-base select-none">{log.icon}</span>
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-200">{log.title}</h4>
                  <span className="text-[9px] font-mono text-slate-400">{log.time}</span>
                </div>
                <p className={`text-[10.5px] ${isDark ? 'text-slate-400' : 'text-slate-550'}`}>{log.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Help Info Banner */}
      <div className={`border rounded-xl p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-all ${
        isDark ? 'bg-indigo-950/10 border-indigo-900/30 text-indigo-200' : 'bg-amber-50/60 border-amber-100 text-amber-900'
      }`}>
        <div className="flex gap-3">
          <Sparkles className={`w-5 h-5 shrink-0 mt-0.5 ${isDark ? 'text-indigo-400' : 'text-amber-600'}`} />
          <div>
            <h4 className="font-semibold text-sm">Automated Live-Demo Verification Step</h4>
            <p className="text-xs leading-relaxed max-w-xl opacity-90 mt-0.5">
              Want to trigger dynamic automation events? Under the <strong>Captive Portal Design</strong> or <strong>My Customer Portal</strong> simulators, click any payment option to start a dry run. The background M-Pesa transaction reconcile system, dynamic speed tiers, and throughput graphs will update instantly on the fly!
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2.5 shrink-0 w-full lg:w-auto">
          <button
            onClick={() => onNavigateTab?.('captive')}
            className={`flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all cursor-pointer ${
              isDark 
                ? 'bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20' 
                : 'bg-white border-sky-200 text-sky-700 hover:bg-sky-50'
            }`}
          >
            <span>Captive Portal Sim</span>
            <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
          </button>
          
          <button
            onClick={() => onNavigateTab?.('customer-portal')}
            className={`flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all cursor-pointer ${
              isDark 
                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20' 
                : 'bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50'
            }`}
          >
            <span>Customer Portal Sim</span>
            <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
