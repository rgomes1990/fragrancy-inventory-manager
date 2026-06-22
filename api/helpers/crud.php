<?php
// Helper generico de CRUD para reduzir repeticao nos controllers
// Todas as tabelas seguem o mesmo padrao com tenant_id

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/audit.php';
require_once __DIR__ . '/response.php';

class CrudHelper {
    private PDO $db;
    private string $table;
    private string $userName;
    private ?string $tenantId;
    private bool $auditEnabled;

    public function __construct(string $table, string $userName, ?string $tenantId, bool $auditEnabled = true) {
        $this->db = getDB();
        $this->table = $table;
        $this->userName = $userName;
        $this->tenantId = $tenantId;
        $this->auditEnabled = $auditEnabled;
    }

    public function list(array $options = []): array {
        $select = $options['select'] ?? '*';
        $orderBy = $options['orderBy'] ?? 'created_at DESC';
        $joins = $options['joins'] ?? '';
        $extraWhere = $options['where'] ?? '';
        $params = $options['params'] ?? [];

        $where = '';
        if ($this->tenantId) {
            $where = "WHERE {$this->table}.tenant_id = :tenant_id";
            $params[':tenant_id'] = $this->tenantId;
        }

        if ($extraWhere) {
            $where = $where ? "$where AND ($extraWhere)" : "WHERE $extraWhere";
        }

        $sql = "SELECT $select FROM `{$this->table}` $joins $where ORDER BY $orderBy";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getById(string $id, array $options = []): ?array {
        $select = $options['select'] ?? '*';
        $joins = $options['joins'] ?? '';

        $where = "{$this->table}.id = :id";
        $params = [':id' => $id];

        if ($this->tenantId) {
            $where .= " AND {$this->table}.tenant_id = :tenant_id";
            $params[':tenant_id'] = $this->tenantId;
        }

        $sql = "SELECT $select FROM `{$this->table}` $joins WHERE $where LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(array $data): array {
        $id = $this->generateUuid();
        $data['id'] = $id;

        if ($this->tenantId && !isset($data['tenant_id'])) {
            $data['tenant_id'] = $this->tenantId;
        }

        $columns = implode(', ', array_map(fn($k) => "`$k`", array_keys($data)));
        $placeholders = implode(', ', array_map(fn($k) => ":$k", array_keys($data)));

        $sql = "INSERT INTO `{$this->table}` ($columns) VALUES ($placeholders)";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($data);

        $record = $this->getById($id) ?? $data;

        if ($this->auditEnabled) {
            $auditTenant = $this->tenantId ?? ($record['tenant_id'] ?? null);
            auditLog($this->table, 'INSERT', $id, null, $record, $this->userName, $auditTenant);
        }

        return $record;
    }

    public function update(string $id, array $data): ?array {
        // Buscar registro antigo para audit
        $old = $this->getById($id);
        if (!$old) return null;

        unset($data['id'], $data['created_at']);

        $sets = implode(', ', array_map(fn($k) => "`$k` = :$k", array_keys($data)));
        $data['where_id'] = $id;

        $where = "id = :where_id";
        if ($this->tenantId) {
            $where .= " AND tenant_id = :where_tenant_id";
            $data['where_tenant_id'] = $this->tenantId;
        }

        $sql = "UPDATE `{$this->table}` SET $sets WHERE $where";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($data);

        $new = $this->getById($id);

        if ($this->auditEnabled) {
            $auditTenant = $this->tenantId ?? ($new['tenant_id'] ?? ($old['tenant_id'] ?? null));
            auditLog($this->table, 'UPDATE', $id, $old, $new, $this->userName, $auditTenant);
        }

        return $new;
    }

    public function delete(string $id): bool {
        $old = $this->getById($id);
        if (!$old) return false;

        $where = "id = :id";
        $params = [':id' => $id];

        if ($this->tenantId) {
            $where .= " AND tenant_id = :tenant_id";
            $params[':tenant_id'] = $this->tenantId;
        }

        $sql = "DELETE FROM `{$this->table}` WHERE $where";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        if ($this->auditEnabled) {
            $auditTenant = $this->tenantId ?? ($old['tenant_id'] ?? null);
            auditLog($this->table, 'DELETE', $id, $old, null, $this->userName, $auditTenant);
        }

        return $stmt->rowCount() > 0;
    }

    private function generateUuid(): string {
        $stmt = $this->db->query("SELECT UUID() as uuid");
        return $stmt->fetch()['uuid'];
    }
}
