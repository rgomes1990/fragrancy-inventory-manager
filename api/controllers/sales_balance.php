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

    $where = '';
    $params = [];
    if ($tenantId) {
        $where = 'WHERE tenant_id = :tenant_id';
        $params[':tenant_id'] = $tenantId;
    }

    if ($id) {
        $where = $where ? "$where AND sale_id = :sid" : "WHERE sale_id = :sid";
        $params[':sid'] = $id;
    }

    $sql = "SELECT * FROM v_sales_balance $where ORDER BY sale_date DESC";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $results = $stmt->fetchAll();

    if ($id) {
        $r = $results[0] ?? null;
        $r ? jsonResponse($r) : errorResponse('Registro nao encontrado', 404);
        return;
    }

    // Filtros aplicados no PHP (views MySQL nao filtram bem por colunas computadas)
    if (isset($_GET['status_ne'])) {
        $statusNe = $_GET['status_ne'];
        $results = array_values(array_filter($results, fn($r) => $r['status'] !== $statusNe));
    }
    if (isset($_GET['status'])) {
        $statusEq = $_GET['status'];
        $results = array_values(array_filter($results, fn($r) => $r['status'] === $statusEq));
    }

    jsonResponse($results);
}
