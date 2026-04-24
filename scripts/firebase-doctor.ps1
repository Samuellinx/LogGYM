$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$androidConfig = Join-Path $projectRoot "android\app\google-services.json"
$webEnv = Join-Path $projectRoot "web\.env"
$mobileEnv = Join-Path $projectRoot ".env"
$rulesFile = Join-Path $projectRoot "firestore.rules"
$firebaseJson = Join-Path $projectRoot "firebase.json"

Write-Host "== LogGYM Firebase Doctor ==" -ForegroundColor Cyan
Write-Host "Projeto: $projectRoot"
Write-Host ""

function Write-Status {
  param(
    [string]$Label,
    [bool]$Ok,
    [string]$Details
  )

  if ($Ok) {
    Write-Host ("OK  {0} ({1})" -f $Label, $Details) -ForegroundColor Green
  } else {
    Write-Host ("WARN {0} ({1})" -f $Label, $Details) -ForegroundColor Yellow
  }
}

Write-Status "firebase.json" (Test-Path $firebaseJson) $firebaseJson
Write-Status "firestore.rules" (Test-Path $rulesFile) $rulesFile
Write-Status ".env mobile" (Test-Path $mobileEnv) $mobileEnv
Write-Status ".env web" (Test-Path $webEnv) $webEnv
Write-Status "google-services.json Android" (Test-Path $androidConfig) $androidConfig

Write-Host ""
Write-Host "Checklist manual obrigatorio:" -ForegroundColor Cyan
Write-Host "1. Criar um projeto Firebase e habilitar Authentication > Google e Email/Password."
Write-Host "2. Adicionar um app Android com package com.loggym."
Write-Host "3. Baixar o google-services.json e salvar em android/app/google-services.json."
Write-Host "4. Adicionar o SHA-1 e SHA-256 do debug/release no app Android do Firebase."
Write-Host "5. Criar um app Web e preencher web/.env com as chaves VITE_FIREBASE_*."
Write-Host "6. Em Authentication > Settings > Authorized domains, adicionar localhost se for usar o painel web em DEV."
Write-Host "7. Em Authentication, habilitar Email Enumeration Protection para producao."
Write-Host "8. Habilitar App Check para Web e Android antes do deploy publico."
Write-Host "9. Publicar firestore.rules e firestore.indexes.json com o Firebase CLI."

Write-Host ""
Write-Host "Comandos uteis:" -ForegroundColor Cyan
Write-Host "npm run android:signingReport"
Write-Host "npm run firebase:doctor"
Write-Host "npm run web:dev"
