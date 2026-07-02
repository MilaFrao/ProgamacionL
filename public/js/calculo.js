// ============================================
// calculo.js - Motor Simplex Refactorizado
// ============================================

console.log("calculo.js cargado");

// ============================================
// CONFIGURACIÓN
// ============================================

const EPSILON = 1e-8;

// ============================================
// ESTADO GLOBAL CONTROLADO
// ============================================

function createSimplexState() {
    return {
        maxIter: 50,

        iobj: undefined,
        irows: [],

        variables: [],
        pivots: [],

        target: undefined,

        rVector: [],
        matrixA: [],

        costVector: [],
        p1CostVector: [],

        basicVars: [],
        basis: [],
        cBFS: [],

        dim: [],

        rCost: [],
        minmaxRCost: undefined,
        minmaxRCostIndex: undefined,

        ratio: [],
        leavingIndex: undefined,

        kount: 1,

        objZ: 0,

        basicKount: 0,
        nonBasicKount: 0,
        artificialKount: 0,

        unbounded: false,
        
        // PRIORIDAD 2: Banderas para múltiples soluciones
        multipleOptimal: false,
        alternativeVariables: [],

        // PRIORIDAD 3: Bandera para degeneración
        degenerateIterations: 0,
        isDegenerateProblem: false,

        history: [],
        simplexSteps: []
    };
}

let $ = createSimplexState();

// ============================================
// UTILIDADES
// ============================================

function resetState() {
    $ = createSimplexState();
}

function checkDecimals(n) {
    if (Math.abs(n) < EPSILON) return 0;

    const decimals = `${n}`.search(/\.\d{6,}/gmi);

    if (decimals !== -1) {
        return Number(n.toFixed(5));
    }

    return Number(n);
}

function buildObjectiveString(data) {

    const vars =
        Object.entries(data.objetivo)

    const expr =
        vars.map(([k, v]) =>
            `${v}${k}`
        ).join(' + ');

    return `${data.tipo} = ${expr}`;
}

function buildConstraintStrings(data) {

    return data.restricciones.map(r => {

        const expr =
            Object.entries(r.coeffs)
                .map(([k, v]) =>
                    `${v}${k}`
                )
                .join(' + ');

        return `${expr} ${r.signo} ${r.rhs}`;
    });
}

// ============================================
// FRACCIONES
// ============================================

function fractionToDecimal(fraction) {

    const partes = fraction.split('/');

    const numerador = parseFloat(partes[0]);
    const denominador = parseFloat(partes[1]);

    if (
        isNaN(numerador) ||
        isNaN(denominador) ||
        denominador === 0
    ) {
        throw new Error(`Fracción inválida: ${fraction}`);
    }

    return numerador / denominador;
}

// ============================================
// PARSER
// ============================================

function findTerms(row) {

    const terms =
        row.match(/[+-]?\s*\d*\.?\d*(?:\/\d+)?[a-z]\d*/gi);

    if (!terms) {
        throw new Error(`No se pudieron interpretar términos en: ${row}`);
    }

    return terms.map(term => {

        term = term.trim();

        const fraction = term.match(/-?\d+\/\d+/);

        if (fraction) {

            const decimal =
                fractionToDecimal(fraction[0]);

            term = term.replace(fraction[0], decimal);
        }

        return term;
    });
}

function findCoeff(rowTerms) {

    let vars = {};

    rowTerms.forEach(term => {

        const match =
            /([+-]?\s*\d*\.?\d*)([a-z]\d*)/i.exec(term);

        if (!match) {
            throw new Error(`Término inválido: ${term}`);
        }

        let coeffText = match[1].replace(/\s/g, '');
        const variable = match[2];

        let coeff;

        if (
            coeffText === '' ||
            coeffText === '+'
        ) {
            coeff = 1;
        }
        else if (coeffText === '-') {
            coeff = -1;
        }
        else {
            coeff = parseFloat(coeffText);
        }

        if (isNaN(coeff)) {
            throw new Error(`Coeficiente inválido en: ${term}`);
        }

        if (!$.variables.includes(variable)) {
            $.variables.push(variable);
        }

        vars[variable] = coeff;
    });

    return vars;
}

