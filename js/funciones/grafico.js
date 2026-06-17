/**
 * js/funciones/grafico.js
 * Configuración con 4 variables, histogramas y eje X adaptativo seguro
 */

const mainCharts = {};
const rangeState = {};

// Este es tu VAR_CONFIG base (solo asegúrate de que esté arriba)
const VAR_CONFIG = {
    TSM:  { titulo: 'TEMPERATURA SUPERFICIAL DEL MAR (TSM)', unidad: 'TSM (°C)',  color: '#000000', yMin: undefined, yMax: undefined },
    ATSM: { titulo: 'ANOMALÍA DE LA TSM (ATSM)',             unidad: 'ATSM (°C)',  color: '#2980b9', yMin: undefined, yMax: undefined },
    SSM:  { titulo: 'SALINIDAD SUPERFICIAL DEL MAR (SSM)',   unidad: 'SSM', color: '#000000', yMin: 25,        yMax: 36        },
    ASSM: { titulo: 'ANOMALÍA DE LA SSM (ASSM)',             unidad: 'ASSM', color: '#8e44ad', yMin: undefined, yMax: undefined }
};

// 👇 NUEVO: DICCIONARIO DE LÍMITES POR ESTACIÓN
const LIMITES_POR_ESTACION = {
    'CALLAO': { tsmMin: undefined, tsmMax: undefined, 
                atsmMin: undefined, atsmMax: undefined,
                ssmMin: 33, ssmMax: 36, 
                assmMin: -0.5, assmMax: 0.5 },
    
    
    'CHIMBOTE': { tsmMin: undefined, tsmMax: undefined, 
                    atsmMin: undefined, atsmMax: undefined,
                    ssmMin: 33, ssmMax: 36, 
                    assmMin: undefined, assmMax:undefined },


    'TUMBES': { tsmMin: undefined, tsmMax: undefined, 
                atsmMin: -5, atsmMax: 5,
                ssmMin:undefined, ssmMax:undefined, 
                assmMin: -3, assmMax:3},

    'PAITA': { tsmMin: undefined, tsmMax: undefined, 
                atsmMin: undefined, atsmMax: undefined,
                ssmMin:30, ssmMax:36, 
                assmMin: -1, assmMax:1},

    'SAN JOSÉ': { tsmMin: undefined, tsmMax: undefined, 
                atsmMin: undefined, atsmMax: undefined,
                ssmMin:30, ssmMax:36, 
                assmMin: -1, assmMax:1},


    'CHICAMA': { tsmMin: undefined, tsmMax: undefined, 
                atsmMin: -5, atsmMax: 10,
                ssmMin:33, ssmMax:36, 
                assmMin: -0.4, assmMax:0.4},


    'HUANCHACO': { tsmMin: undefined, tsmMax: undefined, 
                atsmMin: undefined, atsmMax: undefined,
                ssmMin:33, ssmMax:36, 
                assmMin: -0.5, assmMax:0.5},
    
    'HUACHO': { tsmMin: undefined, tsmMax: undefined, 
                atsmMin: undefined, atsmMax: undefined,
                ssmMin:33, ssmMax:36, 
                assmMin: -1, assmMax: 1},
                
                
    'PISCO': { tsmMin: undefined, tsmMax: undefined, 
                atsmMin: undefined, atsmMax: undefined,
                ssmMin:undefined, ssmMax:undefined, 
                assmMin: -1, assmMax: 1},         
                
                
    'ILO': { tsmMin: undefined, tsmMax: undefined, 
                atsmMin: undefined, atsmMax: undefined,
                ssmMin:34, ssmMax:36, 
                assmMin: undefined, assmMax: undefined},   

    // Si más adelante quieres configurar Paita, solo agregas una línea así:
    // 'PAITA':  { ssmMin: 34, ssmMax: 35.5, assmMin: -1, assmMax: 1 },
    'DEFAULT': { ssmMin: 25, ssmMax: 36, assmMin: undefined, assmMax: undefined }
};

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];


//Se agregara funcion para modificar los rangos las subventanas de TSM ATSM SSM ASSM

// ─── FUNCIONES GLOBALES PARA EL PANEL LATERAL ─────────────────────
window.aplicarRangoY = function(tab) {
    const chart = mainCharts[tab];
    if(!chart) return;
    const minVal = document.getElementById(`y_min_${tab}`).value;
    const maxVal = document.getElementById(`y_max_${tab}`).value;

    const cfg = VAR_CONFIG[tab];
    // Restablecemos por defecto primero
    chart.options.scales.y.min = cfg.yMin;
    chart.options.scales.y.max = cfg.yMax;

    // Aplicamos los nuevos límites si el usuario escribió algo
    if(minVal !== '') chart.options.scales.y.min = parseFloat(minVal);
    if(maxVal !== '') chart.options.scales.y.max = parseFloat(maxVal);

    chart.update('none');
};

