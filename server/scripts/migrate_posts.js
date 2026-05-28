const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'biblioteca_personal'
});

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        tipo ENUM('reseña','recomendacion','reflexion','general') DEFAULT 'general',
        titulo VARCHAR(200),
        contenido TEXT NOT NULL,
        imagen MEDIUMTEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);
    console.log('OK: tabla posts creada');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_likes (
        post_id INT NOT NULL,
        usuario_id INT NOT NULL,
        PRIMARY KEY (post_id, usuario_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
      )
    `);
    console.log('OK: tabla post_likes creada');
    console.log('Migración completada!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit(0);
  }
}

migrate();
