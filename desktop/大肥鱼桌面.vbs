' Double-click to put the whale on the desktop without a terminal window.
' Quit her from the tray icon. (ASCII-only below: the path comes from where this file is.)
Set fso = CreateObject("Scripting.FileSystemObject")
here = fso.GetParentFolderName(WScript.ScriptFullName)
root = fso.GetParentFolderName(here)
electron = root & "\node_modules\electron\dist\electron.exe"
If Not fso.FileExists(electron) Then
  MsgBox "Electron is missing. In the plugin folder run: node node_modules\electron\install.js", 48, "dsh-whale-pet"
  WScript.Quit 1
End If
Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = root
shell.Run """" & electron & """ """ & here & "\main.cjs""", 1, False