window.resetRangoY = function(tab) {
    const chart = mainCharts[tab];
    if(!chart) return;
    const cfg = VAR_CONFIG[tab];
    
    // Regresamos a la configuración original
    chart.options.scales.y.min = cfg.yMin;
    chart.options.scales.y.max = cfg.yMax;
    
    // Limpiamos las cajas de texto
    document.getElementById(`y_min_${tab}`).value = '';
    document.getElementById(`y_max_${tab}`).value = '';

    chart.update('none');
};

// Función puente para descargar desde el botón generado en HTML
window.guardarPngSubventana = function(estacion, tab) {
    exportarGrafico('png', estacion, tab);
};

// ─── FUNCIONES PARA LA BARRA DE FECHAS Y ZOOM ──────────────────
window.resetearZoomTab = function(tab) {
    rangeState[tab] = { left: 0, right: 1 };
    const chart = mainCharts[tab];
    if (chart) {
        chart.options.scales.x.min = undefined;
        chart.options.scales.x.max = undefined;
        if (chart.resetZoom) chart.resetZoom('none');
        chart.update('none');
    }
    const mini = Chart.getChart(`mini_${tab}`);
    if (mini) mini.update('none');
    
    // Limpiar las cajas de fechas
    const elDesde = document.getElementById(`fecha_desde_${tab}`);
    const elHasta = document.getElementById(`fecha_hasta_${tab}`);
    if(elDesde) elDesde.value = '';
    if(elHasta) elHasta.value = '';
};

window.aplicarRangoDias = function(tab, dias) {
    const chart = mainCharts[tab];
    if (!chart) return;
    const labels = chart.data.labels;
    if (!labels || labels.length === 0) return;

    if (dias === 'todo') {
        window.resetearZoomTab(tab);
        return;
    }

    // El último dato disponible
    const maxLabel = labels[labels.length - 1];
    const maxTime = new Date(maxLabel + 'T00:00:00Z').getTime();
    const targetTime = maxTime - (dias * 24 * 60 * 60 * 1000);

    // Buscar la etiqueta (fecha) más cercana en el arreglo de datos
    let closestLabel = labels[0];
    let minDiff = Infinity;
    for (let l of labels) {
        const diff = Math.abs(new Date(l + 'T00:00:00Z').getTime() - targetTime);
        if (diff < minDiff) { minDiff = diff; closestLabel = l; }
    }

    chart.options.scales.x.min = closestLabel;
    chart.options.scales.x.max = maxLabel;
    chart.update('none');
    sincronizarRangesliderDesdeChart(chart);

    // Actualizar los inputs visuales del calendario
    const elDesde = document.getElementById(`fecha_desde_${tab}`);
    const elHasta = document.getElementById(`fecha_hasta_${tab}`);
    if(elDesde) elDesde.value = closestLabel;
    if(elHasta) elHasta.value = maxLabel;
};

window.aplicarRangoFechas = function(tab) {
    const chart = mainCharts[tab];
    if (!chart) return;
    const desde = document.getElementById(`fecha_desde_${tab}`).value;
    const hasta = document.getElementById(`fecha_hasta_${tab}`).value;

    if(desde) chart.options.scales.x.min = desde;
    if(hasta) chart.options.scales.x.max = hasta;
    chart.update('none');
    sincronizarRangesliderDesdeChart(chart);
};





//Fin de la modificaion

// Función segura para extraer la etiqueta sin importar si es índice o texto
function obtenerLabelSeguro(labels, val) {
    if (val === undefined || val === null) return null;
    if (typeof val === 'number') return labels[Math.floor(val)] || null;
    return val.toString();
}

// ─── Tick adaptativo según nivel de zoom ─────────────────────
function tickX(val, index, ticks) {
    const f = this.getLabelForValue(val);
    if (!f) return null;
    const partes = f.split('-');
    if (partes.length < 3) return null;
    const y = partes[0], m = partes[1], d = partes[2];

    if (d !== '01') return null;

    const labels = this.chart.data.labels;
    if (!labels || labels.length === 0) return null;

    const minLabel = obtenerLabelSeguro(labels, this.chart.scales.x.min) || labels[0];
    const maxLabel = obtenerLabelSeguro(labels, this.chart.scales.x.max) || labels[labels.length - 1];

    const yMin = parseInt(minLabel.split('-')[0]) || 0;
    const yMax = parseInt(maxLabel.split('-')[0]) || 0;
    const diffAños = yMax - yMin;

    if (diffAños > 12) {
        if (m === '01' && parseInt(y) % 10 === 0) return y;
        return null;
    } else if (diffAños > 3) {
        if (m === '01') return y;
        return null;
    }

    const nomMes = MESES[parseInt(m) - 1];
    const startIndex = Math.max(0, labels.indexOf(minLabel));
    let esPrimerVisible = true;
    
    for (let i = startIndex; i < index; i++) {
        if (labels[i] && labels[i].startsWith(y + '-')) {
            esPrimerVisible = false;
            break;
        }
    }

    if (esPrimerVisible) return [nomMes, y];
    return nomMes;
}

