$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$fixAdbScript = Join-Path $scriptDir 'fix-adb.ps1'

& $fixAdbScript

$sdkAdbPath = $env:LOGGYM_ANDROID_SDK_ADB
$projectRoot = Split-Path $scriptDir -Parent
$androidDir = Join-Path $projectRoot 'android'
$apkPath = Join-Path $projectRoot 'android\app\build\outputs\apk\debug\app-debug.apk'

if (-not $sdkAdbPath -or -not (Test-Path $sdkAdbPath)) {
  throw 'Nao foi possivel localizar o adb do Android SDK para executar o app.'
}

function Invoke-Adb {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
  )

  & $sdkAdbPath @('-P', $env:ADB_SERVER_PORT) @Arguments
}

Push-Location $androidDir
try {
  & .\gradlew.bat assembleDebug
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
} finally {
  Pop-Location
}

if (-not (Test-Path $apkPath)) {
  throw "APK debug nao encontrado em $apkPath"
}

try {
  Invoke-Adb -Arguments @('install', '-r', $apkPath) | Out-Host
} catch {
  $installMessage = $_.Exception.Message

  if ($installMessage -match 'INSTALL_FAILED_UPDATE_INCOMPATIBLE') {
    throw 'A instalacao falhou por assinatura diferente. Execute `C:\Users\Samuel\AppData\Local\Android\Sdk\platform-tools\adb uninstall com.loggym` e rode `npm run android:dev` novamente.'
  }

  throw
}

Invoke-Adb -Arguments @('reverse', 'tcp:8081', 'tcp:8081') | Out-Host
Invoke-Adb -Arguments @(
  'shell',
  'am',
  'start',
  '-n',
  'com.loggym/com.loggym.MainActivity',
  '-a',
  'android.intent.action.MAIN',
  '-c',
  'android.intent.category.LAUNCHER'
) | Out-Host
exit $LASTEXITCODE