function parseObj(iobj) {

    const partes = iobj.split('=');

    if (partes.length !== 2) {
        throw new Error("Función objetivo inválida");
    }

    const target =
        partes[0].trim().toLowerCase();

    if (
        target !== 'max' &&
        target !== 'min'
    ) {
        throw new Error("La función objetivo debe comenzar con max o min");
    }

    const row = partes[1];

    const objvalue =
        findCoeff(findTerms(row));

    return {
        target,
        objvalue
    };
}

function parseConstraint(irows) {

    let signs = [];

    const rows = irows.map(row => {

        if (row.includes('<=')) {
            signs.push('le');
            return row.split('<=');
        }

        if (row.includes('>=')) {
            signs.push('ge');
            return row.split('>=');
        }

        if (row.includes('=')) {
            signs.push('e');
            return row.split('=');
        }

        throw new Error(`Restricción inválida: ${row}`);
    });

    const rVector = rows.map(row => {

        const value =
            parseFloat(row[1].trim());

        if (isNaN(value)) {
            throw new Error(`Valor RHS inválido: ${row[1]}`);
        }

        return value;
    });

    const rowTerms =
        rows.map(row => findTerms(row[0]));

    const coeffDict =
        rowTerms.map(row => findCoeff(row));

    return {
        rVector,
        coeffDict,
        signs
    };
}

// ============================================
// MATRIZ
// ============================================

function getCostVector(obj) {

    $.variables.forEach(v => {

        if (v in obj) {
            $.costVector.push(obj[v]);
        }
        else {
            $.costVector.push(0);
        }
    });
}

function findBNegative(b) {

    let arr = [];

    b.forEach((v, i) => {

        // PRIORIDAD 5: Usar EPSILON para comparar valores flotantes
        if (v < -EPSILON) {
            arr.push(i);
        }
    });

    return arr;
}

function removeBNegative(
    bIndex,
    cDict,
    rVector
) {

    if (bIndex.length === 0) return;

    bIndex.forEach(i => {

        Object.keys(cDict[i]).forEach(k => {
            cDict[i][k] *= -1;
        });

        rVector[i] *= -1;
    });
}

function assignZeroCoeff(cDict) {

    cDict.forEach((row, i) => {

        $.variables.forEach(v => {

            if (!(v in row)) {
                cDict[i][v] = 0;
            }
        });
    });
}

function formMatrixA(cDict) {

    return cDict.map(row =>
        $.variables.map(v => row[v])
    );
}

function findRemaining(matrix, i) {

    return matrix
        .slice(0, i)
        .concat(matrix.slice(i + 1));
}

// ============================================
// VARIABLES AUXILIARES
// ============================================

function addVars(type, i) {

    const rowWith1 = [
        ...$.matrixA[i],
        type === 'S' ? -1 : 1
    ];

    $.variables.push(`${type}${i}`);

    const remainingRows =
        findRemaining($.matrixA, i);

    let newRemainingRows =
        remainingRows.map(row => [...row, 0]);

    newRemainingRows.splice(i, 0, rowWith1);

    $.matrixA = newRemainingRows;

    if (type !== 'R') {
        $.costVector.push(0);
    }

    return rowWith1.length - 1;
}

function addSlackSurplusArtificial(signs) {

    signs.forEach((sign, i) => {

        if (sign === 'le') {

            const pivot = addVars('H', i);

            $.pivots.push(pivot);

            return;
        }

        if (sign === 'ge') {

            addVars('S', i);

            const pivot = addVars('R', i);

            $.pivots.push(pivot);

            return;
        }

        if (sign === 'e') {

            const pivot = addVars('R', i);

            $.pivots.push(pivot);
        }
    });
}

// ============================================
// FORMA ESTÁNDAR
// ============================================

