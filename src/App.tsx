import React, { useState, useEffect } from 'react';
import { 
  INITIAL_TENANTS, INITIAL_PACKAGES, INITIAL_CUSTOMERS, INITIAL_PAYMENTS, 
  INITIAL_ROUTERS, INITIAL_VOUCHERS, INITIAL_RESELLERS, INITIAL_TICKETS, 
  INITIAL_AUDIT_LOGS, INITIAL_ACTIVE_SESSIONS, WifiFlowDatabase 
} from './data/mockStore';

import { 
  Tenant, Customer, InternetPackage, Payment, Router, 
  Voucher, Reseller, SupportTicket, AuditLog, ActiveSession 
} from './types';

// Supabase client and mapper imports
import { 
  pullTable, upsertRecord, deleteRecord, 
  mapTenantFromDb, mapTenantToDb, mapCustomerFromDb, mapCustomerToDb, 
  mapPackageFromDb, mapPackageToDb, mapPaymentFromDb, mapPaymentToDb, 
  mapRouterFromDb, mapRouterToDb, mapVoucherFromDb, mapVoucherToDb,
  supabase
} from './lib/supabaseClient';

// Component imports
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import AdminUsersDashboard from './components/AdminUsersDashboard';
import CustomerManagement from './components/CustomerManagement';
import PackagesView from './components/PackagesView';
import MpesaIntegration from './components/MpesaIntegration';
import MikrotikRadius from './components/MikrotikRadius';
import VoucherManagement from './components/VoucherManagement';
import ResellerView from './components/ResellerView';
import CaptivePortalSim from './components/CaptivePortalSim';
import CustomerPortalSim from './components/CustomerPortalSim';
import NetworkLogs from './components/NetworkLogs';
import DbInstructions from './components/DbInstructions';
import AuthScreen from './components/AuthScreen';

