<?php

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$result = [
    'php' => PHP_VERSION,
    'curl_available' => function_exists('curl_init'),
    'stripe_reachable' => false,
    'stripe_http_code' => null
];

if ($result['curl_available']) {
    // Requête sans clé : aucun paiement ni aucune donnée envoyée.
    $request = curl_init('https://api.stripe.com/v1/balance');

    curl_setopt_array($request, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2
    ]);

    $response = curl_exec($request);
    $httpCode = curl_getinfo($request, CURLINFO_HTTP_CODE);

    $result['stripe_http_code'] = $httpCode;

    // Stripe doit refuser cette requête non authentifiée avec HTTP 401.
    $body = is_string($response) ? json_decode($response, true) : null;

    $result['stripe_reachable'] =
        $response !== false &&
        $httpCode === 401 &&
        isset($body['error']);

    curl_close($request);
}

echo json_encode(
    $result,
    JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
);