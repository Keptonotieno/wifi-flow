import React from 'react';
import { 
  AlertCircle, ShieldAlert, FileText, Gift, Award, HelpCircle, 
  Terminal, Activity, TrendingUp, RefreshCw, Zap, Users, User, Share2
} from 'lucide-react';
import { AuditLog, Tenant, Customer, Payment, ActiveSession } from '../types';

interface NetworkLogsProps {
  tenant: Tenant;
  auditLogs: AuditLog[];
  customers: Customer[];
  payments: Payment[];
  activeSessions: ActiveSession[];
}

export default function NetworkLogs({
  tenant,
  auditLogs,
  customers,
  payments,
  activeSessions
}: NetworkLogsProps) {

  // RLS Isolation: Filter resources by selected tenant_id
  const tenantAuditLogs = auditLogs.filter(l => l.tenant_id === tenant.id);
  const tenantCustomers = customers.filter(c => c.tenant_id === tenant.id);
  const tenantPayments = payments.filter(p => p.tenant_id === tenant.id);
  const tenantSessions = activeSessions.filter(s => s.tenant_id === tenant.id);

  // Revenue Leakage Detectors (Calculated on the fly to simulate high analytical security)
  // Leakage Case A: Active sessions where the customer has no matching payment record in the ledger
  const leakedUsersList = tenantSessions.filter(sess => {
    const hasPayment = tenantPayments.some(pay => pay.customerName.includes(sess.customerName) && pay.status === 'Completed');
    return !hasPayment;
  });

  // Fraud Cases
  // Fraud Case A: MAC Cloning SIMULATOR
  // We identify if the same customer has multiple concurrent sessions from distinct AP router gateways
  const simultaneousLoginAlerts = tenantSessions.map((sess, idx, arr) => {
    const duplicate = arr.find((s, i) => s.customerName === sess.customerName && s.macAddress === sess.macAddress && s.ipAddress !== sess.ipAddress);
    if (duplicate && idx < arr.indexOf(duplicate)) {
      return {
        customerName: sess.customerName,
        macAddress: sess.macAddress,
        routerA: sess.routerId.replace('router-', ''),
        routerB: duplicate.routerId.replace('router-', '')
      };
    }
    return null;
  }).filter(Boolean);

  return (
    <div id="security-telemetry-panel" className="space-y-8 animate-fade-in text-slate-800 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-sans font-semibold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-slate-700" />
            Security & Profit Safeguard Engine
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Detect rogue router bypasses, MAC cloning fraud, profit leakage, and track loyal referral branches.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-rose-700">
          <Activity className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
          Scanner Status: Live Patrol Active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Box A: Profit Leakage Guard */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-805 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-rose-600" />
              Real-time Profit Leakage Watch
            </h3>
            <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-100 font-mono font-bold px-2 py-0.5 rounded">
              {leakedUsersList.length} Profit Threats
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-normal font-sans">
            Compares live RADIUS accounting frames with the Safaricom M-Pesa validated transaction table. Alerts if simple queues or hotspot users bypass the payment login gate.
          </p>

          <div className="space-y-2 pt-2">
            {leakedUsersList.length === 0 ? (
              <div className="p-3 border border-emerald-100 bg-emerald-50 text-emerald-800 text-xs rounded-lg text-center font-sans font-medium">
                ✔ Zero payment discrepancies detected. All active interfaces are fully reconciled.
              </div>
            ) : (
              leakedUsersList.map((leak, idx) => (
                <div key={idx} className="p-3 border border-rose-100 bg-rose-50/70 rounded-lg flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-850 block">{leak.customerName} (Online)</span>
                    <span className="text-[10px] text-slate-400 font-mono">MAC Identifier: {leak.macAddress}</span>
                  </div>
                  <span className="text-[10px] font-mono bg-rose-100 text-rose-800 border border-rose-200 rounded-full px-2 py-0.5 font-bold uppercase">
                    Bypassed Gate
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Box B: MAC Cloning & Fraud Guardian */}
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-806 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-emerald-600" />
              Concurrent Session Fraud Detector
            </h3>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-150 font-mono px-2 py-0.5 rounded uppercase font-bold">
              Automatic Protection
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-normal font-sans">
            Scans active RADIUS station tables for credential compromises. Blocks or flags if the same subscription profile registers concurrent leases from separate access points.
          </p>

          <div className="space-y-2 pt-2 text-xs">
            {simultaneousLoginAlerts.length === 0 ? (
              <div className="p-3 border border-slate-100 bg-slate-50 text-slate-600 text-center font-semibold rounded-lg font-mono">
                ✔ Sandbox: No MAC cloning signatures detected or concurrent pings logged.
              </div>
            ) : (
              simultaneousLoginAlerts.map((alertItem, idx) => (
                <div key={idx} className="p-3 border border-amber-100 bg-amber-50/70 rounded-lg space-y-1.5">
                  <div className="flex justify-between font-semibold text-slate-850">
                    <span>⚠️ Concurrent Login Flagged</span>
                    <span className="text-amber-800 font-bold uppercase text-[9px]">Simultaneous MAC Link</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    <strong>{alertItem?.customerName}</strong> lease active on physical access vectors: <code>{alertItem?.routerA}</code> and <code>{alertItem?.routerB}</code>.
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Grid: Loyalty Programs & Referrals trackers */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="font-semibold text-slate-805 font-sans flex items-center gap-1.5">
            <Award className="w-4.5 h-4.5 text-amber-500" />
            SaaS loyalty Credits & Referral Leaderboard
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Encourage faster renewals! Tracks timely subscribers automatically rewarded with complimentary grace days and referral bonuses.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-1 text-xs font-sans">
          
          <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-50 space-y-2.5">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-sky-650" />
              <span className="font-semibold text-slate-800">Branch Referral Champion</span>
            </div>
            <div className="flex justify-between font-mono text-slate-500">
              <span>Kelvin Kiprop:</span>
              <span className="font-bold text-slate-800">4 Invited (12 Free Hrs)</span>
            </div>
            <div className="flex justify-between font-mono text-slate-500">
              <span>Mary Wanjiku:</span>
              <span className="font-bold text-slate-800">2 Invited (6 Free Hrs)</span>
            </div>
          </div>

          <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-50 space-y-2.5">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-slate-800">Timely M-Pesa Renewal Rewards</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Subscribers who renew their unlimited plan within 12 hours prior to expiration automatically unlock a <strong>+4 hours Smart Grace period</strong> extension.
            </p>
          </div>

          <div className="p-3 border border-dashed border-slate-200 rounded-lg flex flex-col justify-between">
            <div>
              <span className="font-semibold text-[10px] uppercase font-mono tracking-wider text-slate-450 block">Loyalty Scheme Status</span>
              <p className="text-[11px] text-slate-500 mt-1">
                Active in production. The radius server adjusts the expiry timestamp by calculating the loyalty credits automatically.
              </p>
            </div>
            
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded max-w-fit font-bold uppercase font-mono mt-3">
              Radius Modifier Online
            </span>
          </div>

        </div>
      </div>

      {/* Grid: Live system Audit Logs ledger */}
      <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="font-semibold text-slate-850 font-sans flex items-center gap-1.5">
            <FileText className="w-4.5 h-4.5 text-slate-600" />
            Multi-Tenant Audit Chronology (tenant_id Logging)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">Every critical administrative trigger, disconnect directive, and Safaricom verification transaction is audited with an immutable timestamp ledger.</p>
        </div>

        <div className="overflow-x-auto text-xs leading-normal">
          <table className="w-full text-left text-slate-600 font-sans">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] uppercase font-mono text-slate-400">
                <th className="py-2.5">Operator</th>
                <th className="py-2.5">SaaS Module</th>
                <th className="py-2.5">Action Executed</th>
                <th className="py-2.5">Target Detail</th>
                <th className="py-2.5">Status</th>
                <th className="py-2.5 text-right">Logged Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700">
              {tenantAuditLogs.map(log => {
                return (
                  <tr key={log.id} className="hover:bg-slate-50/20 font-sans">
                    <td className="py-2.5 font-semibold text-slate-800">{log.user}</td>
                    <td className="py-2.5 text-slate-500 font-medium">{log.module}</td>
                    <td className="py-2.5 font-mono text-[11px] font-bold text-slate-700">{log.action}</td>
                    <td className="py-2.5 text-slate-500 text-[11px] max-w-[200px] truncate">{log.details}</td>
                    <td className="py-2.5">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono ${
                        log.status === 'Success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-slate-400 font-mono text-[10px]">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
