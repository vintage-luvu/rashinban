from fastapi import FastAPI
import pandas as pd
from openai import OpenAI
import os

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "🚀 FastAPI backend is running"}


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
