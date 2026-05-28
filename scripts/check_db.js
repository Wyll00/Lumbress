const pool = require('./server/db');

async function check() {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    console.log("Tablas en la base de datos:");
    console.log(tables);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
check();
