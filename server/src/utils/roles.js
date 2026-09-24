const ROLES = {
  SUPERADMIN: 'superadmin',
  OWNER: 'owner',
  MANAGER: 'manager',
  ACCOUNTANT: 'accountant',
  WARDEN: 'warden',
  STAFF: 'staff',
  STUDENT: 'student'
};

const ALL_ROLES = Object.values(ROLES);

const MODULES = {
  DASHBOARD: 'dashboard',
  STUDENTS: 'students',
  ROOMS: 'rooms',
  BEDS: 'beds',
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

const ACTIONS = { READ: 'read', CREATE: 'create', UPDATE: 'update', DELETE: 'delete', EXPORT: 'export' };

const FULL = ['read', 'create', 'update', 'delete', 'export'];

const MATRIX = {
  [ROLES.OWNER]: Object.fromEntries(Object.values(MODULES).map((m) => [m, FULL])),
  [ROLES.MANAGER]: {
    ...Object.fromEntries(
      Object.values(MODULES)
        .filter((m) => ![MODULES.SETTINGS, MODULES.PAYROLL, MODULES.STAFF].includes(m))
        .map((m) => [m, FULL])
    ),
    [MODULES.STAFF]: ['read'],
    [MODULES.PAYROLL]: ['read'],
    [MODULES.SETTINGS]: []
  },
  [ROLES.ACCOUNTANT]: {
    [MODULES.DASHBOARD]: ['read'],
    [MODULES.STUDENTS]: ['read', 'export'],
    [MODULES.ROOMS]: ['read'],
    [MODULES.BEDS]: ['read'],
    [MODULES.PAYMENTS]: FULL,
    [MODULES.INVOICES]: FULL,
    [MODULES.BILLING]: ['read', 'create'],
    [MODULES.EXPENSES]: FULL,
    [MODULES.FOOD]: ['read'],
    [MODULES.UTILITIES]: ['read'],
    [MODULES.PAYROLL]: FULL,
    [MODULES.CHECKOUT]: ['read'],
    [MODULES.REPORTS]: FULL,
    [MODULES.COMPLAINTS]: ['read']
  },
  [ROLES.WARDEN]: {
    [MODULES.DASHBOARD]: ['read'],
    [MODULES.STUDENTS]: ['read', 'update', 'export'],
    [MODULES.ROOMS]: ['read', 'update'],
    [MODULES.BEDS]: ['read', 'update'],
    [MODULES.ADMISSIONS]: ['read'],
    [MODULES.ATTENDANCE]: FULL,
    [MODULES.LEAVES]: FULL,
    [MODULES.VISITORS]: FULL,
    [MODULES.COMPLAINTS]: ['read', 'update'],
    [MODULES.NOTICES]: ['read', 'create'],
    [MODULES.MAINTENANCE]: ['read', 'create', 'update'],
    [MODULES.REPORTS]: ['read'],
    [MODULES.CHECKOUT]: ['read']
  },
  [ROLES.STAFF]: {
    [MODULES.DASHBOARD]: ['read'],
    [MODULES.STUDENTS]: ['read'],
    [MODULES.ROOMS]: ['read'],
    [MODULES.BEDS]: ['read'],
    [MODULES.VISITORS]: ['read', 'create', 'update'],
    [MODULES.COMPLAINTS]: ['read', 'create', 'update'],
    [MODULES.MAINTENANCE]: ['read', 'create', 'update'],
    [MODULES.INVENTORY]: ['read', 'create', 'update'],
    [MODULES.ATTENDANCE]: ['read', 'create'],
    [MODULES.LEAVES]: ['read'],
    [MODULES.NOTICES]: ['read'],
    [MODULES.INVOICES]: ['read'],
    [MODULES.PAYMENTS]: ['read']
  }
};

let hasWarned = false;
const modulesForRole = (role) => {
  const base = MATRIX[role] || {};
  return Object.keys(base).filter((m) => base[m] && base[m].length > 0);
};

const can = (role, module, action = 'read') => {
  const row = MATRIX[role] || {};
  return Array.isArray(row[module]) && row[module].includes(action);
};

const hasPermission = (user, module, action = 'read') => {
  if (!user) return false;
  if (user.role === ROLES.SUPERADMIN) return true;
  if (can(user.role, module, action)) return true;
  if (user.role === ROLES.STAFF && action !== 'delete' && action !== 'export') {
    if (Array.isArray(user.permissions) && user.permissions.includes(`${module}:${action}`)) return true;
  }
  return false;
};

module.exports = { ROLES, ALL_ROLES, MODULES, ACTIONS, can, hasPermission, modulesForRole, MATRIX };