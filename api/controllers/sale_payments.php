<?php
require_once __DIR__ . '/../helpers/crud.php';
require_once __DIR__ . '/../middleware/auth.php';

function handleRequest(array $user, ?string $id): void {
    $tenantId = getTenantFilter($user);
    $crud = new CrudHelper('sale_payments', $user['username'], $tenantId);
    $method = getRequestMethod();

    if ($method === 'GET' && !$id) {
        // Modo detalhado: JOIN com sales + customers para historico completo
        if (isset($_GET['with_details']) && $_GET['with_details'] === '1') {
            $db = getDB();
            $where = '';
            $params = [];
            if ($tenantId) {
                $where = 'WHERE sp.tenant_id = :tenant_id';
                $params[':tenant_id'] = $tenantId;
            }
            if (isset($_GET['date_from']) && $_GET['date_from']) {
                $where .= ($where ? ' AND' : 'WHERE') . ' sp.payment_date >= :date_from';
                $params[':date_from'] = $_GET['date_from'];
            }
            if (isset($_GET['date_to']) && $_GET['date_to']) {
                $where .= ($where ? ' AND' : 'WHERE') . ' sp.payment_date <= :date_to';
                $params[':date_to'] = $_GET['date_to'];
            }
            $sql = "SELECT sp.id, sp.sale_id, sp.amount, sp.payment_date, sp.payment_type, sp.notes, sp.tenant_id, sp.created_at,
                           c.name AS customer_name, s.total_price AS sale_total, s.seller
                    FROM sale_payments sp
                    LEFT JOIN sales s ON s.id = sp.sale_id
                    LEFT JOIN customers c ON c.id = s.customer_id
                    $where
                    ORDER BY sp.payment_date DESC, sp.created_at DESC";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            jsonResponse($stmt->fetchAll());
        }

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
