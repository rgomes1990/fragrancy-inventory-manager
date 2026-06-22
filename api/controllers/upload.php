<?php
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/response.php';

// Cloudflare R2 config
define('R2_ENDPOINT', 'https://7d0035f72b9be75b7e5e5eeb7685f9dd.r2.cloudflarestorage.com');
define('R2_BUCKET', 'sistema-perfumes');
define('R2_ACCESS_KEY', 'c0e29d281c459c66d68cd4ad447669f3');
define('R2_SECRET_KEY', '91c71783f0a471679c082542aebfa704a674b72bf12f66b90b47fe7d2def40f0');
define('R2_PUBLIC_URL', 'https://pub-0abaf582267e4a77bfec5f68803cc43a.r2.dev');
define('R2_REGION', 'auto');

function handleRequest(array $user, ?string $id): void {
    if (getRequestMethod() !== 'POST') {
        errorResponse('Metodo nao permitido', 405);
    }

    if (!isset($_FILES['file'])) {
        errorResponse('Nenhum arquivo enviado', 400);
    }

    $file = $_FILES['file'];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        errorResponse('Erro no upload: ' . $file['error'], 400);
    }

    if ($file['size'] > 5 * 1024 * 1024) {
        errorResponse('Arquivo muito grande. Maximo 5MB.', 400);
    }

    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, $allowedTypes)) {
        errorResponse('Tipo de arquivo nao permitido. Use JPG, PNG, WebP ou GIF.', 400);
    }

    $ext = pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'jpg';
    $key = 'products/' . uniqid() . '_' . time() . '.' . strtolower($ext);
    $fileContent = file_get_contents($file['tmp_name']);

    // Upload para R2 via S3-compatible API (usando assinatura AWS Signature V4)
    $result = r2Upload($key, $fileContent, $mimeType);

    if (!$result) {
        errorResponse('Falha ao enviar para o storage', 500);
    }

    $url = R2_PUBLIC_URL . '/' . $key;
    jsonResponse(['url' => $url]);
}

function r2Upload(string $key, string $body, string $contentType): bool {
    $service = 's3';
    $region = R2_REGION;
    $host = parse_url(R2_ENDPOINT, PHP_URL_HOST);
    $bucket = R2_BUCKET;
    $method = 'PUT';
    $uri = '/' . $bucket . '/' . $key;

    $now = gmdate('Ymd\THis\Z');
    $date = gmdate('Ymd');
    $bodyHash = hash('sha256', $body);

    $headers = [
        'content-type' => $contentType,
        'host' => $host,
        'x-amz-content-sha256' => $bodyHash,
        'x-amz-date' => $now,
    ];

    // Canonical request
    ksort($headers);
    $signedHeaders = implode(';', array_keys($headers));
    $canonicalHeaders = '';
    foreach ($headers as $k => $v) {
        $canonicalHeaders .= $k . ':' . trim($v) . "\n";
    }

    $canonicalRequest = implode("\n", [
        $method,
        $uri,
        '', // query string
        $canonicalHeaders,
        $signedHeaders,
        $bodyHash,
    ]);

    // String to sign
    $scope = $date . '/' . $region . '/' . $service . '/aws4_request';
    $stringToSign = implode("\n", [
        'AWS4-HMAC-SHA256',
        $now,
        $scope,
        hash('sha256', $canonicalRequest),
    ]);

    // Signing key
    $kDate = hash_hmac('sha256', $date, 'AWS4' . R2_SECRET_KEY, true);
    $kRegion = hash_hmac('sha256', $region, $kDate, true);
    $kService = hash_hmac('sha256', $service, $kRegion, true);
    $kSigning = hash_hmac('sha256', 'aws4_request', $kService, true);

    $signature = hash_hmac('sha256', $stringToSign, $kSigning);

    $authHeader = 'AWS4-HMAC-SHA256 Credential=' . R2_ACCESS_KEY . '/' . $scope
        . ',SignedHeaders=' . $signedHeaders
        . ',Signature=' . $signature;

    $curlHeaders = [
        'Authorization: ' . $authHeader,
        'Content-Type: ' . $contentType,
        'x-amz-content-sha256: ' . $bodyHash,
        'x-amz-date: ' . $now,
    ];

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => R2_ENDPOINT . $uri,
        CURLOPT_CUSTOMREQUEST => 'PUT',
        CURLOPT_HTTPHEADER => $curlHeaders,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($httpCode >= 200 && $httpCode < 300) {
        return true;
    }

    error_log("R2 upload error: HTTP $httpCode - $error - $response");
    return false;
}
