<?php
require_once __DIR__ . '/../helpers/crud.php';
require_once __DIR__ . '/../middleware/auth.php';

function handleRequest(array $user, ?string $id): void {
    $tenantId = getTenantFilter($user);
    $method = getRequestMethod();

    // Audit log e somente leitura
    if ($method !== 'GET') {
        errorResponse('Metodo nao permitido', 405);
    }

    $db = getDB();
    $where = '';
    $params = [];

    if ($tenantId) {
        $where = 'WHERE tenant_id = :tenant_id';
        $params[':tenant_id'] = $tenantId;
    }

    // Filtros opcionais
    if (isset($_GET['table_name'])) {
        $where = $where ? "$where AND table_name = :tname" : "WHERE table_name = :tname";
        $params[':tname'] = $_GET['table_name'];
    }
    if (isset($_GET['record_id'])) {
        $where = $where ? "$where AND record_id = :rid" : "WHERE record_id = :rid";
        $params[':rid'] = $_GET['record_id'];
    }
    if (isset($_GET['start_date'])) {
        $startDate = date('Y-m-d H:i:s', strtotime($_GET['start_date']));
        $where = $where ? "$where AND created_at >= :start_date" : "WHERE created_at >= :start_date";
        $params[':start_date'] = $startDate;
    }

    $limit = min((int)($_GET['limit'] ?? 500), 5000);

    if ($id) {
        $sql = "SELECT * FROM audit_log WHERE id = :id";
        $idParams = [':id' => $id];
        if ($tenantId) {
            $sql .= " AND tenant_id = :tenant_id";
            $idParams[':tenant_id'] = $tenantId;
        }
        $stmt = $db->prepare($sql);
        $stmt->execute($idParams);
        $r = $stmt->fetch();
        $r ? jsonResponse($r) : errorResponse('Registro nao encontrado', 404);
    }

    $sql = "SELECT * FROM audit_log $where ORDER BY created_at DESC LIMIT $limit";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();
    // Decodificar old_values/new_values de JSON string para objeto
    foreach ($rows as &$row) {
        if (isset($row['old_values']) && is_string($row['old_values'])) {
            $row['old_values'] = json_decode($row['old_values'], true);
        }
        if (isset($row['new_values']) && is_string($row['new_values'])) {
            $row['new_values'] = json_decode($row['new_values'], true);
        }
    }
    unset($row);
    jsonResponse($rows);
}
