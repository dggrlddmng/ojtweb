import React, { useState } from "react";

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
    <div>
      <h1>Uploaded files</h1>
      <ul>
        {files.length === 0 && <li>No files uploaded yet.</li>}
        {files.map((file) => (
          <li key={file}>
            {file}{" "}
            <button onClick={() => handleDownload(file)} disabled={downloadingFile === file}>
              {downloadingFile === file ? "Downloading..." : "Download"}
            </button>
          </li>
        ))}
      </ul>

      <input type="file" onChange={handleFileChange} />
      <br />
      <button onClick={handleUpload} disabled={!selectedFile || uploading}>
        {uploading ? "Uploading..." : "Upload"}
      </button>
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