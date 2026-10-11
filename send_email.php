<?php
/**
 * Script PHP de Envío de Códigos QR por Correo SMTP (Hostinger)
 * =============================================================
 * Este script procesa las solicitudes de index.html / app.js y envía
 * los códigos QR por correo electrónico con la plantilla oficial y la
 * imagen QR incrustada vía CID inline de forma nativa.
 */

// Encabezados CORS y tipo de contenido JSON
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=utf-8");

// Manejo de preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Cargar configuración de smtp_config.json si existe
$config_file = __DIR__ . '/config/smtp_config.json';
$config = [
    'smtp_server' => 'smtp.hostinger.com',
    'smtp_port' => 465,
    'use_ssl' => true,
    #'smtp_user' => 'no-reply@gilou.com.mx',
    #'smtp_password' => 'wZHw7yf!>?iTiF',
    'sender_name' => 'Sistema de Acceso / Comedor',
    'sender_email' => 'no-reply@gilou.com.mx',
    'subject' => 'Tu Código QR de Acceso - {nombre}',
    //'bcc_emails' => 'contacto@solucionesryj.com.mx, comprasgilou@gmail.com, atencionitsolucionesryj.com.mx',
    'qr_dir' => 'qr'
];

if (file_exists($config_file)) {
    $loaded = json_decode(file_get_contents($config_file), true);
    if (is_array($loaded)) {
        $config = array_merge($config, $loaded);
    }
}

