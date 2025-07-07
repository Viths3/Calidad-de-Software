import { Router } from "express";
import { connectDB } from "../infrastructure/config/database";
import { authenticateToken } from "../middleware/authMiddleware";
import { MongoDBTransactionInstitutionRepository } from "../infrastructure/repositories/MongoDBTransactionInstitutionRepository";
import { TransactionInstitutionService } from "../domain/TransactionInstitutionService";
import { MongoDBInstitutionRepository } from "../infrastructure/repositories/MongoDBInstitutionRepository";
import { TransactionInstitutionController } from "../application/TransactionInstitutionController";
import { registerLogErrorAuto } from "../utils/common";

const transactionInstitutionRouter = Router();

/**
 * Inicializa las rutas relacionadas con las transacciones por institución.
 * 
 * Este router se encarga de exponer endpoints para obtener y guardar transacciones externas
 * asociadas a instituciones. Las rutas están protegidas por autenticación mediante JWT.
 */
(async () => {
  try {
    // Conexión a MongoDB
    const db = await connectDB();

    // Repositorios para acceso a datos
    const transactionInstitutionRepository = new MongoDBTransactionInstitutionRepository(db);
    const institutionRepository = new MongoDBInstitutionRepository(db);

    // Servicio de dominio con lógica de negocio
    const transactionInstitutionService = new TransactionInstitutionService(
      transactionInstitutionRepository,
      institutionRepository
    );

    // Controlador de aplicación
    const transactionInstitutionController = new TransactionInstitutionController(transactionInstitutionService);

    /**
     * Obtiene las transacciones externas asociadas a una institución, consumiendo un servicio externo.
     */
    transactionInstitutionRouter.post("/getExternalTransactionsInstitution", authenticateToken, async (req, res) => {
      await transactionInstitutionController.getExternalTransactionsInstitution(req, res);
    });

    /**
     * Guarda una lista de transacciones externas para una institución que se pueden cargar desde un archivo.
     */
    transactionInstitutionRouter.post("/uploadInstitutionTransactions", authenticateToken, async (req, res) => {
      await transactionInstitutionController.uploadInstitutionTransactions(req, res);
    });
  } catch (error) {
    console.error("Error al inicializar las rutas de transacciones de Instituciones:", error);
    //registro de error en el log
    await registerLogErrorAuto('error', error, `Error inicializando las rutas de transacciones de Instituciones`);
  }
})();

export default transactionInstitutionRouter;
