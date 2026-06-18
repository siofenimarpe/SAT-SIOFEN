/**
 * js/app.js — Estaciones costeras + ventanas arrastrables + altura dinámica
 * Actualizado: Lógica dinámica de Boletines (BDO diario y BS-TLP semanal)
 */

import { cargarPaleta, cargarPaletaCientifica, cargarDatosExcel } from './funciones/datos.js';
import { dibujarGrafico, resetearZoom, exportarGrafico } from './funciones/grafico.js';

// ─── 1. MAPA ────────────────────────────────────────────────────
const map = L.map('map').setView([-10.0, -77.0], 5);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri'
}).addTo(map);

// ─── 2. ESTACIONES ──────────────────────────────────────────────
const estaciones = [
    { nombre: 'TUMBES',    lat: -3.50,     lon: -80.46,    colIndexTSM: 3,  colIndexSSM: 3  },
    { nombre: 'PAITA',     lat: -5.08,     lon: -81.11,    colIndexTSM: 4,  colIndexSSM: 4  },
    { nombre: 'SAN JOSÉ',  lat: -6.76,     lon: -79.96,    colIndexTSM: 5,  colIndexSSM: 5  },
    { nombre: 'CHICAMA',   lat: -7.70,     lon: -79.43,    colIndexTSM: 6,  colIndexSSM: 6  },
    { nombre: 'HUANCHACO', lat: -8.08,     lon: -79.12,    colIndexTSM: 7,  colIndexSSM: 7  },
    { nombre: 'CHIMBOTE',  lat: -9.08,     lon: -78.60,    colIndexTSM: 8,  colIndexSSM: 8  },
    { nombre: 'HUACHO',    lat: -11.12,    lon: -77.61,    colIndexTSM: 9,  colIndexSSM: 9  },
    { nombre: 'CALLAO',    lat: -12.06458, lon: -77.15577, colIndexTSM: 10, colIndexSSM: 10 },
    { nombre: 'PISCO',     lat: -13.71,    lon: -76.22,    colIndexTSM: 11, colIndexSSM: 11 },
    { nombre: 'ILO',       lat: -17.65,    lon: -71.35,    colIndexTSM: 12, colIndexSSM: 12 }
];

// ─── METADATOS FIJOS ────────────────────────────────────────────
const META_FIJA = {
    institucion:  'IMARPE',
    variables:    'Temperatura Superficial del Mar (TSM, °C)<br>Salinidad Superficial del Mar (SSM)',
    derivadas:    'Anomalía de la TSM (°C)<br>Anomalía de la SSM',
    climatologia: '1991-2020 (Manuscript in press)',
    frecuencia:   'Diario',
    contacto:     'siofen@imarpe.gob.pe',
    urls: [
        { texto: 'siofen.imarpe.gob.pe/nivel3/temperatura-superficial-del-mar',
          href:  'https://siofen.imarpe.gob.pe/nivel3/temperatura-superficial-del-mar' },
        { texto: 'siofen.imarpe.gob.pe/nivel3/temperatura-salinidad-superficial-del-mar',
          href:  'https://siofen.imarpe.gob.pe/nivel3/temperatura-salinidad-superficial-del-mar' }
    ]
};

// ─── Convertir decimal a DMS ────────────────────────────────────
function decimalADMS(decimal, esLat) {
    const abs  = Math.abs(decimal);
    const deg  = Math.floor(abs);
    const minF = (abs - deg) * 60;
    const min  = Math.floor(minF);
    const sec  = ((minF - min) * 60).toFixed(1);
    const dir  = esLat ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'O');
    return `${deg}°${min}'${sec}" ${dir}`;
}

// ─── Helper: formatear anomalía con color y símbolo + ───────────
function formatAnomalia(elId, valor) {
    const el = typeof elId === 'string' ? document.getElementById(elId) : elId;
    if (!el) return;
    if (valor === null || valor === undefined || isNaN(valor)) {
        el.textContent = '—'; el.style.color = ''; el.style.fontWeight = ''; return;
    }
    const pos = valor >= 0;
    el.textContent   = (pos ? '+' : '') + parseFloat(valor).toFixed(2);
    el.style.color   = pos ? '#c0392b' : '#0000FFBF';
    el.style.fontWeight = '800';
}

