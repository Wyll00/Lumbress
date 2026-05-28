const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'biblioteca_personal'
});

async function setup() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reading_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        hours INT NOT NULL,
        log_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);
    console.log("Tabla reading_logs creada correctamente.");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}
setup();
