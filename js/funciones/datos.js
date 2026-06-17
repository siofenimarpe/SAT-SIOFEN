/**
 * js/funciones/datos.js - Extractor de datos multi-fuente
 */

// URL del repositorio GitHub (TSM + ATSM)
//const GITHUB_TSM_URL = 'https://raw.githubusercontent.com/victorfalla/BASE_DE_DATOS/main/Muelles_TSM_ATSM_base_datos.xlsx';

const PATH_EXCEL_TEMPERATURA = 'data/Muelles_TSM_ATSM_base_datos.xlsx'; 
const PATH_EXCEL_SALINIDAD   = 'data/LAB_SSM_ASSM_base_datos_diario.xlsx'; // Cambia esto cuando tengas el archivo real de salinidad

export async function cargarPaleta(opacidad) {
    try {
        const response = await fetch("Paleta_colores/paleta_salinidad.txt");
        const texto = await response.text();
        return texto.split(/\r?\n/).filter(l => l.trim() !== '').map(l => {
            const rgb = l.trim().split(/\s+/).map(n => Math.floor(parseFloat(n) * 255));
            return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${opacidad})`;
        });
    } catch(e) {
        return [`rgba(0,0,255,${opacidad})`, `rgba(255,0,0,${opacidad})`];
    }
}

export async function cargarPaletaCientifica(nombreArchivo) {
    try {
        const response = await fetch(`Paleta_colores/${nombreArchivo}`);
        const texto = await response.text();
        return texto.split(/\r?\n/).filter(l => l.trim() !== '').map(l => {
            const rgb = l.trim().split(/\s+/).map(n => Math.floor(parseFloat(n) * 255));
            return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
        });
    } catch(e) {
        console.error("Error cargando paleta", nombreArchivo);
        return null;
    }
}

/**
 * Cargar datos desde GitHub (TSM + ATSM) y TSM_is.xlsx local (SSM)
 * @param {number} colIndexTSM  Columna en GitHub xlsx (YEAR=0,MONTH=1,DAY=2, estaciones desde 3)
 * @param {number} colIndexSSM  Columna en TSM_is.xlsx (estructura legada)
 */


export async function cargarDatosExcel(colIndexTSM, colIndexSSM) {
    // 1. LEER ARCHIVO DE TEMPERATURA LOCAL (TSM y ATSM)
    const resTSM = await fetch(PATH_EXCEL_TEMPERATURA); 
    const abTSM  = await resTSM.arrayBuffer();
    const wbTSM  = XLSX.read(abTSM, { type: 'array' });

    const nombreHojaTSM  = wbTSM.SheetNames.find(n => n.trim().toUpperCase() === 'TSM')  || wbTSM.SheetNames[0];
    const nombreHojaATSM = wbTSM.SheetNames.find(n => n.trim().toUpperCase() === 'ATSM') || wbTSM.SheetNames[1];

    const hTSM  = XLSX.utils.sheet_to_json(wbTSM.Sheets[nombreHojaTSM],  { header: 1 });
    const hATSM = XLSX.utils.sheet_to_json(wbTSM.Sheets[nombreHojaATSM], { header: 1 });

    // 2. LEER ARCHIVO DE SALINIDAD LOCAL (SSM y ASSM)
    const resSSM = await fetch(PATH_EXCEL_SALINIDAD); 
    const abSSM  = await resSSM.arrayBuffer();
    const wbSSM  = XLSX.read(abSSM, { type: 'array' });

    const nombreHojaSSM  = wbSSM.SheetNames.find(n => n.trim().toUpperCase() === 'SSM')  || wbSSM.SheetNames[0];
    const nombreHojaASSM = wbSSM.SheetNames.find(n => n.trim().toUpperCase() === 'ASSM') || wbSSM.SheetNames[1];

    const hSSM  = XLSX.utils.sheet_to_json(wbSSM.Sheets[nombreHojaSSM],  { header: 1 });
    const hASSM = XLSX.utils.sheet_to_json(wbSSM.Sheets[nombreHojaASSM], { header: 1 });

    return {
        TSM:  extraerExcelNuevo(hTSM,  colIndexTSM),
        ATSM: extraerExcelNuevo(hATSM, colIndexTSM),
        SSM:  extraerExcelNuevo(hSSM,  colIndexSSM), // Datos reales del archivo de salinidad
        ASSM: extraerExcelNuevo(hASSM, colIndexSSM)  // Datos reales del archivo de anomalía de salinidad
    };
}

// Extractor para estructura nueva: YEAR=0, MONTH=1, DAY=2, datos desde col 3
function extraerExcelNuevo(d, c) {
    const fechas = [], valores = [];
    for (let i = 1; i < d.length; i++) {
        const fila = d[i];
        if (fila[c] === undefined || fila[c] === null || fila[c] === '') continue;
        const year  = parseInt(fila[0]);
        const month = parseInt(fila[1]);
        const day   = parseInt(fila[2]);
        if (isNaN(year) || isNaN(month) || isNaN(day)) continue;
        fechas.push(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`);
        valores.push(parseFloat(fila[c]));
    }
    return { fechas, valores };
}

// Extractor legado para TSM_is.xlsx (SSM)
function extraerExcelLegado(d, c) {
    const fechas = [], valores = [];
    for (let i = 1; i < d.length; i++) {
        if (d[i][c] !== undefined && d[i][1] >= 2025) {
            fechas.push(`${d[i][1]}-${String(d[i][2]).padStart(2,'0')}-${String(d[i][7]).padStart(2,'0')}`);
            valores.push(parseFloat(d[i][c]));
        }
    }
    return { fechas, valores };
}

export async function cargarDatosBackend(nombreEstacion) {
    const url = `procesar.php?estacion=${encodeURIComponent(nombreEstacion)}`;
    const response = await fetch(url);
    const datos = await response.json();
    if (datos.error) throw new Error(`Backend error: ${datos.error}`);
    return datos;
}