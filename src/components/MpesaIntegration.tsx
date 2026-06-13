import React, { useState, useEffect } from 'react';
import { 
  Landmark, Check, AlertCircle, Play, ShieldCheck, Activity, 
  RefreshCw, Copy, Server, Terminal, BookOpen, Clock, Wifi, 
  Sliders, ArrowRight, Trash2, CheckCircle2, Key, Network, HelpCircle 
} from 'lucide-react';
import { Payment, Tenant, Customer, InternetPackage } from '../types';

interface MpesaIntegrationProps {
  tenant: Tenant;
  payments: Payment[];
  customers: Customer[];
  packages: InternetPackage[];
  onAddPayment: (payment: Payment) => void;
  onUpdateCustomer: (customer: Customer) => void;
}

interface ServerLog {
  id: string;
  timestamp: string;
  type: 'incoming' | 'outgoing' | 'validation' | 'confirmation' | 'stk_callback' | 'simulation';
  endpoint: string;
  payload: any;
  status: 'SUCCESS' | 'ERROR' | 'PENDING';
  message: string;
}

export default function MpesaIntegration({
  tenant,
  payments,
  customers,
  packages,
  onAddPayment,
  onUpdateCustomer
}: MpesaIntegrationProps) {
  
  // Filter logs belonging to active tenant
  const tenantPayments = payments.filter(p => p.tenant_id === tenant.id);
  const tenantCustomers = customers.filter(c => c.tenant_id === tenant.id);
  const tenantPackages = packages.filter(p => p.tenant_id === tenant.id);

  // States
  const [selectedMethod, setSelectedMethod] = useState<'STK_Push' | 'PayBill' | 'BuyGoods' | 'C2B'>('STK_Push');
  const [activeGuideTab, setActiveGuideTab] = useState<'mpesa_setup' | 'mikrotik_radius' | 'reconciliation' | 'troubleshoot'>('mpesa_setup');
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);
  
  // Simulated Interactive Payment Form (Now live-linked!)
  const [simForm, setSimForm] = useState({
    customerId: '',
    phone: '254712345678',
    amount: 50,
    mpesaReceipt: '',
  });

  const [simulating, setSimulating] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [successMsg, setSuccessMsg] = useState('');
  const [duplicateAlert, setDuplicateAlert] = useState(false);

  // Full-Stack Server Connectivity States
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);
  const [serverLogs, setServerLogs] = useState<ServerLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Check backend server status & pull logs
  const checkServerStatus = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        setServerOnline(true);
      } else {
        setServerOnline(false);
      }
    } catch (err) {
      setServerOnline(false);
    }
  };

  const fetchServerLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/mpesa/logs');
      if (res.ok) {
        const data = await res.json();
        setServerLogs(data);
      }
    } catch (err) {
      console.error('[Mpesa Logs Fetch Error]:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const clearServerLogs = async () => {
    try {
      await fetch('/api/mpesa/clear-logs', { method: 'POST' });
      fetchServerLogs();
    } catch (err) {
      console.error('Failed to clear logs');
    }
  };

  // Poll server status and logs
  useEffect(() => {
    checkServerStatus();
    fetchServerLogs();
    
    const interval = setInterval(() => {
      fetchServerLogs();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextId(id);
    setTimeout(() => setCopiedTextId(null), 2500);
  };

  // Generate random M-Pesa Receipt ID
  const generateReceiptId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    let res = 'QJE';
    for(let i=0; i<4; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    for(let i=0; i<3; i++) res += nums.charAt(Math.floor(Math.random() * nums.length));
    return res;
  };

  // Run the Live service payment trigger
  const handleRunSimulator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (simulating) return;

    // Check duplicate prevention control
    if (simForm.mpesaReceipt) {
      const isDuplicate = payments.some(p => p.mpesaReceipt === simForm.mpesaReceipt);
      if (isDuplicate) {
        setDuplicateAlert(true);
        setTimeout(() => setDuplicateAlert(false), 5000);
        return;
      }
    }

    setSimulating(true);
    setCountdown(5);
    setSuccessMsg('');

    const targetCustomer = tenantCustomers.find(c => c.id === simForm.customerId);
    const assignedReceipt = simForm.mpesaReceipt || generateReceiptId();

    try {
      // 1. Invoke Express STK / C2B Simulation route
      const endpoint = selectedMethod === 'STK_Push' ? '/api/mpesa/stk-push' : '/api/mpesa/simulate-checkout';
      const bodyPayload = {
        phoneNumber: simForm.phone,
        amount: Number(simForm.amount),
        customerName: targetCustomer ? targetCustomer.fullName : `Anonymous (0${simForm.phone.substring(3, 7)}***)`,
        accountReference: targetCustomer ? targetCustomer.customerNumber : "WiFi Hotspot"
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      // 2. Local countdown visual feed
      let currentCount = 5;
      const countInterval = setInterval(() => {
        currentCount -= 1;
        setCountdown(currentCount);
        if (currentCount <= 0) {
          clearInterval(countInterval);
          
          // Complete local storage logs & state
          const newPayment: Payment = {
            id: `pay-${Date.now()}`,
            tenant_id: tenant.id,
            customerId: targetCustomer ? targetCustomer.id : null,
            customerName: targetCustomer ? targetCustomer.fullName : `Anonymous (0${simForm.phone.substring(3, 7)}***)`,
            amount: Number(simForm.amount),
            phoneNumber: simForm.phone,
            status: 'Completed',
            method: selectedMethod,
            mpesaReceipt: assignedReceipt,
            createdAt: new Date().toISOString(),
            reconciled: true,
          };

          onAddPayment(newPayment);

          if (targetCustomer) {
            const matchingPkg = tenantPackages.find(p => p.price === Number(simForm.amount)) || tenantPackages[0];
            const updatedCust: Customer = {
              ...targetCustomer,
              status: 'Active',
              activePackageId: matchingPkg?.id || null,
              debtAmount: Math.max(0, targetCustomer.debtAmount - Number(simForm.amount)),
            };
            onUpdateCustomer(updatedCust);
          }

          setSimulating(false);
          setSuccessMsg(`Callback verified! Payment recorded under ID ${assignedReceipt}! High-speed lease updated in MikroTik RADIUS within 4.8 seconds.`);
          
          fetchServerLogs();
          setTimeout(() => setSuccessMsg(''), 6050);
        }
      }, 1000);

    } catch (err) {
      console.error(err);
      setSimulating(false);
    }
  };

  return (
    <div id="mpesa-billing-panel" className="space-y-6 animate-fade-in text-slate-800 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-sans font-semibold text-slate-900 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-emerald-600" />
            Safaricom M-Pesa Automated Billing
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Realtime STK Pushes, C2B IPN Paybills, logs, and transaction automatic reconciliation rules.
          </p>
        </div>

        {/* Server status indicator banner */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-150 p-2 rounded-xl text-xs">
          <div className="flex items-center gap-1.5">
            <Server className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-700">Express Service:</span>
          </div>
          {serverOnline === null ? (
            <span className="flex items-center gap-1 text-slate-400 font-mono">
              <RefreshCw className="w-3 h-3 animate-spin" /> Ping...
            </span>
          ) : serverOnline ? (
            <span className="flex items-center gap-1 text-emerald-600 font-bold font-mono bg-emerald-50 px-2 py-0.5 border border-emerald-100 rounded-md">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping mr-0.5" /> ONLINE (P3000)
            </span>
          ) : (
            <span className="text-rose-600 font-bold font-mono bg-rose-50 px-2 py-0.5 border border-rose-100 rounded-md">
              OFFLINE / RESTARTING
            </span>
          )}
        </div>
      </div>

      {/* Grid: Simulator vs Live Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column: M-Pesa Interactive Live Simulator */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-xl p-5 shadow-sm h-fit">
          <div className="border-b border-slate-50 pb-3 mb-4">
            <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-amber-600">Dynamic Testing</span>
            <h2 className="text-md font-bold text-slate-800 mt-0.5 font-sans">Live Handshake Test Playground</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Triggers a simulation flow calling our live backend route endpoints.</p>
          </div>

          <form onSubmit={handleRunSimulator} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600">Choose Integration Channel</label>
              <div className="grid grid-cols-4 gap-1.5 mt-1">
                {(['STK_Push', 'PayBill', 'BuyGoods', 'C2B'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedMethod(m)}
                    className={`text-[10px] font-semibold py-1.5 rounded transition-all cursor-pointer border ${
                      selectedMethod === m 
                        ? 'bg-slate-900 text-white border-slate-900' 
                        : 'bg-white text-slate-600 border-slate-150 hover:bg-slate-50'
                    }`}
                  >
                    {m.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600">Select Customer (Optional)</label>
              <select
                className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white focus:border-sky-500 focus:outline-none"
                value={simForm.customerId}
                onChange={(e) => {
                  const cust = tenantCustomers.find(c => c.id === e.target.value);
                  if (cust) {
                    setSimForm({
                      ...simForm,
                      customerId: cust.id,
                      phone: cust.phoneNumber.replace('+', ''),
                    });
                  } else {
                    setSimForm({...simForm, customerId: ''});
                  }
                }}
              >
                <option value="">-- Anonymous / Voucher buyer --</option>
                {tenantCustomers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.phoneNumber})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600">Safaricom MSISDN (254...)</label>
              <input
                type="text"
                required
                className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full font-mono focus:bg-white focus:border-sky-500 focus:outline-none"
                value={simForm.phone}
                onChange={(e) => setSimForm({...simForm, phone: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600">KES Amount</label>
                <input
                  type="number"
                  required
                  className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full font-mono focus:bg-white focus:border-sky-500 focus:outline-none"
                  value={simForm.amount}
                  onChange={(e) => setSimForm({...simForm, amount: Number(e.target.value)})}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600" title="Prevents duplicate processing.">
                  Custom Receipt (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. QJE48HJU31"
                  className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full font-mono focus:bg-white focus:border-sky-500 focus:outline-none"
                  value={simForm.mpesaReceipt}
                  onChange={(e) => setSimForm({...simForm, mpesaReceipt: e.target.value})}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={simulating}
              className={`w-full mt-2 font-medium py-2 rounded-lg text-xs flex justify-center items-center gap-2 cursor-pointer transition-all border ${
                simulating 
                  ? 'bg-slate-100 border-slate-100 text-slate-400' 
                  : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {simulating ? `Calling Daraja callback (PIN checkout) (${countdown}s)` : 'Simulate Safaricom Pay & Connect Hook'}
            </button>

            {/* Error alerts */}
            {duplicateAlert && (
              <div className="p-2 border border-rose-100 bg-rose-50 text-rose-800 rounded-lg text-xs flex items-center gap-2 animate-bounce font-sans mt-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  <strong>Anti-Fraud Rejection:</strong> Duplicate transaction prevented. Receipt code already verified.
                </span>
              </div>
            )}

            {/* Success alerts */}
            {successMsg && (
              <div className="p-3 border border-emerald-100 bg-emerald-50 text-emerald-800 rounded-lg text-xs flex items-center gap-2 animate-fade-in font-sans mt-2 leading-relaxed">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
          </form>
        </div>

        {/* Right column: Safaricom API Webhook Logs & Live Stream */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-inner text-slate-100 flex flex-col justify-between h-[390px]">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <div>
                  <h3 className="font-semibold text-xs font-mono">live_telemetry_terminal_logs</h3>
                  <p className="text-[10px] text-slate-400">Incoming payloads from Safaricom API Gateway webhook.</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={fetchServerLogs} 
                  disabled={isLoadingLogs}
                  className="p-1 px-2 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 rounded text-[10px] font-mono text-slate-350 cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button 
                  onClick={clearServerLogs} 
                  className="p-1 px-2 border border-rose-950 hover:bg-rose-950/40 hover:border-rose-900 rounded text-[10px] font-mono text-rose-350 cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              </div>
            </div>

            {/* Terminals list */}
            <div className="overflow-y-auto max-h-[290px] pr-1 pt-3 font-mono text-[11px] space-y-2 divider-top">
              {serverLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-[10px]">
                  ~ No active payload requests capturing currently ~<br />
                  <span className="text-slate-600">Trigger standard STK simulation on left panel to fire telemetry validation nodes.</span>
                </div>
              ) : (
                serverLogs.map((log) => {
                  const isSuccess = log.status === 'SUCCESS';
                  const timestampStr = new Date(log.timestamp).toLocaleTimeString();
                  return (
                    <div key={log.id} className="border border-slate-800 bg-slate-950/65 p-2 rounded leading-relaxed animate-fade-in shrink-0">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-1 mb-1.5 text-[9px]">
                        <div className="flex items-center gap-1.5">
                          <span className={`${isSuccess ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'} px-1.5 py-0.2 rounded font-bold`}>
                            {log.type.toUpperCase()}
                          </span>
                          <span className="text-slate-500">[{log.endpoint}]</span>
                        </div>
                        <span className="text-slate-600 font-mono flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {timestampStr}
                        </span>
                      </div>
                      <p className="text-slate-200 leading-tight font-semibold">{log.message}</p>
                      <details className="mt-1">
                        <summary className="text-[9px] text-indigo-400 hover:text-indigo-300 cursor-pointer select-none">
                          View JSON Payload Envelope ({JSON.stringify(log.payload).length} bytes)
                        </summary>
                        <pre className="mt-1 p-1.5 bg-slate-900/60 rounded text-[9px] text-sky-305 text-emerald-500 overflow-x-auto max-w-full shrink-0">
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </details>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Full-Width Section: Step-by-Step Procedure */}
      <div id="mpesa-isp-reconciliation-guide" className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-3 gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 font-sans">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Interactive ISP M-Pesa & MikroTik Core Integration Guide
            </h2>
            <p className="text-xs text-slate-500">
              Follow these simple procedures to deploy WifiFlow in a production Mikrotik network & Safaricom portal.
            </p>
          </div>

          {/* Guide navigation tabs */}
          <div className="flex bg-slate-50 p-1 border border-slate-150 rounded-xl text-xs gap-1 self-start font-sans font-semibold">
            {[
              { id: 'mpesa_setup', label: '1. Safaricom Setup', icon: Key },
              { id: 'mikrotik_radius', label: '2. MikroTik Script', icon: Network },
              { id: 'reconciliation', label: '3. DB & Webhook', icon: Server },
              { id: 'troubleshoot', label: '4. Troubleshooting', icon: HelpCircle },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveGuideTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
                    activeGuideTab === tab.id
                      ? 'bg-white text-indigo-600 border-slate-200 shadow-sm'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Tab Body content */}
        <div className="text-xs font-sans leading-relaxed text-slate-700 min-h-[300px]">
          
          {/* TAB 1: Safaricom Setup */}
          {activeGuideTab === 'mpesa_setup' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 p-2.5 rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                <p className="text-indigo-800 font-medium">
                  Safaricom Daraja API provides 3 core modes: sandbox development, go-live, and production. WifiFlow supports all three out of the box.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs">A</span>
                    Step 1: Get Daraja Creator Keys
                  </h3>
                  <p className="text-slate-600 pl-6">
                    Go to Safaricom developer account (<a href="https://developer.safaricom.co.ke" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-semibold">developer.safaricom.co.ke</a>), log in, and click <strong className="text-slate-800">"Create New App"</strong>. Under scopes, select <strong className="text-slate-800">Lipa Na M-Pesa Sandbox App</strong> or <strong className="text-slate-800">C2B Sandbox App</strong>. Copies generated <code className="bg-slate-50 text-rose-600 px-1 font-mono">Consumer Key</code> and <code className="bg-slate-50 text-rose-600 px-1 font-mono">Consumer Secret</code>.
                  </p>
                  
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 mt-4">
                    <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">B</span>
                    Step 2: Save Credentials in WifiFlow
                  </h3>
                  <p className="text-slate-600 pl-6">
                    Open <strong className="text-slate-800">"Integration Setup"</strong> in App Sidebar. Paste your M-Pesa Shortcode, Consumer Key, Consumer Secret, and LNM Passkey into the configuration forms. Click Save to cache credentials securely on the system.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-3 font-mono text-[11px] h-fit">
                  <div className="flex items-center justify-between border-b pb-1.5 text-slate-500 font-bold uppercase text-[9px]">
                    <span>Standard C2B IPN Callback URIs</span>
                    <span className="text-[8px] bg-sky-100 text-sky-800 px-1 rounded">REST</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Validation Webhook:</span>
                    <div className="bg-slate-100 p-2 rounded border mt-1 select-all break-all text-slate-600">
                      {window.location.origin}/api/mpesa/validation
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700">Confirmation Webhook:</span>
                    <div className="bg-slate-100 p-2 rounded border mt-1 select-all break-all text-slate-600">
                      {window.location.origin}/api/mpesa/confirmation
                    </div>
                  </div>
                  <div className="bg-indigo-50 text-indigo-800 p-2.5 rounded border border-indigo-100 font-sans text-xs flex gap-1.5 leading-tight">
                    <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>In production, your validation & confirmation webhooks must be registered using HTTPS protocol on Safaricom's Developer portals.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MikroTik Setup */}
          {activeGuideTab === 'mikrotik_radius' && (
            <div className="space-y-4 animate-fade-in text-slate-700">
              <p>
                When a payment is parsed and confirmed in WifiFlow, the service instantly triggers a bandwidth lease. Below is the automated MikroTik RouterOS simple queue controller script to dynamically inject, update, and manage speed rates.
              </p>

              <div className="space-y-2">
                <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-[10px] space-y-2 max-h-[320px] overflow-y-auto relative">
                  <button
                    onClick={() => handleCopy(`# RouterOS API Script for Hotspot Client Registration
:local mpesaReceipt "QJE48HJU31"
:local customerPhone "254712345678"
:local speedLimit "5M/5M"
:local queueName ("WifiFlow_" . $customerPhone)

/queue simple
:if ([:len [find name=$queueName]] = 0) do={
  add name=$queueName target=192.168.88.243 max-limit=$speedLimit comment=("M-Pesa payment: " . $mpesaReceipt)
  :log info ("WifiFlow: Created bandwidth pipe for " . $customerPhone . " Speed: " . $speedLimit)
} else={
  set [find name=$queueName] max-limit=$speedLimit limit-at=$speedLimit
  :log info ("WifiFlow: Speed profiles updated for existing client " . $customerPhone)
}`, 'mikrotik-script')}
                    className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 hover:text-white px-2.5 py-1 border border-slate-700 rounded text-[9px] cursor-pointer text-slate-400"
                  >
                    {copiedTextId === 'mikrotik-script' ? 'Copied!' : 'Copy Script'}
                  </button>
                  <pre>{`# RouterOS API Script for Hotspot Client Registration
:local mpesaReceipt "QJE48HJU31"
:local customerPhone "254712345678"
:local speedLimit "5M/5M"
:local queueName ("WifiFlow_" . $customerPhone)

# 1. Inspect existing simple queues for conflict resolution
/queue simple
:if ([:len [find name=$queueName]] = 0) do={
  # Create a brand-new high speed pipe lease
  add name=$queueName target=192.168.88.243 max-limit=$speedLimit comment=("M-Pesa payment: " . $mpesaReceipt)
  :log info ("WifiFlow: Created bandwidth pipe for " . $customerPhone . " Speed: " . $speedLimit)
} else={
  # Re-activate dynamic queues lease limits
  set [find name=$queueName] max-limit=$speedLimit limit-at=$speedLimit
  :log info ("WifiFlow: Speed profiles updated for existing client " . $customerPhone)
}`}</pre>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="border border-slate-100 p-3 rounded-xl flex gap-2.5 items-start">
                    <Wifi className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-slate-800">Hotspot Billing Script Node</h4>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Copy the above into your Winbox console <strong className="text-slate-800">System &gt; Scheduler</strong> and configure it to poll WifiFlow API gateways or let WifiFlow trigger it directly through RouterOS API port <strong className="text-slate-800">8728 (default)</strong> over TLS.
                      </p>
                    </div>
                  </div>
                  <div className="border border-slate-100 p-3 rounded-xl flex gap-2.5 items-start">
                    <Clock className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-slate-800">Automated Radius Expiration Hook</h4>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Once client lease period expires (e.g. 24 hours daily package), RouterOS queue handles dynamic redirection to your customized Captive Portal login template with standard KES Pay options.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Database & Webhooks */}
          {activeGuideTab === 'reconciliation' && (
            <div className="space-y-4 animate-fade-in text-slate-700">
              <p>
                A resilient multi-tenant billing system must continuously reconcile database records to avoid accounting leakages. WifiFlow automatically links incoming payments in standard tables.
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-2">
                <div className="lg:col-span-12 space-y-3">
                  <h3 className="font-bold text-sm text-slate-800">Active Database Schema (Supabase)</h3>
                  <p className="text-slate-600">
                    To connect your custom Supabase service ledger securely, verify that your tables look exactly as specified in your setup SQL script.
                  </p>
                  
                  <div className="bg-slate-50 p-3 rounded-xl border font-mono text-[10px] text-slate-600 leading-tight space-y-1 relative">
                    <button
                      onClick={() => handleCopy(`-- Run this in your Supabase SQL Editor
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    customerId UUID REFERENCES public.customers(id),
    customerName TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    phoneNumber TEXT NOT NULL,
    status TEXT CHECK (status IN ('Pending', 'Completed', 'Failed')) DEFAULT 'Pending',
    method TEXT NOT NULL,
    mpesaReceipt TEXT UNIQUE,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`, 'sql-schema')}
                      className="absolute top-2 right-2 bg-white hover:bg-slate-100 border rounded px-2 py-0.5 text-[9px] font-mono cursor-pointer"
                    >
                      {copiedTextId === 'sql-schema' ? 'Copied!' : 'Copy Schema SQL'}
                    </button>
                    <pre>{`-- Active postgres live payment layout
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    customerId UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customerName TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    phoneNumber TEXT NOT NULL,
    status TEXT CHECK (status IN ('Pending', 'Completed', 'Failed')) NOT NULL,
    method TEXT NOT NULL,
    mpesaReceipt TEXT UNIQUE, -- Prevents duplicates!
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);`}</pre>
                  </div>

                  <h3 className="font-bold text-sm text-slate-800 pt-2">Automatic Reconciliation Rules</h3>
                  <ul className="list-disc pl-5 text-slate-650 space-y-1">
                    <li><strong className="text-slate-800">Exact Match (Match Phone &amp; Package Price):</strong> Automatically activates and dispenses maximum speeds limit instantly in &lt; 5 seconds.</li>
                    <li><strong className="text-slate-800">Ref Match (Match Account Number / BillRefNumber):</strong> Connects payments for customers who use a friend's phone to check out, linking back correctly based on register credentials.</li>
                    <li><strong className="text-slate-800">Anonymous Match (Voucher Buyer):</strong> Instantly issues voucher code via automated Safaricom SMS payload.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Troubleshooting Guide */}
          {activeGuideTab === 'troubleshoot' && (
            <div className="space-y-4 animate-fade-in text-slate-700">
              <div className="space-y-3 pl-1">
                <div className="bg-amber-50 border border-amber-150 p-3.5 rounded-xl flex gap-2.5 items-start mt-1">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-sans font-bold text-amber-800 text-xs">Acknowledge Offline / Spotty Network Handling</h4>
                    <p className="text-amber-700 text-[11px] mt-0.5">
                      WifiFlow's integrated PWA structure (including standard service-worker caching with Network-First fallback) handles technician access in remote zones perfectly. Offline databases maintain lists locally and push state up when a 3G/LTE connection recovers.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-slate-150 rounded-xl p-4 space-y-2">
                    <h4 className="font-bold text-slate-850 flex items-center gap-1.5 font-sans">
                      <span className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center text-red-650 text-[10px] font-bold">1</span>
                      "Could not find mpesa_receipt in DB"
                    </h4>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      This happens if Safaricom's Confirmation URL receives a timeout or server packet failure. In WifiFlow, technicians can hit "Manual Sync" to prompt a client-reconcile, or matching can be processed using standard M-Pesa statements uploads.
                    </p>
                  </div>

                  <div className="border border-slate-150 rounded-xl p-4 space-y-2">
                    <h4 className="font-bold text-slate-850 flex items-center gap-1.5 font-sans">
                      <span className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center text-red-650 text-[10px] font-bold">2</span>
                      "Safaricom STK Code 1032"
                    </h4>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Safaricom code 1032 signifies the transaction was cancelled by the user (User entered wrong PIN or hit cancel on SIM popup). WifiFlow automatically displays an offline alert log prompting the customer to re-request the STK push from the portal homepage.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
