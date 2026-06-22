<?php
require_once __DIR__ . '/../helpers/crud.php';
require_once __DIR__ . '/../middleware/auth.php';

function handleRequest(array $user, ?string $id): void {
    // Somente admins podem gerenciar tenants
    if (!$user['is_admin']) {
        errorResponse('Acesso negado', 403);
    }

    $crud = new CrudHelper('tenants', $user['username'], null, false);
    $method = getRequestMethod();

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
