import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "clave_secreta_default";

export interface DecodedToken {
  id: string;
  email: string;
  rol: "ADMIN" | "INSTITUTION" | string;
  [key: string]: any;
}

export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    if (!user || !allowedRoles.includes(user.rol)) {
      res.status(403).json({ message: "Acceso denegado: rol no autorizado" });
      return;
    }

    next();
  };
};
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Fallo de conexión: token no proporcionado" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;

    (req as any).user = decoded;

    switch (decoded.rol) {
      case "admin":
        console.log("");
        break;
      case "institution":
        console.log("Usuario con rol INSTITUTION");
        break;
      default:
        console.log("Rol no reconocido:", decoded.rol);
        break;
    }

    next();
  } catch (error) {
    res.status(403).json({ message: "Token inválido o expirado" });
  }

};