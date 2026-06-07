// ============================================
// dom.js - Manejo de la interfaz
// ============================================

console.log("✅ dom.js cargado");

document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 Inicializando interfaz...");
    
    const solveBtn = document.getElementById('solve');
    const resetBtn = document.getElementById('reset');
    const methodSelect = document.getElementById('method-select');
    const problemTextarea = document.getElementById('problem');
    const emptyMsg = document.getElementById('empty-msg');
    
    // Cargar ejemplo por defecto
    if (problemTextarea && problemTextarea.value === "") {
        problemTextarea.value = `max = 3x1 + 2x2
            2x1 + x2 <= 18
            2x1 + 3x2 <= 42
            3x1 + x2 >= 24
            x1 >= 0
            x2 >= 0`;
    }
    
    // Botón Calcular
    if (solveBtn) {
        solveBtn.addEventListener('click', function() {
            console.log("🔘 Click en Calcular");
            
            const method = methodSelect ? methodSelect.value : 'simplex';
            const problem = problemTextarea ? problemTextarea.value : '';
            
            if (!problem.trim()) {
                if (emptyMsg) {
                    emptyMsg.innerHTML = '<div class="bg-red-100 border-l-4 border-red-500 p-3 rounded"><p class="text-red-700">⚠️ Por favor ingresa un problema</p></div>';
                }
                return;
            }
            
            if (emptyMsg) emptyMsg.innerHTML = '';
            
            // Guardar en historial
            guardarEnHistorial(problem, method);
            
            // Resolver según método
            if (method === 'grafico') {
                if (typeof grafico === 'function') {
                    grafico(problem);
                } else {
                    console.error("Función gráfico no encontrada");
                    mostrarError("Método gráfico no disponible. Usando Simplex.");
                    if (typeof calcularSimplex === 'function') {
                        calcularSimplex(problem);
                    }
                }
            } else {
                if (typeof calcularSimplex === 'function') {
                    calcularSimplex(problem);
                } else {
                    console.error("Función simplex no encontrada");
                    mostrarError("Error: Las funciones de cálculo no están disponibles");
                }
            }
        });
    }
    
    // Botón Limpiar
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            console.log("🧹 Limpiando todo");
            if (problemTextarea) problemTextarea.value = "";
            if (emptyMsg) emptyMsg.innerHTML = "";
            
            // Ocultar secciones de resultados
            document.querySelectorAll('#r_grafico, #result, #optima, #output').forEach(el => {
                if (el) el.classList.add('hidden');
            });
            
            const plotDiv = document.getElementById('plot');
            if (plotDiv) plotDiv.innerHTML = "";
        });
    }
    
    // Checkbox de información adicional
    const lista = document.getElementById('lista');
    const infoAdicional = document.getElementById('informacionAdicional');
    if (lista && infoAdicional) {
        lista.addEventListener('change', function() {
            if (this.checked) {
                infoAdicional.classList.remove('hidden');
            } else {
                infoAdicional.classList.add('hidden');
            }
        });
    }
    
    // Modal de historial
    const modal = document.getElementById('history-modal');
    const historyBtn = document.getElementById('history');
    
    if (historyBtn && modal) {
        historyBtn.onclick = () => modal.classList.add('is-active');
        
        modal.querySelectorAll('.delete, .modal-background, #close-history-modal').forEach(el => {
            if (el) el.onclick = () => modal.classList.remove('is-active');
        });
    }
    
    console.log("✅ Interfaz inicializada correctamente");
});

// Funciones de historial
function guardarEnHistorial(problema, metodo) {
    try {
        let historial = localStorage.getItem('simplexHistorial');
        historial = historial ? JSON.parse(historial) : [];
        
        historial.unshift({
            problema: problema.substring(0, 300),
            metodo: metodo,
            fecha: new Date().toLocaleString()
        });
        
        if (historial.length > 20) historial = historial.slice(0, 20);
        localStorage.setItem('simplexHistorial', JSON.stringify(historial));
        actualizarModalHistorial();
    } catch(e) {
        console.warn("Error guardando historial:", e);
    }
}

function actualizarModalHistorial() {
    const historyContent = document.getElementById('history-content');
    if (!historyContent) return;
    
    try {
        const historial = JSON.parse(localStorage.getItem('simplexHistorial') || '[]');
        
        if (historial.length === 0) {
            historyContent.innerHTML = '<p class="text-gray-500 text-center py-8">No hay historial. Resuelve problemas para guardarlos.</p>';
            return;
        }
        
        let html = '<div class="space-y-3">';
        historial.forEach((item, index) => {
            html += `
                <div class="border rounded-lg p-3">
                    <div class="flex justify-between">
                        <span class="text-xs font-semibold px-2 py-1 rounded ${item.metodo === 'simplex' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}">
                            ${item.metodo === 'simplex' ? '⚡ Simplex' : '📊 Gráfico'}
                        </span>
                        <span class="text-xs text-gray-400">${item.fecha}</span>
                    </div>
                    <pre class="text-xs font-mono bg-gray-100 p-2 rounded mt-2 overflow-x-auto">${escapeHtml(item.problema)}</pre>
                    <button onclick="cargarProblemaHistorial(${index})" class="mt-2 text-blue-600 text-sm hover:underline">
                        <i class="fas fa-upload mr-1"></i>Cargar problema
                    </button>
                </div>
            `;
        });
        html += '</div>';
        historyContent.innerHTML = html;
    } catch(e) {
        console.error("Error cargando historial:", e);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function cargarProblemaHistorial(index) {
    try {
        const historial = JSON.parse(localStorage.getItem('simplexHistorial') || '[]');
        if (historial[index]) {
            const problemTextarea = document.getElementById('problem');
            if (problemTextarea) {
                problemTextarea.value = historial[index].problema;
                const modal = document.getElementById('history-modal');
                if (modal) modal.classList.remove('is-active');
                mostrarMensaje("Problema cargado correctamente", "success");
            }
        }
    } catch(e) {
        console.error("Error:", e);
    }
}

function mostrarMensaje(mensaje, tipo = "info") {
    const emptyMsg = document.getElementById('empty-msg');
    if (!emptyMsg) return;
    
    const colores = {
        success: 'bg-green-100 border-green-400 text-green-700',
        error: 'bg-red-100 border-red-400 text-red-700',
        info: 'bg-blue-100 border-blue-400 text-blue-700'
    };
    
    emptyMsg.innerHTML = `<div class="border-l-4 p-3 rounded ${colores[tipo]} mb-3"><p class="text-sm">${mensaje}</p></div>`;
    
    setTimeout(() => {
        if (emptyMsg.innerHTML.includes(mensaje)) {
            emptyMsg.innerHTML = '';
        }
    }, 3000);
}

function mostrarError(mensaje) {
    mostrarMensaje(mensaje, "error");
}

console.log("✅ dom.js listo");