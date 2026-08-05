let CostoT=[];
let TipoObjetivo;
let vector_inecuacion=[];
let CoefX1=[];
let CoefX2=[];
let X1_FunObj;
let X2_FunObj;
let malCoeficiente = [];


function vaciarArreglos(){
    CostoT=[];
    vector_inecuacion=[];
    CoefX1=[];
    CoefX2=[];
}

function terminos(entrada){
    vaciarArreglos();
    let restricciones = [];
    let equivalenciasRestricciones = [];
    let resultadoRestricciones = [];
    let partes = entrada.value.trim().split('\n');
    let posible = true;

    console.log(partes);

    for (let i = 0; i < partes.length; i++) {
        if (i == 0) {
            if (partes[i].trim().includes("max")) {
                TipoObjetivo = "max";
            } else if (partes[i].trim().includes("min")) {
                TipoObjetivo = "min";
            }
        }

        partes[i] = partes[i].trim().replace("max = ", "").replace("min = ", "").replace("- ", "-").replace(" + ", " ");
        partes[i] = partes[i].split(" ");
        console.log("Parte "+(i+1)+" : "+partes[i]+"\t|\t"+partes[i].length);
        
        let variableInvalida = partes[i].some(term => /x[3-9]/.test(term));
        if (variableInvalida) {
            alert("Ingresaste variables con subindice diferente a 1 y 2\n\nPara mas claridad lee el manual");
            partes = [];
            posible = false;
            break;
        }
        let equivalencia;
        let resultado;

        if (i != 0 && partes[i].length > 4 ){
            alert("Ingresaste mas de dos variables, resuelve el problema con el metodo SIMPLEX\n\nPara mas claridad lee la teoria del inicio")
            partes = [];
            posible=false;
            break;

        } else if (i == 0 && partes[i].length == 2 && ( !(Math.sign(partes[i][0]) < 0 && Math.sign(partes[i][1]) < 0) ) ){
            restricciones.push([partes[i][0], partes[i][0]]);
            X1_FunObj = parseFloat(partes[i][0]);
            X2_FunObj = parseFloat(partes[i][1]);
            
        } else if(i != 0 && partes[i].length == 3 && partes[i][0].includes("x1")){
            // 🔥 CORREGIDO: Manejar términos sin coeficiente explícito
            let coef = partes[i][0];
            if (coef === "x1" || coef === "x2") {
                coef = "1" + coef;
            }
            CoefX1.push(parseFloat(coef));
            CoefX2.push(0);
            vector_inecuacion.push(partes[i][1]);
            CostoT.push(parseFloat(partes[i][2]));
        
        } else if(i != 0 && partes[i].length == 3 && partes[i][0].includes("x2")){
            let coef = partes[i][0];
            if (coef === "x1" || coef === "x2") {
                coef = "1" + coef;
            }
            CoefX1.push(0);
            CoefX2.push(parseFloat(coef));
            vector_inecuacion.push(partes[i][1]);
            CostoT.push(parseFloat(partes[i][2]));
        
        } else if (i != 0 && partes[i].length == 4) {
            // 🔥 CORREGIDO: Manejar términos sin coeficiente explícito
            let coef1 = partes[i][0];
            let coef2 = partes[i][1];
            if (coef1 === "x1" || coef1 === "x2") coef1 = "1" + coef1;
            if (coef2 === "x1" || coef2 === "x2") coef2 = "1" + coef2;
            
            CoefX1.push(parseFloat(coef1));
            CoefX2.push(parseFloat(coef2));
            vector_inecuacion.push(partes[i][2]);
            CostoT.push(parseFloat(partes[i][3]));
                
        } else if(i != 0 && partes[i].length <= 2 || (i != 0 && partes[i].length == 3 && !partes[i][0].includes("x")) || (partes[i].length == 3 && typeof(partes[i][2]) != Number)) {
            alert("Ingresaste mal el problema, ingresaste una mala sintaxis o no incluiste variables ");
            partes = [];
            posible=false;
            break;
        }
    }       
    
    if(posible){            
        GraficarRestricciones();
    }else{
        return 0;
    }
}

