/** Exportación sencilla. CSV con «;» y BOM para que Excel en español lo abra bien.
 *  Para Excel con colores/estilos: sustituir por ExcelJS; para PDF de nómina: @react-pdf/renderer. */
export function descargarCSV(nombre: string, filas: (string | number)[][]) {
  const esc = (v: string | number) => { const s = String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = '\uFEFF' + filas.map(f => f.map(esc).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `${nombre}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
