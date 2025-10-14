import os
from fastapi import FastAPI, UploadFile, File
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware
from io import StringIO

app = FastAPI()

# フロントエンドからアクセスできるようにCORSを許可
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番ではフロントエンドのURLを指定
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    contents = await file.read()
    df = pd.read_csv(StringIO(contents.decode("utf-8")))
    # 数値列のみ返す
    numeric_df = df.select_dtypes(include=["int64", "float64"])
    return numeric_df.to_dict(orient="list")



#おまじない
if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
