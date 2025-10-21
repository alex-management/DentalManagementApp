const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');
const archiver = require('archiver');
const { WritableStreamBuffer } = require('stream-buffers');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE env vars");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

function formatCurrency(num) {
  return Number(num).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function buildWorkbookForDoctor(doctor, rows, imageBuffer) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Fișa Laborator');

  sheet.columns = [
    { key: 'pacient', width: 30 },
    { key: 'produs', width: 40 },
    { key: 'cant', width: 10 },
    { key: 'pret', width: 15 }
  ];

  sheet.mergeCells('A1:D2');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'Fișa Laborator';
  titleCell.font = { size: 16, bold: true, color: { argb: 'FF333333' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };

  sheet.mergeCells('A3:D3');
  const docCell = sheet.getCell('A3');
  docCell.value = `Dr. ${doctor.nume}`;
  docCell.font = { bold: true, color: { argb: 'FF333333' } };
  docCell.alignment = { horizontal: 'center' };
  docCell.fill = { type: 'pattern', pattern:'solid', fgColor:{ argb:'FFF2F2F2' } };

  if (imageBuffer) {
    const imageId = workbook.addImage({
      buffer: imageBuffer,
      extension: 'png',
    });
    sheet.addImage(imageId, {
      tl: { col: 3, row: 0, colOff: 19050, rowOff: 19050 },
      br: { col: 3.95, row: 1.95 }
    });
  }

  const headerRow = sheet.getRow(5);
  headerRow.values = ['PACIENT', 'PRODUS', 'BUCĂȚI', 'PREȚ'];
  headerRow.font = { bold: true, color: { argb: 'FF274E13' } };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 20;
  const headerFill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFD9EAD3' } };
  headerRow.eachCell((cell) => {
    cell.fill = headerFill;
    cell.border = {
      top: {style:'thin', color:{argb:'FFB3B3B3'}},
      left: {style:'thin', color:{argb:'FFB3B3B3'}},
      bottom: {style:'thin', color:{argb:'FFB3B3B3'}},
      right: {style:'thin', color:{argb:'FFB3B3B3'}}
    };
  });

  let currentRow = 6;

  let alternate = false;
  for (const group of rows) {
    const bgColor = alternate ? 'FFFAFAFA' : 'FFFFFFFF';
    alternate = !alternate;

    const startRow = currentRow;
    let patientTotal = 0;
    for (const p of group.produse) {
      const r = sheet.getRow(currentRow);
      r.getCell(1).value = (currentRow === startRow) ? group.pacient : null;
      r.getCell(2).value = p.nume;
      r.getCell(3).value = p.cantitate;
      const total = Number(p.cantitate) * Number(p.pret_unitar);
      patientTotal += total;
      r.getCell(4).value = total;
      r.getCell(4).numFmt = '#,##0.00';

      for (let c = 1; c <= 4; c++) {
        const cell = r.getCell(c);
        cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: bgColor } };
        cell.border = {
          top: {style:'thin', color:{argb:'FFB3B3B3'}},
          left: {style:'thin', color:{argb:'FFB3B3B3'}},
          bottom: {style:'thin', color:{argb:'FFB3B3B3'}},
          right: {style:'thin', color:{argb:'FFB3B3B3'}}
        };
        cell.alignment = { vertical: 'middle', horizontal: c===2 ? 'left' : 'center' };
      }
      
      const dCell = r.getCell(4);
      dCell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb: 'FFE8F5E9' } };
      
      currentRow++;
    }

    if (group.produse.length > 1) {
      sheet.mergeCells(`A${startRow}:A${currentRow - 1}`);
      const mergedCell = sheet.getCell(`A${startRow}`);
      mergedCell.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    const patientTotalRow = sheet.getRow(currentRow);
    sheet.mergeCells(`A${currentRow}:C${currentRow}`);
    patientTotalRow.getCell(1).value = 'Total Client';
    patientTotalRow.getCell(1).font = { bold: true, color: { argb: 'FF333333' } };
    patientTotalRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    patientTotalRow.getCell(4).value = patientTotal;
    patientTotalRow.getCell(4).numFmt = '#,##0.00';
    patientTotalRow.getCell(4).font = { bold: true, color: { argb: 'FF0056B3' } };
    patientTotalRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    for (let c = 1; c <= 4; c++) {
      const cell = patientTotalRow.getCell(c);
      cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFEF5E7' } };
      cell.border = {
        top: {style:'thin', color:{argb:'FFB3B3B3'}},
        left: {style:'thin', color:{argb:'FFB3B3B3'}},
        bottom: {style:'thin', color:{argb:'FFB3B3B3'}},
        right: {style:'thin', color:{argb:'FFB3B3B3'}}
      };
    }
    currentRow++;
  }

  const totalRow = sheet.getRow(currentRow + 1);
  totalRow.getCell(1).value = 'TOTAL';
  totalRow.getCell(1).font = { bold: true };
  totalRow.getCell(1).alignment = { horizontal: 'right' };
  totalRow.getCell(3).value = null;
  totalRow.getCell(4).value = { formula: `SUM(D6:D${currentRow - 1})` };
  totalRow.getCell(4).numFmt = '#,##0.00';
  for (let c = 1; c <= 4; c++) {
    const cell = totalRow.getCell(c);
    cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FFFFF3CD' } };
    if (c === 4) {
      cell.font = { bold: true, color: { argb: 'FF0056B3' } };
      cell.alignment = { horizontal: 'center' };
    }
    cell.border = {
      top: {style:'thick', color:{argb:'FFB3B3B3'}},
      left: {style:'thin', color:{argb:'FFB3B3B3'}},
      right: {style:'thin', color:{argb:'FFB3B3B3'}},
      bottom: {style:'thin', color:{argb:'FFB3B3B3'}}
    };
  }

  return workbook;
}

