import { Router } from "express";
import { BCERecordsController } from "../application/BCERecordsController";
import { BCERecordsService } from "../domain/BCERecordsService";
import { TransactionController } from "../application/TransactionController";
import { TransactionsService } from "../domain/TransactionService";
import { PostgreSqlTransactionRepository } from "../infrastructure/repositories/PostgreSqlTransactionRepository";
import { MongoDBTransactionSwitchRepository } from "../infrastructure/repositories/MongoDBTransactionSwitchRepository";
import { connectPostgreSQL, connectDB } from "../infrastructure/config/database";
import { authenticateToken, authorizeRoles } from "../middleware/authMiddleware";
import { registerLogErrorAuto } from "../utils/common";
import { asyncMiddleware } from "../middleware/asyncMiddleware";

const transactionRouter = Router();

(async () => {
  try {
    const postgresPool = connectPostgreSQL();
    const db = await connectDB();

    // Inicialización de repositorios, servicios y controladores
    const recordsService = new BCERecordsService(db);
    const transactionRepository = new PostgreSqlTransactionRepository(postgresPool);
    const transactionStorage = new MongoDBTransactionSwitchRepository(transactionRepository, db);
    const mongoDBTransactionRepository = new MongoDBTransactionSwitchRepository(transactionRepository, db);
    const transactionService = new TransactionsService(mongoDBTransactionRepository, transactionRepository, transactionStorage,);
    const transactionController = new TransactionController(transactionService, recordsService);

    transactionRouter.post("/loadTransactions", authenticateToken, async (req, res) => {
      await transactionController.getAndStoreTransactionsByDateRange(req, res);
    });

    transactionRouter.post("/listTransactions", authenticateToken, async (req, res) => {
      await transactionController.listTransactionSwitchbyInstitution(req, res);
    });

    transactionRouter.post("/transactionsTotals", authenticateToken, async (req, res) => {
      try {
        await transactionController.getTransactionTotals(req, res);
      } catch (error) {
        res.status(500).json({ message: "Error obteniendo los totales de transacciones:", error: String(error) });
      }
    });


    transactionRouter.post("/monthlyTransaction", authenticateToken, async (req, res) => {
      await transactionController.monthlyTransactionCount(req, res);
    });

    //RUTAS PARA ADMIN(admin)
    transactionRouter.post("/getTotalsGroupedByInstitution", authenticateToken, authorizeRoles("admin"),
      asyncMiddleware(async (req, res) => {
        try {
          await transactionController.getTransactionSummaryByInstitution(req, res);
        } catch (error) {
          res.status(500).json({ message: "Error obteniendo el resumen de transacciones por institución:", error: String(error) });
        }
      })
    );
    transactionRouter.get("/getlistReports", authenticateToken, authorizeRoles("admin"), asyncMiddleware(async (req, res) => {
      try {
        await transactionController.listarReportes(req, res);
      } catch (error) {
        res.status(500).json({ message: "Error al listar reportes:", error: String(error) });
      }
    })
    );

    console.log("Rutas de transacciones inicializadas correctamente");
  } catch (error) {
    console.error("Error al inicializar las rutas de transacciones:", error);
    //registro de error en el log
    await registerLogErrorAuto('error', error, `Error inicializando las rutas de transacciones`);

  }
})();

export default transactionRouter;
