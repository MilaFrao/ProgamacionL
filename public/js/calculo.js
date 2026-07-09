//DEFINICIÓN DE CADA UNA DE LAS VARIABLES
function createSimplexState() {
    return {
        maxIter: 50,
        iobj: undefined,
        irows: [],
        variables: [],
        pivots: [],
        target: undefined,
        rVector: undefined,
        matrixA: undefined,
        costVector: [],
        p1CostVector: undefined,
        basicVars: undefined,
        basis: undefined,
        cBFS: undefined,
        dim: undefined,
        rCost: undefined,
        minmaxRCost: undefined,
        minmaxRCostIndex: undefined,
        ratio: undefined,
        leavingIndex: undefined,
        kount: 1,
        objZ: undefined,
        basicKount: 0,
        nonBasicKount: 0,
        artificialKount: 0,
        unbounded: false,
        history: []
    };
}

// Clave para el almacenamiento local
const lclStorageKey = 'simplex2p'

// Función que procesa una fila para encontrar términos individuales
const findTerms = (row) => {
    let rowTerm = [];
    const terms = row.split(/(?=\+|\-)/gm);
    terms.forEach(term => {
        term = term.trim();
        if (term !== '') {
            // Verifica si el término contiene una fracción
            const match = term.match(/-?\d+\/\d+/);
            if (match) {
                const fraction = match[0];
                const decimalValue = fractionToDecimal(fraction);
                // Reemplaza la fracción en el término por su valor decimal
                term = term.replace(fraction, decimalValue);
            }
            rowTerm.push(term);
        }
    });
//    alert(`Términos procesados: ${rowTerm}`);
    return rowTerm;
}

//Funcion Fraccion a decimal 
const fractionToDecimal = (fraction) => {
    const partes = fraction.split('/');
    const numerador = parseFloat(partes[0]);
    const denominador = parseFloat(partes[1]);

    if (isNaN(numerador) || isNaN(denominador) || denominador === 0) {
            return "Error: Fracción no válida";
    }
    var resultadoDecimal = numerador / denominador;
    return  resultadoDecimal;
}


//FUNCION ENCUENTRA  LOS COEFICIENTES
const findCoeff = (row) => {
    // Inicializa un objeto vacío para almacenar las variables y sus coeficientes
    let vars = {};
    // Itera sobre cada término en el array 'row'
    row.forEach(term => {
        // Encuentra la variable (una cadena que empieza con una letra y sigue con cualquier caracter)
        const variable = /[a-z].+/gmi.exec(term)[0];
        // Encuentra el índice donde comienza la variable en el término
        const i = term.search(/[a-z].+/gmi);
        // Extrae la parte del término que corresponde al valor del coeficiente
        const value = term.slice(0, i);
        let coeff;
        if (value.includes('/')) {
            coeff = fractionToDecimal(value);
            if (isNaN(coeff)) {
                coeff = "Error: Fracción no válida";
            }
        } else {
            // Manejar el caso de valores negativos y positivos
            if (value.includes('-')) {
                const q = value.replace('-', '').trim();
                if (q === '') {
                    coeff = -1;
                } else {
                    coeff = -1 * parseFloat(q);
                }
            } else {
                const q = value.replace('+', '').trim();
                if (q === '') {
                    coeff = 1;
                } else {
                    coeff = parseFloat(q);
                }
            }
        }
        // Agrega la variable a la lista de variables si no está ya incluida
        if (!$.variables.includes(variable)) $.variables.push(variable);

        // Almacena el coeficiente en el objeto 'vars' con la variable como clave
        vars[variable] = coeff;
    });
    // Devuelve el objeto con las variables y sus coeficientes
    //alert("variables son "+vars);
    return vars;
}