function calcularIntersecciones() {
    let puntos = [];
    let tolerancia = 0.0001;
    
    // Intersección entre restricciones
    for (let i = 0; i < CoefX1.length; i++) {
        for (let j = i + 1; j < CoefX1.length; j++) {
            const a1 = CoefX1[i], b1 = CoefX2[i], c1 = CostoT[i];
            const a2 = CoefX1[j], b2 = CoefX2[j], c2 = CostoT[j];
            const det = a1 * b2 - a2 * b1;
            
            if (Math.abs(det) > tolerancia) {
                const x = (c1 * b2 - c2 * b1) / det;
                const y = (a1 * c2 - a2 * c1) / det;

                if (x >= -tolerancia && y >= -tolerancia) {
                    const xf = Math.max(0, x);
                    const yf = Math.max(0, y);
                    const z = (X1_FunObj * xf) + (X2_FunObj * yf);
                    puntos.push([xf, yf, z, `R${i+1} ∩ R${j+1}`]);
                }
            }
        }
    }

    // Intersección con ejes
    for (let i = 0; i < CoefX1.length; i++) {
        // Con eje X (y = 0)
        if (Math.abs(CoefX1[i]) > tolerancia) {
            const x = CostoT[i] / CoefX1[i];
            if (x >= -tolerancia) {
                const xf = Math.max(0, x);
                const z = X1_FunObj * xf;
                const existe = puntos.some(p => Math.abs(p[0] - xf) < tolerancia && Math.abs(p[1]) < tolerancia);
                if (!existe) {
                    puntos.push([xf, 0, z, `R${i+1} ∩ eje X`]);
                }
            }
        }

        // Con eje Y (x = 0)
        if (Math.abs(CoefX2[i]) > tolerancia) {
            const y = CostoT[i] / CoefX2[i];
            if (y >= -tolerancia) {
                const yf = Math.max(0, y);
                const z = X2_FunObj * yf;
                const existe = puntos.some(p => Math.abs(p[0]) < tolerancia && Math.abs(p[1] - yf) < tolerancia);
                if (!existe) {
                    puntos.push([0, yf, z, `R${i+1} ∩ eje Y`]);
                }
            }
        }
    }

    return puntos;
}

function esFactible(x, y) {
    let tolerancia = 0.0001;
    for (let i = 0; i < CoefX1.length; i++) {
        let val = CoefX1[i] * x + CoefX2[i] * y;
        if (vector_inecuacion[i] === '<=' && val > CostoT[i] + tolerancia) {
            return false;
        }
        if (vector_inecuacion[i] === '>=' && val < CostoT[i] - tolerancia) {
            return false;
        }
        if (vector_inecuacion[i] === '=' && Math.abs(val - CostoT[i]) > tolerancia) {
            return false;
        }
    }
    // Verificar no negatividad
    if (x < -tolerancia || y < -tolerancia) return false;
    return true;
}

function obtenerPuntosFactibles() {
    const puntosInterseccion = calcularIntersecciones();
    const puntosFactibles = puntosInterseccion.filter(punto => esFactible(punto[0], punto[1]));
    
    // Añadir origen si es factible
    if (esFactible(0, 0)) {
        const existe = puntosFactibles.some(p => Math.abs(p[0]) < 0.0001 && Math.abs(p[1]) < 0.0001);
        if (!existe) {
            puntosFactibles.push([0, 0, 0, "Origen"]);
        }
    }
    
    return puntosFactibles;
}

function encontrarZOptima(puntosFactibles) {
    let zOptima = TipoObjetivo === "max" ? -Infinity : Infinity;
    let puntoOptimo = null;

    puntosFactibles.forEach(punto => {
        const z = (X1_FunObj * punto[0]) + (X2_FunObj * punto[1]);
        punto[2] = z; // Actualizar Z
        if (TipoObjetivo === "max") {
            if (z > zOptima) {
                zOptima = z;
                puntoOptimo = punto;
            }
        } else {
            if (z < zOptima) {
                zOptima = z;
                puntoOptimo = punto;
            }
        }
    });

    return { zOptima, puntoOptimo };
}

