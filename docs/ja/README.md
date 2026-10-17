# Storybook ドキュメント

pieceofcake2/storybook は、CakePHP 2 アプリケーションの Element を [Storybook](https://storybook.js.org/) で
描画します。[Storybook for Symfony](https://github.com/sensiolabs/StorybookBundle) が Twig コンポーネントを
描画するのと同じ仕組みです。描画のエンドポイントを提供する CakePHP プラグインと、Composer パッケージに
含まれる Storybook のフレームワーク (`@pieceofcake2/storybook`、Vite ビルダー) からなります。

> [!IMPORTANT]
> このプラグインは開発専用です。dev の依存としてインストールし (`composer require --dev`)、本番には
> インストールしないでください。描画のエンドポイントは debug モード (`debug` が 1 以上) でだけ動くので、
> Storybook を使うときはアプリケーションを debug モードで起動します。[本番に入れない](#production) を
> 参照してください。

- [仕組み](#how-it-works)
- [要件](#requirements)
- [インストール](#installation)
- [設定](#configuration)
- [ストーリーの書き方](#writing-stories)
- [ローカルでの起動](#running-storybook-locally)
- [アプリケーションの Vite の設定](#vite-config)
- [静的な Storybook の公開](#static-build)
- [本番に入れない](#production)
- [セキュリティ](#security)
- [ストーリーのテスト](#testing-stories)
- [Storybook for Symfony との違い](#differences)
- [制限](#limitations)

<a id="how-it-works"></a>

## 仕組み

ストーリーは Element の名前を指定し、args がそのまま Element の変数になります。

```ts
// stories/components/button.stories.ts
export default { component: 'components/button' };

export const Primary = { args: { label: '応募する', url: '/jobs/1' } };
```

ストーリーを描画するとき、Storybook のプレビューは Element の名前と args をアプリケーションに送ります。

```http
POST /_storybook/render/components-button--primary
Content-Type: application/json

{"element": "components/button", "args": {"label": "応募する", "url": "/jobs/1"}}
```

アプリケーションは、`$this->element('components/button', ['label' => '応募する', 'url' => '/jobs/1'])` と
同じように、アプリケーションの View クラスとヘルパーで Element を描画し、HTML の断片を返します。プレビューは
それを canvas に入れ、含まれるスクリプトを実行します。

送るのは (許可したディレクトリの下の) Element の名前と args だけです。PHP のテンプレートはサンドボックスで
実行できないため、テンプレートやコードをクライアントから受け取ることはありません。複数の Element を
組み合わせるストーリーは、サーバー側のテンプレートを名前で選びます ([ストーリー用のテンプレート](#story-templates)
を参照)。

`storybook dev` では、Storybook の Vite の開発サーバーが `/_storybook/render` を debug モードのアプリケーションに
プロキシします。Storybook を公開するときは、ストーリーを静的ビルドに事前描画するので、アプリケーションは
要りません ([静的な Storybook の公開](#static-build) を参照)。

<a id="requirements"></a>

## 要件

- PHP 8.0 以上、pieceofcake2/cakephp 2.12 以上
- Node.js 20.19 以上、Storybook 10、Vite 5〜8

<a id="installation"></a>

## インストール

1. [Composer](https://getcomposer.org/) で**プラグインを dev の依存としてインストール**します。

   ```bash
   composer require --dev pieceofcake2/storybook
   ```

   このプラグインは `cakephp-plugin` タイプなので、`composer/installers` によってプラグインディレクトリに
   インストールされます (アプリケーションの `composer.json` で `installer-paths` を設定してください)。

   | レイアウト | `installer-paths` | プラグインの場所 |
   | --- | --- | --- |
   | モダン (`config/`, `src/`, `templates/`, `plugins/`) | `"plugins/{$name}/": ["type:cakephp-plugin"]` | `plugins/Storybook/` |
   | レガシー (`app/Config/`, `app/Plugin/`) | `"app/Plugin/{$name}/": ["type:cakephp-plugin"]` | `app/Plugin/Storybook/` |

   通常の依存にはしないでください。本番は `composer install --no-dev` でデプロイし、プラグインを
   インストールしません。公開する Storybook は dev の依存をインストールした場所 (CI など) で事前描画するので、
   それを置く環境にはプラグインは要りません ([静的な Storybook の公開](#static-build) を参照)。

2. `config/bootstrap.php` (レガシーレイアウトでは `app/Config/bootstrap.php`) で、インストールされている
   ときだけ**ルートとあわせてプラグインを読み込みます**。

   ```php
   try {
       CakePlugin::load('Storybook', ['routes' => true]);
   } catch (MissingPluginException) {
       // インストールされていない (composer install --no-dev)
   }
   ```

   `CakePlugin::loadAll()` を使っている場合は、プラグインのオプションを渡します:
   `CakePlugin::loadAll(['Storybook' => ['routes' => true]]);`。`loadAll()` はプラグインディレクトリにある
   プラグインだけを読み込むので、インストールされていなくても失敗しません。プラグインの一覧は
   `_cake_core_` のキャッシュがあればそこから読むため、デプロイのときは (プラグインを変えたときと同じく)
   キャッシュを消してください。

   `'routes' => true` で読み込むと、debug モード (`Configure::read('debug')` が 1 以上) のときだけ、描画の
   ルート (`/_storybook/render/:story`) が追加されます。`debug` が 0 ならルートを追加せず、ルートを読み込んだ
   後に debug モードを切った場合もコントローラーが 404 を返します。

   `config/routes.php` で (既定のものと同じく) `CakePlugin::routes()` を呼んでいる必要があります。

3. npm で **Storybook とフレームワークをインストール**します。フレームワークは npm に公開していないので、
   プラグインのディレクトリから `file:` の依存としてインストールします (パスは Composer がプラグインを
   インストールした場所に合わせてください)。

   ```bash
   npm install --save-dev storybook@^10 vite @storybook/addon-docs \
       @pieceofcake2/storybook@file:plugins/Storybook/storybook
   ```

   ```json
   {
       "devDependencies": {
           "@pieceofcake2/storybook": "file:plugins/Storybook/storybook",
           "@storybook/addon-docs": "^10.6.2",
           "storybook": "^10.6.2",
           "vite": "^8.3.4"
       }
   }
   ```

   フレームワークのビルド済みのファイルはパッケージに含まれているので、ビルドは不要です。Composer で
   プラグインを更新した後は、もう一度 `npm install` を実行してください。

   npm の設定で `ignore-scripts=true` にしていても、Storybook は install スクリプトなしで動きます。

   プラグインをインストールしていない環境 (本番のビルドなど) でも `npm ci` は成功します。npm は `file:` の
   依存をリンクにし、そのリンクを使うのは Storybook だけです。

<a id="configuration"></a>

## 設定

### CakePHP

設定はすべて、`config/bootstrap.php` に (プラグインを読み込む前に) `Storybook` キーで書きます。

```php
Configure::write('Storybook', [
    // ストーリーで描画できる Element のディレクトリ (既定は Elements/components/)
    'elements' => ['components'],
    // ストーリー用のテンプレートのディレクトリ (ビューのパスの下の templates/Stories/)。false で無効
    'templates' => 'Stories',
    // ビューの設定。既定は AppController のもの ($viewClass、$helpers、$ext、$theme)
    'viewClass' => null,
    'helpers' => null,
    'ext' => null,
    'theme' => null,
    // PHP の Warning・Notice (未定義の変数など) で描画を失敗にするか
    'errorsAsExceptions' => true,
]);
```

コントローラーは `AppController` ではなく `Controller` を継承します。描画の依頼では、アプリケーションの
コンポーネント (Security、Session、Auth など) や `AppController` のコールバック (`beforeFilter()` など) を
使わないため、Security コンポーネントの CSRF・フォームの改ざんの検出の対象にならず、セッションも
開始しません。`AppController` からは (インスタンスを作らずに) ビューの設定だけを読み、アプリケーションと同じ
View クラス (`AppView` など)・ヘルパー・`h()` で Element を描画します。通常の依頼にしかないものを必要とする
ヘルパーがある場合は、`Storybook.helpers` を設定してください。

### Storybook

`.storybook/main.ts`:

```ts
import type { StorybookConfig } from '@pieceofcake2/storybook';

const config: StorybookConfig = {
    stories: ['../stories/**/*.stories.ts'],
    addons: ['@storybook/addon-docs'],
    framework: {
        name: '@pieceofcake2/storybook',
        options: {
            // CakePHP のアプリケーションの URL。storybook dev は描画の依頼をここにプロキシする
            server: 'http://localhost:8765',
            // アプリケーションにプロキシするほかのパス (画像、ビルドしたアセットなど)
            proxyPaths: ['/img', '/build'],
            // テンプレートを変えたらストーリーを再読み込みする
            watchPaths: ['templates'],
        },
    },
};

export default config;
```

| オプション | 説明 |
| --- | --- |
| `server` | CakePHP のアプリケーションの URL。`storybook dev` は `/_storybook/render` と `proxyPaths` を、`X-Storybook-Proxy: true` ヘッダーを付けてここにプロキシします。`storybook build` では使いません。 |
| `proxyPaths` | アプリケーションにプロキシするほかのパス (文字列か配列)。Element の HTML が参照する画像やファイルなど。 |
| `watchPaths` | 変更されたら `storybook dev` でストーリーを再読み込みするファイル・ディレクトリ (プロジェクトからの相対パス)。 |
| `excludeVitePlugins` | Storybook では外す、Vite の設定のプラグインの名前 (既定は `['hot-file']`)。[アプリケーションの Vite の設定](#vite-config) を参照。 |
| `builder` | `@storybook/builder-vite` のオプション (`viteConfigPath` など)。 |

`.storybook/preview.ts` では、アセットのエントリーを import して、アプリケーションの CSS と JavaScript を
読み込みます。Vite がアプリケーションの Vite の設定 (Sass、エイリアスなど) で処理し、`storybook dev` では
HMR が効きます。

```ts
import type { Preview } from '@pieceofcake2/storybook';

import '../assets/app.ts';

const preview: Preview = {
    tags: ['autodocs'],
};

export default preview;
```

描画のたびに、ストーリーの HTML に含まれるスクリプトを実行し、`DOMContentLoaded` をもう一度発生させます。
そのため、`DOMContentLoaded` でページを初期化するアプリケーションのスクリプトも、ストーリーごとに動きます。
import したときに一度だけ動くスクリプトは最初のストーリーでしか動かないため、`DOMContentLoaded` で
動かしてください。

プレビューの `<head>` にタグ (Web フォントなど) を足すときは、
[`.storybook/preview-head.html`](https://storybook.js.org/docs/configure/story-rendering) を使います。

アプリケーションがオリジンのルートにない場合 (`App.base` が `/app` など) は、`.storybook/preview.ts` で
描画のエンドポイントの URL を設定します。

```ts
const preview: Preview = {
    parameters: {
        cakephp: { renderUrl: '/app/_storybook/render' },
    },
};
```

<a id="writing-stories"></a>

## ストーリーの書き方

ストーリーは [CSF](https://storybook.js.org/docs/api/csf) で書きます (`stories/components/page_header.stories.ts`
など)。`component` には Element の名前 (`templates/Elements/` の下、拡張子なし) を指定し、args が Element の
変数になります。

```ts
import type { Meta, StoryObj } from '@pieceofcake2/storybook';

const meta = {
    title: 'Components/Page Header',
    component: 'components/page_header',
    args: {
        theme: 'career',
        title: 'キャリア採用',
        crumbs: [['求人一覧', '/career/jobs'], ['フロントオフィス']],
        heading: 'フロントオフィス',
    },
    argTypes: {
        theme: { control: 'select', options: ['fresh', 'career', 'rjet', 'finance', 'parttime', 'contact'] },
    },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutCrumbs: Story = {
    args: { crumbs: [] },
};
```

`StoryObj<typeof meta>` は、ストーリーの args を meta の args の型にします (Element の変数には型がないため、
`argTypes` のものなど、ほかの args も使えます)。args の型で決めるときは `StoryObj<{ label: string }>` の
ように書きます。

Element とテンプレートの名前は `[a-z0-9_/-]+` (小文字、`..` なし) で、Element は許可したディレクトリ
(既定は `components/`) の下にある必要があります。args は JSON で送ります: 文字列、数値、真偽値、`null`、
配列、オブジェクト (PHP の配列になる)。日付は ISO 8601 の文字列で送ります。

`element('components/button')` は文字列の `'components/button'` と同じです。

<a id="story-templates"></a>

### ストーリー用のテンプレート

複数の Element をまとめて見せるとき (カードの一覧、レイアウトの中の Element など) は、サーバー側の
`templates/Stories/` にテンプレートを書き、`template()` で選びます。

```php
<?php
// templates/Stories/job_list.php
/**
 * @var AppView $this
 * @var array $jobs
 */
?>
<div class="l-container">
<?php foreach ($jobs as $job) { ?>
    <?= $this->element('components/job_card', ['job' => $job]) ?>
<?php } ?>
</div>
```

```ts
import { template, type Meta } from '@pieceofcake2/storybook';

export default {
    title: 'Pages/Job List',
    component: template('job_list'),
    args: { jobs: [{ id: 1, title: 'フロントオフィス' }] },
} satisfies Meta;
```

args はテンプレートのビューの変数になり、レイアウトなしで描画します。テンプレートのディレクトリは
`Storybook.templates` で設定します。

### render 関数

ストーリーの `render` から、Element (またはテンプレート) と args を返すこともできます。

```ts
export const Large: Story = {
    render: (args) => ({ element: 'components/button', args: { ...args, large: true } }),
};
```

### アクション

関数の args (`fn()` や `action` の argTypes) はサーバーに送りません。Storybook for Symfony と同じく、
`data-storybook-callbacks` 属性に arg の名前を含む要素のイベントに結び付けます。
`data-storybook-callbacks="increment"` なら、その要素の `increment` イベントで `increment` の arg が
呼ばれます。

```php
<button type="button" data-storybook-callbacks="increment">+1</button>
```

```ts
import { fn } from 'storybook/test';

export default {
    component: 'components/counter',
    args: { increment: fn() },
};
```

Element を変えずに DOM のイベントを記録するには、Storybook の `withActions` デコレーターと
`actions.handles` パラメーターを使います。

```ts
import { withActions } from 'storybook/actions/decorator';

export default {
    component: 'components/button',
    parameters: { actions: { handles: ['click a'] } },
    decorators: [withActions],
};
```

### Docs

`@storybook/addon-docs` を使うと、「Show code」にストーリーを描画する PHP のコード
(`<?= $this->element('components/button', ['label' => '応募する', ...]) ?>` など) が表示されます。

### エラー

アプリケーションがエラーを返すと、ストーリーは失敗として扱われ、canvas にエラーのページが表示されます。
エラーのページは、1 行目がメッセージのコメント (`<!-- Element "components/missing" was not found. -->`) の
HTML で、次のステータスで返ります。

| ステータス | 原因 |
| --- | --- |
| 400 | 不正な JSON、不正な Element・テンプレートの名前、オブジェクトでない args |
| 404 | 許可したディレクトリの外の Element、存在しない Element・テンプレート |
| 405 | POST でない依頼 |
| 500 | 描画中のエラー (`errorsAsExceptions` が true のときの PHP の Warning を含む)。メッセージとトレースを表示 |

<a id="running-storybook-locally"></a>

## ローカルでの起動

(dev の依存をインストールした) アプリケーションを debug モードで起動し、`storybook dev` を実行します。

```bash
# ターミナル 1: CakePHP のアプリケーション
php -d opcache.revalidate_freq=0 -S localhost:8765 -t webroot webroot/index.php

# ターミナル 2: Storybook
npx storybook dev -p 6006
```

http://localhost:6006 を開きます。`opcache.revalidate_freq=0` にすると、テンプレートの変更がすぐに描画に
反映されます (既定の 2 秒のままだと、`watchPaths` による再読み込みで前の版が描画されることがあります)。
`php -S` の代わりにどのサーバー (Docker、symfony CLI など) も使えます。その URL を `server` に設定してください。

`package.json` にスクリプトを足しておくと便利です。

```json
{
    "scripts": {
        "storybook": "storybook dev -p 6006",
        "build-storybook": "storybook build",
        "prerender-storybook": "storybook-cakephp prerender --server http://127.0.0.1:8765"
    }
}
```

<a id="vite-config"></a>

## アプリケーションの Vite の設定

`@storybook/builder-vite` はプロジェクトの Vite の設定 (`vite.config.ts`) を読み込むため、Storybook でも
同じようにアセットを処理します。CakePHP のアプリケーションの設定のうち、次のものは Storybook には
当てはまりません。

- `base`、`build` (`build.rollupOptions.input`、`build.outDir`、`build.manifest` など)、`storybook dev` での
  `server` (`origin`、`port`、`https` など) は、ビルダーが置き換えます。
- [pieceofcake2/vite](https://github.com/pieceofcake2/vite) のドキュメントの `hot-file` プラグインは、
  `webroot/hot` を書き、プロセスの終了時に消します。Storybook で動くと、起動中の Vite の開発サーバーの
  hot ファイルを消してしまい、アプリケーションがそこからアセットを読み込まなくなります。フレームワークは
  `excludeVitePlugins` (既定は `['hot-file']`) に挙げたプラグインを外します。

ほかにも Storybook で動かしてはいけないプラグインがある場合は、その名前を `excludeVitePlugins` に足すか、
Storybook が `'true'` にする `process.env.STORYBOOK` を確かめます。

```ts
// vite.config.ts
export default defineConfig({
    plugins: process.env.STORYBOOK === 'true' ? [] : [hotFile('webroot/hot', devServerUrl)],
});
```

Storybook 用に別の設定ファイルを使うときは、フレームワークのオプションの `builder.viteConfigPath` を
設定します。

<a id="static-build"></a>

## 静的な Storybook の公開

ストーリーは、アプリケーションを debug モードで起動して `storybook dev` で作ります
([ローカルでの起動](#running-storybook-locally) を参照)。Storybook を公開するとき (`debug` を 0 にし、この
プラグインを入れずに動かす開発環境やステージング環境など) は、ストーリーを静的ビルドに事前描画します。
公開した Storybook はストーリーの HTML を自身のファイルから読み込み、アプリケーションには依頼を送りません。

Storybook をビルドし、debug モードで起動したアプリケーションで事前描画します (dev の依存をインストールした
CI など)。

```bash
# debug モードの CakePHP のアプリケーション (dev の依存をインストールしたもの)
php -S 127.0.0.1:8765 -t webroot webroot/index.php &

npx storybook build -o storybook-static
npx storybook-cakephp prerender --server http://127.0.0.1:8765 --dir storybook-static
```

`storybook-cakephp prerender` (フレームワークのコマンド) は、ビルドをローカルのポートで配信し、その
`index.json` のすべてのストーリーをヘッドレスの Chrome で開きます。プレビューの描画の依頼を
(`storybook dev` と同じく `X-Storybook-Proxy: true` ヘッダーを付けて) アプリケーションに転送し、応答を
`<dir>/cakephp-prerendered/<ストーリーの ID>.json` に書き出します。最後に `<dir>/iframe.html` に
`<meta name="storybook-cakephp-prerendered">` を足します。これがあると、プレビューは `iframe.html` から
相対の `cakephp-prerendered/` からストーリーを読み込むので、ビルドはどのパス
(https://dev.example.com/storybook/ など) に置いても動きます。

ビルドしたプレビューがストーリーを描画するので、事前描画の HTML は、ビルドが計算するとおりの args で
作られます: meta とストーリーの args、render 関数、play 関数が設定する args、ストーリーが import した
アセットの URL (`import photo from './photo.jpg'`。ビルドの中を指す) です。ビルドを配信した URL は
プレースホルダーとして保存し、公開した Storybook の URL に置き換えます。

### 必要なもの

- [`playwright-core`](https://www.npmjs.com/package/playwright-core)。フレームワークの optional な
  peer dependency で、ブラウザーはダウンロードしません: `npm install --save-dev playwright-core`
- Chrome か Chromium。`--browser` で指定します。

  | `--browser` | ブラウザー |
  | --- | --- |
  | `chrome` (既定) | インストール済みの Google Chrome (GitHub がホストするランナーにはある) |
  | `msedge`、`chrome-beta` など | ほかのインストール済みのブラウザー (Playwright の [channel](https://playwright.dev/docs/browsers)) |
  | `chromium` | Playwright の Chromium (`npx playwright install chromium`) |
  | パス (`/usr/bin/chromium` など) | Chrome か Chromium の実行ファイル |

  環境変数 `STORYBOOK_CAKEPHP_BROWSER` で既定を変えられます。

### オプション

| オプション | 説明 |
| --- | --- |
| `--server <url>` | debug モードで動いている CakePHP のアプリケーションの URL (必須) |
| `--dir <dir>` | Storybook のビルドのディレクトリ (既定は `storybook-static`) |
| `--browser <browser>` | ブラウザー (既定は `chrome`。上を参照) |
| `--concurrency <n>` | 同時に描画するストーリーの数 (既定は 4) |
| `--timeout <ms>` | 1 つのストーリーのタイムアウト (既定は 30000) |

事前描画できないストーリーがあると、コマンドは失敗します (終了コード 1)。タイムアウトした、例外を投げた、
アプリケーションが debug モードでなく描画のエンドポイントが使えない、などの場合です。アプリケーションが
エラーを返すストーリーは、`storybook dev` で表示されるのと同じくエラーのページで事前描画し、警告として
一覧にします。

`storybook build` はディレクトリを置き換えるので、ビルドのたびに `storybook-cakephp prerender` を実行します。
プラグインを更新した後に `npx storybook-cakephp` が見つからない場合は、もう一度 `npm install` を実行して
ください。

<a id="static-controls"></a>

### 静的な Storybook での Controls

ストーリーはそれぞれの args で事前描画するため、静的な Storybook はほかの args では描画できません。
Controls で args を変えると、canvas にはストーリーの代わりに案内 ("This story cannot be rendered with these
args") が表示されます。args をリセットすると、ストーリーがまた表示されます。それ以外は `storybook dev` と
同じように動きます: ストーリーと Docs は事前描画の HTML を表示し、そのスクリプトが動き、play 関数と
アクション (`data-storybook-callbacks`) が動き、「Show code」には PHP のコードが表示されます。

args は、ストーリーを読み込むたびに同じである必要があります。`new Date()` のような arg は事前描画のときと
公開した Storybook とで変わるため、そのストーリーには案内が表示されます。

### 公開

事前描画したビルドは静的なファイルです。環境のほかの静的ファイルとあわせてデプロイします。開発サーバーの
`/storybook/` の下 (`npx storybook build -o webroot/storybook`。`webroot/storybook/` は `.gitignore` に足す)
や、サイトを配信しているストレージや CDN などです。そこにはプラグインが要らないので、その環境は本番と同じく
`composer install --no-dev` でデプロイできます。Element の HTML は、アプリケーションの画像やアセット
(`/img/logo.svg` など) を URL で参照します。それらが見つかるよう、Storybook はアプリケーションと同じホストに
置きます。

たとえば GitHub Actions では、次のようにします。

```yaml
- run: composer install --no-interaction
- run: npm ci
- name: Build and pre-render Storybook
  run: |
    php -S 127.0.0.1:8765 -t webroot webroot/index.php &
    npx storybook build -o storybook-static
    npx storybook-cakephp prerender --server http://127.0.0.1:8765 --dir storybook-static
  env:
    APP_DEBUG: 1 # アプリケーションで debug モードにする方法に合わせる
# この後、storybook-static/ を開発環境の /storybook/ にアップロードする
```

CI のアプリケーションは、ストーリーの Element を描画できれば十分です。Element が必要とするもの (ヘルパーや
Element がデータベースを読むならデータベースなど) を用意してください。

事前描画していないビルドは、オリジンの `/_storybook/render` に描画の依頼を送ります。プラグインを入れた
debug モードのアプリケーションと同じオリジン (ローカルでアプリケーションが配信する場合など) でだけ動きます。

<a id="production"></a>

## 本番に入れない

描画のエンドポイントは、許可したディレクトリの Element を任意の args で描画するもので、本番向けでは
ありません。debug モードでだけ動き、プラグインは dev の依存として本番にはインストールしません。

- プラグインは `composer require --dev` でインストールし、本番は `composer install --no-dev` で、debug
  モードを切ってデプロイする。本番で `POST /_storybook/render/x` が 404 になることを確かめてください。
- Storybook は事前描画したビルドで公開する ([静的な Storybook の公開](#static-build) を参照)。それを本番に
  デプロイしない。または本番にデプロイするファイルから外す (`webroot/storybook/` など)。

<a id="security"></a>

## セキュリティ

- 受け取るのは Element またはストーリー用のテンプレートの名前と、args だけです。PHP のテンプレートは
  サンドボックスで実行できないため、テンプレートやコードをクライアントから受け取ることはありません
  (Storybook for Symfony は、クライアントが送った Twig のテンプレートをサンドボックスでコンパイルします)。
- 名前は `[a-z0-9_/-]+` の形に限り、`..`、先頭の `/`、プラグインの接頭辞、拡張子は使えません。Element は
  許可したディレクトリ (`Storybook.elements`) の下、テンプレートはテンプレートのディレクトリ
  (`Storybook.templates`。false で無効にできる) の下に限ります。
- args は、キーが PHP の変数名として正しい (`this` でない) JSON のオブジェクトである必要があります。
- エンドポイントはプラグインをインストールした環境に (dev の依存なので本番にはない)、debug モード
  (`debug` が 1 以上。それ以外は 404) のときだけあります。POST だけを受け付け、`Cache-Control: no-store` と
  `X-Robots-Tag: noindex` を返します。debug モードなので、サーバーのエラーのメッセージとトレースを表示します。
- 依頼はフォームを使わずに Storybook から来るため、エンドポイントは Security コンポーネント (CSRF) と
  セッションを使いません。Element が権限のない人にデータを見せてしまう環境にはインストールしないでください。
  Element は依頼の args と、ヘルパーや Element が自分で読むもの (設定、データベースなど) で描画されます。

<a id="testing-stories"></a>

## ストーリーのテスト

ストーリーは、アプリケーションを起動した状態で
[`@storybook/addon-vitest`](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon) で
テストできます (play 関数、インタラクション、アクセシビリティ)。フレームワークは Vitest の Vite のサーバーにも
同じプロキシを足します。

```ts
// vitest.config.ts
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [storybookTest({ configDir: '.storybook' })],
    test: {
        browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
        },
    },
});
```

このパッケージのリポジトリでは、テスト用のアプリケーションのストーリーをこの方法で実行しています。さらに、
アプリケーションが配信するビルドと、アプリケーションを止めて静的なファイルとして配信する事前描画した
ビルドで、すべてのストーリーを確かめています (`tests/test_app/bin/e2e.sh`)。

<a id="differences"></a>

## Storybook for Symfony との違い

| | Storybook for Symfony | pieceofcake2/storybook |
| --- | --- | --- |
| クライアントが送るもの | Twig のテンプレートのソース (サンドボックスでコンパイル) と args | Element (またはサーバー側のストーリー用のテンプレート) の名前と args |
| ストーリーでコンポーネントを組み合わせる | ストーリーの中の Twig のテンプレート | サーバー側のストーリー用のテンプレート (`templates/Stories/`) |
| プレビューの `<head>` | `storybook:generate-preview` コマンドで生成 | `.storybook/preview.ts` で Vite によりアセットを import (と `preview-head.html`) |
| アセット | AssetMapper または Webpack Encore | Vite (アプリケーションの Vite の設定) |
| ビルダー | Webpack と Vite | Vite |
| args processor、コンポーネントのモック、Live Components | 対応 | 未対応 |
| テンプレートの監視 | `additionalWatchPaths` | `watchPaths` |
| 本番 | `prod` 環境で無効 | インストールしない (dev の依存、`composer install --no-dev`) |
| 静的ビルド | アプリケーションへのリバースプロキシの後ろ | アプリケーションと同じオリジン |
| npm パッケージ | Bundle への `file:` の依存 | プラグインへの `file:` の依存 |

<a id="limitations"></a>

## 制限

- args は JSON の値なので、オブジェクト (エンティティや `DateTime` など) を受け取る Element には、それを
  組み立てるストーリー用のテンプレートか、配列を受け取る Element が必要です。
- 依頼は `/_storybook/render` への POST なので、現在の依頼 (URL、クエリ、セッション、ログイン中のユーザー) に
  依存する Element は、その依頼の内容で描画されます。
- 事前描画した Storybook は、ストーリーをそれぞれの args でだけ表示します
  ([静的な Storybook での Controls](#static-controls) を参照)。
- Element のキャッシュ (`element()` の `cache` オプション) とプラグインの Element (`Plugin.name`) には
  対応していません。
- フレームワークは Vite のビルダーだけに対応しています (Webpack には対応していません)。
