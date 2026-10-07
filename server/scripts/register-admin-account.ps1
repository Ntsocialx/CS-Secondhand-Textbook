$ErrorActionPreference = 'Stop'
$apiBaseUrl = 'http://localhost:5000'

$email = (Read-Host 'TUT student email').Trim().ToLowerInvariant()
if ($email -notmatch '^[^@\s]+@(?:student\.tut\.ac\.za|tut\.ac\.za|tut4life\.ac\.za)$') {
  throw 'Enter an email from an approved TUT student domain.'
}

$health = Invoke-RestMethod -Uri "$apiBaseUrl/health" -Method Get
if ($health.status -ne 'OK' -or -not $health.databaseConfigured) {
  throw 'The API or database is unavailable. Start the server and try again.'
}

$firstName = (Read-Host 'First name').Trim()
$lastName = (Read-Host 'Last name').Trim()
if (-not $firstName -or -not $lastName) {
  throw 'First name and last name are required.'
}

$securePassword = Read-Host 'Set the admin account password' -AsSecureString
if ($securePassword.Length -lt 8 -or $securePassword.Length -gt 128) {
  $securePassword.Dispose()
  throw 'Password must contain between 8 and 128 characters.'
}

$passwordPointer = [IntPtr]::Zero
try {
  $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  $body = @{
    email = $email
    password = $password
    firstName = $firstName
    lastName = $lastName
    consent = @{ accepted = $true; version = '1.0'; displayContactDetails = $false }
  } | ConvertTo-Json -Compress

  $result = Invoke-RestMethod -Uri "$apiBaseUrl/api/auth/register" -Method Post `
    -ContentType 'application/json' -Body $body
  Write-Host "Registered $($result.user.email) with initial role $($result.user.role)."
  Write-Host 'The account is ready for the server-side admin promotion command.'
} catch {
  $failure = $_
  $response = $failure.Exception.Response
  $statusCode = if ($response) { [int]$response.StatusCode } else { $null }
  $apiMessage = $null
  if ($response) {
    $stream = $response.GetResponseStream()
    if ($stream) {
      $reader = [System.IO.StreamReader]::new($stream)
      try {
        $payload = $reader.ReadToEnd() | ConvertFrom-Json -ErrorAction SilentlyContinue
        $apiMessage = $payload.error
      } finally {
        $reader.Dispose()
      }
    }
  }
  if ($statusCode -eq 429) {
    $retryAfter = if ($response) { [int]$response.Headers['Retry-After'] } else { 0 }
    if ($retryAfter -gt 0) {
      $waitMinutes = [Math]::Ceiling($retryAfter / 60)
      throw "Registration is rate-limited. Wait about $waitMinutes minutes before trying again."
    }
    throw 'Registration is rate-limited. Wait 15 minutes before trying again.'
  }
  if ($statusCode -and $apiMessage) {
    throw "Registration failed (HTTP $statusCode): $apiMessage"
  }
  if ($statusCode) {
    throw "Registration failed (HTTP $statusCode). The password was not displayed."
  }
  throw 'Registration failed before receiving an API response. The password was not displayed.'
} finally {
  if ($passwordPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  }
  $password = $null
  $body = $null
  $securePassword.Dispose()
}