function ordenarPuntosConvexHull(puntos) {
    if (puntos.length < 3) return puntos;
    
    // Encontrar el punto más a la izquierda y abajo
    const inicio = puntos.reduce((min, p) => {
        if (p[0] < min[0] - 0.0001 || (Math.abs(p[0] - min[0]) < 0.0001 && p[1] < min[1])) return p;
        return min;
    });
    
    // Ordenar por ángulo polar
    const sorted = puntos.filter(p => p !== inicio).sort((a, b) => {
        const angleA = Math.atan2(a[1] - inicio[1], a[0] - inicio[0]);
        const angleB = Math.atan2(b[1] - inicio[1], b[0] - inicio[0]);
        return angleA - angleB;
    });
    
    return [inicio, ...sorted];
}

function GraficarRestricciones() {
    let traces = [];
    let puntosInterseccion = calcularIntersecciones();
    let puntosFactibles = obtenerPuntosFactibles();
    let { zOptima, puntoOptimo } = encontrarZOptima(puntosFactibles);
    
    // Determinar rango de la gráfica
    let maxValor = Math.max(...CostoT, 10);
    let rangoGrafico = maxValor * 1.3;

    // Dibujar restricciones
    CoefX1.forEach((coefX1, index) => {
        const coefX2 = CoefX2[index];
        const costo = CostoT[index];

        let xValues = [];
        let yValues = [];

        if (Math.abs(coefX1) > 0.0001 && Math.abs(coefX2) > 0.0001) {
            // Línea con pendiente
            const xIntercept = costo / coefX1;
            const yIntercept = costo / coefX2;
            
            if (xIntercept >= 0 && yIntercept >= 0) {
                xValues = [0, xIntercept];
                yValues = [yIntercept, 0];
            } else if (xIntercept >= 0) {
                xValues = [xIntercept, xIntercept];
                yValues = [0, rangoGrafico];
            } else if (yIntercept >= 0) {
                xValues = [0, rangoGrafico];
                yValues = [yIntercept, yIntercept];
            }
        } else if (Math.abs(coefX1) > 0.0001 && Math.abs(coefX2) < 0.0001) {
            // Línea VERTICAL
            const x = costo / coefX1;
            if (x >= 0) {
                xValues = [x, x];
                yValues = [0, rangoGrafico];
            }
        } else if (Math.abs(coefX1) < 0.0001 && Math.abs(coefX2) > 0.0001) {
            // Línea HORIZONTAL
            const y = costo / coefX2;
            if (y >= 0) {
                xValues = [0, rangoGrafico];
                yValues = [y, y];
            }
        }

        // Filtrar puntos válidos
        const puntosValidos = xValues.map((x, i) => ({ x, y: yValues[i] }))
            .filter(p => isFinite(p.x) && isFinite(p.y) && p.x >= 0 && p.y >= 0);
        
        if (puntosValidos.length < 2) return;
        
        xValues = puntosValidos.map(p => p.x);
        yValues = puntosValidos.map(p => p.y);

        let trace = {
            x: xValues,
            y: yValues,
            mode: 'lines',
            name: `R${index + 1}: ${vector_inecuacion[index]}`,
            line: {
                color: '#666666',
                width: 2
            },
            hovertemplate: `R${index + 1}<br>X1: %{x:.2f}<br>X2: %{y:.2f}<extra></extra>`
        };

        traces.push(trace);
    });

    // 🔥 REGIÓN FACTIBLE - CORREGIDA
    if (puntosFactibles.length >= 3) {
        // Ordenar puntos para formar el polígono
        const puntosOrdenados = ordenarPuntosConvexHull([...puntosFactibles]);
        
        // Crear polígono cerrado
        const xFill = puntosOrdenados.map(p => p[0]);
        const yFill = puntosOrdenados.map(p => p[1]);
        xFill.push(puntosOrdenados[0][0]);
        yFill.push(puntosOrdenados[0][1]);

        let regionFactible = {
            x: xFill,
            y: yFill,
            fill: 'toself',
            fillcolor: 'rgba(46, 204, 113, 0.35)',
            mode: 'lines',
            name: 'Región Factible',
            line: {
                color: 'rgba(46, 204, 113, 0)',
                width: 0
            },
            hovertemplate: 'Región Factible<extra></extra>'
        };

        traces.push(regionFactible);
    }

    // Puntos de intersección
    let puntos = {
        x: puntosInterseccion.map(punto => punto[0]),
        y: puntosInterseccion.map(punto => punto[1]),
        mode: 'markers',
        type: 'scatter',
        name: 'Intersecciones',
        marker: {
            color: '#3498db',
            size: 10,
            line: {
                color: '#ffffff',
                width: 2
            }
        },
        text: puntosInterseccion.map(p => {
            const factible = esFactible(p[0], p[1]) ? '✅ Factible' : '❌ No factible';
            return `(${p[0].toFixed(2)}, ${p[1].toFixed(2)})<br>Z = ${p[2].toFixed(2)}<br>${factible}`;
        }),
        hovertemplate: '%{text}<extra></extra>'
    };

    // Punto óptimo
    let puntoOptimoPlot = {
        x: [puntoOptimo[0]],
        y: [puntoOptimo[1]],
        mode: 'markers+text',
        type: 'scatter',
        name: '⭐ Óptimo',
        marker: {
            color: '#27ae60',
            size: 22,
            symbol: 'star',
            line: {
                color: '#ffffff',
                width: 3
            }
        },
        text: [`(${puntoOptimo[0].toFixed(2)}, ${puntoOptimo[1].toFixed(2)})<br>Z = ${zOptima.toFixed(2)}`],
        textposition: 'top center',
        textfont: {
            size: 13,
            color: '#27ae60',
            family: 'Arial, sans-serif',
            weight: 'bold'
        },
        hovertemplate: `⭐ ÓPTIMO<br>X1: ${puntoOptimo[0].toFixed(2)}<br>X2: ${puntoOptimo[1].toFixed(2)}<br>Z = ${zOptima.toFixed(2)}<extra></extra>`
    };

    traces.push(puntos);
    traces.push(puntoOptimoPlot);

    // Layout
    let layout = {
        title: {
            text: `Método Gráfico - Z = ${zOptima.toFixed(2)}`,
            font: {
                size: 20,
                color: '#2d3436',
                family: 'Poppins, sans-serif'
            }
        },
        xaxis: {
            title: 'X₁',
            range: [0, rangoGrafico],
            gridcolor: '#ecf0f1',
            showgrid: true,
            zeroline: true,
            zerolinecolor: '#2d3436',
            zerolinewidth: 2
        },
        yaxis: {
            title: 'X₂',
            range: [0, rangoGrafico],
            gridcolor: '#ecf0f1',
            showgrid: true,
            zeroline: true,
            zerolinecolor: '#2d3436',
            zerolinewidth: 2
        },
        hovermode: 'closest',
        plot_bgcolor: '#ffffff',
        paper_bgcolor: '#f8f9fa',
        font: {
            family: 'Poppins, sans-serif'
        },
        showlegend: true,
        legend: {
            x: 1.02,
            y: 1,
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            bordercolor: '#e0e0e0',
            borderwidth: 1
        },
        margin: {
            l: 60,
            r: 150,
            t: 50,
            b: 60
        }
    };

    Plotly.newPlot('plot', traces, layout, {responsive: true});
    
    // 🔥 TABLA DE RESULTADOS
    let resultTable = `
    <div class="overflow-x-auto">
        <table class="table-auto w-full border-collapse">
            <thead>
                <tr>
                    <th class="px-6 py-2 border border-blue-400 bg-blue-500 text-white font-semibold">X1</th>
                    <th class="px-6 py-2 border border-blue-400 bg-blue-500 text-white font-semibold">X2</th>
                    <th class="px-6 py-2 border border-blue-400 bg-blue-500 text-white font-semibold">Z</th>
                    <th class="px-6 py-2 border border-blue-400 bg-blue-500 text-white font-semibold">Intersección</th>
                    <th class="px-6 py-2 border border-blue-400 bg-blue-500 text-white font-semibold">Factible</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Ordenar puntos por Z para mejor visualización
    const puntosOrdenadosTabla = [...puntosInterseccion].sort((a, b) => a[2] - b[2]);
    
    puntosOrdenadosTabla.forEach((punto) => {
        const esPuntoFactible = esFactible(punto[0], punto[1]);
        const ColorFila = !esPuntoFactible ? 'bg-red-100 text-red-700' : 'hover:bg-green-50';
        const factibleText = esPuntoFactible ? '✅ Sí' : '❌ No';
        resultTable += `
                <tr class="${ColorFila}">
                    <td class="px-6 py-2 border border-slate-300 text-center font-mono">${punto[0].toFixed(4)}</td>
                    <td class="px-6 py-2 border border-slate-300 text-center font-mono">${punto[1].toFixed(4)}</td>
                    <td class="px-6 py-2 border border-slate-300 text-center font-mono font-bold">${punto[2].toFixed(4)}</td>
                    <td class="px-6 py-2 border border-slate-300 text-center">${punto[3] || '—'}</td>
                    <td class="px-6 py-2 border border-slate-300 text-center font-semibold">${factibleText}</td>
                </tr>
        `;
    });
    
    resultTable += `
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('result').innerHTML = resultTable;

       // 🔥 SOLUCIÓN ÓPTIMA - Se mantiene en el panel de la derecha
    let optimaTable = `
    <div class="text-center">
        <h3 class="py-4 text-2xl font-bold text-green-600 mb-4">⭐ Solución Óptima</h3>
        <div class="bg-green-50 p-6 rounded-lg border-2 border-green-300">
            <table class="table-auto mx-auto">
                <thead>
                    <tr>
                        <th class="px-6 py-2 border border-green-400 bg-green-500 text-white font-semibold">X₁</th>
                        <th class="px-6 py-2 border border-green-400 bg-green-500 text-white font-semibold">X₂</th>
                        <th class="px-6 py-2 border border-green-400 bg-green-500 text-white font-semibold">Z (${TipoObjetivo.toUpperCase()})</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="bg-white">
                        <td class="px-6 py-3 border border-green-300 font-semibold text-center text-2xl text-green-700">${puntoOptimo[0].toFixed(4)}</td>
                        <td class="px-6 py-3 border border-green-300 font-semibold text-center text-2xl text-green-700">${puntoOptimo[1].toFixed(4)}</td>
                        <td class="px-6 py-3 border border-green-300 font-semibold text-center text-2xl text-green-600">${zOptima.toFixed(4)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
    `;

    document.getElementById('optima').innerHTML = optimaTable;

    // 🔥 NUEVO: Agregar mensaje al panel de RESUMEN
    agregarMensajeResumen(puntoOptimo, zOptima);
}

