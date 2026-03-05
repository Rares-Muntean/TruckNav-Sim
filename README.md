# Truck Nav

**Truck Nav** is an external GPS navigation system for Euro Truck Simulator 2 and American Truck Siulator built using Typescript. It runs in the browser (perfect for a second monitor, tablet or phone) and provides real-time tracking and routing based on the in-game map.

<div align="center">
    <img width="300" alt="image" src="https://github.com/user-attachments/assets/94d10ca3-bdc7-4d58-956d-606377efe75d" />
    <img width="300" alt="image" src="https://github.com/user-attachments/assets/9b70c7ba-51fd-4bb1-afcb-4bb4a19f4020" />
    <br />
    <br />
    <a href="https://buymeacoffee.com/raresmnt">
        <img src="https://img.shields.io/badge/Support_the_Project-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black" alt="Buy Me A Coffee">
    </a>
</div>


> [!NOTE]
> **Map Support Status**
>
> Parsing and correcting map data is a manual process. Currently, the map support is as follows:
> *    **Supported:** Base ETS + ATS Game and all DLCs until 1.58 version.
> *    **Not Supported (Yet):** Map Mods (e.g. ProMods).

## Current Status: Work in Progress / Demo

Please consider this project a **Demo** or **Alpha**.

While the core navigation works, the project is far from perfect. Creating the routing graph required a massive amount of manual work in **QGIS**, fixing individual road segments, roundabouts, and intersections to ensure the GPS knows where it can and cannot go.

* **Bugs are expected:** I am human, and with a map this size, I'm 100% sure that missed connections or restricted turns.
* **Routing Quirks:** The `stepCost` (navigation weighting) is still being tweaked. You might notice the GPS taking slightly unusual routes or sometimes favoring a longer path. This can also happen because of missing connections, holes in the road network, or intersections that I missed.
* **Ongoing Fixes:** As I play the game and use the app, I log coordinates of broken road nodes and fix them in QGIS for future updates.
* **Known Quirks:** Inside company areas, it may help to move the truck slightly outside before clicking the map to route, as routing may fail otherwise.

> [!IMPORTANT]
> **Performance Warning**
>
> Please note that performance optimization is still a work in progress. Depending on your device (especially older tablets or phones), the map rendering might be slow or laggy. I am working on improving this!

# Installation via .exe File

1. Download the latest setup file from the
  [Releases](https://github.com/Rares-Muntean/ets2-navigation-gps/releases) page.

2. Run the downloaded setup file and complete the installation.

3. Launch Truck Nav on your PC.

4. Install the .apk file on your tablet or phone.

5. Open the mobile app and enter the IP address displayed in the PC application.

# Instalation via nodejs

## Prerequisites

Before installing, ensure you have the following software installed on your computer:

1.  **Node.js (LTS Version):** Required to run the application.
- Download the latest LTS version (Recommended): [https://nodejs.org/](https://nodejs.org/en/download)
2.  **Git:** Required to clone the telemetry repository automatically.
- Download Git: [https://git-scm.com/downloads](https://git-scm.com/downloads)
  
## Installation

### 1. Get the Code
You can either clone the repository using Git (recommended for easy updates) or download the ZIP file.

**Option A: Git Clone (Recommended)**
Open your terminal or command prompt and run:
```bash
git clone https://github.com/Rares-Muntean/ets2-navigation-gps.git
cd ets2-navigation-gps
```
**Option B: Download ZIP**
1. Click the Code button at the top of this page and select `Download ZIP`.
2. Extract the files to a folder on your computer.
3. Open that folder in your terminal or VS Code.

### 2. Prepare the Environment (Windows Users)
If you are on Windows, you may need to run the following commands to ensure the installation proceeds without problems.

**PowerShell Script Execution:**

If you encounter errors regarding disabled scripts in PowerShell, run one of the following commands as Administrator:
*Temporary Fix (Recommended):*
```Powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```
*Permanent Fix:*
```Powershell
Set-ExecutionPolicy RemoteSigned
```

### 3. Install Dependencies
```bash
npm install
```

## Running the App
Start the development server with the following command and wait for the Ets2 Telemetry server to clone:
```Bash
npx nuxi dev --host 0.0.0.0
```
Follow the instructions from the opened .exe to install the telemetry plugin DLLs into your game directory.

> [!NOTE]
> **Troubleshooting:**
> If somehow the installation of the telemetry server fails, you can install it manually:
> 1. Download and the server from the [Funbits Telemetry Server Repo](https://github.com/Funbit/ets2-telemetry-server).
> 2. Extract the .zip into the root folder of this project.
> 3. Rename it: `ets2-telemetry-server'.

## Accessing the App in Your Browser
To open the app in your browser, click the network link shown in the terminal (the local link may have telemetry fetching issues):
```Bash
➜ Network: http://192.168.1.x:3000/
```

##  How it Works

1. **Telemetry:** The app uses a telemetry server to pull data (coordinates, speed, heading) directly from the running game.
2.  **Mapping:** The in-game coordinates are converted to a standard **WGS84** projection to allow them to work with web mapping libraries.
3.  **Routing:** A custom graph built from game files allows the app to calculate the shortest path to your destination.

<div align="center">
  <img width="895" height="649" alt="close-up-gps" src="https://github.com/user-attachments/assets/ab0e0baf-bb6e-49d2-b5f0-123277d278dc" />
</div>

## How You Can Help Improve the Map

If you test the application and encounter broken intersections, missing road connections, roundabout issues, or strange routing behavior, you can help improve the navigation by reporting what you find.

### What to Report
- A brief description of the issue  
- The exact coordinates of the location (if using the app in the browser)  
- A screenshot from the app

### How to Collect Coordinates
1. Click or tap the spot on the map where the issue occurs  
2. Check the console — it prints the clicked coordinates  
3. Copy the coordinate pair and include it in your report

### Where to Send Reports
Send your findings to:

* raresmnt@yahoo.com
* OR
* byatisglaaki@gmail.com

Your reports help refine the routing graph and improve navigation accuracy.

**Note:**  
Reported issues will be addressed as time permits.

## Credits & Acknowledgements

This project stands on the shoulders of giants. A massive thank you to the following developers who made this possible:

### [@truckermudgeon](https://github.com/truckermudgeon)
Special thanks for the **['maps'](https://github.com/truckermudgeon/maps)** repository.
*   This provided the essential starting point for map parsing.
*   The logic for converting internal game coordinates to a usable format (WGS84) was invaluable for getting the map rendered correctly.

### [@Funbit](https://github.com/Funbit)
Thanks for the **['ets2-telemetry-server'](https://github.com/Funbit/ets2-telemetry-server)**.
*   This tool is the bridge that allows the browser to communicate with the game engine. Without this, we wouldn't have live truck data.

---

*Drive safe, and happy trucking!* 
