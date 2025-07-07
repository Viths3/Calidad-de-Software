import { Request, Response } from "express";
import { ProductoService } from "../domain/ProductoService";
import { Producto } from "../infrastructure/models/Producto";

export class ProductoController {
  constructor(private productoService: ProductoService) {}

  async addProducto(req: Request, res: Response): Promise<Response> {
    try {
      const { codigo, nombre, stock, precioUnitario } = req.body;
      const institutionCode = (req as any).user?.institutionCode;

      if (!codigo || !nombre || stock == null || precioUnitario == null || !institutionCode) {
        return res.status(400).json({ error: "Datos incompletos" });
      }

      const nuevo = new Producto("", codigo, nombre, Number(stock), Number(precioUnitario));
      await this.productoService.addProducto(nuevo, institutionCode);

      return res.status(201).json({ message: "Producto registrado con éxito" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Error al registrar producto" });
    }
  }

  async listProductos(req: Request, res: Response): Promise<Response> {
    try {
      const institutionCode = (req as any).user?.institutionCode;
      const productos = await this.productoService.listProductos(institutionCode);
      return res.json(productos);
    } catch (error) {
      return res.status(500).json({ error: "Error al obtener productos" });
    }
  }
}
