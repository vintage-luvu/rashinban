import os
from fastapi import FastAPI
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# フロントエンドからアクセスできるようにCORSを許可
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番ではフロントエンドのURLを指定
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/data")
def get_data():
    # サンプルデータを返す
    return [{"x": 1, "y": 2}, {"x": 2, "y": 3}, {"x": 3, "y": 5}]







#おまじない
if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
