from fastapi import FastAPI, UploadFile, File, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from datetime import datetime, timedelta
import os
import json

app = FastAPI()

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

UPLOAD_DIR = "uploadedsss"
META_FILE = "file_meta.json"
os.makedirs(UPLOAD_DIR, exist_ok=True)

if os.path.exists(META_FILE):
    with open(META_FILE, "r") as f:
        file_metadata = json.load(f)
else:
    file_metadata = {}

def save_metadata():
    with open(META_FILE, "w") as f:
        json.dump(file_metadata, f)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"], 
)

@app.post("/upload")
@limiter.limit("5/minute")
async def upload_file(request: Request, file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            buffer.write(chunk)
    
    file_metadata[file.filename] = datetime.utcnow().isoformat()
    save_metadata()

    return {"filename": file.filename}

@app.get("/files")
@limiter.limit("10/minute")
async def list_files(request: Request):
    files = os.listdir(UPLOAD_DIR)
    return {"files": files}

@app.get("/files/{filename}")
@limiter.limit("20/minute")
async def get_file(request: Request, filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        return JSONResponse(status_code=404, content={"detail": "File not found"})

    file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
    if datetime.now() > file_mtime + timedelta(seconds=5):
        return JSONResponse(status_code=403, content={"detail": "File has expired"})

    return FileResponse(path=file_path, filename=filename, media_type='application/octet-stream')

@app.delete("/files")
@limiter.limit("2/minute")
async def delete_all_files(request: Request):
    try:
        for filename in os.listdir(UPLOAD_DIR):
            file_path = os.path.join(UPLOAD_DIR, filename)
            if os.path.isfile(file_path):
                os.remove(file_path)

        global file_metadata
        file_metadata = {}
        if os.path.exists(META_FILE):
            os.remove(META_FILE)

        return {"detail": "All files deleted successfully"}
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": f"Failed to delete files: {str(e)}"})