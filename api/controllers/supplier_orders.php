<?php
require_once __DIR__ . '/../helpers/crud.php';
require_once __DIR__ . '/../middleware/auth.php';

function handleRequest(array $user, ?string $id): void {
    $tenantId = getTenantFilter($user);
    $crud = new CrudHelper('supplier_orders', $user['username'], $tenantId);
    $method = getRequestMethod();

    if ($method === 'GET' && !$id) {
        $db = getDB();
        $where = '';
        $params = [];
        if ($tenantId) {
            $where = 'WHERE so.tenant_id = :tenant_id';
            $params[':tenant_id'] = $tenantId;
        }
        $sql = "SELECT so.*, sup.name as supplier_name
                FROM supplier_orders so
                LEFT JOIN suppliers sup ON so.supplier_id = sup.id
                $where
                ORDER BY so.order_date DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        jsonResponse($stmt->fetchAll());
    }
    if ($method === 'GET' && $id) {
        $order = $crud->getById($id);
        if (!$order) errorResponse('Pedido nao encontrado', 404);
        $db = getDB();
        $stmt = $db->prepare("
            SELECT soi.*, p.name as product_current_name
            FROM supplier_order_items soi
            LEFT JOIN products p ON soi.product_id = p.id
            WHERE soi.order_id = :order_id
        ");
        $stmt->execute([':order_id' => $id]);
        $order['items'] = $stmt->fetchAll();
        jsonResponse($order);
    }
    if ($method === 'POST') {
        jsonResponse($crud->create(getJsonInput()), 201);
    }
    if ($method === 'PUT' && $id) {
        $r = $crud->update($id, getJsonInput());
        $r ? jsonResponse($r) : errorResponse('Pedido nao encontrado', 404);
    }
    if ($method === 'DELETE' && $id) {
        $crud->delete($id) ? jsonResponse(['success' => true]) : errorResponse('Pedido nao encontrado', 404);
    }
    errorResponse('Metodo nao permitido', 405);
}
