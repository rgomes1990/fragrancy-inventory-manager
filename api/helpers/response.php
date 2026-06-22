<?php
// Helpers para respostas padronizadas da API

function castNumericValues($data) {
    if (is_array($data)) {
        foreach ($data as $key => &$value) {
            if (is_array($value)) {
                $value = castNumericValues($value);
            } elseif (is_string($value) && is_numeric($value)) {
                // Manter IDs e campos que parecem UUID/hex como string
                if (strlen($value) > 15 || preg_match('/^0\d/', $value) || preg_match('/[a-f-]/i', $value)) {
                    continue;
                }
                $value = strpos($value, '.') !== false ? (float)$value : (int)$value;
            }
        }
        unset($value);
    }
    return $data;
}

function jsonResponse($data, int $status = 200): void {
    http_response_code($status);
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');
    $data = castNumericValues($data);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function errorResponse(string $message, int $status = 400): void {
    jsonResponse(['error' => $message], $status);
}

function getJsonInput(): array {
    $input = json_decode(file_get_contents('php://input'), true);
    return $input ?? [];
}

function getRequestMethod(): string {
    return $_SERVER['REQUEST_METHOD'];
}
