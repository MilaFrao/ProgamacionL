// ============================================
// dom.js - Interfaz + Renderizador Simplex
// Mezcla optimizada de ambos dom.js
// ============================================

console.log("✅ dom.js cargado");

// ============================================
// EJEMPLOS POR DEFECTO
// ============================================

const defaultInput = `max = 3x1 + 2x2
2x1 + x2 <= 18
2x1 + 3x2 <= 42
3x1 + x2 >= 24
x1 >= 0
x2 >= 0`;

// ============================================
// REFERENCIAS DOM
// ============================================

const problem = document.getElementById('problem');
const solve = document.getElementById('solve');
const metodo = document.getElementById('method-select');
const output = document.getElementById('output');
const btnReset = document.getElementById('reset');
const emptyMsg = document.getElementById('empty-msg');

const historyModal = document.getElementById('history-modal');
const historyContent = document.getElementById('history-content');

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {

    console.log("🚀 Inicializando interfaz");

    if (problem && problem.value.trim() === '') {
        problem.value = defaultInput;
    }

    actualizarModalHistorial();

    // Evento calcular
    if (solve) {
        solve.addEventListener('click', () => {

            const method = metodo ? metodo.value : 'simplex';
            const input = problem.value.trim();

            if (!input) {
                mostrarMensaje('⚠️ Debes ingresar un problema', 'error');
                return;
            }

            calculationStart();

            guardarEnHistorial(input, method);

            try {
                const parsed = parseLinearProblem(input);

                if (method === 'grafico') {
                    if (typeof grafico === 'function') {
                        grafico(parsed);
                    } else {
                        mostrarMensaje(
                            'Método gráfico no disponible',
                            'error'
                        );
                    }
                } else {
                    if (typeof calcularSimplex === 'function') {
                        calcularSimplex(parsed);
                    } else {
                        mostrarMensaje(
                            'calcularSimplex no encontrado',
                            'error'
                        );
                    }
                }

            } catch (e) {
                console.error(e);
                mostrarMensaje(e.message, 'error');
            } finally {
                calculationEnd();
            }
        });
    }

    // Evento limpiar
    if (btnReset) {
        btnReset.addEventListener('click', resetCalculator);
    }

    // Checkbox información adicional
    const lista = document.getElementById('lista');
    const informacionAdicional = document.getElementById('informacionAdicional');

    if (lista && informacionAdicional) {

        lista.addEventListener('change', function () {

            if (this.checked) {
                informacionAdicional.classList.remove('hidden');
            } else {
                informacionAdicional.classList.add('hidden');
            }

        });
    }

    // Modal historial
    const historyBtn = document.getElementById('history');

    if (historyBtn && historyModal) {

        historyBtn.addEventListener('click', () => {
            actualizarModalHistorial();
            historyModal.classList.add('is-active');
        });

        historyModal.querySelectorAll('.delete, .modal-background, #close-history-modal')
            .forEach(el => {
                el.addEventListener('click', () => {
                    historyModal.classList.remove('is-active');
                });
            });
    }

    console.log("✅ Interfaz lista");

});

// ============================================
// UTILIDADES DOM
// ============================================

const createNode = (tag, options = {}) => {

    const {
        classes = [],
        text = '',
        html = '',
        attrs = {}
    } = options;

    const node = document.createElement(tag);

    if (classes.length) {
        node.classList.add(...classes);
    }

    if (text !== '') {
        node.innerText = text;
    }

    if (html !== '') {
        node.innerHTML = html;
    }

    Object.entries(attrs).forEach(([key, value]) => {
        node.setAttribute(key, value);
    });

    return node;
};

const clearOutput = (node) => {

    if (!node) return;

    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
};

const clearResults = () => {

    clearOutput(output);

    [
        'result',
        'optima',
        'plot',
        'r_grafico'
    ].forEach(id => {

        const el = document.getElementById(id);

        if (!el) return;

        el.innerHTML = '';

        el.classList.add('hidden');
    });
};

const appendOutput = (node) => {

    if (!output) return;

    output.appendChild(node);
};

// ============================================
// RESET
// ============================================

const resetCalculator = () => {

    if (problem) {
        problem.value = '';
    }

    clearResults();

    if (emptyMsg) {
        emptyMsg.innerHTML = '';
    }

    console.log("🧹 Sistema limpiado");
};

// ============================================
// MENSAJES
// ============================================

function mostrarMensaje(mensaje, tipo = 'info') {

    if (!emptyMsg) return;

    const colores = {
        success: 'bg-green-100 border-green-500 text-green-700',
        error: 'bg-red-100 border-red-500 text-red-700',
        info: 'bg-blue-100 border-blue-500 text-blue-700'
    };

    emptyMsg.innerHTML = `
        <div class="border-l-4 p-3 rounded mb-3 ${colores[tipo]}">
            <p>${mensaje}</p>
        </div>
    `;

    setTimeout(() => {

        if (emptyMsg.innerHTML.includes(mensaje)) {
            emptyMsg.innerHTML = '';
        }

    }, 4000);
}

