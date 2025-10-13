import os
from fastapi import FastAPI
import pandas as pd

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Backend is running!"}

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
