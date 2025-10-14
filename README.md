# Rashinban 動作確認手順

本プロジェクトは FastAPI 製のバックエンドと Next.js 製のフロントエンドで構成されています。以下ではローカル環境でアップロード〜グラフ表示の流れを確認するまでの手順をまとめています。

## 前提条件
- Python 3.9 以上
- Node.js 18 以上 (Next.js 15 推奨要件)
- `pip`, `npm` (または `yarn`)

## バックエンド (FastAPI)
1. 依存パッケージをインストールします。
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. 開発サーバーを起動します。
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
3. `http://127.0.0.1:8000/docs` にアクセスすると Swagger UI から `/upload-csv` を確認できます。

## フロントエンド (Next.js)
1. 別ターミナルでフロントエンド用の依存パッケージをインストールします。
   ```bash
   cd frontend
   npm install
   ```
2. 開発サーバーを起動します。
   ```bash
   npm run dev
   ```
3. ブラウザで `http://localhost:3000` を開くと、CSV アップロード画面が表示されます。

## 動作確認
1. バックエンドとフロントエンドの両方が起動している状態で、画面の「ファイルを選択」からサンプル CSV をアップロードします。
2. 数値列が含まれている場合、Plotly による折れ線グラフが描画されます。
3. エラーが表示された場合はブラウザのコンソールおよびバックエンドのログを確認してください。