// ─── 3. ESTADO GLOBAL ───────────────────────────────────────────
const modalGraficos = document.getElementById('modalGraficos');
const modalMetadata = document.getElementById('modalMetadata');
const modalDatos    = document.getElementById('modalDatos');
const OPACIDAD_FONDO = 0.6;

let globalDataExcel  = null;
let estacionActual   = '';
let currentTab       = 'TODOS';
let paletaRGBChartjs = [];

// ─── 4. DRAG ────────────────────────────────────────────────────
function hacerArrastrable(modalEl, contentEl) {
    const header = contentEl.querySelector('.modal-header, .datos-header');
    if (!header) return;
    let isDragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;
    header.addEventListener('mousedown', e => {
        if (e.target.classList.contains('close-btn')) return;
        isDragging = true;
        const rect = contentEl.getBoundingClientRect();
        startX = e.clientX; startY = e.clientY;
        origLeft = rect.left; origTop = rect.top;
        contentEl.style.transition = 'none';
        e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const newLeft = Math.max(0, Math.min(window.innerWidth  - contentEl.offsetWidth,  origLeft + e.clientX - startX));
        const newTop  = Math.max(0, Math.min(window.innerHeight - contentEl.offsetHeight, origTop  + e.clientY - startY));
        contentEl.style.left = newLeft + 'px'; contentEl.style.top = newTop + 'px';
        contentEl.style.right = 'auto'; contentEl.style.bottom = 'auto';
    });
    document.addEventListener('mouseup', () => { isDragging = false; });
}

// ─── 5. INICIALIZACIÓN ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    paletaRGBChartjs = await cargarPaleta(OPACIDAD_FONDO);

    hacerArrastrable(modalGraficos, modalGraficos.querySelector('.modal-graficos-content'));
    hacerArrastrable(modalMetadata, modalMetadata.querySelector('.modal-metadata-content'));
    hacerArrastrable(modalDatos,    document.getElementById('modalDatosContent'));

    const btnVM = document.getElementById('btnVerMas');
    if (btnVM) btnVM.addEventListener('click', toggleVerMas);

    estaciones.forEach(est => {
        L.circleMarker([est.lat, est.lon], {
            radius: 7, fillColor: '#e74c3c',
            color: '#fff', weight: 2, fillOpacity: 0.92
        })
        .addTo(map)
        .bindTooltip(est.nombre, { direction: 'top', offset: [0, -6] })
        .on('click', () => abrirEstacion(est));
    });
});

