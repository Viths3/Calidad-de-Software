import dayjs from "dayjs";
import {
    getLocalTimeAsUTC,
    getDateRange,
    parseToUTCDate,
    formatDateYYYYMMDD,
    parseStringDateToUTC,
    formatDateToLocalString,
    toLocalDateObject,
    getDateTruncate,
    fixDateFormat,
    parseAsUTC
} from "../common";
/**
 * PARA EJECUTAR ESTE ARCHIVO TEST EJECUTAR CON 
 * 
 * > npx ts-node src/utils/tests/testDateUtils.ts
 * > ts-node src/utils/tests/testDateUtils.ts
 */
console.clear();
console.log("\n\n\n******** TEST DE FUNCIONES DE FECHA ********\n");

console.log('🔍 Test: getLocalTimeAsUTC  con America/Guayaquil');
const nowUTC = getLocalTimeAsUTC();
console.log('Fecha y hora local como UTC:', nowUTC.toISOString());


console.log('\n📆 Test: parseStringDateTouCE');
const fechaUTC = parseStringDateToUTC("2025-03-31 12:31:25");
console.log('formatea string en formato "YYYY-MM-DD HH:mm:ss.SSS":', fechaUTC.toISOString());


console.log('\n📆 Test: formatDateToLocalString');
const fechaUTCString  = formatDateToLocalString(new Date());
console.log(' fecha en UTC:', new Date());
console.log(' Formatea una fecha UTC como string en hora local de Guayaquil:', fechaUTCString);


console.log('\n🔍📅 Test: toLocalDateObject');
const Fecha1UTC = new Date();
const fecha1UTCconvertida= toLocalDateObject(Fecha1UTC)
console.log(' Convierte una fecha UTC a un objeto Date con hora local de Guayaquil UTIL PARA VISUALIZAR:');
console.log('sin la funcion:',Fecha1UTC);
console.log('con la funcion:',dayjs(fecha1UTCconvertida).format('YYYY-MM-DD HH:mm:ss'));


console.log('\n📆 Test: getDateRange');
const { start, end } = getDateRange('2025-04-01', '2025-04-22');
console.log('Inicio del rango (local):', start.toISOString());
console.log('Fin del rango (local):', end.toISOString());


console.log('\n🧪 Test: getDateTruncate');
const originalDate = new Date('2025-04-22T15:30:45.123Z');
const { truncateDate } = getDateTruncate(new Date(originalDate)); // se pasa una copia para no mutar la original
console.log('🕓 Fecha original (UTC):', originalDate.toISOString());
console.log('⏳ Fecha truncada 00:00 UTC:', truncateDate.toISOString());


console.log('\n🧾 Test: formatDateYYYYMMDD');
const formatted = formatDateYYYYMMDD(new Date());
console.log('Fecha actual formateada YYYY-MM-DD:', formatted);


console.log('\n🧮 Test: parseToUTCDate');
const fechaString = '22-04-2025 14:30:15.123';
const resultado = parseToUTCDate(fechaString);
console.log(`📥 Entrada: "${fechaString}"`);
console.log(`📤 Resultado como Date (UTC): ${resultado.toISOString()}`);


console.log('\n🛠️ Test: fixDateFormat');
const testDates = [
  '2025-04-22',
  '2025-04-22T14',
  '2025-04-22T14:30',
  '2025-04-22T14:30:45.100'
];
testDates.forEach((input) => {
  const fixed = fixDateFormat(input);
  console.log(`📥 Entrada: ${input} ➡️ 📤 Salida: ${fixed}`);
});


console.log('\n🌐 Test: parseAsUTC   hace lo mismo que fixDateFormat pero agrega la Z al final para enviar a base como mongo ');
const fec = parseAsUTC('2025-03-27T00:00:00.000');
  console.log(`🕒 Entrada: '2025-03-27T00:00:00.000' ➡️ UTC: ${fec.toISOString()}`);

const fechas = [  
  '2025-04-22',
  '2025-04-22T14',
  '2025-04-22T14:30',
  '2025-04-22T14:30:45.100'
];
fechas.forEach((entrada) => {
  const parsed = parseAsUTC(entrada);
  console.log(`🕒 Entrada: ${entrada} ➡️ UTC: ${parsed.toISOString()}`);
});