// Función que analiza la función objetivo y la convierte en un formato adecuado
const parseObj = (iobj) => {
    // Divide la cadena 'iobj' en dos partes utilizando '=' como separador
    // 'mtarget' será la parte antes del '='
    // 'row' será la parte después del '='
    const [mtarget, row] = iobj.split('=');
    // Elimina los espacios en blanco al principio y al final de 'mtarget'
    // Convierte 'mtarget' a minúsculas
    const target = mtarget.trim().toLowerCase();
    // Procesa 'row' para encontrar términos y coeficientes
    // 'findTerms' divide 'row' en términos individuales
    // 'findCoeff' toma los términos y encuentra los coeficientes
    const objvalue = findCoeff(findTerms(row));
    // Devuelve un objeto con dos propiedades:
    // 'target': la cadena procesada antes del '=', en minúsculas y sin espacios en blanco
    // 'objvalue': un objeto que contiene las variables y sus coeficientes
    return { target, objvalue };
}

// Función para analizar las restricciones y convertirlas en un formato adecuado
const parseConstraint = (irows) => {
    let signs = []; // Array para almacenar los tipos de restricciones
    // Divide cada restricción en términos y encuentra el tipo de restricción (<=, >=, =)
    const rows = irows.map(row => {
        const le = row.split('<=');
        if (le.length === 2) {
            signs.push('le'); // Si es <=, agrega 'le' al array de tipos de restricciones
            return le;
        }
        const ge = row.split('>=');
        if (ge.length === 2) {
            signs.push('ge'); // Si es >=, agrega 'ge' al array de tipos de restricciones
            return ge;
        }
        signs.push('e'); // Si es =, agrega 'e' al array de tipos de restricciones
        return row.split('=');
    });
    // Obtiene el vector de recursos de las restricciones después de convertirlos a números de coma flotante
    const rVector = rows.map(row => parseFloat(row[1].trim()));
    // Divide cada restricción en términos y encuentra los coeficientes de las variables
    const rowTerms = rows.map(row => findTerms(row[0]));
    // Obtiene un diccionario de coeficientes para cada restricción
    const coeffDict = rowTerms.map(row => findCoeff(row));
    // Devuelve un objeto con el vector de recursos, el diccionario de coeficientes y los tipos de restricciones
    return { rVector, coeffDict, signs };
}

// Función para obtener el vector de costos a partir de la función objetivo
const getCostVector = (obj) => {
    // Itera sobre todas las variables y agrega sus coeficientes al vector de costos
    $.variables.forEach(v => {
        if (v in obj) {
            $.costVector.push(obj[v]); // Si la variable está en la función objetivo, agrega su coeficiente al vector
        } else {
            $.costVector.push(0); // Si no está presente, agrega 0 al vector
        }
    })
}

// Función para encontrar los índices de valores negativos en un vector dado
const findBNegative = (b) => {
    let arr = [];
    // Itera sobre el vector y encuentra los índices de valores negativos
    b.forEach((v, i) => { if (v < 0) arr.push(i) });
    return arr; // Devuelve un array con los índices de valores negativos
}

// Función para eliminar los valores negativos de las restricciones y el vector de recursos si existen
const removeBNegative = (bIndex, cDict, rVector) => {
    if (bIndex.length !== 0) {
        bIndex.forEach(i => {
            // Itera sobre los coeficientes de la restricción y los hace negativos
            Object.keys(cDict[i]).forEach(k => cDict[i][k] = -1 * cDict[i][k]);
            rVector[i] = -1 * rVector[i]; // Hace negativo el valor correspondiente en el vector de recursos
        });
    }
}

// Función para asignar coeficientes cero a las variables faltantes en las restricciones
const assignZeroCoeff = (cDict) => {
    cDict.forEach((row, i) => {
        // Contar el número de variables de restricción en esta fila
        const numVariables = Object.keys(row).length;
        console.log(`Número de variables de restricción en la fila ${i + 1}: ${numVariables}`);

        // Itera sobre las variables y si no están presentes en la restricción, asigna coeficiente cero
        $.variables.forEach(v => {
            if (!(v in row)) cDict[i][v] = 0;
        });
    });
}

// Función para formar la matriz de coeficientes de las restricciones
const formMatrixA = (cDict) => cDict.map(row => $.variables.map(v => row[v]));

