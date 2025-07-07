import { Router } from "express";
import { InstitutionAttributeService } from "../domain/InstitutionAttributeService";
import { InstitutionAttributeController } from "../application/InstitutionAttributeController";
import { connectDB } from "../infrastructure/config/database";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { registerLogErrorAuto } from "../utils/common";

const institutionAttributeRouter = Router();

(async () => {
  try {
    const db = await connectDB();

    const service = new InstitutionAttributeService(db);
    const controller = new InstitutionAttributeController(service);

    institutionAttributeRouter.get(
      "/listAttributes",
      authenticateToken,
      authorizeRoles("admin"),
      asyncMiddleware((req, res) => controller.list(req, res))
    );

    institutionAttributeRouter.get(
        "/getAttributeByCode/:code",
        authenticateToken,
        authorizeRoles("admin"),
        asyncMiddleware(async (req, res) => {
          await controller.getByInstitutionCode(req, res);
        })
      );
      

    institutionAttributeRouter.get(
      "/availableInstitutions",
      authenticateToken,
      authorizeRoles("admin"),
      asyncMiddleware((req, res) => controller.getAvailable(req, res))
    );

    institutionAttributeRouter.post(
      "/createAttribute",
      authenticateToken,
      authorizeRoles("admin"),
      asyncMiddleware((req, res) => controller.create(req, res))
    );

    institutionAttributeRouter.put(
      "/updateAttribute/:code",
      authenticateToken,
      authorizeRoles("admin"),
      asyncMiddleware((req, res) => controller.updateByInstitutionCode(req, res))
    );

    institutionAttributeRouter.delete(
      "/deleteAttribute/:id",
      authenticateToken,
      authorizeRoles("admin"),
      asyncMiddleware((req, res) => controller.delete(req, res))
    );

    console.log("Rutas de atributos de instituciones inicializadas correctamente");
  } catch (error) {
    console.error("Error al inicializar las rutas de atributos:", error);
    await registerLogErrorAuto('error', error, "Error al inicializar institutionAttributeRouter");
  }
})();

export default institutionAttributeRouter;
