import { Router } from "express";
import { ConciliationController } from "../application/ConciliationController";
import { ConciliationService } from "../domain/ConciliationService";
import { MongoDBConciliationRepository } from "../infrastructure/repositories/MongoDBConciliationRepository";
import { connectDB } from "../infrastructure/config/database";
import { authenticateToken } from "../middleware/authMiddleware";
import { MongoDBInstitutionRepository } from "../infrastructure/repositories/MongoDBInstitutionRepository";
import { registerLogErrorAuto } from "../utils/common";
import { MongoDBTransactionInstitutionRepository } from "../infrastructure/repositories/MongoDBTransactionInstitutionRepository";
import { TransactionInstitutionService } from "../domain/TransactionInstitutionService";
const conciliationRouter = Router();

/**
 * Inicializa las rutas relacionadas con el proceso de conciliación.
 * 
 * Este módulo configura las rutas protegidas por middleware de autenticación
 * y conecta los controladores con sus respectivas dependencias como servicios y repositorios.
 * 
 * Todas las rutas están protegidas mediante JWT (`authenticateToken`) y manejadas por el `ConciliationController`.
 */
(async () => {
  try {
    // Conexión a la base de datos
    const db = await connectDB();

    // Inicialización de repositorios con acceso a MongoDB
    const conciliationRepository = new MongoDBConciliationRepository(db);
    const institutionRepository = new MongoDBInstitutionRepository(db);
    // Servicio de dominio con sus repositorios
    const conciliationService = new ConciliationService(conciliationRepository, institutionRepository);


    // Repositorios y servicio de dominio de Transacción de instituciones
    const transactionInstitutionRepository = new MongoDBTransactionInstitutionRepository(db);
    const transactionInstitutionService = new TransactionInstitutionService(
          transactionInstitutionRepository,
          institutionRepository
        );
        
    // Controlador con lógica de aplicación
    const conciliationController = new ConciliationController(conciliationService, transactionInstitutionService);

    /**
     * Ejecuta el proceso de conciliación usando datos ya existentes.    
     */
    conciliationRouter.post("/excecuteConciliation", authenticateToken, async (req, res) => {
      await conciliationController.getExecuteConciliation(req, res);
    });

    /**
     * Guarda una conciliación (cabecera y detalles).     
     */
    conciliationRouter.post("/saveConciliation", authenticateToken, async (req, res) => {
      await conciliationController.save(req, res);
    });

    /**
     * Lista conciliaciones por estado.     
     */
    conciliationRouter.post("/listConciliationsByStatus", authenticateToken, async (req, res) => {
      await conciliationController.listConciliationsByStatus(req, res);
    });

    /**
     * Ejecuta y guarda todo el proceso de conciliación en un solo paso.     
     */
    conciliationRouter.post("/excecuteSaveConciliation", authenticateToken, async (req, res) => {
      await conciliationController.processConciliationCompletely(req, res);
    });

    /**
     * Obtiene el detalle de conciliaciones por fecha de corte.     
     */
    conciliationRouter.post("/getDetailConciliationByCutOffDate", authenticateToken, async (req, res) => {
      await conciliationController.getDetailConciliationByCutOffDate(req, res);
    });

    /**
     * Actualiza el detalle y recalcula la cabecera de la conciliación.
     */
    conciliationRouter.post("/updateDetailAndRecalculateHeader", authenticateToken, async (req, res) => {
      await conciliationController.updateDetailAndRecalculateHeader(req, res);
    });

    console.log("Rutas de Conciliación inicializadas correctamente");
  } catch (error) {
    console.error("Error al inicializar las rutas de Conciliación:", error);
    //registro de error en el log
    await registerLogErrorAuto('error', error, `Error inicializando las rutas de Conciliación`);    
  }
})();

export default conciliationRouter;
