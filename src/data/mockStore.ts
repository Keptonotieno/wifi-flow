import { 
  Tenant, Customer, InternetPackage, Payment, Router, 
  Voucher, Reseller, SupportTicket, AuditLog, ActiveSession 
} from '../types';

// Pre-seeded multi-tenant data
export const INITIAL_TENANTS: Tenant[] = [
  {
    id: 'tenant-nairobi',
    name: 'Nairobi Smart-Net Solutions',
    domain: 'nairobi-smartnet.co.ke',
    logo: '⚡',
    primaryColor: '#0284c7', // Sky Blue
    secondaryColor: '#0f172a', // Slate
    planType: 'Enterprise',
    createdAt: '2025-01-10T08:00:00Z',
  },
  {
    id: 'tenant-juja',
    name: 'Juja Campus Wifi & Hostels',
    domain: 'jujacampusnet.net',
    logo: '🎓',
    primaryColor: '#16a34a', // Green
    secondaryColor: '#1e293b',
    planType: 'Growth',
    createdAt: '2025-03-15T12:00:00Z',
  },
  {
    id: 'tenant-coast',
    name: 'Mombasa AirFiber Hotspots',
    domain: 'coastfiber.co.ke',
    logo: '🌴',
    primaryColor: '#ea580c', // Orange
    secondaryColor: '#0f172a',
    planType: 'Starter',
    createdAt: '2025-05-18T15:30:00Z',
  }
];

