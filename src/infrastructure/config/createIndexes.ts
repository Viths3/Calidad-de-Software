import { connectDB } from './database';

export async function createIndexes(): Promise<void> {
  const db = await connectDB(); // usamos connectDB que retorna Db directamente
  
  try {
    // Índice compuesto ÚNICO en conciliation
    await db.collection('conciliation').createIndex(
      { cutOffDate: 1, cutOffNumber: 1 },
      { unique: true, name: 'idx_cutOffDate_cutOffNumber' }
    );
    console.log('✅ Índice único creado en "conciliation"');

    //se quita esta colección
    // Índice compuesto NO único en conciliation_detail
    // await db.collection('conciliation_detail').createIndex(
    //   { cutOffDate: 1, cutOffNumber: 1 },
    //   { name: 'idx_cutOffDate_cutOffNumber' }
    // );
    // console.log('✅ Índice no único creado en "conciliation_detail"');
  } catch (error) {
    console.error('❌ Error al crear los índices:', error);
  }
}
