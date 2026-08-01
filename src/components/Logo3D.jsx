import { useEffect, useRef, useState } from 'react';
// Importes nombrados (no `import * as THREE`) para que Vite pueda descartar
// lo que no usamos del paquete three.
import {
    Scene, PerspectiveCamera, WebGLRenderer, Group, Mesh, Shape, Path,
    ExtrudeGeometry, SphereGeometry, TorusGeometry, OctahedronGeometry,
    MeshStandardMaterial, HemisphereLight, DirectionalLight, PointLight,
    Vector3, Color, BufferAttribute, MathUtils, SRGBColorSpace,
} from 'three';

/* Paleta tomada de la marca */
const GOLD_MID = 0xe9a765, GOLD_PALE = 0xf7d6a4, GOLD_WARM = 0xef8542;
const RING_GOLD = 0xc98a4b, EMBER = 0xffdca4, CHAR = 0x241f18;

const OUTER = { R: 0.576, cy: -0.132, tip: 0.895 };
const INNER = { R: 0.249, cy: -0.304, tip: 0.209 };
const RING_R = 1.294, TUBE = 0.038;

/* Silueta de la gota, calcada del icono */
function dropPath(Ctor, R, cy, tipY) {
    const h = tipY - cy;
    const p = new Ctor();
    p.moveTo(0, tipY);
    p.bezierCurveTo(0.30 * R, cy + 0.72 * h, R, cy + 0.42 * h, R, cy);
    p.absarc(0, cy, R, 0, -Math.PI, true);
    p.bezierCurveTo(-R, cy + 0.42 * h, -0.30 * R, cy + 0.72 * h, 0, tipY);
    return p;
}

/* Degradado cálido horneado como color por vértice */
function paintGradient(geo, hexLow, hexHigh, hexBase) {
    const lo = new Color(hexLow), hi = new Color(hexHigh), base = new Color(hexBase);
    const pos = geo.attributes.position;
    let minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }
    const span = maxY - minY || 1;
    const arr = new Float32Array(pos.count * 3);
    const c = new Color();
    for (let i = 0; i < pos.count; i++) {
        c.copy(lo).lerp(hi, Math.pow((pos.getY(i) - minY) / span, 0.85));
        arr[i * 3] = c.r / base.r;
        arr[i * 3 + 1] = c.g / base.g;
        arr[i * 3 + 2] = c.b / base.b;
    }
    geo.setAttribute('color', new BufferAttribute(arr, 3));
}

/**
 * Logo de Lumbres en 3D (three.js): la llama se inclina siguiendo al cursor
 * y se "enciende" al pulsarla. Fondo transparente, así encaja con cualquier tema.
 * Si el navegador no soporta WebGL, o el usuario pide menos animación,
 * degrada al logo PNG de siempre.
 */
