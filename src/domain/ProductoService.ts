import { Producto } from "../infrastructure/models/Producto";
import { ProductoRepository } from "../infrastructure/repositories/ProductoRepository";

export class ProductoService {
  constructor(private productoRepository: ProductoRepository) {}

  async addProducto(producto: Producto, institutionCode: string): Promise<void> {
    return await this.productoRepository.addProducto(producto, institutionCode);
  }

  async listProductos(institutionCode: string): Promise<Producto[]> {
    return await this.productoRepository.listProductosByInstitution(institutionCode);
  }
}
