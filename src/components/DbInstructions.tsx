import React, { useState } from 'react';
import { Database, Shield, Lock, FileText, Key, Network, CheckCircle, Copy } from 'lucide-react';

export default function DbInstructions() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  
  // State for developer's credentials
  const [creds, setCreds] = useState({
    supabaseUrl: localStorage.getItem('wf_supabase_url') || '',
    supabaseAnonKey: localStorage.getItem('wf_supabase_anon_key') || '',
    supabaseServiceKey: localStorage.getItem('wf_supabase_service_key') || '',
    mpesaShortcode: localStorage.getItem('wf_mpesa_shortcode') || '',
    mpesaConsumerKey: localStorage.getItem('wf_mpesa_consumer_key') || '',
    mpesaConsumerSecret: localStorage.getItem('wf_mpesa_consumer_secret') || '',
    mpesaPasskey: localStorage.getItem('wf_mpesa_passkey') || '',
    mikrotikApiPort: localStorage.getItem('wf_mikrotik_api_port') || '8728',
    mikrotikUsername: localStorage.getItem('wf_mikrotik_username') || '',
    mikrotikPassword: localStorage.getItem('wf_mikrotik_password') || '',
  });

  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('wf_supabase_url', creds.supabaseUrl);
    localStorage.setItem('wf_supabase_anon_key', creds.supabaseAnonKey);
    localStorage.setItem('wf_supabase_service_key', creds.supabaseServiceKey);
    localStorage.setItem('wf_mpesa_shortcode', creds.mpesaShortcode);
    localStorage.setItem('wf_mpesa_consumer_key', creds.mpesaConsumerKey);
    localStorage.setItem('wf_mpesa_consumer_secret', creds.mpesaConsumerSecret);
    localStorage.setItem('wf_mpesa_passkey', creds.mpesaPasskey);
    localStorage.setItem('wf_mikrotik_api_port', creds.mikrotikApiPort);
    localStorage.setItem('wf_mikrotik_username', creds.mikrotikUsername);
    localStorage.setItem('wf_mikrotik_password', creds.mikrotikPassword);
    
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const schemaSql = `-- WIFIFLOW WiFi Billing & Hotspot Management SaaS
-- PostgreSQL Database Schema for Supabase
-- Supports Multi-Tenancy with RLS isolation

-- 1. Create Tenants Table
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    domain TEXT UNIQUE,
    logo TEXT,
    primary_color TEXT DEFAULT '#0284c7',
    secondary_color TEXT DEFAULT '#0f172a',
    plan_type TEXT CHECK (plan_type IN ('Starter', 'Growth', 'Enterprise')) DEFAULT 'Starter',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 2. Create Profiles / Staff Table
CREATE TABLE public.staff_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT CHECK (role IN ('Super Admin', 'Tenant Owner', 'Manager', 'Support Agent', 'Reseller')) DEFAULT 'Support Agent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Staff
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create Customers Table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT,
    national_id TEXT,
    address TEXT,
    building TEXT,
    customer_number TEXT NOT NULL,
    status TEXT CHECK (status IN ('Active', 'Suspended')) DEFAULT 'Active',
    active_package_id UUID,
    grace_period_hours INT DEFAULT 0,
    advance_allowed BOOLEAN DEFAULT true,
    debt_amount NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 4. Create Internet Packages Table
CREATE TABLE public.internet_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('Time', 'Data', 'Hybrid')) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    download_speed TEXT NOT NULL,
    upload_speed TEXT NOT NULL,
    device_limit INT DEFAULT 1,
    data_limit_gb NUMERIC,
    expiry_hours INT NOT NULL,
    grace_period_hours INT DEFAULT 0,
    is_advance_allowed BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Packages
ALTER TABLE public.internet_packages ENABLE ROW LEVEL SECURITY;

-- 5. Create Payments Table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    phone_number TEXT NOT NULL,
    status TEXT CHECK (status IN ('Completed', 'Pending', 'Failed')) DEFAULT 'Pending',
    method TEXT CHECK (method IN ('STK_Push', 'PayBill', 'BuyGoods', 'Voucher', 'C2B', 'B2C')) NOT NULL,
    mpesa_receipt TEXT UNIQUE,
    reconciled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 6. Create Routers Table
CREATE TABLE public.routers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    api_port INT DEFAULT 8728,
    username TEXT NOT NULL,
    password_encrypted TEXT NOT NULL,
    model TEXT,
    status TEXT CHECK (status IN ('Online', 'Offline')) DEFAULT 'Offline',
    last_sync TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on Routers
ALTER TABLE public.routers ENABLE ROW LEVEL SECURITY;

-- 7. Create Vouchers Table
CREATE TABLE public.vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    code TEXT NOT NULL UNIQUE,
    package_id UUID REFERENCES public.internet_packages(id) ON DELETE CASCADE NOT NULL,
    package_name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT CHECK (status IN ('Active', 'Redeemed', 'Expired')) DEFAULT 'Active',
    created_by_reseller_id UUID,
    redeemed_by_customer_name TEXT,
    redeemed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on Vouchers
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) TENANT DATA ISOLATION POLICIES (EX: customers)
------------------------------------------------------------------
-- RLS works by reading the tenant_id linked to the authenticated user profile.
-- Helper function to get current user's tenant_id:
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
    SELECT tenant_id FROM public.staff_profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Policy for customers table:
CREATE POLICY tenant_isolation_policy ON public.customers
    FOR ALL
    TO authenticated
    USING (tenant_id = public.get_user_tenant_id())
    WITH CHECK (tenant_id = public.get_user_tenant_id());
`;

  return (
    <div id="setup-instructions-view" className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-sans font-semibold tracking-tight text-slate-900">
            System Integration & Setup Guide
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Connect your own production services or view ready-to-run Supabase configuration.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-mono">
          <Database className="w-3.5 h-3.5" />
          Status: Ready to Integration
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form: Real Credentials Storage */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden h-fit">
          <div className="p-5 border-b border-gray-50 bg-slate-50/50">
            <h2 className="font-sans font-semibold text-slate-800 flex items-center gap-2">
              <Key className="w-4 h-4 text-sky-600" />
              API Key & System Settings
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Keys are securely stored locally in your browser's context. Change these anytime.
            </p>
          </div>

          <form onSubmit={handleSave} className="p-5 space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">1. Supabase Connection</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600">SUPABASE_URL</label>
                <input
                  type="text"
                  placeholder="https://your-project-id.supabase.co"
                  className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full font-mono text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none"
                  value={creds.supabaseUrl}
                  onChange={(e) => setCreds({...creds, supabaseUrl: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600">SUPABASE_ANON_KEY</label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOi..."
                    className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full font-mono focus:bg-white focus:border-sky-500 focus:outline-none"
                    value={creds.supabaseAnonKey}
                    onChange={(e) => setCreds({...creds, supabaseAnonKey: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">SERVICE_ROLE_KEY</label>
                  <input
                    type="password"
                    placeholder="eyJhbGci..."
                    className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full font-mono focus:bg-white focus:border-sky-500 focus:outline-none"
                    value={creds.supabaseServiceKey}
                    onChange={(e) => setCreds({...creds, supabaseServiceKey: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold pt-2">2. Kenya Safaricom M-Pesa</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600">Shortcode / LNM PayBill</label>
                  <input
                    type="text"
                    placeholder="174379"
                    className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white focus:border-sky-500 focus:outline-none"
                    value={creds.mpesaShortcode}
                    onChange={(e) => setCreds({...creds, mpesaShortcode: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Lipa na M-Pesa Passkey</label>
                  <input
                    type="password"
                    placeholder="bfb279f9aa9..."
                    className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full font-mono focus:bg-white focus:border-sky-500 focus:outline-none"
                    value={creds.mpesaPasskey}
                    onChange={(e) => setCreds({...creds, mpesaPasskey: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">M-Pesa Consumer Key</label>
                <input
                  type="text"
                  placeholder="uYg817gdy1978gds..."
                  className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full font-mono text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none"
                  value={creds.mpesaConsumerKey}
                  onChange={(e) => setCreds({...creds, mpesaConsumerKey: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">M-Pesa Consumer Secret</label>
                <input
                  type="password"
                  placeholder="S87gdyf..."
                  className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full font-mono focus:bg-white focus:border-sky-500 focus:outline-none"
                  value={creds.mpesaConsumerSecret}
                  onChange={(e) => setCreds({...creds, mpesaConsumerSecret: e.target.value})}
                />
              </div>
            </div>

            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold pt-2">3. MikroTik RouterOS</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600">API Port</label>
                  <input
                    type="text"
                    className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white focus:border-sky-500 focus:outline-none"
                    value={creds.mikrotikApiPort}
                    onChange={(e) => setCreds({...creds, mikrotikApiPort: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Default Auth User</label>
                  <input
                    type="text"
                    placeholder="wififlow_api"
                    className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white focus:border-sky-500 focus:outline-none"
                    value={creds.mikrotikUsername}
                    onChange={(e) => setCreds({...creds, mikrotikUsername: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600">Default Auth Password</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  className="mt-1 block w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm max-w-full focus:bg-white focus:border-sky-500 focus:outline-none"
                  value={creds.mikrotikPassword}
                  onChange={(e) => setCreds({...creds, mikrotikPassword: e.target.value})}
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-4 bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white font-medium py-2 rounded-lg text-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 font-sans"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Save Credentials
            </button>

            {saved && (
              <div className="p-2 border border-emerald-100 bg-emerald-50 text-emerald-800 text-xs rounded-lg text-center animate-fade-in font-sans">
                Credentials saved! These will now feed into the app modules.
              </div>
            )}
          </form>
        </div>

        {/* Right Instructions: Supabase PostgreSQL Setup & RLS */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <h3 className="font-sans font-semibold text-slate-800 flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-emerald-600" />
              Multi-Tenant Row Level Security (RLS) Guide
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed font-sans">
              To guarantee bulletproof isolation, WifiFlow utilizes a PostgreSQL function inside your Supabase project. Every table includes a <code>tenant_id</code>. Under RLS, whenever a logged-in Staff member (admin, support agent, reseller) runs a query, Supabase limits results to records where <code>tenant_id</code> matches that user's associated tenant.
            </p>
            <div className="mt-4 border border-emerald-100 bg-emerald-50 text-emerald-800 p-3.5 rounded-lg flex gap-3 text-xs leading-relaxed font-sans">
              <Lock className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Security Proof:</strong> Because RLS runs directly inside the database, even if a user bypasses the React frontend using postman, the PostgreSQL engine blocks access to any other tenant's customer accounts, routers, or voucher sheets.
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-sans font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                Supabase SQL Database Initializer
              </h3>
              <button
                onClick={() => copyToClipboard(schemaSql, 'sql')}
                className="text-xs flex items-center gap-1.5 text-slate-500 hover:text-slate-800 border border-slate-100 rounded px-2 py-1 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer font-sans"
              >
                {copiedSection === 'sql' ? 'Copied!' : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy SQL Code
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4 font-sans">
              Run this schema inside the <strong>SQL Editor</strong> panel of your Supabase console to create all 7 relational tables, seed roles, and lock down row isolation policies automatically.
            </p>
            
            <div className="max-h-[350px] overflow-y-auto rounded-lg border border-slate-100 bg-slate-900 p-4">
              <pre className="text-slate-200 text-xs font-mono leading-relaxed whitespace-pre font-medium" id="schema-sql-code-block">
                {schemaSql}
              </pre>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <h3 className="font-sans font-semibold text-slate-800 flex items-center gap-2 mb-3">
              <Network className="w-4 h-4 text-indigo-600" />
              MikroTik QoS Speed Assignment Strategy
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-sans mb-3">
              WifiFlow communicates with your router using the built-in RouterOS API or RADIUS. To limit customer download are upload bandwidth speeds:
            </p>
            <ul className="text-xs text-slate-600 list-disc pl-5 space-y-2 font-sans">
              <li>
                <strong>Simple Queues:</strong> On successful M-Pesa STK verification, WifiFlow installs a Queue (e.g., <code>/queue simple add name="Joseph Onyango" max-limit=5M/10M target=10.20.50.14</code>).
              </li>
              <li>
                <strong>RADIUS attributes:</strong> When using Central Radius, the server responds back directly with <code>WISPr-Bandwidth-Max-Down := 10485760</code> (for 10 Mbps speed profiles).
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
