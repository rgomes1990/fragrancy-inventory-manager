<?php
/**
 * =====================================================
 * Script de Migracao v2 - Usa service_role key (bypassa RLS)
 * =====================================================
 *
 * INSTRUCOES:
 * 1. Pegue a service_role key no Supabase: Settings > API > service_role
 * 2. Cole abaixo no campo $SUPABASE_SERVICE_KEY
 * 3. Upload para public_html/api/migrate_data_v2.php
 * 4. Acesse: https://perfumes1.rsgtecnologia.com/api/migrate_data_v2.php?key=MIGRAR_V2
 * 5. APAGUE apos o uso!
 */

$SECURITY_KEY = 'MIGRAR_V2';

if (($_GET['key'] ?? '') !== $SECURITY_KEY) {
    http_response_code(403);
    die('Acesso negado. Use ?key=MIGRAR_V2 na URL.');
}

// =====================================================
// COLE SUA SERVICE_ROLE KEY AQUI:
// =====================================================
$SUPABASE_URL = 'https://zrvpxzsvynxbskahqwug.supabase.co';
$SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpydnB4enN2eW54YnNrYWhxd3VnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDAzNDY2MywiZXhwIjoyMDY1NjEwNjYzfQ.4HLzIuX4oFdxhgee1BhQXf5ATmYCmkr_JGvC0xd-HlM';
// =====================================================

if ($SUPABASE_SERVICE_KEY === 'COLE_SUA_SERVICE_ROLE_KEY_AQUI') {
    die('<h1 style="color:red">ERRO: Voce precisa colar a service_role key do Supabase no arquivo!</h1>
         <p>Va em: Supabase Dashboard > Settings > API > service_role (secret)</p>');
}

require_once __DIR__ . '/config/database.php';

set_time_limit(600);
ini_set('memory_limit', '512M');

header('Content-Type: text/html; charset=utf-8');
echo "<html><head><title>Migracao v2</title>";
echo "<style>body{font-family:monospace;padding:20px;background:#1a1a2e;color:#e0e0e0;} ";
echo ".ok{color:#4ade80;} .err{color:#f87171;} .info{color:#60a5fa;} .warn{color:#fbbf24;} ";
echo "h1{color:#818cf8;} h2{color:#c084fc;margin-top:20px;}</style></head><body>";
echo "<h1>Migracao v2 - Service Role (sem RLS)</h1>";
echo "<p class='info'>Inicio: " . date('Y-m-d H:i:s') . "</p>";
flush();

function fetchAllFromSupabase(string $table): array {
    global $SUPABASE_URL, $SUPABASE_SERVICE_KEY;

    $allData = [];
    $offset = 0;
    $pageSize = 1000;

    while (true) {
        $url = "{$SUPABASE_URL}/rest/v1/{$table}?select=*&limit={$pageSize}&offset={$offset}&order=created_at.asc";

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                "apikey: {$SUPABASE_SERVICE_KEY}",
                "Authorization: Bearer {$SUPABASE_SERVICE_KEY}",
                "Content-Type: application/json",
            ],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_TIMEOUT => 120,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) throw new Exception("cURL error para {$table}: {$error}");
        if ($httpCode !== 200) throw new Exception("HTTP {$httpCode} para {$table}: " . substr($response, 0, 300));

        $data = json_decode($response, true);
        if (!is_array($data)) throw new Exception("Resposta invalida para {$table}");

        if (empty($data)) break;

        $allData = array_merge($allData, $data);
        $offset += $pageSize;

        // Se retornou menos que o pageSize, acabou
        if (count($data) < $pageSize) break;

        echo "<p class='info'>  ... {$offset} registros buscados...</p>";
        flush();
    }

    return $allData;
}

