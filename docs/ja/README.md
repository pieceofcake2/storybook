# Storybook ドキュメント

pieceofcake2/storybook は、CakePHP 2 アプリケーションの Element を [Storybook](https://storybook.js.org/) で
描画します。[Storybook for Symfony](https://github.com/sensiolabs/StorybookBundle) が Twig コンポーネントを
描画するのと同じ仕組みです。描画のエンドポイントを提供する CakePHP プラグインと、Composer パッケージに
含まれる Storybook のフレームワーク (`@pieceofcake2/storybook`、Vite ビルダー) からなります。

> [!IMPORTANT]
> このプラグインは開発専用です。dev の依存としてインストールし (`composer require --dev`)、本番には
> インストールしないでください。プラグインをインストールしてルートとあわせて読み込んだ環境では、描画の
> エンドポイントが使えます。[本番に入れない](#production) を参照してください。

- [仕組み](#how-it-works)
- [要件](#requirements)
- [インストール](#installation)
- [設定](#configuration)
- [ストーリーの書き方](#writing-stories)
- [ローカルでの起動](#running-storybook-locally)
- [アプリケーションの Vite の設定](#vite-config)
- [静的ビルドと公開](#static-build)
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

`storybook dev` では、Storybook の Vite の開発サーバーが `/_storybook/render` をアプリケーションにプロキシします。
静的ビルド (`storybook build`) はアプリケーションと同じオリジンに置き、そのオリジンの `/_storybook/render` に
描画の依頼を送ります。

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
   インストールしません。`--no-dev` でデプロイする開発環境に静的ビルドを公開するときは、その環境のビルドで
   だけパッケージを追加します ([静的ビルドと公開](#static-build) を参照)。

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

   `'routes' => true` で読み込むと、描画のルート (`/_storybook/render/:story`) が追加されます。ほかに
   切り替えはありません。

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
    args: { crumbs: null },
};
```

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
| 500 | 描画中のエラー (`errorsAsExceptions` が true のときの PHP の Warning を含む)。メッセージとトレースは debug モードでだけ表示 |

<a id="running-storybook-locally"></a>

## ローカルでの起動

(dev の依存をインストールした) アプリケーションを起動し、`storybook dev` を実行します。

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
        "build-storybook": "storybook build"
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

## 静的ビルドと公開

`storybook build` は静的な Storybook を書き出します (既定は `storybook-static/`)。これをアプリケーションと
同じオリジンの任意のパス (https://dev.example.com/storybook/ など) に置きます。静的ビルドは (自身のパスでは
なく) オリジンの `/_storybook/render` に描画の依頼を送り、Element の HTML は同じオリジンのアプリケーションの
画像やアセットを参照します。その環境のアプリケーションには、プラグインをインストールして読み込んでおきます。

たとえば、本番と同じく `composer install --no-dev` でデプロイする開発環境でだけ Storybook を公開するには、
次のようにします。

1. 開発環境のビルドでだけ、`composer install` の後にこのパッケージを `composer.lock` のバージョンで
   追加します。

   ```bash
   composer install --no-dev --no-interaction
   composer require "pieceofcake2/storybook:$(jq -r '.["packages-dev"][] | select(.name == "pieceofcake2/storybook") | .version' composer.lock)" \
       --update-no-dev --no-interaction
   ```

   `composer require` は、ビルドの `composer.json` と `composer.lock` でパッケージを `require` に移し
   (これらはコミットしません)、依存 (`composer/installers` など) とあわせて lock のバージョンで
   インストールします。ほかのパッケージは lock のバージョンのままで、ほかの dev の依存はインストール
   されません。オートローダーを作り直すので、`composer install` と同じオプション
   (`--optimize-autoloader`、`--classmap-authoritative` など) を渡してください。

   アプリケーションはインストールされているときだけプラグインを読み込むので ([インストール](#installation)
   を参照)、本番と開発環境で同じ `config/bootstrap.php` を使えます。

2. 開発環境へのデプロイで Storybook をビルドし、`/storybook/` で配信します。webroot に書き出す
   (`npx storybook build -o webroot/storybook`。`webroot/storybook/` は `.gitignore` に足す) か、同じホストで
   サイトの静的ファイルを配信しているストレージや CDN にアップロードします。

3. 本番では、パッケージの追加も Storybook のビルドとデプロイもしません (次の節を参照)。

開発環境に Basic 認証がある場合も、描画の依頼は同じオリジンなので、ブラウザーが認証情報を送ります。

<a id="production"></a>

## 本番に入れない

描画のエンドポイントは、許可したディレクトリの Element を任意の args で描画するもので、本番向けでは
ありません。プラグインには無効にする切り替えはなく、dev の依存として本番にはインストールしません。

- プラグインは `composer require --dev` でインストールし、本番は `composer install --no-dev` で
  デプロイする。本番のビルドではパッケージを追加しない ([静的ビルドと公開](#static-build) を参照)。
  本番で `POST /_storybook/render/x` が 404 になることを確かめてください。
- 静的ビルドを本番にデプロイしない。または本番にデプロイするファイルから外す (`webroot/storybook/` など)。

<a id="security"></a>

## セキュリティ

- 受け取るのは Element またはストーリー用のテンプレートの名前と、args だけです。PHP のテンプレートは
  サンドボックスで実行できないため、テンプレートやコードをクライアントから受け取ることはありません
  (Storybook for Symfony は、クライアントが送った Twig のテンプレートをサンドボックスでコンパイルします)。
- 名前は `[a-z0-9_/-]+` の形に限り、`..`、先頭の `/`、プラグインの接頭辞、拡張子は使えません。Element は
  許可したディレクトリ (`Storybook.elements`) の下、テンプレートはテンプレートのディレクトリ
  (`Storybook.templates`。false で無効にできる) の下に限ります。
- args は、キーが PHP の変数名として正しい (`this` でない) JSON のオブジェクトである必要があります。
- エンドポイントはプラグインをインストールした環境にだけあり (dev の依存なので本番にはない)、POST だけを
  受け付け、`Cache-Control: no-store` と `X-Robots-Tag: noindex` を返します。サーバーのエラーのメッセージとトレースは debug モードでだけ表示します。
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

このパッケージのリポジトリでは、テスト用のアプリケーションのストーリーをこの方法で実行し、さらに
アプリケーションが配信する静的ビルドのすべてのストーリーを確かめています (`tests/test_app/bin/e2e.sh`)。

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
- Element のキャッシュ (`element()` の `cache` オプション) とプラグインの Element (`Plugin.name`) には
  対応していません。
- フレームワークは Vite のビルダーだけに対応しています (Webpack には対応していません)。
