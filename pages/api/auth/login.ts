import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByLoginOrEmail } from '../../../lib/users';
import { ensureDbUser, syncAllFileUsersToDb } from '../../../lib/db-users';
import { normalizeRole } from '../../../lib/roles';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { loginId, email, password } = req.body;
    const identifier = loginId || email;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Login ID/email and password are required' });
    }

    const user = findUserByLoginOrEmail(identifier);

    if (!user) {
      return res.status(401).json({ message: 'Invalid Login Id or Password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid Login Id or Password' });
    }

    // Sync all users to PostgreSQL so accountant created_by FKs work like admin
    await syncAllFileUsersToDb();
    await ensureDbUser(user);

    const normalizedRole = normalizeRole(user.role);

    const token = jwt.sign(
      {
        userId: user.id,
        loginId: user.login_id,
        email: user.email,
        role: normalizedRole,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        loginId: user.login_id,
        email: user.email,
        fullName: user.full_name,
        role: normalizedRole,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
