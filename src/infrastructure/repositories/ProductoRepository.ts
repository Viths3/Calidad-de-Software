import { Producto } from "../models/Producto";

export interface ProductoRepository {
  addProducto(producto: Producto, institutionCode: string): Promise<void>;
  listProductosByInstitution(institutionCode: string): Promise<Producto[]>;
}
