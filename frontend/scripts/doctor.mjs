#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function main() {
  const pkgPath = resolve(process.cwd(), "package.json");
  let pkgRaw;
  try {
    pkgRaw = await readFile(pkgPath, "utf8");
  } catch (err) {
    console.error("❌ package.json が見つかりません。`cd frontend` でフロントエンドのディレクトリに移動してから実行してください。");
    process.exit(1);
  }

  let pkg;
  try {
    pkg = JSON.parse(pkgRaw);
  } catch (err) {
    console.error("❌ package.json の JSON 解析に失敗しました。ファイルの構文エラーを修正してください。");
    process.exit(1);
  }

  const problems = [];

  if (!pkg.scripts || typeof pkg.scripts.dev !== "string") {
    problems.push("scripts.dev が定義されていません。`\"dev\": \"next dev\"` を追加してください。");
  }

  if (!pkg.dependencies || typeof pkg.dependencies.next !== "string") {
    problems.push("Next.js の依存関係が見つかりません。`npm install next react react-dom` を実行してください。");
  }

  if (!pkg.dependencies || typeof pkg.dependencies.react !== "string") {
    problems.push("React の依存関係が不足しています。`npm install react` を実行してください。");
  }

  if (!pkg.dependencies || typeof pkg.dependencies["react-dom"] !== "string") {
    problems.push("React DOM の依存関係が不足しています。`npm install react-dom` を実行してください。");
  }

  const expectedName = "rashinban-frontend";
  if (pkg.name !== expectedName) {
    problems.push(`package.json の name が \"${pkg.name}\" になっています。正しいディレクトリか、ファイルが上書きされていないか確認してください (期待値: \"${expectedName}\")。`);
  }

  const nodeVersion = process.versions.node;
  const [major, minor] = nodeVersion.split(".").map((part) => parseInt(part, 10));
  if (Number.isFinite(major) && Number.isFinite(minor)) {
    if (major < 18 || (major === 18 && minor < 17)) {
      problems.push(`Node.js ${nodeVersion} では Next.js の開発サーバーが動作しない可能性があります。Node.js 18.17 以上に更新してください。`);
    }
  }

  if (problems.length > 0) {
    console.error("⛔ `npm run dev` を阻害する設定上の問題を検出しました:");
    for (const message of problems) {
      console.error(`  - ${message}`);
    }
    process.exit(1);
  }

  console.log("✅ package.json の検証に成功しました。`npm run dev` を実行できるはずです。");
}

main().catch((err) => {
  console.error("❌ 想定外のエラーが発生しました:");
  console.error(err);
  process.exit(1);
});