export const INITIAL_PACKAGES: InternetPackage[] = [
  // Tenant Nairobi
  {
    id: 'pkg-nairobi-1h',
    tenant_id: 'tenant-nairobi',
    name: '1 Hour Super Charge',
    type: 'Time',
    price: 15, // 15 KES
    downloadSpeed: '5 Mbps',
    uploadSpeed: '2 Mbps',
    deviceLimit: 1,
    dataLimitGB: null,
    expiryHours: 1,
    gracePeriodHours: 0,
    isAdvanceAllowed: false
  },
  {
    id: 'pkg-nairobi-daily',
    tenant_id: 'tenant-nairobi',
    name: 'Daily Unlimited',
    type: 'Time',
    price: 50, // 50 KES
    downloadSpeed: '8 Mbps',
    uploadSpeed: '4 Mbps',
    deviceLimit: 2,
    dataLimitGB: null,
    expiryHours: 24,
    gracePeriodHours: 2,
    isAdvanceAllowed: true
  },
  {
    id: 'pkg-nairobi-weekly-10gb',
    tenant_id: 'tenant-nairobi',
    name: 'Weekly Premium (10GB)',
    type: 'Hybrid',
    price: 350,
    downloadSpeed: '15 Mbps',
    uploadSpeed: '5 Mbps',
    deviceLimit: 3,
    dataLimitGB: 10,
    expiryHours: 168,
    gracePeriodHours: 6,
    isAdvanceAllowed: true
  },
  {
    id: 'pkg-nairobi-monthly',
    tenant_id: 'tenant-nairobi',
    name: 'Monthly Unlimited Pro',
    type: 'Time',
    price: 1500,
    downloadSpeed: '20 Mbps',
    uploadSpeed: '10 Mbps',
    deviceLimit: 5,
    dataLimitGB: null,
    expiryHours: 720,
    gracePeriodHours: 12,
    isAdvanceAllowed: true
  },

  // Tenant Juja
  {
    id: 'pkg-juja-daily',
    tenant_id: 'tenant-juja',
    name: 'Campus Daily Special',
    type: 'Time',
    price: 30,
    downloadSpeed: '6 Mbps',
    uploadSpeed: '3 Mbps',
    deviceLimit: 1,
    dataLimitGB: null,
    expiryHours: 24,
    gracePeriodHours: 1,
    isAdvanceAllowed: false
  },
  {
    id: 'pkg-juja-weekly',
    tenant_id: 'tenant-juja',
    name: 'Student Weekly Unlimited',
    type: 'Time',
    price: 180,
    downloadSpeed: '10 Mbps',
    uploadSpeed: '5 Mbps',
    deviceLimit: 2,
    dataLimitGB: null,
    expiryHours: 168,
    gracePeriodHours: 3,
    isAdvanceAllowed: true
  },
  {
    id: 'pkg-juja-student-monthly',
    tenant_id: 'tenant-juja',
    name: 'Mega Hostel Monthly',
    type: 'Hybrid',
    price: 699,
    downloadSpeed: '15 Mbps',
    uploadSpeed: '5 Mbps',
    deviceLimit: 2,
    dataLimitGB: 50,
    expiryHours: 720,
    gracePeriodHours: 6,
    isAdvanceAllowed: true
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  // Tenant Nairobi
  {
    id: 'cust-nairobi-1',
    tenant_id: 'tenant-nairobi',
    fullName: 'Kelvin Kiprop',
    phoneNumber: '+254712345678',
    email: 'kelvin.kiprop@gmail.com',
    nationalId: '32456789',
    address: 'Hurlingham, Block G',
    building: 'Westwood Heights Apt 4B',
    customerNumber: 'WF-NBO-001',
    status: 'Active',
    activePackageId: 'pkg-nairobi-monthly',
    createdAt: '2025-02-01T10:00:00Z',
    gracePeriodHours: 12,
    advanceAllowed: true,
    debtAmount: 0,
  },
  {
    id: 'cust-nairobi-2',
    tenant_id: 'tenant-nairobi',
    fullName: 'Mary Wanjiku',
    phoneNumber: '+254722987654',
    email: 'wanjiku.m@outlook.com',
    nationalId: '29876432',
    address: 'Kileleshwa, Valley Road',
    building: 'Royal Crest Suites F1',
    customerNumber: 'WF-NBO-002',
    status: 'Active',
    activePackageId: 'pkg-nairobi-daily',
    createdAt: '2025-04-12T14:30:00Z',
    gracePeriodHours: 2,
    advanceAllowed: true,
    debtAmount: 50, // Borrowed Daily package
  },
  {
    id: 'cust-nairobi-3',
    tenant_id: 'tenant-nairobi',
    fullName: 'Joseph Onyango',
    phoneNumber: '+254733445566',
    email: 'j.onyango@yahoo.com',
    nationalId: '22114433',
    address: 'South B, Plainsview',
    building: 'Plainsview Court House 14',
    customerNumber: 'WF-NBO-003',
    status: 'Suspended',
    activePackageId: null,
    createdAt: '2025-05-01T11:15:00Z',
    gracePeriodHours: 6,
    advanceAllowed: false,
    debtAmount: 0,
  },

  // Tenant Juja
  {
    id: 'cust-juja-1',
    tenant_id: 'tenant-juja',
    fullName: 'Mwangi Kamau',
    phoneNumber: '+254799887766',
    email: 'mwangi.kamau@jkuat.ac.ke',
    nationalId: '38123456',
    address: 'Gate C Area',
    building: 'Apex Hostels, Rm 23',
    customerNumber: 'WF-JUJ-101',
    status: 'Active',
    activePackageId: 'pkg-juja-student-monthly',
    createdAt: '2025-03-16T09:00:00Z',
    gracePeriodHours: 6,
    advanceAllowed: true,
    debtAmount: 0,
  },
  {
    id: 'cust-juja-2',
    tenant_id: 'tenant-juja',
    fullName: 'Amina Yusuf',
    phoneNumber: '+254701223344',
    email: 'amina.yusuf99@gmail.com',
    nationalId: '39445566',
    address: 'Juja Town',
    building: 'Lions Plaza Flat B9',
    customerNumber: 'WF-JUJ-102',
    status: 'Active',
    activePackageId: 'pkg-juja-daily',
    createdAt: '2025-05-10T16:45:00Z',
    gracePeriodHours: 1,
    advanceAllowed: true,
    debtAmount: 0,
  }
];

export const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'pay-1',
    tenant_id: 'tenant-nairobi',
    customerId: 'cust-nairobi-1',
    customerName: 'Kelvin Kiprop',
    amount: 1500,
    phoneNumber: '+254712345678',
    status: 'Completed',
    method: 'STK_Push',
    mpesaReceipt: 'QJD39FKS92',
    createdAt: '2026-06-10T14:40:00Z',
    reconciled: true,
  },
  {
    id: 'pay-2',
    tenant_id: 'tenant-nairobi',
    customerId: 'cust-nairobi-2',
    customerName: 'Mary Wanjiku',
    amount: 50,
    phoneNumber: '+254722987654',
    status: 'Completed',
    method: 'STK_Push',
    mpesaReceipt: 'QJE48HJU31',
    createdAt: '2026-06-11T09:12:00Z',
    reconciled: true,
  },
  {
    id: 'pay-3',
    tenant_id: 'tenant-nairobi',
    customerId: null,
    customerName: 'Voucher Buyer (0755123456)',
    amount: 15,
    phoneNumber: '+254755123456',
    status: 'Completed',
    method: 'C2B',
    mpesaReceipt: 'QJE99DHH72',
    createdAt: '2026-06-11T09:55:00Z',
    reconciled: true,
  },
  {
    id: 'pay-4',
    tenant_id: 'tenant-juja',
    customerId: 'cust-juja-1',
    customerName: 'Mwangi Kamau',
    amount: 699,
    phoneNumber: '+254799887766',
    status: 'Completed',
    method: 'PayBill',
    mpesaReceipt: 'QJD12PLW01',
    createdAt: '2026-05-25T11:20:00Z',
    reconciled: true,
  },
  {
    id: 'pay-5',
    tenant_id: 'tenant-juja',
    customerId: 'cust-juja-2',
    customerName: 'Amina Yusuf',
    amount: 30,
    phoneNumber: '+254701223344',
    status: 'Failed',
    method: 'STK_Push',
    mpesaReceipt: null,
    createdAt: '2026-06-11T08:00:00Z',
    reconciled: false,
  }
];

