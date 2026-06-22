<?php
// Helper para registrar audit log (substitui os triggers do PostgreSQL)

require_once __DIR__ . '/../config/database.php';

function auditLog(string $tableName, string $operation, string $recordId, ?array $oldValues, ?array $newValues, string $userName, ?string $tenantId = null): void {
    try {
        $db = getDB();
        $stmt = $db->prepare("
            INSERT INTO audit_log (id, table_name, operation, record_id, old_values, new_values, user_name, tenant_id)
            VALUES (UUID(), :table_name, :operation, :record_id, :old_values, :new_values, :user_name, :tenant_id)
        ");
        $stmt->execute([
            ':table_name' => $tableName,
            ':operation' => $operation,
            ':record_id' => $recordId,
            ':old_values' => $oldValues ? json_encode($oldValues) : null,
            ':new_values' => $newValues ? json_encode($newValues) : null,
            ':user_name' => $userName,
            ':tenant_id' => $tenantId,
        ]);
    } catch (Exception $e) {
        // Nao interrompe a operacao principal se o audit falhar
        error_log("Audit log error: " . $e->getMessage());
    }
}
