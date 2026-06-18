/**
 * js/funciones/grafico.js
 * Configuración con 4 variables, histogramas y eje X adaptativo seguro
 */

const mainCharts = {};
const rangeState = {};

const VAR_CONFIG = {
    TSM:  { titulo: 'TEMPERATURA SUPERFICIAL DEL MAR (TSM)', unidad: 'TSM (°C)',  color: '#000000', yMin: undefined, yMax: undefined },
    ATSM: { titulo: 'ANOMALÍA DE LA TSM (ATSM)',             unidad: 'ATSM (°C)', color: '#2980b9', yMin: undefined, yMax: undefined },
    SSM:  { titulo: 'SALINIDAD SUPERFICIAL DEL MAR (SSM)',   unidad: 'SSM',       color: '#000000', yMin: 25,        yMax: 36        },
    ASSM: { titulo: 'ANOMALÍA DE LA SSM (ASSM)',             unidad: 'ASSM',      color: '#8e44ad', yMin: undefined, yMax: undefined }
};

const LIMITES_POR_ESTACION = {
    'CALLAO':    { tsmMin: undefined, tsmMax: undefined, atsmMin: undefined, atsmMax: undefined, ssmMin: 33, ssmMax: 36, assmMin: -0.5,     assmMax: 0.5      },
    'CHIMBOTE':  { tsmMin: undefined, tsmMax: undefined, atsmMin: undefined, atsmMax: undefined, ssmMin: 33, ssmMax: 36, assmMin: undefined, assmMax: undefined },
    'TUMBES':    { tsmMin: undefined, tsmMax: undefined, atsmMin: -5,        atsmMax: 5,         ssmMin: undefined, ssmMax: undefined, assmMin: -3, assmMax: 3 },
    'PAITA':     { tsmMin: undefined, tsmMax: undefined, atsmMin: undefined, atsmMax: undefined, ssmMin: 30, ssmMax: 36, assmMin: -1,       assmMax: 1        },
    'SAN JOSÉ':  { tsmMin: undefined, tsmMax: undefined, atsmMin: undefined, atsmMax: undefined, ssmMin: 30, ssmMax: 36, assmMin: -1,       assmMax: 1        },
    'CHICAMA':   { tsmMin: undefined, tsmMax: undefined, atsmMin: -5,        atsmMax: 10,        ssmMin: 33, ssmMax: 36, assmMin: -0.4,     assmMax: 0.4      },
    'HUANCHACO': { tsmMin: undefined, tsmMax: undefined, atsmMin: undefined, atsmMax: undefined, ssmMin: 33, ssmMax: 36, assmMin: -0.5,     assmMax: 0.5      },
    'HUACHO':    { tsmMin: undefined, tsmMax: undefined, atsmMin: undefined, atsmMax: undefined, ssmMin: 33, ssmMax: 36, assmMin: -1,       assmMax: 1        },
    'PISCO':     { tsmMin: undefined, tsmMax: undefined, atsmMin: undefined, atsmMax: undefined, ssmMin: undefined, ssmMax: undefined, assmMin: -1, assmMax: 1 },
    'ILO':       { tsmMin: undefined, tsmMax: undefined, atsmMin: undefined, atsmMax: undefined, ssmMin: 34, ssmMax: 36, assmMin: undefined, assmMax: undefined },
    'DEFAULT':   { ssmMin: 25, ssmMax: 36, assmMin: undefined, assmMax: undefined }
};

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// ─── Helper: formatear anomalía con color y símbolo + ─────────
function formatearAnomalia(el, v) {
    if (!el) return;
    if (v === null || v === undefined || isNaN(v)) {
        el.textContent = '—'; el.style.color = ''; el.style.fontWeight = ''; return;
    }
    const val = parseFloat(v);
    if (val === 0) {
        el.textContent      = val.toFixed(2);
        el.style.color      = '#94a3b8';
        el.style.fontWeight = '600';
    } else if (val > 0) {
        el.textContent      = '+' + val.toFixed(2);
        el.style.color      = '#c0392b';
        el.style.fontWeight = '800';
    } else {
        el.textContent      = val.toFixed(2);
        el.style.color      = '#2980b9';
        el.style.fontWeight = '800';
    }
}

