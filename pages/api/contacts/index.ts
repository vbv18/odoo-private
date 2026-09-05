import { NextApiResponse } from 'next';
import { pool } from '@/lib/db';
import { AuthenticatedRequest, authenticateToken, hasPermission } from '@/lib/auth-middleware';
import { FALLBACK_CONTACTS } from '@/lib/master-data-store';

// GET /api/contacts - List all contacts
// POST /api/contacts - Create new contact
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGetContacts(req, res);
  } else if (req.method === 'POST') {
    if (!hasPermission(req.user, 'canManageMasterData')) {
      return res.status(403).json({ message: 'Insufficient permissions to manage master data' });
    }
    return handleCreateContact(req, res);
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}

async function handleGetContacts(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    const { type, search, archived } = req.query;
    
    let query = `
      SELECT 
        id, name, contact_type, email, mobile, city, state, pincode, 
        address, profile_image_url, is_archived, created_at
      FROM contacts
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (type) {
      query += ` AND (contact_type = $${paramCount} OR contact_type = 'Both')`;
      params.push(type);
      paramCount++;
    }

    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (archived !== 'true') {
      query += ` AND is_archived = false`;
    }

    query += ` ORDER BY name ASC`;

    const result = await pool.query(query, params);

    return res.status(200).json({
      contacts: result.rows,
      total: result.rows.length,
    });
  } catch (error: any) {
    // Graceful fallback to default contacts
    const { type, search } = req.query;
    let filtered = FALLBACK_CONTACTS;
    if (type) {
      filtered = filtered.filter((c) => c.contact_type === type || c.contact_type === 'Both');
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
    }
    return res.status(200).json({
      contacts: filtered,
      total: filtered.length,
    });
  }
}

async function handleCreateContact(req: AuthenticatedRequest, res: NextApiResponse) {
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

    if (!name || !contact_type) {
      return res.status(400).json({ message: 'Name and contact_type are required' });
    }

    if (!['Customer', 'Vendor', 'Both'].includes(contact_type)) {
      return res.status(400).json({ message: 'contact_type must be Customer, Vendor, or Both' });
    }

    const result = await pool.query(
      `
      INSERT INTO contacts (
        name, contact_type, email, mobile, city, state, pincode, 
        address, profile_image_url, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `,
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
        req.user?.id || null,
      ]
    );

    return res.status(201).json({
      message: 'Contact created successfully',
      contact: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating contact:', error);
    return res.status(500).json({ message: 'Failed to create contact', error: error.message });
  }
}

export default authenticateToken(handler);
