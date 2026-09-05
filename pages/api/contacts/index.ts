import { NextApiResponse } from 'next';
import { AuthenticatedRequest, authenticateToken, hasPermission } from '@/lib/auth-middleware';
import { isDbAvailable } from '@/lib/db-safe';
import { getContacts, saveContacts } from '@/lib/mock-data';
import { pool } from '@/lib/db';
import { randomUUID } from 'crypto';

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
  const dbOk = await isDbAvailable();
  const { type, search, archived } = req.query;

  if (!dbOk) {
    let contacts = getContacts();
    if (type) contacts = contacts.filter((c: any) => c.contact_type === type || c.contact_type === 'Both');
    if (search) contacts = contacts.filter((c: any) => c.name.toLowerCase().includes((search as string).toLowerCase()) || (c.email || '').toLowerCase().includes((search as string).toLowerCase()));
    if (archived !== 'true') contacts = contacts.filter((c: any) => !c.is_archived);
    return res.status(200).json({ contacts, total: contacts.length, source: 'mock' });
  }

  try {
    let query = `SELECT id, name, contact_type, email, mobile, city, state, pincode, address, profile_image_url, is_archived, created_at FROM contacts WHERE 1=1`;
    const params: any[] = [];
    let n = 1;
    if (type) { query += ` AND (contact_type = $${n} OR contact_type = 'Both')`; params.push(type); n++; }
    if (search) { query += ` AND (name ILIKE $${n} OR email ILIKE $${n})`; params.push(`%${search}%`); n++; }
    if (archived !== 'true') query += ` AND is_archived = false`;
    query += ` ORDER BY name ASC`;
    const result = await pool.query(query, params);
    return res.status(200).json({ contacts: result.rows, total: result.rows.length });
  } catch {
    const contacts = getContacts();
    return res.status(200).json({ contacts, total: contacts.length, source: 'mock' });
  }
}

async function handleCreateContact(req: AuthenticatedRequest, res: NextApiResponse) {
  const { name, contact_type, email, mobile, city, state, pincode, address, profile_image_url } = req.body;
  if (!name || !contact_type) return res.status(400).json({ message: 'Name and contact type are required' });
  if (!['Customer', 'Vendor', 'Both'].includes(contact_type)) return res.status(400).json({ message: 'Invalid contact type' });

  const dbOk = await isDbAvailable();

  if (!dbOk) {
    const contacts = getContacts();
    if (email && contacts.some((c: any) => c.email === email && !c.is_archived)) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    const newContact = { id: randomUUID(), name, contact_type, email: email || null, mobile: mobile || null, city: city || null, state: state || null, pincode: pincode || null, address: address || null, profile_image_url: profile_image_url || null, is_archived: false, created_at: new Date().toISOString() };
    contacts.push(newContact);
    saveContacts(contacts);
    return res.status(201).json({ message: 'Contact created successfully', contact: newContact, source: 'mock' });
  }

  try {
    if (email) {
      const existing = await pool.query('SELECT id FROM contacts WHERE email = $1 AND is_archived = false', [email]);
      if (existing.rows.length > 0) return res.status(400).json({ message: 'Email already exists' });
    }
    const result = await pool.query(
      `INSERT INTO contacts (name, contact_type, email, mobile, city, state, pincode, address, profile_image_url, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, contact_type, email || null, mobile || null, city || null, state || null, pincode || null, address || null, profile_image_url || null, req.user?.id || null]
    );
    return res.status(201).json({ message: 'Contact created successfully', contact: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to create contact', error: error.message });
  }
}

export default authenticateToken(handler);