// ─── FUNCIONES GLOBALES PANEL LATERAL ─────────────────────────
window.aplicarRangoY = function(tab) {
    const chart = mainCharts[tab];
    if (!chart) return;
    const minVal = document.getElementById(`y_min_${tab}`).value;
    const maxVal = document.getElementById(`y_max_${tab}`).value;
    const cfg = VAR_CONFIG[tab];
    chart.options.scales.y.min = cfg.yMin;
    chart.options.scales.y.max = cfg.yMax;
    if (minVal !== '') chart.options.scales.y.min = parseFloat(minVal);
    if (maxVal !== '') chart.options.scales.y.max = parseFloat(maxVal);
    chart.update('none');
};

window.resetRangoY = function(tab) {
    const chart = mainCharts[tab];
    if (!chart) return;
    const cfg = VAR_CONFIG[tab];
    chart.options.scales.y.min = cfg.yMin;
    chart.options.scales.y.max = cfg.yMax;
    document.getElementById(`y_min_${tab}`).value = '';
    document.getElementById(`y_max_${tab}`).value = '';
    chart.update('none');
};

window.guardarPngSubventana = function(estacion, tab) {
    exportarGrafico('png', estacion, tab);
};

// ─── ZOOM BOTONES +/−/🏠 ─────────────────────────────────────
window.zoomIn = function(tab) {
    const chart = mainCharts[tab];
    if (!chart) return;
    chart.zoom(1.3);
    sincronizarRangesliderDesdeChart(chart);
};
window.zoomOut = function(tab) {
    const chart = mainCharts[tab];
    if (!chart) return;
    chart.zoom(0.7);
    sincronizarRangesliderDesdeChart(chart);
};
window.zoomReset = function(tab) { window.resetearZoomTab(tab); };

// ─── BARRA DE FECHAS ──────────────────────────────────────────
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
    const elDesde = document.getElementById(`fecha_desde_${tab}`);
    const elHasta = document.getElementById(`fecha_hasta_${tab}`);
    if (elDesde) elDesde.value = '';
    if (elHasta) elHasta.value = '';
};

window.aplicarRangoDias = function(tab, dias, btnElement) {
    const chart = mainCharts[tab];
    if (!chart) return;
    if (btnElement) {
        const botones = document.querySelectorAll(`.btn-rango-${tab}`);
        botones.forEach(btn => { btn.style.background = 'white'; btn.style.color = '#2c3e50'; });
        btnElement.style.background = '#3498db'; btnElement.style.color = 'white';
    }
    const labels = chart.data.labels;
    if (!labels || labels.length === 0) return;
    if (dias === 'todo') { window.resetearZoomTab(tab); return; }
    if (chart.resetZoom) chart.resetZoom('none');
    const maxLabel = labels[labels.length - 1];
    const maxTime  = new Date(maxLabel + 'T00:00:00Z').getTime();
    const targetTime = maxTime - (parseInt(dias, 10) * 24 * 60 * 60 * 1000);
    let closestLabel = labels[0], minDiff = Infinity;
    for (let l of labels) {
        const time = new Date(l + 'T00:00:00Z').getTime();
        if (isNaN(time)) continue;
        const diff = Math.abs(time - targetTime);
        if (diff < minDiff) { minDiff = diff; closestLabel = l; }
    }
    chart.options.scales.x.min = closestLabel;
    chart.options.scales.x.max = maxLabel;
    chart.update('none');
    sincronizarRangesliderDesdeChart(chart);
    const elDesde = document.getElementById(`fecha_desde_${tab}`);
    const elHasta = document.getElementById(`fecha_hasta_${tab}`);
    if (elDesde) elDesde.value = closestLabel;
    if (elHasta) elHasta.value = maxLabel;
};