// 🔥 NUEVA FUNCIÓN: Agregar mensaje al resumen
function agregarMensajeResumen(puntoOptimo, zOptima) {
    const summaryContent = document.getElementById('summary-content');
    
    // Buscar si ya existe un mensaje de solución óptima en el resumen
    let mensajeExistente = summaryContent.querySelector('.mensaje-solucion-optima');
    
    if (mensajeExistente) {
        // Actualizar mensaje existente
        mensajeExistente.innerHTML = `
            <div class="mt-4 p-4 bg-green-100 rounded-lg border-2 border-green-300 mensaje-solucion-optima">
                <p class="text-base text-gray-700 font-semibold">
                    ✅ Se deben producir <strong class="text-green-700">${Math.round(puntoOptimo[0])}</strong> unidades de X₁ y 
                    <strong class="text-green-700">${Math.round(puntoOptimo[1])}</strong> unidades de X₂
                </p>
                <p class="text-base text-gray-700 font-semibold mt-1">
                    📊 Valor óptimo de la función objetivo: <strong class="text-green-700">Z = ${zOptima.toFixed(2)}</strong>
                </p>
            </div>
        `;
    } else {
        // Crear nuevo mensaje
        const mensajeDiv = document.createElement('div');
        mensajeDiv.className = 'mt-4 p-4 bg-green-100 rounded-lg border-2 border-green-300 mensaje-solucion-optima';
        mensajeDiv.innerHTML = `
            <p class="text-base text-gray-700 font-semibold">
                ✅ Se deben producir <strong class="text-green-700">${Math.round(puntoOptimo[0])}</strong> unidades de X₁ y 
                <strong class="text-green-700">${Math.round(puntoOptimo[1])}</strong> unidades de X₂
            </p>
            <p class="text-base text-gray-700 font-semibold mt-1">
                📊 Valor óptimo de la función objetivo: <strong class="text-green-700">Z = ${zOptima.toFixed(2)}</strong>
            </p>
        `;
        summaryContent.appendChild(mensajeDiv);
    }
}