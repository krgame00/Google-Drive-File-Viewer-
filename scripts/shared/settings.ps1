function Get-ProjectSettings {
    param([string]$ScriptsRoot = (Split-Path $PSScriptRoot -Parent))
    $ScriptsRoot = [IO.Path]::GetFullPath($ScriptsRoot)
    $example = Join-Path $ScriptsRoot 'config.example.json'
    try { $defaults = Get-Content -LiteralPath $example -Raw -Encoding UTF8 -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop }
    catch { throw 'Cannot read scripts/config.example.json. Check that it contains valid JSON.' }
    if ($null -eq $defaults -or $defaults -is [array] -or $defaults -isnot [pscustomobject]) { throw 'config.example.json must contain a JSON object.' }
    $settings = @{}
    foreach ($property in $defaults.PSObject.Properties) { $settings[$property.Name] = $property.Value }
    $local = Join-Path $ScriptsRoot 'config.local.json'
    if (Test-Path -LiteralPath $local) {
        try { $overrides = Get-Content -LiteralPath $local -Raw -Encoding UTF8 -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop }
        catch { throw 'Cannot read scripts/config.local.json. Check that it contains valid JSON.' }
        if ($null -eq $overrides -or $overrides -is [array] -or $overrides -isnot [pscustomobject]) { throw 'config.local.json must contain a JSON object.' }
        foreach ($property in $overrides.PSObject.Properties) {
            if (-not $settings.ContainsKey($property.Name)) { throw "Unknown setting: $($property.Name)" }
            $settings[$property.Name] = $property.Value
        }
    }
    foreach ($key in @('rclonePath','downloadRoot','logRoot','driveRemote','remoteRoot','linkSourceRoot')) {
        if ($settings[$key] -isnot [string] -or [string]::IsNullOrWhiteSpace($settings[$key])) { throw "Setting $key must be a nonempty string." }
    }
    if ($settings.driveRemote -notmatch '^[a-zA-Z0-9_-]+$') { throw 'driveRemote must be a remote name without a colon or spaces.' }
    if ($settings.remoteRoot -match '[:\r\n]' -or $settings.remoteRoot.StartsWith('/')) { throw 'remoteRoot must be a relative remote folder without a colon.' }
    foreach ($key in @('rclonePath','downloadRoot','logRoot','linkSourceRoot')) {
        $value = [Environment]::ExpandEnvironmentVariables($settings[$key])
        if ($value -match '%[^%]+%') { throw "Environment variable in $key is not defined. Set an explicit path in config.local.json." }
        if (-not [IO.Path]::IsPathRooted($value)) { $value = Join-Path $ScriptsRoot $value }
        $settings[$key] = [IO.Path]::GetFullPath($value)
    }
    return $settings
}

function Resolve-ProjectCommand {
    param([string]$Name, [string]$ConfiguredPath)
    if ($ConfiguredPath -and (Test-Path -LiteralPath $ConfiguredPath -PathType Leaf)) { return $ConfiguredPath }
    $command = Get-Command $Name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($command) { return $command.Source }
    throw "Cannot find $Name. Install it or update scripts/config.local.json (rclonePath for rclone)."
}

function Assert-ProjectTransfer {
    param([hashtable]$Settings, [string]$Rclone)
    # listremotes reads local rclone configuration; it does not contact Drive.
    $remotes = @(& $Rclone listremotes 2>$null)
    if ($LASTEXITCODE -ne 0) { throw 'Cannot read rclone remotes. Check the rclone configuration.' }
    if (($remotes | ForEach-Object { $_.Trim() }) -notcontains ($Settings.driveRemote + ':')) { throw 'Configured driveRemote was not found in rclone. Check scripts/config.local.json.' }
    if (-not (Test-Path -LiteralPath $Settings.logRoot -PathType Container)) { throw 'logRoot does not exist. Create it or change scripts/config.local.json.' }
}

function Assert-ProjectDownload {
    param([hashtable]$Settings)
    Resolve-ProjectCommand -Name 'gdown' | Out-Null
    $driveRoot = [IO.Path]::GetPathRoot($Settings.downloadRoot)
    if (-not (Test-Path -LiteralPath $driveRoot -PathType Container)) { throw 'Download drive is unavailable. Change downloadRoot in scripts/config.local.json.' }
}
