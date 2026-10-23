# 🌙 SmartSleep - Intelligent Sleep Optimization Platform

An AI-powered sleep wellness and circadian health web application powered by a high-performance **Java 21 embedded HTTP server** with zero external dependencies.

---

## 🚀 Quick Start

### Option 1: One-Click Launch (Windows)
Double-click either:
- **`run.bat`** (Batch script)
- **`run.ps1`** (PowerShell script)

The script compiles and starts the Java server and opens your browser to:
👉 **[http://localhost:8080](http://localhost:8080)**

---

### Option 2: Command Line (Java 21)
Open PowerShell or Command Prompt in this folder:

```powershell
# Compile the server
javac smartsleep.java

# Run the server (default port 8080)
java smartsleep
```

Or pass a custom port:
```powershell
java smartsleep 8085
```

---

## 🌟 Key Features

### 1. 📊 Recovery Dashboard & Hypnogram
- **Real-Time Sleep Score**: Animated radial gauge (e.g. 88/100 Optimal).
- **Interactive Hypnogram**: Custom HTML5 Canvas rendering of 4 sleep stages (*Deep Sleep, REM, Light Sleep, Awake*) with hover tooltips and time mapping.
- **Biometrics HUD**: Resting Heart Rate (54 bpm), Heart Rate Variability (68 ms), Respiratory Rate (13.8 rpm), Blood Oxygen SpO2 (98.4%), Skin Temperature, and Ambient Noise (dB).
- **7-Day Trajectory Chart**: Weekly sleep score trends with target threshold baseline.

### 2. 🧬 90-Minute Ultradian Sleep Cycle Calculator
- Eliminates *sleep inertia* (morning grogginess) by timing wake windows at the natural end of 90-minute sleep cycles.
- Calculates ideal bedtimes from target wake time (or ideal wake times from current bedtime).
- Accounts for standard 14-minute average sleep latency.
- Highlights **Recommended (7.5 hrs)** and **Ultra-Restorative (9.0 hrs)** cycles.

### 3. 🎧 Neuro-Acoustic Soundscapes (Web Audio API)
- Real-time synthesized ambient audio generated entirely in-browser with zero streaming lag:
  - **4 Hz Delta Binaural Beats**: Dual stereophonic oscillators tuned for cortical synchronization and slow-wave sleep.
  - **Deep Pink Noise**: Algorithmic 1/f slope noise for brainwave stabilization.
  - **Gentle Midnight Rain**: Filtered stochastic hydro-acoustic raindrops.
  - **Tidal Ocean Waves**: Low-frequency oscillating swells (8-second breathing rhythm).
- Master volume control, animated visualizer, and customizable sleep timer (15, 30, 45, 60, 90 mins).

### 4. 🎛️ Bedroom IoT Hub Simulation
- Interactive thermostat slider (15°C - 24°C) with real-time Celsius/Fahrenheit conversion.
- Circadian Lighting Spectrum: Daylight (5000K), Sunset Amber (1800K), Deep Red (650nm zero-melatonin light), and Blackout (0 Lux).
- Live Bedroom SVG Visualizer reflecting current lighting and climate settings.
- Smart Circadian Wake Window toggle.

### 5. ☀️ 24-Hour Circadian Biological Clock
- Interactive circular 24-hour clock wheel showing daily chronobiology milestones:
  - Morning Sunlight Synchronization (07:15 AM)
  - Peak Cognitive Window (10:00 AM)
  - Caffeine Elimination Cutoff (01:30 PM)
  - Evening Wind-Down & Dimming (09:30 PM)
  - Endogenous Melatonin Surge (10:15 PM)
  - Primary Sleep Gate (11:00 PM)

### 6. 📖 Sleep Journal & History
- Log custom sleep sessions with duration, subjective score, feeling, and evening notes.
- Data is transmitted to the Java backend REST API and stored in state.

---

## 🛠️ Technology Stack & Architecture

- **Backend**: Pure Java 21 LTS (`com.sun.net.httpserver.HttpServer`)
  - Multi-threaded request execution with Virtual Threads.
  - Embedded RESTful API endpoints (`/api/status`, `/api/sleep-data`, `/api/trends`, `/api/calculator`, `/api/environment`, `/api/log-sleep`, `/api/insights`).
  - MIME-type static asset delivery (`index.html`, `style.css`, `app.js`).
- **Frontend**:
  - Semantic HTML5 with accessibility attributes and SEO tags.
  - Vanilla CSS3 Design System with modern **Midnight Glassmorphism** aesthetic, glowing auroras, and curated Google Fonts (`Outfit`, `Inter`, `JetBrains Mono`).
  - Vanilla JavaScript ES6+ with HTML5 Canvas charts and Web Audio API synthesizer.
