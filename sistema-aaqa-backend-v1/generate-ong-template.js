const XLSX = require('xlsx');
const fs = require('fs');

function generateTemplate() {
    const workbook = XLSX.utils.book_new();

    // Hoja 1: Proyectos
    const proyectosHeaders = [
        'ID_Proyecto',
        'Nombre_Proyecto',
        'Organización',
        'Categoría',
        'Año',
        'Departamento',
        'Inversión_FGK',
        'Contrapartida_Org',
        'Fondos_Aliados',
        'Beneficiarios_Directos',
        'Estado',
        'Progreso_Técnico',
        'Progreso_Financiero'
    ];

    const proyectosData = [
        proyectosHeaders,
        // Fila de ejemplo 1 (Nuevo Proyecto - Sin ID)
        ['', 'Construcción de Pozo', 'ADESCO El Espino', 'ONG', 2025, 'San Miguel', 15000, 2000, 500, 150, 'Activo', 0, 0],
        // Fila de ejemplo 2 (Actualizar Proyecto - Con ID)
        ['202501', 'Mejora de Escuela', 'Fundación Educar', 'ONG', 2025, 'San Salvador', 25000, 5000, 0, 300, 'En Ejecución', 50, 45]
    ];

    const wsProyectos = XLSX.utils.aoa_to_sheet(proyectosData);
    
    // Ajustar ancho de columnas
    wsProyectos['!cols'] = proyectosHeaders.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(workbook, wsProyectos, 'Proyectos');

    // Hoja 2: Aliados
    const aliadosHeaders = [
        'ID_Proyecto_Referencia',
        'Proyecto',
        'Nombre_Aliado',
        'Monto',
        'Año'
    ];
    const aliadosData = [
        aliadosHeaders,
        ['', 'Construcción de Pozo', 'Alcaldía San Miguel', 500, 2025]
    ];
    const wsAliados = XLSX.utils.aoa_to_sheet(aliadosData);
    wsAliados['!cols'] = aliadosHeaders.map(() => ({ wch: 25 }));
    XLSX.utils.book_append_sheet(workbook, wsAliados, 'Aliados');

    // Guardar archivo
    XLSX.writeFile(workbook, 'Plantilla_Carga_Especifica_ONG.xlsx');
    console.log('Plantilla Plantilla_Carga_Especifica_ONG.xlsx generada exitosamente.');
}

generateTemplate();
