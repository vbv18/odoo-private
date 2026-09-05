import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export type RoleType = 'Admin' | 'Accountant' | 'Contact' | 'User';

export interface AuthenticatedUser {
  id: string;
  loginId: string;
  email: string;
  role: RoleType | string;
  name: string;
  contactId?: string; // For Contact users linked to a contact
}

export interface AuthenticatedRequest extends NextApiRequest {
  user?: AuthenticatedUser;
}

export function normalizeRole(raw?: string): RoleType {
  const r = (raw || '').toLowerCase().trim();
  if (r === 'admin') return 'Admin';
  if (r === 'accountant') return 'Accountant';
  if (r === 'contact') return 'Contact';
  if (r === 'user') return 'User';
  return 'User';
}

// Role-based permissions
export const PERMISSIONS: Record<RoleType, {
  canManageMasterData: boolean;
  canArchiveMasterData: boolean;
  canCreateTransactions: boolean;
  canViewAllReports: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canViewAllData: boolean;
  canViewOwnTransactions: boolean;
  canMakePayments: boolean;
}> = {
  Admin: {
    canManageMasterData: true,
    canArchiveMasterData: true,
    canCreateTransactions: true,
    canViewAllReports: true,
    canManageUsers: true,
    canManageSettings: true,
    canViewAllData: true,
    canViewOwnTransactions: true,
    canMakePayments: true,
  },
  Accountant: {
    canManageMasterData: true,
    canArchiveMasterData: false,
    canCreateTransactions: true,
    canViewAllReports: true,
    canManageUsers: false,
    canManageSettings: false,
    canViewAllData: true,
    canViewOwnTransactions: true,
    canMakePayments: true,
  },
  Contact: {
    canManageMasterData: false,
    canArchiveMasterData: false,
    canCreateTransactions: true, // Allow contact/users to generate invoices & payments
    canViewAllReports: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewAllData: false,
    canViewOwnTransactions: true,
    canMakePayments: true,
  },
  User: {
    canManageMasterData: true,
    canArchiveMasterData: false,
    canCreateTransactions: true,
    canViewAllReports: true,
    canManageUsers: false,
    canManageSettings: false,
    canViewAllData: true,
    canViewOwnTransactions: true,
    canMakePayments: true,
  },
};

/**
 * Middleware to authenticate user from JWT token
 */
export function authenticateToken(
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: AuthenticatedRequest, res: NextApiResponse) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ message: 'Access token required' });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
      req.user = decoded;

      return handler(req, res);
    } catch (error) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
  };
}

/**
 * Middleware to check if user has specific role
 */
export function requireRole(
  roles: Array<RoleType | string>,
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) {
  return authenticateToken(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userRole = normalizeRole(req.user.role);
    const normalizedRoles = roles.map((r) => normalizeRole(r));

    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: 'Insufficient permissions. Required role: ' + roles.join(' or ') 
      });
    }

    return handler(req, res);
  });
}

/**
 * Check if user has specific permission
 */
export function hasPermission(
  user: AuthenticatedUser | undefined,
  permission: keyof typeof PERMISSIONS.Admin
): boolean {
  if (!user) return false;
  const normalized = normalizeRole(user.role);
  const rolePermissions = PERMISSIONS[normalized] || PERMISSIONS.User || PERMISSIONS.Admin;
  if (!rolePermissions) return false;
  return Boolean((rolePermissions as any)[permission]);
}

/**
 * Middleware to require specific permission
 */
export function requirePermission(
  permission: keyof typeof PERMISSIONS.Admin,
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) {
  return authenticateToken(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({ 
        message: `Insufficient permissions. Required permission: ${permission}` 
      });
    }

    return handler(req, res);
  });
}

/**
 * For Contact users, ensure they can only access their own data
 */
export function filterByUserAccess(user: AuthenticatedUser | undefined, contactId: string): boolean {
  if (!user) return false;
  
  const role = normalizeRole(user.role);
  // Admin, Accountant, and User can access all data
  if (role === 'Admin' || role === 'Accountant' || role === 'User') {
    return true;
  }

  // Contact can only access their own data
  if (role === 'Contact') {
    return !user.contactId || user.contactId === contactId;
  }

  return false;
}