// Función para encontrar las filas restantes en una matriz después de eliminar una fila en particular
const findRemaining = (matrix, i) => {
    return matrix.slice(0, i).concat(matrix.slice(i + 1, matrix.length)); // Devuelve una nueva matriz sin la fila eliminada
}

// Función para agregar variables (slack, surplus, artificial) a las restricciones y actualizar la matriz de coeficientes
const addVars = (q, i) => {
    // Crea una nueva fila para la matriz de coeficientes con un 1 o -1 agregado al final, dependiendo de 'q'
    const rowWith1 = [...$.matrixA[i], q === 'S' ? -1 : 1];
    // Agrega el nombre de la nueva variable ('q' + 'i') al array de variables
    $.variables.push(`${q}${i}`);
    // Encuentra las filas restantes después de eliminar la fila actual de la matriz de coeficientes
    const remainingRows = findRemaining($.matrixA, i);
    // Crea nuevas filas para las restricciones restantes y agrega la nueva fila en la posición 'i'
    let newRemainingRows = remainingRows.map(row => [...row, 0]);
    newRemainingRows.splice(i, 0, rowWith1);
    // Actualiza la matriz de coeficientes con las nuevas filas
    $.matrixA = newRemainingRows;
    // Agrega un 0 al vector de costos si 'q' no es 'R' (para las variables artificiales)
    if (q !== 'R') $.costVector.push(0);
    // Devuelve la longitud de la fila actualizada
    return rowWith1.length - 1;
}

// Función para agregar variables de holgura, excedente y artificiales según los tipos de restricciones
const addSlackSurplusArtificial = (signs) => {
    // Itera sobre los tipos de restricciones
    signs.forEach((sign, i) => {
        if (sign === 'le') {
            // Agrega variables de holgura para las restricciones de tipo <=
            const pivot = addVars('H', i);
            $.pivots.push(pivot);
            return;
        }
        if (sign === 'ge') {
            // Agrega variables de excedente y artificiales para las restricciones de tipo >=
            addVars('S', i);
            const pivot = addVars('R', i);
            $.pivots.push(pivot);
            return;
        }
            if (sign === 'e') {
            // Agrega variables artificiales para las restricciones de tipo =
            const pivot = addVars('R', i); // Prefijo "R" para indicar artificial
            $.pivots.push(pivot);
        }
    });
}

// Función para convertir la función objetivo y las restricciones dadas en su forma estándar
const standardForm = (iobj, irows) => {
    // Analiza la función objetivo y las restricciones para obtener datos útiles
    const { target, objvalue } = parseObj(iobj);
    let { rVector, coeffDict, signs } = parseConstraint(irows);
    // Obtiene el vector de costos a partir de la función objetivo
    getCostVector(objvalue);
    // Encuentra los índices de valores negativos en el vector de recursos y ajusta los coeficientes si es necesario
    const bNegativeIndex = findBNegative(rVector);
    removeBNegative(bNegativeIndex, coeffDict, rVector);
    // Asigna coeficientes cero a las variables faltantes en las restricciones
    assignZeroCoeff(coeffDict);
    // Forma la matriz de coeficientes a partir del diccionario de coeficientes
    $.matrixA = formMatrixA(coeffDict);
    // Imprime información sobre la conversión a la forma estándar
    printSubtitle('Convertiendo a su forma estándar ');
    printTableCardStandardForm('Matriz de coeficientes de entrada :');
    // Obtiene el número de variables básicas y no básicas
    $.basicKount = $.variables.length;
    // Imprime la lista de variables básicas
    printVariables('Variables');
    // Agrega variables de holgura, excedente y artificiales según los tipos de restricciones
    addSlackSurplusArtificial(signs);
    $.nonBasicKount = $.variables.length - $.basicKount;
    $.artificialKount = $.variables.length - ($.basicKount + $.nonBasicKount);
    // Imprime la lista de variables no básicas
    printTableCardStandardForm('Matriz de coeficientes después de sumar variables de holgura, excedentes y artificiales:');
    printVariables('Variables no ');
    // Devuelve el objetivo y el vector de recursos
    return { target, rVector };
}

