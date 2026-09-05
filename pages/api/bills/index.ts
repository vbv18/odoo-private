import { NextApiRequest, NextApiResponse } from 'next';
import vendorBillsHandler from '../vendor-bills/index';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return (vendorBillsHandler as any)(req, res);
}
