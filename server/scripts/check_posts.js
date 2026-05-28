const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost', user: 'root', password: '', database: 'biblioteca_personal'
});

async function check() {
  const [posts] = await pool.query(
    `SELECT p.id, p.tipo, p.titulo, LEFT(p.contenido, 60) AS contenido, p.created_at, u.username
     FROM posts p
     JOIN usuarios u ON u.id = p.usuario_id
     ORDER BY p.created_at DESC`
  );
  const [likes] = await pool.query(`SELECT COUNT(*) AS total FROM post_likes`);

  console.log(`\n📚 POSTS EN LA BASE DE DATOS: ${posts.length}`);
  console.log('─'.repeat(60));
  posts.forEach(p => {
    console.log(`[${p.id}] @${p.username} | ${p.tipo} | "${p.titulo || '(sin título)'}" | ${p.contenido}... | ${p.created_at}`);
  });
  console.log(`\n❤️  Total likes en BD: ${likes[0].total}`);
  process.exit(0);
}

check().catch(e => { console.error(e.message); process.exit(1); });
