import { Db, ObjectId } from "mongodb";
import { ProductoRepository } from "../repositories/ProductoRepository";
import { Producto } from "../models/Producto";

export class MongoDBProductoRepository implements ProductoRepository {
  constructor(private db: Db) {}

  async addProducto(producto: Producto, institutionCode: string): Promise<void> {
    const institution = await this.db.collection("institutions").findOne({ code: institutionCode });
    if (!institution) throw new Error("Institución no encontrada");

    await this.db.collection("productos").insertOne({
      codigo: producto.codigo,
      nombre: producto.nombre,
      stock: producto.stock,
      precioUnitario: producto.precioUnitario,
      institution_id: institution._id
    });
  }

  async listProductosByInstitution(institutionCode: string): Promise<Producto[]> {
    const institution = await this.db.collection("institutions").findOne({ code: institutionCode });
    if (!institution) return [];

    const productos = await this.db.collection("productos").find({ institution_id: institution._id }).toArray();

    return productos.map(p => new Producto(
      p._id.toString(),
      p.codigo,
      p.nombre,
      p.stock,
      p.precioUnitario
    ));
  }
}
