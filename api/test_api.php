<?php
/**
 * Teste da API - acesse no navegador para verificar se o roteamento funciona
 * APAGUE APOS O USO!
 */
header('Content-Type: text/html; charset=utf-8');
echo "<html><head><title>Teste API</title>";
echo "<style>body{font-family:monospace;padding:20px;background:#1a1a2e;color:#e0e0e0;} .ok{color:#4ade80;} .err{color:#f87171;} .info{color:#60a5fa;} pre{background:#2d2d44;padding:10px;border-radius:5px;}</style></head><body>";
echo "<h1>Teste da API</h1>";

// Teste 1: .htaccess e mod_rewrite
echo "<h2>1. mod_rewrite</h2>";
if (function_exists('apache_get_modules')) {
    $modules = apache_get_modules();
    if (in_array('mod_rewrite', $modules)) {
        echo "<p class='ok'>✓ mod_rewrite esta ativo!</p>";
    } else {
        echo "<p class='err'>✗ mod_rewrite NAO esta ativo!</p>";
    }
} else {
    echo "<p class='info'>Nao foi possivel verificar (funcao apache_get_modules indisponivel)</p>";
}

// Teste 2: Testar o login via curl interno
echo "<h2>2. Teste de Login via API</h2>";
$apiUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . '/api/auth/login';
echo "<p class='info'>URL da API: {$apiUrl}</p>";

$payload = json_encode(['username' => 'admin-geral', 'password' => 'Rsg@9090']);

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => $apiUrl,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => false,
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    echo "<p class='err'>✗ cURL error: {$error}</p>";
} else {
    echo "<p class='info'>HTTP Code: {$httpCode}</p>";
    echo "<pre>" . htmlspecialchars($response) . "</pre>";
    if ($httpCode === 200) {
        echo "<p class='ok'>✓ Login via API funcionou!</p>";
    } else {
        echo "<p class='err'>✗ Login via API falhou (HTTP {$httpCode})</p>";

        // Tentar acessar index.php diretamente
        echo "<h3>Tentando via index.php direto...</h3>";
        $directUrl = str_replace('/api/auth/login', '/api/index.php/auth/login', $apiUrl);
        echo "<p class='info'>URL direta: {$directUrl}</p>";

        $ch2 = curl_init();
        curl_setopt_array($ch2, [
            CURLOPT_URL => $directUrl,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => false,
        ]);
        $response2 = curl_exec($ch2);
        $httpCode2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
        curl_close($ch2);

        echo "<p class='info'>HTTP Code: {$httpCode2}</p>";
        echo "<pre>" . htmlspecialchars($response2) . "</pre>";
    }
}

// Teste 3: Verificar .htaccess
echo "<h2>3. Verificar arquivos</h2>";
$files = [
    __DIR__ . '/.htaccess',
    __DIR__ . '/index.php',
    __DIR__ . '/controllers/auth.php',
    __DIR__ . '/config/database.php',
    __DIR__ . '/middleware/cors.php',
];
foreach ($files as $f) {
    $exists = file_exists($f);
    $relPath = str_replace(__DIR__, '', $f);
    echo "<p class='" . ($exists ? 'ok' : 'err') . "'>" . ($exists ? '✓' : '✗') . " {$relPath}</p>";
}

// Teste 4: Conteudo do .htaccess da API
echo "<h2>4. Conteudo do .htaccess da API</h2>";
$htaccess = @file_get_contents(__DIR__ . '/.htaccess');
if ($htaccess) {
    echo "<pre>" . htmlspecialchars($htaccess) . "</pre>";
} else {
    echo "<p class='err'>✗ .htaccess nao encontrado na pasta api/</p>";
}

// Teste 5: Conteudo do .htaccess raiz
echo "<h2>5. Conteudo do .htaccess raiz</h2>";
$htaccessRoot = @file_get_contents(dirname(__DIR__) . '/.htaccess');
if ($htaccessRoot) {
    echo "<pre>" . htmlspecialchars($htaccessRoot) . "</pre>";
} else {
    echo "<p class='err'>✗ .htaccess raiz nao encontrado!</p>";
}

echo "<hr><p class='err'>⚠ APAGUE este arquivo apos o teste!</p>";
echo "</body></html>";
