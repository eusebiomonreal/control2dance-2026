# Plugin de Exportación EDD para WordPress

## 📦 Instalación

1. **Descarga el archivo `edd-data-exporter.php`**
2. **Sube a WordPress:**
   - Ve a `Plugins` → `Añadir nuevo` → `Subir plugin`
   - Selecciona el archivo `edd-data-exporter.php`
   - Haz clic en "Instalar ahora"
3. **Activa el plugin**

## 🚀 Uso

1. En el menú lateral de WordPress verás un nuevo item: **"EDD Export"**
2. Haz clic en él
3. Verás un resumen de cuántos datos tienes:
   - 📀 Productos
   - 🛒 Pedidos
   - 👥 Clientes
   - ⬇️ Descargas registradas

4. Selecciona qué datos quieres exportar (por defecto todos marcados)
5. Haz clic en **"🚀 Exportar Datos a JSON"**
6. Se descargará un archivo JSON con todos los datos

## 📄 Archivo Generado

El archivo se llamará algo como: `edd-export-2026-01-28-235500.json`

Contendrá toda la información estructurada:
```json
{
  "exported_at": "2026-01-28 23:55:00",
  "site_url": "https://control2dance.es",
  "edd_version": "3.x.x",
  "products": [...],
  "orders": [...],
  "customers": [...],
  "download_logs": [...]
}
```

## ⚠️ Importante

- **El archivo puede ser grande** (varios MB) si tienes muchos datos
- **Contiene información sensible** (emails de clientes, IPs, etc.)
- **Guárdalo en un lugar seguro**
- **Elimínalo después de la migración**
- El proceso puede tardar 1-5 minutos dependiendo del volumen de datos

## 🔄 Siguiente Paso

Una vez tengas el archivo JSON:
1. Envíamelo o súbelo a un lugar seguro
2. Yo crearé el script de importación a Supabase
3. Ejecutaremos la migración

## 🛠️ Solución de Problemas

**Si el plugin no aparece:**
- Verifica que Easy Digital Downloads esté activo
- Asegúrate de tener permisos de administrador

**Si la exportación falla:**
- Puede ser por límites de memoria PHP
- Intenta exportar solo productos primero
- Luego exporta pedidos por separado

**Si el archivo es muy grande:**
- Desmarca "Historial de Descargas" (no es crítico para la migración)