function insertIntoMySQL(PDO $db, string $table, array $rows): int {
    if (empty($rows)) return 0;

    $count = 0;
    foreach ($rows as $row) {
        $filtered = [];
        foreach ($row as $key => $value) {
            if (is_array($value) || is_object($value)) continue;
            $filtered[$key] = $value;
        }

        if (empty($filtered)) continue;

        $columns = implode(', ', array_map(fn($k) => "`{$k}`", array_keys($filtered)));
        $placeholders = implode(', ', array_map(fn($k) => ":{$k}", array_keys($filtered)));

        try {
            $sql = "INSERT INTO `{$table}` ({$columns}) VALUES ({$placeholders})";
            $stmt = $db->prepare($sql);

            foreach ($filtered as $key => &$value) {
                if ($value === null) continue;
                if (is_bool($value)) $value = $value ? 1 : 0;
                if (is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/', $value)) {
                    $value = str_replace('T', ' ', substr($value, 0, 19));
                }
            }
            unset($value);

            $stmt->execute($filtered);
            $count++;
        } catch (PDOException $e) {
            if ($e->getCode() == '23000') continue; // Duplicata
            echo "<p class='err'>✗ Erro em {$table}: " . htmlspecialchars($e->getMessage()) . "</p>";
        }
    }

    return $count;
}

$tables = [
    'tenants',
    'authorized_users',
    'categories',
    'products',
    'customers',
    'kits',
    'kit_items',
    'sellers',
    'sales',
    'sale_payments',
    'orders',
    'order_items',
    'product_order_requests',
    'suppliers',
    'supplier_orders',
    'supplier_order_items',
    'stock_entries',
    'expenses',
    'reinvestments',
    'cash_closings',
    'audit_log',
];

$db = getDB();
$db->exec("SET FOREIGN_KEY_CHECKS = 0");

$totalMigrated = 0;
$errors = 0;

foreach ($tables as $table) {
    echo "<h2>Tabela: {$table}</h2>";
    flush();

    try {
        // Contar registros atuais
        $existing = (int)$db->query("SELECT COUNT(*) FROM `{$table}`")->fetchColumn();

        // Buscar TODOS os dados do Supabase (com service_role, sem RLS)
        echo "<p class='info'>→ Buscando dados do Supabase (service_role, sem RLS)...</p>";
        flush();

        $data = fetchAllFromSupabase($table);
        $fetchCount = count($data);

        if ($fetchCount === 0) {
            echo "<p class='warn'>  Nenhum dado encontrado no Supabase.</p>";
            continue;
        }

        echo "<p class='info'>  {$fetchCount} registros no Supabase | {$existing} no MySQL</p>";

        if ($fetchCount <= $existing) {
            echo "<p class='ok'>  MySQL ja tem todos os registros. Pulando.</p>";
            continue;
        }

        // Limpar tabela e re-importar tudo (para garantir integridade)
        echo "<p class='warn'>  Limpando tabela e re-importando {$fetchCount} registros...</p>";
        flush();

        $db->exec("DELETE FROM `{$table}`");

        $inserted = insertIntoMySQL($db, $table, $data);
        $totalMigrated += $inserted;

        $status = ($inserted === $fetchCount) ? 'ok' : 'warn';
        echo "<p class='{$status}'>✓ {$inserted}/{$fetchCount} registros migrados!</p>";

    } catch (Exception $e) {
        $errors++;
        echo "<p class='err'>✗ ERRO: " . htmlspecialchars($e->getMessage()) . "</p>";
    }

    flush();
}

$db->exec("SET FOREIGN_KEY_CHECKS = 1");

echo "<h2>Resumo</h2>";
echo "<p class='info'>Total migrado: <strong>{$totalMigrated}</strong></p>";
if ($errors > 0) {
    echo "<p class='err'>Tabelas com erro: {$errors}</p>";
} else {
    echo "<p class='ok'>✓ Todas as tabelas migradas!</p>";
}
echo "<p class='info'>Fim: " . date('Y-m-d H:i:s') . "</p>";
echo "<hr><p class='err'>⚠ APAGUE este arquivo AGORA! Contem service_role key!</p>";
echo "</body></html>";
