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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, ['error' => 'POST required.']);
}

try {
    $raw = file_get_contents('php://input', false, null, 0, 4097);

    if ($raw === false || strlen($raw) > 4096) {
        respond(400, ['error' => 'Invalid request.']);
    }

    $input = json_decode($raw, true);

    if (!is_array($input)) {
        respond(400, ['error' => 'Invalid request.']);
    }

    $sessionId = $input['session_id'] ?? '';
    $token = $input['token'] ?? '';

    if (
        !is_string($sessionId) ||
        strlen($sessionId) > 255 ||
        !preg_match('/^cs_test_[A-Za-z0-9]+$/', $sessionId) ||
        !is_string($token) ||
        !preg_match('/^[a-f0-9]{64}$/', $token)
    ) {
        respond(400, ['error' => 'Invalid request.']);
    }

    $privateDir = dirname(__DIR__, 2) . '/private';
    $config = require $privateDir . '/stripe-config.php';
    if (!str_starts_with($config['secret_key'] ?? '', 'sk_test_')) {
        respond(503, ['error'=>'Test configuration required.']);
    }
    require_once $privateDir . '/inventory.php';
    $db = inventoryDatabase($config);
    gsRate($db, 'status:' . gsIp($config), 120, 60);
    $q = $db->prepare('SELECT j.reservation_id FROM checkout_jobs j JOIN reservations r
        ON r.id=j.reservation_id WHERE r.session_id=?');
    $q->execute([$sessionId]);
    $id = $q->fetchColumn();
    if ($id) {
        $job = gsJob($db, $id);
        if (!hash_equals($job['tracking_token'], $token)) {
            respond(403, ['error'=>'Order verification unavailable.']);
        }
        // At most one remote reconciliation per minute; authorize BEFORE calling Stripe.
        if ($job['state'] === 'reserved' && $job['next_check'] <= time()) {
            try { gsSync($db,$config,$id); } catch (Throwable $ignored) {}
        }
        $job = gsJob($db,$id);
        if ($job['state'] === 'released') respond(200, ['status'=>'released']);
    }
    $order = gsOrder($db,$sessionId);
    if (!$order) respond(200, ['status'=>'pending']);

    $expectedHash = $order['tracking_token_hash'] ?? '';

    if (
        !is_string($expectedHash) ||
        $expectedHash === '' ||
        !hash_equals($expectedHash, hash('sha256', $token))
    ) {
        respond(403, ['error' => 'Order verification unavailable.']);
    }

    if (
        ($order['test_mode'] ?? null) !== true ||
        ($order['payment_status'] ?? '') !== 'paid'
    ) {
        respond(200, ['status' => 'pending']);
    }

    respond(200, [
        'status' => 'paid',
        'amount_total' => $order['amount_total'],
        'currency' => $order['currency'],
    ]);

} catch (CheckoutProblem $error) {
    if ($error->httpStatus === 429) header('Retry-After: 60');
    respond($error->httpStatus, ['error'=>$error->getMessage()]);
} catch (Throwable $error) {
    respond(500, ['error' => 'Order verification unavailable.']);
}