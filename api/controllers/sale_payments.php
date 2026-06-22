<?php
require_once __DIR__ . '/../helpers/crud.php';
require_once __DIR__ . '/../middleware/auth.php';

function handleRequest(array $user, ?string $id): void {
    $tenantId = getTenantFilter($user);
    $crud = new CrudHelper('sale_payments', $user['username'], $tenantId);
    $method = getRequestMethod();

    if ($method === 'GET' && !$id) {
        $options = ['orderBy' => 'payment_date DESC'];
        // Filtrar por sale_id se fornecido
        if (isset($_GET['sale_id'])) {
            $options['where'] = 'sale_id = :sid';
            $options['params'] = [':sid' => $_GET['sale_id']];
        }
        // Backward compat: aceitar sale_group_id como alias
        if (isset($_GET['sale_group_id'])) {
            $options['where'] = 'sale_id = :sid';
            $options['params'] = [':sid' => $_GET['sale_group_id']];
        }
        jsonResponse($crud->list($options));
    }
    if ($method === 'GET' && $id) {
        $r = $crud->getById($id);
        $r ? jsonResponse($r) : errorResponse('Pagamento nao encontrado', 404);
    }
    if ($method === 'POST') {
        jsonResponse($crud->create(getJsonInput()), 201);
    }
    if ($method === 'PUT' && $id) {
        $r = $crud->update($id, getJsonInput());
        $r ? jsonResponse($r) : errorResponse('Pagamento nao encontrado', 404);
    }
    if ($method === 'DELETE' && $id) {
        $crud->delete($id) ? jsonResponse(['success' => true]) : errorResponse('Pagamento nao encontrado', 404);
    }
    errorResponse('Metodo nao permitido', 405);
}