window.aplicarRangoFechas = function(tab) {
    const chart = mainCharts[tab];
    if (!chart) return;
    const desde = document.getElementById(`fecha_desde_${tab}`).value;
    const hasta = document.getElementById(`fecha_hasta_${tab}`).value;
    if (chart.resetZoom) chart.resetZoom('none');
    if (desde) chart.options.scales.x.min = desde;
    if (hasta) chart.options.scales.x.max = hasta;
    chart.update('none');
    sincronizarRangesliderDesdeChart(chart);
};

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
    const n = fechas.length;
    const iMin = Math.max(0,     Math.floor(left  * (n - 1)));
    const iMax = Math.min(n - 1, Math.ceil (right * (n - 1)));
    const zp = chart.options.plugins?.zoom;
    if (zp) {
        const sd = zp.zoom?.drag?.enabled, sp = zp.pan?.enabled;
        if (zp.zoom?.drag) zp.zoom.drag.enabled = false;
        if (zp.pan)        zp.pan.enabled       = false;
        chart.options.scales.x.min = fechas[iMin];
        chart.options.scales.x.max = fechas[iMax];
        chart.update('none');
        if (zp.zoom?.drag) zp.zoom.drag.enabled = sd ?? true;
        if (zp.pan)        zp.pan.enabled       = sp ?? true;
    } else {
        chart.options.scales.x.min = fechas[iMin];
        chart.options.scales.x.max = fechas[iMax];
        chart.update('none');
    }
}

