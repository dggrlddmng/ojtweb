from fastapi import FastAPI, UploadFile, File, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from datetime import datetime, timedelta
import os
import json
import mimetypes

app = FastAPI()

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

UPLOAD_DIR = "uploads"
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
async def upload_file(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        while chunk := await file.read(1024 * 1024):
            buffer.write(chunk)

    # Save current UTC time as ISO string
    file_metadata[file.filename] = datetime.utcnow().isoformat()
    with open(META_FILE, "w") as f:
        json.dump(file_metadata, f)

    return {"filename": file.filename}

@app.get("/files")
async def list_files(request: Request):
    try:
        files_list = []
        for filename in os.listdir(UPLOAD_DIR):
            filepath = os.path.join(UPLOAD_DIR, filename)
            if os.path.isfile(filepath):
                upload_time = file_metadata.get(filename)
                # Guess MIME type based on file extension
                content_type, _ = mimetypes.guess_type(filename)
                if content_type is None:
                    content_type = "application/octet-stream"
                files_list.append({
                    "filename": filename,
                    "upload_time": upload_time,
                    "content_type": content_type,
                })
        return {"files": files_list}
    except Exception as e:
        return JSONResponse(status_code=500, content={"detail": f"Internal server error: {str(e)}"})

@app.get("/files/{filename}")
@limiter.limit("20/minute")
async def get_file(request: Request, filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        return JSONResponse(status_code=404, content={"detail": "File not found"})

    file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))  # Use UTC time
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
    
@app.delete("/files/{filename}")
async def delete_file(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        return JSONResponse(status_code=404, detail="File not found")

    os.remove(file_path)
    if filename in file_metadata:
        del file_metadata[filename]
        save_metadata()
    return {"detail": "File deleted successfully"}