<?php

declare(strict_types=1);

ini_set('display_errors', '0');

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'POST'], true)) {
    header('Allow: GET, POST');
    respond(405, ['error' => 'Method not allowed.']);
}

try {
    require_once dirname(__DIR__, 2) . '/private/colissimo-europe.php';
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['list'] ?? '') === 'countries') {
        respond(200, ['countries' => array_merge(...array_values(GS_DESTINATIONS))]);
    }

    $configPath = dirname(__DIR__, 2) . '/private/stripe-config.php';

    if (!is_file($configPath)) {
        respond(503, ['error' => 'Server configuration missing.']);
    }

    $config = require $configPath;
    $secret = $config['secret_key'] ?? '';
    $siteUrl = rtrim($config['site_url'] ?? '', '/');

    // Cette première version accepte uniquement les clés de test.
    if (!str_starts_with($secret, 'sk_test_')) {
        respond(503, ['error' => 'A Stripe test key is required.']);
    }

    if (!str_starts_with($siteUrl, 'https://')) {
        respond(503, ['error' => 'HTTPS site URL required.']);
    }

    require_once dirname(__DIR__, 2) . '/private/inventory.php';
    $db = inventoryDatabase($config);
    $browser = gsBrowser();
    $ip = gsIp($config);
    gsRate($db, 'checkout-request:' . $ip, 30, 60);
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        respond(200, ['csrf' => $browser['csrf']]);
    }
    if (!hash_equals($browser['csrf'], $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '')) {
        respond(403, ['error' => 'Browser verification failed. Reload the page.']);
    }

    if (($_SERVER['HTTP_ORIGIN'] ?? '') !== $siteUrl) {
        respond(403, ['error' => 'Origin not allowed.']);
    }

    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

    if (stripos($contentType, 'application/json') !== 0) {
        respond(415, ['error' => 'JSON required.']);
    }

    $raw = file_get_contents('php://input', false, null, 0, 16385);

    if ($raw === false || strlen($raw) > 16384) {
        respond(413, ['error' => 'Request too large.']);
    }

    $payload = json_decode($raw, true);

    if (!is_array($payload)) {
        respond(400, ['error' => 'Invalid JSON.']);
    }

    if (($payload['action'] ?? '') === 'cancel') {
        $q = $db->prepare("SELECT j.reservation_id FROM checkout_jobs j JOIN reservations r
            ON r.id=j.reservation_id WHERE j.owner=? AND r.state='reserved' LIMIT 1");
        $q->execute([$browser['owner']]);
        $active = $q->fetchColumn();
        if (!$active) respond(200, ['status'=>'released']);
        gsSync($db, $config, $active, true);
        $state = gsJob($db, $active)['state'];
        respond(200, ['status'=>$state]);
    }
    $country = $payload['shipping_country'] ?? null;
    $zone = gsShippingZone($country);
    $requestKey = $payload['request_key'] ?? '';
    if (!is_string($requestKey) || !preg_match('/^[a-f0-9]{64}$/', $requestKey)) {
        respond(400, ['error'=>'Invalid checkout request. Refresh the page.']);
    }
    // Recover expired reservations opportunistically as well as from the CLI worker.
    // One candidate at most: do not delay a customer behind a complete batch.
    $q = $db->prepare("SELECT j.reservation_id FROM checkout_jobs j JOIN reservations r
        ON r.id=j.reservation_id WHERE r.state='reserved' AND j.next_check<?
        AND j.lease_until<? ORDER BY j.next_check LIMIT 1");
    $q->execute([time()-60,time()]);
    if ($recover = $q->fetchColumn()) {
        try { gsSync($db,$config,$recover); } catch (Throwable $ignored) {}
    }

    $items = $payload['items'] ?? null;

    if (
        !is_array($items) ||
        !array_is_list($items) ||
        count($items) < 1 ||
        count($items) > 50
    ) {
        respond(400, ['error' => 'Invalid cart.']);
    }

    $catalog = $config['products'] ?? [];
    $validated = [];

    foreach ($items as $item) {
        if (!is_array($item)) {
            respond(400, ['error' => 'Invalid item.']);
        }

        $id = $item['id'] ?? null;
        $size = $item['size'] ?? null;
        $quantity = $item['quantity'] ?? null;

        if (
            !is_string($id) ||
            !isset($catalog[$id]) ||
            !is_int($quantity) ||
            $quantity < 1 ||
            $quantity > 99
        ) {
            respond(400, ['error' => 'Invalid product or quantity.']);
        }

        $product = $catalog[$id];
        $sizes = $product['sizes'];

        if (
            ($sizes !== [] && !in_array($size, $sizes, true)) ||
            ($sizes === [] && $size !== null)
        ) {
            respond(400, ['error' => 'Invalid size.']);
        }

        if (!is_int($product['price']) || $product['price'] <= 0) {
            respond(503, ['error' => 'Product price not configured.']);
        }

        $variantKey = json_encode([$id, $size]);

        if (!isset($validated[$variantKey])) {
            $validated[$variantKey] = [
                'id' => $id,
                'size' => $size,
                'quantity' => 0,
                'product' => $product,
            ];
        }

        $validated[$variantKey]['quantity'] += $quantity;

        if ($validated[$variantKey]['quantity'] > 99) {
            respond(400, ['error' => 'Quantity limit exceeded.']);
        }
    }

    $lineItems = [];

    foreach ($validated as $item) {
        $product = $item['product'];

        $name = $product['name'];
        if ($item['size'] !== null) {
            $name .= ' — ' . $item['size'];
        }

        $lineItems[] = [
            'quantity' => $item['quantity'],
            'price_data' => [
                'currency' => 'eur',
                'unit_amount' => $product['price'],
                'product_data' => [
                    'name' => $name,
                    'metadata' => [
                        'product_id' => $item['id'],
                        'size' => $item['size'] ?? 'NONE',
                    ],
                ],
            ],
        ];
    }

    $weight = gsShippingWeight($validated);
    $amount = gsShippingAmount($zone, $weight);
    $params = [
        'mode' => 'payment',
        'customer_creation' => 'always',
        'phone_number_collection' => ['enabled' => 'true'],
        'metadata' => [
            'shop' => 'gunstar',
            'shipping_country' => $country,
            'shipping_carrier' => 'colissimo',
            'shipping_weight_g' => (string)$weight,
            'shipping_amount_cents' => (string)$amount,
        ],
        'line_items' => $lineItems,
        'shipping_address_collection' => ['allowed_countries' => [$country]],
        'shipping_options' => [[
            'shipping_rate_data' => [
                'type' => 'fixed_amount',
                'fixed_amount' => ['amount' => $amount, 'currency' => 'eur'],
                'display_name' => 'Colissimo — Home delivery',
            ],
        ]],
        'success_url' => $siteUrl . '/checkout-return.html?session_id={CHECKOUT_SESSION_ID}',
        'cancel_url' => $siteUrl . '/galerie.html',
    ];

    $job = gsBegin($db, $validated, $params, $requestKey, $browser['owner'], $ip, $config);
    if ($job['state'] === 'released') {
        throw new CheckoutProblem(409, 'Previous checkout closed. Click Checkout again to start a new one.', true);
    }
    $session = gsSync($db, $config, $job['reservation_id']);
    $job = gsJob($db, $job['reservation_id']);
    if ($job['state'] === 'released') {
        throw new CheckoutProblem(409, 'Checkout expired or cancelled. Click Checkout again.', true);
    }
    if (!$session) throw new CheckoutProblem(503, 'Checkout verification pending. Retry shortly.');
    $url = ($session['status'] ?? '') === 'open'
        ? $session['url']
        : $siteUrl . '/checkout-return.html?session_id=' . rawurlencode($session['id']);
    respond(200, [
        'url'=>$url, 'session_id'=>$session['id'],
        'tracking_token'=>$job['tracking_token'],
        'request_key'=>$job['request_key'],
    ]);
} catch (CheckoutProblem $error) {
    if ($error->httpStatus === 429) header('Retry-After: 60');
    respond($error->httpStatus, ['error'=>$error->getMessage(), 'terminal'=>$error->terminal]);
} catch (Throwable $error) {
    if (function_exists('gsLog')) gsLog('Checkout failed: ' . get_class($error));
    respond(503, ['error'=>'Checkout temporarily unavailable. Retry the same checkout.']);
}