// ═══════════════════════════════════════════════════════════════
// PLUGIN MÁSCARA RANGESLIDER
// ═══════════════════════════════════════════════════════════════
const pluginRangeMask = {
    id: 'rangeMask',
    afterDraw(chart) {
        const tab   = chart._tabKey;
        const state = rangeState[tab];
        if (!state) return;
        const { ctx, width, height } = chart;
        const { left: lPct, right: rPct } = state;
        const lPx = lPct * width, rPx = rPct * width;
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

// ═══════════════════════════════════════════════════════════════
// MINI CHART (RANGESLIDER)
// ═══════════════════════════════════════════════════════════════
function crearRangeslider(wrapEl, tab, data, paletaRGB, mostrar = true) {
    if (!rangeState[tab]) rangeState[tab] = { left: 0, right: 1 };
    if (!mostrar) { wrapEl.style.display = 'none'; return null; }
    wrapEl.style.display = '';
    if (!data[tab]) return null;

    const { fechas, valores } = data[tab];
    const cfg = VAR_CONFIG[tab];
    const isAnomalia = (tab === 'ATSM' || tab === 'ASSM');

    wrapEl.innerHTML = `<canvas id="mini_${tab}" style="width:100%;height:100%;display:block;"></canvas>`;
    const canvas = wrapEl.querySelector('canvas');
    const ctx    = canvas.getContext('2d');

    const miniInst = new Chart(ctx, {
        type: isAnomalia ? 'bar' : 'line',
        data: {
            labels: fechas,
            datasets: [{
                data: valores,
                backgroundColor: isAnomalia ? (c) => (c.raw >= 0 ? 'rgba(255,0,0,0.75)' : 'rgba(0,0,255,0.75)') : cfg.color,
                borderColor:     isAnomalia ? (c) => (c.raw >= 0 ? 'red' : 'blue') : cfg.color,
                borderWidth: isAnomalia ? 0 : 1,
                fill: false, tension: 0.1, pointRadius: 0,
                barPercentage: isAnomalia ? 1.0 : undefined,
                categoryPercentage: isAnomalia ? 1.0 : undefined
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { x: { display: false }, y: { display: false, min: cfg.yMin, max: cfg.yMax } }
        },
        plugins: [pluginRangeMask]
    });
    miniInst._tabKey = tab;

    let dragging = null, dragStartX = 0, dragStartState = null;
    function getPct(clientX) {
        const rect = canvas.getBoundingClientRect();
        return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    }
    canvas.addEventListener('mousedown', e => {
        const pct = getPct(e.clientX), { left, right } = rangeState[tab], tol = 0.02;
        if (Math.abs(pct - left) < tol)       dragging = 'left';
        else if (Math.abs(pct - right) < tol) dragging = 'right';
        else if (pct > left && pct < right)   { dragging = 'move'; dragStartX = pct; dragStartState = { ...rangeState[tab] }; }
        else { dragging = 'new'; rangeState[tab].left = pct; rangeState[tab].right = Math.min(1, pct + 0.02); }
        e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
        if (!dragging) return;
        const pct = getPct(e.clientX), MIN_SEL = 0.02;
        if (dragging === 'left')       rangeState[tab].left  = Math.min(pct, rangeState[tab].right - MIN_SEL);
        else if (dragging === 'right') rangeState[tab].right = Math.max(pct, rangeState[tab].left  + MIN_SEL);
        else if (dragging === 'move') {
            const span = dragStartState.right - dragStartState.left, delta = pct - dragStartX;
            let nl = dragStartState.left + delta, nr = dragStartState.right + delta;
            if (nl < 0) { nl = 0; nr = span; } if (nr > 1) { nr = 1; nl = 1 - span; }
            rangeState[tab].left = nl; rangeState[tab].right = nr;
        } else rangeState[tab].right = Math.max(rangeState[tab].left + MIN_SEL, pct);
        miniInst.update('none');
        aplicarZoom(tab, fechas);
    });
    document.addEventListener('mouseup', () => { dragging = null; });
    canvas.addEventListener('dblclick', () => {
        rangeState[tab] = { left: 0, right: 1 };
        miniInst.update('none');
        const chart = mainCharts[tab];
        if (chart) { chart.options.scales.x.min = undefined; chart.options.scales.x.max = undefined; chart.update('none'); }
    });
    canvas.addEventListener('mousemove', e => {
        const pct = getPct(e.clientX), { left, right } = rangeState[tab], tol = 0.02;
        canvas.style.cursor = (Math.abs(pct-left)<tol || Math.abs(pct-right)<tol) ? 'ew-resize'
            : (pct > left && pct < right) ? 'grab' : 'crosshair';
    });
    return miniInst;
}

// ═══════════════════════════════════════════════════════════════
// GRÁFICO PRINCIPAL
// ═══════════════════════════════════════════════════════════════
function instanciarMain(tab, data, paletaRGB, soloUna) {
    const cfg = VAR_CONFIG[tab];
    if (!data[tab]) return;
    const { fechas, valores } = data[tab];
    const isAnomalia = (tab === 'ATSM' || tab === 'ASSM');

    destruirChart(tab);
    const canvas = document.getElementById(`main_${tab}`);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.style.cursor = 'grab';
    canvas.onmousedown  = () => canvas.style.cursor = 'grabbing';
    canvas.onmouseup    = () => canvas.style.cursor = 'grab';
    canvas.onmouseleave = () => canvas.style.cursor = 'grab';

    const pluginFondo = {
        id: 'fondo_' + tab,
        beforeDraw(chart) {
            const { ctx: c, width, height } = chart;
            c.save(); c.fillStyle = '#ffffff'; c.fillRect(0, 0, width, height); c.restore();
        }
    };

    const chartInst = new Chart(ctx, {
        type: isAnomalia ? 'bar' : 'line',
        data: {
            labels: fechas,
            datasets: [{
                label: tab, data: valores,
                backgroundColor: isAnomalia ? (c) => (c.raw >= 0 ? 'rgba(255,0,0,0.75)' : 'rgba(0,0,255,0.75)') : 'transparent',
                borderColor:     isAnomalia ? (c) => (c.raw >= 0 ? 'red' : 'blue') : cfg.color,
                borderWidth: isAnomalia ? 1 : 1.5,
                fill: false, tension: isAnomalia ? 0 : 0.1,
                pointRadius: isAnomalia ? 0 : 1.5,
                pointBackgroundColor: isAnomalia ? undefined : cfg.color,
                barPercentage: isAnomalia ? 1.0 : undefined,
                categoryPercentage: isAnomalia ? 1.0 : undefined
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            interaction: { mode: 'index', intersect: false },
            layout: { padding: { left: 5, right: 15, top: 10, bottom: 0 } },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: c => `${c.parsed.y.toFixed(2)} ${cfg.unidad}` } },
                zoom: {
                    zoom: { drag: { enabled: false }, wheel: { enabled: false }, mode: 'x',
                        onZoomComplete({ chart }) { sincronizarRangesliderDesdeChart(chart); } },
                    pan: { enabled: true, mode: 'xy',
                        onPanComplete({ chart }) { sincronizarRangesliderDesdeChart(chart); } }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#000000', font: { size: 14 }, maxRotation: 0,
                        autoSkip: true, maxTicksLimit: 12,
                        callback: function(value, index, values) {
                            const label = this.getLabelForValue(value);
                            if (!label) return '';
                            const [anio, mes] = label.split('-');
                            const mesStr = MESES[parseInt(mes, 10) - 1] || '';
                            const prevIdx   = index > 0 ? values[index - 1].value : null;
                            const prevLabel = prevIdx !== null ? this.getLabelForValue(prevIdx) : null;
                            const prevAnio  = prevLabel ? prevLabel.split('-')[0] : null;
                            return (index === 0 || anio !== prevAnio) ? [mesStr, anio] : mesStr;
                        }
                    },
                    grid: { color: 'rgba(0,0,0,0.1)' }
                },
                y: {
                    min: cfg.yMin, max: cfg.yMax,
                    title: { display: true, text: cfg.unidad, color: '#000000', font: { size: 16, weight: 'bold' } },
                    ticks: { color: '#000000', font: { size: 14 } },
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
                        const v = chart.data.datasets[0].data[idx];
                        const f = chart.data.labels[idx];
                        const elVal = document.getElementById(`val_${tab}`);
                        const elFec = document.getElementById(`fecha_val_${tab}`);
                        if (elVal && !isNaN(v)) {
                            if (isAnomalia) {
                                formatearAnomalia(elVal, parseFloat(v));
                            } else {
                                elVal.textContent = parseFloat(v).toFixed(2);
                                elVal.style.color = ''; elVal.style.fontWeight = '';
                            }
                        }
                        if (elFec && f) elFec.textContent = f.split('-').reverse().join('-');
                    }
                }
            }
        }]
    });
    chartInst._tabKey = tab;
    mainCharts[tab]   = chartInst;
}

