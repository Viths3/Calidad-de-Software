import { Router } from "express";
import { ProductoController } from "../application/ProductoController";
import { ProductoService } from "../domain/ProductoService";
import { MongoDBProductoRepository } from "../infrastructure/repositories/MongoDBProductoRepository";
import { authenticateToken } from "../middleware/authMiddleware";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { connectDB } from "../infrastructure/config/database";
import { registerLogErrorAuto } from "../utils/common";

const productoRouter = Router();

(async () => {
  try {
    const db = await connectDB();
    const productoRepository = new MongoDBProductoRepository(db);
    const productoService = new ProductoService(productoRepository);
    const productoController = new ProductoController(productoService);

    productoRouter.post(
      "/",
      authenticateToken,
      asyncMiddleware((req, res) => productoController.addProducto(req, res))
    );

    productoRouter.get(
      "/",
      authenticateToken,
      asyncMiddleware((req, res) => productoController.listProductos(req, res))
    );

  } catch (error) {
    console.error("Error al inicializar rutas de productos:", error);
    await registerLogErrorAuto('error', error, "Error inicializando rutas de productos");
  }
})();

export default productoRouter;
