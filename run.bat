@echo off
title SmartSleep - Java Web Server
color 0b

echo ===================================================================
echo   Starting SmartSleep Web Platform (Java 21)
echo ===================================================================

:: Ensure Java 21 from Eclipse Temurin is on PATH if needed
set "JAVA_BIN=C:\Users\sakthi\.p2\pool\plugins\org.eclipse.justj.openjdk.hotspot.jre.full.win32.x86_64_21.0.9.v20251105-0741\jre\bin"
if exist "%JAVA_BIN%\java.exe" (
    set "PATH=%JAVA_BIN%;%PATH%"
)

echo [1/2] Compiling smartsleep.java...
javac smartsleep.java
if errorlevel 1 (
    echo [ERROR] Failed to compile smartsleep.java
    pause
    exit /b 1
)

echo [2/2] Starting Java HTTP Server and opening browser...
echo Website URL: http://localhost:8080
java smartsleep

pause
