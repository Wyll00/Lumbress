const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'biblioteca_personal'
});

async function check() {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    console.log("--- TABLAS EN LA BASE DE DATOS ---");
    console.log(tables.map(t => Object.values(t)[0]));

    const [desc] = await pool.query('DESCRIBE usuarios');
    console.log("\n--- ESTRUCTURA DE TABLA: usuarios ---");
    console.log(desc.map(c => `${c.Field} (${c.Type})`));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