export const INITIAL_ROUTERS: Router[] = [
  // Tenant Nairobi
  {
    id: 'router-nbo-ccr1',
    tenant_id: 'tenant-nairobi',
    name: 'Hurlingham CCR-1036 Main',
    ipAddress: '197.248.112.5',
    model: 'MikroTik CCR1036-12G-4S',
    status: 'Online',
    onlineUsers: 142,
    activeSessions: 142,
    cpuUsage: 14,
    memoryUsage: 35,
    lastSync: '2026-06-11T10:18:00Z',
  },
  {
    id: 'router-nbo-ap1',
    tenant_id: 'tenant-nairobi',
    name: 'Westwood Heights AP-Tower',
    ipAddress: '10.20.50.12',
    model: 'MikroTik NetMetal 5',
    status: 'Online',
    onlineUsers: 56,
    activeSessions: 56,
    cpuUsage: 25,
    memoryUsage: 44,
    lastSync: '2026-06-11T10:19:30Z',
  },
  {
    id: 'router-nbo-h1-offline',
    tenant_id: 'tenant-nairobi',
    name: 'Kileleshwa Edge Router',
    ipAddress: '197.248.115.82',
    model: 'MikroTik RB4011iGS+',
    status: 'Offline',
    onlineUsers: 0,
    activeSessions: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    lastSync: '2026-06-11T02:00:00Z',
  },

  // Tenant Juja
  {
    id: 'router-juja-ccr',
    tenant_id: 'tenant-juja',
    name: 'Juja Campus Core Router',
    ipAddress: '196.201.218.44',
    model: 'MikroTik CCR2004-16G-2S+',
    status: 'Online',
    onlineUsers: 340,
    activeSessions: 345,
    cpuUsage: 48,
    memoryUsage: 62,
    lastSync: '2026-06-11T10:20:00Z',
  }
];

