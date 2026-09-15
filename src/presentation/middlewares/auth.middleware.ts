import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../../application/dto/auth.dto';
import { UserRole } from '../../domain/entities/user.entity';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function createAuthMiddlewares(jwtSecret?: string) {
  const secret = jwtSecret || process.env.JWT_SECRET || 'kiosko-jwt-secret-key-2026';

  const authenticateJwt = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No autenticado: Token Bearer requerido' });
      return;
    }

    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, secret) as unknown as JwtPayload;
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Token inválido o expirado' });
    }
  };

  const requireRole = (...allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ error: 'No autenticado' });
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({ error: 'Acceso denegado: permisos insuficientes para esta operación' });
        return;
      }

      next();
    };
  };

  return { authenticateJwt, requireRole };
}