export default function App() {
  
  // 1. Reactive Persistent States
  const [tenants, setTenants] = useState<Tenant[]>(() => 
    WifiFlowDatabase.load<Tenant>('tenants', INITIAL_TENANTS)
  );
  
  const [selectedTenant, setSelectedTenant] = useState<Tenant>(() => {
    const loaded = WifiFlowDatabase.load<Tenant>('tenants', INITIAL_TENANTS);
    return loaded[0] || INITIAL_TENANTS[0];
  });

  const [customers, setCustomers] = useState<Customer[]>(() => 
    WifiFlowDatabase.load<Customer>('customers', INITIAL_CUSTOMERS)
  );

  const [packages, setPackages] = useState<InternetPackage[]>(() => 
    WifiFlowDatabase.load<InternetPackage>('packages', INITIAL_PACKAGES)
  );

  const [payments, setPayments] = useState<Payment[]>(() => 
    WifiFlowDatabase.load<Payment>('payments', INITIAL_PAYMENTS)
  );

  const [routers, setRouters] = useState<Router[]>(() => 
    WifiFlowDatabase.load<Router>('routers', INITIAL_ROUTERS)
  );

  const [vouchers, setVouchers] = useState<Voucher[]>(() => 
    WifiFlowDatabase.load<Voucher>('vouchers', INITIAL_VOUCHERS)
  );

  const [resellers, setResellers] = useState<Reseller[]>(() => 
    WifiFlowDatabase.load<Reseller>('resellers', INITIAL_RESELLERS)
  );

  const [tickets, setTickets] = useState<SupportTicket[]>(() => 
    WifiFlowDatabase.load<SupportTicket>('tickets', INITIAL_TICKETS)
  );

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => 
    WifiFlowDatabase.load<AuditLog>('audit_logs', INITIAL_AUDIT_LOGS)
  );

  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>(() => 
    WifiFlowDatabase.load<ActiveSession>('active_sessions', INITIAL_ACTIVE_SESSIONS)
  );

  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState('Tenant Owner');

  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>(() => {
    return (localStorage.getItem('wififlow_theme') as 'light' | 'dark' | 'auto') || 'auto';
  });

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    localStorage.setItem('wififlow_theme', theme);
    if (theme === 'dark') {
      setIsDark(true);
    } else if (theme === 'light') {
      setIsDark(false);
    } else {
      // Auto theme matching device/clock hours (Night theme active 18:00 to 06:00)
      const hour = new Date().getHours();
      setIsDark(hour < 6 || hour >= 18);
    }
  }, [theme]);

  // Integrated Dashboard Automated Toggles (Explicit User Request)
  const [automationSettings, setAutomationSettings] = useState(() => {
    const saved = localStorage.getItem('wififlow_automation_rules');
    const defaultSettings = {
      autoDisconnectIdle: true,
      autoReconcileMpesa: true,
      trafficThrottling: false,
      lowDiscountRefill: true,
      terminateExcessBytes: true,
      byteThresholdMB: 500, // in Megabytes
    };
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch (e) {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('wififlow_automation_rules', JSON.stringify(automationSettings));
  }, [automationSettings]);

  // 1. Automatic M-Pesa Transaction Reconciler Background Task
  useEffect(() => {
    const timer = setInterval(() => {
      if (automationSettings.autoReconcileMpesa) {
        setPayments(prevPayments => {
          const hasPending = prevPayments.some(p => p.status === 'Pending' && p.tenant_id === selectedTenant.id);
          if (!hasPending) return prevPayments;

          triggerAuditLog(
            'Automation System',
            'InstaPay Reconciliation',
            'M-Pesa Core Billing',
            'Auto-reconciliation rules matched 1 pending Safaricom C2B payment trace. Dispensed speed tier lease instantly.',
            'Success'
          );

          return prevPayments.map(p => {
            if (p.status === 'Pending' && p.tenant_id === selectedTenant.id) {
              const updated = { ...p, status: 'Completed', reconciled: true };
              upsertRecord('payments', updated, mapPaymentToDb);
              return updated;
            }
            return p;
          });
        });
      }
    }, 12000);
    return () => clearInterval(timer);
  }, [automationSettings.autoReconcileMpesa, selectedTenant.id]);

  // 2. Intelligent Low Voucher Hot-Pool Refiller Background Task
  useEffect(() => {
    const timer = setInterval(() => {
      if (automationSettings.lowDiscountRefill) {
        const matchingVouchers = vouchers.filter(v => v.tenant_id === selectedTenant.id && v.status === 'Active' && !v.createdByResellerId);
        if (matchingVouchers.length < 5) {
          const selectedTenantPkg = packages.filter(p => p.tenant_id === selectedTenant.id)[0];
          if (selectedTenantPkg) {
            const batchSize = 10;
            const newVouchersList: Voucher[] = [];
            for (let i = 0; i < batchSize; i++) {
              newVouchersList.push({
                id: `vch-auto-${Date.now()}-${i}`,
                tenant_id: selectedTenant.id,
                code: 'AUT-' + Math.floor(100000 + Math.random() * 900000),
                packageId: selectedTenantPkg.id,
                packageName: selectedTenantPkg.name,
                price: selectedTenantPkg.price,
                expiryDateStr: '24 Hours',
                status: 'Active',
                createdByResellerId: null,
                redeemedByCustomerName: null,
                redeemedAt: null,
                createdAt: new Date().toISOString()
              });
            }
            newVouchersList.forEach(v => upsertRecord('vouchers', v, mapVoucherToDb));
            setVouchers(prev => [...newVouchersList, ...prev]);
            triggerAuditLog(
              'Automation System',
              'SaaS Hot-Pool Re-Fill',
              'Vouchers Manager',
              `Supply drop: Available vouchers fell below safety threshold. Instantly minted ${batchSize} codes for ${selectedTenantPkg.name}!`,
              'Success'
            );
          }
        }
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [automationSettings.lowDiscountRefill, vouchers, selectedTenant.id, packages]);

  // 3. Automated Byte Usage Cap Threshold Enforcement Background Task
  useEffect(() => {
    const timer = setInterval(() => {
      if (automationSettings.terminateExcessBytes) {
        const thresholdBytes = (automationSettings.byteThresholdMB || 500) * 1024 * 1024;
        setActiveSessions(prevSessions => {
          const sessionsToTerminate = prevSessions.filter(
            s => s.tenant_id === selectedTenant.id && s.bytesUsed > thresholdBytes
          );

          if (sessionsToTerminate.length === 0) return prevSessions;

          sessionsToTerminate.forEach(sess => {
            triggerAuditLog(
              'Automation System',
              'Threshold Cap Disconnect',
              'RADIUS controller',
              `Terminated session for ${sess.customerName} (${(sess.bytesUsed / (1024 * 1024)).toFixed(1)} MB) for exceeding automated cap of ${automationSettings.byteThresholdMB} MB.`,
              'Warning'
            );
          });

          // Return sessions without the terminated ones
          const terminatedIds = new Set(sessionsToTerminate.map(s => s.id));
          return prevSessions.filter(s => !terminatedIds.has(s.id));
        });
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [automationSettings.terminateExcessBytes, automationSettings.byteThresholdMB, selectedTenant.id]);

  const [currentUser, setCurrentUser] = useState<{ fullName: string; email: string; role: string; tenantId: string } | null>(() => {
    const saved = localStorage.getItem('wififlow_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Synchronize role and context views upon user token change
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('wififlow_current_user', JSON.stringify(currentUser));
      setUserRole(currentUser.role);
      const matched = tenants.find(t => t.id === currentUser.tenantId);
      if (matched) setSelectedTenant(matched);
      
      // Auto routing based on user permissions
      if (currentUser.role === 'Customer') {
        setActiveTab('customer-portal');
      } else if (currentUser.role === 'Reseller') {
        setActiveTab('vouchers');
      } else {
        setActiveTab('dashboard');
      }
    } else {
      localStorage.removeItem('wififlow_current_user');
    }
  }, [currentUser]);

  // --- Supabase Backend Sync States ---
  const [supabaseSyncing, setSupabaseSyncing] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  useEffect(() => {
    async function syncSupabase() {
      setSupabaseSyncing(true);
      setSupabaseError(null);
      try {
        // Pull Tenants
        const dbTenants = await pullTable<Tenant>('tenants', mapTenantFromDb, tenants);
        // If Supabase was empty, seed it with current local storage or defaults
        if (dbTenants.length === 0 && tenants.length > 0) {
          for (const t of tenants) {
            await upsertRecord('tenants', t, mapTenantToDb);
          }
        } else if (dbTenants.length > 0) {
          setTenants(dbTenants);
          setSelectedTenant(prev => dbTenants.find(t => t.id === prev.id) || dbTenants[0]);
        }

        // Pull Customers
        const dbCustomers = await pullTable<Customer>('customers', mapCustomerFromDb, customers);
        if (dbCustomers.length === 0 && customers.length > 0) {
          for (const c of customers) {
            await upsertRecord('customers', c, mapCustomerToDb);
          }
        } else if (dbCustomers.length > 0) {
          setCustomers(dbCustomers);
        }

        // Pull Packages
        const dbPackages = await pullTable<InternetPackage>('internet_packages', mapPackageFromDb, packages);
        if (dbPackages.length === 0 && packages.length > 0) {
          for (const p of packages) {
            await upsertRecord('internet_packages', p, mapPackageToDb);
          }
        } else if (dbPackages.length > 0) {
          setPackages(dbPackages);
        }

        // Pull Payments
        const dbPayments = await pullTable<Payment>('payments', mapPaymentFromDb, payments);
        if (dbPayments.length === 0 && payments.length > 0) {
          for (const p of payments) {
            await upsertRecord('payments', p, mapPaymentToDb);
          }
        } else if (dbPayments.length > 0) {
          setPayments(dbPayments);
        }

        // Pull Routers
        const dbRouters = await pullTable<Router>('routers', mapRouterFromDb, routers);
        if (dbRouters.length === 0 && routers.length > 0) {
          for (const r of routers) {
            await upsertRecord('routers', r, mapRouterToDb);
          }
        } else if (dbRouters.length > 0) {
          setRouters(dbRouters);
        }

        // Pull Vouchers
        const dbVouchers = await pullTable<Voucher>('vouchers', mapVoucherFromDb, vouchers);
        if (dbVouchers.length === 0 && vouchers.length > 0) {
          for (const v of vouchers) {
            await upsertRecord('vouchers', v, mapVoucherToDb);
          }
        } else if (dbVouchers.length > 0) {
          setVouchers(dbVouchers);
        }

        triggerAuditLog(
          'Supabase Core Sync',
          'Initial Database Pull',
          'System Database',
          'Successfully matched and synced 6 public tables from live Supabase instance: gsgsxnivjbdxdcuetuoy',
          'Success'
        );
      } catch (err: any) {
        console.error('Supabase Setup synchronization failed:', err);
        setSupabaseError(err.message || String(err));
      } finally {
        setSupabaseSyncing(false);
      }
    }

    syncSupabase();
  }, []);

  // 2. Synchronize lists to localStorage whenever states change
  useEffect(() => { WifiFlowDatabase.save('tenants', tenants); }, [tenants]);
  useEffect(() => { WifiFlowDatabase.save('customers', customers); }, [customers]);
  useEffect(() => { WifiFlowDatabase.save('packages', packages); }, [packages]);
  useEffect(() => { WifiFlowDatabase.save('payments', payments); }, [payments]);
  useEffect(() => { WifiFlowDatabase.save('routers', routers); }, [routers]);
  useEffect(() => { WifiFlowDatabase.save('vouchers', vouchers); }, [vouchers]);
  useEffect(() => { WifiFlowDatabase.save('resellers', resellers); }, [resellers]);
  useEffect(() => { WifiFlowDatabase.save('tickets', tickets); }, [tickets]);
  useEffect(() => { WifiFlowDatabase.save('audit_logs', auditLogs); }, [auditLogs]);
  useEffect(() => { WifiFlowDatabase.save('active_sessions', activeSessions); }, [activeSessions]);

  // 2.1 Live Telemetry & Bandwidth Ticker Simulation Loop
  useEffect(() => {
    const timer = setInterval(() => {
      // 1. Dynamic Sessions bandwidth activity update
      setActiveSessions(prevSessions => 
        prevSessions.map(sess => {
          // Add some randomly consumed bytes (400KB - 12MB)
          const addedBytes = Math.floor(400000 + Math.random() * 12000000);
          return {
            ...sess,
            bytesUsed: sess.bytesUsed + addedBytes,
            uptimeHours: Number((sess.uptimeHours + 0.02).toFixed(2))
          };
        })
      );

      // 2. Dynamic Router stats fluctuation
      setRouters(prevRouters => 
        prevRouters.map(router => {
          if (router.status === 'Offline') return router;
          const cpuOffset = Math.floor(Math.random() * 9) - 4; // -4% to +4%
          const memOffset = Math.floor(Math.random() * 5) - 2; // -2% to +2%
          
          return {
            ...router,
            cpuUsage: Math.max(8, Math.min(94, router.cpuUsage + cpuOffset)),
            memoryUsage: Math.max(15, Math.min(88, router.memoryUsage + memOffset)),
            onlineUsers: Math.max(12, router.onlineUsers + (Math.floor(Math.random() * 7) - 3))
          };
        })
      );
    }, 7000);

    return () => clearInterval(timer);
  }, []);

  // 3. System Mutators / Callbacks

  // Audit Helper Log
  const triggerAuditLog = (user: string, action: string, module: string, details: string, status: 'Success' | 'Failed' | 'Warning') => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      tenant_id: selectedTenant.id,
      user,
      action,
      module,
      status,
      details,
      createdAt: new Date().toISOString()
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Customers Mutators
  const handleAddCustomer = (c: Customer) => {
    setCustomers(prev => [c, ...prev]);
    upsertRecord('customers', c, mapCustomerToDb);
    triggerAuditLog(userRole, 'Register Customer', 'Customer Management', `Created account profile for ${c.fullName}`, 'Success');
  };

  const handleUpdateCustomer = (c: Customer) => {
    setCustomers(prev => prev.map(item => item.id === c.id ? c : item));
    upsertRecord('customers', c, mapCustomerToDb);
    triggerAuditLog(userRole, 'Update Customer Details', 'Customer Management', `Modified registration properties for ${c.fullName}`, 'Success');
  };

  const handleDeleteCustomer = (id: string) => {
    const deletedCust = customers.find(c => c.id === id);
    setCustomers(prev => prev.filter(item => item.id !== id));
    deleteRecord('customers', id);
    if (deletedCust) {
      triggerAuditLog(userRole, 'Delete Customer profile', 'Customer Management', `Removed client directory payload for ${deletedCust.fullName}`, 'Success');
    }
  };

  // Package Mutators
  const handleAddPackage = (p: InternetPackage) => {
    setPackages(prev => [p, ...prev]);
    upsertRecord('internet_packages', p, mapPackageToDb);
    triggerAuditLog(userRole, 'Configure Internet Pack', 'Package Controller', `Added broadband speed profile: ${p.name}`, 'Success');
  };

  const handleDeletePackage = (id: string) => {
    const target = packages.find(pkg => pkg.id === id);
    setPackages(prev => prev.filter(item => item.id !== id));
    deleteRecord('internet_packages', id);
    if (target) {
      triggerAuditLog(userRole, 'Delete Package offer', 'Package Controller', `Removed plan configuration: ${target.name}`, 'Success');
    }
  };

  // Payment Mutators
  const handleAddPayment = (pay: Payment) => {
    setPayments(prev => [pay, ...prev]);
    upsertRecord('payments', pay, mapPaymentToDb);
    
    // Create audit log
    triggerAuditLog(
      'System-Mpesa', 
      'Process safaricom API', 
      'M-Pesa Core Billing', 
      `Validated incoming KES ${pay.amount} from phone ${pay.phoneNumber}. Receipt: ${pay.mpesaReceipt || 'N/A'}`, 
      'Success'
    );

    // If client is logged in and paying for a match, we dynamically insert them as an active RADIUS session
    if (pay.customerId) {
      // Create session simulating connection trigger
      const matchedClient = customers.find(c => c.id === pay.customerId);
      const matchedRouter = routers.find(r => r.tenant_id === selectedTenant.id && r.status === 'Online');
      
      if (matchedClient && matchedRouter) {
         const newSession: ActiveSession = {
          id: `sess-${Date.now()}`,
          tenant_id: selectedTenant.id,
          customerName: matchedClient.fullName,
          macAddress: 'D2:3A:99:A2:' + Math.floor(10 + Math.random() * 89),
          ipAddress: '10.20.50.' + Math.floor(100 + Math.random() * 150),
          deviceName: 'Android Smart Client',
          bytesUsed: 1048576, // 1 MB initial load
          uptimeHours: 0.1,
          routerId: matchedRouter.id,
        };
        setActiveSessions(prev => [newSession, ...prev]);
      }
    }
  };

  // Router Mutators
  const handleAddRouter = (r: Router) => {
    setRouters(prev => [r, ...prev]);
    upsertRecord('routers', r, mapRouterToDb);
    triggerAuditLog(userRole, 'Bind Access Router', 'Mikrotik Controller', `Bound WAN interface on ${r.name} (${r.ipAddress})`, 'Success');
  };

  const handleDeleteRouter = (id: string) => {
    const target = routers.find(r => r.id === id);
    setRouters(prev => prev.filter(item => item.id !== id));
    deleteRecord('routers', id);
    if (target) {
      triggerAuditLog(userRole, 'Unregister Access Router', 'Mikrotik Controller', `Detached client gateway for: ${target.name}`, 'Success');
    }
  };

  // Voucher Mutators
  const handleAddVoucher = (v: Voucher) => {
    setVouchers(prev => [v, ...prev]);
    upsertRecord('vouchers', v, mapVoucherToDb);
    triggerAuditLog(userRole, 'Vouchers generation', 'Voucher Master', `Built physical scratchcard voucher. Code: ${v.code} for ${v.packageName}`, 'Success');
  };

  const handleDeleteVoucher = (id: string) => {
    const target = vouchers.find(v => v.id === id);
    setVouchers(prev => prev.filter(item => item.id !== id));
    deleteRecord('vouchers', id);
    if (target) {
      triggerAuditLog(userRole, 'Void Voucher scratchcard', 'Voucher Master', `Cancelled code ${target.code} from activation index`, 'Success');
    }
  };

  // Reseller Mutators
  const handleAddReseller = (res: Reseller) => {
    setResellers(prev => [res, ...prev]);
    triggerAuditLog(userRole, 'Enrolled resell agent', 'Resellers Manager', `Created reseller platform access for: ${res.name}`, 'Success');
  };

  const handleAllocateVouchersToReseller = (resellerId: string, voucherIds: string[]) => {
    setVouchers(prev => prev.map(v => {
      if (voucherIds.includes(v.id)) {
        const updated = { ...v, createdByResellerId: resellerId };
        upsertRecord('vouchers', updated, mapVoucherToDb);
        return updated;
      }
      return v;
    }));
    
    // Update reseller balances to simulate a deposit purchase
    setResellers(prev => prev.map(r => {
      if (r.id === resellerId) {
        return {
          ...r,
          totalSales: r.totalSales + (voucherIds.length * 50),
          totalCommission: r.totalCommission + (voucherIds.length * 50 * (r.commissionRate / 100)),
        };
      }
      return r;
    }));

    triggerAuditLog(userRole, 'Voucher Stock Allocation', 'Resellers Manager', `Deeded package of ${voucherIds.length} vouchers to reseller agent`, 'Success');
  };

  // Ticket Thread Mutators
  const handleAddTicket = (tkt: SupportTicket) => {
    setTickets(prev => [tkt, ...prev]);
    triggerAuditLog('Client Portal', 'Raised Helpdesk Ticket', 'Support Center', `Client raised open diagnostic issue: ${tkt.title}`, 'Warning');
  };

  const handleAddCommentToTicket = (ticketId: string, replyItem: { senderName: string, message: string, isAdmin: boolean }) => {
    setTickets(prev => prev.map(tkt => {
      if (tkt.id === ticketId) {
        return {
          ...tkt,
          status: replyItem.isAdmin ? 'Pending' : 'Open',
          replies: [...tkt.replies, {
            id: `rep-${Date.now()}`,
            senderName: replyItem.senderName,
            message: replyItem.message,
            isAdmin: replyItem.isAdmin,
            createdAt: new Date().toISOString()
          }]
        };
      }
      return tkt;
    }));

    triggerAuditLog(
      replyItem.isAdmin ? userRole : 'Client Portal', 
      'Ticket response posted', 
      'Support Center', 
      `Replied on issue thread ID: ${ticketId}`, 
      'Success'
    );
  };

  // Disconnect active session trigger (RADIUS COA)
  const handleDisconnectSession = (sessionId: string) => {
    const targetSession = activeSessions.find(s => s.id === sessionId);
    setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
    if (targetSession) {
      triggerAuditLog(
        userRole, 
        'Disconnect COA', 
        'RADIUS controller', 
        `Dropped online user ${targetSession.customerName} on MAC: ${targetSession.macAddress} forceful packet kill.`, 
        'Success'
      );
    }
  };

  // Scan routers status simulator
  const handleSyncRouters = () => {
    setRouters(prev => prev.map(r => {
      if (r.tenant_id === selectedTenant.id) {
        return {
          ...r,
          status: 'Online',
          onlineUsers: Math.floor(10 + Math.random() * 300),
          cpuUsage: Math.floor(10 + Math.random() * 45),
          memoryUsage: Math.floor(20 + Math.random() * 50),
          lastSync: new Date().toISOString(),
        };
      }
      return r;
    }));
    triggerAuditLog(userRole, 'Ping Interfaces scan', 'Mikrotik Controller', 'Queried API routes representing core Mikrotik queues successfully.', 'Success');
  };

  // Pay and connect callback link
  const handleCompletePortalActivation = (fullName: string, phone: string, amount: number) => {
    // Generate simulated payment entry inside portal callback
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      tenant_id: selectedTenant.id,
      customerId: null,
      customerName: fullName,
      amount: amount,
      phoneNumber: phone,
      status: 'Completed',
      method: 'STK_Push',
      mpesaReceipt: 'QJE' + Math.floor(1000 + Math.random() * 9000),
      createdAt: new Date().toISOString(),
      reconciled: true,
    };
    setPayments(prev => [newPayment, ...prev]);
    upsertRecord('payments', newPayment, mapPaymentToDb);

    triggerAuditLog(
      'System-Mpesa', 
      'API Instant verified', 
      'M-Pesa Core Billing', 
      `Captive Portal activate completed for ${fullName} with sum KES ${amount}.`, 
      'Success'
    );
  };

  const handleLogout = () => {
    setCurrentUser(null);
    triggerAuditLog(userRole, 'User Logout', 'Auth Session Handshake', 'User checked out of active admin session.', 'Success');
  };

  if (!currentUser) {
    return <AuthScreen tenants={tenants} onLoginSuccess={setCurrentUser} />;
  }

  return (
    <div className={`flex flex-col lg:flex-row h-screen font-sans antialiased overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#f8fafc] text-[#0f172a]'
    }`}>
      
      {/* Sidebar Navigation */}
      <Sidebar
        tenants={tenants}
        selectedTenant={selectedTenant}
        onSelectTenant={setSelectedTenant}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={userRole}
        setUserRole={setUserRole}
        currentUser={currentUser}
        onLogout={handleLogout}
        theme={theme}
        setTheme={setTheme}
        isDark={isDark}
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 overflow-y-auto px-4 py-6 md:p-8 space-y-6">
        
        {!(() => {
          const tabPermissions: Record<string, string[]> = {
            'dashboard': ['Super Admin', 'Tenant Owner', 'Manager', 'Support Agent'],
            'admin-users': ['Super Admin', 'Tenant Owner', 'Manager'],
            'customers': ['Super Admin', 'Tenant Owner', 'Manager', 'Support Agent'],
            'packages': ['Super Admin', 'Tenant Owner', 'Manager'],
            'mpesa': ['Super Admin', 'Tenant Owner', 'Manager'],
            'mikrotik': ['Super Admin', 'Tenant Owner', 'Manager'],
            'vouchers': ['Super Admin', 'Tenant Owner', 'Manager', 'Reseller'],
            'resellers': ['Super Admin', 'Tenant Owner'],
            'captive': ['Super Admin', 'Tenant Owner'],
            'customer-portal': ['Super Admin', 'Tenant Owner', 'Customer'],
            'support': ['Super Admin', 'Tenant Owner', 'Manager', 'Support Agent', 'Customer'],
            'network-monitor': ['Super Admin', 'Tenant Owner', 'Manager'],
            'database-setup': ['Super Admin', 'Tenant Owner'],
          };
          const isAuthorizedAdmin = !!(currentUser && (
            currentUser.email.toLowerCase() === 'keptonotieno@mail.com' ||
            currentUser.email.toLowerCase() === 'keptonotieno@gmail.com'
          ));
          const effectiveRole = isAuthorizedAdmin ? userRole : (userRole === 'Reseller' ? 'Reseller' : 'Customer');
          return (tabPermissions[activeTab] || []).includes(effectiveRole);
        })() ? (
          <div className={`p-8 rounded-3xl border backdrop-blur-xl flex flex-col items-center justify-center text-center space-y-6 max-w-2xl mx-auto my-12 shadow-2xl animate-fade-in ${
            isDark ? 'bg-slate-900/80 border-red-500/20 text-white' : 'bg-white border-red-100 text-slate-800'
          }`}>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-650 text-red-600'
            }`}>
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v3m0-3h3m-3 0H9m12-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 11V9a3 3 0 016 0v2m-6 5h6" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <h2 className={`text-xl font-bold tracking-tight font-sans ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Restricted Access Control Panel
              </h2>
              <p className={`text-xs max-w-md ${isDark ? 'text-slate-400' : 'text-slate-400'} leading-relaxed`}>
                The dashboard navigation node <span className="font-mono bg-red-400/10 px-1.5 py-0.5 rounded text-red-500 font-bold uppercase">{activeTab}</span> is protected.
                Your current active preset (<span className="font-bold text-amber-500">{userRole}</span>) does not possess permission rules to view this billing center resource.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {['Customer'].includes(userRole) && (
                <button
                  onClick={() => setActiveTab('customer-portal')}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-950/25 cursor-pointer"
                >
                  Return to My Customer Portal
                </button>
              )}
              {['Reseller'].includes(userRole) && (
                <button
                  onClick={() => setActiveTab('vouchers')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/25 cursor-pointer"
                >
                  Return to Vouchers Stock
                </button>
              )}
              {!['Customer', 'Reseller'].includes(userRole) && (
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Return to Workstation Dashboard
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                tenant={selectedTenant}
                customers={customers}
                payments={payments}
                routers={routers}
                activeSessions={activeSessions}
                setActiveSessions={setActiveSessions}
                packages={packages}
                isDark={isDark}
                automationSettings={automationSettings}
                setAutomationSettings={setAutomationSettings}
                onNavigateTab={setActiveTab}
              />
            )}

            {activeTab === 'admin-users' && (
              <AdminUsersDashboard
                tenant={selectedTenant}
                customers={customers}
                activeSessions={activeSessions}
                onNavigateTab={setActiveTab}
                isDark={isDark}
              />
            )}

            {activeTab === 'customers' && (
              <CustomerManagement
                tenant={selectedTenant}
                customers={customers}
                packages={packages}
                payments={payments}
                tickets={tickets}
                onAddCustomer={handleAddCustomer}
                onUpdateCustomer={handleUpdateCustomer}
                onDeleteCustomer={handleDeleteCustomer}
              />
            )}

            {activeTab === 'packages' && (
              <PackagesView
                tenant={selectedTenant}
                packages={packages}
                onAddPackage={handleAddPackage}
                onDeletePackage={handleDeletePackage}
              />
            )}

            {activeTab === 'mpesa' && (
              <MpesaIntegration
                tenant={selectedTenant}
                payments={payments}
                customers={customers}
                packages={packages}
                onAddPayment={handleAddPayment}
                onUpdateCustomer={handleUpdateCustomer}
              />
            )}

            {activeTab === 'mikrotik' && (
              <MikrotikRadius
                tenant={selectedTenant}
                routers={routers}
                activeSessions={activeSessions}
                onAddRouter={handleAddRouter}
                onDeleteRouter={handleDeleteRouter}
                onDisconnectSession={handleDisconnectSession}
                onSyncRouters={handleSyncRouters}
                isDark={isDark}
                automationSettings={automationSettings}
              />
            )}

            {activeTab === 'vouchers' && (
              <VoucherManagement
                tenant={selectedTenant}
                vouchers={vouchers}
                packages={packages}
                onAddVoucher={handleAddVoucher}
                onDeleteVoucher={handleDeleteVoucher}
              />
            )}

            {activeTab === 'resellers' && (
              <ResellerView
                tenant={selectedTenant}
                resellers={resellers}
                vouchers={vouchers}
                onAddReseller={handleAddReseller}
                onAllocateVouchersToReseller={handleAllocateVouchersToReseller}
              />
            )}

            {activeTab === 'captive' && (
              <CaptivePortalSim
                tenant={selectedTenant}
                packages={packages}
                onCompletePortalActivation={handleCompletePortalActivation}
              />
            )}

            {activeTab === 'customer-portal' && (
              <CustomerPortalSim
                tenant={selectedTenant}
                customers={customers}
                packages={packages}
                tickets={tickets}
                onAddTicket={handleAddTicket}
                onAddCommentToTicket={handleAddCommentToTicket}
                onTriggerMpesaRenew={handleCompletePortalActivation}
              />
            )}

            {activeTab === 'support' && (
              /* Inline support resolution desk for tech agents */
              <div className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm space-y-4">
                <div>
                  <h2 className="text-xl font-bold font-sans text-slate-900">ISP Centralized Support Desk</h2>
                  <p className="text-xs text-slate-500 mt-1">Provide quick replies to student tickets or estate queries.</p>
                </div>

                <div className="space-y-4 pt-2 font-sans text-xs">
                  {tickets.filter(t => t.tenant_id === selectedTenant.id).map(tkt => (
                    <div key={tkt.id} className="p-4 bg-slate-50 rounded-lg border border-slate-100/60 space-y-3">
                      <div className="flex justify-between items-center bg-white p-2 rounded">
                        <div>
                          <span className="text-[10px] font-mono text-slate-400 font-bold block">TICKET OWNER: {tkt.customerName}</span>
                          <span className="font-bold text-slate-800 text-sm">{tkt.title}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                          tkt.status === 'Open' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {tkt.status}
                        </span>
                      </div>
                      <p className="text-slate-600 block pl-2">{tkt.message}</p>

                      <div className="bg-white p-3 rounded space-y-3.5">
                        <span className="block text-[9px] uppercase font-mono tracking-wider font-bold text-slate-400">Response Thread</span>
                        {tkt.replies.length === 0 ? (
                          <span className="block text-[10px] text-slate-400 italic font-mono">No responses yet. Write a prompt reply.</span>
                        ) : (
                          tkt.replies.map(rep => (
                            <div key={rep.id} className={`p-2 rounded text-xs leading-relaxed ${rep.isAdmin ? 'bg-indigo-50 border-l-2 border-indigo-500' : 'bg-slate-50'}`}>
                              <span className="block text-[9px] font-bold text-slate-500 font-mono">
                                {rep.senderName} ({rep.isAdmin ? 'Admin Helpdesk' : 'Client'})
                              </span>
                              <span className="block mt-0.5">{rep.message}</span>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Quick comment trigger box for tech agents */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Comment as ISP Tech Support Admin..."
                          className="flex-1 text-xs bg-white border border-slate-200 rounded px-3 py-1.5 focus:outline-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddCommentToTicket(tkt.id, {
                                senderName: 'ISP Core Admin (' + userRole + ')',
                                message: (e.target as HTMLInputElement).value,
                                isAdmin: true
                              });
                              (e.target as HTMLInputElement).value = '';
                            }
                          }}
                        />
                        <span className="text-[10px] text-slate-350 font-mono px-2 py-2">Press enter to send response</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'network-monitor' && (
              <NetworkLogs
                tenant={selectedTenant}
                auditLogs={auditLogs}
                customers={customers}
                payments={payments}
                activeSessions={activeSessions}
              />
            )}

            {activeTab === 'database-setup' && (
              <DbInstructions />
            )}
          </>
        )}

      </main>

    </div>
  );
}
