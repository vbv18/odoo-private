import { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, loginId, email, role = 'user', password } = req.body;

    if (!loginId || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate login ID length
    if (loginId.length < 6 || loginId.length > 12) {
      return res.status(400).json({ message: 'Login ID must be between 6-12 characters' });
    }

    // Check if login ID or email already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE login_id = $1 OR email = $2',
      [loginId, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: 'Login ID or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const createUserResult = await query(
      'INSERT INTO users (login_id, email, full_name, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, login_id, email, full_name, role',
      [loginId, email, name || loginId, hashedPassword, role]
    );

    const newUser = createUserResult.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: newUser.id,
        loginId: newUser.login_id,
        email: newUser.email,
        role: newUser.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Log to audit
    try {
      await query(
        'INSERT INTO audit_logs (user_id, action, ip_address, user_agent) VALUES ($1, $2, $3, $4)',
        [
          newUser.id,
          'signup',
          req.socket.remoteAddress || 'unknown',
          req.headers['user-agent'] || 'unknown'
        ]
      );
    } catch (auditError) {
      console.log('Audit log error:', auditError);
    }

    return res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: newUser.id,
        loginId: newUser.login_id,
        email: newUser.email,
        fullName: newUser.full_name,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
