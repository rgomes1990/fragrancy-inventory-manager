<?php
// Configuracao CORS para permitir requisicoes do frontend

function handleCors(): void {
    // Altere para o dominio do seu frontend em producao
    $allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://perfumes.rsgtecnologia.com',
        'http://perfumes.rsgtecnologia.com',
        'https://perfumes1.rsgtecnologia.com',
        'http://perfumes1.rsgtecnologia.com',
    ];

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

    if (in_array($origin, $allowedOrigins)) {
        header("Access-Control-Allow-Origin: $origin");
    }

    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Max-Age: 86400');
    header('Content-Type: application/json; charset=utf-8');

    // Preflight request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