// Otras funciones auxiliares necesarias para el método del simplex
const getPhase1CostVector = () => {
    return $.variables.map(v => {
        if (v.includes('R')) return 1; // Devuelve 1 si es una variable artificial (R), 0 en caso contrario
        return 0;
    });
}

const getBFS = () => {
    let arr = $.variables.map(v => 0);
    // Construye el vector BFS (Basic Feasible Solution) utilizando los pivotes y el vector de recursos
    $.pivots.forEach((p, i) => arr[p] = $.rVector[i]);
    return arr;
}

const dotP = (v1, v2) => {

    if (v1.length !== v2.length) {
        console.error("Los vectores no tienen la misma longitud.");
        return false;
    }
    let s = 0;
    v1.forEach((q, i) => s += q * v2[i]);
    console.log(`Resultado del producto punto: ${s}`);
    return s;

}

const vDivide = (v1, v2) => {
    if (v1.length !== v2.length) return false;
    // Divide cada elemento del primer vector por el correspondiente del segundo vector
    let arr = [];
    v1.forEach((q, i) => {
        const result = q / v2[i];
        arr.push(result);
    //    alert(`Resultado de la división en posición ${i}: ${result}`);
    });
    return arr;
}

const vSubtract = (v1, v2) => {
    if (v1.length !== v2.length) return false;
    // Resta cada elemento del segundo vector del correspondiente del primer vector
    let arr = [];
    v1.forEach((q, i) => {
        const result = q - v2[i];
        arr.push(result);
     //   alert(`Resultado de la resta en posición ${i}: ${result}`);
    });
    return arr;
}

// Función para calcular cjBar (costo reducido) de una variable
const getCJBar = (col, cVector, basis) => {
    console.log(`cVector: ${cVector}`);

    let p = [];
    // Construye el vector 'p' utilizando los elementos de la columna 'col' de la matriz A
    for (let i = 0; i < $.dim[0]; i++) {
        p.push($.matrixA[i][col]);
    }
    console.log(`Vector p: ${p}`);
    // Calcula cjBar_j = cj_j - (p * basis)
    return cVector[col] - dotP(p, basis);
}

// Función para encontrar el costo reducido de todas las variables
const findRCost = (cVector) => {
    console.log("Longitud del vector cVector:", cVector.length);
    let cjBar = [];
    // Itera sobre todas las variables para calcular su costo reducido
    for (let j = 0; j < $.dim[1]; j++) {
        cjBar.push(getCJBar(j, cVector, $.basis));
    }
    return cjBar;
}

// Función para obtener las variables básicas
const getBasicVars = () => $.pivots.map(p => $.variables[p]);

// Función para obtener los coeficientes de las variables básicas
const getBasis = (cVector) => $.pivots.map(p => cVector[p]);

// Función para obtener la dimensión de la matriz A y el vector de recursos
const getDim = () => {
    const m = $.rVector.length; // Número de restricciones
    const n = $.variables.length; // Número de variables
    return [m, n];
}

// Función para encontrar la variable que dejará la base (leaving variable)
const findLeavingVar = (col) => {
    let p = [];
    // Construye el vector 'p' utilizando los elementos de la columna 'col' de la matriz A
    for (let i = 0; i < $.dim[0]; i++) {
        p.push($.matrixA[i][col]);
    }
    // Calcula las razones y filtra las negativas e infinitas
    $.ratio = vDivide($.rVector, p);
    const filteredRatio = $.ratio.filter(q => q >0 && q !== Infinity);
    // Si no hay razones válidas, la solución es no acotada
    if (filteredRatio.length === 0) {
        $.unbounded = true;
        return -1;
    }
    console.log("Radios filtrados: " + filteredRatio.join(", "));
    // Encuentra la mínima razón y devuelve su índice
    const minRatio = Math.min(...filteredRatio);
    const index = $.ratio.indexOf(minRatio);
    return index;
}

