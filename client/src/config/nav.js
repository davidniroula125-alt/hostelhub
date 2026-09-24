export const MODULES = {
  DASHBOARD: 'dashboard',
  STUDENTS: 'students',
  ROOMS: 'rooms',
  ADMISSIONS: 'admissions',
  PAYMENTS: 'payments',
  INVOICES: 'invoices',
  BILLING: 'billing',
  EXPENSES: 'expenses',
  FOOD: 'food',
  UTILITIES: 'utilities',
  ATTENDANCE: 'attendance',
  LEAVES: 'leaves',
  VISITORS: 'visitors',
  COMPLAINTS: 'complaints',
  MAINTENANCE: 'maintenance',
  INVENTORY: 'inventory',
  STAFF: 'staff',
  PAYROLL: 'payroll',
  NOTICES: 'notices',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  CHECKOUT: 'checkout',
  DOCUMENTS: 'documents',
  SUBSCRIPTION: 'subscription'
};

export const ROLES = {
  SUPERADMIN: 'superadmin',
  OWNER: 'owner',
  MANAGER: 'manager',
  ACCOUNTANT: 'accountant',
  WARDEN: 'warden',
  STAFF: 'staff',
  STUDENT: 'student'
};

const ALL_STAFF = [ROLES.OWNER, ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.WARDEN, ROLES.STAFF];

export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard', module: MODULES.DASHBOARD }]
  },
  {
    label: 'Operations',
    items: [
      { label: 'Students', icon: 'Users', path: '/students', module: MODULES.STUDENTS, roles: ALL_STAFF },
      { label: 'Rooms & Beds', icon: 'BedDouble', path: '/rooms', module: MODULES.ROOMS, roles: ALL_STAFF },
      { label: 'Admissions', icon: 'UserPlus', path: '/admissions', module: MODULES.ADMISSIONS, roles: [ROLES.OWNER, ROLES.MANAGER] },
      { label: 'Attendance', icon: 'CalendarCheck', path: '/attendance', module: MODULES.ATTENDANCE, roles: ALL_STAFF },
      { label: 'Leaves', icon: 'CalendarDays', path: '/leaves', module: MODULES.LEAVES, roles: ALL_STAFF },
      { label: 'Visitors', icon: 'UserCheck', path: '/visitors', module: MODULES.VISITORS, roles: ALL_STAFF }
    ]
  },
  {
    label: 'Finance',
    items: [
      { label: 'Invoices', icon: 'Receipt', path: '/billing/invoices', module: MODULES.INVOICES, roles: [ROLES.OWNER, ROLES.MANAGER, ROLES.ACCOUNTANT] },
      { label: 'Payments', icon: 'Wallet', path: '/billing/payments', module: MODULES.PAYMENTS, roles: [ROLES.OWNER, ROLES.MANAGER, ROLES.ACCOUNTANT] },
      { label: 'Expenses', icon: 'TrendingDown', path: '/expenses', module: MODULES.EXPENSES, roles: [ROLES.OWNER, ROLES.MANAGER, ROLES.ACCOUNTANT] },
      { label: 'Checkout', icon: 'LogOut', path: '/checkout', module: MODULES.CHECKOUT, roles: [ROLES.OWNER, ROLES.MANAGER, ROLES.ACCOUNTANT] }
    ]
  },
  {
    label: 'Campus',
    items: [
      { label: 'Food / Mess', icon: 'UtensilsCrossed', path: '/food', module: MODULES.FOOD, roles: [ROLES.OWNER, ROLES.MANAGER, ROLES.WARDEN] },
      { label: 'Utilities', icon: 'Zap', path: '/utilities', module: MODULES.UTILITIES, roles: [ROLES.OWNER, ROLES.MANAGER] },
      { label: 'Complaints', icon: 'AlertCircle', path: '/complaints', module: MODULES.COMPLAINTS, roles: ALL_STAFF },
      { label: 'Maintenance', icon: 'Wrench', path: '/maintenance', module: MODULES.MAINTENANCE, roles: [ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF] },
      { label: 'Inventory', icon: 'Boxes', path: '/inventory', module: MODULES.INVENTORY, roles: [ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF] },
      { label: 'Notices', icon: 'Megaphone', path: '/notices', module: MODULES.NOTICES, roles: ALL_STAFF }
    ]
  },
  {
    label: 'People',
    items: [
      { label: 'Staff', icon: 'IdCard', path: '/staff', module: MODULES.STAFF, roles: [ROLES.OWNER, ROLES.MANAGER] },
      { label: 'Payroll', icon: 'Banknote', path: '/payroll', module: MODULES.PAYROLL, roles: [ROLES.OWNER, ROLES.MANAGER, ROLES.ACCOUNTANT] },
      { label: 'Documents', icon: 'FolderOpen', path: '/documents', module: MODULES.DOCUMENTS, roles: ALL_STAFF }
    ]
  },
  {
    label: 'Insights',
    items: [
      { label: 'Reports', icon: 'BarChart3', path: '/reports', module: MODULES.REPORTS, roles: [ROLES.OWNER, ROLES.MANAGER, ROLES.ACCOUNTANT] }
    ]
  },
  {
    label: 'Admin',
    items: [
      { label: 'Users', icon: 'UserCog', path: '/users', module: MODULES.SETTINGS, roles: [ROLES.OWNER, ROLES.MANAGER] },
      { label: 'Settings', icon: 'Settings', path: '/settings', module: MODULES.SETTINGS, roles: [ROLES.OWNER, ROLES.MANAGER] },
      { label: 'Audit Log', icon: 'ScrollText', path: '/audit', module: MODULES.SETTINGS, roles: [ROLES.OWNER] },
      { label: 'Subscription', icon: 'CreditCard', path: '/subscription', module: MODULES.SUBSCRIPTION, roles: [ROLES.OWNER] }
    ]
  },
  {
    label: 'Student',
    items: [{ label: 'My Portal', icon: 'GraduationCap', path: '/portal', module: 'portal', roles: [ROLES.STUDENT] }]
  }
];

export const SUPERADMIN_NAV = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: 'LayoutDashboard', path: '/admin/dashboard' },
      { label: 'Hostels', icon: 'Building2', path: '/admin/hostels' },
      { label: 'Users', icon: 'UserCog', path: '/admin/users' },
      { label: 'Rooms', icon: 'BedDouble', path: '/rooms' },
      { label: 'Subscription Plans', icon: 'Sparkles', path: '/admin/plans' },
      { label: 'Subscriptions', icon: 'CreditCard', path: '/admin/subscriptions' },
      { label: 'Payments', icon: 'Wallet', path: '/admin/payments' },
      { label: 'Audit Log', icon: 'ScrollText', path: '/admin/audit' }
    ]
  }
];