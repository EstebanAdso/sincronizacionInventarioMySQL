# Iniciar el servicio de MySQL
Write-Host "Iniciando MySQL..."
Start-Service -Name "MySQL" -ErrorAction SilentlyContinue

# Cambiar al directorio donde se encuentra el archivo app.js
Write-Host "Ejecutando la aplicaci�n Node.js..."
Set-Location -Path "D:\WordSpace\CompuServicesSoft\SincronizacionInventario"

# Ejecutar la aplicaci�n Node.js
node app.js
