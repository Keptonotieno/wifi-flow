import React, { useState, useEffect } from 'react';
import { 
  Network, Radio, Activity, CheckCircle, RefreshCw, XCircle, 
  Trash2, ShieldAlert, Cpu, HardDrive, UserMinus, Plus, Info, Wifi, ArrowUp, ArrowDown,
  Terminal, MessageSquare, Send
} from 'lucide-react';
import { Router, ActiveSession, Tenant } from '../types';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface MikrotikRadiusProps {
  tenant: Tenant;
  routers: Router[];
  activeSessions: ActiveSession[];
  onAddRouter: (router: Router) => void;
  onDeleteRouter: (id: string) => void;
  onDisconnectSession: (sessionId: string) => void;
  onSyncRouters: () => void;
  isDark?: boolean;
  automationSettings?: {
    autoDisconnectIdle: boolean;
    autoReconcileMpesa: boolean;
    trafficThrottling: boolean;
    lowDiscountRefill: boolean;
    terminateExcessBytes: boolean;
    byteThresholdMB: number;
  };
}

export default function MikrotikRadius({
  tenant,
  routers,
  activeSessions,
  onAddRouter,
  onDeleteRouter,
  onDisconnectSession,
  onSyncRouters,
  isDark = false,
  automationSettings,
}: MikrotikRadiusProps) {

  // RLS Isolation: Filter routers and sessions belonging to active tenant
  const tenantRouters = routers.filter(r => r.tenant_id === tenant.id);
  const tenantSessions = activeSessions.filter(s => s.tenant_id === tenant.id);

  // Setup the auto cap values (prop first, or fallback from local storage)
  const thresholdMB = automationSettings?.byteThresholdMB ?? (() => {
    try {
      const saved = localStorage.getItem('wififlow_automation_rules');
      return saved ? JSON.parse(saved).byteThresholdMB || 500 : 500;
    } catch (e) {
      return 500;
    }
  })();

  const isCapActive = automationSettings?.terminateExcessBytes ?? (() => {
    try {
      const saved = localStorage.getItem('wififlow_automation_rules');
      return saved ? JSON.parse(saved).terminateExcessBytes !== false : true;
    } catch (e) {
      return true;
    }
  })();

  // Real-time live bandwidth history state (Download rx & Upload tx in Mbps)
  const [bandwidthHistory, setBandwidthHistory] = useState(() => {
    const data = [];
    const now = new Date();
    const sessCount = activeSessions.filter(s => s.tenant_id === tenant.id).length;
    for (let i = 10; i >= 0; i--) {
      const timeStr = new Date(now.getTime() - i * 3000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      const baseLoad = sessCount * 3.8 + 6.2;
      const rx = parseFloat((baseLoad + Math.random() * 4).toFixed(1));
      const tx = parseFloat((baseLoad * 0.28 + Math.random() * 1.5).toFixed(1));
      data.push({ time: timeStr, rx, tx });
    }
    return data;
  });

  // Background ticker updating simulated traffic spikes
  useEffect(() => {
    const sessCount = activeSessions.filter(s => s.tenant_id === tenant.id).length;
    const timer = setInterval(() => {
      setBandwidthHistory(prev => {
        const next = [...prev];
        if (next.length >= 15) {
          next.shift();
        }
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        
        // Dynamic load from live active sessions
        const baseLoad = sessCount * 3.8 + 6.2;
        // Periodic random burst spikes
        const isSpike = Math.random() > 0.82;
        const multiplier = isSpike ? 1.8 : 1.0;
        
        const rx = parseFloat((Math.max(1.2, (baseLoad + Math.random() * 4) * multiplier)).toFixed(1));
        const tx = parseFloat((Math.max(0.4, (baseLoad * 0.28 + Math.random() * 1.5) * multiplier)).toFixed(1));
        
        next.push({ time: timeStr, rx, tx });
        return next;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [tenant.id, activeSessions]);

  // States
  const [isAdding, setIsAdding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [form, setForm] = useState({
    name: '',
    ipAddress: '',
    model: 'MikroTik CCR2004-16G-2S+',
  });

  // --- NATIVE ROUTEROS & AFRICA'S TALKING LIVE INTEGRATION STATES ---
  const [activeBoardTab, setActiveBoardTab] = useState<'routeros_terminal' | 'sms_gateway'>('routeros_terminal');
  
  // RouterOS credentials and handshake status
  const [rotCredentials, setRotCredentials] = useState({
    host: '192.168.88.1',
    port: '8728',
    user: 'admin',
    password: ''
  });
  const [rotStatus, setRotStatus] = useState<'idle' | 'testing' | 'online' | 'offline'>('idle');
  const [rotDetails, setRotDetails] = useState<any>(null);
  const [rawTrace, setRawTrace] = useState<string[]>([]);
  const [manualCmd, setManualCmd] = useState('/system/resource/print');
  const [cmdResult, setCmdResult] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [dbRotLogs, setDbRotLogs] = useState<any[]>([]);

  // Africa's Talking Gateway configuration inputs and messages
  const [smsConfigForm, setSmsConfigForm] = useState({
    username: 'sandbox',
    apiKey: '',
    senderId: ''
  });
  const [smsForm, setSmsForm] = useState({
    to: '254712345678',
    message: 'Hello, your WifiFlow hotspot voucher code is active!'
  });
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsResult, setSmsResult] = useState<any>(null);
  const [smsLogs, setSmsLogs] = useState<any[]>([]);

  const fetchRouterLogs = async () => {
    try {
      const res = await fetch('/api/mikrotik/logs');
      if (res.ok) {
        const data = await res.json();
        setDbRotLogs(data);
      }
    } catch (e) {
      console.warn("Failed fetching router logs", e);
    }
  };

  const fetchSmsLogs = async () => {
    try {
      const res = await fetch('/api/sms/logs');
      if (res.ok) {
        const data = await res.json();
        setSmsLogs(data);
      }
    } catch (e) {
      console.warn("Failed fetching sms logs", e);
    }
  };

  useEffect(() => {
    fetchRouterLogs();
    fetchSmsLogs();
    const interval = setInterval(() => {
      fetchRouterLogs();
      fetchSmsLogs();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleTestRouterConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setRotStatus('testing');
    setRotDetails(null);
    try {
      const res = await fetch('/api/mikrotik/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rotCredentials)
      });
      const data = await res.json();
      if (data.success) {
        setRotStatus('online');
        setRotDetails(data);
        if (data.trace) setRawTrace(data.trace);
      } else {
        setRotStatus('offline');
        setRotDetails(data);
        if (data.trace) setRawTrace(data.trace);
      }
      fetchRouterLogs();
    } catch (err: any) {
      setRotStatus('offline');
      setRotDetails({ message: err.message || err });
    }
  };

  const handleExecuteManualCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCmd.trim()) return;
    setIsExecuting(true);
    setCmdResult('');
    try {
      const words = manualCmd.trim().split(' ').filter(Boolean);
      const res = await fetch('/api/mikrotik/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...rotCredentials,
          words
        })
      });
      const data = await res.json();
      if (data.success) {
        setCmdResult(JSON.stringify(data.response, null, 2));
        if (data.trace) setRawTrace(data.trace);
      } else {
        setCmdResult(`Execution Error: ${data.error || JSON.stringify(data)}`);
        if (data.trace) setRawTrace(data.trace);
      }
      fetchRouterLogs();
    } catch (err: any) {
      setCmdResult(`Connection Error: ${err.message || err}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const executeCommandDirectly = async (cmdText: string) => {
    setManualCmd(cmdText);
    setIsExecuting(true);
    setCmdResult('');
    try {
      const words = cmdText.trim().split(' ').filter(Boolean);
      const res = await fetch('/api/mikrotik/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...rotCredentials,
          words
        })
      });
      const data = await res.json();
      if (data.success) {
        setCmdResult(JSON.stringify(data.response, null, 2));
        if (data.trace) setRawTrace(data.trace);
      } else {
        setCmdResult(`Execution Error: ${data.error || JSON.stringify(data)}`);
        if (data.trace) setRawTrace(data.trace);
      }
      fetchRouterLogs();
    } catch (err: any) {
      setCmdResult(`Connection Error: ${err.message || err}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSendManualSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingSms(true);
    setSmsResult(null);
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: smsForm.to,
          message: smsForm.message,
          ...smsConfigForm
        })
      });
      const data = await res.json();
      setSmsResult(data);
      fetchSmsLogs();
    } catch (err: any) {
      setSmsResult({ success: false, error: err.message || err });
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleCreateRouter = (e: React.FormEvent) => {
    e.preventDefault();
    if(!form.name || !form.ipAddress) return;

    const newRouter: Router = {
      id: `router-${Date.now()}`,
      tenant_id: tenant.id,
      name: form.name,
      ipAddress: form.ipAddress,
      model: form.model,
      status: 'Online',
      onlineUsers: 0,
      activeSessions: 0,
      cpuUsage: 2,
      memoryUsage: 8,
      lastSync: new Date().toISOString(),
    };

    onAddRouter(newRouter);
    setIsAdding(false);
    setForm({name: '', ipAddress: '', model: 'MikroTik CCR2004-16G-2S+'});
  };

  const triggerSync = () => {
    setSyncing(true);
    setTimeout(() => {
      onSyncRouters();
      setSyncing(false);
    }, 1500);
  };

  const getSpeedLabel = (sessName: string) => {
    if (sessName.includes('Kiprop')) return '20 Mbps / 10 Mbps';
    if (sessName.includes('Wanjiku')) return '8 Mbps / 4 Mbps';
    if (sessName.includes('Kamau')) return '15 Mbps / 5 Mbps';
    return '5 Mbps / 2 Mbps';
  };

  return (
    <div id="mikrotik-radius-panel" className={`space-y-6 animate-fade-in font-sans transition-colors duration-300 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 transition-colors duration-300 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
        <div>
          <h1 className={`text-2xl font-sans font-semibold flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            <Network className={`w-6 h-6 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} />
            MikroTik & Central RADIUS AAA
          </h1>
          <p className="text-xs mt-1 text-slate-400">
            RADIUS accounting, real-time simple queues, active sessions tracker, and COA client disconnection hooks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={triggerSync}
            disabled={syncing}
            className={`text-xs flex items-center gap-1 border px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-slate-305 text-slate-300 hover:bg-slate-800 hover:text-white' 
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-800'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> 
            {syncing ? 'Pinging APs...' : 'Scan Routers status'}
          </button>
          
          <button
            onClick={() => setIsAdding(!isAdding)}
            className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer shadow-sm ${
              isDark 
                ? 'bg-indigo-650 bg-indigo-600 border border-indigo-550 text-white hover:bg-indigo-550' 
                : 'bg-slate-900 border border-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Bind Router
          </button>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleCreateRouter} className={`rounded-xl p-5 shadow-sm max-w-xl space-y-4 border ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
        }`}>
          <h3 className="text-sm font-semibold font-sans">Register MikroTik Router</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Client Endpoint Identifier Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Juja Hostels AP"
                className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white focus:border-sky-500 focus:outline-none"
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">Public IP WAN IP / Host Name</label>
              <input
                type="text"
                required
                placeholder="e.g. 197.248.112.44"
                className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full font-mono focus:bg-white focus:border-sky-500 focus:outline-none"
                value={form.ipAddress}
                onChange={(e) => setForm({...form, ipAddress: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">MikroTik RouterOS Version Profile</label>
              <select
                className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white edit-field border-slate-200"
                value={form.model}
                onChange={(e) => setForm({...form, model: e.target.value})}
              >
                <option value="MikroTik CCR2004-16G-2S+">CCR2004-16G-2S+</option>
                <option value="MikroTik CCR1036-12G-4S">CCR1036-12G-4S</option>
                <option value="MikroTik hAP ac lite">hAP ac lite</option>
                <option value="MikroTik RB4011iGS+">RB4011iGS+</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-slate-900 text-white font-medium px-4 py-2 rounded-lg text-xs"
            >
              Save Router
            </button>
            <button
              type="button"
              className="bg-white border border-slate-200 text-slate-600 font-medium px-4 py-2 rounded-lg text-xs"
              onClick={() => setIsAdding(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Grid: Connected Routers Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenantRouters.map(router => {
          return (
            <div 
              key={router.id}
              className={`rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-400 border transition-all ${
                isDark ? 'bg-slate-905 bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-100'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className={`font-semibold truncate max-w-[170px] ${isDark ? 'text-slate-100' : 'text-slate-850'}`}>{router.name}</h3>
                  <span className="text-xs text-slate-400 font-mono">{router.ipAddress}</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                  router.status === 'Online' 
                    ? (isDark ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700') 
                    : (isDark ? 'bg-rose-950/40 text-rose-450 border border-rose-500/20' : 'bg-rose-50 text-rose-750')
                }`}>
                  {router.status}
                </span>
              </div>

              {/* Hardware specifications details */}
              <div className="text-xs text-slate-400 font-sans">
                Profile Version: <strong className={isDark ? 'text-slate-205' : 'text-slate-800'}>{router.model}</strong>
              </div>

              {/* Performance Bars for Router stats */}
              {router.status === 'Online' && (
                <div className={`grid grid-cols-2 gap-3 border-t pt-3 ${isDark ? 'border-slate-800/60' : 'border-slate-50'}`}>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-slate-400" /> CPU Speed
                    </span>
                    <div className="flex items-center gap-2">
                      <div className={`flex-1 h-1 rounded-full overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
                        <div className="bg-emerald-500 h-1" style={{ width: `${router.cpuUsage}%` }} />
                      </div>
                      <span className="text-xs font-mono font-bold">{router.cpuUsage}%</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-mono text-slate-405 text-slate-400 flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-slate-400" /> Memory Load
                    </span>
                    <div className="flex items-center gap-2">
                      <div className={`flex-1 h-1 rounded-full overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
                        <div className="bg-indigo-500 h-1" style={{ width: `${router.memoryUsage}%` }} />
                      </div>
                      <span className="text-xs font-mono font-bold">{router.memoryUsage}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Router online trackers and actions */}
              <div className={`border-t pt-3.5 flex items-center justify-between text-xs transition-colors ${
                isDark ? 'border-slate-800 text-slate-400' : 'border-slate-50 text-slate-500'
              }`}>
                <span>Active Users: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{router.onlineUsers}</strong></span>
                
                <button
                  onClick={() => {
                    if(confirm("Are you sure you want to deletion this Router?")) onDeleteRouter(router.id);
                  }}
                  className={`transition-colors cursor-pointer ${isDark ? 'text-slate-400 hover:text-rose-455 text-rose-400' : 'text-slate-400 hover:text-rose-600'}`}
                >
                  Disconnect Router
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-time live Bandwidth Consumption (Recharts Chart) */}
      <div className={`border rounded-xl p-5 shadow-sm space-y-4 transition-all ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="font-semibold flex items-center gap-2 text-sm md:text-base">
              <Activity className="w-5 h-5 text-indigo-500 animate-pulse" />
              Live Gateway Bandwidth Consumption (Throughput)
            </h3>
            <p className="text-[11px] text-slate-400">
              Live RADIUS AAA interface traffic tracking in Mbps. Rolling interval: 3 seconds.
            </p>
          </div>
          
          {bandwidthHistory.length > 0 && (
            <div className="flex items-center gap-3 font-mono text-xs">
              <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                isDark ? 'bg-slate-950 border border-slate-805' : 'bg-slate-50 border border-slate-200'
              }`}>
                <ArrowDown className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-slate-405 text-slate-400">Rx (Down):</span>
                <span className="font-bold text-sky-400">{bandwidthHistory[bandwidthHistory.length - 1].rx} Mbps</span>
              </div>
              
              <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1 ${
                isDark ? 'bg-slate-950 border border-slate-805' : 'bg-slate-50 border border-slate-200'
              }`}>
                <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-450 text-slate-400">Tx (Up):</span>
                <span className="font-bold text-emerald-400">{bandwidthHistory[bandwidthHistory.length - 1].tx} Mbps</span>
              </div>
            </div>
          )}
        </div>

        <div className="h-60 mt-2 min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={bandwidthHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#1e293b" : "#f1f5f9"} />
              <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} unit=" M" />
              <Tooltip 
                contentStyle={
                  isDark 
                    ? { backgroundColor: '#090d16', borderRadius: '12px', border: '1px solid #1e293b', color: '#fff' }
                    : { backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff' }
                }
                labelStyle={{ fontWeight: 'bold', fontSize: '11px' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Area 
                type="monotone" 
                dataKey="rx" 
                name="Rx (Download)" 
                stroke="#0ea5e9" 
                strokeWidth={2} 
                fillOpacity={1} 
                fill="url(#colorRx)" 
              />
              <Area 
                type="monotone" 
                dataKey="tx" 
                name="Tx (Upload)" 
                stroke="#10b981" 
                strokeWidth={2} 
                fillOpacity={1} 
                fill="url(#colorTx)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Central RADIUS Accounting: live active session tracking */}
      <div className={`border rounded-xl p-5 shadow-sm space-y-4 transition-all ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100'
      }`}>
        <div>
          <h3 className={`font-semibold font-sans ${isDark ? 'text-slate-100' : 'text-slate-850'}`}>Active RADIUS & Hotspot Sessions Table</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Live tracking for active MAC addresses linked to IP queues. Uptime and payload are updated in real-time.</p>
        </div>

        {tenantSessions.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No active online connections found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full text-left text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              <thead>
                <tr className={`border-b text-[10px] uppercase font-mono tracking-wider ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-400'}`}>
                  <th className="py-2.5">Payer Client</th>
                  <th className="py-2.5">Mac Station Address</th>
                  <th className="py-2.5">Station IP</th>
                  <th className="py-2.5">Device Frame</th>
                  <th className="py-2.5">Bandwidth Queue</th>
                  <th className="py-2.5">Data Shared Progress</th>
                  <th className="py-2.5">Uptime</th>
                  <th className="py-2.5 text-right">RADIUS COA Directives</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/40 text-slate-300' : 'divide-slate-50 text-slate-700'}`}>
                {tenantSessions.map(sess => {
                  const consumedBytes = sess.bytesUsed;
                  const maxAllowedBytes = thresholdMB * 1024 * 1024;
                  const ratio = consumedBytes / maxAllowedBytes;
                  const percent = Math.min(100, Math.round(ratio * 100));
                  
                  // Color selection for progress bar
                  let progressColor = 'bg-sky-500';
                  let textColor = 'text-sky-500';
                  if (percent >= 90) {
                    progressColor = 'bg-rose-500';
                    textColor = 'text-rose-500';
                  } else if (percent >= 70) {
                    progressColor = 'bg-amber-500';
                    textColor = 'text-amber-500';
                  }

                  return (
                    <tr key={sess.id} className={`font-sans transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/20'}`}>
                      <td className={`py-3 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{sess.customerName}</td>
                      <td className={`py-3 font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{sess.macAddress}</td>
                      <td className={`py-3 font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{sess.ipAddress}</td>
                      <td className={`py-3 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{sess.deviceName}</td>
                      <td className="py-3">
                        <span className={`text-[10px] border rounded px-1.5 py-0.5 font-semibold font-mono ${
                          isDark 
                            ? 'bg-slate-950 border-slate-800 text-slate-300' 
                            : 'bg-slate-100 border-slate-150 text-slate-600'
                        }`}>
                          {getSpeedLabel(sess.customerName)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-col gap-1 min-w-[140px]">
                          <div className="flex justify-between items-center text-[10px] font-mono">
                            <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                              {sess.bytesUsed >= 1024*1024*1024 
                                ? `${(sess.bytesUsed / (1024*1024*1024)).toFixed(2)} GB`
                                : `${(sess.bytesUsed / (1024*1024)).toFixed(1)} MB`
                              }
                            </span>
                            <span className={`font-black uppercase tracking-wider ${textColor}`}>
                              {percent}%
                            </span>
                          </div>
                          
                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${progressColor} ${percent >= 100 && isCapActive ? 'animate-pulse' : ''}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>

                          <div className="flex justify-between items-center text-[8.5px] text-slate-400 font-mono tracking-tight">
                            <span>Cap: {thresholdMB} MB</span>
                            {isCapActive ? (
                              <span className="text-[7.5px] uppercase bg-rose-500/10 text-rose-500 px-1 py-0.2 rounded font-bold border border-rose-500/20">
                                Auto-Cap Active
                              </span>
                            ) : (
                              <span className="text-[7.5px] uppercase bg-slate-500/10 text-slate-400 px-1 py-0.2 rounded font-bold">
                                Monitoring
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={`py-3 font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{sess.uptimeHours.toFixed(1)} hrs</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`Do you want to send RADIUS Disconnect-Request (COA) to drop session for ${sess.customerName}?`)) {
                              onDisconnectSession(sess.id);
                            }
                          }}
                          className={`text-[10px] border rounded px-2 py-1 font-semibold transition-colors flex items-center gap-1 ml-auto cursor-pointer ${
                            isDark 
                              ? 'bg-rose-950/30 text-rose-400 border-rose-900/40 hover:bg-rose-900/50' 
                              : 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100'
                          }`}
                        >
                          <UserMinus className="w-3 h-3" /> Drop User
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================= */}
      {/* NATIVE INTERACTIVE DIAGNOSTIC & DISPATCH CONTROL BOARD   */}
      {/* ======================================================= */}
      <div className={`border rounded-xl p-5 shadow-sm space-y-6 transition-all ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b pb-4 gap-4 border-slate-100 dark:border-slate-800/60">
          <div className="space-y-1">
            <h3 className="font-bold flex items-center gap-2 text-md">
              <Terminal className="w-5 h-5 text-indigo-500" />
              Advanced Field Link & Messaging Diagnostic Board
            </h3>
            <p className="text-xs text-slate-400">
              Direct interfaces for verification of physical TCP RouterOS API sockets and Safaricom / Africa's Talking delivery loops.
            </p>
          </div>
          
          <div className="flex gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-slate-950 text-xs border border-slate-200/50 dark:border-slate-805">
            <button
              onClick={() => setActiveBoardTab('routeros_terminal')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeBoardTab === 'routeros_terminal' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              RouterOS API Client
            </button>
            <button
              onClick={() => setActiveBoardTab('sms_gateway')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeBoardTab === 'sms_gateway' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Africa's Talking SMS
            </button>
          </div>
        </div>

        {/* TAB 1: MIKROTIK ROUTEROS NATIVE API DRIVER CLIENT */}
        {activeBoardTab === 'routeros_terminal' && (
          <div className="space-y-6">
            <form onSubmit={handleTestRouterConnection} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950/20 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase font-bold text-slate-400">Host IP/DNS</label>
                <input
                  type="text"
                  value={rotCredentials.host}
                  onChange={e => setRotCredentials({...rotCredentials, host: e.target.value})}
                  className="w-full bg-slate-950 dark:bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase font-bold text-slate-400">API Port</label>
                <input
                  type="text"
                  value={rotCredentials.port}
                  onChange={e => setRotCredentials({...rotCredentials, port: e.target.value})}
                  className="w-full bg-slate-950 dark:bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase font-bold text-slate-400">Username</label>
                <input
                  type="text"
                  value={rotCredentials.user}
                  onChange={e => setRotCredentials({...rotCredentials, user: e.target.value})}
                  className="w-full bg-slate-950 dark:bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-200"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase font-bold text-slate-400">Password</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="None"
                    value={rotCredentials.password}
                    onChange={e => setRotCredentials({...rotCredentials, password: e.target.value})}
                    className="w-full bg-slate-950 dark:bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-200"
                  />
                  <button
                    type="submit"
                    disabled={rotStatus === 'testing'}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-55 py-1.5 px-3 rounded font-semibold text-white transition-all whitespace-nowrap cursor-pointer flex items-center gap-1"
                  >
                    {rotStatus === 'testing' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />}
                    Verify API
                  </button>
                </div>
              </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Dynamic Status panel */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase tracking-wider font-mono font-bold text-slate-400 flex items-center gap-1.5">
                    Connection State
                  </h4>
                  {rotStatus === 'online' && (
                    <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      ● Port 8728 Open
                    </span>
                  )}
                  {rotStatus === 'offline' && (
                    <span className="bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      ● Link Offline
                    </span>
                  )}
                  {rotStatus === 'testing' && (
                    <span className="bg-amber-500/15 border border-amber-500/30 text-amber-500 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">
                      Handshake Auth...
                    </span>
                  )}
                  {rotStatus === 'idle' && (
                    <span className="bg-slate-500/15 border border-slate-500/30 text-slate-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Not Checked
                    </span>
                  )}
                </div>

                {rotDetails && (
                  <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-950/10 dark:bg-slate-900/15 space-y-3 text-xs">
                    <p className="font-medium text-slate-300">{rotDetails.message}</p>
                    
                    {rotDetails.version && (
                      <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
                        <div className="p-2 border rounded border-slate-200/30 bg-slate-105/5">
                          <span className="text-slate-400 block mb-0.5">Uptime</span>
                          <strong className="text-indigo-400">{rotDetails.uptime}</strong>
                        </div>
                        <div className="p-2 border rounded border-slate-200/30 bg-slate-105/5">
                          <span className="text-slate-400 block mb-0.5">RouterOS</span>
                          <strong className="text-emerald-400">v{rotDetails.version}</strong>
                        </div>
                        <div className="p-2 border rounded border-slate-200/30 bg-slate-105/5">
                          <span className="text-slate-400 block mb-0.5">CPU Load</span>
                          <strong className="text-sky-400">{rotDetails.cpuUsage}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Field controller log timeline */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">RouterOS Diagnostic History</span>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 text-[11px] font-mono">
                    {dbRotLogs.map(log => {
                      let tagColor = 'text-indigo-400';
                      if(log.type === 'error') tagColor = 'text-rose-400';
                      if(log.type === 'success') tagColor = 'text-emerald-400';

                      return (
                        <div key={log.id} className="p-2 border dark:border-slate-800/40 bg-slate-950/20 dark:bg-slate-950/50 rounded flex gap-2 justify-between items-start">
                          <div className="space-y-0.5">
                            <span className={`font-bold ${tagColor}`}>[{log.type.toUpperCase()}]</span>
                            <p className="text-slate-300 leading-tight">{log.message}</p>
                          </div>
                          <span className="text-[9px] text-slate-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Console command execution */}
              <div className="md:col-span-2 space-y-4">
                <form onSubmit={handleExecuteManualCommand} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono font-bold uppercase text-slate-400 flex items-center gap-1">
                      RouterOS Manual Console Sentence
                    </label>
                    <span className="text-[10px] text-slate-500 font-sans">Whitespace character separates words</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualCmd}
                      onChange={e => setManualCmd(e.target.value)}
                      placeholder="e.g. /queue/simple/print"
                      className="w-full bg-slate-950 dark:bg-slate-900 border border-slate-800 rounded px-3 py-2 font-mono text-xs text-emerald-400 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={isExecuting}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-55 px-4.5 py-2 font-semibold rounded text-white flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
                    >
                      {isExecuting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      Execute
                    </button>
                  </div>

                  {/* Diagnostic Presets Container */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase font-mono font-bold text-slate-500 block">Quick Sentinel Presets:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: 'Resource Info', cmd: '/system/resource/print' },
                        { label: 'Active Hotspots', cmd: '/ip/hotspot/active/print' },
                        { label: 'Simple Queues', cmd: '/queue/simple/print' },
                        { label: 'DHCP Leases', cmd: '/ip/dhcp-server/lease/print' },
                        { label: 'Interfaces', cmd: '/interface/print' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => executeCommandDirectly(preset.cmd)}
                          className="bg-slate-950 hover:bg-slate-900 text-[10px] font-mono border border-slate-800 text-slate-300 hover:text-indigo-400 px-2.5 py-1 rounded transition-colors cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </form>

                {/* Packet Trace log Panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Packet Byte Handshake Trace</span>
                    <div className="h-44 overflow-y-auto bg-slate-950 border border-slate-800/80 rounded-xl p-3 font-mono text-[10px] text-sky-400/90 leading-tight space-y-1">
                      {rawTrace.length === 0 ? (
                        <p className="text-slate-600 italic py-10 text-center">No active API trace recorded. Run Verify API or Execute sentence.</p>
                      ) : (
                        rawTrace.map((tr, idx) => {
                          let color = 'text-sky-400';
                          if (tr.includes('[TX]')) color = 'text-amber-400';
                          if (tr.includes('[SYS]')) color = 'text-indigo-400';
                          return <div key={idx} className={`${color} break-all`}>{tr}</div>;
                        })
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Console JSON Response</span>
                    <div className="h-44 overflow-y-auto bg-slate-950 border border-slate-800/80 rounded-xl p-3 font-mono text-[10px] text-emerald-400 leading-tight">
                      {cmdResult ? (
                        <pre className="break-all whitespace-pre-wrap">{cmdResult}</pre>
                      ) : (
                        <p className="text-slate-600 italic py-10 text-center">No statement payload returned yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AFRICA'S TALKING SMS GATEWAY CONTROL */}
        {activeBoardTab === 'sms_gateway' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Column 1: AT Credentials & Shortcuts */}
              <div className="space-y-4">
                <div className="bg-slate-950/20 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 space-y-3.5 text-xs">
                  <h4 className="font-bold flex items-center gap-1.5 text-slate-300">
                    <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                    Africa's Talking Credentials
                  </h4>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase font-bold text-slate-400">Username</label>
                    <input
                      type="text"
                      placeholder="sandbox"
                      value={smsConfigForm.username}
                      onChange={e => setSmsConfigForm({...smsConfigForm, username: e.target.value})}
                      className="w-full bg-slate-950 dark:bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase font-bold text-slate-400">API Key</label>
                    <input
                      type="password"
                      placeholder="•••••••••••••••••••••"
                      value={smsConfigForm.apiKey}
                      onChange={e => setSmsConfigForm({...smsConfigForm, apiKey: e.target.value})}
                      className="w-full bg-slate-950 dark:bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase font-bold text-slate-400">Sender ID / Code (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. WiFiFlow"
                      value={smsConfigForm.senderId}
                      onChange={e => setSmsConfigForm({...smsConfigForm, senderId: e.target.value})}
                      className="w-full bg-slate-950 dark:bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-200"
                    />
                  </div>
                  
                  <div className="text-[9.5px] text-slate-400 rounded-lg p-2.5 leading-relaxed bg-indigo-950/20 border border-indigo-900/30">
                    <strong>Note:</strong> Set username to <strong className="text-emerald-400">sandbox</strong> to activate Virtual Dispatcher, allowing complete offline sandbox SMS simulations with delivery timelines.
                  </div>
                </div>

                {/* SMS Campaign Shortcuts */}
                <div className="bg-slate-950/20 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 space-y-3.5 text-xs">
                  <h4 className="font-bold flex items-center gap-1.5 text-slate-300">
                    <Terminal className="w-4 h-4 text-sky-400" />
                    Quick Dispatch Templates
                  </h4>
                  <p className="text-[11px] text-slate-400 pb-1">Click to load pre-formatted Safaricom SMS payloads instantly:</p>
                  
                  <div className="space-y-2">
                    {[
                      {
                        title: "🎫 Hotspot Voucher code",
                        body: "WiFiFlow Payment Confirmed! KES 50 received for 3 Hours Unlimited. Voucher Code: WFLW-X89AB. Enjoy blazing-fast speed!"
                      },
                      {
                        title: "⏳ Broadband Renewal notice",
                        body: "Dear customer, your 10 Mbps Home Fiber subscription on WiFiFlow expires tomorrow. Renew now via Paybill 174379."
                      },
                      {
                        title: "⚡ Promo Weekend Speedboost",
                        body: "Weekend Special! Get double Speed on your active voucher for just KES 30. Dial *482# or login to request upgrade."
                      }
                    ].map((tmpl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSmsForm({ ...smsForm, message: tmpl.body })}
                        className="w-full text-left p-2.5 border border-slate-850 hover:border-indigo-500/50 rounded-lg bg-slate-950/40 hover:bg-slate-900/50 text-slate-300 transition-all cursor-pointer text-[10.5px] block space-y-1"
                      >
                        <span className="font-bold block text-indigo-400 text-xs">{tmpl.title}</span>
                        <p className="line-clamp-2 text-[10px] text-slate-400">{tmpl.body}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Column 2: SMS Dispatcher Form & Live Smartphone Mockup */}
              <div className="space-y-4">
                <form onSubmit={handleSendManualSms} className="bg-slate-950/20 dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 space-y-3.5 text-xs">
                  <h4 className="font-bold flex items-center gap-1.5 text-slate-300">
                    <Send className="w-4 h-4 text-indigo-500" />
                    Direct Messenger Console
                  </h4>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase font-bold text-slate-400">Recipient Phone</label>
                    <input
                      type="text"
                      value={smsForm.to}
                      onChange={e => setSmsForm({...smsForm, to: e.target.value})}
                      placeholder="e.g. 254712345678"
                      className="w-full bg-slate-950 dark:bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-slate-200 font-bold text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase font-bold text-slate-400">Message Body</label>
                    <textarea
                      rows={3}
                      value={smsForm.message}
                      onChange={e => setSmsForm({...smsForm, message: e.target.value})}
                      placeholder="Voucher details..."
                      className="w-full bg-slate-950 dark:bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 leading-normal text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSendingSms || !smsForm.to || !smsForm.message}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-55 py-2 rounded font-bold text-white transition-all text-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSendingSms ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Send SMS Payload
                  </button>

                  {smsResult && (
                    <div className="p-2.5 rounded bg-slate-950/40 border border-slate-800 text-[10.5px]">
                      {smsResult.success ? (
                        <div className="text-emerald-400 space-y-1">
                          <p className="font-bold">✓ Dispatch Processed</p>
                          <p className="text-[9.5px]">ID: {smsResult.result?.messageId} ({smsResult.result?.status})</p>
                          <p className="text-[9.5px]">Cost: {smsResult.result?.cost || "KES 0.0"}</p>
                        </div>
                      ) : (
                        <div className="text-rose-400 space-y-1">
                          <p className="font-bold">✗ Delivery Refused</p>
                          <p className="text-[9.5px]">{smsResult.error || "Connection timed out."}</p>
                        </div>
                      )}
                    </div>
                  )}
                </form>

                {/* Smartphone Preview Visualizer Mockup */}
                <div className="border border-slate-800 bg-slate-950 rounded-2xl overflow-hidden p-3.5 shadow-lg space-y-2.5 text-slate-200">
                  <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 border-b border-slate-900 pb-1.5">
                    <span>Safaricom 5G</span>
                    <span className="font-bold">14:22 PM</span>
                    <span>100% 🔋</span>
                  </div>
                  
                  <div className="text-center text-[10px] text-slate-550 pt-1 font-semibold">
                    Sender Code: <span className="text-slate-350">{smsConfigForm.senderId || "WiFiFlow"}</span>
                  </div>

                  <div className="space-y-2 py-1">
                    <div className="bg-slate-900 border border-slate-850 rounded-2xl p-3 text-[11px] max-w-[90%] left-0 relative space-y-1 shadow-sm leading-relaxed">
                      <p className="text-slate-300">
                        {smsForm.message || <span className="italic text-slate-600">Start drafting or select speed templates to preview message markup...</span>}
                      </p>
                      <span className="block text-[8px] text-right text-slate-500 font-mono">14:22 PM</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 3: Transmission History logs */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">Africa's Talking Transmit History</span>
                <div className="max-h-[580px] overflow-y-auto space-y-2 text-[11px] font-mono pr-1">
                  {smsLogs.length === 0 ? (
                    <p className="text-slate-600 italic py-10 text-center text-xs">No SMS delivery logged.</p>
                  ) : (
                    smsLogs.map(log => {
                      let statusBadgeColor = 'bg-slate-500/10 text-slate-400';
                      if(log.status === 'SUCCESS') statusBadgeColor = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20';
                      if(log.status === 'SIMULATED') statusBadgeColor = 'bg-sky-500/15 text-sky-400 border border-sky-500/20';
                      if(log.status === 'FAILED') statusBadgeColor = 'bg-rose-500/15 text-rose-400 border border-rose-500/20';

                      return (
                        <div key={log.id} className="p-2.5 border dark:border-slate-800 bg-slate-950/20 dark:bg-slate-950/40 rounded-xl space-y-1.5">
                          <div className="flex justify-between items-center text-[10px]">
                            <strong className="text-indigo-400">{log.to}</strong>
                            <span className={`px-1.5 py-0.2 rounded font-bold uppercase tracking-wide ${statusBadgeColor}`}>
                              {log.status}
                            </span>
                          </div>
                          
                          <p className="text-slate-300 leading-normal text-[10.5px]">"{log.message}"</p>
                          
                          <div className="flex justify-between items-center text-[9px] text-slate-500">
                            <span>Cost: {log.cost || 'KES 0.00'}</span>
                            <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
