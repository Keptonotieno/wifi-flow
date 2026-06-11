export interface Tenant {
  id: string;
  name: string;
  domain: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  planType: 'Starter' | 'Growth' | 'Enterprise';
  createdAt: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  nationalId: string;
  address: string;
  building: string;
  customerNumber: string;
  status: 'Active' | 'Suspended';
  activePackageId: string | null;
  createdAt: string;
  gracePeriodHours: number;
  advanceAllowed: boolean;
  debtAmount: number;
}

export type PackageType = 'Time' | 'Data' | 'Hybrid';

export interface InternetPackage {
  id: string;
  tenant_id: string;
  name: string;
  type: PackageType;
  price: number;
  downloadSpeed: string; // e.g. "10 Mbps"
  uploadSpeed: string;   // e.g. "5 Mbps"
  deviceLimit: number;
  dataLimitGB: number | null; // null means unlimited
  expiryHours: number;        // e.g. 1, 24, 168 (1 week), 720 (1 month)
  gracePeriodHours: number;   // Smart Grace Period
  isAdvanceAllowed: boolean;  // Internet Advance
}

export interface Payment {
  id: string;
  tenant_id: string;
  customerId: string | null;
  customerName: string;
  amount: number;
  phoneNumber: string;
  status: 'Completed' | 'Pending' | 'Failed';
  method: 'STK_Push' | 'PayBill' | 'BuyGoods' | 'Voucher' | 'C2B' | 'B2C';
  mpesaReceipt: string | null;
  createdAt: string;
  reconciled: boolean;
}

export interface Router {
  id: string;
  tenant_id: string;
  name: string;
  ipAddress: string;
  model: string;
  status: 'Online' | 'Offline';
  onlineUsers: number;
  activeSessions: number;
  cpuUsage: number;
  memoryUsage: number;
  lastSync: string;
}

export interface Voucher {
  id: string;
  tenant_id: string;
  code: string;
  packageId: string;
  packageName: string;
  price: number;
  expiryDateStr: string;
  status: 'Active' | 'Redeemed' | 'Expired';
  createdByResellerId: string | null;
  redeemedByCustomerName: string | null;
  redeemedAt: string | null;
  createdAt: string;
}

export interface Reseller {
  id: string;
  tenant_id: string;
  name: string;
  phoneNumber: string;
  commissionRate: number; // e.g. 15 for 15%
  balance: number;
  totalSales: number;
  totalCommission: number;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  tenant_id: string;
  customerName: string;
  title: string;
  message: string;
  status: 'Open' | 'Pending' | 'Resolved' | 'Closed';
  createdAt: string;
  replies: Array<{
    id: string;
    senderName: string;
    message: string;
    isAdmin: boolean;
    createdAt: string;
  }>;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  user: string;
  action: string;
  module: string;
  status: 'Success' | 'Failed' | 'Warning';
  details: string;
  createdAt: string;
}

export interface ActiveSession {
  id: string;
  tenant_id: string;
  customerName: string;
  macAddress: string;
  ipAddress: string;
  deviceName: string;
  bytesUsed: number;
  uptimeHours: number;
  routerId: string;
}
