<?php
require_once __DIR__ . '/../helpers/crud.php';
require_once __DIR__ . '/../middleware/auth.php';

function handleRequest(array $user, ?string $id): void {
    $tenantId = getTenantFilter($user);
    $crud = new CrudHelper('kits', $user['username'], $tenantId);
    $method = getRequestMethod();

    if ($method === 'GET' && !$id) {
        // Listar kits com seus itens
        $kits = $crud->list(['orderBy' => 'name ASC']);
        $db = getDB();
        foreach ($kits as &$kit) {
            $stmt = $db->prepare("
                SELECT ki.*, p.name as product_name, p.cost_price, p.sale_price, p.quantity as product_quantity
                FROM kit_items ki
                LEFT JOIN products p ON ki.product_id = p.id
                WHERE ki.kit_id = :kit_id
            ");
            $stmt->execute([':kit_id' => $kit['id']]);
            $kit['kit_items'] = $stmt->fetchAll();
        }
        jsonResponse($kits);
    }
    if ($method === 'GET' && $id) {
        $kit = $crud->getById($id);
        if (!$kit) errorResponse('Kit nao encontrado', 404);
        $db = getDB();
        $stmt = $db->prepare("
            SELECT ki.*, p.name as product_name, p.cost_price, p.sale_price, p.quantity as product_quantity
            FROM kit_items ki
            LEFT JOIN products p ON ki.product_id = p.id
            WHERE ki.kit_id = :kit_id
        ");
        $stmt->execute([':kit_id' => $id]);
        $kit['kit_items'] = $stmt->fetchAll();
        jsonResponse($kit);
    }
    if ($method === 'POST') {
        jsonResponse($crud->create(getJsonInput()), 201);
    }
    if ($method === 'PUT' && $id) {
        $r = $crud->update($id, getJsonInput());
        $r ? jsonResponse($r) : errorResponse('Kit nao encontrado', 404);
    }
    if ($method === 'DELETE' && $id) {
        $crud->delete($id) ? jsonResponse(['success' => true]) : errorResponse('Kit nao encontrado', 404);
    }
    errorResponse('Metodo nao permitido', 405);
}
