import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';

// GET /api/contacts/[id] - Get contact by ID
// PUT /api/contacts/[id] - Update contact
// DELETE /api/contacts/[id] - Archive contact
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid contact ID' });
  }

  if (req.method === 'GET') {
    return handleGetContact(req, res, id);
  } else if (req.method === 'PUT') {
    return handleUpdateContact(req, res, id);
  } else if (req.method === 'DELETE') {
    return handleArchiveContact(req, res, id);
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGetContact(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const result = await pool.query(
      `SELECT 
        id, name, contact_type, email, mobile, city, state, pincode, 
        address, profile_image_url, is_archived, created_at, updated_at
      FROM contacts
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    return res.status(200).json({ contact: result.rows[0] });
  } catch (error: any) {
    console.error('Error fetching contact:', error);
    return res.status(500).json({ message: 'Failed to fetch contact', error: error.message });
  }
}

async function handleUpdateContact(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    const {
      name,
      contact_type,
      email,
      mobile,
      city,
      state,
      pincode,
      address,
      profile_image_url,
    } = req.body;

    // Validation
    if (!name || !contact_type) {
      return res.status(400).json({ message: 'Name and contact type are required' });
    }

    if (!['Customer', 'Vendor', 'Both'].includes(contact_type)) {
      return res.status(400).json({ message: 'Invalid contact type' });
    }

    if (email) {
      // Check if email already exists for another contact
      const existingContact = await pool.query(
        'SELECT id FROM contacts WHERE email = $1 AND id != $2 AND is_archived = false',
        [email, id]
      );
      if (existingContact.rows.length > 0) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const result = await pool.query(
      `UPDATE contacts 
      SET 
        name = $1,
        contact_type = $2,
        email = $3,
        mobile = $4,
        city = $5,
        state = $6,
        pincode = $7,
        address = $8,
        profile_image_url = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *`,
      [
        name,
        contact_type,
        email || null,
        mobile || null,
        city || null,
        state || null,
        pincode || null,
        address || null,
        profile_image_url || null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    return res.status(200).json({
      message: 'Contact updated successfully',
      contact: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating contact:', error);
    return res.status(500).json({ message: 'Failed to update contact', error: error.message });
  }
}

async function handleArchiveContact(req: AuthenticatedRequest, res: NextApiResponse, id: string) {
  try {
    // Check user permission - only Admin can archive
    if (req.user?.role !== 'Admin') {
      return res.status(403).json({ message: 'Only Admin can archive contacts' });
    }

    const result = await pool.query(
      `UPDATE contacts 
      SET is_archived = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    return res.status(200).json({
      message: 'Contact archived successfully',
      contact: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error archiving contact:', error);
    return res.status(500).json({ message: 'Failed to archive contact', error: error.message });
  }
}

export default requirePermission('canManageMasterData', handler);
