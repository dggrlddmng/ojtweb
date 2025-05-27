import React, { useState } from "react";
import '../styles/FileUploaderDownloader.module.css';

export default function FileUploaderDownloader({ files }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState(null);
  const [deletingFile, setDeleteFile] = useState(null);

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
  const confirmDelete = window.confirm(`Are you sure you want to delete "${filename}"?`);
    if (!confirmDelete) return;

    setDeleteFile(filename);

    try {
      const response = await fetch(`http://localhost:8000/files/${filename}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Delete failed.");

      alert("File deleted successfully. Refresh the page to see the updated list.");
    } catch (error) {
      alert("Delete failed.");
    } finally {
      setDeleteFile(null);
    }
  }

  function handleFileChange(e) {
    if (e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  }

  return (
    <div className="container">
      <h2>Upload a File</h2>
      <input className="inputFile" type="file" onChange={handleFileChange} />
      <br />
      <button className="btn-upload" onClick={handleUpload} disabled={!selectedFile || uploading}>
        {uploading ? "Uploading..." : "Upload"}
      </button>
      <div className="card">
        <div className="card-contents">
          <h1>Uploaded files</h1>
            <ul className="file-list-title">
                <h4>File Name</h4>
                <h4>Action</h4>
            </ul>
            <ul className="file-list">
              {files.length === 0 && <li>No files uploaded yet.</li>}
              {files.map((file) => (
                <li key={file} className="file-list-item">
                  <span>{file}</span>
                  <div className="button-group">
                    <button className="btn-download" onClick={() => handleDownload(file)} disabled={downloadingFile === file}>
                      <img src="/DownloadIcon.png" alt="Download Icon" style={{ width: 20, height: 20, marginRight: 6 }} />
                      {downloadingFile === file ? "Downloading..." : "Download"}
                    </button>
                    <button className="btn-delete" onClick={() => handleDelete(file)} disabled={deletingFile === file}>
                      <img src="/DeleteIcon.png" alt="Delete Icon" style={{ width: 20, height: 20, marginRight: 6 }} />
                      {deletingFile === file ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
      </div>
    </div>
  );
}

// This should be in a Next.js page file (like pages/index.js) for SSR to work
export async function getServerSideProps() {
  const res = await fetch("http://localhost:8000/files");
  const data = await res.json();

  return {
    props: {
      files: data.files || [],
    },
  };
}