<?php
require_once __DIR__ . '/../helpers/crud.php';
require_once __DIR__ . '/../middleware/auth.php';

function handleRequest(array $user, ?string $id): void {
    $tenantId = getTenantFilter($user);
    $crud = new CrudHelper('stock_entries', $user['username'], $tenantId);
    $method = getRequestMethod();

    if ($method === 'GET' && !$id) {
        $db = getDB();
        $where = '';
        $params = [];
        if ($tenantId) {
            $where = 'WHERE se.tenant_id = :tenant_id';
            $params[':tenant_id'] = $tenantId;
        }
        $sql = "SELECT se.*, p.name as product_name
                FROM stock_entries se
                LEFT JOIN products p ON se.product_id = p.id
                $where
                ORDER BY se.entry_date DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        jsonResponse($stmt->fetchAll());
    }
    if ($method === 'GET' && $id) {
        $r = $crud->getById($id);
        $r ? jsonResponse($r) : errorResponse('Entrada nao encontrada', 404);
    }
    if ($method === 'POST') {
        jsonResponse($crud->create(getJsonInput()), 201);
    }
    if ($method === 'PUT' && $id) {
        $r = $crud->update($id, getJsonInput());
        $r ? jsonResponse($r) : errorResponse('Entrada nao encontrada', 404);
    }
    if ($method === 'DELETE' && $id) {
        $crud->delete($id) ? jsonResponse(['success' => true]) : errorResponse('Entrada nao encontrada', 404);
    }
    errorResponse('Metodo nao permitido', 405);
}
