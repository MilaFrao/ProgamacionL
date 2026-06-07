// ============================================
// grafico.js - Método Gráfico CORREGIDO
// ============================================

console.log("✅ grafico.js cargado");

function grafico(problemaTexto) {

    console.log("📈 Iniciando método gráfico");

    const plotDiv = document.getElementById("plot");
    const rGrafico = document.getElementById("r_grafico");

    if (!plotDiv) {
        console.error("No existe #plot");
        return;
    }

    if (rGrafico) {
        rGrafico.classList.remove("hidden");
    }

    plotDiv.innerHTML = "";

    try {

        // ============================================
        // LIMPIAR TEXTO
        // ============================================

        let lineas = problemaTexto
            .trim()
            .split("\n")
            .map(l => l.trim())
            .filter(l => l !== "");

        if (lineas.length < 2) {
            mostrarError("Problema inválido");
            return;
        }

        // ============================================
        // FUNCIÓN OBJETIVO
        // ============================================

        let funcionObjetivo = lineas[0];

        const objetivoRegex =
            /(max|min)\s*=\s*([+-]?\d*\.?\d*)x1\s*([+-]\s*\d*\.?\d*)x2/i;

        const objetivoMatch = funcionObjetivo.match(objetivoRegex);

        if (!objetivoMatch) {
            mostrarError("Error en función objetivo");
            return;
        }

        const tipo = objetivoMatch[1];

        const zX1 = parseFloat(objetivoMatch[2]);
        const zX2 = parseFloat(
            objetivoMatch[3].replace(/\s+/g, "")
        );

        console.log("Función objetivo:", tipo, zX1, zX2);

        // ============================================
        // RESTRICCIONES
        // ============================================

        let restricciones = [];

        for (let i = 1; i < lineas.length; i++) {

            let linea = lineas[i]
                .replace(/\s+/g, "");

            const regex =
                /^([+-]?\d*\.?\d*)x1([+-]\d*\.?\d*)x2(<=|>=|=)([+-]?\d*\.?\d+)$/i;

            const match = linea.match(regex);

            if (!match) {
                console.warn("Restricción ignorada:", linea);
                continue;
            }

            let a = parseFloat(match[1]);
            let b = parseFloat(match[2]);
            let signo = match[3];
            let c = parseFloat(match[4]);

            restricciones.push({
                a,
                b,
                signo,
                c
            });
        }

        console.log("Restricciones:", restricciones);

        if (restricciones.length === 0) {
            mostrarError("No se pudieron interpretar restricciones");
            return;
        }

        // ============================================
        // FUNCIONES AUXILIARES
        // ============================================

        function calcularIntersecciones(restricciones) {

            let puntos = [];

            for (let i = 0; i < restricciones.length; i++) {

                for (let j = i + 1; j < restricciones.length; j++) {

                    const r1 = restricciones[i];
                    const r2 = restricciones[j];

                    const det =
                        r1.a * r2.b - r2.a * r1.b;

                    if (det === 0) continue;

                    const x =
                        (r1.c * r2.b - r2.c * r1.b) / det;

                    const y =
                        (r1.a * r2.c - r2.a * r1.c) / det;

                    if (
                        isFinite(x) &&
                        isFinite(y) &&
                        x >= 0 &&
                        y >= 0
                    ) {

                        puntos.push({
                            x,
                            y
                        });
                    }
                }
            }

            // Intersecciones con ejes

            restricciones.forEach((r) => {

                if (r.a !== 0) {

                    const x = r.c / r.a;

                    if (x >= 0) {
                        puntos.push({ x, y: 0 });
                    }
                }

                if (r.b !== 0) {

                    const y = r.c / r.b;

                    if (y >= 0) {
                        puntos.push({ x: 0, y });
                    }
                }
            });

            // Origen
            puntos.push({ x: 0, y: 0 });

            return puntos;
        }

        function esFactible(punto, restricciones) {

            for (const r of restricciones) {

                const valor =
                    r.a * punto.x + r.b * punto.y;

                if (
                    (r.signo === "<=" && valor > r.c + 0.0001) ||
                    (r.signo === ">=" && valor < r.c - 0.0001) ||
                    (r.signo === "=" && Math.abs(valor - r.c) > 0.0001)
                ) {
                    return false;
                }
            }

            return true;
        }

        function valorObjetivo(punto) {

            return zX1 * punto.x + zX2 * punto.y;
        }


        // ============================================
        // GENERAR DATOS PARA PLOTLY
        // ============================================

        let traces = [];

        const colores = [
            "#ef4444",
            "#3b82f6",
            "#10b981",
            "#f59e0b",
            "#8b5cf6",
            "#ec4899"
        ];

        // Calcular rango automático
        let maxX = 0;
        let maxY = 0;

        restricciones.forEach((r) => {

            if (r.a !== 0) {
                maxX = Math.max(maxX, r.c / r.a);
            }

            if (r.b !== 0) {
                maxY = Math.max(maxY, r.c / r.b);
            }
        });

        maxX = Math.ceil(maxX * 1.3);
        maxY = Math.ceil(maxY * 1.3);

        // Crear restricciones
        restricciones.forEach((r, index) => {

            let x = [];
            let y = [];

            // Línea vertical
            if (r.b === 0) {

                let xConst = r.c / r.a;

                x = [xConst, xConst];
                y = [0, maxY];

            } else {

                for (let xi = 0; xi <= maxX; xi += 0.1) {

                    let yi = (r.c - r.a * xi) / r.b;

                    if (isFinite(yi)) {

                        x.push(xi);
                        y.push(yi);
                    }
                }
            }

            traces.push({

                x,
                y,

                mode: "lines",

                type: "scatter",

                name: `Restricción ${index + 1}`,

                line: {
                    color: colores[index % colores.length],
                    width: 3
                },

                hovertemplate:
                    `<b>Restricción ${index + 1}</b><br>` +
                    `x1: %{x:.2f}<br>` +
                    `x2: %{y:.2f}<extra></extra>`
            });
        });

        // ============================================
        // INTERSECCIONES
        // ============================================

        const puntosInterseccion =
            calcularIntersecciones(restricciones);

        // ============================================
        // PUNTOS FACTIBLES
        // ============================================

        const puntosFactibles =
            puntosInterseccion.filter(p =>
                esFactible(p, restricciones)
            );

        // ============================================
        // ORDENAR REGIÓN FACTIBLE
        // ============================================

        const centroX =
            puntosFactibles.reduce((a, p) => a + p.x, 0)
            / puntosFactibles.length;

        const centroY =
            puntosFactibles.reduce((a, p) => a + p.y, 0)
            / puntosFactibles.length;

        puntosFactibles.sort((p1, p2) => {

            const ang1 =
                Math.atan2(p1.y - centroY, p1.x - centroX);

            const ang2 =
                Math.atan2(p2.y - centroY, p2.x - centroX);

            return ang1 - ang2;
        });

        // ============================================
        // REGIÓN FACTIBLE
        // ============================================

        traces.push({

            x: puntosFactibles.map(p => p.x),

            y: puntosFactibles.map(p => p.y),

            fill: "toself",

            type: "scatter",

            mode: "lines",

            name: "Región Factible",

            fillcolor: "rgba(59,130,246,0.18)",

            line: {
                color: "rgba(59,130,246,0.5)",
                width: 1
            },

            hoverinfo: "skip"
        });

        // ============================================
        // PUNTOS INTERSECCIÓN
        // ============================================

        traces.push({

            x: puntosInterseccion.map(p => p.x),

            y: puntosInterseccion.map(p => p.y),

            mode: "markers",

            type: "scatter",

            name: "Intersecciones",

            marker: {

                color: "#ef4444",

                size: 9,

                line: {
                    color: "white",
                    width: 1
                }
            },

            hovertemplate:
                "<b>Intersección</b><br>" +
                "x1: %{x:.2f}<br>" +
                "x2: %{y:.2f}<extra></extra>"
        });

        // ============================================
        // PUNTOS FACTIBLES
        // ============================================

        traces.push({

            x: puntosFactibles.map(p => p.x),

            y: puntosFactibles.map(p => p.y),

            mode: "markers",

            type: "scatter",

            name: "Factibles",

            marker: {

                color: "#2563eb",

                size: 10,

                symbol: "circle"
            },

            hovertemplate:
                "<b>Punto Factible</b><br>" +
                "x1: %{x:.2f}<br>" +
                "x2: %{y:.2f}<extra></extra>"
        });

        // ============================================
        // PUNTO ÓPTIMO
        // ============================================

        let mejorPunto = null;

        let mejorZ =
            tipo.toLowerCase() === "max"
                ? -Infinity
                : Infinity;

        puntosFactibles.forEach((p) => {

            const z = valorObjetivo(p);

            if (
                (tipo.toLowerCase() === "max" && z > mejorZ) ||
                (tipo.toLowerCase() === "min" && z < mejorZ)
            ) {

                mejorZ = z;
                mejorPunto = p;
            }
        });

        if (mejorPunto) {

            traces.push({

                x: [mejorPunto.x],

                y: [mejorPunto.y],

                mode: "markers+text",

                type: "scatter",

                name: "Óptimo",

                text: [`Z = ${mejorZ.toFixed(2)}`],

                textposition: "top center",

                marker: {

                    color: "#16a34a",

                    size: 18,

                    symbol: "star"
                },

                hovertemplate:
                    "<b>Solución Óptima</b><br>" +
                    "x1: %{x:.2f}<br>" +
                    "x2: %{y:.2f}<br>" +
                    `Z: ${mejorZ.toFixed(2)}` +
                    "<extra></extra>"
            });
        }



        // ============================================
        // CONFIGURACIÓN
        // ============================================

        const layout = {

        title: {
            text: "Gráfico de Restricciones",
            font: {
                size: 28,
                color: "#1e293b"
            }
        },

        paper_bgcolor: "#ffffff",

        plot_bgcolor: "#f8fafc",

        hovermode: "closest",

        xaxis: {

            title: {
                text: "X1",
                font: {
                    size: 18
                }
            },

            range: [0, maxX],

            gridcolor: "#dbeafe",

            zerolinecolor: "#64748b",

            showline: true,

            linewidth: 2,

            mirror: false
        },

        yaxis: {

            title: {
                text: "X2",
                font: {
                    size: 18
                }
            },

            range: [0, maxY],

            gridcolor: "#dbeafe",

            zerolinecolor: "#64748b",

            showline: true,

            linewidth: 2
        },

        legend: {

            bgcolor: "rgba(255,255,255,0.9)",

            bordercolor: "#cbd5e1",

            borderwidth: 1,

            font: {
                size: 13
            }
        },

        margin: {
            l: 70,
            r: 40,
            t: 70,
            b: 70
        }
    };

        // ============================================
        // DIBUJAR
        // ============================================

        Plotly.newPlot(
            plotDiv,
            traces,
            layout,
            {
                responsive: true
            }
        );

        console.log("✅ Gráfico generado");

        // ============================================
        // SIMPLEX TAMBIÉN
        // ============================================

        if (typeof calcularSimplex === "function") {
            calcularSimplex(problemaTexto);
        }

    } catch (error) {

        console.error(error);

        mostrarError(
            "Error generando gráfico"
        );
    }
}

console.log("✅ grafico.js listo");