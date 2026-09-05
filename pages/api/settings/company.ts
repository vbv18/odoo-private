import { NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { AuthenticatedRequest, requirePermission } from '@/lib/auth-middleware';

const settingsFile = path.join(process.cwd(), 'data', 'company_settings.json');

function getSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
  } catch {
    return {
      companyName: 'Urban Furniture Pvt Ltd',
      gstin: '27AABCU9603R1ZM',
      email: 'accounts@urbanfurniture.com',
      phone: '+91 98765 43210',
      address: 'Plot 42, Sector 18, Udyog Vihar, Gurugram, Haryana 122015',
      currency: 'INR (₹)',
      financialYearStart: '01 April',
      taxRateDefault: '18',
    };
  }
}

function saveSettings(data: any) {
  fs.mkdirSync(path.dirname(settingsFile), { recursive: true });
  fs.writeFileSync(settingsFile, JSON.stringify(data, null, 2));
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({ settings: getSettings() });
  }

  if (req.method === 'PUT') {
    const updated = { ...getSettings(), ...req.body };
    saveSettings(updated);
    return res.status(200).json({ message: 'Settings saved successfully', settings: updated });
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default requirePermission('canManageSettings', handler);
