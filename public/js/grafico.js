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
    terminosX1=[];
    terminosX2=[];
}

function terminos(entrada){
        vaciarArreglos();
        let restricciones = [];
        let equivalenciasRestricciones = [];
        let resultadoRestricciones = [];
        //let entradaMax = 'max = 22x1 + 45x2 \n1x1 - 3x2 <= 42\n4x1 - 8x2 <= 40\n0.5x1 + 1x2 <= 15';
        //let entradaMin = 'min = 2000x1 + 2000x2 \n1x1 + 2x2 >= 80\n3x1 + 2x2 >= 160\n5x1 + 2x2 >= 200'
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

            } else if (i == 0 && partes[i].length == 2 && ( !(Math.sign(partes[i][0]) < 0 && Math.sign(partes[i][1]) < 0) ) ){ //Funcion objetivo
                restricciones.push([partes[i][0], partes[i][0]]);
                X1_FunObj = parseFloat(partes[i][0]);
                X2_FunObj = parseFloat(partes[i][1]);
                
            }else if(i != 0 && partes[i].length == 3 && partes[i][0].includes("x1")){ //Restricciones solo con 1 termino
                CoefX1.push(parseFloat(partes[i][0]));
                CoefX2.push(0);
                vector_inecuacion.push(partes[i][1])
                CostoT.push(parseFloat(partes[i][2]));
        
            } else if(i != 0 && partes[i].length == 3 && partes[i][0].includes("x2")){ //Restricciones solo con 1 termino
                CoefX1.push(0);
                CoefX2.push(parseFloat(partes[i][0]));
                vector_inecuacion.push(partes[i][1])
                CostoT.push(parseFloat(partes[i][2]));
        
            } else if (i != 0 && partes[i].length == 4) { //Restricciones solo con 2 terminos
                CoefX1.push(parseFloat(partes[i][0]));
                CoefX2.push(parseFloat(partes[i][1]));
                vector_inecuacion.push(partes[i][2])
                CostoT.push(parseFloat(partes[i][3]));
                
            } else if(i != 0 && partes[i].length <= 2 || (i != 0 && partes[i].length == 3 && !partes[i][0].includes("x")) || (partes[i].length == 3 && typeof(partes[i][2]) != Number)) { //Si tienen menos de 1 termino o mas de 2, esta mal formulado
                alert("Ingresaste mal el problema, ingresaste una mala sintaxis o no incluiste variables ")
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

function calcularIntersecciones() { //CHECK
    let puntos = [];
    for (let i = 0; i < CoefX1.length; i++) {
        for (let j = i + 1; j < CoefX1.length; j++) {
            const a1 = CoefX1[i], b1 = CoefX2[i], c1 = CostoT[i];
            const a2 = CoefX1[j], b2 = CoefX2[j], c2 = CostoT[j];
            const det = a1 * b2 - a2 * b1;;
            if (det !== 0) {
                const x = (c1 * b2 - c2 * b1) / det;
                const y = (a1 * c2 - a2 * c1) / det;

                if (x >= 0 && y >= 0) {
                    const z = (X1_FunObj * x )+(X2_FunObj * y);
                    puntos.push([x, y, z, `Intersección R${i + 1} y R${j + 1}`]);
                }
            }
        }
    }

    for (let i = 0; i < CoefX1.length; i++) {
        if (CoefX1[i] !== 0) {
            const x = CostoT[i] / CoefX1[i];
            if (x >= 0) {
                const z = X1_FunObj * x;
                puntos.push([x, 0, z, `Intersección R${i + 1} y eje X`]);
    
            }
        }

        if (CoefX2[i] !== 0) {
            const y = CostoT[i] / CoefX2[i];
            if (y >= 0) {
                const z = X2_FunObj * y;
                puntos.push([0, y, z, `Intersección R${i + 1} y eje Y`]);

            }
        }
    }

    return puntos;
}
function esFactible(x, y) { //CHECK
    
    if(TipoObjetivo=="max"){
        for (let i = 0; i < CoefX1.length; i++) {
            let val = CoefX1[i] * x + CoefX2[i] * y;
            if ((vector_inecuacion[i] === '<=' && val > CostoT[i]) ||
                (vector_inecuacion[i] === '>=' && val < CostoT[i]) ||
                (vector_inecuacion[i] === '=' && val !== CostoT[i])) {
                return false;
            }
        }
        
        return true;
    }else if (TipoObjetivo == 'min') {
        
        for (let i = 0; i < CoefX1.length; i++) {
            let val = CoefX1[i] * x + CoefX2[i] * y;
            if ((vector_inecuacion[i] === '<=' && val > CostoT[i]) ||
                (vector_inecuacion[i] === '>=' && val < CostoT[i]) ||
                (vector_inecuacion[i] === '=' && val !== CostoT[i])) {
                return false;
            }
        }
       
        return true;
    }
}
function obtenerPuntosFactibles() { //CHECK

    
    const puntosInterseccion = calcularIntersecciones();
    const puntosFactibles = puntosInterseccion.filter(punto => esFactible(punto[0], punto[1]));
    
    // Verificar si el origen es factible
    const origenFactible = esFactible(0, 0);
    if (origenFactible) {
        puntosFactibles.push([0, 0, 0]);
    }
    
    return puntosFactibles;
}
function encontrarZOptima(puntosFactibles) { //CHECK

    
    let zOptima =TipoObjetivo==="max"? -Infinity:Infinity;
    let puntoOptimo = null;
  // 

    puntosFactibles.forEach(punto => {
        if(TipoObjetivo=="max"){
            
            if (punto[2] > zOptima) { 
                zOptima = punto[2];
                puntoOptimo = punto;
            }
        }else if(TipoObjetivo==="min"){
            
            if (punto[2] < zOptima) { 
                zOptima = punto[2];
                puntoOptimo = punto;
            }
        }
        
    });


    return { zOptima, puntoOptimo };
}

function ordenarPuntosConvexHull(puntos) {
    // Ordenar puntos en sentido antihorario para formar el casco convexo
    const centroid = {
        x: puntos.reduce((sum, p) => sum + p[0], 0) / puntos.length,
        y: puntos.reduce((sum, p) => sum + p[1], 0) / puntos.length
    };

    return puntos.sort((a, b) => {
        const angleA = Math.atan2(a[1] - centroid.y, a[0] - centroid.x);
        const angleB = Math.atan2(b[1] - centroid.y, b[0] - centroid.x);
        return angleA - angleB;
    });
}

function GraficarRestricciones() {
    let traces = [];
    let puntosInterseccion = calcularIntersecciones();
    let puntosFactibles = obtenerPuntosFactibles();
    let { zOptima, puntoOptimo } = encontrarZOptima(puntosFactibles);
    let valorMasGrande=Math.max(CostoT)

    // Dibujar restricciones en gris
    CoefX1.forEach((coefX1, index) => {
        const coefX2 = CoefX2[index];
        const costo = CostoT[index];

        let xValues = [];
        let yValues = [];

        if (coefX1 !== 0) {
            xValues.push(costo / coefX1, 0);
            yValues.push(0, costo / coefX2);
        } else {
            xValues.push(0, valorMasGrande);
            yValues.push(costo / coefX2, costo / coefX2);
        }

        if(coefX2 !==0){
            yValues.push(costo / coefX2, 0);
            xValues.push(0, costo / coefX1);
        }else{
            yValues.push(0, valorMasGrande);
            xValues.push(costo / coefX1, costo / coefX1);
        }

        let trace = {
            x: xValues,
            y: yValues,
            mode: 'lines',
            name: `Restricción ${index + 1}`,
            line: {
                color: '#999999',
                width: 2
            },
            hovertemplate: `Restricción ${index + 1}<br>X1: %{x}<br>X2: %{y}<extra></extra>`
        };

        traces.push(trace);
    });

    // Región factible con color verde claro y transparencia
    if (puntosFactibles.length > 0) {
        const puntosFill = ordenarPuntosConvexHull([...puntosFactibles]);
        const xFill = puntosFill.map(p => p[0]);
        const yFill = puntosFill.map(p => p[1]);
        
        // Cerrar la región
        xFill.push(puntosFill[0][0]);
        yFill.push(puntosFill[0][1]);

        let regioFactible = {
            x: xFill,
            y: yFill,
            fill: 'toself',
            fillcolor: 'rgba(46, 204, 113, 0.25)',
            mode: 'lines',
            name: 'Región Factible',
            line: {
                color: 'rgba(46, 204, 113, 0)',
                width: 0
            },
            hovertemplate: 'Región Factible<extra></extra>'
        };

        traces.push(regioFactible);
    }

    // Puntos de intersección en azul
    let puntos = {
        x: puntosInterseccion.map(punto => punto[0]),
        y: puntosInterseccion.map(punto => punto[1]),
        mode: 'markers',
        type: 'scatter',
        name: 'Intersecciones',
        marker: {
            color: '#3498db',
            size: 8,
            line: {
                color: '#ffffff',
                width: 1
            }
        },
        text: puntosInterseccion.map(p => `(${p[0].toFixed(2)}, ${p[1].toFixed(2)})<br>Z = ${p[2].toFixed(2)}`),
        hovertemplate: '%{text}<extra></extra>'
    };

    // Punto óptimo mejorado: verde intenso, borde blanco, etiqueta
    let puntoOptimoPlot = {
        x: [puntoOptimo[0]],
        y: [puntoOptimo[1]],
        mode: 'markers+text',
        type: 'scatter',
        name: 'Óptimo',
        marker: {
            color: '#27ae60',
            size: 18,
            symbol: 'circle',
            line: {
                color: '#ffffff',
                width: 3
            }
        },
        text: [`Óptimo<br>(${puntoOptimo[0].toFixed(2)}, ${puntoOptimo[1].toFixed(2)})`],
        textposition: 'top center',
        textfont: {
            size: 12,
            color: '#27ae60',
            family: 'Arial, sans-serif'
        },
        hovertemplate: `Óptimo<br>X1: ${puntoOptimo[0].toFixed(2)}<br>X2: ${puntoOptimo[1].toFixed(2)}<br>Z = ${zOptima.toFixed(2)}<extra></extra>`
    };

    traces.push(puntos);
    traces.push(puntoOptimoPlot);

    let layout = {
        title: {
            font: {
                size: 18,
                color: '#2d3436',
                family: 'Poppins, sans-serif'
            }
        },
        xaxis: {
            title: 'X1',
            gridcolor: '#ecf0f1',
            showgrid: true,
            zeroline: true
        },
        yaxis: {
            title: 'X2',
            gridcolor: '#ecf0f1',
            showgrid: true,
            zeroline: true
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
            bgcolor: 'rgba(255, 255, 255, 0.8)'
        }
    };

    Plotly.newPlot('plot', traces, layout, {responsive: true});
    // Crear tabla con puntos de intersección
    let resultTable = `
    <div class="overflow-x-auto">
        <table class="table-auto w-full border-collapse">
            <thead>
                <tr>
                    <th class = "px-6 py-2 border border-blue-400 bg-blue-500 text-white font-semibold">X1</th>
                    <th class = "px-6 py-2 border border-blue-400 bg-blue-500 text-white font-semibold">X2</th>
                    <th class = "px-6 py-2 border border-blue-400 bg-blue-500 text-white font-semibold">Z</th>
                    <th class = "px-6 py-2 border border-blue-400 bg-blue-500 text-white font-semibold">Restricciones</th>
                    <th class = "px-6 py-2 border border-blue-400 bg-blue-500 text-white font-semibold">Factible</th>
                </tr>
            </thead>
            <tbody>
    `;
    puntosInterseccion.forEach((punto) => {
        const esPuntoFactible = esFactible(punto[0], punto[1]) ? 'Sí' : 'No';
        const ColorFila = esPuntoFactible === 'No' ? 'bg-red-100 text-red-700' : 'bg-white';
        resultTable += `
                <tr class="${ColorFila} hover:bg-green-100">
                    <td class="px-6 py-2 border border-slate-300">${punto[0].toFixed(4)}</td>
                    <td class="px-6 py-2 border border-slate-300">${punto[1].toFixed(4)}</td>
                    <td class="px-6 py-2 border border-slate-300">${punto[2].toFixed(4)}</td>
                    <td class="px-6 py-2 border border-slate-300">${punto[3]}</td>
                    <td class="px-6 py-2 border border-slate-300 font-semibold">${esPuntoFactible}</td>
                </tr>
        `;
    });
    resultTable += `
                </tbody>
            </table>
        </div>
    `;

    document.getElementById('result').innerHTML = resultTable;

    // Mostrar Z óptima con mejor presentación
    let optimaTable = `
    <div class="text-center">
        <h3 class="py-4 text-2xl font-bold text-green-600 mb-4">✓ Solución Óptima</h3>
        <table class="table-auto mx-auto">
            <thead>
                <tr>
                    <th class = "px-6 py-2 border border-green-400 bg-green-500 text-white font-semibold">X1</th>
                    <th class = "px-6 py-2 border border-green-400 bg-green-500 text-white font-semibold">X2</th>
                    <th class = "px-6 py-2 border border-green-400 bg-green-500 text-white font-semibold">Z (${TipoObjetivo.toUpperCase()})</th>
                </tr>
            </thead>
            <tbody>
                <tr class="bg-green-50">
                    <td class="px-6 py-2 border border-green-300 font-semibold">${puntoOptimo[0].toFixed(4)}</td>
                    <td class="px-6 py-2 border border-green-300 font-semibold">${puntoOptimo[1].toFixed(4)}</td>
                    <td class="px-6 py-2 border border-green-300 font-semibold text-green-600">${zOptima.toFixed(4)}</td>
                </tr>
            </tbody>
        </table>
    </div>
    `;

    document.getElementById('optima').innerHTML = optimaTable;
}
