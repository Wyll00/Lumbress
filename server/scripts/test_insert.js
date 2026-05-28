const pool = require('./db');

async function test_insert() {
  try {
    const bookData = {
        usuario_id: 1, // assume user 1 exists
        title: "Test Book", 
        author: "Test Author", 
        formato: "Físico", 
        status: "To Read", 
        impacto_emocional: "", 
        cita_memorable: "", 
        rating: 0, 
        totalPages: 200, 
        fecha_inicio: null, 
        fecha_fin: null, 
        coverUrl: ""
    };
    
    // Simulate what routes/books.js does
    const [result] = await pool.query(
        `INSERT INTO libros (usuario_id, titulo, autor, formato, estado_lectura, impacto_emocional, cita_memorable, calificacion, numero_paginas, fecha_inicio, fecha_fin, portada_url) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [bookData.usuario_id, bookData.title, bookData.author, bookData.formato || '', bookData.status || 'Pendiente', bookData.impacto_emocional || '', bookData.cita_memorable || '', bookData.rating || 0, bookData.totalPages || 0, bookData.fecha_inicio || null, bookData.fecha_fin || null, bookData.coverUrl || '']
    );
    console.log("Success:", result);
  } catch (err) {
    console.error("Insert error:", err);
  } finally {
    process.exit(0);
  }
}
test_insert();
