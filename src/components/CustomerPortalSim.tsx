import React, { useState } from 'react';
import { 
  ShieldCheck, Clock, Wifi, HelpCircle, AlertOctagon, Send, 
  Plus, MessageSquare, Terminal, Landmark, Trash2, CheckCircle 
} from 'lucide-react';
import { Customer, Tenant, InternetPackage, SupportTicket } from '../types';

interface CustomerPortalSimProps {
  tenant: Tenant;
  customers: Customer[];
  packages: InternetPackage[];
  tickets: SupportTicket[];
  onAddTicket: (ticket: SupportTicket) => void;
  onAddCommentToTicket: (ticketId: string, reply: { senderName: string, message: string, isAdmin: boolean }) => void;
  onTriggerMpesaRenew: (customerId: string, packageId: string, amount: number) => void;
}

export default function CustomerPortalSim({
  tenant,
  customers,
  packages,
  tickets,
  onAddTicket,
  onAddCommentToTicket,
  onTriggerMpesaRenew
}: CustomerPortalSimProps) {

  // Feed customer lists based on tenant
  const tenantCustomers = customers.filter(c => c.tenant_id === tenant.id);
  const tenantPackages = packages.filter(p => p.tenant_id === tenant.id);

  // Active user simulate selection state
  const [activeCustId, setActiveCustId] = useState<string>(tenantCustomers[0]?.id || '');
  
  // Custom states inside client area
  const [deviceList, setDeviceList] = useState([
    { name: 'My Main Smartphone (Default)', mac: 'D4:3C:A9:77:81:EE' },
    { name: 'HP Business laptop', mac: '8C:11:7D:99:A1:02' }
  ]);
  const [newDevName, setNewDevName] = useState('');
  const [newDevMac, setNewDevMac] = useState('E2:33:A1:');

  // Tickets create states
  const [isFilingTicket, setIsFilingTicket] = useState(false);
  const [tktForm, setTktForm] = useState({ title: '', message: '' });
  const [commentInput, setCommentInput] = useState<{ [key: string]: string }>({});
  const [ticketStatus, setTicketStatus] = useState<string | null>(null);

  const activeCustomer = tenantCustomers.find(c => c.id === activeCustId) || tenantCustomers[0];

  // Filter user support tickets
  const userTickets = activeCustomer 
    ? tickets.filter(t => t.customerName === activeCustomer.fullName && t.tenant_id === tenant.id)
    : [];

  const handleCreateTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || !tktForm.title || !tktForm.message) return;

    const newTkt: SupportTicket = {
      id: `tkt-${Date.now()}`,
      tenant_id: tenant.id,
      customerName: activeCustomer.fullName,
      title: tktForm.title,
      message: tktForm.message,
      status: 'Open',
      createdAt: new Date().toISOString(),
      replies: []
    };

    onAddTicket(newTkt);
    setIsFilingTicket(false);
    setTktForm({ title: '', message: '' });
    setTicketStatus('Success! Support ticket was submitted. Our technical network response team is active.');
    
    // Auto clear notification
    setTimeout(() => {
      setTicketStatus(null);
    }, 7000);
  };

  const handlePostReply = (ticketId: string) => {
    const text = commentInput[ticketId];
    if (!text || !activeCustomer) return;

    onAddCommentToTicket(ticketId, {
      senderName: activeCustomer.fullName,
      message: text,
      isAdmin: false,
    });

    setCommentInput({ ...commentInput, [ticketId]: '' });
  };

  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDevName || !newDevMac) return;
    setDeviceList([...deviceList, { name: newDevName, mac: newDevMac.toUpperCase() }]);
    setNewDevName('');
    setNewDevMac('E2:33:A1:');
  };

  const handleDeleteDevice = (idx: number) => {
    setDeviceList(deviceList.filter((_, i) => i !== idx));
  };

  if (!activeCustomer) {
    return (
      <div className="p-5 text-center text-slate-500 text-xs py-10 font-sans">
        No active customer profiles generated yet for database schema. Go register a user in Customers first!
      </div>
    );
  }

  const activePkg = tenantPackages.find(p => p.id === activeCustomer.activePackageId);

  return (
    <div id="customer-portal-sim-panel" className="space-y-6 animate-fade-in text-slate-800 font-sans">
      
      {/* Upper selector banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-sans font-semibold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-slate-705" />
            My Customer Portal Simulation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Test the subscriber experience! Renew plan offers, configure authorized MAC devices, or open helpdesk tickets.
          </p>
        </div>

        {/* Dynamic customer toggler switcher */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-500 font-medium">Logged in Subscriber:</span>
          <select
            id="subscriber-simulate-dropdown"
            className="text-xs font-semibold bg-white border border-slate-200 rounded px-2.5 py-1 focus:outline-none"
            value={activeCustId}
            onChange={(e) => {
              setActiveCustId(e.target.value);
              setIsFilingTicket(false);
            }}
          >
            {tenantCustomers.map(c => (
              <option key={c.id} value={c.id}>
                {c.fullName} ({c.customerNumber})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left column: Portal balance indicator and plan selectors */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Active Balance block */}
          <div className="bg-slate-900 text-slate-100 rounded-xl p-6 shadow-sm relative overflow-hidden space-y-4">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Wifi className="w-32 h-32 text-white" />
            </div>

            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase tracking-widest font-mono text-slate-400">Broadband Account</span>
                <h3 className="text-lg font-bold text-slate-200 leading-snug">{activeCustomer.fullName}</h3>
                <span className="text-xs font-mono text-sky-400 font-bold">{activeCustomer.customerNumber}</span>
              </div>
              <span className="text-xs bg-emerald-500 text-slate-950 px-2.5 py-1 rounded font-bold font-mono uppercase">
                Active & Browsing
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-800 pt-4 text-xs font-sans">
              <div>
                <span className="block text-slate-400">Subscription Offer</span>
                <span className="font-bold text-slate-200 text-base">{activePkg ? activePkg.name : 'Expired Plan'}</span>
              </div>

              <div>
                <span className="block text-slate-400">Assigned Speed Limit</span>
                <span className="font-bold text-slate-200 text-base">{activePkg ? activePkg.downloadSpeed : 'N/A'}</span>
              </div>

              <div>
                <span className="block text-slate-400">Device Restrictions limit</span>
                <span className="font-bold text-slate-200 text-base">{activePkg ? `${activePkg.deviceLimit} Devices` : 'N/A'}</span>
              </div>
            </div>

            {activeCustomer.debtAmount > 0 && (
              <div className="border-t border-slate-800 pt-3 flex justify-between text-xs font-bold text-amber-400 font-mono">
                <span>⚠️ Outstanding Credited Debt Invoice:</span>
                <span>KES {activeCustomer.debtAmount}</span>
              </div>
            )}
          </div>

          {/* Device MAC Access control lists */}
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-800 font-sans">Authorized Hotspot Device (MAC Address)</h3>
            <p className="text-xs text-slate-500 leading-normal">
              Unlike ordinary internet portals, WifiFlow links plans directly to MAC address profiles. You don't need to retype passwords every time you connect! Add your computer or smart TV hardware signature below.
            </p>

            <form onSubmit={handleAddDevice} className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
              <input
                type="text"
                required
                placeholder="Device Name (e.g. My Smart TV)"
                className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:bg-white"
                value={newDevName}
                onChange={(e) => setNewDevName(e.target.value)}
              />
              <input
                type="text"
                required
                placeholder="MAC Address (e.g. E2:33:A1)"
                className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:bg-white font-mono"
                value={newDevMac}
                onChange={(e) => setNewDevMac(e.target.value)}
              />
              <button
                type="submit"
                className="bg-slate-900 text-white font-medium py-1.5 rounded hover:bg-slate-850 cursor-pointer text-center"
              >
                Register MAC Target
              </button>
            </form>

            <div className="divide-y divide-slate-50 pt-2 font-sans">
              {deviceList.map((dev, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 block">{dev.name}</span>
                    <span className="font-mono text-slate-400 text-[10px]">{dev.mac}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteDevice(idx)}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right column: Interactive Support Center and ticket messaging */}
        <div className="lg:col-span-4 bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4 h-fit flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <h3 className="font-semibold text-slate-800 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-500" />
                Helpdesk & Tickets
              </h3>
              
              <button
                onClick={() => setIsFilingTicket(!isFilingTicket)}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 rounded px-2 py-1 border border-slate-150 transition-colors font-semibold cursor-pointer select-none text-slate-700"
              >
                {isFilingTicket ? 'View Tickets' : 'Raise Issue'}
              </button>
            </div>

            {ticketStatus && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-lg text-[11px] font-medium mt-2 flex items-start gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{ticketStatus}</span>
              </div>
            )}

            {isFilingTicket ? (
              /* Complaint submission form */
              <form onSubmit={handleCreateTicketSubmit} className="space-y-3.5 pt-4 text-xs font-sans">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Ticket Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Speed is slow at hostels"
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:bg-white"
                    value={tktForm.title}
                    onChange={(e) => setTktForm({...tktForm, title: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Detailed Message</label>
                  <textarea
                    required
                    placeholder="Describe your issue... including dates or M-Pesa receipts"
                    className="mt-1 w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:bg-white"
                    rows={4}
                    value={tktForm.message}
                    onChange={(e) => setTktForm({...tktForm, message: e.target.value})}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-slate-900 text-white font-semibold py-2 rounded"
                >
                  Submit Complaint Ticket
                </button>
              </form>
            ) : (
              /* Ticket thread view lists */
              <div className="space-y-3 pt-3">
                {userTickets.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No reported issues raised in history.</p>
                ) : (
                  userTickets.map(t => (
                    <div key={t.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-slate-800 truncate max-w-[130px]">{t.title}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${
                          t.status === 'Open' ? 'bg-amber-150 text-amber-80 * bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="text-slate-600 block text-[10px] mb-2">{t.message}</p>
                      
                      {/* Ticket replies thread */}
                      <div className="border-t border-slate-150/40 pt-2 space-y-2 mt-1.5">
                        {t.replies.map(r => (
                          <div key={r.id} className={`p-1.5 rounded ${r.isAdmin ? 'bg-indigo-50/70 border-l-2 border-indigo-650' : 'bg-white'}`}>
                            <span className="block text-[9px] font-mono font-extrabold text-slate-500">
                              {r.senderName} ({r.isAdmin ? 'ISP Tech Support' : 'Subscriber'})
                            </span>
                            <span className="block text-[10px] text-slate-700 leading-snug">{r.message}</span>
                          </div>
                        ))}
                      </div>

                      {/* Reply input */}
                      <div className="flex gap-1 mt-2">
                        <input
                          type="text"
                          placeholder="Type reply..."
                          className="flex-1 bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] focus:outline-none"
                          value={commentInput[t.id] || ''}
                          onChange={(e) => setCommentInput({ ...commentInput, [t.id]: e.target.value })}
                        />
                        <button
                          onClick={() => handlePostReply(t.id)}
                          className="bg-slate-905 bg-slate-900 text-white p-1 rounded hover:bg-slate-850"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
