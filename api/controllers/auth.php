<?php
// Controller de autenticacao

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/jwt.php';
require_once __DIR__ . '/../helpers/response.php';

function handleLogin(): void {
    if (getRequestMethod() !== 'POST') {
        errorResponse('Metodo nao permitido', 405);
    }

    $input = getJsonInput();
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';

    if (!$username || !$password) {
        errorResponse('Username e password sao obrigatorios');
    }

    $db = getDB();

    // Buscar usuario
    $stmt = $db->prepare("SELECT id, username, password_hash, is_admin, tenant_id FROM authorized_users WHERE username = :username");
    $stmt->execute([':username' => $username]);
    $user = $stmt->fetch();

    if (!$user) {
        errorResponse('Credenciais invalidas', 401);
    }

    // Verificar senha
    // Suporte a ambos: bcrypt (novo) e texto plano (migrado do Supabase)
    $validPassword = false;
    $hashInfo = password_get_info($user['password_hash']);
    $isBcrypt = ($hashInfo['algo'] !== null && $hashInfo['algo'] !== 0);

    if ($isBcrypt) {
        // Senha com hash bcrypt
        $validPassword = password_verify($password, $user['password_hash']);
    } else {
        // Senha em texto plano (compatibilidade com dados migrados do Supabase)
        $validPassword = ($password === $user['password_hash']);
        // Se validou em texto plano, atualizar para bcrypt
        if ($validPassword) {
            $newHash = password_hash($password, PASSWORD_BCRYPT);
            $update = $db->prepare("UPDATE authorized_users SET password_hash = :hash WHERE id = :id");
            $update->execute([':hash' => $newHash, ':id' => $user['id']]);
        }
    }

    if (!$validPassword) {
        errorResponse('Credenciais invalidas', 401);
    }

    // Buscar nome do tenant
    $tenantName = null;
    if ($user['tenant_id']) {
        $stmt = $db->prepare("SELECT name FROM tenants WHERE id = :id");
        $stmt->execute([':id' => $user['tenant_id']]);
        $tenant = $stmt->fetch();
        $tenantName = $tenant['name'] ?? null;
    }

    // Gerar JWT
    $token = jwtEncode([
        'user_id'     => $user['id'],
        'username'    => $user['username'],
        'is_admin'    => (bool)$user['is_admin'],
        'tenant_id'   => $user['tenant_id'],
    ]);

    jsonResponse([
        'token' => $token,
        'user' => [
            'id'          => $user['id'],
            'username'    => $user['username'],
            'is_admin'    => (bool)$user['is_admin'],
            'tenant_id'   => $user['tenant_id'],
            'tenant_name' => $tenantName,
        ]
    ]);
}