// ─── 6. ABRIR ESTACIÓN ──────────────────────────────────────────
async function abrirEstacion(estacion) {
    estacionActual = estacion.nombre;
    currentTab     = 'TODOS';

    const gc = modalGraficos.querySelector('.modal-graficos-content');
    const mc = modalMetadata.querySelector('.modal-metadata-content');
    gc.style.left = '1.5vw'; gc.style.top = '2vh';
    gc.style.right = 'auto'; gc.style.bottom = 'auto';
    mc.style.right = '1.5vw'; mc.style.top = '2vh';
    mc.style.left = 'auto'; mc.style.bottom = 'auto';

    modalGraficos.classList.add('activo');
    modalMetadata.classList.add('activo');

    const dmsLat = decimalADMS(estacion.lat, true);
    const dmsLon = decimalADMS(estacion.lon, false);
    const el = id => document.getElementById(id);
    const nombreBonito = estacion.nombre.charAt(0) + estacion.nombre.slice(1).toLowerCase();

    if (el('meta-est-nombre'))    el('meta-est-nombre').innerHTML    = `Estación costera de ${nombreBonito}</span>`;
    if (el('meta-est-ubicacion')) el('meta-est-ubicacion').innerHTML = `${dmsLat} &nbsp; ${dmsLon}</span>`;
    if (el('meta-est-inst'))      el('meta-est-inst').textContent    = META_FIJA.institucion;
    if (el('meta-est-vars'))      el('meta-est-vars').innerHTML      = META_FIJA.variables;
    if (el('meta-est-deriv'))     el('meta-est-deriv').innerHTML     = META_FIJA.derivadas;
    if (el('meta-est-clima'))     el('meta-est-clima').textContent   = META_FIJA.climatologia;
    if (el('meta-est-freq'))      el('meta-est-freq').textContent    = META_FIJA.frecuencia;
    if (el('meta-est-cont'))      el('meta-est-cont').textContent    = META_FIJA.contacto;
    if (el('meta-est-urls')) {
        el('meta-est-urls').innerHTML = META_FIJA.urls
            .map(u => `<a href="${u.href}" target="_blank" style="color:#1e5799;display:block;font-size:11px;word-break:break-all;">${u.texto}</a>`)
            .join('');
    }
    const extra = el('metaExtra');
    const btnVM = el('btnVerMas');
    if (extra) extra.style.display = 'none';
    if (btnVM) btnVM.textContent   = 'VER MÁS ▼';
    if (el('meta-nombre')) el('meta-nombre').textContent = estacion.nombre;
    if (el('meta-lat'))    el('meta-lat').textContent    = estacion.lat + '°';
    if (el('meta-lon'))    el('meta-lon').textContent    = estacion.lon + '°';

    sincTabs('TODOS');
    ajustarAltura('TODOS');
    el('gifCargando').style.display = 'flex';
    el('graficosScroll').innerHTML  = '';

    try {
        globalDataExcel = await cargarDatosExcel(estacion.colIndexTSM, estacion.colIndexSSM);
        el('gifCargando').style.display = 'none';
        dibujarGrafico(globalDataExcel, estacionActual, 'TODOS', paletaRGBChartjs);
        construirFechasDisponibles(globalDataExcel);
        calFechaSelec = '';
        dcSelec = '';
        if (calFechaMax) {
            const [y, m] = calFechaMax.split('-');
            dcAño = parseInt(y); dcMes = parseInt(m) - 1;
        }
        abrirPanelDatos();
    } catch(e) {
        el('gifCargando').style.display = 'none';
        el('graficosScroll').innerHTML =
            `<div style="padding:50px 20px;text-align:center;color:#c0392b;">
                <strong>⚠ Error cargando datos</strong><br>
                <small style="color:#64748b;">${e.message}</small>
             </div>`;
        console.error(e);
    }
}

// ─── 7. ALTURA DINÁMICA ─────────────────────────────────────────
function ajustarAltura(tab) {
    const gc = modalGraficos.querySelector('.modal-graficos-content');
    if (tab === 'TODOS') {
        gc.style.height = '95vh'; gc.style.maxHeight = '95vh'; gc.style.top = '2vh';
    } else {
        gc.style.height = '68vh'; gc.style.maxHeight = '68vh'; gc.style.top = '2vh';
    }
}

// ─── 8. PESTAÑAS ────────────────────────────────────────────────
function sincTabs(tab) {
    ['TODOS','TSM','ATSM','SSM','ASSM'].forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if (btn) btn.classList.toggle('active', t === tab);
    });
}

window.cambiarPestana = function(t) {
    currentTab = t; sincTabs(t); ajustarAltura(t);
    if (globalDataExcel) dibujarGrafico(globalDataExcel, estacionActual, t, paletaRGBChartjs);
};

// ─── 9. CERRAR ──────────────────────────────────────────────────
window.cerrarModales = function() {
    modalGraficos.classList.remove('activo');
    modalMetadata.classList.remove('activo');
    modalDatos.classList.remove('activo');
    globalDataExcel = null;
};

// ─── 10. EXPORTAR ───────────────────────────────────────────────
window.exportar = function(evento, formato) {
    evento.preventDefault();
    exportarGrafico(formato, estacionActual, currentTab);
};

// ─── 11. VER MÁS / VER MENOS ────────────────────────────────────
function toggleVerMas() {
    const extra = document.getElementById('metaExtra');
    const btn   = document.getElementById('btnVerMas');
    if (!extra) return;
    const abierto = extra.style.display === 'block';
    extra.style.display = abierto ? 'none' : 'block';
    btn.textContent     = abierto ? 'VER MÁS ▼' : 'VER MENOS ▲';
    setTimeout(() => posicionarModalDatos(), 50);
}

