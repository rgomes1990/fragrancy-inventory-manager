<?php
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/response.php';

function handleRequest(array $user, ?string $id): void {
    if (getRequestMethod() !== 'GET') {
        errorResponse('Metodo nao permitido', 405);
    }

    $url = $_GET['url'] ?? '';
    if (!$url) {
        errorResponse('URL nao informada', 400);
    }

    // Permitir apenas URLs do R2 ou Supabase (seguranca)
    $allowed = [
        'https://pub-0abaf582267e4a77bfec5f68803cc43a.r2.dev/',
        'https://7d0035f72b9be75b7e5e5eeb7685f9dd.r2.cloudflarestorage.com/',
    ];

    $valid = false;
    foreach ($allowed as $prefix) {
        if (str_starts_with($url, $prefix)) {
            $valid = true;
            break;
        }
    }

    if (!$valid) {
        errorResponse('URL nao permitida', 403);
    }

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3,
    ]);

    $body = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);

    if ($httpCode !== 200 || !$body) {
        errorResponse('Falha ao carregar imagem', 502);
    }

    header('Content-Type: ' . $contentType);
    header('Cache-Control: public, max-age=86400');
    echo $body;
    exit;
}