const Logo3D = ({ size = 190 }) => {
    const holderRef = useRef(null);

    // Comprobamos WebGL antes de montar nada: así el caso "no hay WebGL" se
    // resuelve en el render (logo plano) y no hace falta tocar estado desde el efecto.
    const [soportaWebGL] = useState(() => {
        try {
            const probe = document.createElement('canvas');
            return Boolean(probe.getContext('webgl2') || probe.getContext('webgl'));
        } catch {
            return false;
        }
    });

    useEffect(() => {
        const holder = holderRef.current;
        if (!holder || !soportaWebGL) return;

        const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let renderer = null, raf = null, disposed = false;
        const basura = [];        // geometrías y materiales que hay que liberar
        const quitar = [];        // funciones para desenganchar escuchadores

        // Limpieza ÚNICA: se usa salga por donde salga el efecto. Si alguna rama
        // se saltara esto, quedaría un <canvas> huérfano en el hueco del logo.
        const limpiar = () => {
            disposed = true;
            if (raf) { cancelAnimationFrame(raf); raf = null; }
            quitar.forEach((f) => f());
            basura.forEach((o) => o.dispose && o.dispose());
            if (renderer) renderer.dispose();
            holder.replaceChildren();   // el hueco queda vacío pase lo que pase
        };

        try {
            const scene = new Scene();
            const camera = new PerspectiveCamera(50, 1, 0.1, 100);
            camera.position.copy(new Vector3(0.34, 0.18, 1).normalize().multiplyScalar(4.1));
            camera.lookAt(0, 0, 0);

            renderer = new WebGLRenderer({ antialias: true, alpha: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setSize(size, size, false);
            renderer.outputColorSpace = SRGBColorSpace;
            renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
            holder.appendChild(renderer.domElement);

            /* ---------- materiales ---------- */
            const matFlame = new MeshStandardMaterial({
                color: GOLD_MID, vertexColors: true,
                roughness: 0.3, metalness: 0.28, emissive: 0xd86a1e, emissiveIntensity: 0.16,
            });
            const matRing = new MeshStandardMaterial({
                color: RING_GOLD, roughness: 0.28, metalness: 0.4,
                emissive: 0x7a3f12, emissiveIntensity: 0.12,
            });
            const matEmber = new MeshStandardMaterial({
                color: EMBER, roughness: 0.22, metalness: 0.1,
                emissive: 0xffb85c, emissiveIntensity: 0.9,
            });
            const matChar = new MeshStandardMaterial({ color: CHAR, roughness: 0.62, metalness: 0.12 });
            basura.push(matFlame, matRing, matEmber, matChar);

            /* ---------- la marca ---------- */
            const mark = new Group();

            const shape = dropPath(Shape, OUTER.R, OUTER.cy, OUTER.tip);
            shape.holes.push(dropPath(Path, INNER.R, INNER.cy, INNER.tip));
            const dropGeo = new ExtrudeGeometry(shape, {
                depth: 0.17, curveSegments: 64,
                bevelEnabled: true, bevelThickness: 0.034, bevelSize: 0.032, bevelSegments: 5,
            });
            dropGeo.translate(0, 0, -0.085);
            paintGradient(dropGeo, GOLD_WARM, GOLD_PALE, GOLD_MID);
            mark.add(new Mesh(dropGeo, matFlame));

            const inlayGeo = new ExtrudeGeometry(dropPath(Shape, INNER.R, INNER.cy, INNER.tip), {
                depth: 0.085, curveSegments: 48,
                bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.016, bevelSegments: 3,
            });
            inlayGeo.translate(0, 0, -0.062);
            mark.add(new Mesh(inlayGeo, matChar));

            const emberGeo = new SphereGeometry(0.104, 48, 32);
            const ember = new Mesh(emberGeo, matEmber);
            ember.position.set(0, -0.348, 0.012);
            mark.add(ember);
            basura.push(dropGeo, inlayGeo, emberGeo);

            /* halo: anillo roto + chispa en el hueco */
            const halo = new Group();
            const GAP = MathUtils.degToRad(27);
            const START = Math.PI / 2 + GAP / 2;
            const ringGeo = new TorusGeometry(RING_R, TUBE, 24, 260, Math.PI * 2 - GAP);
            const ring = new Mesh(ringGeo, matRing);
            ring.rotation.z = START;
            halo.add(ring);
            const capGeo = new SphereGeometry(TUBE, 20, 14);
            [START, START + Math.PI * 2 - GAP].forEach((a) => {
                const cap = new Mesh(capGeo, matRing);
                cap.position.set(Math.cos(a) * RING_R, Math.sin(a) * RING_R, 0);
                halo.add(cap);
            });

            const spark = new Group();
            spark.position.set(0, 1.128, 0);
            const octGeo = new OctahedronGeometry(1, 0);
            const sparkV = new Mesh(octGeo, matEmber);
            sparkV.scale.set(0.055, 0.192, 0.055);
            const sparkH = new Mesh(octGeo, matEmber);
            sparkH.scale.set(0.158, 0.05, 0.05);
            spark.add(sparkV, sparkH);
            halo.add(spark);
            mark.add(halo);
            scene.add(mark);
            basura.push(ringGeo, capGeo, octGeo);

            /* ---------- luces ---------- */
            scene.add(new HemisphereLight(0xfff1dd, 0x3a2f22, 0.34));
            const key = new DirectionalLight(0xffe7c9, 1.58);
            key.position.set(4, 7, 5);
            scene.add(key);
            const fill = new DirectionalLight(0xffd9a8, 0.8);
            fill.position.set(-5, 3, -4);
            scene.add(fill);
            const coreLight = new PointLight(0xff9c4d, 2.0, 5.5, 2);
            coreLight.position.set(0, -0.2, 0.45);
            scene.add(coreLight);
            const rimLight = new PointLight(0xc67139, 1.4, 6, 2);
            rimLight.position.set(0, 0.3, -1.1);
            scene.add(rimLight);

            /* ---------- sin animación: un solo fotograma ---------- */
            if (quieto) {
                renderer.render(scene, camera);
                return limpiar;
            }

            /* ---------- interacción ---------- */
            let aimX = 0, aimY = 0, pointerX = 0, pointerY = 0;
            let over = 0, overTarget = 0, burst = 0, spinTarget = 0;

            const encender = () => { burst = 1; spinTarget += Math.PI * 2; };
            const onMove = (e) => {
                const r = holder.getBoundingClientRect();
                aimX = ((e.clientX - r.left) / r.width - 0.5) * 2;
                aimY = ((e.clientY - r.top) / r.height - 0.5) * 2;
                overTarget = 1;
            };
            const onLeave = () => { aimX = 0; aimY = 0; overTarget = 0; };
            holder.addEventListener('pointermove', onMove);
            holder.addEventListener('pointerleave', onLeave);
            holder.addEventListener('click', encender);
            quitar.push(() => {
                holder.removeEventListener('pointermove', onMove);
                holder.removeEventListener('pointerleave', onLeave);
                holder.removeEventListener('click', encender);
            });

            /* ---------- bucle ---------- */
            let last = performance.now() / 1000, t = 0;
            const animar = () => {
                raf = requestAnimationFrame(animar);
                const now = performance.now() / 1000;
                const dt = Math.min(now - last, 0.05);
                last = now;
                t += dt;

                burst = Math.max(0, burst - dt * 1.1);
                const e = burst * burst;
                over += (overTarget - over) * Math.min(1, dt * 5);

                const swayX = Math.sin(t * 0.45) * 0.055 * (1 - over);
                const swayY = Math.sin(t * 0.31 + 1.2) * 0.03 * (1 - over);
                pointerX += (aimX - pointerX) * Math.min(1, dt * 3.4);
                pointerY += (aimY - pointerY) * Math.min(1, dt * 3.4);
                mark.rotation.y = pointerX * 0.3 + swayX;
                mark.rotation.x = pointerY * 0.17 + swayY;
                mark.scale.setScalar(1 + 0.045 * e);

                halo.rotation.z += (spinTarget - halo.rotation.z) * Math.min(1, dt * 2.6);

                const flick = 0.74 + 0.2 * Math.sin(t * 7.3) * Math.sin(t * 3.1) + 0.1 * Math.sin(t * 13.7);
                matEmber.emissiveIntensity = 0.8 * flick + 0.35 * over + 2.4 * e;
                matFlame.emissiveIntensity = 0.14 + 0.05 * flick + 0.1 * over + 0.55 * e;
                matRing.emissiveIntensity = 0.1 + 0.12 * over + 0.5 * e;
                coreLight.intensity = 1.8 * flick + 0.6 * over + 7 * e;
                rimLight.intensity = 1.3 + 0.5 * over + 3 * e;
                ember.scale.setScalar(1 + 0.05 * Math.sin(t * 4.4) + 0.22 * e);
                spark.scale.setScalar(1 + 0.06 * Math.sin(t * 2.2 + 0.7) + 0.3 * e);

                renderer.render(scene, camera);
            };
            animar();

            /* En segundo plano no gastamos batería */
            const onVisibility = () => {
                if (document.hidden) {
                    if (raf) { cancelAnimationFrame(raf); raf = null; }
                } else if (!raf && !disposed) {
                    last = performance.now() / 1000;
                    animar();
                }
            };
            document.addEventListener('visibilitychange', onVisibility);
            quitar.push(() => document.removeEventListener('visibilitychange', onVisibility));

            return limpiar;
        } catch (err) {
            // Fallo raro en tiempo de ejecución (contexto perdido, sin memoria…).
            // Estamos fuera del ciclo de React, así que ponemos el PNG a mano.
            console.warn('[Logo3D] no se pudo montar la escena, se usa el logo plano:', err?.message);
            limpiar();
            const img = document.createElement('img');
            img.src = '/logo.png';
            img.alt = 'Lumbres';
            img.className = 'auth-logo';
            holder.appendChild(img);
        }
    }, [size, soportaWebGL]);

    if (!soportaWebGL) return <img src="/logo.png" alt="Lumbres" className="auth-logo" />;

    return (
        <div
            ref={holderRef}
            className="auth-logo-3d"
            style={{ width: size, height: size }}
            role="img"
            aria-label="Lumbres"
            title="Pulsa para encenderla"
        />
    );
};

export default Logo3D;
