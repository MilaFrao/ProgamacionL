// ============================================
// grafico_consola.js - Versión corregida
// Parser de programación lineal
// ============================================

console.log("✅ grafico_consola.js cargado");

// ============================================
// VARIABLES GLOBALES
// ============================================

let irestricciones = [];
let CostoT = [];
let Res_Sin_Signo = [];
let vector_inecuacion = [];
let CoefX1 = [];
let CoefX2 = [];
let terminosX1 = [];
let terminosX2 = [];
let TerminoX1FunObj = 0;
let TerminoX2FunObj = 0;
let X1_FunObj;
let X2_FunObj;
let zValue = [];

let restricciones = [];
let equivalenciasRestricciones = [];
let resultadoRestricciones = [];

// ============================================
// ENTRADAS DE EJEMPLO
// ============================================

let entrada = `
max = 22x1 + 45x2
1x1 - 3x2 <= 42
-8x2 <= 40
0.5x1 + 1x2 <= 15
`;

let entradaMin = `
min = 2000x1 + 2000x2
1x1 + 2x2 >= 80
3x1 + 2x2 >= 160
5x1 + 2x2 >= 200
`;

let defaultInput = `
max = 1x1 + 2x2
1x1 + 3x2 >= 11
2x1 + 1x2 >= 9
`;

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

function parsearProblema(texto) {

    // ============================================
    // RESETEAR VARIABLES
    // ============================================

    restricciones = [];
    equivalenciasRestricciones = [];
    resultadoRestricciones = [];
    terminosX1 = [];
    terminosX2 = [];

    // ============================================
    // LIMPIAR TEXTO
    // ============================================

    let partes = texto
        .trim()
        .split('\n')
        .map(linea => linea.trim())
        .filter(linea => linea !== '');

    console.log("📌 Partes detectadas:");
    console.log(partes);

    // ============================================
    // RECORRER LÍNEAS
    // ============================================

    for (let i = 0; i < partes.length; i++) {

        let linea = partes[i];

        console.log(`\n🔹 Procesando línea ${i + 1}: ${linea}`);

        // ============================================
        // FUNCIÓN OBJETIVO
        // ============================================

        if (i === 0) {

            procesarFuncionObjetivo(linea);

        } else {

            procesarRestriccion(linea);

        }
    }

    // ============================================
    // RESULTADOS
    // ============================================

    console.log("\n==============================");
    console.log("✅ PARSEO FINALIZADO");
    console.log("==============================");

    console.log("Restricciones:", restricciones);
    console.log("Equivalencias:", equivalenciasRestricciones);
    console.log("Resultados:", resultadoRestricciones);

    console.log("\n📌 Función objetivo:");
    console.log("X1 =", TerminoX1FunObj);
    console.log("X2 =", TerminoX2FunObj);

    console.log("\n📌 Coeficientes:");
    console.log("X1:", terminosX1);
    console.log("X2:", terminosX2);
}

// ============================================
// PROCESAR FUNCIÓN OBJETIVO
// ============================================

function procesarFuncionObjetivo(linea) {

    // Detectar MAX o MIN
    const tipo = linea.includes("max") ? "max" : "min";

    console.log("🎯 Tipo objetivo:", tipo);

    // Limpiar
    linea = linea
        .replace("max =", "")
        .replace("min =", "")
        .trim();

    // Regex para detectar coeficientes
    const regexX1 = /([+-]?\d*\.?\d*)x1/;
    const regexX2 = /([+-]?\d*\.?\d*)x2/;

    const matchX1 = linea.match(regexX1);
    const matchX2 = linea.match(regexX2);

    TerminoX1FunObj = convertirCoeficiente(matchX1?.[1]);
    TerminoX2FunObj = convertirCoeficiente(matchX2?.[1]);

    restricciones.push([
        TerminoX1FunObj,
        TerminoX2FunObj
    ]);

    console.log("✅ Función objetivo procesada");
}

// ============================================
// PROCESAR RESTRICCIÓN
// ============================================

function procesarRestriccion(linea) {

    // ============================================
    // DETECTAR SIGNO
    // ============================================

    let equivalencia = "";

    if (linea.includes("<=")) {
        equivalencia = "<=";
    }
    else if (linea.includes(">=")) {
        equivalencia = ">=";
    }
    else if (linea.includes("=")) {
        equivalencia = "=";
    }
    else {
        console.error("❌ Restricción inválida:", linea);
        return;
    }

    // ============================================
    // DIVIDIR
    // ============================================

    const partes = linea.split(equivalencia);

    if (partes.length !== 2) {
        console.error("❌ Error al dividir restricción");
        return;
    }

    const izquierda = partes[0].trim();
    const derecha = partes[1].trim();

    // ============================================
    // RESULTADO
    // ============================================

    const resultado = parseFloat(derecha);

    // ============================================
    // COEFICIENTES
    // ============================================

    const regexX1 = /([+-]?\d*\.?\d*)x1/;
    const regexX2 = /([+-]?\d*\.?\d*)x2/;

    const matchX1 = izquierda.match(regexX1);
    const matchX2 = izquierda.match(regexX2);

    const coeficienteX1 = convertirCoeficiente(matchX1?.[1]);
    const coeficienteX2 = convertirCoeficiente(matchX2?.[1]);

    // ============================================
    // GUARDAR
    // ============================================

    restricciones.push([
        coeficienteX1,
        coeficienteX2
    ]);

    equivalenciasRestricciones.push(equivalencia);

    resultadoRestricciones.push(resultado);

    terminosX1.push(coeficienteX1);
    terminosX2.push(coeficienteX2);

    console.log("✅ Restricción procesada:");
    console.log({
        coeficienteX1,
        coeficienteX2,
        equivalencia,
        resultado
    });
}

// ============================================
// CONVERTIR COEFICIENTE
// ============================================

function convertirCoeficiente(valor) {

    // x1 => 1
    if (valor === "" || valor === "+") {
        return 1;
    }

    // -x1 => -1
    if (valor === "-") {
        return -1;
    }

    // null => 0
    if (valor === undefined) {
        return 0;
    }

    return parseFloat(valor);
}

// ============================================
// EJECUTAR PRUEBA
// ============================================

parsearProblema(entradaMin);