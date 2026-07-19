<?php
/**
 * Kindred leaderboard — the whole server side.
 *
 * GET  leaderboard.php            → the top-50 board as JSON: [{name,score,won,week,ts}, ...]
 * POST leaderboard.php  {name,score,won,week}   (Content-Type: application/json)
 *      → inserts the run, keeps the top 50, returns {board:[...], rank:<1-based place>}
 *
 * Storage is a single JSON file in the score/ subdirectory (see DATA_FILE) —
 * make only that one directory writable by the web server, nothing else.
 * Writers serialize on a lock file and publish atomically via temp-file+rename,
 * so a reader (or a killed write) never sees a half-written or emptied board.
 * No database, no dependencies — just PHP + the filesystem.
 *
 * The client (v2/game.html) degrades to a localStorage board when this endpoint
 * isn't reachable, so the game is fully playable from file:// with no server.
 */

ini_set("display_errors", "0");   // never let a warning/notice bleed into the JSON body

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");
header("X-Content-Type-Options: nosniff");

const MAX_ENTRIES = 50;
const MAX_BODY    = 2048;   // bytes — a real submission is ~100; anything larger is junk

// Data lives in its own subdirectory so you can make ONLY score/ writable by the
// web server and leave everything else read-only. The file is web-readable as
// score/leaderboard.json (it's public data anyway); if you'd rather it weren't,
// drop a deny rule in the dir (Apache 2.4: `Require all denied`).
const DATA_FILE = __DIR__ . "/score/leaderboard.json";

// Optional write gate: set to a non-empty string to require an X-Kindred-Key
// header on POST (and have the client send it). Honest caveat — a secret shipped
// in public client JS only deters casual curl abuse, not someone who reads the
// page source. Leave "" to disable.
const WRITE_KEY = "";

// JSON_INVALID_UTF8_SUBSTITUTE only exists on PHP 7.2+; degrade gracefully on older.
define("JSON_FLAGS", JSON_UNESCAPED_SLASHES | (defined("JSON_INVALID_UTF8_SUBSTITUTE") ? JSON_INVALID_UTF8_SUBSTITUTE : 0));

function send($data, $code = 200) {
  http_response_code($code);
  echo json_encode($data, JSON_FLAGS);
  exit;
}

/** Sort best-first: higher score wins; equal scores, the earlier submission holds the higher spot. */
function lb_sort(array &$board) {
  usort($board, function ($a, $b) {
    if ($a["score"] !== $b["score"]) return $b["score"] <=> $a["score"];
    return $a["ts"] <=> $b["ts"];
  });
}

/** Read the board under a shared lock. Returns [] if missing or corrupt. */
function lb_read() {
  if (!is_file(DATA_FILE)) return [];
  $fh = @fopen(DATA_FILE, "r");
  if (!$fh) return [];
  $out = [];
  if (flock($fh, LOCK_SH)) {
    $raw = stream_get_contents($fh);
    flock($fh, LOCK_UN);
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) $out = $decoded;
  }
  fclose($fh);
  return $out;
}

$method = $_SERVER["REQUEST_METHOD"] ?? "GET";

if ($method === "GET" || $method === "HEAD") {
  send(array_values(lb_read()));
}
if ($method !== "POST") {
  send(["error" => "method not allowed"], 405);
}

// ── POST ─────────────────────────────────────────────────────────────────────
// Optional shared-secret gate (constant-time compare).
if (WRITE_KEY !== "" && !hash_equals(WRITE_KEY, $_SERVER["HTTP_X_KINDRED_KEY"] ?? "")) {
  send(["error" => "unauthorized"], 401);
}

// Require a JSON content-type: forces a CORS preflight for cross-origin callers
// and blocks trivial cross-site <form> forgery. No form-encoded ($_POST) fallback.
if (stripos($_SERVER["CONTENT_TYPE"] ?? "", "application/json") === false) {
  send(["error" => "content-type must be application/json"], 415);
}