function standardForm(iobj, irows) {

    const {
        target,
        objvalue
    } = parseObj(iobj);

    let {
        rVector,
        coeffDict,
        signs
    } = parseConstraint(irows);

    getCostVector(objvalue);

    const bNegativeIndex =
        findBNegative(rVector);

    removeBNegative(
        bNegativeIndex,
        coeffDict,
        rVector
    );

    assignZeroCoeff(coeffDict);

    $.matrixA =
        formMatrixA(coeffDict);

    $.basicKount =
        $.variables.length;

    addSlackSurplusArtificial(signs);

    $.nonBasicKount =
        $.variables.length -
        $.basicKount;

    return {
        target,
        rVector
    };
}

// ============================================
// SIMPLEX
// ============================================

function getPhase1CostVector() {

    return $.variables.map(v => {

        if (v.includes('R')) {
            return 1;
        }

        return 0;
    });
}

function getBFS() {

    let arr =
        $.variables.map(v => 0);

    $.pivots.forEach((p, i) => {

        arr[p] = $.rVector[i];
    });

    return arr;
}

function dotP(v1, v2) {

    if (v1.length !== v2.length) {
        throw new Error(
            "Vectores incompatibles"
        );
    }

    let s = 0;

    v1.forEach((q, i) => {
        s += q * v2[i];
    });

    return checkDecimals(s);
}

function vDivide(v1, v2) {

    if (v1.length !== v2.length) {
        throw new Error(
            "Vectores incompatibles"
        );
    }

    return v1.map((q, i) => {

        if (Math.abs(v2[i]) < EPSILON) {
            return Infinity;
        }

        return q / v2[i];
    });
}

function vSubtract(v1, v2) {

    if (v1.length !== v2.length) {
        throw new Error(
            "Vectores incompatibles"
        );
    }

    return v1.map((q, i) =>
        checkDecimals(q - v2[i])
    );
}

function getCJBar(
    col,
    cVector,
    basis
) {

    let p = [];

    for (let i = 0; i < $.dim[0]; i++) {
        p.push($.matrixA[i][col]);
    }

    return checkDecimals(
        cVector[col] -
        dotP(p, basis)
    );
}

function findRCost(cVector) {

    let cjBar = [];

    for (let j = 0; j < $.dim[1]; j++) {

        cjBar.push(
            getCJBar(
                j,
                cVector,
                $.basis
            )
        );
    }

    return cjBar;
}

function getBasicVars() {

    return $.pivots.map(p =>
        $.variables[p]
    );
}

function getBasis(cVector) {

    return $.pivots.map(p =>
        cVector[p]
    );
}

function getDim() {

    const m = $.rVector.length;
    const n = $.variables.length;

    return [m, n];
}

function findLeavingVar(col) {

    let p = [];

    for (let i = 0; i < $.dim[0]; i++) {
        p.push($.matrixA[i][col]);
    }

    $.ratio =
        vDivide($.rVector, p);

    const filteredRatio =
        $.ratio.filter(q =>
            q > EPSILON &&
            q !== Infinity
        );

    if (filteredRatio.length === 0) {

        $.unbounded = true;

        return -1;
    }

    const minRatio =
        Math.min(...filteredRatio);

    // PRIORIDAD 3: Detectar degeneración
    if (Math.abs(minRatio) < EPSILON) {
        $.degenerateIterations++;
        $.isDegenerateProblem = true;
    }

    // PRIORIDAD 4: Regla de Bland
    // Si hay empates, elegir el índice MENOR
    let candidates = [];

    for (let i = 0; i < $.ratio.length; i++) {
        if (Math.abs($.ratio[i] - minRatio) < EPSILON) {
            candidates.push(i);
        }
    }

    return candidates.length > 0 ? Math.min(...candidates) : -1;
}

