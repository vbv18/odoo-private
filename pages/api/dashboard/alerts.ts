import { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Return sample alerts
    const alerts = [
      { id: 1, type: 'High Transaction', severity: 'high', description: 'Large transaction detected', created: '2026-09-05' },
      { id: 2, type: 'Reconciliation Mismatch', severity: 'medium', description: 'Account balance mismatch', created: '2026-09-04' },
      { id: 3, type: 'Pending Approval', severity: 'low', description: '5 invoices awaiting approval', created: '2026-09-03' },
    ];

    return res.status(200).json({ alerts });

  } catch (error) {
    console.error('Alerts error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
