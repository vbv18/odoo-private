import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthenticatedUser {
  id: string;
  loginId: string;
  email: string;
  role: 'Admin' | 'Accountant' | 'Contact';
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
  roles: Array<'Admin' | 'Accountant' | 'Contact'>,
  handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>
) {
  return authenticateToken(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (!req.user || !roles.includes(req.user.role)) {
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
  const rolePermissions = PERMISSIONS[user.role];
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
  
  // Admin and Accountant can access all data
  if (user.role === 'Admin' || user.role === 'Accountant') {
    return true;
  }

  // Contact can only access their own data
  if (user.role === 'Contact') {
    return user.contactId === contactId;
  }

  return false;
}
