import { Link } from 'react-router-dom';
import LegalLayout, { Section, Text, List } from '../components/LegalLayout';

// Términos y Condiciones de Lumbres. Borrador a tu medida (no es asesoría legal).
// Rellena los datos entre corchetes [ ] antes de publicarlos en serio.
const Terminos = () => (
    <LegalLayout title="Términos y Condiciones" updated="2 de julio de 2026">
        <Text>
            Estos términos regulan el uso de Lumbres. Al registrarte o usar la plataforma aceptas estas
            condiciones. Si no estás de acuerdo, por favor no utilices el servicio.
        </Text>

        <Section>1. Quiénes somos</Section>
        <Text>
            Lumbres es un servicio gestionado por <strong>William Lázaro Luis González</strong> (persona física),
            Tenerife, España. Contacto: <strong>privacidad@lumbress.com</strong>.
        </Text>

        <Section>2. Qué es Lumbres</Section>
        <Text>
            Lumbres es una plataforma de lectura y comunidad lectora: organiza tu biblioteca personal,
            lee EPUB/PDF con herramientas (subrayados, diccionario, ajustes), sigue tus estadísticas,
            participa en la comunidad, escucha podcasts, usa el taller de novela y compra/vende libros
            de segunda mano entre usuarios.
        </Text>

        <Section>3. Tu cuenta</Section>
        <List>
            <li>Debes facilitar datos veraces y mantener tu contraseña en secreto. Eres responsable de la actividad de tu cuenta.</li>
            <li>Debes tener al menos 14 años para registrarte.</li>
            <li>Puedes eliminar tu cuenta cuando quieras desde los ajustes o escribiéndonos.</li>
        </List>

        <Section>4. Planes y pagos</Section>
        <List>
            <li>Existe un plan gratuito y un plan <strong>Premium</strong> de pago, gestionado a través de Stripe.</li>
            <li>La suscripción se renueva automáticamente según el periodo elegido; puedes cancelarla en cualquier momento y seguirá activa hasta el final del periodo ya pagado.</li>
            <li>Por tratarse de contenido y servicios digitales de acceso inmediato, el derecho de desistimiento puede no aplicar una vez comenzada la prestación, conforme a la normativa de consumo.</li>
        </List>

        <Section>5. Contenido que subes y derechos de autor</Section>
        <Text>
            Esta parte es importante. Tú eres el <strong>único responsable</strong> del contenido que subes
            o publicas (libros EPUB/PDF, textos, imágenes, reseñas y anuncios).
        </Text>
        <List>
            <li>Al subir un archivo, <strong>declaras que tienes derecho a hacerlo</strong>: que es de tu propiedad, de dominio público, con licencia que lo permita, o que cuentas con autorización del titular.</li>
            <li>La biblioteca y el lector son para tu <strong>uso personal</strong>. Está prohibido subir o distribuir obras protegidas por derechos de autor sin permiso (piratería).</li>
            <li>Conservas la titularidad de tu contenido. Nos concedes únicamente el permiso técnico necesario para almacenarlo y mostrártelo dentro del servicio.</li>
        </List>

        <Section>6. Retirada de contenido (titulares de derechos)</Section>
        <Text>
            Si eres titular de derechos y crees que un contenido infringe tu propiedad intelectual,
            escríbenos a <strong>privacidad@lumbress.com</strong> indicando el contenido en cuestión, tu
            titularidad y tus datos de contacto. Revisaremos la solicitud y <strong>retiraremos el
            contenido infractor</strong> a la mayor brevedad. También podremos suspender cuentas reincidentes.
        </Text>

        <Section>7. Mercadillo de libros</Section>
        <Text>
            En los anuncios de compraventa, Lumbres solo <strong>pone en contacto</strong> a personas
            interesadas; no es parte de la transacción ni la gestiona. El acuerdo, el pago y el envío
            son responsabilidad de las partes (comprador y vendedor). No nos hacemos responsables del
            estado de los libros ni del resultado de los tratos.
        </Text>

        <Section>8. Conducta prohibida</Section>
        <List>
            <li>Publicar contenido ilegal, ofensivo, engañoso, spam o que vulnere derechos de terceros.</li>
            <li>Acosar a otros usuarios o suplantar identidades.</li>
            <li>Intentar dañar, sobrecargar o acceder sin autorización a la plataforma o a otras cuentas.</li>
        </List>

        <Section>9. Suspensión de cuentas</Section>
        <Text>
            Podemos suspender o eliminar cuentas que incumplan estos términos o la ley, especialmente en
            casos de infracción de derechos de autor o de conducta abusiva.
        </Text>

        <Section>10. Propiedad de Lumbres</Section>
        <Text>
            La marca Lumbres, su diseño y su software pertenecen a su titular. Tu cuenta no te otorga
            ningún derecho sobre ellos más allá del uso normal del servicio.
        </Text>

        <Section>11. Garantías y responsabilidad</Section>
        <Text>
            El servicio se ofrece "tal cual", haciendo todo lo posible por mantenerlo disponible y seguro,
            pero sin poder garantizar que esté libre de errores o interrupciones. En la medida que permita
            la ley, no nos hacemos responsables de daños indirectos derivados del uso del servicio.
        </Text>

        <Section>12. Cambios</Section>
        <Text>
            Podemos modificar el servicio y estos términos. Publicaremos la versión vigente en esta página;
            si los cambios son relevantes, intentaremos avisarte.
        </Text>

        <Section>13. Ley aplicable</Section>
        <Text>
            Estos términos se rigen por la legislación española. Para cualquier controversia, y salvo que
            la normativa de consumo indique otra cosa, se aplicarán los juzgados y tribunales que
            correspondan conforme a la ley.
        </Text>

        <Text style={{ marginTop: 18 }}>
            Consulta también nuestra <Link to="/privacidad" style={{ color: 'var(--accent-color)' }}>Política de Privacidad</Link>.
        </Text>
    </LegalLayout>
);

export default Terminos;
