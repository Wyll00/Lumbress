// Inserta 3 libros de EJEMPLO en "novedades" para probar el carrusel (datos inventados).
// Se asignan al usuario 1 (William) para poder quitarlos desde la app cuando quieras.
const pool = require('../db');

const demo = [
    {
        titulo: 'El faro entre la niebla', autor: 'Lucía Mar', genero: 'Novela negra',
        enlace: 'https://www.amazon.es/dp/EJEMPLO1',
        portada: 'https://picsum.photos/seed/lumbresfaro/400/600',
        sinopsis: 'En un pueblo costero azotado por las tormentas, la guardesa de un faro descubre que las desapariciones del último invierno esconden algo más oscuro que el mar.',
    },
    {
        titulo: 'Cartas a nadie', autor: 'Diego Salas', genero: 'Poesía',
        enlace: 'https://www.amazon.es/dp/EJEMPLO2',
        portada: 'https://picsum.photos/seed/lumbrescartas/400/600',
        sinopsis: 'Una colección de poemas escritos como cartas que nunca se enviaron: sobre la ausencia, la memoria y los amores que se quedaron a medias.',
    },
    {
        titulo: 'La última estación', autor: 'Marina Coll', genero: 'Ciencia ficción',
        enlace: 'https://www.amazon.es/dp/EJEMPLO3',
        portada: 'https://picsum.photos/seed/lumbresestacion/400/600',
        sinopsis: 'Año 2189. La última estación espacial habitada recibe una señal imposible desde una Tierra que se creía deshabitada hace décadas.',
    },
];

(async () => {
    try {
        for (const d of demo) {
            await pool.query(
                `INSERT INTO novedades (usuario_id, titulo, autor, sinopsis, portada_url, enlace, genero, estado)
                 VALUES (1, ?, ?, ?, ?, ?, ?, 'aprobado')`,
                [d.titulo, d.autor, d.sinopsis, d.portada, d.enlace, d.genero]
            );
        }
        const [[{ n }]] = await pool.query('SELECT COUNT(*) n FROM novedades');
        console.log(`Insertados ${demo.length} libros de ejemplo. Total en novedades: ${n}`);
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        process.exit(0);
    }
})();
