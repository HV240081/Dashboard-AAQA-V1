const XLSX = require('xlsx');

function generateTemplate(category, filename, defaultOrg, defaultDept, defaultProjectName, type) {
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
        ['', defaultProjectName, defaultOrg, category, 2025, defaultDept, 15000, 2000, 500, 150, 'Activo', 0, 0],
        // Fila de ejemplo 2 (Actualizar Proyecto - Con ID)
        ['202501', 'Proyecto de Actualización Ejemplo', 'Otra Organización', category, 2025, 'San Salvador', 25000, 5000, 0, 300, 'En Ejecución', 50, 45]
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
        ['', defaultProjectName, 'Alcaldía Local', 500, 2025]
    ];
    const wsAliados = XLSX.utils.aoa_to_sheet(aliadosData);
    wsAliados['!cols'] = aliadosHeaders.map(() => ({ wch: 25 }));
    XLSX.utils.book_append_sheet(workbook, wsAliados, 'Aliados');

    // Guardar archivo
    XLSX.writeFile(workbook, filename);
    console.log(`Plantilla ${filename} generada exitosamente.`);
}

generateTemplate('Community', 'Plantilla_Carga_Especifica_Community.xlsx', 'ADESCO La Esperanza', 'San Miguel', 'Construcción de Cancha', 'Community');
generateTemplate('FIS', 'Plantilla_Carga_Especifica_FIS.xlsx', 'Emprendimiento Solidario', 'Santa Ana', 'Incubación de Negocios Locales', 'FIS');
