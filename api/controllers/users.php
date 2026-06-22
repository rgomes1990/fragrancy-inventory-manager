<?php
require_once __DIR__ . '/../helpers/crud.php';
require_once __DIR__ . '/../middleware/auth.php';

function handleRequest(array $user, ?string $id): void {
    // Somente admins podem gerenciar usuarios
    if (!$user['is_admin']) {
        errorResponse('Acesso negado', 403);
    }

    $crud = new CrudHelper('authorized_users', $user['username'], null, false);
    $method = getRequestMethod();

    if ($method === 'GET' && !$id) {
        $db = getDB();
        $sql = "SELECT u.id, u.username, u.is_admin, u.tenant_id, u.created_at, t.name as tenant_name
                FROM authorized_users u
                LEFT JOIN tenants t ON u.tenant_id = t.id
                ORDER BY u.username ASC";
        $stmt = $db->query($sql);
        jsonResponse($stmt->fetchAll());
    }

    if ($method === 'GET' && $id) {
        $r = $crud->getById($id);
        if ($r) {
            unset($r['password_hash']); // Nunca expor senha
            jsonResponse($r);
        }
        errorResponse('Usuario nao encontrado', 404);
    }

    if ($method === 'POST') {
        $data = getJsonInput();
        if (empty($data['username']) || empty($data['password'])) {
            errorResponse('Username e password sao obrigatorios');
        }
        // Hash da senha com bcrypt
        $data['password_hash'] = password_hash($data['password'], PASSWORD_BCRYPT);
        unset($data['password']);
        $data['is_admin'] = $data['is_admin'] ?? false;

        $record = $crud->create($data);
        unset($record['password_hash']);
        jsonResponse($record, 201);
    }

    if ($method === 'PUT' && $id) {
        $data = getJsonInput();
        // Se estiver atualizando senha
        if (!empty($data['password'])) {
            $data['password_hash'] = password_hash($data['password'], PASSWORD_BCRYPT);
            unset($data['password']);
        }
        unset($data['password']);

        $r = $crud->update($id, $data);
        if ($r) {
            unset($r['password_hash']);
            jsonResponse($r);
        }
        errorResponse('Usuario nao encontrado', 404);
    }

    if ($method === 'DELETE' && $id) {
        $crud->delete($id) ? jsonResponse(['success' => true]) : errorResponse('Usuario nao encontrado', 404);
    }

    errorResponse('Metodo nao permitido', 405);
}