function rowOperation(row, col) {

    const element =
        $.matrixA[row][col];

    $.matrixA[row].forEach((q, i) => {

        $.matrixA[row][i] =
            checkDecimals(q / element);
    });

    $.rVector[row] =
        checkDecimals(
            $.rVector[row] / element
        );

    const remainingRows =
        findRemaining($.matrixA, row);

    const rRemaining =
        findRemaining($.rVector, row);

    const pivotRow =
        $.matrixA[row];

    const rPivot =
        $.rVector[row];

    $.matrixA =
        remainingRows.map((r, i) => {

            const multiplier =
                r[col];

            const newRow =
                pivotRow.map(q =>
                    q * multiplier
                );

            rRemaining[i] =
                checkDecimals(
                    rRemaining[i] -
                    rPivot * multiplier
                );

            return vSubtract(r, newRow);
        });

    $.matrixA.splice(row, 0, pivotRow);

    $.rVector = rRemaining;

    $.rVector.splice(row, 0, rPivot);
}

function updatePivot(row, col) {

    $.pivots[row] = col;
}

// PRIORIDAD 4: Validar que la base sea correcta
function validateBasis() {

    // Verificar que cada variable básica forma una columna unitaria
    for (let i = 0; i < $.pivots.length; i++) {
        
        const col = $.pivots[i];
        const var_name = $.variables[col];

        // La columna debe tener 1 en la fila i
        if (Math.abs($.matrixA[i][col] - 1) > EPSILON) {
            throw new Error(
                `Base inválida: variable ${var_name} debe tener 1 en fila ${i}, pero tiene ${$.matrixA[i][col]}`
            );
        }

        // La columna debe tener 0 en todas las otras filas
        for (let j = 0; j < $.matrixA.length; j++) {
            
            if (i !== j) {
                
                if (Math.abs($.matrixA[j][col]) > EPSILON) {
                    throw new Error(
                        `Base inválida: variable ${var_name} debe tener 0 en fila ${j}, pero tiene ${$.matrixA[j][col]}`
                    );
                }
            }
        }
    }
}

function containsArtificial() {

    return $.basicVars.some(b =>
        b.includes('R')
    );
}

function findTargetRCost(
    target,
    rCost
) {

    if (target === 'min') {

        const min =
            Math.min(...rCost);

        if (min < -EPSILON) {
            return min;
        }

        return null;
    }

    const max =
        Math.max(...rCost);

    if (max > EPSILON) {
        return max;
    }

    return null;
}

function getSoln(v) {

    return dotP(v, $.cBFS);
}

function checkHistory() {

    const s = JSON.stringify({
        entering: $.minmaxRCostIndex,
        leaving: $.leavingIndex,
        z: $.objZ
    });

    if ($.history.includes(s)) {
        return false;
    }

    $.history.push(s);

    return true;
}

function saveSimplexStep(phase) {

    $.simplexSteps.push({
        phase,
        iteration: $.kount,
        variables: [...$.variables],
        basicVars: [...$.basicVars],
        pivots: [...$.pivots],
        matrixA: $.matrixA.map(r => [...r]),
        rhs: [...$.rVector],
        basis: [...$.basis],
        cBFS: [...$.cBFS],
        rCost: [...$.rCost],
        ratio: [...$.ratio],
        entering: $.minmaxRCostIndex,
        leaving: $.leavingIndex,
        objective: $.objZ
    });
}

// ============================================
// ITERACIÓN SIMPLEX
// ============================================

function simplex(phase) {

    $.basis =
        phase === 1
            ? getBasis($.p1CostVector)
            : getBasis($.costVector);

    $.cBFS = getBFS();

    $.objZ =
        phase === 1
            ? getSoln($.p1CostVector)
            : getSoln($.costVector);

    $.rCost =
        phase === 1
            ? findRCost($.p1CostVector)
            : findRCost($.costVector);

    $.minmaxRCost =
        phase === 1
            ? Math.min(...$.rCost)
            : findTargetRCost(
                $.target,
                $.rCost
            );

    if (!$.minmaxRCost) {
        return false;
    }

    // PRIORIDAD 4: Regla de Bland para variable entrante
    // Si hay empates en costos reducidos, elegir el índice MENOR
    let enteringCandidates = [];

    for (let j = 0; j < $.rCost.length; j++) {
        if (Math.abs($.rCost[j] - $.minmaxRCost) < EPSILON) {
            enteringCandidates.push(j);
        }
    }

    $.minmaxRCostIndex =
        enteringCandidates.length > 0 
            ? Math.min(...enteringCandidates) 
            : $.rCost.indexOf($.minmaxRCost);

    $.leavingIndex =
        findLeavingVar(
            $.minmaxRCostIndex
        );

    if ($.leavingIndex === -1) {
        return false;
    }

    const historyNotRepeat =
        checkHistory();

    if (!historyNotRepeat) {
        return false;
    }

    rowOperation(
        $.leavingIndex,
        $.minmaxRCostIndex
    );

    updatePivot(
        $.leavingIndex,
        $.minmaxRCostIndex
    );

    // PRIORIDAD 4: Validar que la base sea correcta después del pivote
    validateBasis();

    saveSimplexStep(phase);

    return true;
}

