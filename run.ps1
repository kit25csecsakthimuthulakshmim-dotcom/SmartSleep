# SmartSleep - Java Server Launcher
$ErrorActionPreference = "Stop"

Write-Host "===================================================================" -ForegroundColor Cyan
Write-Host "   Starting SmartSleep Web Platform (Java 21)                    " -ForegroundColor Cyan
Write-Host "===================================================================" -ForegroundColor Cyan

$javaBin = "C:\Users\sakthi\.p2\pool\plugins\org.eclipse.justj.openjdk.hotspot.jre.full.win32.x86_64_21.0.9.v20251105-0741\jre\bin"
if (Test-Path "$javaBin\java.exe") {
    $env:Path = "$javaBin;$env:Path"
}

Write-Host "[1/2] Compiling smartsleep.java..." -ForegroundColor Yellow
javac smartsleep.java

Write-Host "[2/2] Launching Java HTTP Server on http://localhost:8080..." -ForegroundColor Green
java smartsleep
