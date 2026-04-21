$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$androidDir = Join-Path $projectRoot 'android'
$releaseApk = Join-Path $projectRoot 'android\app\build\outputs\apk\release\app-release.apk'

& (Join-Path $PSScriptRoot 'release-doctor.ps1')

Push-Location $androidDir
try {
  & .\gradlew.bat assembleRelease

  if ($LASTEXITCODE -ne 0) {
    throw "Gradle assembleRelease falhou com exit code $LASTEXITCODE."
  }
} finally {
  Pop-Location
}

if (-not (Test-Path $releaseApk)) {
  throw "Build release concluido sem localizar o APK esperado em $releaseApk"
}

Write-Host ''
Write-Host "APK release gerada em: $releaseApk" -ForegroundColor Green
