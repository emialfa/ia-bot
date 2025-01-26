const fs = require('fs');
const path = require('path');

// Ruta del archivo de logs
const logFilePath = path.join(__dirname, 'src/access.log');
const outputFilePath = path.join(__dirname, 'prev-26-01-2025.log');

// Leer el archivo de logs
fs.readFile(logFilePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error al leer el archivo:', err);
        return;
    }

    const sortedLines = data.split('\n').reverse();

    // Escribir el archivo ordenado
    fs.writeFile(outputFilePath, sortedLines.join('\n'), (err) => {
        if (err) {
            console.error('Error al escribir el archivo ordenado:', err);
            return;
        }
        console.log('Archivo ordenado guardado como:', outputFilePath);
    });
});