function mostrarError(mensaje) {
    mostrarMensaje(mensaje, 'error');
}

// ============================================
// HISTORIAL
// ============================================

const History = (() => {

    const key = 'simplexHistorial';
    const maxItems = 20;

    return {
        save(problema, metodo) {
            try {
                let historial = JSON.parse(localStorage.getItem(key) || '[]');

                historial.unshift({
                    problema,
                    metodo,
                    fecha: new Date().toLocaleString()
                });

                if (historial.length > maxItems) {
                    historial = historial.slice(0, maxItems);
                }

                localStorage.setItem(key, JSON.stringify(historial));
            } catch (e) {
                console.error(e);
            }
        },

        load() {
            try {
                return JSON.parse(localStorage.getItem(key) || '[]');
            } catch (e) {
                console.error(e);
                return [];
            }
        },

        clear() {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.error(e);
            }
        },

        remove(index) {
            try {
                let historial = this.load();
                historial.splice(index, 1);
                localStorage.setItem(key, JSON.stringify(historial));
            } catch (e) {
                console.error(e);
            }
        }
    };
})();

function guardarEnHistorial(problema, metodo) {
    History.save(problema, metodo);
}

function actualizarModalHistorial() {

    if (!historyContent) return;

    const historial = History.load();

    if (historial.length === 0) {

        historyContent.innerHTML = `
            <p class="text-center text-gray-500">
                No hay historial todavía
            </p>
        `;

        return;
    }

    let html = '<div class="space-y-3">';

    historial.forEach((item, index) => {

        html += `
            <div class="border rounded-lg p-3">
                
                <div class="flex justify-between">
                    
                    <span class="text-xs font-semibold px-2 py-1 rounded
                    ${item.metodo === 'simplex'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-green-100 text-green-700'}">
                        
                        ${item.metodo}
                    </span>

                    <span class="text-xs text-gray-400">
                        ${item.fecha}
                    </span>

                </div>

                <pre class="text-xs font-mono bg-gray-100 p-2 rounded mt-2 overflow-x-auto">
${escapeHtml(item.problema)}
                </pre>

                <button
                    onclick="cargarProblemaHistorial(${index})"
                    class="mt-2 text-blue-600 text-sm hover:underline"
                >
                    Cargar problema
                </button>

            </div>
        `;
    });

    html += '</div>';

    historyContent.innerHTML = html;
}

function cargarProblemaHistorial(index) {

    const historial = History.load();

    if (!historial[index]) return;

    problem.value = historial[index].problema;

    if (historyModal) {
        historyModal.classList.remove('is-active');
    }

    mostrarMensaje('Problema cargado correctamente', 'success');
}

function escapeHtml(text) {

    const div = document.createElement('div');

    div.textContent = text;

    return div.innerHTML;
}

// ============================================
// CALCULATION UI
// ============================================

const calculationStart = () => {

    clearOutput(output);

    if (solve) {
        solve.disabled = true;
        solve.classList.add('opacity-50');
    }

    if (btnReset) {
        btnReset.disabled = true;
    }

    console.log("⚙️ Iniciando cálculo");
};

const calculationEnd = () => {

    if (solve) {
        solve.disabled = false;
        solve.classList.remove('opacity-50');
    }

    if (btnReset) {
        btnReset.disabled = false;
    }

    if (output) {
        output.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
    }

    console.log("✅ Cálculo finalizado");
};

// ============================================
// IMPRESIÓN SIMPLEX
// ============================================

// ============================================
// SUBTÍTULOS
// ============================================

const printSubtitle = (txt) => {

    const div = createNode('div', {
        classes: ['bg-red-600', 'text-white', 'font-bold', 'p-3', 'rounded', 'mb-3'],
        text: txt
    });

    appendOutput(div);
};

// ============================================
// TABLAS
// ============================================

