import { Link } from 'react-router-dom';
import LegalLayout, { Section, Text, List } from '../components/LegalLayout';

// Política de Privacidad de Lumbres. Borrador a tu medida (no es asesoría legal).
// Rellena los datos entre corchetes [ ] antes de publicarla en serio.
const Privacidad = () => (
    <LegalLayout title="Política de Privacidad" updated="19 de junio de 2026">
        <Text>
            En Lumbres nos tomamos en serio tu privacidad. Esta política explica qué datos personales
            recogemos, con qué finalidad, en qué nos basamos para tratarlos y qué derechos tienes.
        </Text>

        <Section>1. Responsable del tratamiento</Section>
        <Text>
            Responsable: <strong>[TU NOMBRE COMPLETO]</strong> (persona física), Tenerife, España.<br />
            Sitio web: https://lumbress.com<br />
            Contacto en materia de privacidad: <strong>privacidad@lumbress.com</strong>
        </Text>

        <Section>2. Qué datos recogemos</Section>
        <List>
            <li><strong>Datos de registro:</strong> nombre de usuario, correo electrónico, contraseña (guardada siempre cifrada) y, opcionalmente, teléfono y foto de perfil.</li>
            <li><strong>Datos de uso de la app:</strong> tus libros y datos de lectura (progreso, horas, subrayados, palabras guardadas, metas), publicaciones en la comunidad, anuncios del mercadillo (incluida la dirección, código postal y ciudad que indiques) y mensajes del chat.</li>
            <li><strong>Datos técnicos y de analítica:</strong> dirección IP, país aproximado, páginas visitadas y tipo de navegador, con fines de seguridad y estadística. Los registros de analítica se conservan un máximo de <strong>90 días</strong>.</li>
            <li><strong>Datos de pago:</strong> si te suscribes a Premium, el pago lo gestiona Stripe. <strong>No almacenamos los datos de tu tarjeta</strong>; solo guardamos el estado de tu suscripción.</li>
        </List>

        <Section>3. Para qué usamos tus datos y base legal</Section>
        <List>
            <li><strong>Prestarte el servicio</strong> (tu cuenta, biblioteca, lector, comunidad, etc.) — base: ejecución de los términos que aceptas al registrarte.</li>
            <li><strong>Verificar tu correo y proteger la plataforma</strong> (evitar cuentas falsas y abusos) — base: interés legítimo y seguridad.</li>
            <li><strong>Analítica de tráfico</strong> (entender el uso de la web) — base: interés legítimo.</li>
            <li><strong>Enviarte correos del servicio</strong> (verificación, avisos) — base: ejecución del servicio.</li>
            <li><strong>Gestionar suscripciones y pagos</strong> — base: ejecución del contrato.</li>
        </List>

        <Section>4. Con quién compartimos datos</Section>
        <Text>No vendemos tus datos. Usamos proveedores que actúan como encargados del tratamiento:</Text>
        <List>
            <li><strong>Hostinger</strong> — alojamiento del servidor donde se guardan los datos.</li>
            <li><strong>Resend</strong> — envío de los correos del servicio.</li>
            <li><strong>Stripe</strong> — procesamiento de pagos de las suscripciones.</li>
            <li><strong>Servicios externos de consulta</strong> (al usar ciertas funciones): Open Library (buscar libros), OpenStreetMap/Photon (autocompletar direcciones — se envía lo que escribes), Wikcionario y dictionaryapi.dev (diccionario del lector).</li>
        </List>

        <Section>5. Cuánto tiempo conservamos tus datos</Section>
        <List>
            <li>Los datos de tu cuenta, mientras la mantengas activa. Si la eliminas, se borran (salvo lo que debamos conservar por ley).</li>
            <li>Las cuentas que no verifican el correo se borran automáticamente a las 24 horas.</li>
            <li>Los registros de analítica (IP, país, páginas), un máximo de 90 días.</li>
        </List>

        <Section>6. Tus derechos</Section>
        <Text>
            Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y
            portabilidad escribiendo a <strong>privacidad@lumbress.com</strong>. También tienes derecho a
            reclamar ante la Agencia Española de Protección de Datos (<span style={{ wordBreak: 'break-all' }}>www.aepd.es</span>) si
            consideras que no hemos tratado bien tus datos.
        </Text>

        <Section>7. Menores de edad</Section>
        <Text>
            Lumbres no está dirigido a menores de 14 años. Si tienes menos de 14, no debes registrarte
            ni facilitar datos personales sin el consentimiento de tus padres o tutores.
        </Text>

        <Section>8. Seguridad</Section>
        <Text>
            Protegemos tus datos con medidas razonables: contraseñas cifradas (bcrypt), conexión segura
            HTTPS y sesión mediante una cookie protegida. Ningún sistema es infalible, pero trabajamos
            para mantener tu información a salvo.
        </Text>

        <Section>9. Cookies</Section>
        <Text>
            Solo usamos una <strong>cookie técnica necesaria</strong> para mantener tu sesión iniciada. No
            utilizamos cookies de publicidad ni de seguimiento de terceros. Nuestra analítica es propia
            y se procesa en nuestro servidor.
        </Text>

        <Section>10. Cambios en esta política</Section>
        <Text>
            Podemos actualizar esta política para reflejar cambios en el servicio o en la normativa.
            Publicaremos siempre la versión vigente en esta página con su fecha de actualización.
        </Text>

        <Text style={{ marginTop: 18 }}>
            Consulta también nuestros <Link to="/terminos" style={{ color: 'var(--accent-color)' }}>Términos y Condiciones</Link>.
        </Text>
    </LegalLayout>
);

export default Privacidad;
