<?php
require_once __DIR__ . '/../helpers/crud.php';
require_once __DIR__ . '/../middleware/auth.php';

function handleRequest(array $user, ?string $id): void {
    $tenantId = getTenantFilter($user);
    $crud = new CrudHelper('sales', $user['username'], $tenantId);
    $method = getRequestMethod();

    if ($method === 'GET' && !$id) {
        $db = getDB();
        $where = '';
        $params = [];
        if ($tenantId) {
            $where = 'WHERE s.tenant_id = :tenant_id';
            $params[':tenant_id'] = $tenantId;
        }
        if (isset($_GET['sale_group_id'])) {
            $where = $where ? "$where AND s.sale_group_id = :sgid" : "WHERE s.sale_group_id = :sgid";
            $params[':sgid'] = $_GET['sale_group_id'];
        }
        $sql = "SELECT s.*,
                       c.name as customer_name,
                       p.name as product_name,
                       p.cost_price as cost_price,
                       k.name as kit_name
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.id
                LEFT JOIN products p ON s.product_id = p.id
                LEFT JOIN kits k ON s.kit_id = k.id
                $where
                ORDER BY s.sale_date DESC, s.created_at DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        jsonResponse($stmt->fetchAll());
    }

    if ($method === 'GET' && $id) {
        $r = $crud->getById($id);
        $r ? jsonResponse($r) : errorResponse('Venda nao encontrada', 404);
    }
    if ($method === 'POST') {
        jsonResponse($crud->create(getJsonInput()), 201);
    }
    if ($method === 'PUT' && $id) {
        $r = $crud->update($id, getJsonInput());
        $r ? jsonResponse($r) : errorResponse('Venda nao encontrada', 404);
    }
    if ($method === 'DELETE' && $id) {
        // Buscar a venda antes de deletar para limpar sale_payments associados
        $sale = $crud->getById($id);
        if (!$sale) errorResponse('Venda nao encontrada', 404);

        $groupId = $sale['sale_group_id'] ?? $id;
        $db = getDB();

        // Verificar se existem outras vendas no mesmo grupo
        $stmtGroup = $db->prepare("SELECT COUNT(*) as cnt FROM sales WHERE sale_group_id = :gid AND id != :id");
        $stmtGroup->execute([':gid' => $groupId, ':id' => $id]);
        $othersInGroup = $stmtGroup->fetch()['cnt'];

        // Deletar a venda
        if (!$crud->delete($id)) errorResponse('Erro ao deletar venda', 500);

        // Se nao ha outras vendas no grupo, limpar sale_payments orfaos
        if ($othersInGroup == 0) {
            $stmtPay = $db->prepare("DELETE FROM sale_payments WHERE sale_group_id = :gid");
            $stmtPay->execute([':gid' => $groupId]);
        }

        jsonResponse(['success' => true]);
    }
    errorResponse('Metodo nao permitido', 405);
}