// Plantilla oficial idéntica a send_qr_emails.py
$default_body_html = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; }
    .card { max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); border-top: 5px solid #4f46e5; }
    h2 { color: #1e293b; margin-top: 0; font-size: 22px; }
    p { color: #475569; font-size: 15px; line-height: 1.6; }
    .badge { display: inline-block; background: #e0e7ff; color: #4338ca; font-weight: bold; padding: 6px 12px; border-radius: 6px; font-size: 14px; margin-bottom: 15px; }
    .qr-box { text-align: center; margin: 25px 0; background: #f8fafc; padding: 20px; border-radius: 10px; border: 1px dashed #cbd5e1; }
    .qr-box img { max-width: 220px; height: auto; display: block; margin: 0 auto; }
    .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>¡Hola, Colaborador {nombre}!</h2>    
    <p>Te compartimos tu código QR personal e intransferible para el uso del servicio de comedor del corporativo de Montes Urales.</p> 
    <p>Te recomendamos guardarlo y presentarlo cada vez que hagas uso del servicio.</p>
    <p>Nos da mucho gusto recibirte y ofrecerte alimentos de calidad y una excelente atención.</p>
    
    <p>
        <a href="https://comedor.gilou.com.mx/public/reservar" target="_blank" >
            <span>Hacer Reserva</span>
        </a>
    </p>

    <div class="badge">Empleado No. {num_empleado}</div>        
    <div class="qr-box">      
        <img src="cid:qr_image" alt="Código QR">      
        <p style="font-size: 13px; color: #64748b; margin-top: 10px;">Escanea este código en las terminales de lectura.</p>    
    </div>        
    <p>Por favor conserva este mensaje o guarda la imagen adjunta en tu dispositivo móvil.</p>    
    <div class="footer">Este es un correo automático, por favor no respondas a este mensaje.</div>  
  </div>
</body>
</html>';

$body_template = !empty($config['body_html']) ? $config['body_html'] : $default_body_html;

// Solicitud GET: Diagnóstico y plantilla
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = isset($_GET['action']) ? $_GET['action'] : 'status';

    if ($action === 'template') {
        echo json_encode([
            'subject' => $config['subject'],
            'sender_name' => $config['sender_name'],
            'sender_email' => $config['sender_email'] ?: $config['smtp_user'],
            'body_html' => $body_template
        ]);
        exit;
    }

    if ($action === 'logs') {
        $error_log_file = __DIR__ . '/email_errors.log';
        $general_log_file = __DIR__ . '/send_qr_emails.log';

        $errors_content = file_exists($error_log_file) ? file_get_contents($error_log_file) : 'No hay errores registrados.';
        $general_content = file_exists($general_log_file) ? file_get_contents($general_log_file) : 'No hay actividad registrada.';

        $last_lines = function ($txt, $max = 100) {
            $lines = explode("\n", trim($txt));
            if (count($lines) > $max) {
                $lines = array_slice($lines, -$max);
            }
            return implode("\n", $lines);
        };

        echo json_encode([
            'success' => true,
            'timestamp' => date('Y-m-d H:i:s'),
            'error_logs' => $last_lines($errors_content, 150),
            'general_logs' => $last_lines($general_content, 100)
        ]);
        exit;
    }

    if ($action === 'clear_logs') {
        @file_put_contents(__DIR__ . '/email_errors.log', "");
        echo json_encode(['success' => true, 'message' => 'Logs de error vaciados correctamente.']);
        exit;
    }

    echo json_encode([
        'status' => 'ready',
        'php_version' => PHP_VERSION,
        'smtp_server' => $config['smtp_server'],
        'smtp_port' => $config['smtp_port'],
        'smtp_user' => $config['smtp_user'],
        'sender_name' => $config['sender_name'],
        'subject' => $config['subject'],
        'send_delay_seconds' => 15
    ]);
    exit;
}

// Solicitud POST: Envío de correo
$raw_input = file_get_contents('php://input');
$payload = json_decode($raw_input, true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Datos JSON inválidos.']);
    exit;
}

$recipient_email = trim($payload['correo'] ?? $payload['email'] ?? '');
$recipient_name = trim($payload['nombre'] ?? $payload['name'] ?? '');
$emp_id = trim($payload['num_empleado'] ?? $payload['emp_id'] ?? $payload['id'] ?? '0000');
$qr_data_url = $payload['qr_data_url'] ?? $payload['qr_base64'] ?? '';
$filename = $payload['filename'] ?? ($emp_id . '.png');

if (empty($recipient_email) || !filter_var($recipient_email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Correo electrónico no válido o vacío.']);
    exit;
}

if (empty($recipient_name)) {
    $recipient_name = "Empleado #$emp_id";
}

// Decodificar imagen QR desde base64
$qr_binary = null;
if (!empty($qr_data_url)) {
    if (strpos($qr_data_url, ',') !== false) {
        $parts = explode(',', $qr_data_url, 2);
        $qr_binary = base64_decode($parts[1]);
    } else {
        $qr_binary = base64_decode($qr_data_url);
    }
}

// Guardar archivo QR en la carpeta qr/ del servidor si está disponible
$qr_dir = __DIR__ . '/' . ($config['qr_dir'] ?? 'qr');
if (!is_dir($qr_dir)) {
    @mkdir($qr_dir, 0755, true);
}
$saved_file = $qr_dir . '/' . $filename;
if ($qr_binary) {
    @file_put_contents($saved_file, $qr_binary);
} elseif (file_exists($saved_file)) {
    $qr_binary = file_get_contents($saved_file);
}

// Preparar variables de reemplazo en asunto y cuerpo
$subject = str_replace(
    ['{nombre}', '{num_empleado}', '{correo}'],
    [$recipient_name, $emp_id, $recipient_email],
    $config['subject']
);

$html_body = str_replace(
    ['{nombre}', '{num_empleado}', '{correo}'],
    [$recipient_name, $emp_id, $recipient_email],
    $body_template
);

// Enviar correo mediante socket SMTP autenticado
$result = send_via_hostinger_smtp(
    $config['smtp_server'],
    $config['smtp_port'],
    $config['smtp_user'],
    $config['smtp_password'],
    $config['sender_name'],
    $config['sender_email'] ?: $config['smtp_user'],
    $recipient_email,
    $recipient_name,
    $subject,
    $html_body,
    $config['bcc_emails'] ?? '',
    $qr_binary,
    $filename
);

// Registrar log
$log_file = __DIR__ . '/send_qr_emails.log';
$timestamp = date('Y-m-d H:i:s');

if ($result['success']) {
    $log_line = "[$timestamp] [PHP-WEB] [✓ ENVÍO OK] Correo enviado a $recipient_name <$recipient_email> (Empleado #$emp_id)\n";
    @file_put_contents($log_file, $log_line, FILE_APPEND);

    echo json_encode([
        'success' => true,
        'message' => "Correo enviado exitosamente a $recipient_name ($recipient_email)",
        'recipient_email' => $recipient_email,
        'emp_id' => $emp_id
    ]);
} else {
    // 1. Log en send_qr_emails.log
    $log_line = "[$timestamp] [PHP-WEB] [✗ ERROR] Falló envío a $recipient_name <$recipient_email>: " . $result['error'] . "\n";
    @file_put_contents($log_file, $log_line, FILE_APPEND);

    // 2. Diagnóstico guiado según el tipo de fallo SMTP
    $err_str = strtolower($result['error']);
    $suggestion = "Verifica la conexión y configuración en smtp_config.json.";

    if (strpos($err_str, '535') !== false || strpos($err_str, 'auth') !== false || strpos($err_str, 'credential') !== false) {
        $suggestion = "Error de Autenticación SMTP (535): La contraseña o el usuario '{$config['smtp_user']}' son incorrectos. Verifica o regenera la contraseña en el panel de Hostinger.";
    } elseif (strpos($err_str, 'no se pudo conectar') !== false || strpos($err_str, 'timed out') !== false || strpos($err_str, 'refused') !== false) {
        $suggestion = "Fallo de Conexión de Red: No se pudo conectar a {$config['smtp_server']}:{$config['smtp_port']}. Asegúrate de que el firewall del servidor permita salidas al puerto {$config['smtp_port']}.";
    } elseif (strpos($err_str, '550') !== false || strpos($err_str, 'relay') !== false) {
        $suggestion = "Error de Retransmisión (550 Relay Denied): El remitente debe ser idéntico al usuario autenticado ({$config['smtp_user']}).";
    } elseif (strpos($err_str, 'mailbox') !== false || strpos($err_str, 'user not found') !== false) {
        $suggestion = "Buzón no encontrado: La dirección de correo '$recipient_email' fue rechazada por el servidor destino.";
    }

    // 3. Log detallado y persistente en email_errors.log
    $error_log_file = __DIR__ . '/email_errors.log';
    $error_block = "================================================================================\n"
        . "FECHA/HORA: $timestamp\n"
        . "COLABORADOR: $recipient_name (Empleado #$emp_id)\n"
        . "CORREO DESTINO: $recipient_email\n"
        . "SERVIDOR SMTP: {$config['smtp_server']}:{$config['smtp_port']} (Usuario: {$config['smtp_user']})\n"
        . "ERROR REPORTADO: {$result['error']}\n"
        . "DIAGNÓSTICO: $suggestion\n"
        . "================================================================================\n\n";
    @file_put_contents($error_log_file, $error_block, FILE_APPEND);

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $result['error'],
        'suggestion' => $suggestion,
        'recipient' => [
            'name' => $recipient_name,
            'email' => $recipient_email,
            'emp_id' => $emp_id
        ],
        'server' => "{$config['smtp_server']}:{$config['smtp_port']}",
        'timestamp' => $timestamp
    ]);
}


/**
 * Función para comunicarse directamente con el servidor SMTP de Hostinger usando SSL Socket
 */
function send_via_hostinger_smtp($host, $port, $user, $pass, $from_name, $from_email, $to_email, $to_name, $subject, $html_body, $bcc_string, $qr_binary, $qr_filename)
{
    $timeout = 25;
    $context = stream_context_create([
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true
        ]
    ]);

    $socket = @stream_socket_client("ssl://{$host}:{$port}", $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $context);
    if (!$socket) {
        return ['success' => false, 'error' => "No se pudo conectar a {$host}:{$port} ($errno: $errstr)"];
    }

    $read = function () use ($socket) {
        $data = '';
        while (!feof($socket)) {
            $line = fgets($socket, 512);
            $data .= $line;
            if (isset($line[3]) && $line[3] === ' ')
                break;
        }
        return $data;
    };

    $send = function ($cmd) use ($socket) {
        fputs($socket, $cmd . "\r\n");
    };

    $expect = function ($code) use ($read) {
        $resp = $read();
        $code_str = (string) $code;
        if (substr($resp, 0, strlen($code_str)) !== $code_str) {
            throw new Exception("Respuesta SMTP inesperada: " . trim($resp));
        }
        return $resp;
    };

    try {
        $expect(220); // Bienvenida SMTP

        $send("EHLO " . gethostname());
        $expect(250);

        $send("AUTH LOGIN");
        $expect(334);

        $send(base64_encode($user));
        $expect(334);

        $send(base64_encode($pass));
        $expect(235); // Autenticación exitosa

        $send("MAIL FROM:<{$from_email}>");
        $expect(250);

        $send("RCPT TO:<{$to_email}>");
        $expect(250);

        // Destinatarios en copia oculta (BCC)
        if (!empty($bcc_string)) {
            $bcc_list = explode(',', $bcc_string);
            foreach ($bcc_list as $bcc) {
                $clean_bcc = trim($bcc);
                if (!empty($clean_bcc)) {
                    $send("RCPT TO:<{$clean_bcc}>");
                    $expect(250);
                }
            }
        }

        $send("DATA");
        $expect(354);

        // Construcción de mensaje MIME multipart/related para permitir <qr_image> inline (CID)
        $boundary_related = "related_" . md5(uniqid(time()));
        $boundary_alt = "alt_" . md5(uniqid(time()));

        $headers = [];
        $headers[] = "From: =?UTF-8?B?" . base64_encode($from_name) . "?= <{$from_email}>";
        $headers[] = "To: =?UTF-8?B?" . base64_encode($to_name) . "?= <{$to_email}>";
        if (!empty($bcc_string)) {
            $headers[] = "Bcc: {$bcc_string}";
        }
        $headers[] = "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=";
        $headers[] = "MIME-Version: 1.0";
        $headers[] = "Content-Type: multipart/related; boundary=\"{$boundary_related}\"";
        $headers[] = "Date: " . date('r');

        $body = [];
        $body[] = "--{$boundary_related}";
        $body[] = "Content-Type: multipart/alternative; boundary=\"{$boundary_alt}\"";
        $body[] = "";

        // Versión Texto Plano
        $plain_text = "Hola {$to_name},\n\nAdjunto encontrarás tu código QR de acceso.\n";
        $body[] = "--{$boundary_alt}";
        $body[] = "Content-Type: text/plain; charset=utf-8";
        $body[] = "Content-Transfer-Encoding: base64";
        $body[] = "";
        $body[] = chunk_split(base64_encode($plain_text));

        // Versión HTML
        $body[] = "--{$boundary_alt}";
        $body[] = "Content-Type: text/html; charset=utf-8";
        $body[] = "Content-Transfer-Encoding: base64";
        $body[] = "";
        $body[] = chunk_split(base64_encode($html_body));
        $body[] = "--{$boundary_alt}--";

        // Adjuntar imagen QR inline con Content-ID: <qr_image>
        if ($qr_binary) {
            $body[] = "";
            $body[] = "--{$boundary_related}";
            $body[] = "Content-Type: image/png; name=\"{$qr_filename}\"";
            $body[] = "Content-Transfer-Encoding: base64";
            $body[] = "Content-ID: <qr_image>";
            $body[] = "Content-Disposition: inline; filename=\"{$qr_filename}\"";
            $body[] = "";
            $body[] = chunk_split(base64_encode($qr_binary));
        }

        $body[] = "--{$boundary_related}--";

        $message_content = implode("\r\n", $headers) . "\r\n\r\n" . implode("\r\n", $body) . "\r\n.";

        $send($message_content);
        $expect(250);

        $send("QUIT");
        fclose($socket);

        return ['success' => true];
    } catch (Exception $e) {
        @fclose($socket);
        return ['success' => false, 'error' => $e->getMessage()];
    }
}
