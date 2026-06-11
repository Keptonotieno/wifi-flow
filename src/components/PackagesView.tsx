import React, { useState } from 'react';
import { Sliders, Plus, Trash2, Clock, Smartphone, ShieldCheck, ToggleLeft, ToggleRight, Sparkles, Zap } from 'lucide-react';
import { InternetPackage, Tenant } from '../types';

interface PackagesViewProps {
  tenant: Tenant;
  packages: InternetPackage[];
  onAddPackage: (pkg: InternetPackage) => void;
  onDeletePackage: (id: string) => void;
}

export default function PackagesView({
  tenant,
  packages,
  onAddPackage,
  onDeletePackage
}: PackagesViewProps) {

  // RLS Isolation: only view packages belonging to this tenant
  const tenantPackages = packages.filter(p => p.tenant_id === tenant.id);

  // States
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'Time' as 'Time' | 'Data' | 'Hybrid',
    price: 30,
    downloadSpeed: '5 Mbps',
    uploadSpeed: '2 Mbps',
    deviceLimit: 2,
    dataLimitGB: '',
    expiryHours: 24,
    gracePeriodHours: 4,
    isAdvanceAllowed: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.price <= 0) {
      alert('Fill out complete name and numerical price');
      return;
    }

    const newPkg: InternetPackage = {
      id: `pkg-${Date.now()}`,
      tenant_id: tenant.id,
      name: form.name,
      type: form.type,
      price: Number(form.price),
      downloadSpeed: form.downloadSpeed,
      uploadSpeed: form.uploadSpeed,
      deviceLimit: Number(form.deviceLimit),
      dataLimitGB: form.type === 'Time' ? null : Number(form.dataLimitGB),
      expiryHours: Number(form.expiryHours),
      gracePeriodHours: Number(form.gracePeriodHours),
      isAdvanceAllowed: form.isAdvanceAllowed,
    };

    onAddPackage(newPkg);
    setIsAdding(false);
    resetForm();
  };

  const resetForm = () => {
    setForm({
      name: '',
      type: 'Time',
      price: 30,
      downloadSpeed: '5 Mbps',
      uploadSpeed: '2 Mbps',
      deviceLimit: 2,
      dataLimitGB: '',
      expiryHours: 24,
      gracePeriodHours: 4,
      isAdvanceAllowed: true,
    });
  };

  return (
    <div id="packages-management-panel" className="space-y-6 animate-fade-in text-slate-8 * text-slate-800 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-sans font-semibold text-slate-900 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-slate-700" />
            Internet Service Packages
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure broadband speed tiers, prices, smart limits, and voucher profiles for <span className="font-mono text-slate-800 underline font-bold">{tenant.domain}</span>
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-xs flex items-center gap-1.5 bg-slate-900 border border-slate-900 text-white hover:bg-slate-800 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer shadow-sm ml-auto"
        >
          <Plus className="w-3.5 h-3.5" /> Configure Package
        </button>
      </div>

      {isAdding && (
        <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm max-w-xl">
          <h3 className="text-md font-semibold text-slate-800 mb-4 font-sans">
            Add BroadBand Offer Plan
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600">Plan Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Student Weekly Hybrid"
                  className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white focus:border-sky-500 focus:outline-none"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Plan Type Categories</label>
                <select
                  className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white focus:border-sky-500 focus:outline-none"
                  value={form.type}
                  onChange={(e) => setForm({...form, type: e.target.value as any})}
                >
                  <option value="Time">Time-Based Unlimited</option>
                  <option value="Data">Data-capped (Volume Limit)</option>
                  <option value="Hybrid">Hybrid (Data + Time limit)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Price (Charge in KES)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 50"
                  className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full font-mono focus:bg-white focus:border-sky-500 focus:outline-none"
                  value={form.price}
                  onChange={(e) => setForm({...form, price: Number(e.target.value)})}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Expiry Hours (Duration)</label>
                <select
                  className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white focus:border-sky-500 focus:outline-none"
                  value={form.expiryHours}
                  onChange={(e) => setForm({...form, expiryHours: Number(e.target.value)})}
                >
                  <option value="1">1 Hour</option>
                  <option value="3">3 Hours</option>
                  <option value="24">24 Hours (1 Day)</option>
                  <option value="168">168 Hours (1 Week)</option>
                  <option value="720">720 Hours (1 Month)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Download Allocated Speed</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10 Mbps"
                  className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white focus:border-sky-500 focus:outline-none"
                  value={form.downloadSpeed}
                  onChange={(e) => setForm({...form, downloadSpeed: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Upload Allocated Speed</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5 Mbps"
                  className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white focus:border-sky-500 focus:outline-none"
                  value={form.uploadSpeed}
                  onChange={(e) => setForm({...form, uploadSpeed: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Allowed Devices Simultaneous Limit</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white focus:border-sky-500 focus:outline-none"
                  value={form.deviceLimit}
                  onChange={(e) => setForm({...form, deviceLimit: Number(e.target.value)})}
                />
              </div>

              {form.type !== 'Time' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Data Capping Capacity (GB)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 10"
                    className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full font-mono focus:bg-white focus:border-sky-500 focus:outline-none"
                    value={form.dataLimitGB}
                    onChange={(e) => setForm({...form, dataLimitGB: e.target.value})}
                  />
                </div>
              )}

              {/* Grace & Advance settings */}
              <div>
                <label className="block text-xs font-semibold text-slate-600">Smart Grace Expired Period (Hours)</label>
                <input
                  type="number"
                  placeholder="e.g. 6"
                  className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white focus:border-sky-500 focus:outline-none"
                  value={form.gracePeriodHours}
                  onChange={(e) => setForm({...form, gracePeriodHours: Number(e.target.value)})}
                />
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-sky-650 rounded focus:ring-sky-500 cursor-pointer"
                  checked={form.isAdvanceAllowed}
                  onChange={(e) => setForm({...form, isAdvanceAllowed: e.target.checked})}
                />
                <span className="text-xs font-medium text-slate-600">Allow Borrow / Internet Advance?</span>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                className="bg-slate-900 text-white font-medium px-4 py-2 rounded-lg text-xs hover:bg-slate-800 transition-all cursor-pointer"
              >
                Create Package
              </button>
              <button
                type="button"
                className="bg-white border border-slate-200 text-slate-600 font-medium px-4 py-2 rounded-lg text-xs hover:bg-slate-50 transition-all cursor-pointer"
                onClick={() => setIsAdding(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid displays of Active Offers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenantPackages.map(pkg => {
          return (
            <div 
              key={pkg.id} 
              id={`pkg-card-${pkg.id}`}
              className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4 relative overflow-hidden flex flex-col justify-between hover:border-slate-3 * hover:border-slate-200 hover:shadow-md transition-all pt-6"
            >
              {pkg.isAdvanceAllowed && (
                <div className="absolute top-0 right-0 bg-blue-500 text-white text-[8px] uppercase tracking-widest px-2.5 py-0.5 rounded-bl font-mono">
                  Advance Allowed
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400 font-bold">
                  {pkg.type}-based broadband
                </span>
                <h3 className="text-md font-bold text-slate-900">{pkg.name}</h3>
              </div>

              {/* Pricing breakdown */}
              <div className="flex items-baseline gap-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100/50">
                <span className="text-[10px] font-mono text-slate-400">Charge Price:</span>
                <span className="text-xl font-bold font-mono text-emerald-600">KES {pkg.price}</span>
                <span className="text-xs text-slate-500">
                  / {pkg.expiryHours >= 720 ? 'Month' : pkg.expiryHours >= 168 ? 'Week' : pkg.expiryHours + ' Hrs'}
                </span>
              </div>

              {/* Bandwidth Speeds & Limits */}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-indigo-505" />
                  <span>Speed: <strong>{pkg.downloadSpeed}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Devices: <strong>{pkg.deviceLimit} Max</strong></span>
                </div>
                {pkg.type !== 'Time' && (
                  <div className="flex items-center gap-1.5 col-span-2 text-indigo-600">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Cap Capacity: <strong>{pkg.dataLimitGB} GB Limit</strong></span>
                  </div>
                )}
              </div>

              {/* Smart specifications */}
              <div className="border-t border-slate-50 pt-3 flex items-center justify-between text-[11px] text-slate-500 font-sans">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-500" />
                  Grace browsing: <strong>{pkg.gracePeriodHours} Hrs</strong>
                </span>
                
                <button
                  onClick={() => onDeletePackage(pkg.id)}
                  className="text-slate-400 hover:text-rose-600 cursor-pointer text-xs"
                >
                  Delete Offer
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