// Función para realizar la operación de fila en la matriz A
const rowOperation = (row, col) => {
    const element = $.matrixA[row][col];
    // Divide la fila 'row' por el elemento de pivote 'element'
    $.matrixA[row].forEach((q, i) => {
        $.matrixA[row][i] = q / element;
    });
    // Divide el vector de recursos 'rVector' por el elemento de pivote correspondiente
    $.rVector[row] = $.rVector[row] / element;
    // Encuentra las filas restantes después de eliminar la fila actual de la matriz de coeficientes
    const remainingRows = findRemaining($.matrixA, row);
    const rRemaining = findRemaining($.rVector, row);
    const pivotRow = $.matrixA[row];
    const rPivot = $.rVector[row];

    // Actualiza la matriz de coeficientes y el vector de recursos después de la operación de fila
    $.matrixA = remainingRows.map((r, i) => {
        const multiplier = r[col];
        const newRow = $.matrixA[row].map(q => q * multiplier);
        rRemaining[i] = rRemaining[i] - $.rVector[row] * multiplier;
        return vSubtract(r, newRow);
    });
    $.matrixA.splice(row, 0, pivotRow);
    $.rVector = rRemaining;
    $.rVector.splice(row, 0, rPivot);
}

/**
 * Actualiza el índice del pivote en la lista de pivotes.
 * @param {number} row Índice de la fila del pivote.
 * @param {number} col Índice de la columna del pivote.
 */
const updatePivot = (row, col) => {
    // Asigna la columna como pivote de la fila dada
    $.pivots[row] = col;
}

/**
 * Verifica si hay variables artificiales presentes en las variables básicas.
 * @returns {boolean} true si hay al menos una variable artificial, false en caso contrario.
 */
const containsArtificial = () =>
    // Verifica si alguna de las variables básicas contiene 'R', indicando que es artificial
    $.basicVars.some(b => b.includes('R'));

/**
 * Encuentra el costo reducido objetivo dependiendo del tipo de problema (minimización o maximización).
 * @param {string} target Tipo de problema ('min' para minimización, otro valor para maximización).
 * @param {number[]} rCost Arreglo que contiene los costos reducidos.
 * @returns {number|null} Costo reducido objetivo si se encuentra, null si no se encuentra.
 */
const findTargetRCost = (target, rCost) => {
    if (target === 'min') {
        // Encuentra el mínimo costo reducido si el objetivo es minimizar
        const min = Math.min(...rCost);
        if (min < 0) return min;
        return null;
    }
    // Encuentra el máximo costo reducido si el objetivo es maximizar
    const max = Math.max(...rCost);
    if (max > 0) return max;
    return null;
}

/**
 * Calcula la solución actual (valor de la función objetivo).
 * @param {number[]} v Vector de solución.
 * @returns {number} Valor de la solución actual.
 */
const getSoln = (v) =>
    // Calcula el producto punto del vector de solución con los costos de las variables básicas
    dotP(v, $.cBFS);

/**
 * Verifica si la combinación actual de índices de mín/max costo, índice de variable que sale y valor objetivo ya ha sido registrada en el historial.
 * @returns {boolean} true si la combinación no se ha registrado previamente, false si ya existe en el historial.
 */
const checkHistory = () => {
    // Combina los índices actuales en una cadena única
    const s = `${$.minmaxRCostIndex}${$.leavingIndex}${$.objZ}`;
    // Verifica si la cadena ya está en el historial
    if ($.history.some(h => h === s)) return false;
    // Si no está en el historial, la agrega y retorna true
    return $.history.push(s);
}

/**
 * Verifica si un número tiene más de 5 decimales y lo redondea en caso afirmativo.
 * @param {number} n Número a verificar.
 * @returns {number} Número original o redondeado.
 */
const checkDecimals = (n) => {
    // Busca si el número tiene más de 5 decimales
    const decimals = `${n}`.search(/\.\d{6,}/gmi);

    // Si tiene más de 5 decimales, redondea el número a 5 decimales
    if (decimals !== -1) return Number(n.toFixed(5));
    // Si no tiene más de 5 decimales, retorna el número original
    return Number(n);
}

