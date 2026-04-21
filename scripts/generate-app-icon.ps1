$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$resourceRoot = Join-Path $projectRoot 'android\app\src\main\res'

$sizes = @{
  'mipmap-mdpi' = 48
  'mipmap-hdpi' = 72
  'mipmap-xhdpi' = 96
  'mipmap-xxhdpi' = 144
  'mipmap-xxxhdpi' = 192
}

function New-ColorFromHex {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Hex,
    [int]$Alpha = 255
  )

  $cleanHex = $Hex.TrimStart('#')
  return [System.Drawing.Color]::FromArgb(
    $Alpha,
    [Convert]::ToInt32($cleanHex.Substring(0, 2), 16),
    [Convert]::ToInt32($cleanHex.Substring(2, 2), 16),
    [Convert]::ToInt32($cleanHex.Substring(4, 2), 16)
  )
}

function New-RoundedRectanglePath {
  param(
    [float]$X,
    [float]$Y,
    [float]$Width,
    [float]$Height,
    [float]$Radius
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2

  $path.AddArc($X, $Y, $diameter, $diameter, 180, 90)
  $path.AddArc($X + $Width - $diameter, $Y, $diameter, $diameter, 270, 90)
  $path.AddArc($X + $Width - $diameter, $Y + $Height - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($X, $Y + $Height - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()

  return $path
}

function Draw-BrandIcon {
  param(
    [Parameter(Mandatory = $true)]
    [string]$OutputPath,
    [Parameter(Mandatory = $true)]
    [int]$Size,
    [Parameter(Mandatory = $true)]
    [bool]$Round
  )

  $bitmap = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)

    if ($Round) {
      $shape = New-Object System.Drawing.Drawing2D.GraphicsPath
      $shape.AddEllipse(0, 0, $Size - 1, $Size - 1)
    } else {
      $shape = New-RoundedRectanglePath 0 0 ($Size - 1) ($Size - 1) ($Size * 0.27)
    }

    try {
      $gradientBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush (
        [System.Drawing.PointF]::new(0, 0),
        [System.Drawing.PointF]::new($Size, $Size),
        (New-ColorFromHex '#0A0E13'),
        (New-ColorFromHex '#102018')
      )

      try {
        $blend = New-Object System.Drawing.Drawing2D.ColorBlend
        $blend.Colors = @(
          (New-ColorFromHex '#0A0E13'),
          (New-ColorFromHex '#102018'),
          (New-ColorFromHex '#0C151E')
        )
        $blend.Positions = @(0.0, 0.54, 1.0)
        $gradientBrush.InterpolationColors = $blend
        $graphics.FillPath($gradientBrush, $shape)
      } finally {
        $gradientBrush.Dispose()
      }

      $glowBrush = New-Object System.Drawing.SolidBrush (New-ColorFromHex '#7CFF4F' 24)
      try {
        $graphics.FillEllipse(
          $glowBrush,
          $Size * 0.16,
          $Size * 0.15,
          $Size * 0.68,
          $Size * 0.68
        )
      } finally {
        $glowBrush.Dispose()
      }

      $borderPen = New-Object System.Drawing.Pen((New-ColorFromHex '#FFFFFF' 18), [Math]::Max(1.0, $Size * 0.018))
      try {
        $graphics.DrawPath($borderPen, $shape)
      } finally {
        $borderPen.Dispose()
      }

      $ringPen = New-Object System.Drawing.Pen((New-ColorFromHex '#A6FF63' 42), [Math]::Max(1.0, $Size * 0.028))
      try {
        $graphics.DrawEllipse(
          $ringPen,
          $Size * 0.18,
          $Size * 0.18,
          $Size * 0.64,
          $Size * 0.64
        )
      } finally {
        $ringPen.Dispose()
      }

      $accentPen = New-Object System.Drawing.Pen((New-ColorFromHex '#A6FF63'), [Math]::Max(2.0, $Size * 0.085))
      $accentPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
      $accentPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

      try {
        $graphics.DrawLine(
          $accentPen,
          $Size * 0.34,
          $Size * 0.64,
          $Size * 0.63,
          $Size * 0.36
        )
      } finally {
        $accentPen.Dispose()
      }

      $platePen = New-Object System.Drawing.Pen((New-ColorFromHex '#A6FF63'), [Math]::Max(2.0, $Size * 0.055))
      try {
        $graphics.DrawEllipse($platePen, $Size * 0.20, $Size * 0.57, $Size * 0.22, $Size * 0.22)
        $graphics.DrawEllipse($platePen, $Size * 0.30, $Size * 0.67, $Size * 0.06, $Size * 0.06)
        $graphics.DrawEllipse($platePen, $Size * 0.58, $Size * 0.25, $Size * 0.22, $Size * 0.22)
        $graphics.DrawEllipse($platePen, $Size * 0.68, $Size * 0.35, $Size * 0.06, $Size * 0.06)
      } finally {
        $platePen.Dispose()
      }

      $progressPen = New-Object System.Drawing.Pen((New-ColorFromHex '#4FCBFF'), [Math]::Max(2.0, $Size * 0.05))
      $progressPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
      $progressPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
      $progressPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

      try {
        $points = @(
          [System.Drawing.PointF]::new($Size * 0.19, $Size * 0.34),
          [System.Drawing.PointF]::new($Size * 0.33, $Size * 0.49),
          [System.Drawing.PointF]::new($Size * 0.43, $Size * 0.40),
          [System.Drawing.PointF]::new($Size * 0.62, $Size * 0.58)
        )

        $graphics.DrawLines($progressPen, $points)
        $graphics.DrawLine($progressPen, $Size * 0.57, $Size * 0.58, $Size * 0.62, $Size * 0.58)
        $graphics.DrawLine($progressPen, $Size * 0.62, $Size * 0.58, $Size * 0.62, $Size * 0.52)
      } finally {
        $progressPen.Dispose()
      }

      $directory = Split-Path $OutputPath -Parent
      if (-not (Test-Path $directory)) {
        New-Item -ItemType Directory -Path $directory | Out-Null
      }

      $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $shape.Dispose()
    }
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

foreach ($entry in $sizes.GetEnumerator()) {
  $folder = Join-Path $resourceRoot $entry.Key
  Draw-BrandIcon -OutputPath (Join-Path $folder 'ic_launcher.png') -Size $entry.Value -Round:$false
  Draw-BrandIcon -OutputPath (Join-Path $folder 'ic_launcher_round.png') -Size $entry.Value -Round:$true
}

Write-Host 'Launcher icons updated successfully.'
