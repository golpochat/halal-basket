/** Seeded permission catalog — keys used by @RequirePermissions(). */

export type PermissionDef = {
  key: string;
  name: string;
  description: string;
  groupName: string;
};

export const PERMISSION_CATALOG: PermissionDef[] = [
  {
    key: 'roles.read',
    name: 'View roles',
    description: 'List roles and their permissions',
    groupName: 'Roles & access',
  },
  {
    key: 'roles.write',
    name: 'Manage roles',
    description: 'Create/edit roles and assign permissions',
    groupName: 'Roles & access',
  },
  {
    key: 'users.read',
    name: 'View admin users',
    description: 'List admin accounts',
    groupName: 'Users',
  },
  {
    key: 'users.write',
    name: 'Manage admin users',
    description: 'Create/edit/deactivate admin accounts',
    groupName: 'Users',
  },
  {
    key: 'shop_users.read',
    name: 'View shop users',
    description: 'List shop login accounts',
    groupName: 'Shop users',
  },
  {
    key: 'shop_users.write',
    name: 'Manage shop users',
    description: 'Create/edit shop login accounts',
    groupName: 'Shop users',
  },
  {
    key: 'drivers.read',
    name: 'View drivers',
    description: 'List driver accounts',
    groupName: 'Drivers',
  },
  {
    key: 'drivers.write',
    name: 'Manage drivers',
    description: 'Create/edit driver accounts',
    groupName: 'Drivers',
  },
  {
    key: 'shops.read',
    name: 'View shops',
    description: 'List partner shops',
    groupName: 'Shops',
  },
  {
    key: 'shops.write',
    name: 'Manage shops',
    description: 'Create/update shops',
    groupName: 'Shops',
  },
  {
    key: 'ops.read',
    name: 'View ops',
    description: 'Order lookup and customer risk views',
    groupName: 'Ops',
  },
  {
    key: 'ops.write',
    name: 'Manage ops',
    description: 'Refunds, complaints, blocks',
    groupName: 'Ops',
  },
  {
    key: 'analytics.read',
    name: 'View analytics',
    description: 'Platform analytics dashboard',
    groupName: 'Analytics',
  },
  {
    key: 'promotions.read',
    name: 'View promotions',
    description: 'View coupons and cart promo',
    groupName: 'Promotions',
  },
  {
    key: 'promotions.write',
    name: 'Manage promotions',
    description: 'Edit coupons and cart promo',
    groupName: 'Promotions',
  },
  {
    key: 'branding.read',
    name: 'View branding',
    description: 'View hero branding items',
    groupName: 'Branding',
  },
  {
    key: 'branding.write',
    name: 'Manage branding',
    description: 'Edit hero branding',
    groupName: 'Branding',
  },
  {
    key: 'warehouses.read',
    name: 'View warehouses',
    description: 'List warehouses',
    groupName: 'Warehouses',
  },
  {
    key: 'warehouses.write',
    name: 'Manage warehouses',
    description: 'Create/edit/publish warehouses',
    groupName: 'Warehouses',
  },
  {
    key: 'locations.read',
    name: 'View locations & fees',
    description: 'View delivery locations and fees',
    groupName: 'Locations',
  },
  {
    key: 'locations.write',
    name: 'Manage locations & fees',
    description: 'Edit delivery locations and fees',
    groupName: 'Locations',
  },
  {
    key: 'currencies.read',
    name: 'View currencies',
    description: 'List currencies',
    groupName: 'Locales',
  },
  {
    key: 'currencies.write',
    name: 'Manage currencies',
    description: 'Edit currencies',
    groupName: 'Locales',
  },
  {
    key: 'languages.read',
    name: 'View languages',
    description: 'List languages',
    groupName: 'Locales',
  },
  {
    key: 'languages.write',
    name: 'Manage languages',
    description: 'Edit languages',
    groupName: 'Locales',
  },
  {
    key: 'catalogue.read',
    name: 'View catalogue',
    description: 'View product catalogue admin',
    groupName: 'Catalogue',
  },
  {
    key: 'catalogue.write',
    name: 'Manage catalogue',
    description: 'Import/update catalogue',
    groupName: 'Catalogue',
  },
  {
    key: 'gdpr.read',
    name: 'View privacy tools',
    description: 'Access GDPR tools',
    groupName: 'Privacy',
  },
  {
    key: 'gdpr.write',
    name: 'Run privacy actions',
    description:
      'Anonymize customer PII (orders/payments retained; blocked while open)',
    groupName: 'Privacy',
  },
  {
    key: 'legal.read',
    name: 'View legal pages',
    description: 'List and preview storefront legal policies',
    groupName: 'Legal',
  },
  {
    key: 'legal.write',
    name: 'Manage legal pages',
    description: 'Create, edit, and publish legal policies',
    groupName: 'Legal',
  },
];

