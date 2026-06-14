# 📱 App Android de Lumbres (Capacitor)

La app empaqueta el frontend React y habla con la API de producción
(`https://lumbress.com`). Sesión por **token** (`Authorization: Bearer`),
no por cookie (config en `src/config.js`, detección `window.Capacitor`).

- **appId:** `com.lumbres.app` · **appName:** Lumbres · `capacitor.config.json` (webDir `dist`)
- **Proyecto nativo:** `android/` (en git; artefactos de build ignorados)
- **APK de prueba publicado en:** https://lumbress.com/lumbres.apk

## Requisitos (ya cumplidos en este PC)
- Android Studio instalado → trae **JDK 21** (`C:\Program Files\Android\Android Studio\jbr`) y **SDK** (`C:\Users\willi\AppData\Local\Android\Sdk`).
- `android/local.properties` apunta al SDK (ignorado por git, regenerar si se clona en otra máquina).

## Recompilar el APK y publicarlo (tras cambios en la app)
```bash
# 1) build web + sincronizar Capacitor
npm run build
npx cap sync android
```
```powershell
# 2) compilar el APK (PowerShell, por las rutas con espacios)
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\willi\AppData\Local\Android\Sdk"
cd android; .\gradlew.bat assembleDebug --no-daemon
```
```bash
# 3) publicar en el VPS para descargar desde el móvil
scp -i "C:/Users/willi/.ssh/id_ed25519" \
  android/app/build/outputs/apk/debug/app-debug.apk \
  root@72.60.187.17:/var/www/lumbres/dist/lumbres.apk
```
APK resultante: `android/app/build/outputs/apk/debug/app-debug.apk` (~5 MB, **debug** sin firmar para Play Store).

## Instalar en el móvil (debug)
1. En el móvil, abre **https://lumbress.com/lumbres.apk** y descárgalo.
2. Ábrelo; Android pedirá permitir **"instalar apps de orígenes desconocidos"** para el navegador → aceptar.
3. Instala y abre. Login con tu cuenta de lumbress.com.

## Pendiente para publicar en Google Play (no para el test)
- Icono/splash con el logo (generar con `@capacitor/assets` desde un PNG ≥1024).
- **APK/AAB de release firmado** (keystore propio): `gradlew bundleRelease` + firma.
- Cuenta Google Play Developer (25 USD pago único) y ficha de la tienda.
- Pagos: las suscripciones siguen siendo **web** (Premium se contrata en lumbress.com); evitar Stripe in-app por las normas de la tienda.
