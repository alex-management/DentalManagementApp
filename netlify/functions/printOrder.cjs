const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE env vars");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

exports.handler = async function(event, context) {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body || '{}');
    const { orderId } = body;
    
    if (!orderId) {
      return { statusCode: 400, body: 'orderId required' };
    }

    const { data: comanda, error: err1 } = await supabase
      .from('comenzi')
      .select(`
        id,
        id_doctor,
        id_pacient,
        total,
        doctori!inner(id, nume),
        pacienti!inner(id, nume)
      `)
      .eq('id', orderId)
      .single();

    if (err1 || !comanda) {
      return { statusCode: 404, body: 'Order not found' };
    }

    const { data: comandaProduse, error: err2 } = await supabase
      .from('comanda_produse')
      .select(`
        id,
        cantitate,
        produse!inner(id, nume)
      `)
      .eq('comanda_id', orderId);

    if (err2) {
      return { statusCode: 500, body: 'Error fetching products' };
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Fisa Laborator');

    sheet.columns = [
      { key: 'A', width: 50 }
    ];

    sheet.getCell('A1').value = 'Fisa Laborator';
    sheet.getCell('A1').font = { size: 14, bold: true };
    sheet.getCell('A1').alignment = { horizontal: 'left', vertical: 'middle' };

    const doctorName = comanda.doctori?.nume || 'N/A';
    sheet.getCell('A2').value = `Nume Doctor: ${doctorName}`;
    sheet.getCell('A2').font = { size: 12 };
    sheet.getCell('A2').alignment = { horizontal: 'left', vertical: 'middle' };

    const pacientName = comanda.pacienti?.nume || 'N/A';
    sheet.getCell('A3').value = `Nume Pacient: ${pacientName}`;
    sheet.getCell('A3').font = { size: 12 };
    sheet.getCell('A3').alignment = { horizontal: 'left', vertical: 'middle' };

    sheet.getCell('A4').value = 'Produse';
    sheet.getCell('A4').font = { size: 12, bold: true };
    sheet.getCell('A4').alignment = { horizontal: 'left', vertical: 'middle' };

    let currentRow = 5;
    for (const item of comandaProduse || []) {
      const productName = item.produse?.nume || 'Produs';
      sheet.getCell(`A${currentRow}`).value = `- ${productName}`;
      sheet.getCell(`A${currentRow}`).font = { size: 11 };
      sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
      currentRow++;
    }

    sheet.getCell(`A${currentRow}`).value = `Total: ${comanda.total}`;
    sheet.getCell(`A${currentRow}`).font = { size: 12, bold: true };
    sheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };

    const fileBuffer = await workbook.xlsx.writeBuffer();
    const base64 = fileBuffer.toString('base64');

    const fileName = `Comanda_${orderId}_${pacientName.replace(/\s+/g, '_')}.xlsx`;

    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`
      },
      body: base64
    };

  } catch (err) {
    console.error('Print order error', err);
    return { statusCode: 500, body: 'Internal Server Error: ' + (err.message || String(err)) };
  }
};
