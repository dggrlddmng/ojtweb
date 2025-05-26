import React, { useState } from "react";
import 'bootstrap/dist/css/bootstrap.min.css'; // If using npm install for Bootstrap

export default function FileUploaderDownloader({ files }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState(null);

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
              <th scope="col">Filename</th>
              <th scope="col">Download</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file}>
                <td>{file}</td>
                <td>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleDownload(file)}
                    disabled={downloadingFile === file}
                  >
                    {downloadingFile === file ? "Downloading..." : "Download"}
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

// For SSR (Next.js only)
export async function getServerSideProps() {
  const res = await fetch("http://localhost:8000/files");
  const data = await res.json();

  return {
    props: {
      files: data.files || [],
    },
  };
}
