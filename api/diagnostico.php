<?php
/**
 * Script de diagnostico de login
 * Acesse: https://perfumes1.rsgtecnologia.com/api/diagnostico.php
 * APAGUE APOS O USO!
 */

header('Content-Type: text/html; charset=utf-8');
echo "<html><head><title>Diagnostico</title>";
echo "<style>body{font-family:monospace;padding:20px;background:#1a1a2e;color:#e0e0e0;} ";
echo ".ok{color:#4ade80;} .err{color:#f87171;} .info{color:#60a5fa;} pre{background:#2d2d44;padding:10px;border-radius:5px;overflow-x:auto;}</style></head><body>";
echo "<h1>Diagnostico de Login</h1>";

// 1. Testar conexao com o banco
echo "<h2>1. Conexao com o banco</h2>";
try {
    require_once __DIR__ . '/config/database.php';
    $db = getDB();
    echo "<p class='ok'>✓ Conexao OK!</p>";
} catch (Exception $e) {
    echo "<p class='err'>✗ ERRO: " . $e->getMessage() . "</p>";
    die("</body></html>");
}

// 2. Listar usuarios
echo "<h2>2. Usuarios no banco</h2>";
try {
    $stmt = $db->query("SELECT id, username, password_hash, is_admin, tenant_id FROM authorized_users");
    $users = $stmt->fetchAll();

    if (empty($users)) {
        echo "<p class='err'>✗ NENHUM usuario encontrado na tabela authorized_users!</p>";
        echo "<p class='info'>A tabela esta vazia. A migracao pode nao ter trazido os dados.</p>";

        // Verificar se tabela existe
        $tables = $db->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        echo "<h3>Tabelas existentes:</h3><pre>" . implode("\n", $tables) . "</pre>";

        // Contar registros em cada tabela
        echo "<h3>Registros por tabela:</h3><pre>";
        foreach ($tables as $t) {
            $count = $db->query("SELECT COUNT(*) FROM `{$t}`")->fetchColumn();
            echo "{$t}: {$count} registros\n";
        }
        echo "</pre>";
    } else {
        echo "<p class='ok'>✓ " . count($users) . " usuario(s) encontrado(s):</p>";
        echo "<pre>";
        foreach ($users as $u) {
            $hashPreview = substr($u['password_hash'], 0, 30) . '...';
            $hashLen = strlen($u['password_hash']);
            $hashType = password_get_info($u['password_hash'])['algoName'] ?? 'texto plano';
            echo "Username: {$u['username']}\n";
            echo "  ID: {$u['id']}\n";
            echo "  Hash ({$hashLen} chars): {$hashPreview}\n";
            echo "  Tipo hash: {$hashType}\n";
            echo "  Admin: " . ($u['is_admin'] ? 'SIM' : 'NAO') . "\n";
            echo "  Tenant: " . ($u['tenant_id'] ?: 'NULL') . "\n\n";
        }
        echo "</pre>";
    }
} catch (Exception $e) {
    echo "<p class='err'>✗ Erro ao listar usuarios: " . $e->getMessage() . "</p>";
}

// 3. Testar endpoint de login
echo "<h2>3. Teste de Login</h2>";
if (isset($_GET['test_user']) && isset($_GET['test_pass'])) {
    $testUser = $_GET['test_user'];
    $testPass = $_GET['test_pass'];

    echo "<p class='info'>Testando login: username='{$testUser}'</p>";

    $stmt = $db->prepare("SELECT id, username, password_hash, is_admin, tenant_id FROM authorized_users WHERE username = :username");
    $stmt->execute([':username' => $testUser]);
    $user = $stmt->fetch();

    if (!$user) {
        echo "<p class='err'>✗ Usuario '{$testUser}' NAO encontrado no banco!</p>";
    } else {
        echo "<p class='ok'>✓ Usuario encontrado!</p>";

        // Testar comparacao
        $hash = $user['password_hash'];
        $algoInfo = password_get_info($hash);

        echo "<pre>";
        echo "Password hash armazenado: " . $hash . "\n";
        echo "Tamanho do hash: " . strlen($hash) . "\n";
        echo "Algo info: " . json_encode($algoInfo) . "\n";
        echo "Senha informada: " . $testPass . "\n\n";

        // Teste 1: comparacao direta (texto plano)
        $plainMatch = ($testPass === $hash);
        echo "Comparacao texto plano (===): " . ($plainMatch ? 'MATCH!' : 'nao match') . "\n";

        // Teste 2: comparacao loose
        $looseMatch = ($testPass == $hash);
        echo "Comparacao loose (==): " . ($looseMatch ? 'MATCH!' : 'nao match') . "\n";

        // Teste 3: password_verify (bcrypt)
        if ($algoInfo['algo'] !== 0) {
            $bcryptMatch = password_verify($testPass, $hash);
            echo "password_verify (bcrypt): " . ($bcryptMatch ? 'MATCH!' : 'nao match') . "\n";
        } else {
            echo "password_verify: N/A (nao e bcrypt)\n";
        }

        // Teste 4: trim e comparar
        $trimMatch = (trim($testPass) === trim($hash));
        echo "Comparacao com trim: " . ($trimMatch ? 'MATCH!' : 'nao match') . "\n";

        // Hex dump para ver caracteres invisíveis
        echo "\nHex do hash: " . bin2hex($hash) . "\n";
        echo "Hex da senha: " . bin2hex($testPass) . "\n";
        echo "</pre>";
    }
} else {
    echo "<p class='info'>Para testar um login, adicione na URL:</p>";
    echo "<p class='info'><code>?test_user=SEU_USUARIO&test_pass=SUA_SENHA</code></p>";
}

// 4. Verificar tenants
echo "<h2>4. Tenants</h2>";
try {
    $stmt = $db->query("SELECT * FROM tenants");
    $tenants = $stmt->fetchAll();
    if (empty($tenants)) {
        echo "<p class='err'>✗ Nenhum tenant encontrado!</p>";
    } else {
        echo "<p class='ok'>✓ " . count($tenants) . " tenant(s):</p><pre>";
        foreach ($tenants as $t) {
            echo "ID: {$t['id']} | Nome: {$t['name']}\n";
        }
        echo "</pre>";
    }
} catch (Exception $e) {
    echo "<p class='err'>✗ Erro: " . $e->getMessage() . "</p>";
}

echo "<hr><p class='err'>⚠ APAGUE este arquivo apos o diagnostico!</p>";
echo "</body></html>";
