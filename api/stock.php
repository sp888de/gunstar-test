<?php

declare(strict_types=1);

ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    http_response_code(405);
    echo json_encode(['error' => 'GET required.']);
    exit;
}

try {
    $privateDir = dirname(__DIR__, 2) . '/private';

    $config = require $privateDir . '/stripe-config.php';

    if (!str_starts_with($config['secret_key'] ?? '', 'sk_test_')) {
        throw new RuntimeException('Test configuration required.');
    }

    require_once $privateDir . '/inventory.php';

    $db = inventoryDatabase($config);

    $query = $db->prepare(
        'SELECT quantity FROM inventory
         WHERE product_id = :product_id AND size = :size'
    );

    $items = [];

    foreach ($config['products'] as $id => $product) {
        $sizes = $product['sizes'] ?: ['NONE'];

        foreach ($sizes as $size) {
            $query->execute([
                'product_id' => (string) $id,
                'size' => $size,
            ]);

            $quantity = $query->fetchColumn();

            if ($quantity === false) {
                throw new RuntimeException('Missing inventory record.');
            }

            $items[] = [
                'id' => (string) $id,
                'size' => $size === 'NONE' ? null : $size,
                'quantity' => (int) $quantity,
            ];
        }
    }

    echo json_encode([
        'test_mode' => true,
        'items' => $items,
    ], JSON_PRETTY_PRINT);

} catch (Throwable $error) {
    http_response_code(503);

    echo json_encode([
        'error' => 'Inventory unavailable. Check private configuration and permissions.',
    ]);
}