function sincronizarRangesliderDesdeChart(chart) {
    const xScale = chart.scales.x, labels = chart.data.labels, n = labels.length;
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
// BOTONES +/−/🏠
// ═══════════════════════════════════════════════════════════════
function botonesZoomHTML(tab) {
    return `
    <div style="position:absolute;top:6px;right:8px;display:flex;gap:3px;z-index:10;">
        <button onclick="zoomIn('${tab}')"    title="Zoom +" style="width:26px;height:26px;border:1px solid #ccc;border-radius:4px;background:#fff;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.15);">+</button>
        <button onclick="zoomOut('${tab}')"   title="Zoom -" style="width:26px;height:26px;border:1px solid #ccc;border-radius:4px;background:#fff;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.15);">−</button>
        <button onclick="zoomReset('${tab}')" title="Restablecer" style="width:26px;height:26px;border:1px solid #ccc;border-radius:4px;background:#fff;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 3px rgba(0,0,0,0.15);">🏠</button>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
// CREAR TARJETA HTML
// ═══════════════════════════════════════════════════════════════
function crearTarjetaHTML(tab, data, soloUna, estacionActual) {
    const cfg = VAR_CONFIG[tab];
    if (!cfg) return '';
    const isAnomalia = (tab === 'ATSM' || tab === 'ASSM');
    let ultVal = null, ultFecha = '';
    const vals = data[tab]?.valores || [], fecs = data[tab]?.fechas || [];
    for (let i = vals.length - 1; i >= 0; i--) {
        if (!isNaN(vals[i])) { ultVal = vals[i]; ultFecha = fecs[i]; break; }
    }
    const fechaFormateada = ultFecha ? ultFecha.split('-').reverse().join('-') : '';

    // Valor inicial con formato anomalía si corresponde
    let valorHTML = '—';
    if (ultVal !== null) {
        if (isAnomalia) {
            const pos = ultVal >= 0;
            const color = pos ? '#c0392b' : '#2980b9';
            valorHTML = `<span style="color:${color};font-weight:800;">${pos ? '+' : ''}${ultVal.toFixed(2)}</span>`;
        } else {
            valorHTML = ultVal.toFixed(2);
        }
    }

    const styleCard = !soloUna
        ? 'flex:1;display:flex;flex-direction:column;min-height:0;'
        : 'display:flex;flex-direction:row;height:100%;box-shadow:0 4px 6px rgba(0,0,0,0.1);';
    const styleBody = 'flex:1;display:flex;flex-direction:column;min-height:0;';
    const styleMain = 'flex:1;height:auto;min-height:0;';

    const sidebarHTML = soloUna ? `
    <div class="panel-lateral" style="width:250px;background:#2c3e50;color:white;padding:20px;display:flex;flex-direction:column;gap:15px;border-top-left-radius:8px;border-bottom-left-radius:8px;">
        <h4 style="margin:0 0 10px 0;font-size:16px;font-weight:normal;display:flex;align-items:center;justify-content:space-between;">Series temporales <span>📊</span></h4>
        <div style="font-size:13px;color:#bdc3c7;">Rango del eje Y (${cfg.unidad})</div>
        <div style="display:flex;gap:10px;">
            <div style="flex:1;"><label style="font-size:11px;color:#95a5a6;display:block;margin-bottom:4px;">Mínimo</label>
                <input type="number" id="y_min_${tab}" step="0.1" style="width:100%;padding:6px;box-sizing:border-box;background:#34495e;border:1px solid #7f8c8d;color:white;border-radius:4px;outline:none;"></div>
            <div style="flex:1;"><label style="font-size:11px;color:#95a5a6;display:block;margin-bottom:4px;">Máximo</label>
                <input type="number" id="y_max_${tab}" step="0.1" style="width:100%;padding:6px;box-sizing:border-box;background:#34495e;border:1px solid #7f8c8d;color:white;border-radius:4px;outline:none;"></div>
        </div>
        <button onclick="aplicarRangoY('${tab}')" style="background:#2980b9;color:white;border:none;padding:8px;cursor:pointer;border-radius:4px;font-weight:bold;">APLICAR</button>
        <button onclick="resetRangoY('${tab}')"   style="background:transparent;color:#3498db;border:1px solid #3498db;padding:8px;cursor:pointer;border-radius:4px;">RESTABLECER EJE Y</button>
        <hr style="border-top:1px solid #7f8c8d;border-bottom:none;width:100%;margin:15px 0;">
        <div style="font-size:13px;color:#bdc3c7;">Control de Vista</div>
        <button onclick="resetearZoomTab('${tab}')" style="background:rgba(231,76,60,0.1);color:#e74c3c;border:1px solid #e74c3c;padding:8px;cursor:pointer;border-radius:4px;font-weight:bold;">🔍 RESTABLECER VISTA</button>
        <hr style="border-top:1px solid #7f8c8d;border-bottom:none;width:100%;margin:15px 0;">
        <div style="font-size:13px;color:#bdc3c7;">Guardar figura</div>
        <button onclick="guardarPngSubventana('${estacionActual}','${tab}')" style="background:transparent;color:#bdc3c7;border:1px solid #7f8c8d;padding:8px;cursor:pointer;border-radius:4px;display:flex;align-items:center;justify-content:center;gap:8px;">🖼 GUARDAR COMO PNG</button>
    </div>` : '';

    const dateControlsHTML = soloUna ? `
    <div style="display:flex;align-items:center;justify-content:center;gap:10px;padding:8px 12px;border-top:1px solid #eee;background:#fdfdfd;">
        <label style="font-size:13px;font-weight:bold;color:#2c3e50;">Desde</label>
        <input type="date" id="fecha_desde_${tab}" onchange="aplicarRangoFechas('${tab}')" style="padding:5px 8px;border:1px solid #dcdde1;border-radius:4px;font-size:13px;color:#2c3e50;outline:none;">
        <label style="font-size:13px;font-weight:bold;color:#2c3e50;">Hasta</label>
        <input type="date" id="fecha_hasta_${tab}" onchange="aplicarRangoFechas('${tab}')" style="padding:5px 8px;border:1px solid #dcdde1;border-radius:4px;font-size:13px;color:#2c3e50;outline:none;">
        <button onclick="resetearZoomTab('${tab}')" style="padding:5px 12px;background:#e74c3c;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">✕ Limpiar</button>
    </div>` : '';

    return `
    <div class="chart-card ${soloUna ? 'solo' : ''}" id="card_${tab}" style="${styleCard}">
        ${sidebarHTML}
        <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;background:white;border-top-right-radius:8px;border-bottom-right-radius:8px;">
            <div class="chart-card-header">
                <div class="chart-card-title">
                    <div class="chart-dot" style="background:${cfg.color};"></div>
                    ${cfg.titulo}
                </div>
                <div class="chart-card-valor" style="display:flex;align-items:baseline;gap:12px;">
                    <span id="fecha_val_${tab}" style="font-size:18px;color:#000;font-weight:normal;border-right:1px solid #bdc3c7;padding-right:12px;">${fechaFormateada}</span>
                    <div><span id="val_${tab}">${valorHTML}</span>
                    <span class="chart-card-unidad">${cfg.unidad}</span></div>
                </div>
            </div>
            <div class="chart-card-body" style="${styleBody}">
                <div class="chart-main-wrap" style="${styleMain};position:relative;">
                    <canvas id="main_${tab}"></canvas>
                    ${botonesZoomHTML(tab)}
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
    const lim = LIMITES_POR_ESTACION[estacionActual] || LIMITES_POR_ESTACION['DEFAULT'];
    VAR_CONFIG.TSM.yMin  = lim.tsmMin;  VAR_CONFIG.TSM.yMax  = lim.tsmMax;
    VAR_CONFIG.ATSM.yMin = lim.atsmMin; VAR_CONFIG.ATSM.yMax = lim.atsmMax;
    VAR_CONFIG.SSM.yMin  = lim.ssmMin;  VAR_CONFIG.SSM.yMax  = lim.ssmMax;
    VAR_CONFIG.ASSM.yMin = lim.assmMin; VAR_CONFIG.ASSM.yMax = lim.assmMax;

    const scroll = document.getElementById('graficosScroll');
    if (!scroll) return;

    const tabs    = currentTab === 'TODOS' ? ['TSM','ATSM','SSM','ASSM'] : [currentTab];
    const soloUna = tabs.length === 1;

    ['TSM','ATSM','SSM','ASSM'].forEach(t => { destruirChart(t); rangeState[t] = { left: 0, right: 1 }; });
    scroll.innerHTML = tabs.map(t => crearTarjetaHTML(t, data, soloUna, estacionActual)).join('');
    scroll.style.display = 'flex'; scroll.style.flexDirection = 'column';
    scroll.style.overflowY = 'hidden'; scroll.style.flex = '1'; scroll.style.gap = '8px';

    let btnGlobal = document.getElementById('btn-reset-global');
    if (!btnGlobal) {
        btnGlobal = document.createElement('button');
        btnGlobal.id = 'btn-reset-global';
        btnGlobal.innerHTML = '🔍 RESTABLECER ZOOM';
        btnGlobal.onclick = window.resetearZoom;
        btnGlobal.style.cssText = 'position:absolute;top:-38px;right:15px;z-index:9999;background:white;color:#e74c3c;border:1px solid #e74c3c;padding:6px 15px;cursor:pointer;border-radius:4px;font-weight:bold;font-size:11px;box-shadow:0 2px 5px rgba(0,0,0,0.15);';
        scroll.parentElement.style.position = 'relative';
        scroll.parentElement.style.overflow = 'visible';
        scroll.parentElement.appendChild(btnGlobal);
    }
    btnGlobal.style.display = soloUna ? 'none' : 'block';

    requestAnimationFrame(() => {
        tabs.forEach(t => instanciarMain(t, data, paletaRGB, soloUna));
        requestAnimationFrame(() => {
            tabs.forEach(t => {
                const wrapEl = document.getElementById(`rs_${t}`);
                if (wrapEl) crearRangeslider(wrapEl, t, data, paletaRGB, true);
            });
        });
    });

    // Metadata: TSM/SSM negro, ATSM/ASSM con color y símbolo +
    const act = (id, vals) => {
        const v = ultimoValor(vals || []), el = document.getElementById(id);
        if (!el) return;
        if (v === null) { el.textContent = '—'; el.style.color = ''; el.style.fontWeight = ''; return; }
        el.textContent = v.toFixed(2); el.style.color = ''; el.style.fontWeight = '';
    };
    const actAnom = (id, vals) => {
        const v = ultimoValor(vals || []);
        formatearAnomalia(document.getElementById(id), v);
    };
    act('meta-tsm-val',      data.TSM?.valores);
    actAnom('meta-atsm-val', data.ATSM?.valores);
    act('meta-ssm-val',      data.SSM?.valores);
    actAnom('meta-assm-val', data.ASSM?.valores);
}

// ═══════════════════════════════════════════════════════════════
// RESET ZOOM GLOBAL
// ═══════════════════════════════════════════════════════════════
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

export function resetearZoom() { window.resetearZoom(); }

// ═══════════════════════════════════════════════════════════════
// EXPORTACIÓN
// ═══════════════════════════════════════════════════════════════
export function exportarGrafico(formato, estacionActual, currentTab) {
    const tabs = currentTab === 'TODOS' ? ['TSM','ATSM','SSM','ASSM'] : [currentTab];
    const inst = mainCharts[tabs[0]];
    if (!inst) return;
    const canvas = inst.canvas, nombre = `${currentTab}_${estacionActual}`;
    const origRatio = inst.options.devicePixelRatio || window.devicePixelRatio;
    inst.options.devicePixelRatio = 4;
    inst.update('none');
    setTimeout(() => {
        const mime = formato === 'jpeg' ? 'image/jpeg' : 'image/png';
        const dataUrl = canvas.toDataURL(mime, 1.0);
        if (formato === 'print') {
            const w = window.open('','','width=1000,height=700');
            w.document.write(`<html><body style="text-align:center"><img src="${dataUrl}" style="max-width:100%"></body></html>`);
            w.document.close(); w.focus(); setTimeout(() => { w.print(); w.close(); }, 500);
        } else if (formato === 'pdf') {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation:'landscape' });
            const p = pdf.getImageProperties(dataUrl);
            const pw = pdf.internal.pageSize.getWidth() - 20;
            pdf.addImage(dataUrl, formato==='jpeg'?'JPEG':'PNG', 10, 15, pw, p.height*pw/p.width);
            pdf.save(`${nombre}.pdf`);
        } else {
            const a = document.createElement('a'); a.download = `${nombre}.${formato}`; a.href = dataUrl; a.click();
        }
        inst.options.devicePixelRatio = origRatio; inst.update('none');
    }, 300);
}