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
        // GENERAR DATOS PARA PLOTLY
        // ============================================

        let traces = [];

        restricciones.forEach((r, index) => {

            let x = [];
            let y = [];

            for (let i = 0; i <= 100; i++) {

                let xi = i;

                let yi = (r.c - r.a * xi) / r.b;

                if (isFinite(yi)) {
                    x.push(xi);
                    y.push(yi);
                }
            }

            traces.push({
                x,
                y,
                mode: "lines",
                type: "scatter",
                name:
                    `${r.a}x1 + ${r.b}x2 ${r.signo} ${r.c}`
            });
        });

        // ============================================
        // CONFIGURACIÓN
        // ============================================

        const layout = {
            title: "Método Gráfico",
            xaxis: {
                title: "x1",
                range: [0, 100]
            },
            yaxis: {
                title: "x2",
                range: [0, 100]
            },
            showlegend: true
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