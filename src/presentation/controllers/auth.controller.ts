import { Request, Response } from 'express';
import { AuthUseCases } from '../../application/use-cases/auth.use-cases';

export class AuthController {
  constructor(private authUseCases: AuthUseCases) {}

  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authUseCases.login(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'Error de autenticación' });
    }
  };

  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authUseCases.register(req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Error registrando usuario' });
    }
  };

  public me = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    res.json({ user: req.user });
  };
}
