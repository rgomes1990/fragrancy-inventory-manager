<?php
require_once __DIR__ . '/../helpers/crud.php';
require_once __DIR__ . '/../middleware/auth.php';

function handleRequest(array $user, ?string $id): void {
    $tenantId = getTenantFilter($user);
    $crud = new CrudHelper('orders', $user['username'], $tenantId);
    $method = getRequestMethod();

    if ($method === 'GET' && !$id) {
        jsonResponse($crud->list(['orderBy' => 'created_at DESC']));
    }
    if ($method === 'GET' && $id) {
        // Retornar pedido com seus itens
        $order = $crud->getById($id);
        if (!$order) errorResponse('Pedido nao encontrado', 404);

        $db = getDB();
        $stmt = $db->prepare("SELECT * FROM order_items WHERE order_id = :order_id ORDER BY created_at ASC");
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