function gridColorX(ctx) {
    const l = ctx.chart.data.labels[ctx.index];
    if (!l) return 'transparent';
    const partes = l.split('-');
    if (partes.length < 3) return 'transparent';
    const y = partes[0], m = partes[1], d = partes[2];

    if (d !== '01') return 'transparent';

    const labels = ctx.chart.data.labels;
    if (!labels || labels.length === 0) return 'transparent';

    const minLabel = obtenerLabelSeguro(labels, ctx.chart.scales.x.min) || labels[0];
    const maxLabel = obtenerLabelSeguro(labels, ctx.chart.scales.x.max) || labels[labels.length - 1];

    const yMin = parseInt(minLabel.split('-')[0]) || 0;
    const yMax = parseInt(maxLabel.split('-')[0]) || 0;
    const diffAños = yMax - yMin;

    if (diffAños > 12) {
        if (m === '01' && parseInt(y) % 10 === 0) return 'rgba(0,0,0,0.2)';
        return 'transparent';
    } else if (diffAños > 3) {
        if (m === '01') return 'rgba(0,0,0,0.1)';
        return 'transparent';
    }
    return 'rgba(0,0,0,0.08)';
}

function ultimoValor(valores) {
    if (!valores) return null;
    for (let i = valores.length - 1; i >= 0; i--) {
        if (!isNaN(valores[i])) return valores[i];
    }
    return null;
}

function destruirChart(tab) {
    if (mainCharts[tab]) { mainCharts[tab].destroy(); delete mainCharts[tab]; }
}

function aplicarZoom(tab, fechas) {
    const chart = mainCharts[tab];
    if (!chart) return;
    const { left, right } = rangeState[tab];
    const n    = fechas.length;
    const iMin = Math.max(0,     Math.floor(left  * (n - 1)));
    const iMax = Math.min(n - 1, Math.ceil (right * (n - 1)));
    const minLabel = fechas[iMin];
    const maxLabel = fechas[iMax];

    const zp = chart.options.plugins?.zoom;
    if (zp) {
        const savedDrag = zp.zoom?.drag?.enabled;
        const savedPan  = zp.pan?.enabled;
        if (zp.zoom?.drag) zp.zoom.drag.enabled = false;
        if (zp.pan)        zp.pan.enabled       = false;
        chart.options.scales.x.min = minLabel;
        chart.options.scales.x.max = maxLabel;
        chart.update('none');
        if (zp.zoom?.drag) zp.zoom.drag.enabled = savedDrag ?? true;
        if (zp.pan)        zp.pan.enabled       = savedPan  ?? true;
    } else {
        chart.options.scales.x.min = minLabel;
        chart.options.scales.x.max = maxLabel;
        chart.update('none');
    }
}

const pluginRangeMask = {
    id: 'rangeMask',
    afterDraw(chart) {
        const tab   = chart._tabKey;
        const state = rangeState[tab];
        if (!state) return;

        const { ctx, width, height } = chart;
        const { left: lPct, right: rPct } = state;
        const lPx = lPct * width;
        const rPx = rPct * width;

        ctx.save();
        ctx.fillStyle = 'rgba(60,60,60,0.45)';
        ctx.fillRect(0, 0, lPx, height);
        ctx.fillRect(rPx, 0, width - rPx, height);
        ctx.fillStyle = '#1e5799';
        ctx.fillRect(lPx - 3, 0, 6, height);
        ctx.fillRect(rPx - 3, 0, 6, height);
        ctx.restore();
    }
};

