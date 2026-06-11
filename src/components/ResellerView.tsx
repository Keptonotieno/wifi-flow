import React, { useState } from 'react';
import { ShoppingBag, Plus, Tag, Coins, CheckCircle, Smartphone } from 'lucide-react';
import { Reseller, Tenant, Voucher } from '../types';

interface ResellerViewProps {
  tenant: Tenant;
  resellers: Reseller[];
  vouchers: Voucher[];
  onAddReseller: (reseller: Reseller) => void;
  onAllocateVouchersToReseller: (resellerId: string, voucherIds: string[]) => void;
}

export default function ResellerView({
  tenant,
  resellers,
  vouchers,
  onAddReseller,
  onAllocateVouchersToReseller
}: ResellerViewProps) {

  // RLS Isolation: Filter resources belonging to active tenant
  const tenantResellers = resellers.filter(r => r.tenant_id === tenant.id);
  const tenantVouchers = vouchers.filter(v => v.tenant_id === tenant.id);
  const unallocatedVouchers = tenantVouchers.filter(v => v.status === 'Active' && v.createdByResellerId === null);

  // States
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '+2547',
    commissionRate: 15,
  });

  const [selectedResellerId, setSelectedResellerId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;

    const newReseller: Reseller = {
      id: `res-${Date.now()}`,
      tenant_id: tenant.id,
      name: form.name,
      phoneNumber: form.phone,
      commissionRate: Number(form.commissionRate),
      balance: 0,
      totalSales: 0,
      totalCommission: 0,
      createdAt: new Date().toISOString()
    };

    onAddReseller(newReseller);
    setIsAdding(false);
    setForm({ name: '', phone: '+2547', commissionRate: 15 });
  };

  const handleAllocateBatch = (resellerId: string) => {
    if (unallocatedVouchers.length === 0) {
      alert('There are no active, unallocated vouchers generated right now. Please create some in the Vouchers tab first!');
      return;
    }
    const countToAllocate = Math.min(5, unallocatedVouchers.length);
    const allocatedIds = unallocatedVouchers.slice(0, countToAllocate).map(v => v.id);
    onAllocateVouchersToReseller(resellerId, allocatedIds);
    alert(`Successfully allocated a batch of ${countToAllocate} vouchers to this reseller agent!`);
  };

  return (
    <div id="resellers-management-panel" className="space-y-6 animate-fade-in text-slate-805 text-slate-800 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-sans font-semibold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-slate-700" />
            Reseller Agent Network
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Empower local cyber cafes, estates kiosks, and physical shops to sell vouchers under commission splits.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-xs flex items-center gap-1.5 bg-slate-900 border border-slate-900 text-white hover:bg-slate-850 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Register Reseller
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm max-w-xl space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 font-sans">Enroll New Sales Agent</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600">Company / Shop Agent Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Karanja Cyber kiosk"
                className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white focus:border-sky-500 focus:outline-none"
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">Agent Phone No (KES Pay out)</label>
              <input
                type="text"
                required
                placeholder="e.g. +254712345678"
                className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full font-mono focus:bg-white focus:border-sky-500 focus:outline-none"
                value={form.phone}
                onChange={(e) => setForm({...form, phone: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">Commission Rate %</label>
              <input
                type="number"
                min="1"
                max="50"
                required
                className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full font-mono focus:bg-white focus:border-sky-500 focus:outline-none"
                value={form.commissionRate}
                onChange={(e) => setForm({...form, commissionRate: Number(e.target.value)})}
              />
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            <button type="submit" className="bg-slate-900 text-white font-semibold px-4 py-2 rounded-lg">
              Save Reseller
            </button>
            <button type="button" className="bg-white border border-slate-200 text-slate-600 font-semibold px-4 py-2 rounded-lg" onClick={() => setIsAdding(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Grid of registered Resellers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tenantResellers.map(res => {
          const resellerVouchers = tenantVouchers.filter(v => v.createdByResellerId === res.id);
          const redeemedCount = resellerVouchers.filter(v => v.status === 'Redeemed').length;
          return (
            <div key={res.id} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-200 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-slate-900 text-base">{res.name}</h3>
                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-slate-400" />
                    {res.phoneNumber}
                  </span>
                </div>
                <div className="bg-indigo-50 text-indigo-805 font-semibold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider font-mono font-bold">
                  {res.commissionRate}% Commission Splits
                </div>
              </div>

              {/* Commission sales stats */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100/50 divide-x divide-slate-150">
                <div className="text-center">
                  <span className="block text-[10px] text-slate-400 font-mono uppercase">Sales KES</span>
                  <span className="text-md font-extrabold text-slate-800 font-mono">{res.totalSales.toLocaleString()}</span>
                </div>
                <div className="text-center pl-1">
                  <span className="block text-[10px] text-slate-400 font-mono uppercase">Earned split</span>
                  <span className="text-md font-extrabold text-indigo-650 font-mono">{res.totalCommission.toLocaleString()}</span>
                </div>
                <div className="text-center pl-1">
                  <span className="block text-[10px] text-slate-400 font-mono uppercase">Unsold stock</span>
                  <span className="text-md font-bold text-slate-705 font-mono">
                    {resellerVouchers.filter(v => v.status === 'Active').length} Codes
                  </span>
                </div>
              </div>

              {/* Batch allocation triggers */}
              <div className="border-t border-slate-50 pt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Vouchers Redeemed: <strong>{redeemedCount}</strong></span>
                
                <button
                  onClick={() => handleAllocateBatch(res.id)}
                  className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 rounded px-2.5 py-1 font-semibold cursor-pointer select-none"
                >
                  Allocate Stock (5 Codes)
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
