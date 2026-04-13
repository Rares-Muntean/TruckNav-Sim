# Truck Nav

**Truck Nav** is an external GPS navigation system for Euro Truck Simulator 2 and American Truck Siulator built using Typescript. It runs as an APK, EXE or browser (perfect for a phone, tablet or second monitor) and provides real-time tracking and routing based on the in-game map.

<div align="center">
    <a href="https://discord.gg/C5BTXCF2jC">
        <img src="https://img.shields.io/badge/Discord-Join_Community-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord">
    </a>
    <a href="https://forum.scssoft.com/viewtopic.php?t=349145">
        <img src="https://img.shields.io/badge/SCS_Forums-Official_Topic-2C3E50?style=for-the-badge&logo=discourse&logoColor=white" alt="SCS Forums">
    </a>
    <a href="https://buymeacoffee.com/raresmnt">
        <img src="https://img.shields.io/badge/Support_the_Project-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black" alt="Buy Me A Coffee">
    </a>
    <br />
    <br />
    <img width="300" alt="image" src="https://github.com/user-attachments/assets/6860e478-3c32-4143-97c4-fca8876ce90f" />
    <img width="300" alt="image" src="https://github.com/user-attachments/assets/a977ea5f-af6f-49e2-adc4-78c8afef9879" />
</div>

# Current Status: Work in Progress / Demo

Please consider this project a **Demo** or **Alpha**.

While the core navigation works, the project is far from perfect. Creating the routing graph required a massive amount of work in **QGIS** and scripting, fixing road segments, roundabouts, and intersections to ensure the GPS knows where it can and cannot go.

- **ATS / ETS2 Version**: Up to **1.58** ✅
- **Supported DLCs**: All ✅
- **Map Mods**: None ❌

# Known Issues & Limitations
### ⚠️ Common Quirks
*   **Company Areas:** GPS routing might fail if you are deep inside a company yard. Try moving your truck slightly toward the exit before setting the destination if errors are happening.
*   **Map Gaps:** The graph I currently use can produce some errors (disconnected roads, illegal U-turns) but should 99% of the time show the correct route.

### 📈 Performance & Compatibility
> [!NOTE]
>*  **Performance:** Optimization is ongoing. On older tablets or phones, the map rendering may feel laggy. 
>*  **Map Support:** Currently supports base _**ETS2/ATS + all DLCs** (**up to v1.58**)_. ProMods and other map mods are **NOT** yet supported.

> [!CAUTION]
> **Real Company Name Mods:** If you use other mods that change company names other than the mod from **MLH82**, the navigation will likely fail or route incorrectly. The app is optimized for only vanilla and _**Real companies, gas station & billboards for ATS and ETS2**_ by **MLH82**.
# Installation via .exe File

1. Download the latest setup file from the
  [Releases](https://github.com/Rares-Muntean/ets2-navigation-gps/releases) page.

2. Run the downloaded setup file and complete the installation.

3. Launch Truck Nav on your PC.

4. Install the .apk file on your tablet or phone.

5. Open the **mobile app** or the **web browser on any device** and enter the IP address displayed in the PC application.

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
git clone https://github.com/Rares-Muntean/TruckNav-Sim.git
cd TruckNav-Sim
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

## Accessing the App in Your Browser
To open the app in your browser, click the network link shown in the terminal (the local link may have telemetry fetching issues):
```Bash
➜ Network: http://192.168.1.x:3000/
```

#  How it Works

1. **Telemetry:** The app uses a telemetry server to pull data (coordinates, speed, heading) directly from the running game.
2.  **Mapping:** The in-game coordinates are converted to a standard **WGS84** projection to allow them to work with web mapping libraries (visual issues might still appear).
3.  **Routing:** A custom graph built from game files allows the app to calculate the shortest path to your destination.

<div align="center">
    <img width="895" height="649" alt="close-up-gps" src="https://github.com/user-attachments/assets/4c593709-6f91-4109-9685-bc292ead920e" />
</div>

# How You Can Help Improve the Map

If you test the application and encounter strange behavior, you can help improve the navigation by reporting what you find.

### What to Report
- A brief description of the issue  
- A screenshot from the app

### Where to Send Reports
Send your findings to **ONE** of the options below:

* raresmnt@yahoo.com
* Discord Server -> #🪲-bugs
* GitHub -> Issues

Your reports help refine the application and improve navigation accuracy.

**Note:**  
Reported issues will be addressed as time permits.

# Credits & Acknowledgements

### [@truckermudgeon](https://github.com/truckermudgeon)
Special thanks for the **['maps'](https://github.com/truckermudgeon/maps)** repository.
*   This provided the essential starting point for map parsing and was the **catalyst that turned the idea into a reality**.
*   The logic for converting internal game coordinates to a usable format (WGS84) was invaluable for getting the map rendered correctly.

### [@RenCloud](https://github.com/RenCloud)
Thanks for the **[scs-sdk-plugin](https://github.com/RenCloud/scs-sdk-plugin)**.
*   This tool is the bridge that allows the browser to communicate with the game engine. It's core functionality is refined and implemented seamlessly inside TruckNav.

---

*Drive safe, and happy trucking!* 