function crearRangeslider(wrapEl, tab, data, paletaRGB) {
    if (!rangeState[tab]) rangeState[tab] = { left: 0, right: 1 };

    wrapEl.innerHTML = `<canvas id="mini_${tab}" style="width:100%;height:100%;display:block;"></canvas>`;
    const canvas = wrapEl.querySelector('canvas');
    const ctx    = canvas.getContext('2d');
    const cfg    = VAR_CONFIG[tab];
    
    if(!data[tab]) return null;
    const { fechas, valores } = data[tab];
    const isAnomalia = (tab === 'ATSM' || tab === 'ASSM');

    const miniInst = new Chart(ctx, {
        type: isAnomalia ? 'bar' : 'line',
        data: {
            labels: fechas,
            datasets: [{
                data: valores,
                backgroundColor: isAnomalia
                    ? (c) => (c.raw >= 0 ? 'rgba(255, 0, 0, 0.75)' : 'rgba(0, 0, 255, 0.75)')
                    : cfg.color,
                borderColor: isAnomalia 
                    ? (c) => (c.raw >= 0 ? 'red' : 'blue') 
                    : cfg.color,
                borderWidth: isAnomalia ? 0 : 1,
                fill: false,
                tension: 0.1,
                pointRadius: 0,
                barPercentage: isAnomalia ? 1.0 : undefined,
                categoryPercentage: isAnomalia ? 1.0 : undefined
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: { display: false },
                y: { display: false, min: cfg.yMin, max: cfg.yMax }
            }
        },
        plugins: [pluginRangeMask]
    });

    miniInst._tabKey = tab;

    let dragging = null;
    let dragStartX = 0;
    let dragStartState = null;

    function getPct(clientX) {
        const rect = canvas.getBoundingClientRect();
        return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    }

    canvas.addEventListener('mousedown', e => {
        const pct = getPct(e.clientX);
        const { left, right } = rangeState[tab];
        const tol = 0.02;

        if (Math.abs(pct - left) < tol) dragging = 'left';
        else if (Math.abs(pct - right) < tol) dragging = 'right';
        else if (pct > left && pct < right) {
            dragging = 'move'; dragStartX = pct; dragStartState = { ...rangeState[tab] };
        } else {
            dragging = 'new'; rangeState[tab].left = pct; rangeState[tab].right = Math.min(1, pct + 0.02);
        }
        e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
        if (!dragging) return;
        const pct = getPct(e.clientX);
        const MIN_SEL = 0.02;

        if (dragging === 'left') rangeState[tab].left = Math.min(pct, rangeState[tab].right - MIN_SEL);
        else if (dragging === 'right') rangeState[tab].right = Math.max(pct, rangeState[tab].left + MIN_SEL);
        else if (dragging === 'move') {
            const span  = dragStartState.right - dragStartState.left;
            const delta = pct - dragStartX;
            let nl = dragStartState.left  + delta;
            let nr = dragStartState.right + delta;
            if (nl < 0) { nl = 0; nr = span; }
            if (nr > 1) { nr = 1; nl = 1 - span; }
            rangeState[tab].left  = nl;
            rangeState[tab].right = nr;
        } else if (dragging === 'new') {
            rangeState[tab].right = Math.max(rangeState[tab].left + MIN_SEL, pct);
        }

        miniInst.update('none');
        aplicarZoom(tab, fechas);
    });

    document.addEventListener('mouseup', () => { dragging = null; });
    canvas.addEventListener('dblclick', () => {
        rangeState[tab] = { left: 0, right: 1 };
        miniInst.update('none');
        const chart = mainCharts[tab];
        if (chart) {
            chart.options.scales.x.min = undefined;
            chart.options.scales.x.max = undefined;
            chart.update('none');
        }
    });
    canvas.addEventListener('mousemove', e => {
        const pct = getPct(e.clientX);
        const { left, right } = rangeState[tab];
        const tol = 0.02;
        if (Math.abs(pct - left) < tol || Math.abs(pct - right) < tol) canvas.style.cursor = 'ew-resize';
        else if (pct > left && pct < right) canvas.style.cursor = 'grab';
        else canvas.style.cursor = 'crosshair';
    });

    return miniInst;
}

function instanciarMain(tab, data, paletaRGB, soloUna) {
    const cfg = VAR_CONFIG[tab];
    if(!data[tab]) return;
    const { fechas, valores } = data[tab];
    
    const isSSM = tab === 'SSM';
    const isASSM = tab === 'ASSM'; // Detectamos si es la gráfica de ASSM
    const isAnomalia = (tab === 'ATSM' || tab === 'ASSM');

    // Agrupamos SSM y ASSM para activar el movimiento vertical
    const isDesplazableY = (isSSM || isASSM);

    destruirChart(tab);

    const canvas = document.getElementById(`main_${tab}`);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // LÓGICA DE LA "MANITO" DE ARRASTRE
    if (isDesplazableY) {
        canvas.style.cursor = 'grab';
        canvas.onmousedown  = () => canvas.style.cursor = 'grabbing';
        canvas.onmouseup    = () => canvas.style.cursor = 'grab';
        canvas.onmouseleave = () => canvas.style.cursor = 'grab';
    } else {
        canvas.style.cursor = 'crosshair'; // Cursor normal de selección para las demás
    }



    const pluginFondo = {
        id: 'fondo_' + tab,
        beforeDraw(chart) {
            const { ctx: c, width, height } = chart;
            c.save();
            c.fillStyle = '#ffffff'; // Fuerza el fondo blanco puro para todos los paneles
            c.fillRect(0, 0, width, height);
            c.restore();
        }
    };

    const chartInst = new Chart(ctx, {
        type: isAnomalia ? 'bar' : 'line',
        data: {
            labels: fechas,
            datasets: [{
                label: tab,
                data: valores,
                backgroundColor: isAnomalia 
                    ? (c) => (c.raw >= 0 ? 'rgba(255, 0, 0, 0.75)' : 'rgba(0, 0, 255, 0.75)') 
                    : cfg.color,
                borderColor: isAnomalia 
                    ? (c) => (c.raw >= 0 ? 'red' : 'blue') 
                    : cfg.color,
                borderWidth: isAnomalia ? 1 : 1.5,
                fill: false,
                tension: isAnomalia ? 0 : 0.1,
                pointRadius: isAnomalia ? 0 : 1.5,
                pointBackgroundColor: isAnomalia ? undefined : cfg.color,
                barPercentage: isAnomalia ? 1.0 : undefined,
                categoryPercentage: isAnomalia ? 1.0 : undefined
            }]
        },
options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: { mode: 'index', intersect: false },
            layout: {
                padding: { left: 5, right: 15, top: 10, bottom: 0 } 
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: { label: c => `${c.parsed.y.toFixed(2)} ${cfg.unidad}` }
                },
                zoom: {
                    zoom: {
                        drag: {
                            enabled: !isDesplazableY,
                            backgroundColor: 'rgba(30,87,153,0.15)',
                            borderColor: '#1e5799',
                            borderWidth: 1
                        },
                        mode: 'x',
                        onZoomComplete({ chart }) { sincronizarRangesliderDesdeChart(chart); }
                    },
                    pan: {
                        enabled: isDesplazableY, 
                        mode: isDesplazableY ? 'xy' : 'x', 
                        onPanComplete({ chart }) { sincronizarRangesliderDesdeChart(chart); }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#000000', 
                        font: { size: 14 },
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 12,
                        // 👇 REEMPLAZA EL CALLBACK DENTRO DE scales -> x -> ticks POR ESTE:
                        callback: function(value, index, values) {
                            const label = this.getLabelForValue(value);
                            if (!label) return '';
                            const [anio, mes, dia] = label.split('-');
                            const mesesCortos = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                            const mesStr = mesesCortos[parseInt(mes, 10) - 1];
                            
                            const prevIdx = index > 0 ? values[index - 1].value : null;
                            const prevLabel = prevIdx !== null ? this.getLabelForValue(prevIdx) : null;
                            const prevAnio = prevLabel ? prevLabel.split('-')[0] : null;

                            // Al retornar un arreglo [texto1, texto2], Chart.js lo dibuja en dos líneas
                            if (index === 0 || anio !== prevAnio) {
                                return [`${dia} ${mesStr}`, anio]; // El año se dibuja debajo
                            } else {
                                return `${dia} ${mesStr}`;
                            }
                        }
                    },
                    grid: { color: 'rgba(0,0,0,0.1)' }
                },
                y: {
                    min: cfg.yMin, 
                    max: cfg.yMax, 
                    title: {
                        display: true,
                        text: cfg.ejeY, 
                        color: '#000000', 
                        font: { size: 16, weight: 'bold' }
                    },
                    ticks: {
                        color: '#000000', 
                        font: { size: 14 } 
                    },
                    grid: { color: 'rgba(0,0,0,0.1)' }
                }
            }
        },
        plugins: [pluginFondo, {
            id: 'hoverVal_' + tab,
            afterEvent(chart, args) {
                if (args.event.type === 'mousemove') {
                    const pts = chart.getElementsAtEventForMode(args.event.native, 'index', { intersect: false }, true);
                    if (pts.length) {
                        const idx = pts[0].index;
                        const v  = chart.data.datasets[0].data[idx];
                        const f  = chart.data.labels[idx];
                        
                        const elVal = document.getElementById(`val_${tab}`);
                        const elFec = document.getElementById(`fecha_val_${tab}`);
                        
                        if (elVal && !isNaN(v)) {
                            elVal.textContent = parseFloat(v).toFixed(2);
                        }
                        
                        if (elFec && f) {
                            elFec.textContent = f.split('-').reverse().join('-');
                        }
                    }
                }
            }
        }]
    }); 

    chartInst._tabKey  = tab;
    mainCharts[tab]    = chartInst;
}
function sincronizarRangesliderDesdeChart(chart) {
    const xScale = chart.scales.x;
    const labels = chart.data.labels;
    const n = labels.length;
    if (!n) return;

    let iMin = 0, iMax = n - 1;
    for (let i = 0; i < n; i++) { if (labels[i] >= xScale.min) { iMin = i; break; } }
    for (let i = n - 1; i >= 0; i--) { if (labels[i] <= xScale.max) { iMax = i; break; } }

    const tab = chart._tabKey;
    if (!tab || !rangeState[tab]) return;
    rangeState[tab].left  = iMin / (n - 1);
    rangeState[tab].right = iMax / (n - 1);

    const mini = Chart.getChart(`mini_${tab}`);
    if (mini) mini.update('none');
}