// ============================================
// FASE 1
// ============================================

function removeArtificial() {

    // PRIORIDAD 1: Detectar y eliminar filas redundantes
    let redundantRows = [];

    // Hacer pivotes para que variables artificiales salgan de la base
    let basicArtificialRows = [];

    $.pivots.forEach((pivot, row) => {
        if ($.variables[pivot].includes('R')) {
            basicArtificialRows.push({ row, col: pivot });
        }
    });

    // Para cada variable artificial que sea básica
    for (const { row } of basicArtificialRows) {
        
        let foundPivot = false;

        for (let col = 0; col < $.dim[1]; col++) {

            if (Math.abs($.matrixA[row][col]) > EPSILON) {

                if (!$.variables[col].includes('R')) {

                    rowOperation(row, col);
                    updatePivot(row, col);

                    foundPivot = true;
                    break;
                }
            }
        }

        // Si no se pudo pivotar, la fila es redundante
        if (!foundPivot) {
            redundantRows.push(row);
        }
    }

    // PRIORIDAD 1: Eliminar filas redundantes
    // Ordenar de mayor a menor para eliminar sin afectar índices
    redundantRows.sort((a, b) => b - a);

    redundantRows.forEach(rowIndex => {
        $.matrixA.splice(rowIndex, 1);
        $.rVector.splice(rowIndex, 1);
        $.pivots.splice(rowIndex, 1);
    });

    // Eliminar columnas de variables artificiales
    let artificialIndex = [];

    $.variables =
        $.variables.filter((v, i) => {

            if (v.includes('R')) {

                artificialIndex.push(i);

                return false;
            }

            return true;
        });

    // Ajustar los índices de pivotes (solo cambian índices de COLUMNAS)
    artificialIndex.forEach(i => {

        $.pivots =
            $.pivots.map(p => {

                if (p >= i) {
                    return p - 1;
                }

                return p;
            });
    });

    $.cBFS =
        $.cBFS.filter((q, i) =>
            !artificialIndex.includes(i)
        );

    $.costVector =
        $.costVector.filter((q, i) =>
            !artificialIndex.includes(i)
        );

    $.p1CostVector =
        $.p1CostVector.filter((q, i) =>
            !artificialIndex.includes(i)
        );

    $.matrixA =
        $.matrixA.map(row =>
            row.filter((q, i) =>
                !artificialIndex.includes(i)
            )
        );

    $.dim = getDim();
}

function phase1() {

    $.dim = getDim();

    $.p1CostVector =
        getPhase1CostVector();

    saveSimplexStep("Inicial");

    while ($.kount <= $.maxIter) {

        $.basicVars =
            getBasicVars();

        if (!containsArtificial()) {
            break;
        }

        if (!simplex(1)) {
            break;
        }

        $.kount++;
    }

    if (
        $.kount ===
        $.maxIter + 1
    ) {
        throw new Error(
            "Máximo de iteraciones alcanzado en Fase 1"
        );
    }

    if ($.unbounded) return;

    // PRIORIDAD 1: Detección de infactibilidad
    // Si W > 0, no existe solución factible
    if ($.objZ > EPSILON) {
        throw new Error(
            "Problema infactible: No existe solución factible (W > 0)"
        );
    }

    removeArtificial();
}

// ============================================
// FASE 2
// ============================================

