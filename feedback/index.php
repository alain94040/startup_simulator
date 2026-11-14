<?php
/**
 * foundrs.com/feedback/ — read the players' star ratings and comments.
 *
 * Reads ../score/feedback.jsonl (written by ../feedback.php), newest first,
 * with the average and the spread of stars on top.
 *
 * The comments are private, so the page asks for a key. The first visit
 * creates one in ../score/feedback_key.txt (that directory is the only
 * writable one, and the .htaccess feedback.php writes there keeps it off the
 * web). Read it on the server once, open /feedback/?key=<it>, and a cookie
 * keeps you in on that browser for a year. Delete the file to change the key.
 */

ini_set("display_errors", "0");
header("Content-Type: text/html; charset=utf-8");
header("Cache-Control: no-store, private");
header("X-Robots-Tag: noindex, nofollow");
header("X-Content-Type-Options: nosniff");
header("Referrer-Policy: no-referrer");

const SCORE_DIR = __DIR__ . "/../score";
const DATA_FILE = SCORE_DIR . "/feedback.jsonl";
const KEY_FILE  = SCORE_DIR . "/feedback_key.txt";
const COOKIE    = "plusone_fb_key";

function h($s) { return htmlspecialchars((string) $s, ENT_QUOTES, "UTF-8"); }

// ── the key ──────────────────────────────────────────────────────────────────
if (!is_dir(SCORE_DIR)) @mkdir(SCORE_DIR, 0770, true);
$ht = SCORE_DIR . "/.htaccess";
$deny = "<FilesMatch \"^(feedback\\.jsonl|feedback_key\\.txt)$\">\n  Require all denied\n</FilesMatch>\n";
if (!is_file($ht) || strpos((string) @file_get_contents($ht), "feedback_key") === false) {
  // older feedback.php wrote a rule for the jsonl only; widen it to the key
  @file_put_contents($ht, $deny);
}
$key = is_file(KEY_FILE) ? trim((string) @file_get_contents(KEY_FILE)) : "";
$fresh = false;
if ($key === "") {
  $key = bin2hex(random_bytes(12));
  $fresh = @file_put_contents(KEY_FILE, $key . "\n") !== false;
  if (!$fresh) $key = "";
}

$given = $_GET["key"] ?? ($_COOKIE[COOKIE] ?? "");
$ok = $key !== "" && is_string($given) && hash_equals($key, $given);
if ($ok && isset($_GET["key"])) {
  setcookie(COOKIE, $key, ["expires" => time() + 365 * 86400, "path" => "/feedback", "secure" => !empty($_SERVER["HTTPS"]) || ($_SERVER["HTTP_X_FORWARDED_PROTO"] ?? "") === "https", "httponly" => true, "samesite" => "Strict"]);
  header("Location: ./", true, 303);   // drop the key from the address bar and history
  exit;
}

