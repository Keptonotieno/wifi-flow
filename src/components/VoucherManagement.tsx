import React, { useState } from 'react';
import { Gift, Plus, Printer, Trash2, Check, Download, AlertCircle, FileText, Smartphone } from 'lucide-react';
import { Voucher, Tenant, InternetPackage } from '../types';

interface VoucherManagementProps {
  tenant: Tenant;
  vouchers: Voucher[];
  packages: InternetPackage[];
  onAddVoucher: (voucher: Voucher) => void;
  onDeleteVoucher: (id: string) => void;
}

export default function VoucherManagement({
  tenant,
  vouchers,
  packages,
  onAddVoucher,
  onDeleteVoucher
}: VoucherManagementProps) {

  // RLS Isolation: Filter vouchers belonging to active tenant
  const tenantVouchers = vouchers.filter(v => v.tenant_id === tenant.id);
  const tenantPackages = packages.filter(p => p.tenant_id === tenant.id);

  // States
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    packageId: '',
    batchSize: 1,
  });

  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Redeemed' | 'Expired'>('All');

  // Multi-code generator
  const generateVoucherCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing O, I, 0, 1
    let res = 'WF';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const handleGenerateValues = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPkg = tenantPackages.find(p => p.id === form.packageId);
    if (!targetPkg) {
      alert('Please choose an internet plan for this voucher batch');
      return;
    }

    const size = Number(form.batchSize);
    for (let i = 0; i < size; i++) {
      const codeValue = generateVoucherCode();
      const newVoucher: Voucher = {
        id: `vch-${Date.now()}-${i}`,
        tenant_id: tenant.id,
        code: codeValue,
        packageId: targetPkg.id,
        packageName: targetPkg.name,
        price: targetPkg.price,
        expiryDateStr: new Date(Date.now() + targetPkg.expiryHours * 60 * 60 * 1000).toISOString(),
        status: 'Active',
        createdByResellerId: null, // Organic Direct Generation
        redeemedByCustomerName: null,
        redeemedAt: null,
        createdAt: new Date().toISOString()
      };
      onAddVoucher(newVoucher);
    }

    setIsAdding(false);
    setForm({ packageId: '', batchSize: 1 });
    alert(`Successfully generated list of ${size} vouchers for ${targetPkg.name}`);
  };

  // Simple voucher prints
  const handlePrintMock = () => {
    // Beautiful micro-window trigger simulation
    const activeText = tenantVouchers.filter(v => v.status === 'Active').map(v => 
      `CODE: ${v.code} | ${v.packageName} (KES ${v.price})`
    ).join('\n');
    
    alert(`--- Physical Thermal Slip Output ---\n${tenant.name}\n${activeText}\n-----------------------------------\nHint: Under production, this triggers actual thermal printer stream.`);
  };

  const filteredVouchers = tenantVouchers.filter(v => {
    if (filterStatus === 'All') return true;
    return v.status === filterStatus;
  });

  return (
    <div id="vouchers-management-panel" className="space-y-6 animate-fade-in text-slate-800 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-sans font-semibold text-slate-900 flex items-center gap-2">
            <Gift className="w-6 h-6 text-slate-700" />
            Voucher Management System
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Produce printable scratchcard codes, track customer redemptions, and sell in cyber booths.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintMock}
            className="text-xs flex items-center gap-1 bg-white border border-slate-200 text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Thermal Print Active Batch
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="text-xs flex items-center gap-1.5 bg-slate-900 border border-slate-900 text-white hover:bg-slate-800 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Generate Vouchers
          </button>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleGenerateValues} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm max-w-xl space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Batch Voucher Code Generator</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600">Link to Internet Package</label>
              <select
                required
                className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white focus:border-sky-500 focus:outline-none"
                value={form.packageId}
                onChange={(e) => setForm({...form, packageId: e.target.value})}
              >
                <option value="">-- Choose Plan --</option>
                {tenantPackages.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (KES {p.price})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600">Batch Gen Quantity Limit</label>
              <input
                type="number"
                min="1"
                max="100"
                required
                className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full font-mono focus:bg-white focus:border-sky-500 focus:outline-none"
                value={form.batchSize}
                onChange={(e) => setForm({...form, batchSize: Number(e.target.value)})}
              />
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            <button type="submit" className="bg-slate-900 border border-slate-905 text-white px-3 py-2 rounded-lg font-medium cursor-pointer">
              Generate Now
            </button>
            <button type="button" className="bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg font-medium cursor-pointer" onClick={() => setIsAdding(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Top filter tabs */}
      <div className="flex items-center gap-1.5 bg-slate-100/65 p-1 rounded-lg w-fit text-xs border border-slate-150/40">
        {(['All', 'Active', 'Redeemed', 'Expired'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilterStatus(tab)}
            className={`px-3 py-1 rounded-md transition-all font-medium cursor-pointer ${
              filterStatus === tab 
                ? 'bg-white text-slate-900 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid: Print preview of actual Scratchcard Coupons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-4">
        {filteredVouchers.slice(0, 8).map(vch => {
          return (
            <div 
              key={vch.id}
              className={`bg-white border rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden ${
                vch.status === 'Active' ? 'border-sky-100 hover:border-sky-200' : 'border-slate-100/80 bg-slate-50/50'
              }`}
            >
              {/* Scratch slip header */}
              <div className="flex justify-between items-center text-[10px] font-mono font-medium text-slate-400">
                <span>{tenant.name.substring(0, 18)}..</span>
                <span className={`px-1.5 py-0.2 rounded font-mono ${
                  vch.status === 'Active' ? 'bg-sky-50 text-sky-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {vch.status}
                </span>
              </div>

              {/* Huge code visual slip */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100/50 text-center space-y-1 relative">
                <span className="block text-[10px] uppercase font-mono tracking-widest text-slate-400">CONNECT WIFI & ENTER CODE</span>
                <span className="block text-sm font-bold tracking-wider font-mono text-slate-800">{vch.code}</span>
              </div>

              {/* Plan name and Price */}
              <div className="text-xs flex justify-between items-center px-1">
                <div>
                  <span className="block font-semibold text-slate-800 truncate max-w-[120px]">{vch.packageName}</span>
                  <span className="text-[10px] text-slate-400">Valid on connect</span>
                </div>
                <div className="text-right font-mono font-bold text-slate-950">
                  KES {vch.price}
                </div>
              </div>

              {/* Redeemed details if applicable */}
              {vch.status === 'Redeemed' && vch.redeemedByCustomerName && (
                <div className="p-1 px-1.5 bg-slate-100 rounded text-[9px] text-slate-500 font-mono italic">
                  Redeemed by: {vch.redeemedByCustomerName.substring(0, 15)}
                </div>
              )}

              {/* Delete action */}
              <div className="border-t border-slate-50 pt-2 flex justify-end text-[10px]">
                <button
                  onClick={() => onDeleteVoucher(vch.id)}
                  className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  Void code
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredVouchers.length > 8 && (
        <span className="block text-xs text-slate-400 font-mono italic text-center pb-2">
          ↳ Displaying first 8 scratchcards. There are {filteredVouchers.length - 8} more codes in the inventory database ledger.
        </span>
      )}
    </div>
  );
}