// ═══════════════════════════════════════════════════════════════
// CALENDARIO Y FECHAS
// ═══════════════════════════════════════════════════════════════

let fechasConDatos = new Set();
let calAño = new Date().getFullYear();
let calMes = new Date().getMonth();
let calFechaMin = '';
let calFechaMax = '';
let calFechaSelec = '';

const MESES_LARGOS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function construirFechasDisponibles(data) {
    fechasConDatos.clear();
    ['TSM','ATSM','SSM','ASSM'].forEach(tab => {
        if (!data[tab]) return;
        data[tab].fechas.forEach((f, i) => {
            if (!f || isNaN(data[tab].valores[i])) return;
            let fechaNorm = f;
            if (typeof f === 'string' && f.includes('/')) {
                const p = f.split('/');
                if (p.length === 3) fechaNorm = `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
            } else if (typeof f === 'number') {
                const date = new Date(Math.round((f - 25569) * 86400 * 1000));
                fechaNorm = `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
            }
            if (/^\d{4}-\d{2}-\d{2}$/.test(fechaNorm)) fechasConDatos.add(fechaNorm);
        });
    });
    const sorted = [...fechasConDatos].sort();
    calFechaMin = sorted[0] || '';
    calFechaMax = sorted[sorted.length - 1] || '';
}

function pad(n) { return String(n).padStart(2,'0'); }

function formatearFechaCorta(fechaStr) {
    const [y, m, d] = fechaStr.split('-');
    return `${parseInt(d)} ${MESES_CORTOS[parseInt(m)-1]} ${y}`;
}

function buscarValorEnFecha(fechas, valores, fechaBuscada) {
    if (!fechas || !fechas.length) return null;
    const idx = fechas.indexOf(fechaBuscada);
    if (idx >= 0 && !isNaN(valores[idx])) return { valor: valores[idx], fecha: fechaBuscada, esCercano: false };
    const ts = new Date(fechaBuscada).getTime();
    let mejorIdx = -1, mejorDiff = Infinity;
    for (let i = 0; i < fechas.length; i++) {
        if (isNaN(valores[i])) continue;
        const diff = Math.abs(new Date(fechas[i]).getTime() - ts);
        if (diff < mejorDiff) { mejorDiff = diff; mejorIdx = i; }
    }
    if (mejorIdx < 0) return null;
    return { valor: valores[mejorIdx], fecha: fechas[mejorIdx], esCercano: true };
}

// ═══════════════════════════════════════════════════════════════
// PANEL DATOS DE ESTACIÓN (tercera ventana y Boletines)
// ═══════════════════════════════════════════════════════════════

let dcAño   = new Date().getFullYear();
let dcMes   = new Date().getMonth();
let dcSelec = '';

function posicionarModalDatos() {
    const mc = document.querySelector('.modal-metadata-content');
    const dc = document.getElementById('modalDatosContent');
    if (!mc || !dc) return;
    const rect = mc.getBoundingClientRect();
    dc.style.top   = (rect.bottom + 10) + 'px';
    dc.style.right = (window.innerWidth - rect.right) + 'px';
    dc.style.left  = 'auto';
}

function urlBoletin(fecha) {
    const y = fecha.getUTCFullYear();
    const m = String(fecha.getUTCMonth() + 1).padStart(2, '0');
    const d = String(fecha.getUTCDate()).padStart(2, '0');
    return `https://siofen-admin.imarpe.gob.pe/img/productoArchivo/BDO/${y}/BOL_IMARPE_BDO_${y}-${m}-${d}.pdf`;
}

function urlBoletinSemanal(fecha) {
    const y = fecha.getUTCFullYear();
    const target = new Date(Date.UTC(y, fecha.getUTCMonth(), fecha.getUTCDate()));
    const dayNr = (target.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNr + 3);
    const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
    const weekNo = 1 + Math.round(((target - firstThursday) / 86400000) / 7);
    return `https://siofen-admin.imarpe.gob.pe/img/productoArchivo/BS-TLP/${y}/BOL_IMARPE_BS_TLP_${y}_N%C2%B0${weekNo}.pdf`;
}

