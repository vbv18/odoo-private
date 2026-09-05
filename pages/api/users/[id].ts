import { NextApiResponse } from 'next';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';
import { getUserById, updateUser, deleteUser } from '@/lib/users';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ message: 'Invalid user ID' });

  if (req.method === 'GET') {
    const user = getUserById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ user });
  }

  if (req.method === 'PUT') {
    const { full_name, email, role, is_active } = req.body;
    const updated = updateUser(id, { full_name, email, role, is_active });
    if (!updated) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ message: 'User updated successfully', user: updated });
  }

  if (req.method === 'DELETE') {
    const success = deleteUser(id);
    if (!success) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ message: 'User deleted successfully' });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default requirePermission('canManageUsers', handler);
