param(
  [int[]] $Ports = @(4000, 5173, 5174)
)

foreach ($port in $Ports) {
  $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique

  foreach ($procId in $pids) {
    if ($procId -and $procId -ne 0) {
      Write-Host "Stopping PID $procId on port $port"
      Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
  }
}

Write-Host "Ports cleared: $($Ports -join ', ')"
