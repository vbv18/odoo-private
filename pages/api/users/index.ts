import { NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';
import { getAllUsers, createUser } from '@/lib/users';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const users = getAllUsers();
    return res.status(200).json({ users });
  }

  if (req.method === 'POST') {
    try {
      const { email, password, name, role, loginId } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = createUser({
        email,
        passwordHash,
        name,
        role: role || 'Accountant',
        loginId,
      });

      const { password_hash, ...sanitized } = newUser as any;
      return res.status(201).json({ message: 'User created successfully', user: sanitized });
    } catch (error: any) {
      return res.status(error.status || 500).json({ message: error.message || 'Failed to create user' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default requirePermission('canManageUsers', handler);
