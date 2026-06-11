// ============================================
// Parser ÚNICO del sistema
// ============================================

console.log("✅ parser.js cargado");

function parseLinearProblem(text) {

    const lines = text
        .trim()
        .split('\n')
        .map(l => l.trim())
        .filter(l => l !== '');

    if (lines.length < 2) {
        throw new Error("Problema incompleto");
    }

    // ============================================
    // FUNCIÓN OBJETIVO
    // ============================================

    const objectiveLine = lines[0];

    const objMatch =
        objectiveLine.match(/^(max|min)\s*=\s*(.+)$/i);

    if (!objMatch) {
        throw new Error("Función objetivo inválida");
    }

    const tipo =
        objMatch[1].toLowerCase();

    const objectiveExpr =
        objMatch[2];

    const objetivo =
        parseExpression(objectiveExpr);

    // ============================================
    // RESTRICCIONES
    // ============================================

    const restricciones = [];

    for (let i = 1; i < lines.length; i++) {

        const line = lines[i];

        const match =
            line.match(/(.+)(<=|>=|=)(.+)/);

        if (!match) {
            throw new Error(
                `Restricción inválida: ${line}`
            );
        }

        const izquierda =
            match[1].trim();

        const signo =
            match[2];

        const derecha =
            parseFloat(match[3]);

        if (isNaN(derecha)) {
            throw new Error(
                `RHS inválido: ${line}`
            );
        }

        restricciones.push({
            coeffs: parseExpression(izquierda),
            signo,
            rhs: derecha
        });
    }

    return {
        tipo,
        objetivo,
        restricciones
    };
}

// ============================================
// PARSEAR EXPRESIÓN
// ============================================

function parseExpression(expr) {

    expr = expr.replace(/\s+/g, '');

    const regex =
        /([+-]?\d*\.?\d*)x(\d+)/gi;

    let match;

    const result = {};

    while ((match = regex.exec(expr)) !== null) {

        let coeff = match[1];
        const variable = `x${match[2]}`;

        if (
            coeff === '' ||
            coeff === '+'
        ) {
            coeff = 1;
        }
        else if (coeff === '-') {
            coeff = -1;
        }
        else {
            coeff = parseFloat(coeff);
        }

        result[variable] = coeff;
    }

    return result;
}