/**
 * Default “Admin” staff role — generalist ops + catalogue, not specialist domains.
 * Marketing / Logistics / Support own promotions write, locations write, GDPR write, etc.
 */
export const ADMIN_ROLE_PERMISSION_KEYS = [
  'ops.read',
  'ops.write',
  'analytics.read',
  // Default Admin also gets directory overviews
  'shops.read',
  'shops.write',
  'drivers.read',
  'catalogue.read',
  'catalogue.write',
  'promotions.read',
  'locations.read',
  'warehouses.read',
  'branding.read',
  'currencies.read',
  'languages.read',
  'gdpr.read',
  'legal.read',
] as const;

export type SystemRoleDef = {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Permission keys; empty means “all catalog keys” (super admin). */
  permissionKeys: readonly string[] | 'all';
};

export const SYSTEM_ROLE_SUPER_ADMIN = {
  id: '00000000-0000-4000-8000-0000000000a1',
  slug: 'super-admin',
  name: 'Super admin',
  description: 'Full platform access',
} as const;

export const SYSTEM_ROLE_ADMIN = {
  id: '00000000-0000-4000-8000-0000000000a2',
  slug: 'admin',
  name: 'Admin',
  description: 'Standard operations access',
} as const;

export const SYSTEM_ROLE_OPS = {
  id: '00000000-0000-4000-8000-0000000000a3',
  slug: 'ops-agent',
  name: 'Ops agent',
  description: 'Order lookup, refunds, complaints, and risk',
} as const;

export const SYSTEM_ROLE_CATALOGUE = {
  id: '00000000-0000-4000-8000-0000000000a4',
  slug: 'catalogue-manager',
  name: 'Catalogue manager',
  description: 'Product catalogue import and shop listings',
} as const;

export const SYSTEM_ROLE_MARKETING = {
  id: '00000000-0000-4000-8000-0000000000a5',
  slug: 'marketing',
  name: 'Marketing',
  description: 'Promotions, branding, and public locale content',
} as const;

export const SYSTEM_ROLE_LOGISTICS = {
  id: '00000000-0000-4000-8000-0000000000a6',
  slug: 'logistics',
  name: 'Logistics',
  description: 'Delivery areas, fees, warehouses, and drivers',
} as const;

export const SYSTEM_ROLE_SUPPORT = {
  id: '00000000-0000-4000-8000-0000000000a7',
  slug: 'support',
  name: 'Support',
  description: 'Customer ops plus privacy export/erase tools',
} as const;

/** Seeded system staff roles (sync on seed / catalog sync). */
export const SYSTEM_STAFF_ROLES: SystemRoleDef[] = [
  {
    ...SYSTEM_ROLE_SUPER_ADMIN,
    permissionKeys: 'all',
  },
  {
    ...SYSTEM_ROLE_ADMIN,
    permissionKeys: ADMIN_ROLE_PERMISSION_KEYS,
  },
  {
    ...SYSTEM_ROLE_OPS,
    permissionKeys: [
      'ops.read',
      'ops.write',
      'analytics.read',
      'shops.read',
      'drivers.read',
    ],
  },
  {
    ...SYSTEM_ROLE_CATALOGUE,
    permissionKeys: [
      'catalogue.read',
      'catalogue.write',
      'shops.read',
      'shops.write',
    ],
  },
  {
    ...SYSTEM_ROLE_MARKETING,
    permissionKeys: [
      'promotions.read',
      'promotions.write',
      'branding.read',
      'branding.write',
      'currencies.read',
      'languages.read',
      'legal.read',
      'legal.write',
    ],
  },
  {
    ...SYSTEM_ROLE_LOGISTICS,
    permissionKeys: [
      'locations.read',
      'locations.write',
      'warehouses.read',
      'warehouses.write',
      'drivers.read',
      'drivers.write',
      'shops.read',
    ],
  },
  {
    ...SYSTEM_ROLE_SUPPORT,
    permissionKeys: [
      'ops.read',
      'ops.write',
      'gdpr.read',
      'gdpr.write',
      'analytics.read',
      'legal.read',
      'legal.write',
    ],
  },
];

