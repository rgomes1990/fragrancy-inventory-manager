<?php
require_once __DIR__ . '/../helpers/crud.php';
require_once __DIR__ . '/../middleware/auth.php';

function handleRequest(array $user, ?string $id): void {
    $tenantId = getTenantFilter($user);
    $method = getRequestMethod();
    $db = getDB();

    if ($method === 'GET' && !$id) {
        $where = '';
        $params = [];
        if (isset($_GET['sale_id'])) {
            $where = 'WHERE si.sale_id = :sale_id';
            $params[':sale_id'] = $_GET['sale_id'];
        }
        $sql = "SELECT si.*, p.name as product_name, k.name as kit_name
                FROM sale_items si
                LEFT JOIN products p ON si.product_id = p.id
                LEFT JOIN kits k ON si.kit_id = k.id
                $where ORDER BY si.created_at ASC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        jsonResponse($stmt->fetchAll());
    }

    if ($method === 'POST') {
        $data = getJsonInput();
        $stmt = $db->prepare("
            INSERT INTO sale_items (id, sale_id, product_id, kit_id, quantity, unit_price, total_price)
            VALUES (UUID(), :sale_id, :product_id, :kit_id, :quantity, :unit_price, :total_price)
        ");
        $stmt->execute([
            ':sale_id' => $data['sale_id'],
            ':product_id' => $data['product_id'] ?? null,
            ':kit_id' => $data['kit_id'] ?? null,
            ':quantity' => $data['quantity'],
            ':unit_price' => $data['unit_price'],
            ':total_price' => $data['total_price'] ?? ($data['quantity'] * $data['unit_price']),
        ]);
        jsonResponse(['success' => true], 201);
    }

    if ($method === 'DELETE' && $id) {
        $stmt = $db->prepare("DELETE FROM sale_items WHERE id = :id");
        $stmt->execute([':id' => $id]);
        jsonResponse(['success' => true]);
    }

    errorResponse('Metodo nao permitido', 405);
}
