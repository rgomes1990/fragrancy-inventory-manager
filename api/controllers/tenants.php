<?php
require_once __DIR__ . '/../helpers/crud.php';
require_once __DIR__ . '/../middleware/auth.php';

function handleRequest(array $user, ?string $id): void {
    $method = getRequestMethod();
    $action = $_GET['action'] ?? null;

    // Rota acessivel a qualquer usuario autenticado: branding do proprio tenant
    if ($action === 'my-branding') {
        $tenantId = $user['tenant_id'] ?? null;
        if (!$tenantId) {
            errorResponse('Usuario sem empresa associada', 400);
        }

        $db = getDB();

        if ($method === 'GET') {
            $stmt = $db->prepare('SELECT id, name, logo_url, primary_color, secondary_color, accent_color FROM tenants WHERE id = :id');
            $stmt->execute([':id' => $tenantId]);
            $row = $stmt->fetch();
            $row ? jsonResponse($row) : errorResponse('Empresa nao encontrada', 404);
        }

        if ($method === 'PUT') {
            $data = getJsonInput();
            $allowed = ['name', 'logo_url', 'primary_color', 'secondary_color', 'accent_color'];
            $sets = [];
            $params = [':id' => $tenantId];

            foreach ($allowed as $field) {
                if (array_key_exists($field, $data)) {
                    $sets[] = "`$field` = :$field";
                    $params[":$field"] = $data[$field];
                }
            }

            if (empty($sets)) {
                errorResponse('Nenhum campo para atualizar', 400);
            }

            $sql = 'UPDATE tenants SET ' . implode(', ', $sets) . ' WHERE id = :id';
            $stmt = $db->prepare($sql);
            $stmt->execute($params);

            // Retornar dados atualizados
            $stmt = $db->prepare('SELECT id, name, logo_url, primary_color, secondary_color, accent_color FROM tenants WHERE id = :id');
            $stmt->execute([':id' => $tenantId]);
            jsonResponse($stmt->fetch());
        }

        errorResponse('Metodo nao permitido', 405);
    }

    // Demais rotas: somente admins
    if (!$user['is_admin']) {
        errorResponse('Acesso negado', 403);
    }

    $crud = new CrudHelper('tenants', $user['username'], null, false);

    if ($method === 'GET' && !$id) {
        jsonResponse($crud->list(['orderBy' => 'name ASC']));
    }
    if ($method === 'GET' && $id) {
        $r = $crud->getById($id);
        $r ? jsonResponse($r) : errorResponse('Tenant nao encontrado', 404);
    }
    if ($method === 'POST') {
        jsonResponse($crud->create(getJsonInput()), 201);
    }
    if ($method === 'PUT' && $id) {
        $r = $crud->update($id, getJsonInput());
        $r ? jsonResponse($r) : errorResponse('Tenant nao encontrado', 404);
    }
    if ($method === 'DELETE' && $id) {
        $crud->delete($id) ? jsonResponse(['success' => true]) : errorResponse('Tenant nao encontrado', 404);
    }
    errorResponse('Metodo nao permitido', 405);
}