function actualizarLinkBoletin(fechaSeleccionada) {
    const enlaceBDO   = document.getElementById('linkBDO');
    const enlaceBSTLP = document.getElementById('linkBSTLP');
    if (!enlaceBDO) return;

    const FECHA_MIN_BOLETIN = new Date('2016-01-01T00:00:00Z');
    const antesDeMin = fechaSeleccionada < FECHA_MIN_BOLETIN;

    // ── BDO ──────────────────────────────────────────────────────
    if (antesDeMin) {
        // Antes de 2016: desactivar BDO
        enlaceBDO.style.opacity = '0.4';
        enlaceBDO.style.filter = 'grayscale(100%)';
        enlaceBDO.style.pointerEvents = 'none';
    } else {
        enlaceBDO.style.opacity = '1';
        enlaceBDO.style.filter = 'none';
        enlaceBDO.style.pointerEvents = 'auto';

        function probarUrl(url, onExiste, onFalla) {
            const xhr = new XMLHttpRequest();
            xhr.open('HEAD', url, true);
            xhr.onload = () => { if (xhr.status === 200 || xhr.status === 206) onExiste(); else onFalla(); };
            xhr.onerror = onFalla; xhr.ontimeout = onFalla; xhr.timeout = 3000;
            try { xhr.send(); } catch { onFalla(); }
        }

        function buscar(fechaBusqueda, intentos) {
            if (intentos <= 0) { enlaceBDO.href = urlBoletin(fechaSeleccionada); return; }
            const url = urlBoletin(fechaBusqueda);
            probarUrl(url,
                () => { enlaceBDO.href = url; },
                () => {
                    const anterior = new Date(fechaBusqueda);
                    anterior.setUTCDate(fechaBusqueda.getUTCDate() - 1);
                    buscar(anterior, intentos - 1);
                }
            );
        }
        buscar(new Date(fechaSeleccionada), 7);
    }

    // ── BS-TLP ───────────────────────────────────────────────────
    if (enlaceBSTLP) {
        const esJueves = fechaSeleccionada.getUTCDay() === 4;
        if (!antesDeMin && esJueves) {
            enlaceBSTLP.href = urlBoletinSemanal(fechaSeleccionada);
            enlaceBSTLP.style.opacity = '1';
            enlaceBSTLP.style.filter = 'none';
            enlaceBSTLP.style.pointerEvents = 'auto';
            enlaceBSTLP.style.boxShadow = '0 0 12px rgba(41,128,185,0.4)';
            enlaceBSTLP.style.backgroundColor = '#e1f0fa';
            enlaceBSTLP.style.border = '1px solid #9cece3';
        } else {
            enlaceBSTLP.style.opacity = '0.4';
            enlaceBSTLP.style.filter = 'grayscale(100%)';
            enlaceBSTLP.style.pointerEvents = 'none';
            enlaceBSTLP.style.boxShadow = 'none';
            enlaceBSTLP.style.backgroundColor = 'transparent';
            enlaceBSTLP.style.border = '1px solid transparent';
        }
        enlaceBSTLP.style.transition = 'all 0.3s ease';
    }
}

function abrirPanelDatos() {
    modalDatos.classList.add('activo');
    posicionarModalDatos();
    dcMostrarUltimo();
    dcRenderCal();
}

