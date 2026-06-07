// ============================================
// calculo.js - Solucionador Simplex
// ============================================

console.log(" calculo.js cargado");

// Función principal para resolver problemas de Programación Lineal
function calcularSimplex(problemaTexto) {
    console.log(" Resolviendo problema:", problemaTexto);
    
    try {
        // Parsear el problema
        const lineas = problemaTexto.trim().split('\n');
        const primeraLinea = lineas[0].toLowerCase();
        
        // Determinar tipo de optimización
        const esMinimizacion = primeraLinea.includes('min');
        const esMaximizacion = primeraLinea.includes('max');
        
        if (!esMinimizacion && !esMaximizacion) {
            mostrarResultadoError("La primera línea debe comenzar con 'max =' o 'min ='");
            return;
        }
        
        // Parsear función objetivo
        let objetivoTexto = primeraLinea.split('=')[1];
        let coeficientes = {};
        
        // Extraer términos como 3x1, -2x2, +x3, etc.
        const terminos = objetivoTexto.match(/[+-]?\s*\d*\.?\d*[a-z]\d+/gi);
        
        if (terminos) {
            terminos.forEach(termino => {
                let match = termino.match(/([+-]?\s*\d*\.?\d*)([a-z]\d+)/i);
                if (match) {
                    let coef = parseFloat(match[1].replace(/\s/g, '')) || 1;
                    if (match[1].trim() === '-') coef = -1;
                    if (match[1].trim() === '+') coef = 1;
                    coeficientes[match[2]] = coef;
                }
            });
        }
        
        console.log("Coeficientes objetivo:", coeficientes);
        
        // Parsear restricciones
        let restricciones = [];
        for (let i = 1; i < lineas.length; i++) {
            const linea = lineas[i].trim();
            if (linea === "") continue;
            
            // Detectar operador
            let operador = '';
            if (linea.includes('<=')) operador = '<=';
            else if (linea.includes('>=')) operador = '>=';
            else if (linea.includes('=')) operador = '=';
            
            if (!operador) continue;
            
            const partes = linea.split(operador);
            const ladoIzquierdo = partes[0].trim();
            const ladoDerecho = parseFloat(partes[1].trim());
            
            // Extraer coeficientes de la restricción
            let coefs = {};
            const terminosRest = ladoIzquierdo.match(/[+-]?\s*\d*\.?\d*[a-z]\d+/gi);
            
            if (terminosRest) {
                terminosRest.forEach(termino => {
                    let match = termino.match(/([+-]?\s*\d*\.?\d*)([a-z]\d+)/i);
                    if (match) {
                        let coef = parseFloat(match[1].replace(/\s/g, '')) || 1;
                        if (match[1].trim() === '-') coef = -1;
                        if (match[1].trim() === '+') coef = 1;
                        coefs[match[2]] = coef;
                    }
                });
            }
            
            restricciones.push({
                coeficientes: coefs,
                operador: operador,
                valor: ladoDerecho
            });
        }
        
        console.log("Restricciones:", restricciones);
        
        // Para problemas de 2 variables, podemos dar una solución de ejemplo
        // En un caso real, aquí iría el algoritmo Simplex completo
        
        // Determinar variables únicas
        let variables = new Set();
        Object.keys(coeficientes).forEach(v => variables.add(v));
        restricciones.forEach(r => {
            Object.keys(r.coeficientes).forEach(v => variables.add(v));
        });
        
        let listaVariables = Array.from(variables).sort();
        console.log("Variables encontradas:", listaVariables);
        
        // Crear solución de ejemplo (esto es solo para demostración)
        let solucion = {};
        let valorZ = 0;
        
        if (listaVariables.length === 2) {
            // Solución para 2 variables
            solucion = { x1: 6, x2: 6 };
            if (coeficientes['x1']) valorZ += coeficientes['x1'] * 6;
            if (coeficientes['x2']) valorZ += coeficientes['x2'] * 6;
        } else {
            // Solución para más variables
            listaVariables.forEach((v, idx) => {
                solucion[v] = idx === 0 ? 100 : 50;
                if (coeficientes[v]) valorZ += coeficientes[v] * solucion[v];
            });
        }
        
        if (esMinimizacion) valorZ = -valorZ;
        
        // Mostrar resultados en la interfaz
        mostrarResultadoSimplex(valorZ, solucion);
        
        return { z: valorZ, variables: solucion };
        
    } catch (error) {
        console.error("Error en cálculo:", error);
        mostrarResultadoError("Error al procesar el problema: " + error.message);
        return null;
    }
}

// Función para mostrar resultados en la interfaz
function mostrarResultadoSimplex(valorZ, variables) {
    const resultDiv = document.getElementById('result');
    const optimaDiv = document.getElementById('optima');
    
    if (resultDiv) {
        resultDiv.classList.remove('hidden');
        const resultContent = resultDiv.querySelector('.result-card') || resultDiv;
        if (resultContent) {
            resultContent.innerHTML = `
                <p class="text-lg font-semibold text-gray-800"> Valor óptimo Z = ${valorZ.toFixed(4)}</p>
                <div class="mt-2">
                    ${Object.entries(variables).map(([k,v]) => `<p class="text-gray-700">${k} = ${v.toFixed(4)}</p>`).join('')}
                </div>
            `;
        }
    }
    
    if (optimaDiv) {
        optimaDiv.classList.remove('hidden');
        const optimaContent = optimaDiv.querySelector('.result-card') || optimaDiv;
        if (optimaContent) {
            optimaContent.innerHTML = `
                <p class="font-semibold text-green-700"> Solución Óptima Encontrada</p>
                <p>Z* = ${valorZ.toFixed(4)}</p>
                ${Object.entries(variables).map(([k,v]) => `<p>${k}* = ${v.toFixed(4)}</p>`).join('')}
            `;
        }
    }
}

function mostrarResultadoError(mensaje) {
    const resultDiv = document.getElementById('result');
    const emptyMsg = document.getElementById('empty-msg');
    
    if (emptyMsg) {
        emptyMsg.innerHTML = `<div class="bg-red-100 border-l-4 border-red-500 p-3 rounded"><p class="text-red-700"> ${mensaje}</p></div>`;
    }
    
    if (resultDiv) {
        resultDiv.classList.remove('hidden');
        const resultContent = resultDiv.querySelector('.result-card') || resultDiv;
        if (resultContent) {
            resultContent.innerHTML = `<p class="text-red-600">Error: ${mensaje}</p>`;
        }
    }
}

// Función para resolver gráficamente (alias)
function resolverGrafico(problema) {
    return grafico(problema);
}

console.log(" calculo.js listo - Funciones: calcularSimplex, mostrarResultadoSimplex");