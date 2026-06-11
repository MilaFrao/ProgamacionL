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
                const parsed =parseLinearProblem(input);

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
            }
            calculationEnd();
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

const createNode = (tag, classList = [], innerText = '') => {

    const node = document.createElement(tag);

    if (classList.length) {
        node.classList.add(...classList);
    }

    if (innerText !== '') {
        node.innerText = innerText;
    }

    return node;
};

const clearOutput = (node) => {

    if (!node) return;

    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
};

// ============================================
// RESET
// ============================================

const resetCalculator = () => {

    if (problem) {
        problem.value = '';
    }

    clearOutput(output);

    if (emptyMsg) {
        emptyMsg.innerHTML = '';
    }

    document.querySelectorAll('#result, #optima, #r_grafico')
        .forEach(el => {
            if (el) el.classList.add('hidden');
        });

    const plot = document.getElementById('plot');

    if (plot) {
        plot.innerHTML = '';
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

const lclStorageKey = 'simplexHistorial';

function guardarEnHistorial(problema, metodo) {

    try {

        let historial = JSON.parse(localStorage.getItem(lclStorageKey) || '[]');

        historial.unshift({
            problema,
            metodo,
            fecha: new Date().toLocaleString()
        });

        if (historial.length > 20) {
            historial = historial.slice(0, 20);
        }

        localStorage.setItem(lclStorageKey, JSON.stringify(historial));

    } catch (e) {

        console.error(e);

    }
}

function actualizarModalHistorial() {

    if (!historyContent) return;

    const historial = JSON.parse(localStorage.getItem(lclStorageKey) || '[]');

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

    const historial = JSON.parse(localStorage.getItem(lclStorageKey) || '[]');

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

    const div = createNode(
        'div',
        ['bg-red-600', 'text-white', 'font-bold', 'p-3', 'rounded', 'mb-3'],
        txt
    );

    output.appendChild(div);
};

// ============================================
// TABLAS
// ============================================

const printTable = (headers, rows, title = '') => {

    const card = createNode('div', [
        'bg-white',
        'shadow',
        'rounded',
        'p-4',
        'mb-4'
    ]);

    if (title) {

        const h = createNode(
            'h3',
            ['font-bold', 'text-lg', 'mb-3'],
            title
        );

        card.appendChild(h);
    }

    const table = createNode('table', [
        'table-auto',
        'border-collapse',
        'w-full'
    ]);

    // Header
    const thead = createNode('thead');

    const trh = createNode('tr');

    headers.forEach(h => {

        const th = createNode(
            'th',
            ['border', 'p-2', 'bg-gray-100'],
            h
        );

        trh.appendChild(th);
    });

    thead.appendChild(trh);

    table.appendChild(thead);

    // Body
    const tbody = createNode('tbody');

    rows.forEach(row => {

        const tr = createNode('tr');

        row.forEach(col => {

            const td = createNode(
                'td',
                ['border', 'p-2', 'text-center'],
                `${checkDecimals(col)}`
            );

            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    card.appendChild(table);

    output.appendChild(card);

    return card;
};

// ============================================
// BFS
// ============================================

const printBFS = (vector, z) => {

    printSubtitle('Solución Básica Factible');

    const headers = vector.map((_, i) => `x${i + 1}`);

    printTable(headers, [vector]);

    const div = createNode(
        'div',
        ['font-bold', 'mt-2'],
        `Z = ${checkDecimals(z)}`
    );

    output.appendChild(div);
};

// ============================================
// RESPUESTA FINAL
// ============================================

const printAnswer = (variables, z, iteraciones = 0) => {

    printSubtitle('Solución Óptima');

    let html = `
        <div class="bg-green-100 border border-green-500 rounded p-4">
            <p class="font-bold text-green-700">
                Valor óptimo:
            </p>

            <p class="text-xl font-bold mb-3">
                Z = ${checkDecimals(z)}
            </p>
    `;

    Object.entries(variables).forEach(([k, v]) => {

        html += `
            <p>
                <strong>${k}</strong> = ${checkDecimals(v)}
            </p>
        `;
    });

    html += `
        <div class="mt-3 text-sm text-gray-600">
            Iteraciones: ${iteraciones}
        </div>
    `;

    html += '</div>';

    const div = document.createElement('div');

    div.innerHTML = html;

    output.appendChild(div);
};

// ============================================
// WARNING
// ============================================

const printWarning = (msg) => {

    const div = createNode(
        'div',
        ['bg-yellow-100', 'border-l-4', 'border-yellow-500', 'p-3', 'rounded', 'mb-3'],
        msg
    );

    output.appendChild(div);
};

// ============================================
// VARIABLES ENTRANTE / SALIENTE
// ============================================

const printEnteringLeavingVar = (entering, leaving) => {

    const div = createNode(
        'div',
        ['bg-gray-100', 'p-3', 'rounded', 'mb-3']
    );

    div.innerHTML = `
        <p>
            <strong>Variable entrante:</strong> ${entering}
        </p>

        <p>
            <strong>Variable saliente:</strong> ${leaving}
        </p>
    `;

    output.appendChild(div);
};

// ============================================
// RAZONES
// ============================================

const printRatio = (ratio) => {

    const rows = ratio.map((r, i) => [
        `Fila ${i + 1}`,
        isFinite(r) ? checkDecimals(r) : '∞'
    ]);

    printTable(
        ['Restricción', 'Razón'],
        rows,
        'Razones Simplex'
    );
};

console.log("✅ dom.js listo");