function phase2() {

    $.dim = getDim();

    // Reiniciar historial para Fase II
    $.history = [];

    saveSimplexStep("Inicial");

    while ($.kount <= $.maxIter) {

        $.basicVars =
            getBasicVars();

        if (!simplex(2)) {
            break;
        }

        $.kount++;
    }

    if (
        $.kount ===
        $.maxIter + 1
    ) {
        throw new Error(
            "Máximo de iteraciones alcanzado en Fase 2"
        );
    }
}

// ============================================
// SIMPLEX COMPLETO
// ============================================

function startSimplex() {

    $.basicVars =
        getBasicVars();

    if (containsArtificial()) {
        phase1();
    }

    if (!$.unbounded) {
        phase2();
    }

    return buildAnswer();
}

// ============================================
// RESPUESTA
// ============================================

function buildAnswer() {

    let solution = {};

    // Inicializar todas las variables en cero
    $.variables.forEach(v => {
        solution[v] = 0;
    });

    // Asignar valores a variables básicas según los pivotes
    $.pivots.forEach((pivot, row) => {
        solution[$.variables[pivot]] = $.rVector[row];
    });

    // PRIORIDAD 2: Detectar soluciones múltiples óptimas
    $.multipleOptimal = false;
    $.alternativeVariables = [];

    for (let j = 0; j < $.rCost.length; j++) {
        
        if (!$.pivots.includes(j)) {
            
            if (Math.abs($.rCost[j]) < EPSILON) {
                
                $.multipleOptimal = true;
                $.alternativeVariables.push($.variables[j]);
            }
        }
    }

    return {
        z: checkDecimals($.objZ),
        variables: solution,
        optimal: !$.unbounded,
        multipleOptimal: $.multipleOptimal,
        alternativeVariables: $.alternativeVariables,
        // PRIORIDAD 3: Información de degeneración
        isDegenerateProblem: $.isDegenerateProblem,
        degenerateIterations: $.degenerateIterations,
        iterations: $.kount
    };
}

// ============================================
// API PRINCIPAL
// ============================================

function calcularSimplex(data) {

    try {

        resetState();

        // ============================================
        // NORMALIZAR DATOS
        // ============================================

        const problema = {

            tipo:
                data.tipo ||
                data.target ||
                'max',

            objetivo:
                data.objetivo ||
                data.z ||
                data.objvalue ||
                {},

            restricciones:
                (data.restricciones || []).map(r => ({

                    coeffs:
                        r.coeffs || {

                            x1: r.a || 0,

                            x2: r.b || 0
                        },

                    signo:
                        r.signo,

                    rhs:
                        r.rhs ?? r.c
                }))
        };

        // ============================================
        // VALIDACIÓN
        // ============================================

        if (
            !problema.objetivo ||
            Object.keys(problema.objetivo).length === 0
        ) {
            throw new Error(
                "La función objetivo está vacía"
            );
        }

        if (
            !problema.restricciones ||
            problema.restricciones.length === 0
        ) {
            throw new Error(
                "No hay restricciones"
            );
        }

        // ============================================
        // CONSTRUIR SIMPLEX
        // ============================================

        $.iobj =
            buildObjectiveString(problema);

        $.irows =
            buildConstraintStrings(problema);

        const standard =
            standardForm(
                $.iobj,
                $.irows
            );

        $.target =
            standard.target;

        $.rVector =
            standard.rVector;

        const resultado =
            startSimplex();

        // Presentar resultado usando dom.js
        if (typeof printAnswer === 'function') {
            printAnswer(
                resultado.variables,
                resultado.z,
                $.kount - 1
            );
        }

        // Mostrar pasos del simplex
        if (typeof renderSimplexSteps === 'function') {
            renderSimplexSteps($.simplexSteps);
        }

        return resultado;
    }
    catch (error) {

        console.error(error);

        // Usar printWarning de dom.js si está disponible
        if (typeof printWarning === 'function') {
            printWarning(`❌ Error: ${error.message}`);
        } else {
            throw error;
        }

        return null;
    }
}

// ============================================
// EXPORT
// ============================================

console.log(
    "Simplex listo correctamente"
);

