<?php

declare(strict_types=1);

ini_set('display_errors', '0');
umask(0077);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function reply(int $status, string $message): never
{
    http_response_code($status);
    echo json_encode(['message' => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    reply(405, 'POST required.');
}

try {
    $privateDir = dirname(__DIR__, 2) . '/private';
    $config = require $privateDir . '/stripe-config.php';

    $secret = $config['secret_key'] ?? '';
    $webhookSecret = $config['webhook_secret'] ?? '';

    if (
        !str_starts_with($secret, 'sk_test_') ||
        !str_starts_with($webhookSecret, 'whsec_')
    ) {
        reply(503, 'Test webhook configuration missing.');
    }

    // La signature doit être vérifiée sur le corps brut.
    $payload = file_get_contents(
        'php://input',
        false,
        null,
        0,
        1048577
    );

    if ($payload === false || strlen($payload) > 1048576) {
        reply(400, 'Invalid payload.');
    }

    $signatureHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
    $timestamp = null;
    $signatures = [];

    foreach (explode(',', $signatureHeader) as $part) {
        $pair = explode('=', trim($part), 2);

        if (count($pair) !== 2) {
            continue;
        }

        if ($pair[0] === 't' && ctype_digit($pair[1])) {
            $timestamp = $pair[1];
        }

        if ($pair[0] === 'v1') {
            $signatures[] = $pair[1];
        }
    }

    if (
        $timestamp === null ||
        abs(time() - (int) $timestamp) > 300
    ) {
        reply(400, 'Invalid signature timestamp.');
    }

    $expectedSignature = hash_hmac(
        'sha256',
        $timestamp . '.' . $payload,
        $webhookSecret
    );

    $signatureValid = false;

    foreach ($signatures as $signature) {
        if (hash_equals($expectedSignature, $signature)) {
            $signatureValid = true;
            break;
        }
    }

    if (!$signatureValid) {
        reply(400, 'Invalid signature.');
    }

    $event = json_decode($payload, true);

    if (!is_array($event)) {
        reply(400, 'Invalid event.');
    }

    $acceptedEvents = [
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
    'checkout.session.async_payment_failed',
    'checkout.session.expired',
];

    if (!in_array($event['type'] ?? '', $acceptedEvents, true)) {
        reply(200, 'Event ignored.');
    }

    if (($event['livemode'] ?? null) !== false) {
        reply(400, 'Only test events are accepted.');
    }

    $sessionId = $event['data']['object']['id'] ?? '';

    if (
        !is_string($sessionId) ||
        !preg_match('/^cs_test_[A-Za-z0-9]+$/', $sessionId)
    ) {
        reply(400, 'Invalid test session.');
    }

    require_once $privateDir . '/inventory.php';
    $db = inventoryDatabase($config);
    $session = gsStripeData(gsStripe($config, 'GET', 'checkout/sessions/' . $sessionId));
    if (($session['metadata']['shop'] ?? '') !== 'gunstar') reply(200, 'Event ignored.');
    $state = gsApplySession($db, $config, $session);
    reply(200, $state === 'paid' ? 'Order recorded.' : 'Checkout processed.');
} catch (Throwable $error) {
    if (function_exists('gsLog')) gsLog('Webhook failed: ' . get_class($error));
    reply(500, 'Webhook processing failed.');
}
