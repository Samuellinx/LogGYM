$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$androidAppDir = Join-Path $projectRoot 'android\app'
$userGradleProperties = Join-Path $HOME '.gradle\gradle.properties'

$requiredKeys = @(
  'LOGGYM_UPLOAD_STORE_FILE',
  'LOGGYM_UPLOAD_STORE_PASSWORD',
  'LOGGYM_UPLOAD_KEY_ALIAS',
  'LOGGYM_UPLOAD_KEY_PASSWORD'
)

function Get-ConfiguredValue {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Key
  )

  $envValue = [Environment]::GetEnvironmentVariable($Key)
  if (-not [string]::IsNullOrWhiteSpace($envValue)) {
    return @{
      Value = $envValue.Trim()
      Source = 'env'
    }
  }

  if (-not (Test-Path $userGradleProperties)) {
    return $null
  }

  $match = Select-String -Path $userGradleProperties -Pattern "^\s*$Key\s*=\s*(.+?)\s*$" | Select-Object -First 1
  if ($null -eq $match) {
    return $null
  }

  return @{
    Value = $match.Matches[0].Groups[1].Value.Trim()
    Source = $userGradleProperties
  }
}

function Resolve-StoreFilePath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PathValue
  )

  if ([System.IO.Path]::IsPathRooted($PathValue)) {
    return [System.IO.Path]::GetFullPath($PathValue)
  }

  return [System.IO.Path]::GetFullPath((Join-Path $androidAppDir $PathValue))
}

Write-Host '== LogGYM Release Doctor ==' -ForegroundColor Cyan
Write-Host "Projeto: $projectRoot"

$issues = New-Object System.Collections.Generic.List[string]
$resolved = @{}

foreach ($key in $requiredKeys) {
  $configured = Get-ConfiguredValue -Key $key

  if ($null -eq $configured) {
    $issues.Add("Falta configurar $key em variavel de ambiente ou em $userGradleProperties.")
    continue
  }

  $resolved[$key] = $configured
  Write-Host ("OK  {0} ({1})" -f $key, $configured.Source) -ForegroundColor Green
}

$keytoolCommand = Get-Command keytool -ErrorAction SilentlyContinue
if ($null -eq $keytoolCommand) {
  $issues.Add('`keytool` nao foi encontrado no PATH. Instale/ative o JDK 17 antes do release.')
} else {
  Write-Host ("OK  keytool em {0}" -f $keytoolCommand.Source) -ForegroundColor Green
}

$keystorePath = $null
if ($resolved.ContainsKey('LOGGYM_UPLOAD_STORE_FILE')) {
  $keystorePath = Resolve-StoreFilePath -PathValue $resolved.LOGGYM_UPLOAD_STORE_FILE.Value

  if (-not (Test-Path $keystorePath)) {
    $issues.Add("A keystore configurada nao existe: $keystorePath")
  } else {
    Write-Host ("OK  keystore encontrada em {0}" -f $keystorePath) -ForegroundColor Green
  }

  if ($keystorePath -match 'debug\.keystore$') {
    $issues.Add('A release nao deve usar debug keystore. Gere uma keystore propria para distribuicao real.')
  }
}

if ($issues.Count -gt 0) {
  Write-Host ''
  Write-Host 'Pendencias encontradas:' -ForegroundColor Red
  foreach ($issue in $issues) {
    Write-Host (" - {0}" -f $issue) -ForegroundColor Red
  }

  Write-Host ''
  Write-Host 'Modelo esperado de configuracao:' -ForegroundColor Yellow
  Write-Host "Copie android/release-signing.example.properties para $userGradleProperties e preencha com seus valores reais."
  exit 1
}

Write-Host ''
Write-Host 'Ambiente pronto para gerar APK release assinada.' -ForegroundColor Green
Write-Host 'Comando: npm run apk:release'

if ($keystorePath) {
  Write-Host ''
  Write-Host 'Comando util para conferir o SHA-1 da keystore release:' -ForegroundColor Yellow
  Write-Host ("keytool -list -v -keystore ""{0}"" -alias ""{1}""" -f $keystorePath, $resolved.LOGGYM_UPLOAD_KEY_ALIAS.Value)
}
