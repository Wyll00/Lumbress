# Compila el APK de Lumbres (Android) y lo sube a https://lumbress.com/lumbres.apk
# Uso (PowerShell, desde la raíz del repo):  .\deploy\build-apk.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Write-Output "== 1/4 Compilando frontend =="
npm run build

Write-Output "== 2/4 Sincronizando con Android (cap sync) =="
npx cap sync android

Write-Output "== 3/4 Compilando APK (gradle) =="
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\willi\AppData\Local\Android\Sdk"
Set-Location "$root\android"
.\gradlew.bat assembleDebug --no-daemon
Set-Location $root

Write-Output "== 4/4 Subiendo APK al servidor =="
scp -i "$env:USERPROFILE\.ssh\id_ed25519" "android\app\build\outputs\apk\debug\app-debug.apk" root@72.60.187.17:/var/www/lumbres/dist/lumbres.apk

Write-Output "OK -> https://lumbress.com/lumbres.apk"
