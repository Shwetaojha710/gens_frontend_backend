/** Excel (xlsx) and PDF (pdfmake) export of tabular data, one sheet / section per table. */
import * as XLSX from 'xlsx';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

const pdfMakeX: any = pdfMake;
pdfMakeX.vfs = (pdfFonts as any).vfs;

/** One export column: header text + how to read the value from a row. */
export interface ExportColumn {
  header: string;
  value: (row: any) => any;
}

export interface ExportSheet {
  name: string;
  columns: ExportColumn[];
  rows: any[];
}

const safeName = (s: string) => s.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'export';

export function exportExcel(fileName: string, sheets: ExportSheet[]): void {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const data = sheet.rows.map((row) =>
      Object.fromEntries(sheet.columns.map((c) => [c.header, c.value(row) ?? ''])),
    );
    const ws = XLSX.utils.json_to_sheet(data, { header: sheet.columns.map((c) => c.header) });
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  XLSX.writeFile(wb, `${safeName(fileName)}.xlsx`);
}

export function exportPdf(fileName: string, title: string, subtitle: string, sheets: ExportSheet[]): void {
  const content: any[] = [
    { text: title, style: 'title' },
    { text: subtitle, style: 'subtitle' },
  ];
  for (const sheet of sheets) {
    content.push({ text: sheet.name, style: 'section' });
    content.push({
      table: {
        headerRows: 1,
        widths: sheet.columns.map(() => 'auto'),
        body: [
          sheet.columns.map((c) => ({ text: c.header, style: 'th' })),
          ...sheet.rows.map((row) => sheet.columns.map((c) => String(c.value(row) ?? ''))),
        ],
      },
      layout: 'lightHorizontalLines',
      fontSize: 7,
    });
  }
  const doc: any = {
    pageOrientation: 'landscape',
    pageSize: 'A4',
    pageMargins: [24, 28, 24, 28],
    content,
    styles: {
      title: { fontSize: 15, bold: true, margin: [0, 0, 0, 2] },
      subtitle: { fontSize: 9, color: '#666', margin: [0, 0, 0, 10] },
      section: { fontSize: 11, bold: true, margin: [0, 10, 0, 4] },
      th: { bold: true, fillColor: '#eef2f7' },
    },
    defaultStyle: { fontSize: 7 },
    footer: (page: number, count: number) => ({
      text: `Page ${page} of ${count}`,
      alignment: 'right',
      fontSize: 7,
      margin: [0, 0, 24, 0],
    }),
  };
  pdfMake.createPdf(doc).download(`${safeName(fileName)}.pdf`);
}
