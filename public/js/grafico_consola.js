let irestricciones =[]; 
let CostoT=[];
let Res_Sin_Signo=[];
let vector_inecuacion=[];
let CoefX1=[];
let CoefX2=[];
let terminosX1=[];
let terminosX2=[];
let TerminoX1FunObj;
let TerminoX2FunObj;
let X1_FunObj;
let X2_FunObj;
let zValue=[];

let restricciones = [];
let equivalenciasRestricciones = [];
let resultadoRestricciones = [];

let entrada = 'max = 22x1 + 45x2 \n1x1 - 3 x2 <= 42\n- 8x2 <= 40\n0.5x1 + 1x2 <= 15';
let entradaMin = 'min = 2000x1 + 2000x2 \n1x1 + 2x2 >= 80\n3x1 + 2x2 >= 160\n5x1 + 2x2 >= 200'
let defaultInput = 'max = 1x1 + 2x2\n1x1 + 3x2 >= 11\n2x1 + 1x2 >= 9'

let partes = entradaMin.trim().split('\n');
console.log(partes);

for (let i = 0; i < partes.length; i++) {
    partes[i] = partes[i].trim().replace("max = ", "").replace("min = ", "").replace("- ", "-").replace(" + ", " ");

    partes[i] = partes[i].split(" ");
    console.log("Parte "+(i+1)+" : "+partes[i]+"\t|\t"+partes[i].length);    

    let equivalencia;
    let resultado;

    if (i == 0 && partes[i].length == 2 && ( !(Math.sign(partes[i][0]) < 0 && Math.sign(partes[i][1]) < 0) ) ){ //Funcion objetivo
        let coeficienteX1 = parseFloat(partes[i][0]);
        let coeficienteX2 = parseFloat(partes[i][1]);
        restricciones.push([coeficienteX1, coeficienteX2]);
        TerminoX1FunObj = coeficienteX1;
        TerminoX2FunObj = coeficienteX2;

    }else if(i != 0 && partes[i].length == 3 && partes[i].includes("x1")){ //Restricciones solo con 1 termino
        let coeficienteX1 = parseFloat(partes[i][0]);
        let equivalencia = partes[i][1];
        let resultado = parseFloat(partes[i][2]);
        restricciones.push([coeficienteX1]);
        equivalenciasRestricciones.push(equivalencia);
        resultadoRestricciones.push(resultado);
        terminosX1.push(coeficienteX1)

    } else if(i != 0 && partes[i].length == 3 && partes[i].includes("x2")){ //Restricciones solo con 1 termino
        let coeficienteX1 = parseFloat(partes[i][0]);
        let equivalencia = partes[i][1];
        let resultado = parseFloat(partes[i][2]);
        restricciones.push([coeficienteX1]);
        equivalenciasRestricciones.push(equivalencia);
        resultadoRestricciones.push(resultado);
        terminosX2.push(coeficienteX2);

    } else if (i != 0 && partes[i].length == 4) { //Restricciones solo con 2 terminos
        let coeficienteX1 = parseFloat(partes[i][0]);
        let coeficienteX2 = parseFloat(partes[i][1]);
        let equivalencia = partes[i][2];
        let resultado = parseFloat(partes[i][3]);
        restricciones.push([coeficienteX1, coeficienteX2]);
        equivalenciasRestricciones.push(equivalencia);
        resultadoRestricciones.push(resultado);
        terminosX1.push(coeficienteX1);
        terminosX2.push(coeficienteX2);

    } else { //Si tienen menos de 1 termino o mas de 2, esta mal formulado
        console.log("Vos sos re estupido, mira bien las restriccion "+(i+1));
    }
}

console.log("Restricciones: ", restricciones);
console.log("Equivalencias: ", equivalenciasRestricciones);
console.log("Resultados: ", resultadoRestricciones);
console.log("\n\nFuncion objetivo: ", TerminoX1FunObj, " ", TerminoX2FunObj);
console.log("Coeficienes X1: "+terminosX1+" | Coeficienes X2: "+terminosX2);