/**
 * Representa una iteración del algoritmo simplex.
 * @param {number} phase Fase actual del algoritmo (1 o 2).
 * @returns {boolean} true si la iteración se realizó con éxito y se debe continuar con la siguiente, false si no se puede continuar.
 */
const simplex = (phase) => {
    // Obtiene la base actual dependiendo de la fase
    $.basis = (phase === 1) ? getBasis($.p1CostVector) : getBasis($.costVector);
    // Calcula la base factible actual
    $.cBFS = getBFS();
    // Imprime la base factible si no es la primera iteración
    if ($.kount !== 1) printBFS();
    // Calcula el valor de la función objetivo
    $.objZ = (phase === 1) ? getSoln($.p1CostVector) : getSoln($.costVector);
    // Calcula los costos reducidos
    $.rCost = (phase === 1) ? findRCost($.p1CostVector) : findRCost($.costVector);
    // Encuentra el mínimo o máximo costo reducido dependiendo de la fase
    $.minmaxRCost = (phase === 1) ? Math.min(...$.rCost) : findTargetRCost($.target, $.rCost);
    // Imprime la tabla de la iteración actual
    const card = printTableCard(phase);
    // Si no hay costos reducidos válidos, finaliza la iteración
    if (!$.minmaxRCost) return false;
    // Encuentra el índice del costo reducido mínimo o máximo
    $.minmaxRCostIndex = $.rCost.indexOf($.minmaxRCost);
    // Encuentra la variable que debe salir de la base
    $.leavingIndex = findLeavingVar($.minmaxRCostIndex);
    // Imprime las razones para determinar la variable que sale
    printRatio(card);
    // Si no se puede encontrar una variable que salga, la solución es indefinida
    if ($.leavingIndex === -1) {
        const msg = 'Todas las proporciones mínimas son negativas o infinitas, por lo que la solución es indefinida.';
        printWarning(msg, card);
        return false;
    }
    // Imprime las variables que entran y salen de la base
    printEnteringLeavingVar(card);
    // Verifica si la combinación actual ya ha sido procesada
    const historyNotRepeat = checkHistory();
    if (!historyNotRepeat) {
        const msg = 'La fase 1 ha concluido. Procediendo a la fase 2 o evaluando la solución actual.';
        printWarning(msg, card);
        return false;
    }
    // Realiza la operación de fila para actualizar la tabla simplex
    rowOperation($.leavingIndex, $.minmaxRCostIndex);
    // Actualiza el pivote
    updatePivot($.leavingIndex, $.minmaxRCostIndex);
    return true;
}

// Elimina las variables artificiales del problema
const removeArtificial = () => {
    let artificialIndex = []; // Almacena los índices de las variables artificiales

    // Filtra las variables para eliminar las variables artificiales (indicadas por 'R')
    $.variables = $.variables.filter((v, i) => {
        if (v.includes('R')) { // Si la variable es artificial
            artificialIndex.push(i); // Guarda su índice
            return false; // Elimínala del array de variables
        }
        return true; // Mantén las variables no artificiales
    });

    // Ajusta los índices de los pivotes después de eliminar variables artificiales
    artificialIndex.forEach(i => {
        $.pivots = $.pivots.map(p => {
            if (p >= i) return p - 1; // Ajusta los índices que son mayores o iguales al índice eliminado
            return p; // Mantén los otros índices sin cambios
        });
    });

    // Elimina las entradas correspondientes de cBFS que están en artificialIndex
    $.cBFS = $.cBFS.filter((q, i) => !artificialIndex.includes(i));

    // Elimina las columnas correspondientes de matrixA que están en artificialIndex
    $.matrixA = $.matrixA.map(row => {
        return row.filter((q, i) => !artificialIndex.includes(i));
    });

    // Imprime una advertencia indicando que todas las variables artificiales han sido eliminadas
    printWarning('Todas las variables artificiales (Ri) se eliminan de la Tabla base.', output);
}

