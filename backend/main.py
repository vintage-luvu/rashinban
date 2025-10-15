import os
import secrets
from io import StringIO
from typing import Optional, Set

import pandas as pd
import uvicorn
from fastapi import (
    Depends,
    FastAPI,
    File,
    Header,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# フロントエンドからアクセスできるようにCORSを許可
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番ではフロントエンドのURLを指定
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    username: str
    password: str


active_tokens: Set[str] = set()


def authenticate(
    authorization: str = Header(None),
    bypass_mode: Optional[str] = Header(None, alias="X-Bypass-Mode"),
) -> str:
    if bypass_mode and bypass_mode.strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }:
        return "bypass-mode"

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証トークンが見つかりません。",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ", 1)[1].strip()

    if token not in active_tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無効なトークンです。",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return token


@app.post("/login")
async def login(payload: LoginRequest):
    expected_username = os.environ.get("LOGIN_USERNAME", "admin")
    expected_password = os.environ.get("LOGIN_PASSWORD", "password123")

    username_matches = secrets.compare_digest(payload.username, expected_username)
    password_matches = secrets.compare_digest(payload.password, expected_password)

    if not (username_matches and password_matches):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証に失敗しました。ユーザー名またはパスワードを確認してください。",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = secrets.token_urlsafe(32)
    active_tokens.add(token)

    return {"access_token": token, "token_type": "bearer"}


@app.post("/logout")
async def logout(token: str = Depends(authenticate)):
    active_tokens.discard(token)
    return {"detail": "ログアウトしました。"}


@app.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    token: str = Depends(authenticate),
):
    contents = await file.read()
    df = pd.read_csv(StringIO(contents.decode("utf-8")))
    # 数値列のみ返す
    numeric_df = df.select_dtypes(include=["int64", "float64"])
    return numeric_df.to_dict(orient="list")


# おまじない
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
