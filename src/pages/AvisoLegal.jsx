import { Link } from 'react-router-dom';
import LegalLayout, { Section, Text, List } from '../components/LegalLayout';

// Aviso Legal de Lumbres (información general del art. 10 de la LSSI). Borrador (no es asesoría legal).
// ⚠️ RELLENA TU NIF: sustituye [NIF] (línea del apartado 1) por tu NIF real antes de darlo por definitivo.
const AvisoLegal = () => (
    <LegalLayout title="Aviso Legal" updated="2 de julio de 2026">
        <Text>
            En cumplimiento de la Ley 34/2002, de Servicios de la Sociedad de la Información y de
            Comercio Electrónico (LSSI), se facilitan los datos identificativos del titular de este
            sitio y las condiciones generales de su uso.
        </Text>

        <Section>1. Datos del titular</Section>
        <List>
            <li>Titular: <strong>William Lázaro Luis González</strong> (persona física).</li>
            <li>NIF: <strong>55439933C</strong></li>
            <li>Domicilio a efectos de contacto: Tenerife, España.</li>
            <li>Correo electrónico: <strong>privacidad@lumbress.com</strong></li>
            <li>Sitio web: <strong>https://lumbress.com</strong></li>
        </List>

        <Section>2. Objeto</Section>
        <Text>
            Lumbres es una plataforma de lectura y comunidad lectora: biblioteca personal, lector
            EPUB/PDF, estadísticas de lectura, comunidad, podcasts, taller de novela, catálogo de obras
            en dominio público y mercadillo de libros de segunda mano entre usuarios. Existe un plan
            gratuito y un plan Premium de pago gestionado a través de Stripe.
        </Text>

        <Section>3. Condiciones de uso</Section>
        <Text>
            El acceso y uso de Lumbres se rige por los{' '}
            <Link to="/terminos" style={{ color: 'var(--accent-color)' }}>Términos y Condiciones</Link>.
            El usuario se compromete a hacer un uso adecuado del servicio y a no emplearlo para
            actividades ilícitas o contrarias a la buena fe.
        </Text>

        <Section>4. Propiedad intelectual e industrial</Section>
        <Text>
            La marca Lumbres, el diseño del sitio, su código y sus contenidos propios pertenecen a su
            titular. El contenido que cada usuario sube o publica sigue siendo de su titularidad, en los
            términos descritos en los Términos y Condiciones (apartado 5).
        </Text>

        <Section>5. Responsabilidad</Section>
        <List>
            <li>Cada usuario es el único responsable del contenido que sube o publica (incluidos los archivos EPUB/PDF de su biblioteca personal). Los titulares de derechos pueden solicitar la retirada de contenido escribiendo a <strong>privacidad@lumbress.com</strong> (Términos, apartado 6).</li>
            <li>El servicio se presta "tal cual": trabajamos por mantenerlo disponible y seguro, pero no podemos garantizar la ausencia de errores o interrupciones.</li>
            <li>Algunas funciones consultan servicios externos (Open Library, OpenStreetMap/Photon, Wikcionario, dictionaryapi.dev, Project Gutenberg). No respondemos del contenido ni de la disponibilidad de esos servicios de terceros.</li>
        </List>

        <Section>6. Protección de datos</Section>
        <Text>
            El tratamiento de datos personales se describe en la{' '}
            <Link to="/privacidad" style={{ color: 'var(--accent-color)' }}>Política de Privacidad</Link>.
        </Text>

        <Section>7. Legislación aplicable</Section>
        <Text>
            Este aviso legal se rige por la legislación española. Para cualquier controversia, y salvo
            que la normativa de consumo disponga otra cosa, serán competentes los juzgados y tribunales
            que correspondan conforme a la ley.
        </Text>

        <Text style={{ marginTop: 18 }}>
            Consulta también los <Link to="/terminos" style={{ color: 'var(--accent-color)' }}>Términos y Condiciones</Link>{' '}
            y la <Link to="/privacidad" style={{ color: 'var(--accent-color)' }}>Política de Privacidad</Link>.
        </Text>
    </LegalLayout>
);

export default AvisoLegal;
