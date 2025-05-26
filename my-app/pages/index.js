import React, { useState } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';

export default function FileUploaderDownloader({ files }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState(null);
  const [deletingFile, setDeletingFile] = useState(null);

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });
      alert("Upload successful! Refresh the page to see the updated list.");
    } catch (error) {
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(filename) {
    setDownloadingFile(filename);
    try {
      const response = await fetch(`http://localhost:8000/files/${filename}`);
      if (!response.ok) throw new Error("File download failed.");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Download failed.");
    } finally {
      setDownloadingFile(null);
    }
  }

  async function handleDelete(filename) {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;

    setDeletingFile(filename);
    try {
      const response = await fetch(`http://localhost:8000/files/${filename}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Delete failed.");
      alert(`File "${filename}" deleted successfully. Please refresh the page.`);
    } catch (err) {
      alert(`Failed to delete file "${filename}".`);
    } finally {
      setDeletingFile(null);
    }
  }

  function handleFileChange(e) {
    if (e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  }

  return (
    <div className="container mt-4">
      <h1 className="mb-3">Uploaded Files</h1>

      {files.length === 0 ? (
        <p className="text-muted">No files uploaded yet.</p>
      ) : (
        <table className="table table-bordered table-hover">
          <thead className="table-dark">
            <tr>
              <th>Filename</th>
              <th>Date & Time</th>
              <th>Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.filename}>
                <td>{file.filename}</td>
                <td>{new Date(file.upload_time).toLocaleString()}</td>
                <td>{file.content_type}</td>
                <td>
                  <button
                    className="btn btn-primary btn-sm me-2"
                    onClick={() => handleDownload(file.filename)}
                    disabled={downloadingFile === file.filename || deletingFile === file.filename}
                  >
                    {downloadingFile === file.filename ? "Downloading..." : "Download"}
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(file.filename)}
                    disabled={deletingFile === file.filename || downloadingFile === file.filename}
                  >
                    {deletingFile === file.filename ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-4">
        <input type="file" className="form-control mb-2" onChange={handleFileChange} />
        <button
          className="btn btn-success"
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>
    </div>
  );
}

// This must match the backend's return structure (FastAPI)
export async function getServerSideProps() {
  const res = await fetch("http://localhost:8000/files");
  const data = await res.json();

  return {
    props: {
      files: data.files || [], // each file: { filename, upload_time, content_type }
    },
  };
}