const printTable = (headers, rows, title = '') => {

    const card = createNode('div', {
        classes: [
            'bg-white',
            'shadow',
            'rounded',
            'p-4',
            'mb-4'
        ]
    });

    if (title) {

        const h = createNode('h3', {
            classes: ['font-bold', 'text-lg', 'mb-3'],
            text: title
        });

        card.appendChild(h);
    }

    const table = createNode('table', {
        classes: [
            'table-auto',
            'border-collapse',
            'w-full'
        ]
    });

    // Header
    const thead = createNode('thead');

    const trh = createNode('tr');

    headers.forEach(h => {

        const th = createNode('th', {
            classes: ['border', 'p-2', 'bg-gray-100'],
            text: h
        });

        trh.appendChild(th);
    });

    thead.appendChild(trh);

    table.appendChild(thead);

    // Body
    const tbody = createNode('tbody');

    rows.forEach(row => {

        const tr = createNode('tr');

        row.forEach(col => {

            const value = col === Infinity
                ? '∞'
                : col === -Infinity
                ? '-∞'
                : col == null
                ? ''
                : checkDecimals(col);

            const td = createNode('td', {
                classes: ['border', 'p-2', 'text-center'],
                text: `${value}`
            });

            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    card.appendChild(table);

    appendOutput(card);

    return card;
};

// ============================================
// BFS
// ============================================

const printBFS = (vector, z) => {

    printSubtitle('Solución Básica Factible');

    const headers = vector.map((_, i) => `x${i + 1}`);

    printTable(headers, [vector]);

    const div = createNode('div', {
        classes: ['font-bold', 'mt-2'],
        text: `Z = ${checkDecimals(z)}`
    });

    appendOutput(div);
};

// ============================================
// RESPUESTA FINAL
// ============================================

const printAnswer = (variables, z, iteraciones = 0) => {

    printSubtitle('Solución Óptima');

    const container = createNode('div', {
        classes: ['bg-green-100', 'border', 'border-green-500', 'rounded', 'p-4']
    });

    const titleP = createNode('p', {
        classes: ['font-bold', 'text-green-700'],
        text: 'Valor óptimo:'
    });
    container.appendChild(titleP);

    const zP = createNode('p', {
        classes: ['text-xl', 'font-bold', 'mb-3'],
        text: `Z = ${checkDecimals(z)}`
    });
    container.appendChild(zP);

    Object.entries(variables).forEach(([k, v]) => {
        const p = createNode('p');
        const strong = createNode('strong', { text: k });
        p.appendChild(strong);
        p.appendChild(document.createTextNode(` = ${checkDecimals(v)}`));
        container.appendChild(p);
    });

    const iterDiv = createNode('div', {
        classes: ['mt-3', 'text-sm', 'text-gray-600'],
        text: `Iteraciones: ${iteraciones}`
    });
    container.appendChild(iterDiv);

    appendOutput(container);
};

// ============================================
// WARNING
// ============================================

const printWarning = (msg) => {

    const div = createNode('div', {
        classes: ['bg-yellow-100', 'border-l-4', 'border-yellow-500', 'p-3', 'rounded', 'mb-3'],
        text: msg
    });

    appendOutput(div);
};

// ============================================
// VARIABLES ENTRANTE / SALIENTE
// ============================================

const printEnteringLeavingVar = (entering, leaving) => {

    const div = createNode('div', {
        classes: ['bg-gray-100', 'p-3', 'rounded', 'mb-3']
    });

    const enteringP = createNode('p');
    enteringP.appendChild(createNode('strong', { text: 'Variable entrante:' }));
    enteringP.appendChild(document.createTextNode(` ${entering}`));
    div.appendChild(enteringP);

    const leavingP = createNode('p');
    leavingP.appendChild(createNode('strong', { text: 'Variable saliente:' }));
    leavingP.appendChild(document.createTextNode(` ${leaving}`));
    div.appendChild(leavingP);

    appendOutput(div);
};

// ============================================
// RAZONES
// ============================================

const printRatio = (ratio) => {

    const rows = ratio.map((r, i) => [
        `Fila ${i + 1}`,
        r === Infinity ? '∞' : r === -Infinity ? '-∞' : r == null ? '' : checkDecimals(r)
    ]);

    printTable(
        ['Restricción', 'Razón'],
        rows,
        'Razones Simplex'
    );
};

// ============================================
// RENDER SIMPLEX STEPS
// ============================================

const renderSimplexSteps = (steps) => {

    if (!steps || steps.length === 0) {
        printWarning('No hay pasos para mostrar');
        return;
    }

    steps.forEach((step, index) => {

        const isInitial = step.phase === 'Inicial';

        if (isInitial) {
            printSubtitle('Estado Inicial');
        } else {
            printSubtitle(`${step.phase} - Iteración ${step.iteration}`);
        }

        // Mostrar variables entrante y saliente
        if (step.entering !== undefined && step.leaving !== undefined && !isInitial) {
            const enteringVar = step.variables[step.entering] || `x${step.entering + 1}`;
            const leavingVar = step.basicVars[step.leaving] || 'Base';
            printEnteringLeavingVar(enteringVar, leavingVar);
        }

        // Construir tabla del simplex
        const headers = [
            'Base',
            ...step.variables,
            'RHS'
        ];

        const rows = step.matrixA.map((row, i) => [
            step.basicVars[i] || '',
            ...row,
            step.rhs[i]
        ]);

        // Agregar fila de costos reducidos
        rows.push([
            'Costo Reducido',
            ...step.rCost,
            step.objective
        ]);

        printTable(headers, rows);

        // Mostrar razones si existen y no es inicial
        if (step.ratio && step.ratio.length > 0 && !isInitial) {
            printRatio(step.ratio);
        }
    });
};

// ============================================
// GETTERS Y HELPERS
// ============================================

const getSimplexSteps = () => {
    return $ ? $.simplexSteps : [];
};

const showSimplexSteps = () => {
    const steps = getSimplexSteps();
    if (steps.length > 0) {
        clearResults();
        renderSimplexSteps(steps);
    } else {
        printWarning('No hay pasos del Simplex para mostrar');
    }
};

console.log("✅ dom.js listo");