# Cuts assets/icon-source.png down to the four sizes the manifest references.
# Usage:  powershell -ExecutionPolicy Bypass -File assets\make-icons.ps1
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'

$root = Split-Path $PSScriptRoot -Parent
$source = Join-Path $PSScriptRoot 'icon-source.png'
if (-not (Test-Path $source)) { throw "Put the square icon at $source first." }

$src = [System.Drawing.Image]::FromFile($source)
Write-Host "source: $($src.Width)x$($src.Height)"
if ($src.Width -ne $src.Height) { Write-Warning "Source is not square; it will be squashed." }

foreach ($size in 16, 32, 48, 128) {
  $out = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, $size, $size)))
  $g.Dispose()
  $path = Join-Path $root "icons\icon$size.png"
  $out.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $out.Dispose()
  Write-Host "wrote icons/icon$size.png"
}
$src.Dispose()