// Reject oversized bodies. Trust neither the header nor its absence: cap the read too.
if ((int) ($_SERVER["CONTENT_LENGTH"] ?? 0) > MAX_BODY) {
  send(["error" => "payload too large"], 413);
}
$in = @fopen("php://input", "r");
$raw_in = $in ? stream_get_contents($in, MAX_BODY + 1) : "";
if ($in) fclose($in);
if (strlen($raw_in) > MAX_BODY) {
  send(["error" => "payload too large"], 413);
}
$body = json_decode($raw_in, true);
if (!is_array($body)) {
  send(["error" => "bad body"], 400);
}

// Validate + normalize, guarding against non-scalar (array) inputs.
$rawScore = $body["score"] ?? null;
if (!is_scalar($rawScore)) send(["error" => "bad score"], 400);
$score = (int) round((float) $rawScore);
if ($score < 0 || $score > 100) send(["error" => "bad score"], 400);

// Names are limited to ASCII letters, digits, and spaces — a tight allowlist.
// Punctuation, markup, control chars, and multibyte bytes are all dropped, so no
// spam links, markup, or encoding tricks can ever reach the board. This is a
// byte-wise filter (no /u), so it needs no mbstring extension and the result is
// pure single-byte ASCII — substr below is safe.
$rawName = $body["name"] ?? "";
if (!is_scalar($rawName)) $rawName = "";
$name = preg_replace('/[^A-Za-z0-9 ]/', "", (string) $rawName) ?? "";
$name = preg_replace('/ +/', " ", $name) ?? "";        // collapse runs of spaces
$name = trim(substr(trim($name), 0, 16));              // trim, cap, re-trim the cut
if ($name === "") $name = "Anonymous";

$rawWeek = $body["week"] ?? 0;
$entry = [
  "name"  => $name,
  "score" => $score,
  "won"   => !empty($body["won"]),
  "week"  => is_scalar($rawWeek) ? (int) $rawWeek : 0,
  // Full-millisecond timestamp as a numeric string. Avoids 32-bit int overflow
  // (older PHP builds cap at ~2.1e9, which truncates a ms epoch); the spaceship
  // operator still compares numeric strings numerically, so tie-break order holds.
  "ts"    => sprintf("%.0f", microtime(true) * 1000),
];

// ── locked read-modify-write; publish atomically via temp file + rename ───────
$dir = dirname(DATA_FILE);
if (!is_dir($dir)) @mkdir($dir, 0770, true);

// Serialize writers on a dedicated lock file. It must be separate from the data
// file: the rename below swaps the data file's inode, which would drop a lock
// held on the data file itself.
$lock = @fopen(DATA_FILE . ".lock", "c");
if (!$lock || !flock($lock, LOCK_EX)) {
  if ($lock) fclose($lock);
  send(["error" => "storage unavailable"], 500);
}

$board = lb_read();   // consistent: no other writer can be inside this section
$board[] = $entry;
lb_sort($board);

// The player's place is their index in the full sorted list (before truncation).
$rank = count($board);
foreach ($board as $i => $row) {
  if ($row["ts"] === $entry["ts"] && $row["score"] === $entry["score"] && $row["name"] === $entry["name"]) {
    $rank = $i + 1;
    break;
  }
}
$board = array_slice($board, 0, MAX_ENTRIES);

$tmp = DATA_FILE . "." . getmypid() . ".tmp";
$ok = @file_put_contents($tmp, json_encode(array_values($board), JSON_FLAGS)) !== false
   && @rename($tmp, DATA_FILE);   // atomic on the same filesystem
if (!$ok) {
  @unlink($tmp);
  flock($lock, LOCK_UN);
  fclose($lock);
  send(["error" => "write failed"], 500);
}

flock($lock, LOCK_UN);
fclose($lock);

send(["board" => array_values($board), "rank" => $rank]);
