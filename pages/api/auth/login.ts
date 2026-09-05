import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ message: 'Login ID and password are required' });
    }

    const userResult = await query(
      'SELECT id, login_id, email, full_name, password_hash, role, is_active FROM users WHERE login_id = $1 AND is_active = true',
      [loginId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid Login Id or Password' });
    }

    const user = userResult.rows[0];

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid Login Id or Password' });
    }

    const token = jwt.sign(
      { 
        userId: user.id,
        loginId: user.login_id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    try {
      await query(
        `INSERT INTO audit_logs (user_id, action, ip_address, user_agent, created_at) 
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          user.id,
          'login',
          req.socket.remoteAddress || 'unknown',
          req.headers['user-agent'] || 'unknown'
        ]
      );
    } catch (auditError) {
      console.log('Audit log error (non-critical):', auditError);
    }

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        loginId: user.login_id,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
