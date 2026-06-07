// ============================================
// grafico.js - Método Gráfico
// ============================================

console.log("✅ grafico.js cargado");

function grafico(problemaTexto) {
    console.log("📈 Resolviendo gráficamente:", problemaTexto);
    
    const plotDiv = document.getElementById('plot');
    const rGrafico = document.getElementById('r_grafico');
    
    if (rGrafico) {
        rGrafico.classList.remove('hidden');
    }
    
    if (plotDiv) {
        plotDiv.innerHTML = `
            <div class="text-center p-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                <i class="fas fa-chart-line text-5xl text-blue-500 mb-4"></i>
                <h4 class="text-xl font-semibold text-gray-800 mb-2">Método Gráfico</h4>
                <p class="text-gray-600">Procesando problema con 2 variables...</p>
                <div class="mt-4 p-4 bg-white rounded-lg text-left">
                    <p class="font-mono text-sm whitespace-pre-wrap">${problemaTexto.replace(/</g, '&lt;')}</p>
                </div>
                <div class="mt-4 p-3 bg-yellow-50 rounded-lg">
                    <p class="text-sm text-yellow-700">
                        <i class="fas fa-info-circle mr-2"></i>
                        Para ver el gráfico completo, asegúrate de que el problema tenga exactamente 2 variables (x1, x2)
                    </p>
                </div>
            </div>
        `;
    }
    
    // También intentar resolver numéricamente
    if (typeof calcularSimplex === 'function') {
        calcularSimplex(problemaTexto);
    }
    
    return true;
}

console.log("✅ grafico.js listo");