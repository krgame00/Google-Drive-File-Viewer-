$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../scripts/shared/settings.ps1')
$taskTestRoot = Join-Path ([IO.Path]::GetTempPath()) ('gdv-settings-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $taskTestRoot | Out-Null
try {
    Copy-Item (Join-Path $PSScriptRoot '../scripts/config.example.json') (Join-Path $taskTestRoot 'config.example.json')
    '{"downloadRoot":"downloads","logRoot":"logs","driveRemote":"backup","remoteRoot":"Videos"}' | Set-Content (Join-Path $taskTestRoot 'config.local.json')
    $taskSettings = Get-ProjectSettings -ScriptsRoot $taskTestRoot
    if ($taskSettings.downloadRoot -ne (Join-Path $taskTestRoot 'downloads')) { throw 'Relative download path did not resolve at config directory' }
    if ($taskSettings.driveRemote -ne 'backup' -or $taskSettings.remoteRoot -ne 'Videos') { throw 'Overrides not applied' }
    if (-not $taskSettings.rclonePath) { throw 'Partial override lost defaults' }
    $taskCaught = $false
    try { Resolve-ProjectCommand -Name 'codex-intentionally-missing-tool' -ConfiguredPath (Join-Path $taskTestRoot 'absent.exe') } catch { $taskCaught = $true }
    if (-not $taskCaught) { throw 'Missing executable was accepted' }
    '{"driveRemote":"bad:remote"}' | Set-Content (Join-Path $taskTestRoot 'config.local.json')
    $taskCaught = $false
    try { Get-ProjectSettings -ScriptsRoot $taskTestRoot } catch { $taskCaught = $true }
    if (-not $taskCaught) { throw 'Invalid remote accepted' }
    '{"downloadRot":"typo"}' | Set-Content (Join-Path $taskTestRoot 'config.local.json')
    $taskCaught = $false
    try { Get-ProjectSettings -ScriptsRoot $taskTestRoot } catch { $taskCaught = $true }
    if (-not $taskCaught) { throw 'Unknown setting accepted' }
    function Test-LocalRclone { $global:LASTEXITCODE = 0; 'backup:' }
    $taskSettings.logRoot = $taskTestRoot
    Assert-ProjectTransfer -Settings $taskSettings -Rclone 'Test-LocalRclone'
    $taskSettings.driveRemote = 'missing'
    $taskCaught = $false
    try { Assert-ProjectTransfer -Settings $taskSettings -Rclone 'Test-LocalRclone' } catch { $taskCaught = $true }
    if (-not $taskCaught) { throw 'Missing remote accepted' }
    $Settings = @{ remoteRoot='Videos'; logRoot=$taskTestRoot }
    $DriveRemote = 'backup'
    $Rclone = 'Test-CaptureCopy'
    function Test-CaptureCopy { $script:taskArguments = $args }
    $taskScript = Join-Path $PSScriptRoot '../scripts/transfer/rclone_copy_5_69.ps1'
    $taskTokens = $null; $taskErrors = $null
    $taskAst = [System.Management.Automation.Language.Parser]::ParseFile($taskScript, [ref]$taskTokens, [ref]$taskErrors)
    $taskDest = $taskAst.Find({ param($node) $node -is [System.Management.Automation.Language.AssignmentStatementAst] -and $node.Left.Extent.Text -eq '$destRoot' }, $true)
    . ([scriptblock]::Create($taskDest.Extent.Text))
    if ($destRoot -ne 'backup:Videos/5.69') { throw 'Remote destination did not use settings' }
    $taskCopy = $taskAst.Find({ param($node) $node -is [System.Management.Automation.Language.CommandAst] -and $node.CommandElements.Count -gt 1 -and $node.CommandElements[0].Extent.Text -eq '$Rclone' -and $node.CommandElements[1].Extent.Text -eq 'copy' }, $true)
    . ([scriptblock]::Create($taskCopy.Extent.Text))
    if ($script:taskArguments[1] -notlike 'backup,root_folder_id="*":' -or $script:taskArguments[2] -notlike 'backup:Videos/5.69/*') { throw 'Copy did not use configured source and destination' }
    Write-Output 'PASS: settings relocation, partial overrides, missing tools and invalid settings'
} finally {
    # Delete only this test's verified temporary directory.
    $taskResolved = [IO.Path]::GetFullPath($taskTestRoot)
    if (-not $taskResolved.StartsWith([IO.Path]::GetFullPath([IO.Path]::GetTempPath()), [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe test cleanup path' }
    Remove-Item -LiteralPath $taskResolved -Recurse -Force
}
