<?php
/**
 * PlusOne player feedback: the star rating + comment on the High scores page.
 *
 * POST feedback.php  {rating:1-5, comment?:string, played?:int, furthest?:int, best?:int}
 *      (Content-Type: application/json) → {ok:true}
 *
 * Each submission is appended as one JSON line to score/feedback.jsonl (the
 * same writable directory the leaderboard uses, so no new permissions). The
 * file is kept private: on first write this script drops a score/.htaccess
 * that denies web access to it (Apache 2.4), unless one already exists.
 * Read it over SSH/FTP, or `tail score/feedback.jsonl`.
 *
 * There is no GET: feedback is write-only from the web.
 */

ini_set("display_errors", "0");

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");
header("X-Content-Type-Options: nosniff");

const DATA_FILE   = __DIR__ . "/score/feedback.jsonl";
const MAX_BODY    = 4096;              // a real submission is well under 2KB
const MAX_COMMENT = 1000;              // characters kept from the comment
const MAX_FILE    = 5 * 1024 * 1024;   // stop growing past 5MB (spam guard)

function send($data, $code = 200) {
  http_response_code($code);
  echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  exit;
}

if (($_SERVER["REQUEST_METHOD"] ?? "GET") !== "POST") send(["error" => "method not allowed"], 405);
if (stripos($_SERVER["CONTENT_TYPE"] ?? "", "application/json") === false) send(["error" => "content-type must be application/json"], 415);
if ((int) ($_SERVER["CONTENT_LENGTH"] ?? 0) > MAX_BODY) send(["error" => "payload too large"], 413);

$in = @fopen("php://input", "r");
$raw = $in ? stream_get_contents($in, MAX_BODY + 1) : "";
if ($in) fclose($in);
if (strlen($raw) > MAX_BODY) send(["error" => "payload too large"], 413);
$body = json_decode($raw, true);
if (!is_array($body)) send(["error" => "bad body"], 400);

$rating = $body["rating"] ?? null;
if (!is_scalar($rating)) send(["error" => "bad rating"], 400);
$rating = (int) $rating;
if ($rating < 1 || $rating > 5) send(["error" => "bad rating"], 400);

// The comment is stored as text, never rendered on a page. Drop control
// characters (keep newlines and tabs) and invalid UTF-8, then cap its length.
$comment = $body["comment"] ?? "";
if (!is_scalar($comment)) $comment = "";
$comment = (string) $comment;
if (function_exists("mb_convert_encoding")) $comment = mb_convert_encoding($comment, "UTF-8", "UTF-8");
$comment = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', "", $comment) ?? "";
$comment = trim(function_exists("mb_substr") ? mb_substr($comment, 0, MAX_COMMENT, "UTF-8") : substr($comment, 0, MAX_COMMENT));

$int = function ($v) { return is_scalar($v) ? max(0, min(100000, (int) $v)) : 0; };
$entry = [
  "ts"      => gmdate("c"),
  "rating"  => $rating,
  "comment" => $comment,
  "played"  => $int($body["played"] ?? 0),     // saved games on that browser
  "furthest"=> $int($body["furthest"] ?? 0),   // the furthest week any of them reached
  "best"    => isset($body["best"]) && is_scalar($body["best"]) ? $int($body["best"]) : null,   // their best grade there, if any
];

$dir = dirname(DATA_FILE);
if (!is_dir($dir)) @mkdir($dir, 0770, true);
// Keep the file off the web: the leaderboard's JSON in this directory is
// public, the comments are not.
$ht = $dir . "/.htaccess";
if (!is_file($ht)) @file_put_contents($ht, "<Files \"feedback.jsonl\">\n  Require all denied\n</Files>\n");

clearstatcache();
if (is_file(DATA_FILE) && filesize(DATA_FILE) > MAX_FILE) send(["error" => "full"], 507);
$line = json_encode($entry, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "\n";
if (@file_put_contents(DATA_FILE, $line, FILE_APPEND | LOCK_EX) === false) send(["error" => "write failed"], 500);

send(["ok" => true]);
