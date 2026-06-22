<?php
require_once __DIR__ . '/../helpers/crud.php';
require_once __DIR__ . '/../middleware/auth.php';

function handleRequest(array $user, ?string $id): void {
    $crud = new CrudHelper('kit_items', $user['username'], null, true);
    $method = getRequestMethod();

    if ($method === 'GET' && !$id) {
        $options = [];
        if (isset($_GET['kit_id'])) {
            $options['where'] = 'kit_items.kit_id = :kid';
            $options['params'] = [':kid' => $_GET['kit_id']];
        }
        jsonResponse($crud->list($options));
    }
    if ($method === 'GET' && $id) {
        $r = $crud->getById($id);
        $r ? jsonResponse($r) : errorResponse('Item nao encontrado', 404);
    }
    if ($method === 'POST') {
        jsonResponse($crud->create(getJsonInput()), 201);
    }
    if ($method === 'PUT' && $id) {
        $r = $crud->update($id, getJsonInput());
        $r ? jsonResponse($r) : errorResponse('Item nao encontrado', 404);
    }
    if ($method === 'DELETE' && $id) {
        $crud->delete($id) ? jsonResponse(['success' => true]) : errorResponse('Item nao encontrado', 404);
    }
    errorResponse('Metodo nao permitido', 405);
}
