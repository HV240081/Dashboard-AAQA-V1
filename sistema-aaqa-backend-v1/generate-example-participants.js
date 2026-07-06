const XLSX = require('xlsx');

function generateParticipantsExample() {
    const workbook = XLSX.utils.book_new();

    // Hoja 1: Participantes
    const headers = [
        'ID_Participante',
        'ID_Proyecto_Referencia',
        'Categoria',
        'Proyecto',
        'Nombre_Participante',
        'Edad',
        'Género',
        'Teléfono',
        'Email',
        'Rol',
        'Estado_Formación',
        'Departamento'
    ];

    const data = [
        headers,
        // Ana María Gómez (ONG)
        ['202501-01', '202501', 'ONG', 'Educación Digital para Todos', 'Ana María Gómez', 24, 'Mujer', '7123-4567', 'ana.gomez@ong-ejemplo.com', 'Coordinadora de Juventud', 'Graduado', 'San Salvador'],
        // Carlos Pérez (Desarrollo Comunitario)
        ['202502-01', '202502', 'Desarrollo Comunitario', 'Huerto Comunitario La Esperanza', 'Carlos Pérez', 35, 'Hombre', '7234-5678', 'carlos.perez@dc-ejemplo.com', 'Líder de Huerto', 'En Formación', 'San Miguel']
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Ajustar ancho de columnas
    ws['!cols'] = headers.map(() => ({ wch: 22 }));

    XLSX.utils.book_append_sheet(workbook, ws, 'Participantes');

    const primaryFilename = 'Ejemplo_Carga_Participantes.xlsx';
    const fallbackFilename = 'Ejemplo_Carga_Participantes_Actualizado.xlsx';

    try {
        XLSX.writeFile(workbook, primaryFilename);
        console.log(`✅ Archivo '${primaryFilename}' generado exitosamente.`);
    } catch (err) {
        if (err.code === 'EBUSY' || err.code === 'EPERM') {
            console.warn(`⚠️ '${primaryFilename}' está abierto en otro programa. Generando copia en '${fallbackFilename}'...`);
            XLSX.writeFile(workbook, fallbackFilename);
            console.log(`✅ Archivo '${fallbackFilename}' generado exitosamente como respaldo.`);
        } else {
            throw err;
        }
    }
}

generateParticipantsExample();
