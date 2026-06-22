<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../middleware/auth.php';
require_once __DIR__ . '/../helpers/response.php';

function handleRequest(array $user, ?string $id): void {
    if (getRequestMethod() !== 'GET') {
        errorResponse('Metodo nao permitido', 405);
    }

    $tenantId = getTenantFilter($user);
    $db = getDB();

    $tenantWhere = '';
    $params = [];
    if ($tenantId) {
        $tenantWhere = 'AND tenant_id = :tenant_id';
        $params[':tenant_id'] = $tenantId;
    }

    // Total de produtos
    $stmt = $db->prepare("SELECT COUNT(*) as total, COALESCE(SUM(quantity), 0) as total_stock FROM products WHERE 1=1 $tenantWhere");
    $stmt->execute($params);
    $products = $stmt->fetch();

    // Valor do estoque
    $stmt = $db->prepare("SELECT COALESCE(SUM(cost_price * quantity), 0) as stock_value_cost, COALESCE(SUM(sale_price * quantity), 0) as stock_value_sale FROM products WHERE 1=1 $tenantWhere");
    $stmt->execute($params);
    $stockValue = $stmt->fetch();

    // Vendas do mes
    $stmt = $db->prepare("SELECT COUNT(*) as total, COALESCE(SUM(total_price), 0) as revenue FROM sales WHERE MONTH(sale_date) = MONTH(CURDATE()) AND YEAR(sale_date) = YEAR(CURDATE()) $tenantWhere");
    $stmt->execute($params);
    $monthlySales = $stmt->fetch();

    // Total clientes
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM customers WHERE 1=1 $tenantWhere");
    $stmt->execute($params);
    $customers = $stmt->fetch();

    // Despesas do mes
    $stmt = $db->prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE MONTH(expense_date) = MONTH(CURDATE()) AND YEAR(expense_date) = YEAR(CURDATE()) $tenantWhere");
    $stmt->execute($params);
    $monthlyExpenses = $stmt->fetch();

    // Pedidos pendentes
    $stmt = $db->prepare("SELECT COUNT(*) as total FROM orders WHERE status = 'pendente' $tenantWhere");
    $stmt->execute($params);
    $pendingOrders = $stmt->fetch();

    jsonResponse([
        'products_count'     => (int)$products['total'],
        'total_stock'        => (int)$products['total_stock'],
        'stock_value_cost'   => (float)$stockValue['stock_value_cost'],
        'stock_value_sale'   => (float)$stockValue['stock_value_sale'],
        'monthly_sales'      => (int)$monthlySales['total'],
        'monthly_revenue'    => (float)$monthlySales['revenue'],
        'customers_count'    => (int)$customers['total'],
        'monthly_expenses'   => (float)$monthlyExpenses['total'],
        'pending_orders'     => (int)$pendingOrders['total'],
    ]);
}
