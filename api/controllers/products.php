<?php
require_once __DIR__ . '/../helpers/crud.php';
require_once __DIR__ . '/../middleware/auth.php';

function handleRequest(array $user, ?string $id): void {
    $tenantId = getTenantFilter($user);
    $crud = new CrudHelper('products', $user['username'], $tenantId);
    $method = getRequestMethod();

    if ($method === 'GET' && !$id) {
        // Listar produtos com categoria
        $db = getDB();
        $where = '';
        $params = [];
        if ($tenantId) {
            $where = 'WHERE p.tenant_id = :tenant_id';
            $params[':tenant_id'] = $tenantId;
        }
        $sql = "SELECT p.*, c.name as category_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                $where
                ORDER BY p.created_at DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        jsonResponse($stmt->fetchAll());
    }

    if ($method === 'GET' && $id) {
        $record = $crud->getById($id, [
            'select' => 'products.*, c.name as category_name',
            'joins' => 'LEFT JOIN categories c ON products.category_id = c.id',
        ]);
        $record ? jsonResponse($record) : errorResponse('Produto nao encontrado', 404);
    }

    if ($method === 'POST') {
        $data = getJsonInput();
        $record = $crud->create($data);
        jsonResponse($record, 201);
    }

    if ($method === 'PUT' && $id) {
        $data = getJsonInput();
        $record = $crud->update($id, $data);
        $record ? jsonResponse($record) : errorResponse('Produto nao encontrado', 404);
    }

    if ($method === 'DELETE' && $id) {
        $crud->delete($id) ? jsonResponse(['success' => true]) : errorResponse('Produto nao encontrado', 404);
    }

    errorResponse('Metodo nao permitido', 405);
}
