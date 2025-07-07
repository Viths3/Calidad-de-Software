import { Request, Response } from "express";
import { AuthService } from "../domain/AuthService";
import { Db } from "mongodb";

export class AuthController {
  private authService: AuthService;

  constructor(db: Db) {
    this.authService = new AuthService(db);
  }

  async login(req: Request, res: Response): Promise<Response> {
    const { user, password, institution_id } = req.body;

    if (!user || !password || !institution_id) {
      return res.status(400).json({ message: "Faltan datos requeridos" });
    }

    try {
      const token = await this.authService.authenticate(user, password, institution_id);

      if (!token) {
        return res.status(401).json({ message: "Credenciales inválidas" });
      }

      return res.status(200).json({ token: token, message: "Ingreso exitoso" });
    } catch (error) {
      console.error("Error en login:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  }

}