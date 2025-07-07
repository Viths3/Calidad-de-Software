import { Router } from "express";
import { UserController } from "../application/UserController";
import { UserService } from "../domain/UserService";
import { MongoDBUserRepository } from "../infrastructure/repositories/MongoDBUserRepository";
import { connectDB } from "../infrastructure/config/database";
import { AuthController } from "../application/AuthController";
import { AuthService } from "../domain/AuthService";
import { InstitutionController } from "../application/InstitutionController";
import { InstitutionService } from "../domain/InstitutionService";
import { MongoDBInstitutionRepository } from "../infrastructure/repositories/MongoDBInstitutionRepository";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { registerLogErrorAuto } from "../utils/common";

const userRouter = Router();

(async () => {
  try {
    const db = await connectDB();

    // Inicialización de repositorios, servicios y controladores
    const userRepository = new MongoDBUserRepository(db);
    const userService = new UserService(userRepository);
    const userController = new UserController(userService);

    const authController = new AuthController(db);

    const institutionRepository = new MongoDBInstitutionRepository(db);
    const institutionService = new InstitutionService(institutionRepository);
    const institutionController = new InstitutionController(institutionService);
    //PUBLICO
    userRouter.post("/login", asyncMiddleware((req, res) => authController.login(req, res)));
    userRouter.get("/listinstitutions", asyncMiddleware((req, res) => institutionController.listInstitutions(req, res)));

    //PRIVADO
    userRouter.post("/private/addUser", authenticateToken, authorizeRoles("admin"), asyncMiddleware((req, res) => userController.addUser(req, res)));
    userRouter.get("/private/listUser", authenticateToken, authorizeRoles("admin"), asyncMiddleware((req, res) => userController.listUsers(req, res)));
    userRouter.delete("/private/deleteUser/:id", authenticateToken, authorizeRoles("admin"), asyncMiddleware((req, res) => userController.deleteUser(req, res))
    );

  } catch (error) {
    console.error("Error inicializando las rutas:", error);
    //registro de error en el log
    await registerLogErrorAuto('error', error, `Error inicializando las rutas de Usuario`);
  }
})();
export default userRouter;