export const INITIAL_VOUCHERS: Voucher[] = [
  {
    id: 'vch-1',
    tenant_id: 'tenant-nairobi',
    code: 'WF8849',
    packageId: 'pkg-nairobi-1h',
    packageName: '1 Hour Super Charge',
    price: 15,
    expiryDateStr: '2026-06-15T12:00:00Z',
    status: 'Active',
    createdByResellerId: 'res-nbo-1',
    redeemedByCustomerName: null,
    redeemedAt: null,
    createdAt: '2026-06-10T10:00:00Z',
  },
  {
    id: 'vch-2',
    tenant_id: 'tenant-nairobi',
    code: 'WF9311',
    packageId: 'pkg-nairobi-daily',
    packageName: 'Daily Unlimited',
    price: 50,
    expiryDateStr: '2026-06-11T10:10:00Z',
    status: 'Redeemed',
    createdByResellerId: null,
    redeemedByCustomerName: 'James Kirimi',
    redeemedAt: '2026-06-10T10:12:00Z',
    createdAt: '2026-06-10T09:00:00Z',
  },
  {
    id: 'vch-3',
    tenant_id: 'tenant-nairobi',
    code: 'WF5511',
    packageId: 'pkg-nairobi-daily',
    packageName: 'Daily Unlimited',
    price: 50,
    expiryDateStr: '2026-07-01T00:00:00Z',
    status: 'Active',
    createdByResellerId: 'res-nbo-1',
    redeemedByCustomerName: null,
    redeemedAt: null,
    createdAt: '2026-06-11T08:15:00Z',
  },
  {
    id: 'vch-4',
    tenant_id: 'tenant-juja',
    code: 'JU3345',
    packageId: 'pkg-juja-daily',
    packageName: 'Campus Daily Special',
    price: 30,
    expiryDateStr: '2026-06-20T12:00:00Z',
    status: 'Active',
    createdByResellerId: 'res-juj-1',
    redeemedByCustomerName: null,
    redeemedAt: null,
    createdAt: '2026-06-11T09:00:00Z',
  }
];

export const INITIAL_RESELLERS: Reseller[] = [
  {
    id: 'res-nbo-1',
    tenant_id: 'tenant-nairobi',
    name: 'Mwenda cyber café kiosk',
    phoneNumber: '+254700111222',
    commissionRate: 15, // 15%
    balance: 420,
    totalSales: 4800,
    totalCommission: 720,
    createdAt: '2025-04-01T10:00:00Z',
  },
  {
    id: 'res-juj-1',
    tenant_id: 'tenant-juja',
    name: 'Karanja Stationary Shop',
    phoneNumber: '+254711333444',
    commissionRate: 10, // 10%
    balance: 240,
    totalSales: 2400,
    totalCommission: 240,
    createdAt: '2025-05-15T11:00:00Z',
  }
];

