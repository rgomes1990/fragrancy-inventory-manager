<?php
require_once __DIR__ . '/../helpers/crud.php';
require_once __DIR__ . '/../middleware/auth.php';

function handleRequest(array $user, ?string $id): void {
    $tenantId = getTenantFilter($user);
    $crud = new CrudHelper('reinvestments', $user['username'], $tenantId);
    $method = getRequestMethod();

    if ($method === 'GET' && !$id) {
        jsonResponse($crud->list(['orderBy' => 'date DESC']));
    }
    if ($method === 'GET' && $id) {
        $r = $crud->getById($id);
        $r ? jsonResponse($r) : errorResponse('Reinvestimento nao encontrado', 404);
    }
    if ($method === 'POST') {
        jsonResponse($crud->create(getJsonInput()), 201);
    }
    if ($method === 'PUT' && $id) {
        $r = $crud->update($id, getJsonInput());
        $r ? jsonResponse($r) : errorResponse('Reinvestimento nao encontrado', 404);
    }
    if ($method === 'DELETE' && $id) {
        $crud->delete($id) ? jsonResponse(['success' => true]) : errorResponse('Reinvestimento nao encontrado', 404);
    }
    errorResponse('Metodo nao permitido', 405);
}
