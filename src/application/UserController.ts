import { Request, Response } from "express";
import { UserService } from "../domain/UserService";
import { User } from "../infrastructure/models/User";
import bcrypt from "bcryptjs";

export class UserController {
  constructor(private userService: UserService) { }

  async listUsers(req: Request, res: Response): Promise<Response> {
    try {
      const users = await this.userService.getAllUsers();
      return res.json(users);
    } catch (error) {
      return res.status(500).json({ error: "Error al obtener usuarios" });
    }
  }

  async addUser(req: Request, res: Response): Promise<Response> {
    try {
      const { user, name, email, password, state, rol, institutionCode } = req.body;

      if (!user || !name || !email || !password || state === undefined || !rol || !institutionCode) {
        return res.status(400).json({ error: "Datos incompletos" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User("", user, name, email, hashedPassword, state, rol);

      await this.userService.createUser(newUser, institutionCode);

      return res.status(201).json({ message: "Usuario creado exitosamente" });
    } catch (error) {
      return res.status(500).json({ error: "Error al crear usuario" });
    }
  }
  async deleteUser(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ error: "ID de usuario requerido" });
      }

      await this.userService.deleteUserById(id);
      return res.status(200).json({ message: "Usuario eliminado correctamente" });

    } catch (error) {
      return res.status(500).json({ error: "Error al eliminar usuario" });
    }
  }


}