// ─── Mostrar último dato — con colores para anomalías ──────────
function dcMostrarUltimo() {
    if (!globalDataExcel) return;
    const ultimo = (datos) => {
        if (!datos) return null;
        for (let i = datos.valores.length - 1; i >= 0; i--) {
            if (!isNaN(datos.valores[i])) return { valor: datos.valores[i], fecha: datos.fechas[i] };
        }
        return null;
    };
    const tsmR  = ultimo(globalDataExcel.TSM);
    const atsmR = ultimo(globalDataExcel.ATSM);
    const ssmR  = ultimo(globalDataExcel.SSM);
    const assmR = ultimo(globalDataExcel.ASSM);
    const el = id => document.getElementById(id);

    // TSM y SSM: negro, sin símbolo
    if (el('dc-tsm-val')) { el('dc-tsm-val').textContent = tsmR ? tsmR.valor.toFixed(2) : '—'; el('dc-tsm-val').style.color = ''; }
    if (el('dc-ssm-val')) { el('dc-ssm-val').textContent = ssmR ? ssmR.valor.toFixed(2) : '—'; el('dc-ssm-val').style.color = ''; }
    // ATSM y ASSM: rojo/azul con símbolo +
    formatAnomalia('dc-atsm-val', atsmR?.valor);
    formatAnomalia('dc-assm-val', assmR?.valor);

    const fechas = [tsmR, atsmR, ssmR, assmR].filter(Boolean).map(r => r.fecha).sort().reverse();
    if (fechas.length && el('datos-subtitulo'))
        el('datos-subtitulo').textContent = `Último dato — ${formatearFechaCorta(fechas[0])}`;

    dcActualizarLista(tsmR, atsmR, ssmR, assmR, fechas[0] || '');

    const fechaInicialStr = fechas[0] ? fechas[0] : new Date().toISOString().slice(0,10);
    actualizarLinkBoletin(new Date(fechaInicialStr + 'T12:00:00Z'));
}

// ─── Lista lateral — colores para anomalías ────────────────────
function dcActualizarLista(tsmR, atsmR, ssmR, assmR, fechaStr) {
    const el = id => document.getElementById(id);
    if (el('dc-lista-fecha')) el('dc-lista-fecha').textContent = fechaStr ? formatearFechaCorta(fechaStr) : '—';

    // Normal (TSM, SSM): negro
    const actNormal = (idNum, idDot, res) => {
        const elN = el(idNum), elD = el(idDot);
        if (!res || isNaN(res.valor)) {
            if (elN) { elN.textContent = '—'; elN.style.color = ''; elN.style.fontWeight = ''; }
            if (elD) elD.className = 'datos-lista-dot dot-gris';
        } else {
            if (elN) { elN.textContent = res.valor.toFixed(2); elN.style.color = '#000'; elN.style.fontWeight = ''; }
            if (elD) elD.className = 'datos-lista-dot dot-verde';
        }
    };

    // Anomalía (ATSM, ASSM): rojo/azul con símbolo +
    const actAnomalia = (idNum, idDot, res) => {
        const elN = el(idNum), elD = el(idDot);
        if (!res || isNaN(res.valor)) {
            if (elN) { elN.textContent = '—'; elN.style.color = ''; elN.style.fontWeight = ''; }
            if (elD) elD.className = 'datos-lista-dot dot-gris';
        } else {
            const pos = res.valor >= 0;
            if (elN) {
                elN.textContent = (pos ? '+' : '') + res.valor.toFixed(2);
                elN.style.color = pos ? '#c0392b' : '#0000FFBF';
                elN.style.fontWeight = '800';
            }
            if (elD) elD.className = 'datos-lista-dot dot-verde';
        }
    };

    actNormal  ('dc-lista-tsm',  'dc-dot-tsm',  tsmR);
    actAnomalia('dc-lista-atsm', 'dc-dot-atsm', atsmR);
    actNormal  ('dc-lista-ssm',  'dc-dot-ssm',  ssmR);
    actAnomalia('dc-lista-assm', 'dc-dot-assm', assmR);
}

// ─── EVENTO CLIC EN EL CALENDARIO ──────────────────────────────
window.dcSeleccionarDia = function(fechaStr) {
    dcSelec = fechaStr;
    dcRenderCal();

    const tsmR  = buscarValorEnFecha(globalDataExcel?.TSM?.fechas,  globalDataExcel?.TSM?.valores,  fechaStr);
    const atsmR = buscarValorEnFecha(globalDataExcel?.ATSM?.fechas, globalDataExcel?.ATSM?.valores, fechaStr);
    const ssmR  = buscarValorEnFecha(globalDataExcel?.SSM?.fechas,  globalDataExcel?.SSM?.valores,  fechaStr);
    const assmR = buscarValorEnFecha(globalDataExcel?.ASSM?.fechas, globalDataExcel?.ASSM?.valores, fechaStr);
    const el = id => document.getElementById(id);

    // Las tarjetas superiores NO se actualizan — siempre muestran el último dato
    if (el('datos-subtitulo')) el('datos-subtitulo').textContent = `Datos al ${formatearFechaCorta(fechaStr)}`;

    dcActualizarLista(tsmR, atsmR, ssmR, assmR, fechaStr);
    actualizarLinkBoletin(new Date(fechaStr + 'T12:00:00Z'));
};

