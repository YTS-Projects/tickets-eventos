// Catálogo institucional inicial compartido por inicio, eventos y administración.
// Agrega las imágenes con estas siglas dentro de la carpeta img/.
const VERSION_EVENTOS_PREDETERMINADOS = '2026-09-23';
const EVENTOS_PREDETERMINADOS = [
    { id: 'ev_inicial_1', titulo: 'Ceremonia de Juramento a la Bandera', fecha: '2026-09-26', hora: '08:30 AM', lugar: 'Patio Principal de la Institución', aforo: 150, imagen: 'img/bandera.jpg' },
    { id: 'ev_inicial_2', titulo: 'Feria de Ciencias y Tecnología', fecha: '2026-10-15', hora: '10:00 AM', lugar: 'Auditorio Institucional', aforo: 80, imagen: 'img/tech.jpg' },
    { id: 'ev_dia_padre', titulo: 'Día del Padre', fecha: 'Por confirmar', hora: 'Por confirmar', lugar: 'Institución educativa', aforo: 100, imagen: 'img/dp.jpg' },
    { id: 'ev_dia_madre', titulo: 'Día de la Madre', fecha: 'Por confirmar', hora: 'Por confirmar', lugar: 'Institución educativa', aforo: 100, imagen: 'img/dm.jpg' },
    { id: 'ev_dia_nino', titulo: 'Día del Niño', fecha: 'Por confirmar', hora: 'Por confirmar', lugar: 'Institución educativa', aforo: 100, imagen: 'img/dn.jpg' },
    { id: 'ev_juntos_leemos', titulo: 'Juntos Leemos', fecha: 'Por confirmar', hora: 'Por confirmar', lugar: 'Biblioteca institucional', aforo: 100, imagen: 'img/jl.jpg' },
    { id: 'ev_inti_raymi', titulo: 'Inti Raymi', fecha: 'Por confirmar', hora: 'Por confirmar', lugar: 'Patio Principal de la Institución', aforo: 100, imagen: 'img/ir.jpg' },
    { id: 'ev_fiestas_julianas', titulo: 'Fiestas Julianas', fecha: 'Por confirmar', hora: 'Por confirmar', lugar: 'Institución educativa', aforo: 100, imagen: 'img/fj.jpg' },
    { id: 'ev_fiestas_octubrinas', titulo: 'Fiestas Octubrinas', fecha: 'Por confirmar', hora: 'Por confirmar', lugar: 'Institución educativa', aforo: 100, imagen: 'img/fo.jpg' },
    { id: 'ev_casa_abierta', titulo: 'Casa Abierta', fecha: 'Por confirmar', hora: 'Por confirmar', lugar: 'Institución educativa', aforo: 120, imagen: 'img/ca.jpg' },
    { id: 'ev_fiesta_navidena', titulo: 'Fiesta Navideña', fecha: 'Por confirmar', hora: 'Por confirmar', lugar: 'Patio Principal de la Institución', aforo: 120, imagen: 'img/fn.jpg' },
    { id: 'ev_graduacion', titulo: 'Graduación', fecha: 'Por confirmar', hora: 'Por confirmar', lugar: 'Auditorio Institucional', aforo: 150, imagen: 'img/gr.jpg' },
    { id: 'ev_finalizacion_periodo', titulo: 'Finalización del Período Académico', fecha: 'Por confirmar', hora: 'Por confirmar', lugar: 'Institución educativa', aforo: 150, imagen: 'img/fpa.jpg' }
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

    const idsExistentes = new Set(eventos.map(evento => String(evento.id)));
    const nuevos = copiarEventosPredeterminados().filter(evento => !idsExistentes.has(String(evento.id)));
    const actualizados = [...eventos, ...nuevos];
    localStorage.setItem('eventos', JSON.stringify(actualizados));
    localStorage.setItem('versionEventosPredeterminados', VERSION_EVENTOS_PREDETERMINADOS);
    return actualizados;
}
