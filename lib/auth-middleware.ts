import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { normalizeRole, UserRole } from '@/lib/roles';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthenticatedUser {
  id: string;
  loginId: string;
  email: string;
  role: UserRole;
  name: string;
  contactId?: string; // For Contact users linked to a contact
}

export interface AuthenticatedRequest extends NextApiRequest {
  user?: AuthenticatedUser;
}

// Role-based permissions
export const PERMISSIONS = {
  Admin: {
    canManageMasterData: true,
    canArchiveMasterData: true,
    canCreateTransactions: true,
    canViewAllReports: true,
    canManageUsers: true,
    canManageSettings: true,
    canViewAllData: true,
  },
  Accountant: {
    canManageMasterData: true,
    canArchiveMasterData: false,
    canCreateTransactions: true,
    canViewAllReports: true,
    canManageUsers: false,
    canManageSettings: false,
    canViewAllData: true,
  },
  Contact: {
    canManageMasterData: false,
    canArchiveMasterData: false,
    canCreateTransactions: false, // Can only make payments
    canViewAllReports: false,
    canManageUsers: false,
    canManageSettings: false,
    canViewAllData: false,
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

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = {
        id: decoded.id || decoded.userId,
        loginId: decoded.loginId,
        email: decoded.email,
        role: decoded.role ? normalizeRole(decoded.role) : 'Admin',
        name: decoded.name || decoded.fullName || decoded.loginId || 'User',
        contactId: decoded.contactId,
      };

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
  roles: UserRole[],
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) {
  return authenticateToken(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (!req.user || !roles.includes(normalizeRole(req.user.role))) {
      return res.status(403).json({ 
        message: 'Insufficient permissions. Required role: ' + roles.join(' or ') 
      });
    }

    return handler(req, res);
  });
}

export { normalizeRole };

/**
 * Check if user has specific permission
 */
export function hasPermission(
  user: AuthenticatedUser | undefined,
  permission: keyof typeof PERMISSIONS.Admin
): boolean {
  if (!user) return false;
  const role = normalizeRole(user.role);
  const rolePermissions = PERMISSIONS[role];
  if (!rolePermissions) return false;
  return (rolePermissions as any)[permission] === true;
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
  if (role === 'Admin' || role === 'Accountant') {
    return true;
  }

  if (role === 'Contact') {
    return user.contactId === contactId;
  }

  return false;
}