// ═══════════════════════════════════════════════════════════════
// CREAR TARJETA HTML (Con fecha dinámica en la cabecera)
// ═══════════════════════════════════════════════════════════════
function crearTarjetaHTML(tab, data, soloUna, estacionActual) {
    const cfg = VAR_CONFIG[tab];
    if(!cfg) return '';
    
    // Buscar último valor y última fecha válida
    let ultVal = null;
    let ultFecha = '';
    const vals = data[tab]?.valores || [];
    const fecs = data[tab]?.fechas || [];
    for (let i = vals.length - 1; i >= 0; i--) {
        if (!isNaN(vals[i])) {
            ultVal = vals[i];
            ultFecha = fecs[i];
            break;
        }
    }
    
    // Formatear fecha de YYYY-MM-DD a DD-MM-YYYY
    const fechaFormateada = ultFecha ? ultFecha.split('-').reverse().join('-') : '';

    const styleCard = !soloUna ? 'flex: 1; display: flex; flex-direction: column; min-height: 0;' : 'display: flex; flex-direction: row; height: 100%; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
    const styleBody = !soloUna ? 'flex: 1; display: flex; flex-direction: column; min-height: 0;' : 'flex: 1; display: flex; flex-direction: column; min-height: 0;';
    const styleMain = !soloUna ? 'flex: 1; height: auto; min-height: 0;' : 'flex: 1; height: auto; min-height: 0;';

    const sidebarHTML = soloUna ? `
    <div class="panel-lateral" style="width: 250px; background: #2c3e50; color: white; padding: 20px; display: flex; flex-direction: column; gap: 15px; border-top-left-radius: 8px; border-bottom-left-radius: 8px;">
        <h4 style="margin: 0 0 10px 0; font-size: 16px; font-weight: normal; display: flex; align-items: center; justify-content: space-between;">
            Series temporales <span>📊</span>
        </h4>
        <div style="font-size: 13px; color: #bdc3c7;">Rango del eje Y (${cfg.unidad})</div>
        <div style="display: flex; gap: 10px;">
            <div style="flex: 1;">
                <label style="font-size: 11px; color: #95a5a6; display: block; margin-bottom: 4px;">Mínimo</label>
                <input type="number" id="y_min_${tab}" step="0.1" style="width: 100%; padding: 6px; box-sizing: border-box; background: #34495e; border: 1px solid #7f8c8d; color: white; border-radius: 4px; outline: none;">
            </div>
            <div style="flex: 1;">
                <label style="font-size: 11px; color: #95a5a6; display: block; margin-bottom: 4px;">Máximo</label>
                <input type="number" id="y_max_${tab}" step="0.1" style="width: 100%; padding: 6px; box-sizing: border-box; background: #34495e; border: 1px solid #7f8c8d; color: white; border-radius: 4px; outline: none;">
            </div>
        </div>
        <button onclick="resetRangoY('${tab}')" style="background: transparent; color: #3498db; border: 1px solid #3498db; padding: 8px; cursor: pointer; border-radius: 4px; transition: 0.3s; margin-top: 5px;">AJUSTAR AUTOMÁTICO</button>
        <button onclick="aplicarRangoY('${tab}')" style="background: #2980b9; color: white; border: none; padding: 8px; cursor: pointer; border-radius: 4px; font-weight: bold; transition: 0.3s;">APLICAR</button>
        
        <hr style="border-top: 1px solid #7f8c8d; border-bottom: none; width: 100%; margin: 15px 0;">
        
        <div style="font-size: 13px; color: #bdc3c7;">Control de Vista</div>
        <button onclick="resetearZoomTab('${tab}')" style="background: rgba(231, 76, 60, 0.1); color: #e74c3c; border: 1px solid #e74c3c; padding: 8px; cursor: pointer; border-radius: 4px; font-weight: bold; transition: 0.3s;">🔍 RESTABLECER ZOOM</button>

        <hr style="border-top: 1px solid #7f8c8d; border-bottom: none; width: 100%; margin: 15px 0;">

        <div style="font-size: 13px; color: #bdc3c7;">Guardar figura</div>
        <button onclick="guardarPngSubventana('${estacionActual}', '${tab}')" style="background: transparent; color: #bdc3c7; border: 1px solid #7f8c8d; padding: 8px; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center; gap: 8px; transition: 0.3s;">
            🖼 GUARDAR COMO PNG
        </button>
    </div>
    ` : '';

    const dateControlsHTML = soloUna ? `
    <div style="display: flex; align-items: center; justify-content: center; gap: 15px; padding: 12px; border-top: 1px solid #eee; background: #fdfdfd; flex-wrap: wrap; border-bottom-right-radius: 8px;">
        <div style="display: flex; border: 1px solid #dcdde1; border-radius: 4px; overflow: hidden; background: white;">
            <button onclick="aplicarRangoDias('${tab}', 7)" style="padding: 7px 14px; border: none; border-right: 1px solid #dcdde1; background: white; cursor: pointer; font-size: 13px; color: #2c3e50; transition: background 0.2s;" onmouseover="this.style.background='#f1f2f6'" onmouseout="this.style.background='white'">7 días</button>
            <button onclick="aplicarRangoDias('${tab}', 15)" style="padding: 7px 14px; border: none; border-right: 1px solid #dcdde1; background: white; cursor: pointer; font-size: 13px; color: #2c3e50; transition: background 0.2s;" onmouseover="this.style.background='#f1f2f6'" onmouseout="this.style.background='white'">15 días</button>
            <button onclick="aplicarRangoDias('${tab}', 30)" style="padding: 7px 14px; border: none; border-right: 1px solid #dcdde1; background: #3498db; color: white; cursor: pointer; font-size: 13px;">30 días</button>
            <button onclick="aplicarRangoDias('${tab}', 60)" style="padding: 7px 14px; border: none; border-right: 1px solid #dcdde1; background: white; cursor: pointer; font-size: 13px; color: #2c3e50; transition: background 0.2s;" onmouseover="this.style.background='#f1f2f6'" onmouseout="this.style.background='white'">60 días</button>
            <button onclick="aplicarRangoDias('${tab}', 90)" style="padding: 7px 14px; border: none; border-right: 1px solid #dcdde1; background: white; cursor: pointer; font-size: 13px; color: #2c3e50; transition: background 0.2s;" onmouseover="this.style.background='#f1f2f6'" onmouseout="this.style.background='white'">90 días</button>
            <button onclick="aplicarRangoDias('${tab}', 'todo')" style="padding: 7px 14px; border: none; background: white; cursor: pointer; font-size: 13px; color: #2c3e50; transition: background 0.2s;" onmouseover="this.style.background='#f1f2f6'" onmouseout="this.style.background='white'">Todo</button>
        </div>
        
        <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #2c3e50; margin-left: 10px;">
            <label style="font-weight: bold;">Desde</label>
            <input type="date" id="fecha_desde_${tab}" onchange="aplicarRangoFechas('${tab}')" style="padding: 5px; border: 1px solid #dcdde1; border-radius: 4px; font-size: 13px; color: #2c3e50; outline: none;">
            <label style="font-weight: bold; margin-left: 5px;">Hasta</label>
            <input type="date" id="fecha_hasta_${tab}" onchange="aplicarRangoFechas('${tab}')" style="padding: 5px; border: 1px solid #dcdde1; border-radius: 4px; font-size: 13px; color: #2c3e50; outline: none;">
        </div>
    </div>
    ` : '';

    return `
    <div class="chart-card ${soloUna ? 'solo' : ''}" id="card_${tab}" style="${styleCard}">
        ${sidebarHTML}
        <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; background: white; border-top-right-radius: 8px; border-bottom-right-radius: 8px;">
            <div class="chart-card-header">
                <div class="chart-card-title">
                    <div class="chart-dot" style="background:${cfg.color};"></div>
                    ${cfg.titulo}
                </div>
                
                <div class="chart-card-valor" style="display: flex; align-items: baseline; gap: 12px;">
                    <span id="fecha_val_${tab}" style="font-size: 18px; color: #000000; font-weight: normal; border-right: 1px solid #bdc3c7; padding-right: 12px;">${fechaFormateada}</span>
                    <div>
                        <span id="val_${tab}">${ultVal !== null ? ultVal.toFixed(2) : '—'}</span>
                        <span class="chart-card-unidad">${cfg.unidad}</span>
                    </div>
                </div>

            </div>
            <div class="chart-card-body" style="${styleBody}">
                <div class="chart-main-wrap" style="${styleMain}">
                    <canvas id="main_${tab}"></canvas>
                </div>
                <div class="rangeslider-wrap" id="rs_${tab}"></div>
                ${dateControlsHTML}
            </div>
        </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ═══════════════════════════════════════════════════════════════
export function dibujarGrafico(data, estacionActual, currentTab, paletaRGB) {

    // 👇 ACTUALIZACIÓN DINÁMICA: Busca la estación o usa la configuración por defecto
    const lim = LIMITES_POR_ESTACION[estacionActual] || LIMITES_POR_ESTACION['DEFAULT'];
    VAR_CONFIG.TSM.yMin  = lim.tsmMin;
    VAR_CONFIG.TSM.yMax  = lim.tsmMax;
    
    VAR_CONFIG.ATSM.yMin = lim.atsmMin;
    VAR_CONFIG.ATSM.yMax = lim.atsmMax;

    VAR_CONFIG.SSM.yMin  = lim.ssmMin;
    VAR_CONFIG.SSM.yMax  = lim.ssmMax;

    VAR_CONFIG.ASSM.yMin = lim.assmMin;
    VAR_CONFIG.ASSM.yMax = lim.assmMax;


    const scroll = document.getElementById('graficosScroll');
    if (!scroll) return;

    const tabs    = currentTab === 'TODOS' ? ['TSM','ATSM','SSM','ASSM'] : [currentTab];
    const soloUna = tabs.length === 1;

    // Destruimos gráficos viejos y LIMPIAMOS la memoria del zoom para que no se atasque
    ['TSM','ATSM','SSM','ASSM'].forEach(t => {
        destruirChart(t);
        rangeState[t] = { left: 0, right: 1 }; 
    });

   // scroll.innerHTML = tabs.map(t => crearTarjetaHTML(t, data, soloUna)).join(''); // LINEA ANTIGUA

    //scroll.innerHTML = tabs.map(t => crearTarjetaHTML(t, data, soloUna, estacionActual)).join('');// Linea nueva con boton de descarga en subventana

    // ═══════════════════════════════════════════════════════════════
    // DENTRO DE LA FUNCIÓN dibujarGrafico
    // ═══════════════════════════════════════════════════════════════

    // Destruimos gráficos viejos y limpiamos estados
    ['TSM','ATSM','SSM','ASSM'].forEach(t => {
        destruirChart(t);
        rangeState[t] = { left: 0, right: 1 }; 
    });

    // Generamos las tarjetas
    let htmlContent = tabs.map(t => crearTarjetaHTML(t, data, soloUna, estacionActual)).join('');

    // 👇 NUEVO: SI ESTAMOS EN "TODOS", AGREGAMOS EL BOTÓN DE RESET GLOBAL ARRIBA
    if (!soloUna) {
        const btnResetGlobal = `
        <div style="display: flex; justify-content: flex-end; padding: 0 5px 10px 0;">
            <button onclick="resetearZoom()" style="background: rgba(231, 76, 60, 0.1); color: #671108; border: 1px solid #e74c3c; padding: 8px 15px; cursor: pointer; border-radius: 4px; font-weight: bold; font-size: 12px; transition: 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                🔍 RESTABLECER ZOOM EN TODAS LAS SERIES
            </button>
        </div>`;
        htmlContent = btnResetGlobal + htmlContent;
    }

    scroll.innerHTML = htmlContent;

    // ... (el código de los estilos scroll.style sigue igual debajo de esto)


    scroll.style.display       = 'flex';
    scroll.style.flexDirection = 'column';
    scroll.style.overflowY     = 'hidden'; 
    scroll.style.flex          = '1';
    scroll.style.gap           = '8px'; // Ligera separación

    // Como las tarjetas ya tienen el tamaño final desde el HTML, instanciamos directamente sin errores
    requestAnimationFrame(() => {
        tabs.forEach(t => instanciarMain(t, data, paletaRGB, soloUna));
        requestAnimationFrame(() => {
            tabs.forEach(t => {
                const wrapEl = document.getElementById(`rs_${t}`);
                if (wrapEl) crearRangeslider(wrapEl, t, data, paletaRGB);
            });
        });
    });

    const act = (id, vals) => {
        const v  = ultimoValor(vals || []);
        const el = document.getElementById(id);
        if (el) el.textContent = v !== null ? v.toFixed(2) : '—';
    };
    act('meta-tsm-val',  data.TSM?.valores);
    act('meta-atsm-val', data.ATSM?.valores);
    act('meta-ssm-val',  data.SSM?.valores);
    act('meta-assm-val', data.ASSM?.valores);
}

// 👇 Agregamos window.resetearZoom para que el botón HTML la encuentre
window.resetearZoom = function() {
    ['TSM','ATSM','SSM','ASSM'].forEach(tab => {
        rangeState[tab] = { left: 0, right: 1 };
        const chart = mainCharts[tab];
        if (chart) {
            chart.options.scales.x.min = undefined;
            chart.options.scales.x.max = undefined;
            if (chart.resetZoom) chart.resetZoom('none');
            chart.update('none');
        }
        const mini = Chart.getChart(`mini_${tab}`);
        if (mini) mini.update('none');
    });
};

// Mantenemos el export por si app.js lo necesita
export function resetearZoom() {
    window.resetearZoom();
}

export function exportarGrafico(formato, estacionActual, currentTab) {
    const tabs = currentTab === 'TODOS' ? ['TSM','ATSM','SSM','ASSM'] : [currentTab];
    const inst = mainCharts[tabs[0]];
    if (!inst) return;
    const canvas = inst.canvas;
    const nombre = `${currentTab}_${estacionActual}`;
    const origRatio = inst.options.devicePixelRatio || window.devicePixelRatio;
    inst.options.devicePixelRatio = 4;
    inst.update('none');
    setTimeout(() => {
        const mime    = formato === 'jpeg' ? 'image/jpeg' : 'image/png';
        const dataUrl = canvas.toDataURL(mime, 1.0);
        if (formato === 'print') {
            const w = window.open('','','width=1000,height=700');
            w.document.write(`<html><body style="text-align:center"><img src="${dataUrl}" style="max-width:100%"></body></html>`);
            w.document.close(); w.focus();
            setTimeout(() => { w.print(); w.close(); }, 500);
        } else if (formato === 'pdf') {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation:'landscape' });
            const p   = pdf.getImageProperties(dataUrl);
            const pw  = pdf.internal.pageSize.getWidth() - 20;
            pdf.addImage(dataUrl, formato==='jpeg'?'JPEG':'PNG', 10, 15, pw, p.height*pw/p.width);
            pdf.save(`${nombre}.pdf`);
        } else {
            const a = document.createElement('a');
            a.download = `${nombre}.${formato}`; a.href = dataUrl; a.click();
        }
        inst.options.devicePixelRatio = origRatio;
        inst.update('none');
    }, 300);
}