export const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 'tkt-1',
    tenant_id: 'tenant-nairobi',
    customerName: 'Mary Wanjiku',
    title: 'STK push unpaid but money deducted',
    message: 'I paid 50 KES for the daily unlimited package via STK push. The money has been deducted from my M-Pesa account but the app says Payment Failed and I can\'t browse. My receipt is QJE48HJU31. Please assist.',
    status: 'Open',
    createdAt: '2026-06-11T09:30:00Z',
    replies: [
      {
        id: 'rep-1',
        senderName: 'Mary Wanjiku',
        message: 'Here is the screenshot details... highly urgent!',
        isAdmin: false,
        createdAt: '2026-06-11T09:31:00Z',
      }
    ]
  },
  {
    id: 'tkt-2',
    tenant_id: 'tenant-juja',
    customerName: 'Mwangi Kamau',
    title: 'Extremely slow speed at Peak Hours',
    message: 'Every evening between 7 PM and 10 PM, the speed drops significantly to less than 1 Mbps. I paid for 15 Mbps.',
    status: 'Resolved',
    createdAt: '2026-06-05T18:00:00Z',
    replies: [
      {
        id: 'rep-2',
        senderName: 'Hostel Tech Staff (Nzioka)',
        message: 'Hello Mwangi, we realized your local hostel router APC was saturated. We have moved your profile to the secondary frequency. Please run a new speed test.',
        isAdmin: true,
        createdAt: '2026-06-06T08:15:00Z',
      },
      {
        id: 'rep-3',
        senderName: 'Mwangi Kamau',
        message: 'Awe, yes it is stable and flying now! Thanks.',
        isAdmin: false,
        createdAt: '2026-06-06T12:00:00Z',
      }
    ]
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    tenant_id: 'tenant-nairobi',
    user: 'Amina (Support)',
    action: 'Activate Internet',
    module: 'Customer Management',
    status: 'Success',
    details: 'Manually activated subscriber Mary Wanjiku after payment verification.',
    createdAt: '2026-06-11T09:25:00Z',
  },
  {
    id: 'log-2',
    tenant_id: 'tenant-nairobi',
    user: 'System-Radius',
    action: 'Session Disconnect',
    module: 'Radius Controller',
    status: 'Success',
    details: 'Terminated active session for MAC 00:0A:95:9D:68:16 due to pkg grace period expired.',
    createdAt: '2026-06-11T09:40:00Z',
  },
  {
    id: 'log-3',
    tenant_id: 'tenant-juja',
    user: 'System-Mpesa',
    action: 'C2B Instant Verification',
    module: 'M-Pesa Hook',
    status: 'Success',
    details: 'Verified Safaricom C2B payment receipt QJD12PLW01. Autolinked to student Mwangi Kamau.',
    createdAt: '2026-05-25T11:20:00Z',
  }
];

export const INITIAL_ACTIVE_SESSIONS: ActiveSession[] = [
  {
    id: 'sess-1',
    tenant_id: 'tenant-nairobi',
    customerName: 'Kelvin Kiprop',
    macAddress: 'F2:3C:D1:88:EA:33',
    ipAddress: '10.20.50.88',
    deviceName: 'iPhone 15 Pro',
    bytesUsed: 4294967296, // 4 GB
    uptimeHours: 5.4,
    routerId: 'router-nbo-ap1'
  },
  {
    id: 'sess-2',
    tenant_id: 'tenant-nairobi',
    customerName: 'Mary Wanjiku',
    macAddress: '8C:11:7D:99:A1:02',
    ipAddress: '10.20.50.141',
    deviceName: 'HP EliteBook 840',
    bytesUsed: 1073741824, // 1 GB
    uptimeHours: 1.2,
    routerId: 'router-nbo-ap1'
  },
  {
    id: 'sess-3',
    tenant_id: 'tenant-juja',
    customerName: 'Mwangi Kamau',
    macAddress: '74:8D:08:B3:2C:99',
    ipAddress: '172.16.101.44',
    deviceName: 'Xiaomi Redmi Note 12',
    bytesUsed: 12884901888, // 12 GB
    uptimeHours: 74.5,
    routerId: 'router-juja-ccr'
  }
];

// Helper to load/save state to localStorage for premium robustness
export class WifiFlowDatabase {
  private static getKey(model: string) {
    return `wififlow_v1_${model}`;
  }

  public static load<T>(key: string, defaults: T[]): T[] {
    const data = localStorage.getItem(this.getKey(key));
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Error parsing storage for ' + key, e);
      }
    }
    return defaults;
  }

  public static save<T>(key: string, data: T[]) {
    localStorage.setItem(this.getKey(key), JSON.stringify(data));
  }
}
