import jwt from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  loginId: string;
  email: string;
  role: string;
}

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '7d',
  });
};

export const getTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
};
