<?php
require_once __DIR__ . '/../helpers/crud.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../config/database.php';

function handleRequest(array $user, ?string $id): void {
    $tenantId = getTenantFilter($user);
    $crud = new CrudHelper('cash_closings', $user['username'], $tenantId);
    $method = getRequestMethod();

    // Sub-recurso: resumo da sessao ativa
    if ($method === 'GET' && $id === 'session-summary') {
        handleSessionSummary($tenantId);
        return;
    }

    // GET lista com filtro opcional por status
    if ($method === 'GET' && !$id) {
        $options = ['orderBy' => 'created_at DESC'];
        $statusFilter = $_GET['status'] ?? null;
        if ($statusFilter) {
            $options['where'] = "status = :filter_status";
            $options['params'] = [':filter_status' => $statusFilter];
        }
        jsonResponse($crud->list($options));
        return;
    }

    // GET por id
    if ($method === 'GET' && $id) {
        $r = $crud->getById($id);
        $r ? jsonResponse($r) : errorResponse('Fechamento nao encontrado', 404);
        return;
    }

    // POST - abrir caixa ou criar fechamento
    if ($method === 'POST') {
        $data = getJsonInput();

        // Se status = open, validar que nao existe outro caixa aberto para este tenant
        if (($data['status'] ?? '') === 'open') {
            $existing = $crud->list([
                'where' => "status = 'open'",
            ]);
            if (count($existing) > 0) {
                errorResponse('Ja existe um caixa aberto para esta empresa. Feche o caixa atual antes de abrir outro.', 409);
                return;
            }
        }

        if (!isset($data['created_by'])) {
            $data['created_by'] = $user['username'];
        }
        jsonResponse($crud->create($data), 201);
        return;
    }

    // PUT - fechar caixa ou atualizar
    if ($method === 'PUT' && $id) {
        $r = $crud->update($id, getJsonInput());
        $r ? jsonResponse($r) : errorResponse('Fechamento nao encontrado', 404);
        return;
    }

    // DELETE
    if ($method === 'DELETE' && $id) {
        $crud->delete($id) ? jsonResponse(['success' => true]) : errorResponse('Fechamento nao encontrado', 404);
        return;
    }

    errorResponse('Metodo nao permitido', 405);
}

/**
 * Retorna resumo financeiro da sessao ativa do caixa.
 * Busca sale_payments e expenses criados desde opened_at.
 */
function handleSessionSummary(?string $tenantId): void {
    $openedAt = $_GET['opened_at'] ?? null;
    if (!$openedAt) {
        errorResponse('Parametro opened_at e obrigatorio', 400);
        return;
    }

    $db = getDB();

    // Vendas por tipo de pagamento (sale_payments criados desde opened_at)
    $sqlPayments = "
        SELECT sp.payment_type, SUM(sp.amount) as total
        FROM sale_payments sp
        WHERE sp.created_at >= :opened_at
    ";
    $params = [':opened_at' => $openedAt];

    if ($tenantId) {
        $sqlPayments .= " AND sp.tenant_id = :tenant_id";
        $params[':tenant_id'] = $tenantId;
    }
    $sqlPayments .= " GROUP BY sp.payment_type";

    $stmt = $db->prepare($sqlPayments);
    $stmt->execute($params);
    $paymentRows = $stmt->fetchAll();

    $salesByType = [
        'Dinheiro' => 0,
        'Pix' => 0,
        'Débito' => 0,
        'Crédito' => 0,
        'Link' => 0,
    ];
    $totalSales = 0;
    foreach ($paymentRows as $row) {
        $type = $row['payment_type'] ?? 'Outro';
        $amount = (float)$row['total'];
        if (isset($salesByType[$type])) {
            $salesByType[$type] = $amount;
        } else {
            $salesByType[$type] = $amount;
        }
        $totalSales += $amount;
    }

    // Despesas e entradas de caixa criadas desde opened_at
    $sqlExpenses = "
        SELECT category, SUM(amount) as total
        FROM expenses
        WHERE created_at >= :opened_at
    ";
    $expParams = [':opened_at' => $openedAt];

    if ($tenantId) {
        $sqlExpenses .= " AND tenant_id = :tenant_id";
        $expParams[':tenant_id'] = $tenantId;
    }
    $sqlExpenses .= " GROUP BY category";

    $stmt = $db->prepare($sqlExpenses);
    $stmt->execute($expParams);
    $expenseRows = $stmt->fetchAll();

    $expenses = 0;
    $cashEntries = 0;
    foreach ($expenseRows as $row) {
        $amount = (float)$row['total'];
        if ($row['category'] === 'Entrada de Caixa') {
            $cashEntries += $amount;
        } else {
            $expenses += $amount;
        }
    }

    jsonResponse([
        'sales_by_type' => $salesByType,
        'total_sales' => $totalSales,
        'expenses' => $expenses,
        'cash_entries' => $cashEntries,
    ]);
}
