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

    // Return sample transactions
    const transactions = [
      { id: 1, date: '2026-09-05', description: 'Invoice INV-001', amount: 5000, status: 'completed' },
      { id: 2, date: '2026-09-04', description: 'Payment received', amount: 3200, status: 'completed' },
      { id: 3, date: '2026-09-03', description: 'Expense approval', amount: -850, status: 'pending' },
      { id: 4, date: '2026-09-02', description: 'Transfer', amount: 10000, status: 'completed' },
      { id: 5, date: '2026-09-01', description: 'Bill payment', amount: -1500, status: 'completed' },
    ];

    return res.status(200).json({ transactions });

  } catch (error) {
    console.error('Transactions error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
