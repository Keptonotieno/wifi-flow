import { createClient } from '@supabase/supabase-js';
import { 
  Tenant, Customer, InternetPackage, Payment, Router, 
  Voucher, Reseller, SupportTicket, AuditLog, ActiveSession 
} from '../types';

// Supabase Connection setup with immediate fallbacks
const DEFAULT_URL = 'https://gsgsxnivjbdxdcuetuoy.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzZ3N4bml2amJkeGRjdWV0dW95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzAyODEsImV4cCI6MjA5Njc0NjI4MX0.lmSP7kh0ufkSI9OytT49yWqWaB7B4rRI5h_ncyYQe98';

// Preset credentials in localStorage for consistent UI setup if they are empty
if (!localStorage.getItem('wf_supabase_url')) {
  localStorage.setItem('wf_supabase_url', DEFAULT_URL);
}
if (!localStorage.getItem('wf_supabase_anon_key')) {
  localStorage.setItem('wf_supabase_anon_key', DEFAULT_ANON_KEY);
}

let rawUrl = (import.meta as any).env?.VITE_SUPABASE_URL || localStorage.getItem('wf_supabase_url') || DEFAULT_URL;
let rawKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || localStorage.getItem('wf_supabase_anon_key') || DEFAULT_ANON_KEY;

// Sanitize: trim whitespace and remove any trailing slash to prevent double-slash (//rest/v1) routing errors
rawUrl = (rawUrl || '').trim();
if (rawUrl.endsWith('/')) {
  rawUrl = rawUrl.slice(0, -1);
}
const supabaseUrl = rawUrl;
const supabaseAnonKey = (rawKey || '').trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Database Mappers ---

export function mapTenantFromDb(row: any): Tenant {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain || '',
    logo: row.logo || '',
    primaryColor: row.primary_color || '#0284c7',
    secondaryColor: row.secondary_color || '#0f172a',
    planType: (row.plan_type || 'Starter') as any,
    createdAt: row.created_at || new Date().toISOString()
  };
}

export function mapTenantToDb(t: Tenant): any {
  return {
    id: t.id,
    name: t.name,
    domain: t.domain || '',
    logo: t.logo || '',
    primary_color: t.primaryColor,
    secondary_color: t.secondaryColor,
    plan_type: t.planType,
    created_at: t.createdAt
  };
}

export function mapCustomerFromDb(row: any): Customer {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    fullName: row.full_name,
    phoneNumber: row.phone_number,
    email: row.email || '',
    nationalId: row.national_id || '',
    address: row.address || '',
    building: row.building || '',
    customerNumber: row.customer_number || '',
    status: (row.status || 'Active') as any,
    activePackageId: row.active_package_id || null,
    createdAt: row.created_at || new Date().toISOString(),
    gracePeriodHours: row.grace_period_hours || 0,
    advanceAllowed: row.advance_allowed !== false,
    debtAmount: Number(row.debt_amount || 0)
  };
}

export function mapCustomerToDb(c: Customer): any {
  return {
    id: c.id,
    tenant_id: c.tenant_id,
    full_name: c.fullName,
    phone_number: c.phoneNumber,
    email: c.email || '',
    national_id: c.nationalId || '',
    address: c.address || '',
    building: c.building || '',
    customer_number: c.customerNumber || '',
    status: c.status,
    active_package_id: c.activePackageId,
    grace_period_hours: c.gracePeriodHours,
    advance_allowed: c.advanceAllowed,
    debt_amount: c.debtAmount,
    created_at: c.createdAt
  };
}

export function mapPackageFromDb(row: any): InternetPackage {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    type: (row.type || 'Time') as any,
    price: Number(row.price || 0),
    downloadSpeed: row.download_speed || '',
    uploadSpeed: row.upload_speed || '',
    deviceLimit: row.device_limit || 1,
    dataLimitGB: row.data_limit_gb ? Number(row.data_limit_gb) : null,
    expiryHours: row.expiry_hours || 24,
    gracePeriodHours: row.grace_period_hours || 0,
    isAdvanceAllowed: row.is_advance_allowed !== false
  };
}

export function mapPackageToDb(p: InternetPackage): any {
  return {
    id: p.id,
    tenant_id: p.tenant_id,
    name: p.name,
    type: p.type,
    price: p.price,
    download_speed: p.downloadSpeed,
    upload_speed: p.uploadSpeed,
    device_limit: p.deviceLimit,
    data_limit_gb: p.dataLimitGB,
    expiry_hours: p.expiryHours,
    grace_period_hours: p.gracePeriodHours,
    is_advance_allowed: p.isAdvanceAllowed
  };
}

