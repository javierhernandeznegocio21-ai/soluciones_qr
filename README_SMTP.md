# Sistema de Generación de Códigos QR y Envío Masivo por Correo (SMTP)

Sistema completo en **HTML5, CSS3, JavaScript y PHP** para generar códigos QR a partir de archivos CSV y enviarlos automáticamente por correo electrónico vía SMTP (compatible con Hostinger, cPanel, Gmail, Outlook y cualquier servidor SMTP estándar).

---

## 📁 Estructura del Proyecto

```text
/qr
  ├── index.html                     # Interfaz web principal (Generador, Vista Previa y Envío)
  ├── app.js                         # Lógica de carga CSV, generación QR y envío
  ├── styles.css                     # Estilos visuales modernos y responsivos
  ├── send_email.php                 # Backend SMTP directo en PHP (sin dependencias externas)
  ├── config/
  │   ├── smtp_config.json           # Configuración SMTP real (ignorado por Git)
  │   └── smtp_config.json.example   # Plantilla de ejemplo sin datos sensibles
  ├── email_errors.log               # Registro automático de errores de envío SMTP (ignorado por Git)
  └── qr/                            # Carpeta donde se guardan las imágenes QR generadas
```

> 🌟 **Seguridad y Despliegue:**
> Las credenciales sensibles (`smtp_user` y `smtp_password`) se configuran únicamente en `config/smtp_config.json`, archivo que está protegido mediante `.gitignore` para no versionarse jamás en tu repositorio.

---

## ⚙️ 1. Configurar el Correo SMTP

Crea o edita el archivo **`config/smtp_config.json`** (puedes basarte en `config/smtp_config.json.example`):

```json
{
  "smtp_server": "smtp.hostinger.com",
  "smtp_port": 465,
  "use_tls": false,
  "use_ssl": true,
  "smtp_user": "notificaciones@tudominio.com",
  "smtp_password": "tu_password_aqui",
  "sender_name": "Sistema de Acceso / Comedor",
  "subject": "Tu Código QR de Acceso - {nombre}"
}
```

---

## 📄 2. Formato del Archivo CSV

El archivo CSV debe tener únicamente 3 columnas requeridas:

```csv
num_empleado,nombre,correo
1001,Juan Pérez,juan.perez@empresa.com
1002,María Gómez,maria.gomez@empresa.com
1003,Carlos Rodríguez,carlos.rodriguez@empresa.com
```

*Separador aceptado:* coma (`,`) o punto y coma (`;`).

---

## 🌐 3. Funcionamiento de la Interfaz Web

1. **Carga y Validación de CSV:**
   - Arrastra o selecciona tu archivo `.csv`.
   - Se validan las filas, formatos de correo y columnas.

2. **Generación y Envío:**
   - Puedes activar el interruptor de envío automático o revisar las tarjetas en la galería.
   - En la galería de resultados puedes enviar individualmente o por lote a todos los colaboradores.

3. **Monitoreo y Diagnóstico de Errores:**
   - Botón **"Registro de Envíos"** en la barra superior con contador en vivo de errores.
   - En caso de fallo, la interfaz muestra la causa exacta (autenticación, timeout, rechazo de destinatario) junto con recomendaciones de solución.
   - Pestaña de **"Logs del Servidor"** para inspeccionar `email_errors.log` en tiempo real.
