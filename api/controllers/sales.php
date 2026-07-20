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
        // Buscar vendas com itens e nomes
        $sql = "SELECT s.*,
                       c.name as customer_name
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.id
                $where
                ORDER BY s.sale_date DESC, s.created_at DESC";
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $sales = $stmt->fetchAll();

        // Para cada venda, buscar seus itens
        foreach ($sales as &$sale) {
            $stmtItems = $db->prepare("
                SELECT si.*, p.name as product_name, p.cost_price, k.name as kit_name
                FROM sale_items si
                LEFT JOIN products p ON si.product_id = p.id
                LEFT JOIN kits k ON si.kit_id = k.id
                WHERE si.sale_id = :sale_id
                ORDER BY si.created_at ASC
            ");
            $stmtItems->execute([':sale_id' => $sale['id']]);
            $sale['items'] = $stmtItems->fetchAll();
        }
        unset($sale);
        jsonResponse($sales);
    }

    if ($method === 'GET' && $id) {
        $db = getDB();
        $sale = $crud->getById($id);
        if (!$sale) errorResponse('Venda nao encontrada', 404);
        $stmtItems = $db->prepare("
            SELECT si.*, p.name as product_name, p.cost_price, k.name as kit_name
            FROM sale_items si
            LEFT JOIN products p ON si.product_id = p.id
            LEFT JOIN kits k ON si.kit_id = k.id
            WHERE si.sale_id = :sale_id
        ");
        $stmtItems->execute([':sale_id' => $id]);
        $sale['items'] = $stmtItems->fetchAll();
        jsonResponse($sale);
    }

    if ($method === 'POST') {
        $data = getJsonInput();
        $db = getDB();
        $tid = $tenantId ?? ($data['tenant_id'] ?? null);

        // Gerar sale_number sequencial
        if ($tid) {
            $stmtMax = $db->prepare("SELECT COALESCE(MAX(sale_number), 0) + 1 as next_num FROM sales WHERE tenant_id = :tid");
            $stmtMax->execute([':tid' => $tid]);
            $data['sale_number'] = (int)$stmtMax->fetch()['next_num'];
        }

        // Extrair itens antes de criar a venda
        $items = $data['items'] ?? [];
        unset($data['items']);

        // Criar a venda (cabecalho)
        $sale = $crud->create($data);
        $saleId = $sale['id'];

        // Criar itens
        foreach ($items as $item) {
            $stmtItem = $db->prepare("
                INSERT INTO sale_items (id, sale_id, product_id, kit_id, quantity, unit_price, total_price)
                VALUES (UUID(), :sale_id, :product_id, :kit_id, :quantity, :unit_price, :total_price)
            ");
            $stmtItem->execute([
                ':sale_id' => $saleId,
                ':product_id' => $item['product_id'] ?? null,
                ':kit_id' => $item['kit_id'] ?? null,
                ':quantity' => $item['quantity'],
                ':unit_price' => $item['unit_price'],
                ':total_price' => $item['total_price'] ?? ($item['quantity'] * $item['unit_price']),
            ]);
        }

        // Retornar venda com itens
        $sale['items'] = $items;
        jsonResponse($sale, 201);
    }

    if ($method === 'PUT' && $id) {
        $r = $crud->update($id, getJsonInput());
        $r ? jsonResponse($r) : errorResponse('Venda nao encontrada', 404);
    }

    if ($method === 'DELETE' && $id) {
        $sale = $crud->getById($id);
        if (!$sale) errorResponse('Venda nao encontrada', 404);

        $db = getDB();
        // Limpar sale_payments associados
        $stmtPay = $db->prepare("DELETE FROM sale_payments WHERE sale_id = :sid");
        $stmtPay->execute([':sid' => $id]);

        // Apagar sale_items EXPLICITAMENTE (nao deixar para o CASCADE) para que o
        // trigger AFTER DELETE em sale_items estorne o estoque. No MySQL, deletes
        // disparados por CASCADE de FK NAO acionam triggers.
        $stmtItems = $db->prepare("DELETE FROM sale_items WHERE sale_id = :sid");
        $stmtItems->execute([':sid' => $id]);

        if (!$crud->delete($id)) errorResponse('Erro ao deletar venda', 500);

        jsonResponse(['success' => true]);
    }
    errorResponse('Metodo nao permitido', 405);
}
