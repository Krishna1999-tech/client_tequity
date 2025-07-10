import React, { useState, useEffect, useRef, type DragEvent } from 'react';
import './FileUpload.css';
import FileUploadTable from './FileUploadTable/FileUploadTable';

interface ApiFile {
  _id: string;
  originalName: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadDate: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface FileUpload {
  id: string;
  relativePath: string;
  size: number;
  status: 'Queued' | 'Uploading' | 'Done' | 'Error';
  progress: number;
  uploadDate?: string;
}

const FileUpload: React.FC = () => {
  const [queue, setQueue] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploadStatus, setUploadStatus] = useState<{ [key: string]: string }>({});
  const [uploadedFiles, setUploadedFiles] = useState<FileUpload[]>([]);
  const API_URL = 'http://localhost:3000/api/documents';
  const MAX_PARALLEL_UPLOADS = 3;
  const MAX_RETRIES = 2;
  const liveRegionRef = useRef<HTMLDivElement>(null);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.items)
      .filter((item) => item.kind === 'file')
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    setQueue((prevQueue) => [...prevQueue, ...files]);
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = `${files.length} file(s) added for upload`;
    }
  };

  const handleChooseFiles = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        const files = Array.from(target.files);
        setQueue((prevQueue) => [...prevQueue, ...files]);
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = `${files.length} file(s) added for upload`;
        }
      }
    };
    input.click();
  };

  const uploadFile = async (file: File, retries = 0) => {
    const formData = new FormData();
    const rootDirectory = file.webkitRelativePath?.split('/')[0] || 'root';
    formData.append('documents', file);
    formData.append('originalFilename', file.name);
    formData.append('rootDirectory', rootDirectory);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const rawData = await response.json();
      console.log('Raw API Response:', rawData);
      const data = rawData as ApiFile;
      const newFileUpload = {
        id: data._id,
        relativePath: file.webkitRelativePath || file.name,
        size: typeof data.size === 'number' && data.size > 0 ? data.size : file.size,
        status: 'Done' as const,
        progress: 100,
        uploadDate: data.uploadDate,
      };
      console.log('Adding to uploadedFiles:', newFileUpload);
      setUploadedFiles((prev) => [...prev, newFileUpload]);
      setUploadStatus((prev) => ({ ...prev, [file.name]: 'Completed' }));
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = `Upload completed for ${file.name}`;
      }
    } catch (error) {
      if (retries < MAX_RETRIES && error instanceof Error && error.message.includes('5')) {
        console.log(`Retrying upload for ${file.name}, attempt ${retries + 1}`);
        await uploadFile(file, retries + 1);
      } else {
        const newFileUpload = {
          id: crypto.randomUUID(),
          relativePath: file.webkitRelativePath || file.name,
          size: file.size,
          status: 'Error' as const,
          progress: uploadProgress[file.name] || 0,
          uploadDate: new Date().toISOString(),
        };
        console.log('Adding to uploadedFiles (error):', newFileUpload);
        setUploadStatus((prev) => ({
          ...prev,
          [file.name]: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }));
        setUploadedFiles((prev) => [...prev, newFileUpload]);
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = `Upload failed for ${file.name}`;
        }
        console.error(`Upload failed for ${file.name}:`, error);
      }
    }
  };

  const startUploads = async () => {
    if (queue.length === 0) return;

    const filesToUpload = [...queue];
    let activeUploads = 0;
    let index = 0;

    const uploadNext = async () => {
      while (index < filesToUpload.length && activeUploads < MAX_PARALLEL_UPLOADS) {
        const file = filesToUpload[index];
        index++;
        activeUploads++;

        setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));
        setUploadStatus((prev) => ({ ...prev, [file.name]: 'Uploading' }));

        const uploadInterval = setInterval(() => {
          setUploadProgress((prev) => {
            const current = prev[file.name] || 0;
            if (current >= 100) {
              clearInterval(uploadInterval);
              return prev;
            }
            return { ...prev, [file.name]: Math.min(current + 10, 100) };
          });
        }, 500);

        await uploadFile(file).finally(() => {
          clearInterval(uploadInterval);
          setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
          activeUploads--;
          uploadNext();
        });
      }

      if (index >= filesToUpload.length && activeUploads === 0) {
        setQueue([]);
      }
    };

    uploadNext();
  };

  useEffect(() => {
    console.log('uploadedFiles updated:', uploadedFiles);
    if (queue.length > 0) startUploads();
  }, [queue]);

  return (
    <div className="upload-container">
      <h2>Staff Document Upload</h2>
      <p>Bulk upload documents with progress tracking and retry functionality</p>
      <div className="drop-zone" onDragOver={handleDragOver} onDrop={handleDrop}>
        <span className="upload-icon">↑</span>
        <p>Upload Staff Documents</p>
        <p>Drag and drop folders or files, or click to browse</p>
        <div>
          <button onClick={handleChooseFiles} className="choose-files" aria-label="Choose files to upload">
            Choose Files
          </button>
        </div>
      </div>
      <FileUploadTable files={uploadedFiles} />
      <div ref={liveRegionRef} aria-live="polite" aria-atomic="true" className="sr-only"></div>
    </div>
  );
};

export default FileUpload;