!macro customInstall
  DetailPrint "Configuring Windows Firewall for TruckNav..."
  
  ; 1. Clean up any old rules
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="TruckNav App"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="TruckNav Telemetry"'
  
  ; 2. Whitelist the Main App EXE ($INSTDIR is the install folder, ${APP_EXECUTABLE_FILENAME} is your app's main exe)
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="TruckNav App" dir=in action=allow program="$INSTDIR\${APP_EXECUTABLE_FILENAME}" enable=yes profile=any'
  
  ; 3. Whitelist the Telemetry EXE
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="TruckNav Telemetry" dir=in action=allow program="$INSTDIR\resources\bin\TruckNavTelemetry.exe" enable=yes profile=any'
  
  ; 4. Whitelist the Ports (Just in case)
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="TruckNav Telemetry Ports" dir=in action=allow protocol=TCP localport=8628-8632,30001 profile=any'
  
  ; 5. Add URL ACLs so the Express Web Server can host without permission errors
  nsExec::ExecToLog 'netsh http add urlacl url=http://*:8628/ user=Everyone'
  nsExec::ExecToLog 'netsh http add urlacl url=http://*:8629/ user=Everyone'
  nsExec::ExecToLog 'netsh http add urlacl url=http://*:8630/ user=Everyone'
  nsExec::ExecToLog 'netsh http add urlacl url=http://*:8631/ user=Everyone'
  nsExec::ExecToLog 'netsh http add urlacl url=http://*:8632/ user=Everyone'
  nsExec::ExecToLog 'netsh http add urlacl url=http://*:30001/ user=Everyone'
!macroend

!macro customUnInstall
  DetailPrint "Removing TruckNav Firewall rules..."
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="TruckNav App"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="TruckNav Telemetry"'
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="TruckNav Telemetry Ports"'
  nsExec::ExecToLog 'netsh http delete urlacl url=http://*:8628/'
  nsExec::ExecToLog 'netsh http delete urlacl url=http://*:8629/'
  nsExec::ExecToLog 'netsh http delete urlacl url=http://*:8630/'
  nsExec::ExecToLog 'netsh http delete urlacl url=http://*:8631/'
  nsExec::ExecToLog 'netsh http delete urlacl url=http://*:8632/'
  nsExec::ExecToLog 'netsh http delete urlacl url=http://*:30001/'

  ; Only ask the user if this is a real uninstall (NOT an app update)
  ${ifNot} ${isUpdated}
    ; Create a popup box with Yes and No buttons. (/SD IDNO means if it's a silent uninstall, default to NO)
    MessageBox MB_YESNO "Do you also want to delete all the app data (personal settings and leftover files)?" /SD IDNO IDNO SkipAppData IDYES DeleteAppData
    
    DeleteAppData:
      DetailPrint "Deleting AppData folder..."
      ; This deletes the AppData folder securely using the correct variables
      RMDir /r "$APPDATA\${APP_FILENAME}"
      RMDir /r "$APPDATA\${PRODUCT_FILENAME}"
      Goto DoneAppData
      
    SkipAppData:
      DetailPrint "Keeping AppData folder."
      Goto DoneAppData
      
    DoneAppData:
  ${endIf}
!macroend