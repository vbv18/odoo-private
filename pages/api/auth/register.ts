import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createUser, loginIdFromEmail } from '../../../lib/users';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, loginId, email, role = 'user', password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const resolvedLoginId = (loginId && String(loginId).trim()) || loginIdFromEmail(String(email));

    if (resolvedLoginId.length < 6 || resolvedLoginId.length > 12) {
      return res.status(400).json({ message: 'Login ID must be between 6-12 characters' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = createUser({
      loginId: resolvedLoginId,
      email,
      passwordHash: hashedPassword,
      name,
      role,
    });

    const token = jwt.sign(
      {
        userId: newUser.id,
        loginId: newUser.login_id,
        email: newUser.email,
        role: newUser.role,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: newUser.id,
        loginId: newUser.login_id,
        email: newUser.email,
        fullName: newUser.full_name,
        role: newUser.role,
      },
    });
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 409) {
      return res.status(409).json({ message: 'Login ID or email already exists' });
    }
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
