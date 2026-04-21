$ErrorActionPreference = 'Stop'

function Get-AndroidSdkAdb {
  $candidates = @()

  if ($env:ANDROID_HOME) {
    $candidates += (Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe')
  }

  if ($env:ANDROID_SDK_ROOT) {
    $candidates += (Join-Path $env:ANDROID_SDK_ROOT 'platform-tools\adb.exe')
  }

  if ($env:LOCALAPPDATA) {
    $candidates += (Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe')
  }

  $match = $candidates |
    Where-Object { $_ -and (Test-Path $_) } |
    Select-Object -Unique -First 1

  if (-not $match) {
    throw 'Nao foi possivel localizar o adb do Android SDK.'
  }

  return $match
}

$adbPath = Get-AndroidSdkAdb
$platformToolsPath = Split-Path $adbPath -Parent

$env:LOGGYM_ANDROID_SDK_ADB = $adbPath

if (-not $env:ADB_SERVER_PORT) {
  $env:ADB_SERVER_PORT = '5038'
}

Write-Host "Usando adb do Android SDK: $adbPath"
Write-Host "Usando porta isolada do adb para o projeto: $env:ADB_SERVER_PORT"

$sanitizedPathEntries = $env:PATH -split ';' |
  Where-Object {
    $_ -and
    $_ -ne $platformToolsPath -and
    $_ -notmatch [regex]::Escape('Minimal ADB and Fastboot')
  }

$env:PATH = (@($platformToolsPath) + $sanitizedPathEntries) -join ';'

Write-Host 'adb visivel no PATH durante esta execucao:'
& where.exe adb | Out-Host

function Invoke-Adb {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Arguments
  )

  & $adbPath @('-P', $env:ADB_SERVER_PORT) @Arguments
}

$runningAdb = Get-Process adb -ErrorAction SilentlyContinue
if ($runningAdb) {
  Write-Host 'Encerrando processos adb em execucao para evitar conflito de versao...'
  $runningAdb | Stop-Process -Force
  Start-Sleep -Milliseconds 800
}

cmd /c "taskkill /F /IM adb.exe /T >nul 2>nul" | Out-Null
Start-Sleep -Milliseconds 500

try {
  Invoke-Adb kill-server *> $null
} catch {
  # Sem daemon na porta isolada ainda; seguimos para start-server.
}

Invoke-Adb start-server | Out-Host
$devicesOutput = Invoke-Adb devices
$devicesOutput | Out-Host

$devicesText = ($devicesOutput | Out-String)
$hasConnectedDevice = $devicesText -match "\tdevice(\s|$)"
$hasUnauthorizedDevice = $devicesText -match "\tunauthorized(\s|$)"
$foreignAdb = Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq 'adb.exe' -and
    $_.ExecutablePath -like '*Minimal ADB and Fastboot*'
  }

if ($hasUnauthorizedDevice) {
  throw 'O dispositivo foi encontrado, mas esta como unauthorized. Desbloqueie o Android e confirme a autorizacao USB.'
}

if (-not $hasConnectedDevice -and $foreignAdb) {
  throw 'Conflito externo detectado: o Minimal ADB and Fastboot continua iniciando um adb antigo. Remova `C:\Program Files (x86)\Minimal ADB and Fastboot` do PATH ou desinstale esse pacote antes de rodar o projeto.'
}
