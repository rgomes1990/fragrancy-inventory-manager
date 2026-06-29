<?php
// =====================================================
// Router principal da API REST
// =====================================================

require_once __DIR__ . '/middleware/cors.php';
require_once __DIR__ . '/middleware/auth.php';
require_once __DIR__ . '/helpers/response.php';

handleCors();

// Extrair o path da URL
$requestUri = $_SERVER['REQUEST_URI'];
$basePath = '/api';
$path = parse_url($requestUri, PHP_URL_PATH);
$path = preg_replace('#^' . preg_quote($basePath) . '#', '', $path);
$path = trim($path, '/');
$segments = $path ? explode('/', $path) : [];

$resource = $segments[0] ?? '';
$resourceId = $segments[1] ?? null;
$subResource = $segments[2] ?? null;

// Rota publica: login
if ($resource === 'auth' && $resourceId === 'login') {
    require_once __DIR__ . '/controllers/auth.php';
    handleLogin();
    exit;
}

// Todas as outras rotas requerem autenticacao
$user = authenticate();

// Mapear recursos para controllers
$controllers = [
    'products'               => 'products.php',
    'categories'             => 'categories.php',
    'customers'              => 'customers.php',
    'sales'                  => 'sales.php',
    'sale-payments'          => 'sale_payments.php',
    'orders'                 => 'orders.php',
    'order-items'            => 'order_items.php',
    'kits'                   => 'kits.php',
    'kit-items'              => 'kit_items.php',
    'sellers'                => 'sellers.php',
    'suppliers'              => 'suppliers.php',
    'supplier-orders'        => 'supplier_orders.php',
    'supplier-order-items'   => 'supplier_order_items.php',
    'stock-entries'          => 'stock_entries.php',
    'expenses'               => 'expenses.php',
    'reinvestments'          => 'reinvestments.php',
    'cash-closings'          => 'cash_closings.php',
    'users'                  => 'users.php',
    'tenants'                => 'tenants.php',
    'audit-log'              => 'audit_log.php',
    'sale-items'             => 'sale_items.php',
    'sales-balance'          => 'sales_balance.php',
    'product-order-requests' => 'product_order_requests.php',
    'dashboard'              => 'dashboard.php',
    'upload'                 => 'upload.php',
    'image-proxy'            => 'image_proxy.php',
];

if (!isset($controllers[$resource])) {
    errorResponse('Rota nao encontrada', 404);
}

require_once __DIR__ . '/controllers/' . $controllers[$resource];
handleRequest($user, $resourceId);
