<?php
/**
 * =====================================================
 * Script de Migracao de Dados: Supabase → MySQL
 * =====================================================
 *
 * INSTRUCOES:
 * 1. Faca upload deste arquivo para public_html/api/migrate_data.php
 * 2. Certifique-se que api/config/database.php esta configurado com as credenciais do MySQL
 * 3. Acesse no navegador: https://seudominio.com.br/api/migrate_data.php?key=CHAVE_SEGURA_123
 * 4. Aguarde a migracao completar
 * 5. APAGUE este arquivo apos o uso (contem credenciais do Supabase)
 *
 * IMPORTANTE: Execute apenas UMA vez. Se precisar re-executar, limpe as tabelas antes.
 */

// Chave de seguranca para evitar execucao acidental
$SECURITY_KEY = 'CHAVE_SEGURA_123'; // Altere esta chave antes de usar

if (($_GET['key'] ?? '') !== $SECURITY_KEY) {
    http_response_code(403);
    die('Acesso negado. Use ?key=SUA_CHAVE na URL.');
}

// Configuracao do Supabase (fonte dos dados)
$SUPABASE_URL = 'https://zrvpxzsvynxbskahqwug.supabase.co';
$SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpydnB4enN2eW54YnNrYWhxd3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwMzQ2NjMsImV4cCI6MjA2NTYxMDY2M30.ede9J6ASS-y-CUNFZN8yc2mKApMV3vA242Cqlpco89E';

require_once __DIR__ . '/config/database.php';

set_time_limit(300); // 5 minutos
ini_set('memory_limit', '256M');

header('Content-Type: text/html; charset=utf-8');
echo "<html><head><title>Migracao Supabase → MySQL</title>";
echo "<style>body{font-family:monospace;padding:20px;background:#1a1a2e;color:#e0e0e0;} ";
echo ".ok{color:#4ade80;} .err{color:#f87171;} .info{color:#60a5fa;} .warn{color:#fbbf24;} ";
echo "h1{color:#818cf8;} h2{color:#c084fc;margin-top:20px;}</style></head><body>";
echo "<h1>Migracao Supabase → MySQL</h1>";
echo "<p class='info'>Inicio: " . date('Y-m-d H:i:s') . "</p>";
flush();

// Funcao para buscar dados do Supabase via REST API
function fetchFromSupabase(string $table, string $select = '*', int $limit = 10000): array {
    global $SUPABASE_URL, $SUPABASE_KEY;

    $url = "{$SUPABASE_URL}/rest/v1/{$table}?select={$select}&limit={$limit}";

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "apikey: {$SUPABASE_KEY}",
            "Authorization: Bearer {$SUPABASE_KEY}",
            "Content-Type: application/json",
            "Prefer: return=representation",
        ],
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_TIMEOUT => 60,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        throw new Exception("cURL error para {$table}: {$error}");
    }

    if ($httpCode !== 200) {
        throw new Exception("HTTP {$httpCode} para {$table}: {$response}");
    }

    $data = json_decode($response, true);
    if (!is_array($data)) {
        throw new Exception("Resposta invalida para {$table}");
    }

    return $data;
}

// Funcao para inserir dados no MySQL
function insertIntoMySQL(PDO $db, string $table, array $rows): int {
    if (empty($rows)) return 0;

    $count = 0;
    foreach ($rows as $row) {
        // Filtrar apenas colunas que existem (remover campos de relacionamento)
        $filtered = [];
        foreach ($row as $key => $value) {
            // Pular campos que sao objetos/arrays (relacionamentos do Supabase)
            if (is_array($value) || is_object($value)) continue;
            $filtered[$key] = $value;
        }

        if (empty($filtered)) continue;

        $columns = implode(', ', array_map(fn($k) => "`{$k}`", array_keys($filtered)));
        $placeholders = implode(', ', array_map(fn($k) => ":{$k}", array_keys($filtered)));

        try {
            $sql = "INSERT INTO `{$table}` ({$columns}) VALUES ({$placeholders})";
            $stmt = $db->prepare($sql);

            // Converter tipos
            foreach ($filtered as $key => &$value) {
                if ($value === null) continue;
                // Booleans
                if (is_bool($value)) {
                    $value = $value ? 1 : 0;
                }
                // Timestamps do PostgreSQL para MySQL
                if (is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/', $value)) {
                    $value = str_replace('T', ' ', substr($value, 0, 19));
                }
            }
            unset($value);

            $stmt->execute($filtered);
            $count++;
        } catch (PDOException $e) {
            // Ignorar duplicatas (UNIQUE constraint)
            if ($e->getCode() == '23000') {
                echo "<p class='warn'>⚠ Duplicata ignorada em {$table}: {$e->getMessage()}</p>";
                continue;
            }
            echo "<p class='err'>✗ Erro em {$table}: {$e->getMessage()}</p>";
            echo "<p class='warn'>  Dados: " . json_encode($filtered) . "</p>";
        }
    }

    return $count;
}

// Ordem de migracao (respeitar foreign keys)
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

// Desabilitar foreign key checks durante a importacao
$db->exec("SET FOREIGN_KEY_CHECKS = 0");

$totalMigrated = 0;
$errors = 0;

foreach ($tables as $table) {
    echo "<h2>Tabela: {$table}</h2>";
    flush();

    try {
        // Verificar se tabela ja tem dados
        $existing = $db->query("SELECT COUNT(*) FROM `{$table}`")->fetchColumn();
        if ($existing > 0) {
            echo "<p class='warn'>⚠ Tabela ja possui {$existing} registros. Pulando...</p>";
            echo "<p class='info'>  (Para re-importar, execute: TRUNCATE TABLE `{$table}`;)</p>";
            continue;
        }

        // Buscar dados do Supabase
        echo "<p class='info'>→ Buscando dados do Supabase...</p>";
        flush();

        $data = fetchFromSupabase($table);
        $fetchCount = count($data);

        if ($fetchCount === 0) {
            echo "<p class='warn'>  Nenhum dado encontrado no Supabase.</p>";
            continue;
        }

        echo "<p class='info'>  {$fetchCount} registros encontrados. Inserindo no MySQL...</p>";
        flush();

        // Inserir no MySQL
        $inserted = insertIntoMySQL($db, $table, $data);
        $totalMigrated += $inserted;

        echo "<p class='ok'>✓ {$inserted}/{$fetchCount} registros migrados com sucesso!</p>";

    } catch (Exception $e) {
        $errors++;
        echo "<p class='err'>✗ ERRO: {$e->getMessage()}</p>";
    }

    flush();
}

// Re-habilitar foreign key checks
$db->exec("SET FOREIGN_KEY_CHECKS = 1");

echo "<h2>Resumo da Migracao</h2>";
echo "<p class='info'>Total de registros migrados: <strong>{$totalMigrated}</strong></p>";
if ($errors > 0) {
    echo "<p class='err'>Tabelas com erro: {$errors}</p>";
} else {
    echo "<p class='ok'>✓ Todas as tabelas migradas sem erros!</p>";
}
echo "<p class='info'>Fim: " . date('Y-m-d H:i:s') . "</p>";
echo "<hr>";
echo "<p class='warn'>⚠ IMPORTANTE: Apague este arquivo (migrate_data.php) apos a migracao!</p>";
echo "<p class='warn'>⚠ Este arquivo contem credenciais do Supabase e nao deve ficar acessivel.</p>";
echo "</body></html>";
