<?php
// Middleware de autenticacao via JWT

require_once __DIR__ . '/../config/jwt.php';

function authenticate(): array {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
        http_response_code(401);
        echo json_encode(['error' => 'Token nao fornecido']);
        exit;
    }

    $payload = jwtDecode($matches[1]);
    if (!$payload) {
        http_response_code(401);
        echo json_encode(['error' => 'Token invalido ou expirado']);
        exit;
    }

    return $payload;
}

// Retorna o tenant_id baseado nos dados do usuario autenticado
// Admins podem receber tenant_id via query param para filtrar
function getTenantFilter(array $user): ?string {
    if ($user['is_admin']) {
        // Admin pode filtrar por tenant especifico ou ver todos
        return $_GET['tenant_id'] ?? null;
    }
    // Usuario normal so ve dados do seu tenant
    return $user['tenant_id'] ?? null;
}

// Retorna o tenant_id real do usuario (para gravacao, nao para filtro)
function getUserTenantId(array $user): ?string {
    return $user['tenant_id'] ?? null;
}
