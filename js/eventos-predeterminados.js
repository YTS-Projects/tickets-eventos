// Catálogo institucional inicial compartido por inicio, eventos y administración.
// Agrega las imágenes con estas siglas dentro de la carpeta img/.
const VERSION_EVENTOS_PREDETERMINADOS = '2026-09-23-fechas-horarios';
const EVENTOS_PREDETERMINADOS = [
    { id: 'ev_inicial_1', titulo: 'Ceremonia de Juramento a la Bandera', fecha: '2026-09-26', hora: '08:30 AM', lugar: 'Patio Principal de la Institución', aforo: 150, imagen: 'img/bandera.jpg' },
    { id: 'ev_inicial_2', titulo: 'Feria de Ciencias y Tecnología', fecha: '2026-10-15', hora: '10:00 AM', lugar: 'Auditorio Institucional', aforo: 80, imagen: 'img/tech.jpg' },
    { id: 'ev_dia_padre', titulo: 'Día del Padre', fecha: '2026-06-21', hora: '10:00 AM', lugar: 'Institución educativa', aforo: 100, imagen: 'img/dp.jpg' },
    { id: 'ev_dia_madre', titulo: 'Día de la Madre', fecha: '2026-05-10', hora: '10:00 AM', lugar: 'Institución educativa', aforo: 100, imagen: 'img/dm.jpg' },
    { id: 'ev_dia_nino', titulo: 'Día del Niño', fecha: '2026-06-01', hora: '09:00 AM', lugar: 'Institución educativa', aforo: 100, imagen: 'img/dn.jpg' },
    { id: 'ev_juntos_leemos', titulo: 'Juntos Leemos', fecha: '2026-07-12', hora: '08:00 AM', lugar: 'Biblioteca institucional', aforo: 100, imagen: 'img/jl.jpg' },
    { id: 'ev_inti_raymi', titulo: 'Inti Raymi', fecha: '2026-06-21', hora: '09:30 AM', lugar: 'Patio Principal de la Institución', aforo: 100, imagen: 'img/ir.jpg' },
    { id: 'ev_fiestas_julianas', titulo: 'Fiestas Julianas', fecha: '2026-07-25', hora: '10:30 AM', lugar: 'Institución educativa', aforo: 100, imagen: 'img/fj.jpg' },
    { id: 'ev_fiestas_octubrinas', titulo: 'Fiestas Octubrinas', fecha: '2026-10-09', hora: '08:30 AM', lugar: 'Institución educativa', aforo: 100, imagen: 'img/fo.jpg' },
    { id: 'ev_casa_abierta', titulo: 'Casa Abierta', fecha: '2026-11-15', hora: '08:00 AM', lugar: 'Institución educativa', aforo: 120, imagen: 'img/ca.jpg' },
    { id: 'ev_fiesta_navidena', titulo: 'Fiesta Navideña', fecha: '2026-11-22', hora: '11:00 AM', lugar: 'Patio Principal de la Institución', aforo: 120, imagen: 'img/fn.jpg' },
    { id: 'ev_graduacion', titulo: 'Graduación', fecha: '2027-02-27', hora: '11:30 AM', lugar: 'Auditorio Institucional', aforo: 150, imagen: 'img/gr.jpg' },
    { id: 'ev_finalizacion_periodo', titulo: 'Finalización del Período Académico', fecha: '2027-01-20', hora: '12:00 PM', lugar: 'Institución educativa', aforo: 150, imagen: 'img/fpa.jpg' }
];

function copiarEventosPredeterminados() {
    return EVENTOS_PREDETERMINADOS.map(evento => ({ ...evento }));
}

/** Añade una vez los nuevos eventos sin sobrescribir los existentes. */
function actualizarEventosPredeterminados(eventosGuardados) {
    const eventos = Array.isArray(eventosGuardados) ? eventosGuardados : [];
    if (localStorage.getItem('versionEventosPredeterminados') === VERSION_EVENTOS_PREDETERMINADOS) {
        return eventos;
    }

    const predeterminadosPorId = new Map(EVENTOS_PREDETERMINADOS.map(evento => [String(evento.id), evento]));
    const eventosConFechasActualizadas = eventos.map(evento => {
        const predeterminado = predeterminadosPorId.get(String(evento.id));
        // Solo sustituye el marcador original; respeta fechas editadas manualmente.
        if (!predeterminado) return evento;
        return {
            ...evento,
            fecha: evento.fecha === 'Por confirmar' ? predeterminado.fecha : evento.fecha,
            hora: evento.hora === 'Por confirmar' ? predeterminado.hora : evento.hora
        };
    });
    const idsExistentes = new Set(eventosConFechasActualizadas.map(evento => String(evento.id)));
    const nuevos = copiarEventosPredeterminados().filter(evento => !idsExistentes.has(String(evento.id)));
    const actualizados = [...eventosConFechasActualizadas, ...nuevos];
    localStorage.setItem('eventos', JSON.stringify(actualizados));
    localStorage.setItem('versionEventosPredeterminados', VERSION_EVENTOS_PREDETERMINADOS);
    return actualizados;
}