// Fase 1 del algoritmo simplex: eliminar variables artificiales
const phase1 = () => {
    printSubtitle('Fase 1: Eliminar variables artificiales '); // Imprime el subtítulo de la fase 1
    $.dim = getDim(); // Obtiene las dimensiones del problema
    $.p1CostVector = getPhase1CostVector(); // Obtiene el vector de costos de la fase 1

    // Itera hasta que se alcance el número máximo de iteraciones
    while ($.kount <= $.maxIter) {
        $.basicVars = getBasicVars(); // Obtiene las variables básicas
        if (!containsArtificial()) break; // Si no hay variables artificiales, termina la fase 1
        if (!simplex(1)) break; // Ejecuta el algoritmo simplex en fase 1
        $.kount++; // Incrementa el contador de iteraciones
    }

    // Si se alcanzó el número máximo de iteraciones, imprime una advertencia
    if ($.kount === $.maxIter + 1) {
        printWarning(`Iteración máxima alcanzada en la fase 1`, output);
        return; // Termina la fase 1
    }

    if ($.unbounded) return; // Si el problema es no acotado, termina la fase 1

    removeArtificial(); // Elimina las variables artificiales restantes
}

// Fase 2 del algoritmo simplex: encontrar una solución óptima
const phase2 = () => {
    printSubtitle('Fase 2: Encontrando una solución óptima'); // Imprime el subtítulo de la fase 2
    $.dim = getDim(); // Obtiene las dimensiones del problema

    // Itera hasta que se alcance el número máximo de iteraciones
    while ($.kount <= $.maxIter) {
        $.basicVars = getBasicVars(); // Obtiene las variables básicas
        if (!simplex(2)) break; // Ejecuta el algoritmo simplex en fase 2
        $.kount++; // Incrementa el contador de iteraciones
    }

    // Si se alcanzó el número máximo de iteraciones, imprime una advertencia
    if ($.kount === $.maxIter + 1) {
        printWarning(`Iteración máxima alcanzada en la fase 2 `, output);
        return; // Termina la fase 2
    }
}

// Inicia el algoritmo simplex, comenzando con la fase 1 si hay variables artificiales
const startSimplex = () => {
    $.basicVars = getBasicVars(); // Obtiene las variables básicas
    if (containsArtificial()) phase1(); // Ejecuta la fase 1 si hay variables artificiales
    if (!$.unbounded) phase2(); // Ejecuta la fase 2 si el problema no es no acotado
    printAnswer(); // Imprime la solución final
}

// Procesa el problema ingresado por el usuario
const getProblem = () => {
    const selectedMethod = metodo.value;
    console.log(selectedMethod);

    if(selectedMethod == "grafico"){ //----> GRAFICO
        const entrada = document.getElementById("problem");
        terminos(entrada);
    } else { //----> SIMPLEX

        const input = problem.value.trim(); // Obtiene y limpia los espacios en blanco a los extremos de las lineas
        if (input !== '') {
            calculationStart(); // Inicia el cálculo
            const lines = input.split('\n'); // Crea un array con cada linea del problema, (funcion objetivo, restriccion1, restricion..., restriccionN)

            lines.forEach((line, i) => {
                if (i === 0) {
                    $.iobj = line.trim(); // La primera línea es la función objetivo
                } else {    
                    $.irows.push(line.trim()); // Las líneas siguientes son las restricciones
                }
            });

            const standardFormOutput = standardForm($.iobj, $.irows); // Convierte el problema a forma estándar
            console.log(standardFormOutput);
            $.target = standardFormOutput.target; // Establece el objetivo (minimizar o maximizar)
            $.rVector = standardFormOutput.rVector; // Establece el vector de términos independientes

            startSimplex(); // Inicia el algoritmo simplex
            calculationEnd(); // Finaliza el cálculo

        } else {
            printWarning('No ha ingresado valores', emptyMsg); // Imprime una advertencia si no se ingresaron valores
        }
    }
}
