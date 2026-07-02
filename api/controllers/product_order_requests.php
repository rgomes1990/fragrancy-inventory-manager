<?php
require_once __DIR__ . '/../helpers/crud.php';
require_once __DIR__ . '/../middleware/auth.php';

function handleRequest(array $user, ?string $id): void {
    $tenantId = getTenantFilter($user);
    $crud = new CrudHelper('product_order_requests', $user['username'], $tenantId);
    $method = getRequestMethod();

    if ($method === 'GET' && !$id) {
        $db = getDB();
        $where = '';
        $params = [];
        if ($tenantId) {
            $where = 'WHERE por.tenant_id = :tenant_id';
            $params[':tenant_id'] = $tenantId;
        }
        // Filtrar por is_order_product se solicitado
        $filterOrder = '';
        if (!empty($_GET['only_active_order_products'])) {
            $filterOrder = ($where ? ' AND' : ' WHERE') . ' p.is_order_product = 1';
        }
        $sql = "SELECT por.*, p.name as product_name
                FROM product_order_requests por
                LEFT JOIN products p ON por.product_id = p.id
                $where$filterOrder
                ORDER BY por.created_at DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        jsonResponse($stmt->fetchAll());
    }
    if ($method === 'GET' && $id) {
        $r = $crud->getById($id);
        $r ? jsonResponse($r) : errorResponse('Solicitacao nao encontrada', 404);
    }
    if ($method === 'POST') {
        jsonResponse($crud->create(getJsonInput()), 201);
    }
    if ($method === 'PUT' && $id) {
        $r = $crud->update($id, getJsonInput());
        $r ? jsonResponse($r) : errorResponse('Solicitacao nao encontrada', 404);
    }
    if ($method === 'DELETE' && $id) {
        $crud->delete($id) ? jsonResponse(['success' => true]) : errorResponse('Solicitacao nao encontrada', 404);
    }
    errorResponse('Metodo nao permitido', 405);
}
