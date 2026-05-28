const mysql = require('mysql2/promise');
const pool = mysql.createPool({ host:'localhost', user:'root', password:'', database:'biblioteca_personal' });

async function check() {
  try {
    const [rows] = await pool.query("SHOW COLUMNS FROM posts LIKE 'tipo'");
    console.log('ENUM definition:', rows[0]?.Type);

    // Try inserting a test post
    const [r] = await pool.query(
      "INSERT INTO posts (usuario_id, tipo, contenido) VALUES (1, 'reseña', 'test')"
    );
    console.log('Insert reseña OK, id:', r.insertId);
    await pool.query("DELETE FROM posts WHERE id = ?", [r.insertId]);

    const [r2] = await pool.query(
      "INSERT INTO posts (usuario_id, tipo, contenido) VALUES (1, 'recomendacion', 'test2')"
    );
    console.log('Insert recomendacion OK, id:', r2.insertId);
    await pool.query("DELETE FROM posts WHERE id = ?", [r2.insertId]);

    console.log('All good!');
  } catch(e) {
    console.error('ERROR:', e.message);
  } finally {
    process.exit(0);
  }
}
check();
