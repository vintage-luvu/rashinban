from fastapi import FastAPI, UploadFile, File
import pandas as pd
from openai import OpenAI
import os

app = FastAPI()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.get("/")
def read_root():
    return {"message": "🚀 FastAPI backend is running"}

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    df = pd.read_csv(file.file)
    summary = df.describe(include="all").to_string()

    prompt = f"あなたは経営コンサルタントです。次のデータを分析して3つの改善提案を出してください。\n\n{summary}"
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )
    return {"result": response.choices[0].message.content}
