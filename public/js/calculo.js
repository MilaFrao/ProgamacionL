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

        history: []
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

        if (v < 0) {
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

    return $.ratio.indexOf(minRatio);
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

    $.minmaxRCostIndex =
        $.rCost.indexOf(
            $.minmaxRCost
        );

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

    return true;
}

// ============================================
// FASE 1
// ============================================

function removeArtificial() {

    let artificialIndex = [];

    $.variables =
        $.variables.filter((v, i) => {

            if (v.includes('R')) {

                artificialIndex.push(i);

                return false;
            }

            return true;
        });

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

    $.matrixA =
        $.matrixA.map(row =>
            row.filter((q, i) =>
                !artificialIndex.includes(i)
            )
        );
}

function phase1() {

    $.dim = getDim();

    $.p1CostVector =
        getPhase1CostVector();

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

    removeArtificial();
}

// ============================================
// FASE 2
// ============================================

function phase2() {

    $.dim = getDim();

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

    $.variables.forEach((v, i) => {

        solution[v] =
            $.cBFS[i] || 0;
    });

    return {
        z: checkDecimals($.objZ),
        variables: solution,
        optimal: !$.unbounded,
        iterations: $.kount
    };
}

// ============================================
// API PRINCIPAL
// ============================================

function calcularSimplex(problemaTexto) {

    try {

        resetState();

        const lines =
            problemaTexto
                .trim()
                .split('\n')
                .filter(line =>
                    line.trim() !== ''
                );

        if (lines.length < 2) {
            throw new Error(
                "Debe ingresar función objetivo y restricciones"
            );
        }

        $.iobj = lines[0].trim();

        $.irows =
            lines
                .slice(1)
                .map(line =>
                    line.trim()
                );

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

        mostrarResultadoSimplex(
            resultado.z,
            resultado.variables
        );

        return resultado;
    }
    catch (error) {

        console.error(error);

        mostrarResultadoError(
            error.message
        );

        return null;
    }
}

// ============================================
// UI
// ============================================

function mostrarResultadoSimplex(
    valorZ,
    variables
) {

    const resultDiv =
        document.getElementById('result');

    const optimaDiv =
        document.getElementById('optima');

    if (resultDiv) {

        resultDiv.classList.remove('hidden');

        resultDiv.innerHTML = `
            <div class="result-card">
                <p>
                    Valor óptimo:
                    Z = ${valorZ}
                </p>

                ${Object.entries(variables)
                    .map(([k, v]) => `
                        <p>
                            ${k} = ${checkDecimals(v)}
                        </p>
                    `)
                    .join('')}
            </div>
        `;
    }

    if (optimaDiv) {

        optimaDiv.classList.remove('hidden');

        optimaDiv.innerHTML = `
            <div class="result-card">
                <p>
                    Solución óptima encontrada
                </p>
            </div>
        `;
    }
}

function mostrarResultadoError(mensaje) {

    const resultDiv =
        document.getElementById('result');

    if (resultDiv) {

        resultDiv.classList.remove('hidden');

        resultDiv.innerHTML = `
            <div class="result-card">
                <p style="color:red;">
                    ${mensaje}
                </p>
            </div>
        `;
    }
}

// ============================================
// EXPORT
// ============================================

console.log(
    "Simplex listo correctamente"
);

