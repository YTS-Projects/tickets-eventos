/*
 * Pega este archivo completo en tu proyecto de Google Apps Script y vuelve a
 * implementar la aplicación web. La hoja "Reservas" debe tener una fila de
 * encabezados con estas columnas:
 * ticketId, eventoId, eventoTitulo, nombreCompleto, identificacion, correo,
 * cantidad, estado, fechaReserva, fechaIngreso
 */

function getSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Reservas');
  if (!sheet) throw new Error('No existe la hoja "Reservas".');
  return sheet;
}

function doPost(e) {
  try {
    const data = JSON.parse((e.postData && e.postData.contents) || '{}');
    const sheet = getSheet();

    if (data.action === 'crearReserva') return crearReserva(sheet, data);
    if (data.action === 'validarTicket') return validarTicket(sheet, data.ticketId);
    if (data.action === 'obtenerReservas') return obtenerReservas(sheet);

    return responderJSON({ success: false, message: 'Acción no reconocida.' });
  } catch (error) {
    return responderJSON({ success: false, message: error.message || String(error) });
  }
}

function crearReserva(sheet, data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);

  try {
  const reserva = {
    ticketId: String(data.ticketId || '').trim(),
    eventoId: String(data.eventoId || '').trim(),
    eventoTitulo: String(data.eventoTitulo || '').trim(),
    nombreCompleto: String(data.nombreCompleto || '').trim(),
    identificacion: String(data.identificacion || '').trim(),
    correo: String(data.correo || '').trim(),
    cantidad: Number(data.cantidad)
  };

  const requeridos = ['ticketId', 'eventoId', 'eventoTitulo', 'nombreCompleto', 'identificacion', 'correo'];
  if (requeridos.some(campo => !reserva[campo])) {
    return responderJSON({ success: false, message: 'Faltan datos obligatorios de la reserva.' });
  }

  const cantidad = reserva.cantidad;
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 5) {
    return responderJSON({ success: false, message: 'La cantidad de tickets no es válida.' });
  }

  const ids = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat().map(String)
    : [];
  if (ids.includes(reserva.ticketId)) {
    return responderJSON({ success: false, message: 'El ticket ya existe. Intenta reservar nuevamente.' });
  }

  sheet.appendRow([
    reserva.ticketId,
    reserva.eventoId,
    reserva.eventoTitulo,
    reserva.nombreCompleto,
    reserva.identificacion,
    reserva.correo,
    cantidad,
    'PENDIENTE',
    new Date().toLocaleString('es-EC'),
    ''
  ]);

  return responderJSON({ success: true, ticketId: reserva.ticketId, message: 'Reserva registrada con éxito.' });
  } finally {
    lock.releaseLock();
  }
}

function obtenerReservas(sheet) {
  if (sheet.getLastRow() < 2) return responderJSON({ success: true, reservas: [] });

  const reservas = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues().map(fila => ({
    ticketId: String(fila[0]),
    eventoId: String(fila[1]),
    eventoTitulo: String(fila[2]),
    nombreCompleto: String(fila[3]),
    identificacion: String(fila[4]),
    correo: String(fila[5]),
    cantidad: Number(fila[6]) || 1,
    estado: String(fila[7]),
    fechaReserva: String(fila[8]),
    fechaIngreso: String(fila[9] || '')
  }));

  return responderJSON({ success: true, reservas });
}

function validarTicket(sheet, ticketId) {
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);

  try {
    const buscado = String(ticketId || '').trim().toUpperCase();
    if (!buscado) return responderJSON({ status: 'NO_ENCONTRADO', message: 'Ticket inválido.' });

    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim().toUpperCase() !== buscado) continue;

      if (String(rows[i][7]).toUpperCase() === 'PENDIENTE') {
        const fechaIngreso = new Date().toLocaleString('es-EC');
        sheet.getRange(i + 1, 8).setValue('USADO');
        sheet.getRange(i + 1, 10).setValue(fechaIngreso);
        return responderJSON({
          status: 'PERMITIDO',
          nombreCompleto: rows[i][3],
          evento: rows[i][2],
          cantidad: rows[i][6]
        });
      }

      return responderJSON({
        status: 'DENEGADO',
        message: 'Este ticket ya fue utilizado previamente.',
        nombreCompleto: rows[i][3],
        fechaIngreso: rows[i][9]
      });
    }

    return responderJSON({ status: 'NO_ENCONTRADO', message: 'El ticket no existe en la base de datos.' });
  } finally {
    lock.releaseLock();
  }
}

function responderJSON(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
