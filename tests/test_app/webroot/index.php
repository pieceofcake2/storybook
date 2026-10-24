<?php
/**
 * Front controller of the test application, for the end-to-end tests with Storybook
 *
 * php -S localhost:8765 -t tests/test_app/webroot tests/test_app/webroot/index.php
 */

use Composer\InstalledVersions;

if (!defined('DS')) {
    define('DS', DIRECTORY_SEPARATOR);
}
define('ROOT', dirname(__DIR__));
define('APP_DIR', 'src');
define('WWW_ROOT', __DIR__ . DS);
define('VENDORS', dirname(__DIR__, 3) . DS . 'vendor' . DS);

// For the built-in server: serve static files (the CSS and the static build of Storybook)
if (PHP_SAPI === 'cli-server') {
    $path = (string)parse_url((string)$_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if ($path !== '/' && $path !== '/index.php' && file_exists(WWW_ROOT . ltrim($path, '/'))) {
        return false;
    }
    $_SERVER['PHP_SELF'] = '/' . basename(__FILE__);
}

foreach (['cache/models', 'cache/persistent', 'cache/views', 'logs'] as $dir) {
    if (!is_dir(ROOT . DS . 'tmp' . DS . $dir)) {
        mkdir(ROOT . DS . 'tmp' . DS . $dir, 0777, true);
    }
}
define('LOGS', ROOT . DS . 'tmp' . DS . 'logs' . DS);

require_once VENDORS . 'autoload.php';
require_once InstalledVersions::getInstallPath('pieceofcake2/cakephp') . DS . 'src' . DS . 'bootstrap.php';

$dispatcher = new Dispatcher();
$dispatcher->dispatch(
    new CakeRequest(),
    new CakeResponse(),
);