async function getGroupedDataForDoctor(doctorId, startDate, endDate) {
  const { data: comenzi, error: err1 } = await supabase
    .from('comenzi')
    .select(`
      id,
      id_pacient,
      data_finalizare,
      status,
      pacienti!inner(id, nume)
    `)
    .eq('id_doctor', doctorId)
    .eq('status', 'Finalizată')
    .gte('data_finalizare', startDate)
    .lte('data_finalizare', endDate)
    .not('data_finalizare', 'is', null);

  if (err1) throw err1;
  if (!comenzi || comenzi.length === 0) return [];

  const comandaIds = comenzi.map(c => c.id);
  
  const { data: comandaProduse, error: err2 } = await supabase
    .from('comanda_produse')
    .select(`
      id,
      comanda_id,
      produs_id,
      cantitate,
      produse!inner(id, nume, pret)
    `)
    .in('comanda_id', comandaIds);

  if (err2) throw err2;

  const map = new Map();

  for (const c of comenzi) {
    const pacName = c.pacienti?.nume || 'Necunoscut';
    
    const produseForComanda = (comandaProduse || []).filter(cp => cp.comanda_id === c.id);
    
    for (const item of produseForComanda) {
      if (!map.has(pacName)) map.set(pacName, []);
      map.get(pacName).push({
        nume: item.produse?.nume || 'Produs',
        cantitate: item.cantitate || 1,
        pret_unitar: item.produse?.pret || 0
      });
    }
  }

  const rows = [];
  for (const [pacient, produse] of map.entries()) {
    rows.push({ pacient, produse });
  }
  return rows;
}

exports.handler = async function(event, context) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body || '{}');
    const { startDate, endDate } = body;
    if (!startDate || !endDate) {
      return { statusCode: 400, body: 'startDate and endDate required' };
    }

    let imageBuffer = null;
    const imgPath = path.join(__dirname, '..', '..', 'poza_site.png');
    if (fs.existsSync(imgPath)) {
      imageBuffer = fs.readFileSync(imgPath);
    }

    const { data: doctors } = await supabase
      .from('doctori')
      .select('id, nume');

    const zipBufferWritable = new WritableStreamBuffer();
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(zipBufferWritable);

    const finishPromise = new Promise((resolve) => {
      zipBufferWritable.on('finish', resolve);
    });

    for (const doc of doctors || []) {
      const grouped = await getGroupedDataForDoctor(doc.id, startDate, endDate);
      if (!grouped || grouped.length === 0) continue;

      const workbook = await buildWorkbookForDoctor(doc, grouped, imageBuffer);
      const fileBuffer = await workbook.xlsx.writeBuffer();
      const fileName = `Doctor_${doc.nume.replace(/\s+/g, '_')}.xlsx`;
      archive.append(fileBuffer, { name: fileName });
    }

    await archive.finalize();
    await finishPromise;

    const finalZipBuffer = zipBufferWritable.getContents();
    const zipBase64 = finalZipBuffer.toString('base64');

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="export_laborator.zip"'
      },
      body: zipBase64
    };

  } catch (err) {
    console.error('Export error', err);
    return { statusCode: 500, body: 'Internal Server Error: ' + (err.message || String(err)) };
  }
};