window.dcIrAMes = function() {
    const selMes  = document.getElementById('dcSelMes');
    const selAnio = document.getElementById('dcSelAnio');
    if (!selMes || !selAnio) return;
    dcMes = parseInt(selMes.value);
    dcAño = parseInt(selAnio.value);
    dcRenderCal();
};

function dcRenderCal() {
    const titulo = document.getElementById('dcCalTitulo');
    const grid   = document.getElementById('dcCalGrid');
    if (!titulo || !grid) return;
    titulo.innerHTML = `
        <select id="dcSelMes" onchange="dcIrAMes()" style="background:transparent;border:none;font-size:13px;font-weight:700;color:#1e3a5f;cursor:pointer;outline:none;">
            ${MESES_LARGOS.map((m,i) => `<option value="${i}" ${i===dcMes?'selected':''}>${m}</option>`).join('')}
        </select>
        <select id="dcSelAnio" onchange="dcIrAMes()" style="background:transparent;border:none;font-size:13px;font-weight:700;color:#1e3a5f;cursor:pointer;outline:none;">
            ${Array.from({length:80},(_,i)=> 1976+i).map(y => `<option value="${y}" ${y===dcAño?'selected':''}>${y}</option>`).join('')}
        </select>`;
    const primerDia = new Date(dcAño, dcMes, 1).getDay();
    const offset    = (primerDia + 6) % 7;
    const diasMes   = new Date(dcAño, dcMes + 1, 0).getDate();
    const hoy       = new Date().toISOString().slice(0,10);
    const dows = ['Lu','Ma','Mi','Ju','Vi','Sá','Do'];

    let html = dows.map((d, i) => {
        const estiloJu = (i === 3) ? 'style="color:#0000FFBF;font-weight:bold;"' : '';
        return `<div class="datos-cal-dow" ${estiloJu}>${d}</div>`;
    }).join('');

    for (let i = 0; i < offset; i++) html += '<div class="datos-cal-dia datos-cal-vacio"></div>';

    for (let d = 1; d <= diasMes; d++) {
        const fechaStr  = `${dcAño}-${pad(dcMes+1)}-${pad(d)}`;
        const conDato   = fechasConDatos.has(fechaStr);
        const fuera     = (calFechaMin && fechaStr < calFechaMin) || (calFechaMax && fechaStr > calFechaMax);
        const selec     = fechaStr === dcSelec;
        const esHoy     = fechaStr === hoy;
        const esJueves  = new Date(dcAño, dcMes, d).getDay() === 4;

        let cls = 'datos-cal-dia';
        if (fuera)        cls += ' datos-cal-fuera';
        else if (selec)   cls += ' datos-cal-selec';
        else if (conDato) cls += ' datos-cal-con-dato';
        if (esHoy && !selec)           cls += ' datos-cal-hoy';
        if (esJueves && !fuera && !selec) cls += ' datos-cal-jueves';

        const click = fuera ? '' : `onclick="dcSeleccionarDia('${fechaStr}')"`;
        html += `<div class="${cls}" ${click}>${d}</div>`;
    }
    grid.innerHTML = html;
}

window.dcCalNav = function(dir) {
    dcMes += dir;
    if (dcMes > 11) { dcMes = 0; dcAño++; }
    if (dcMes < 0)  { dcMes = 11; dcAño--; }
    dcRenderCal();
};

// ─── Funciones legacy (compatibilidad) ──────────────────────────
function renderCalendario() {}
window.calNavMes = function() {};
window.seleccionarDia = function() {};
window.consultarUltimo = function() {};
window.abrirCalendario = function() {};
window.formatearInputManual = function() {};
window.irAFechaManual = function() {};
function mostrarValoresMeta() {}
function consultarFechaInterna() {}