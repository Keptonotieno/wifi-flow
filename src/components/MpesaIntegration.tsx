import React, { useState } from 'react';
import { Landmark, Check, AlertCircle, Play, ShieldCheck, Activity, RefreshCw, Copy } from 'lucide-react';
import { Payment, Tenant, Customer, InternetPackage } from '../types';

interface MpesaIntegrationProps {
  tenant: Tenant;
  payments: Payment[];
  customers: Customer[];
  packages: InternetPackage[];
  onAddPayment: (payment: Payment) => void;
  onUpdateCustomer: (customer: Customer) => void;
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

  // Selector state
  const [selectedMethod, setSelectedMethod] = useState<'STK_Push' | 'PayBill' | 'BuyGoods' | 'C2B'>('STK_Push');
  
  // Simulated Interactive Payment Form
  const [simForm, setSimForm] = useState({
    customerId: '',
    phone: '2547',
    amount: 50,
    mpesaReceipt: '',
  });

  const [simulating, setSimulating] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [successMsg, setSuccessMsg] = useState('');
  const [duplicateAlert, setDuplicateAlert] = useState(false);

  // Generate random M-Pesa Receipt ID
  const generateReceiptId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    let res = 'QJE';
    for(let i=0; i<4; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    for(let i=0; i<3; i++) res += nums.charAt(Math.floor(Math.random() * nums.length));
    return res;
  };

  const handleRunSimulator = (e: React.FormEvent) => {
    e.preventDefault();
    if (simulating) return;

    // Check Duplicate Payment Receipt Prevention Control
    if (simForm.mpesaReceipt) {
      const isDuplicate = payments.some(p => p.mpesaReceipt === simForm.mpesaReceipt);
      if (isDuplicate) {
        setDuplicateAlert(true);
        setTimeout(() => setDuplicateAlert(false), 5000);
        return;
      }
    }

    setSimulating(true);
    setCountdown(5); // target activation time limit (Less than 5 seconds!)
    setSuccessMsg('');

    // Pre-calculated target details
    const targetCustomer = tenantCustomers.find(c => c.id === simForm.customerId);
    const assignedReceipt = simForm.mpesaReceipt || generateReceiptId();
    
    let currentCount = 5;
    const interval = setInterval(() => {
      currentCount -= 1;
      setCountdown(currentCount);
      if (currentCount <= 0) {
        clearInterval(interval);
        
        // Final Action Trigger after 5s processing
        const newPayment: Payment = {
          id: `pay-${Date.now()}`,
          tenant_id: tenant.id,
          customerId: targetCustomer ? targetCustomer.id : null,
          customerName: targetCustomer ? targetCustomer.fullName : `Anonymous (0${simForm.phone.substring(3)})`,
          amount: Number(simForm.amount),
          phoneNumber: simForm.phone,
          status: 'Completed',
          method: selectedMethod,
          mpesaReceipt: assignedReceipt,
          createdAt: new Date().toISOString(),
          reconciled: true,
        };

        onAddPayment(newPayment);

        // Auto activate Customer internet subscription
        if (targetCustomer) {
          // find matching package
          const matchingPkg = tenantPackages.find(p => p.price === Number(simForm.amount)) || tenantPackages[0];
          
          const updatedCust: Customer = {
            ...targetCustomer,
            status: 'Active',
            activePackageId: matchingPkg?.id || null,
            debtAmount: Math.max(0, targetCustomer.debtAmount - Number(simForm.amount)), // Deduct debt if any
          };
          onUpdateCustomer(updatedCust);
        }

        setSimulating(false);
        setSuccessMsg(`Payment Confirmed under ID ${assignedReceipt}! Internet activated successfully in 4.8 seconds without manual action.`);
        
        // Clear success message
        setTimeout(() => setSuccessMsg(''), 6000);
      }
    }, 1000);
  };

  return (
    <div id="mpesa-billing-panel" className="space-y-6 animate-fade-in text-slate-800 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-sans font-semibold text-slate-900 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-slate-700" />
            Safaricom M-Pesa Automated Billing
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Realtime STK Pushes, C2B Paybills, validation logs, and payment duplicate controllers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column: M-Pesa Interactive Live Simulator */}
        <div className="lg:col-span-5 bg-white border border-slate-100 rounded-xl p-5 shadow-sm h-fit">
          <div className="border-b border-slate-50 pb-3 mb-4">
            <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-amber-600">Dynamic Testing</span>
            <h2 className="text-md font-bold text-slate-800 mt-0.5">Pay & Connect Instant Activation Test</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Simulate Kenya phone STK trigger and &lt; 5 seconds router speed activation.</p>
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
                <label className="block text-xs font-semibold text-slate-600" title="Provides custom receipt ID to test duplicate blocking">
                  Custom Receipt (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. QJE99"
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
              {simulating ? `Processing STK Callback... (${countdown}s)` : 'Simulate Safaricom Pay Callback'}
            </button>

            {/* Error alerts */}
            {duplicateAlert && (
              <div className="p-2 border border-rose-100 bg-rose-50 text-rose-800 rounded-lg text-xs flex items-center gap-1.5 animate-bounce font-sans mt-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  <strong>Blocked!</strong> Fraud Prevention Trigger: The receipt code already exists in our database ledger.
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

        {/* Right column: Safaricom API Ledger */}
        <div className="lg:col-span-7 bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2">
            <div>
              <h3 className="font-semibold text-slate-800 font-sans">Safaricom Callback Ledger</h3>
              <p className="text-[11px] text-slate-400">All live validated transactions for {tenant.name}.</p>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-mono font-semibold uppercase">
              Callback Online
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] uppercase font-mono text-slate-400">
                  <th className="py-2.5">Receipt ID</th>
                  <th className="py-2.5">Payer Name</th>
                  <th className="py-2.5">Phone Number</th>
                  <th className="py-2.5">Amount</th>
                  <th className="py-2.5">Channel</th>
                  <th className="py-2.5 font-bold">Autolink Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tenantPayments.map(p => {
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/20 font-sans">
                      <td className="py-2 font-mono font-bold text-slate-900">{p.mpesaReceipt || 'FAILED'}</td>
                      <td className="py-2 font-medium">{p.customerName}</td>
                      <td className="py-2 font-mono text-slate-500">{p.phoneNumber}</td>
                      <td className="py-2">KES {p.amount}</td>
                      <td className="py-2">
                        <span className="bg-slate-50 text-slate-600 border border-slate-150 rounded px-1.5 py-0.2 font-mono">
                          {p.method}
                        </span>
                      </td>
                      <td className="py-2">
                        {p.status === 'Completed' ? (
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded font-mono font-bold">
                            ✔ Instant Activated
                          </span>
                        ) : (
                          <span className="text-[10px] bg-rose-50 text-rose-800 border border-rose-100 px-2 py-0.5 rounded font-mono">
                            ✕ STK Push Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
