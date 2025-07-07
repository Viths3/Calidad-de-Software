export class Producto {
  constructor(
    public id: string,
    public codigo: string,
    public nombre: string,
    public stock: number,
    public precioUnitario: number
  ) {}
}
