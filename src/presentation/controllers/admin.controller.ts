import { Request, Response } from 'express';
import { AdminUseCases } from '../../application/use-cases/admin.use-cases';

export class AdminController {
  constructor(private adminUseCases: AdminUseCases) {}

  public getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const users = await this.adminUseCases.listUsers();
      res.json({ users });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  public createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await this.adminUseCases.createUser(req.body);
      res.status(201).json({ user });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  public updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      const user = await this.adminUseCases.updateUser(id, req.body);
      res.json({ user });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  public deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      const currentUserId = req.user?.sub;
      await this.adminUseCases.deleteUser(id, currentUserId);
      res.json({ success: true, message: 'Usuario eliminado exitosamente' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  public getSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const settings = await this.adminUseCases.getSettings();
      res.json({ settings });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  public updateSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const { key, value } = req.body;
      if (!key || value === undefined) {
        res.status(400).json({ error: 'Clave y valor requeridos' });
        return;
      }
      await this.adminUseCases.updateSettings(key, String(value));
      res.json({ success: true, key, value });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };
}
