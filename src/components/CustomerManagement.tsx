import React, { useState } from 'react';
import { 
  Users, Search, Plus, UserPlus, Trash, Ban, CheckCircle, 
  Sparkles, FileDown, FileUp, Edit2, ArrowLeft, ChevronRight, 
  MapPin, Notebook, DollarSign, Clock, HelpCircle, AlertTriangle 
} from 'lucide-react';
import { Customer, Tenant, InternetPackage, Payment, SupportTicket } from '../types';

interface CustomerManagementProps {
  tenant: Tenant;
  customers: Customer[];
  packages: InternetPackage[];
  payments: Payment[];
  tickets: SupportTicket[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
}

export default function CustomerManagement({
  tenant,
  customers,
  packages,
  payments,
  tickets,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer
}: CustomerManagementProps) {

  // RLS Isolation: Filter clients belonging to active tenant
  const tenantCustomers = customers.filter(c => c.tenant_id === tenant.id);
  const tenantPackages = packages.filter(p => p.tenant_id === tenant.id);

  // UI State
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Create / Edit Form State
  const [form, setForm] = useState({
    id: '',
    fullName: '',
    phoneNumber: '+2547',
    email: '',
    nationalId: '',
    address: 'Nairobi',
    building: '',
    activePackageId: '',
    gracePeriodHours: 6,
    advanceAllowed: true,
  });

  // Filter Search
  const filteredCustomers = tenantCustomers.filter(c => {
    const s = search.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(s) ||
      c.phoneNumber.includes(s) ||
      (c.nationalId && c.nationalId.includes(s)) ||
      c.building.toLowerCase().includes(s) ||
      c.customerNumber.toLowerCase().includes(s)
    );
  });