// ── the data ─────────────────────────────────────────────────────────────────
$rows = [];
if ($ok && is_file(DATA_FILE)) {
  foreach (file(DATA_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
    $r = json_decode($line, true);
    if (is_array($r) && isset($r["rating"])) $rows[] = $r;
  }
  $rows = array_reverse($rows);   // newest first
}
$n = count($rows);
$dist = [5 => 0, 4 => 0, 3 => 0, 2 => 0, 1 => 0];
$sum = 0; $withText = 0;
foreach ($rows as $r) {
  $s = max(1, min(5, (int) $r["rating"]));
  $dist[$s]++; $sum += $s;
  if (trim((string) ($r["comment"] ?? "")) !== "") $withText++;
}
$avg = $n ? $sum / $n : 0;
$onlyText = isset($_GET["comments"]);

$tz = new DateTimeZone("America/Los_Angeles");
function when($ts, $tz) {
  try { return (new DateTime((string) $ts))->setTimezone($tz)->format("M j, Y · g:i A"); }
  catch (Exception $e) { return h($ts); }
}
function stars($n) {
  $n = max(0, min(5, (int) round($n)));
  return '<span class="st" aria-label="' . $n . ' of 5 stars">' . str_repeat("★", $n) . '<span class="off">' . str_repeat("★", 5 - $n) . "</span></span>";
}
?><!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>PlusOne feedback</title>
<style>
  :root { --bg: #f5f5f7; --panel: #fff; --ink: #1d1d1f; --dim: #6e6e73; --line: #e3e3e8; --star: #f2b01e; --off: #d4d4da; --blue: #2f6bff; }
  @media (prefers-color-scheme: dark) { :root { --bg: #111113; --panel: #1c1c1f; --ink: #f2f2f5; --dim: #9a9aa2; --line: #2e2e33; --off: #44444a; --blue: #6b95ff; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 28px 16px 60px; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  .sub { color: var(--dim); margin: 0 0 20px; font-size: 14px; }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 16px 18px; }
  .sum { display: flex; gap: 24px; align-items: center; flex-wrap: wrap; margin-bottom: 18px; }
  .big { font-size: 40px; font-weight: 800; line-height: 1; }
  .big small { font-size: 15px; color: var(--dim); font-weight: 600; }
  .bars { flex: 1; min-width: 220px; display: grid; grid-template-columns: auto 1fr auto; gap: 4px 10px; align-items: center; font-size: 13px; }
  .bar { height: 8px; border-radius: 4px; background: var(--line); overflow: hidden; }
  .bar i { display: block; height: 100%; background: var(--star); }
  .bars .c { color: var(--dim); text-align: right; font-variant-numeric: tabular-nums; }
  .st { color: var(--star); letter-spacing: 1px; white-space: nowrap; }
  .st .off { color: var(--off); }
  .filter { display: flex; gap: 8px; margin: 0 0 12px; font-size: 13px; }
  .filter a { color: var(--dim); text-decoration: none; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--line); }
  .filter a.on { color: var(--ink); border-color: var(--ink); font-weight: 600; }
  .list { display: flex; flex-direction: column; gap: 10px; }
  .row-top { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; align-items: baseline; }
  .meta { color: var(--dim); font-size: 12.5px; }
  .txt { margin: 8px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  .none { color: var(--dim); font-style: italic; font-size: 13px; margin: 6px 0 0; }
  .empty { text-align: center; color: var(--dim); padding: 30px 0; }
  code { background: var(--line); padding: 1px 5px; border-radius: 5px; font-size: 13px; }
  form { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
  input { flex: 1; min-width: 0; font: inherit; padding: 9px 12px; border-radius: 9px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); }
  button { font: inherit; font-weight: 700; padding: 9px 18px; border-radius: 9px; border: 0; background: var(--blue); color: #fff; cursor: pointer; }
</style>
</head>
<body>
<main>
<?php if (!$ok): ?>
  <h1>PlusOne feedback</h1>
  <div class="card">
    <?php if ($key === ""): ?>
      <p>Couldn't create a key: the <code>score/</code> directory isn't writable by the web server. Make it writable (the leaderboard needs that too) and reload.</p>
    <?php else: ?>
      <p>This page is private. <?= $fresh ? "A key was just created" : "The key is" ?> in <code>score/feedback_key.txt</code> on the server. Enter it once and this browser stays signed in for a year.</p>
      <form method="get" action="./">
        <input name="key" type="password" autocomplete="current-password" placeholder="Key" aria-label="Key" autofocus>
        <button>Open</button>
      </form>
      <?php if (isset($_GET["key"])): ?><p class="meta">That key didn't match.</p><?php endif; ?>
    <?php endif; ?>
  </div>
<?php else: ?>
  <h1>PlusOne feedback</h1>
  <p class="sub">Star ratings and comments from the High scores page. Newest first, times in Pacific.</p>

  <div class="card sum">
    <div>
      <div class="big"><?= $n ? number_format($avg, 1) : "–" ?> <small>/ 5</small></div>
      <div><?= stars($avg) ?></div>
      <div class="meta"><?= $n ?> rating<?= $n === 1 ? "" : "s" ?> · <?= $withText ?> with a comment</div>
    </div>
    <div class="bars">
      <?php foreach ($dist as $s => $c): ?>
        <span><?= $s ?> ★</span><span class="bar"><i style="width: <?= $n ? round(100 * $c / $n) : 0 ?>%"></i></span><span class="c"><?= $c ?></span>
      <?php endforeach; ?>
    </div>
  </div>

  <div class="filter">
    <a href="./" class="<?= $onlyText ? "" : "on" ?>">All</a>
    <a href="./?comments" class="<?= $onlyText ? "on" : "" ?>">With a comment</a>
  </div>

  <div class="list">
    <?php $shown = 0; foreach ($rows as $r):
      $c = trim((string) ($r["comment"] ?? ""));
      if ($onlyText && $c === "") continue;
      $shown++;
      $ctx = [];
      if (!empty($r["played"])) $ctx[] = (int) $r["played"] . " saved game" . ((int) $r["played"] === 1 ? "" : "s");
      if (!empty($r["furthest"])) $ctx[] = "reached week " . (int) $r["furthest"];
      if (isset($r["best"]) && $r["best"] !== null) $ctx[] = "best grade " . (int) $r["best"];
      if (!$ctx) $ctx[] = "hadn't played on that browser";
    ?>
      <div class="card">
        <div class="row-top"><?= stars($r["rating"]) ?><span class="meta"><?= when($r["ts"] ?? "", $tz) ?></span></div>
        <?php if ($c !== ""): ?><p class="txt"><?= h($c) ?></p><?php else: ?><p class="none">No comment</p><?php endif; ?>
        <div class="meta"><?= h(implode(" · ", $ctx)) ?></div>
      </div>
    <?php endforeach; ?>
    <?php if (!$shown): ?><div class="card empty"><?= $n ? "No comments yet." : "No ratings yet. They'll show up here as players send them." ?></div><?php endif; ?>
  </div>
<?php endif; ?>
</main>
</body>
</html>
