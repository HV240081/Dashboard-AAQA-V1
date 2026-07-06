const fs = require('fs/promises');
const mysql = require('mysql2/promise');

async function main() {
  const envText = await fs.readFile('D:/DASH-AAQA V1/sistema-aaqa-backend-v1/.env', 'utf8');
  const env = Object.fromEntries(
    envText
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith('#') && line.includes('='))
      .map((line) => {
        const idx = line.indexOf('=');
        return [line.slice(0, idx), line.slice(idx + 1)];
      })
  );

  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });

  const projectNames = ['Construcción de Pozo', 'Centro de Capacitación Juvenil'];

  const [projects] = await conn.query(
    `SELECT p.id, p.nombre_proyecto, e.año AS year, p.mes_inicio, p.mes_final
     FROM proyectos p
     JOIN ediciones e ON p.edicion_id = e.id
     WHERE p.nombre_proyecto IN (?, ?)`,
    projectNames
  );
  console.log('PROJECTS');
  console.log(JSON.stringify(projects, null, 2));

  for (const project of projects) {
    const [reports] = await conn.query(
      `SELECT id, mes, año, avance_tecnico_real, avance_financiero_real, meta_financiera, estado_cronograma, observaciones, created_at
       FROM reportes_mensuales
       WHERE proyecto_id = ?
       ORDER BY año DESC, mes DESC, created_at DESC`,
      [project.id]
    );
    const [activities] = await conn.query(
      `SELECT id, nombre, mes, estado, observaciones, source, manual_locked, created_at, updated_at
       FROM proyecto_actividades
       WHERE proyecto_id = ?
       ORDER BY mes ASC, created_at ASC`,
      [project.id]
    );
    console.log(`REPORTS_${project.id}`);
    console.log(JSON.stringify(reports, null, 2));
    console.log(`ACTIVITIES_${project.id}`);
    console.log(JSON.stringify(activities, null, 2));
  }

  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