  // Generate distinct readable ID
  const generateCustomerNo = () => {
    const r = Math.floor(100 + Math.random() * 900);
    const prefix = tenant.id === 'tenant-nairobi' ? 'NBO' : tenant.id === 'tenant-juja' ? 'JUJ' : 'COA';
    return `WF-${prefix}-${r}`;
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.phoneNumber) {
      alert('Please fill out Name and Phone details');
      return;
    }

    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (form.email && !EMAIL_REGEX.test(form.email)) {
      alert('Validation Error: Please enter a correct and valid email address structure (e.g., customer@domain.com).');
      return;
    }
    
    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      tenant_id: tenant.id,
      fullName: form.fullName,
      phoneNumber: form.phoneNumber,
      email: form.email,
      nationalId: form.nationalId,
      address: form.address,
      building: form.building,
      customerNumber: generateCustomerNo(),
      status: 'Active',
      activePackageId: form.activePackageId || null,
      createdAt: new Date().toISOString(),
      gracePeriodHours: Number(form.gracePeriodHours),
      advanceAllowed: form.advanceAllowed,
      debtAmount: 0,
    };

    onAddCustomer(newCustomer);
    setIsAdding(false);
    resetForm();
  };

  const handleEditInit = (c: Customer) => {
    setForm({
      id: c.id,
      fullName: c.fullName,
      phoneNumber: c.phoneNumber,
      email: c.email || '',
      nationalId: c.nationalId || '',
      address: c.address,
      building: c.building,
      activePackageId: c.activePackageId || '',
      gracePeriodHours: c.gracePeriodHours,
      advanceAllowed: c.advanceAllowed,
    });
    setIsEditing(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    const existing = tenantCustomers.find(c => c.id === form.id);
    if (!existing) return;

    const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (form.email && !EMAIL_REGEX.test(form.email)) {
      alert('Validation Error: Please enter a correct and valid email address structure (e.g., customer@domain.com).');
      return;
    }

    const updated: Customer = {
      ...existing,
      fullName: form.fullName,
      phoneNumber: form.phoneNumber,
      email: form.email,
      nationalId: form.nationalId,
      address: form.address,
      building: form.building,
      activePackageId: form.activePackageId || null,
      gracePeriodHours: Number(form.gracePeriodHours),
      advanceAllowed: form.advanceAllowed,
    };

    onUpdateCustomer(updated);
    setIsEditing(false);
    resetForm();
  };

  const triggerStatusToggle = (c: Customer) => {
    const updated: Customer = {
      ...c,
      status: c.status === 'Active' ? 'Suspended' : 'Active',
    };
    onUpdateCustomer(updated);
  };

  // Internet Advance Simulator Trigger
  const triggerInternetAdvance = (c: Customer, pkg: InternetPackage) => {
    const updated: Customer = {
      ...c,
      activePackageId: pkg.id,
      debtAmount: c.debtAmount + pkg.price,
    };
    onUpdateCustomer(updated);
    
    // Log as a special transaction
    alert(`Success! Credited ${pkg.name} (KES ${pkg.price}) to ${c.fullName}. A debt of KES ${pkg.price} has been recorded.`);
  };

  // Simulating CSV Export
  const handleExport = () => {
    const content = tenantCustomers.map(c => 
      `${c.customerNumber},${c.fullName},${c.phoneNumber},${c.status},${c.building}`
    ).join('\n');
    const blob = new Blob([`CustomerNo,Name,Phone,Status,Building\n` + content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tenant.domain}-customers.csv`;
    a.click();
  };

  // Simulating CSV Import
  const handleImport = () => {
    const extra: Customer[] = [
      {
        id: `cust-imp-1`,
        tenant_id: tenant.id,
        fullName: 'Bernard Kiplagat',
        phoneNumber: '+254711222333',
        email: 'bernard.kiplagat@gmail.com',
        nationalId: '30291827',
        address: 'Nairobi',
        building: 'Pine View Flats, House A1',
        customerNumber: generateCustomerNo(),
        status: 'Active',
        activePackageId: null,
        createdAt: new Date().toISOString(),
        gracePeriodHours: 6,
        advanceAllowed: true,
        debtAmount: 0
      },
      {
        id: `cust-imp-2`,
        tenant_id: tenant.id,
        fullName: 'Zainab Juma',
        phoneNumber: '+254755666777',
        email: 'zainabjuma@gmail.com',
        nationalId: '31221144',
        address: 'Nairobi',
        building: 'Mombasa Road Plaza, 3rd Floor',
        customerNumber: generateCustomerNo(),
        status: 'Active',
        activePackageId: null,
        createdAt: new Date().toISOString(),
        gracePeriodHours: 12,
        advanceAllowed: true,
        debtAmount: 0
      }
    ];
    extra.forEach(c => onAddCustomer(c));
    alert('Imported 2 new customers successfully!');
  };

  const resetForm = () => {
    setForm({
      id: '',
      fullName: '',
      phoneNumber: '+2547',
      email: '',
      nationalId: '',
      address: 'Nairobi',
      building: '',
      activePackageId: '',
      gracePeriodHours: 6,
      advanceAllowed: true,
    });
  };

  const selectedCustomer = tenantCustomers.find(c => c.id === selectedCustomerId);

  // Sub data filtering for full profiles
  const customerPayments = selectedCustomer 
    ? payments.filter(p => p.customerId === selectedCustomer.id && p.tenant_id === tenant.id)
    : [];
  
  const customerTickets = selectedCustomer
    ? tickets.filter(t => t.customerName === selectedCustomer.fullName && t.tenant_id === tenant.id)
    : [];

  return (
    <div id="customer-management-panel" className="space-y-6 animate-fade-in text-slate-800 leading-relaxed font-sans">
      
      {/* Upper header controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-sans font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-slate-700" />
            Customer Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registered WiFi subscribers under domain: <span className="font-mono text-slate-75 * text-slate-800 underline font-bold">{tenant.domain}</span>
          </p>
        </div>
        
        {/* Bulk tools */}
        <div className="flex flex-wrap items-center gap-2">
          <button 
            id="export-customers-btn"
            onClick={handleExport}
            className="text-xs flex items-center gap-1 bg-white border border-slate-200 text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button 
            id="import-customers-btn"
            onClick={handleImport}
            className="text-xs flex items-center gap-1 bg-white border border-slate-200 text-slate-600 hover:text-slate-800 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
          >
            <FileUp className="w-3.5 h-3.5" /> Import Mock Batch
          </button>
          <button 
            id="add-customer-trigger-btn"
            onClick={() => { setIsAdding(true); resetForm(); }}
            className="text-xs flex items-center gap-1 bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add Customer
          </button>
        </div>
      </div>

      {isAdding || isEditing ? (
        /* Form creation UI */
        <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm max-w-2xl">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 font-sans">
            {isAdding ? 'Register New WiFi Subscriber' : 'Edit Hotspot Subscriber Profile'}
          </h2>

          <form onSubmit={isAdding ? handleCreate : handleUpdate} className="space-y-4 font-sans">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600">Full Mobile Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mary Wanjiku"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white focus:border-sky-500 focus:outline-none"
                  value={form.fullName}
                  onChange={(e) => setForm({...form, fullName: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Safaricom Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +254712345678"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full font-mono focus:bg-white focus:border-sky-500 focus:outline-none"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({...form, phoneNumber: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Email Address</label>
                <input
                  type="email"
                  placeholder="name@gmail.com"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white focus:border-sky-500 focus:outline-none"
                  value={form.email}
                  onChange={(e) => setForm({...form, email: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">National ID Card Number</label>
                <input
                  type="text"
                  placeholder="e.g. 33119932"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white focus:border-sky-500 focus:outline-none"
                  value={form.nationalId}
                  onChange={(e) => setForm({...form, nationalId: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Building / Apartment / House No</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Hostels Room 12"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white focus:border-sky-500 focus:outline-none"
                  value={form.building}
                  onChange={(e) => setForm({...form, building: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">County Town / Address</label>
                <input
                  type="text"
                  placeholder="e.g. Juja Town"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white focus:border-sky-500 focus:outline-none"
                  value={form.address}
                  onChange={(e) => setForm({...form, address: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600">Select Active Internet Plan</label>
                <select
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white focus:border-sky-500 focus:outline-none"
                  value={form.activePackageId}
                  onChange={(e) => setForm({...form, activePackageId: e.target.value})}
                >
                  <option value="">-- No Active Plan (Expired/Manual activation) --</option>
                  {tenantPackages.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (KES {p.price})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600">Smart Grace Hrs</label>
                  <input
                    type="number"
                    min="0"
                    max="48"
                    className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white focus:border-sky-500 focus:outline-none"
                    value={form.gracePeriodHours}
                    onChange={(e) => setForm({...form, gracePeriodHours: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mt-2">Advance allowed?</label>
                  <input
                    type="checkbox"
                    className="mt-2 text-sky-650 h-4 w-4 rounded focus:ring-sky-500 cursor-pointer"
                    checked={form.advanceAllowed}
                    onChange={(e) => setForm({...form, advanceAllowed: e.target.checked})}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                className="bg-slate-950 border border-slate-950 text-white font-medium px-4 py-2 rounded-lg text-sm hover:bg-slate-800 transition-all cursor-pointer"
              >
                {isAdding ? 'Register Subscriber' : 'Apply Changes'}
              </button>
              <button
                type="button"
                className="bg-white border border-slate-200 text-slate-600 font-medium px-4 py-2 rounded-lg text-sm hover:bg-slate-50 transition-all cursor-pointer"
                onClick={() => { setIsAdding(false); setIsEditing(false); resetForm(); }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : selectedCustomerId && selectedCustomer ? (
        /* Detailed Customer Profile tab panel */
        <div className="space-y-6">
          <button 
            onClick={() => setSelectedCustomerId(null)}
            className="text-xs font-medium flex items-center gap-1.5 text-slate-500 hover:text-slate-850 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Customer List
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Card: Customer Details */}
            <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{selectedCustomer.fullName}</h3>
                  <span className="text-xs text-sky-650 font-mono font-semibold">{selectedCustomer.customerNumber}</span>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                  selectedCustomer.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  {selectedCustomer.status}
                </span>
              </div>

              <div className="space-y-3.5 border-t border-slate-50 pt-4 text-xs font-sans">
                <div>
                  <span className="block text-slate-400">Phone Number</span>
                  <span className="font-semibold text-slate-850 font-mono">{selectedCustomer.phoneNumber}</span>
                </div>
                <div>
                  <span className="block text-slate-400">National ID</span>
                  <span className="font-semibold text-slate-850">{selectedCustomer.nationalId || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-slate-400">Email Address</span>
                  <span className="font-semibold text-slate-850">{selectedCustomer.email || 'N/A'}</span>
                </div>
                <div className="flex items-start gap-2 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="block text-slate-400">Physical Address</span>
                    <span className="font-semibold text-slate-850">
                      {selectedCustomer.building}, {selectedCustomer.address}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-slate-50 pt-4 space-y-2">
                <button
                  onClick={() => handleEditInit(selectedCustomer)}
                  className="w-full text-xs font-semibold py-2 bg-slate-50 border border-slate-150 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Account Info
                </button>
                <button
                  onClick={() => triggerStatusToggle(selectedCustomer)}
                  className={`w-full text-xs font-semibold py-2 rounded-lg border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedCustomer.status === 'Active' 
                      ? 'bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100' 
                      : 'bg-emerald-5 border-emerald-100 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {selectedCustomer.status === 'Active' ? (
                    <>
                      <Ban className="w-3.5 h-3.5" /> Suspend Subscriber
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" /> Re-Activate Subscriber
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Panel: Subscription & Payment Logs & Tickets */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Box 1: Active Subscription & Advance Trigger */}
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                <h4 className="font-sans font-semibold text-slate-850 flex items-center gap-1.5 mb-3">
                  <Clock className="w-4 h-4 text-sky-650" />
                  Active Package Profile
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-50">
                    <span className="block text-[10px] uppercase tracking-wider font-mono text-slate-400">Allocated Plan</span>
                    <span className="block text-md font-bold text-slate-850 mt-0.5">
                      {tenantPackages.find(p => p.id === selectedCustomer.activePackageId)?.name || 'None (Internet Expired)'}
                    </span>
                    <span className="text-xs text-slate-500 block mt-1">
                      Grace Period setting: <strong>{selectedCustomer.gracePeriodHours} Hours</strong>
                    </span>
                    {selectedCustomer.debtAmount > 0 && (
                      <span className="inline-block mt-2 font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded">
                        Outstanding Debt Balance: KES {selectedCustomer.debtAmount}
                      </span>
                    )}
                  </div>

                  {/* Advance internet trigger element */}
                  <div className="p-3 border border-dashed border-slate-200 rounded-lg flex flex-col justify-between">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider font-mono text-slate-400 font-bold">Internet Advance Utility</span>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Does your client need internet before making the M-Pesa payment? If trusted, issue an advance package immediately.
                      </p>
                    </div>

                    {selectedCustomer.advanceAllowed ? (
                      <div className="mt-3">
                        <label className="block text-[10px] font-mono text-slate-400">Package to advance:</label>
                        <div className="flex gap-1.5 mt-1">
                          <select 
                            id="advance-package-selector"
                            className="text-xs bg-slate-50 border border-slate-150 rounded px-2 py-1 focus:outline-none focus:border-sky-500"
                            onChange={(e) => {
                              const p = tenantPackages.find(pkg => pkg.id === e.target.value);
                              if (p) {
                                triggerInternetAdvance(selectedCustomer, p);
                              }
                            }}
                          >
                            <option value="">-- Choose Plan --</option>
                            {tenantPackages.map(p => (
                              <option key={p.id} value={p.id}>{p.name} (KES {p.price})</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-[11px] text-rose-700 bg-rose-50/50 p-1.5 rounded flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Advance privilege is blocked for suspended/new clients.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Box 2: Payment History */}
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                <h4 className="font-sans font-semibold text-slate-850 flex items-center gap-1.5 mb-3">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Payment & Invoice Log
                </h4>
                {customerPayments.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 block text-center">No payment history linked in database.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                      <thead>
                        <tr className="border-b border-slate-50 text-[10px] uppercase font-mono text-slate-400">
                          <th className="py-2">Receipt</th>
                          <th className="py-2">Amount</th>
                          <th className="py-2">Method</th>
                          <th className="py-2">Timestamp</th>
                          <th className="py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {customerPayments.map(p => (
                          <tr key={p.id}>
                            <td className="py-2 font-mono font-bold text-slate-850">{p.mpesaReceipt || 'N/A'}</td>
                            <td className="py-2">KES {p.amount}</td>
                            <td className="py-2 font-mono text-slate-500">{p.method}</td>
                            <td className="py-2 text-[11px]">{new Date(p.createdAt).toLocaleDateString()}</td>
                            <td className="py-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800">
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Box 3: Support issues */}
              <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm">
                <h4 className="font-sans font-semibold text-slate-850 flex items-center gap-1.5 mb-3">
                  <HelpCircle className="w-4 h-4 text-indigo-500" />
                  Recent Mobile Support Tickets
                </h4>
                {customerTickets.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 block text-center">No open tech support complaints found.</p>
                ) : (
                  <div className="space-y-3">
                    {customerTickets.map(t => (
                      <div key={t.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-slate-800">{t.title}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            t.status === 'Open' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {t.status}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{t.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      ) : (
        /* Standard tabular search view screen */
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          {/* Quick search input filter bar */}
          <div className="p-4 bg-slate-50/50 border-b border-light border-slate-100 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by Name, Phone, Account, Building..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
            
            <span className="text-xs font-medium text-slate-400 font-mono">
              Filtered Results: {filteredCustomers.length} of {tenantCustomers.length}
            </span>
          </div>

          {/* Directory Listings */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-800">
              <thead>
                <tr className="bg-slate-50/30 border-b border-slate-100 text-slate-400 text-xs font-mono font-bold uppercase tracking-wider">
                  <th className="p-4 font-normal">Account No</th>
                  <th className="p-4 font-normal">Subscriber Name</th>
                  <th className="p-4 font-normal">Phone / Contact</th>
                  <th className="p-4 font-normal">Physical Building</th>
                  <th className="p-4 font-normal">Internet Package</th>
                  <th className="p-4 font-normal">Status</th>
                  <th className="p-4 font-normal text-right">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                      No matching WiFi subscribers found for this query.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map(c => {
                    const matchedPkg = tenantPackages.find(p => p.id === c.activePackageId);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/40">
                        <td className="p-4 font-mono font-bold text-slate-600 text-xs">
                          {c.customerNumber}
                        </td>
                        <td 
                          className="p-4 font-semibold text-slate-900 cursor-pointer hover:underline flex items-center gap-1.5"
                          onClick={() => setSelectedCustomerId(c.id)}
                        >
                          {c.fullName}
                          <ChevronRight className="w-3 h-3 text-slate-300" />
                        </td>
                        <td className="p-4 font-mono text-xs">{c.phoneNumber}</td>
                        <td className="p-4 text-slate-500 font-medium text-xs">{c.building}</td>
                        <td className="p-4">
                          {matchedPkg ? (
                            <span className="text-xs font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded font-sans">
                              {matchedPkg.name}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">None (Expired)</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                            c.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2.5">
                            <button
                              title="Edit account"
                              onClick={() => handleEditInit(c)}
                              className="text-slate-400 hover:text-slate-800 cursor-pointer p-0.5"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Remove record"
                              onClick={() => {
                                if(confirm(`Are you sure you want to delete ${c.fullName}?`)) {
                                  onDeleteCustomer(c.id);
                                }
                              }}
                              className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