export function mapPaymentFromDb(row: any): Payment {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    customerId: row.customer_id || null,
    customerName: row.customer_name || '',
    amount: Number(row.amount || 0),
    phoneNumber: row.phone_number || '',
    status: (row.status || 'Pending') as any,
    method: (row.method || 'STK_Push') as any,
    mpesaReceipt: row.mpesa_receipt || null,
    reconciled: row.reconciled || false,
    createdAt: row.created_at || new Date().toISOString()
  };
}

export function mapPaymentToDb(p: Payment): any {
  return {
    id: p.id,
    tenant_id: p.tenant_id,
    customer_id: p.customerId,
    customer_name: p.customerName,
    amount: p.amount,
    phone_number: p.phoneNumber,
    status: p.status,
    method: p.method,
    mpesa_receipt: p.mpesaReceipt,
    reconciled: p.reconciled,
    created_at: p.createdAt
  };
}

export function mapRouterFromDb(row: any): Router {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    ipAddress: row.ip_address || '',
    model: row.model || 'MikroTik CCR1009',
    status: (row.status || 'Online') as any,
    onlineUsers: Math.floor(10 + Math.random() * 200),
    activeSessions: Math.floor(10 + Math.random() * 150),
    cpuUsage: Math.floor(15 + Math.random() * 40),
    memoryUsage: Math.floor(25 + Math.random() * 30),
    lastSync: row.last_sync || new Date().toISOString()
  };
}

export function mapRouterToDb(r: Router): any {
  return {
    id: r.id,
    tenant_id: r.tenant_id,
    name: r.name,
    ip_address: r.ipAddress,
    model: r.model || 'MikroTik CCR1009',
    status: r.status,
    last_sync: r.lastSync,
    api_port: 8728,
    username: 'admin',
    password_encrypted: 'securepass'
  };
}

export function mapVoucherFromDb(row: any): Voucher {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    code: row.code,
    packageId: row.package_id,
    packageName: row.package_name,
    price: Number(row.price || 0),
    expiryDateStr: '24 Hours',
    status: (row.status || 'Active') as any,
    createdByResellerId: row.created_by_reseller_id || null,
    redeemedByCustomerName: row.redeemed_by_customer_name || null,
    redeemedAt: row.redeemed_at || null,
    createdAt: row.created_at || new Date().toISOString()
  };
}

export function mapVoucherToDb(v: Voucher): any {
  return {
    id: v.id,
    tenant_id: v.tenant_id,
    code: v.code,
    package_id: v.packageId,
    package_name: v.packageName,
    price: v.price,
    expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: v.status,
    created_by_reseller_id: v.createdByResellerId,
    redeemed_by_customer_name: v.redeemedByCustomerName,
    redeemed_at: v.redeemedAt,
    created_at: v.createdAt
  };
}

// --- Dynamic Table Pull & Write Helpers with Fallback ---

export async function pullTable<T>(
  tableName: string, 
  mapper: (row: any) => T, 
  localStorageFallback: T[]
): Promise<T[]> {
  try {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) {
      if (error.message && error.message.includes('Invalid path specified in request URL')) {
        console.warn(`[Supabase Schema Notice]: Table "${tableName}" does not exist in your active Supabase database schema yet. To resolve this, navigate to the "Integration Setup" tab in the App Sidebar, copy the SQL Database Initializer script, and execute it inside your Supabase SQL Editor. Under the hood, we are gracefully utilizing the secure offline sandbox with standard mock data records.`);
      } else {
        console.warn(`Supabase pulled failed for "${tableName}". Checking fallback.`, error.message);
      }
      return localStorageFallback;
    }
    if (data && data.length > 0) {
      return data.map(mapper);
    }
    return localStorageFallback;
  } catch (err) {
    console.warn(`Supabase network caught error on "${tableName}". Using fallback.`, err);
    return localStorageFallback;
  }
}

export async function upsertRecord<T>(
  tableName: string,
  record: T,
  mapperToDb: (item: T) => any
): Promise<boolean> {
  try {
    const dbRecord = mapperToDb(record);
    const { error } = await supabase.from(tableName).upsert(dbRecord);
    if (error) {
      console.error(`Supabase upsert error on "${tableName}":`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Supabase network exception on upsert in "${tableName}":`, err);
    return false;
  }
}

export async function deleteRecord(
  tableName: string,
  id: string
): Promise<boolean> {
  try {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) {
      console.error(`Supabase delete error on "${tableName}":`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Supabase network exception on delete in "${tableName}":`, err);
    return false;
  }
}
