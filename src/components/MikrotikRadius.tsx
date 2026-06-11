import React, { useState, useEffect } from 'react';
import { 
  Network, Radio, Activity, CheckCircle, RefreshCw, XCircle, 
  Trash2, ShieldAlert, Cpu, HardDrive, UserMinus, Plus, Info, Wifi, ArrowUp, ArrowDown
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

        <div className="h-60 mt-2">
          <ResponsiveContainer width="100%" height="100%">
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
    </div>
  );
}
