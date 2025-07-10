import React, { useState, useEffect, useRef, useCallback } from 'react';
import './FileUploadTable.css';

interface FileUpload {
  id: string;
  relativePath: string;
  size: number;
  status: 'Queued' | 'Uploading' | 'Done' | 'Error';
  progress: number;
  uploadDate?: string;
}

interface FileUploadTableProps {
  files: FileUpload[];
}

const FileUploadTable: React.FC<FileUploadTableProps> = ({ files: initialFiles }) => {
  const [files, setFiles] = useState<FileUpload[]>(initialFiles);
  const [isPaused, setIsPaused] = useState(false);
  const [globalProgress, setGlobalProgress] = useState(0);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  const updateGlobalProgress = useCallback((files: FileUpload[]) => {
    console.log('Files in updateGlobalProgress:', files);
    if (files.length === 0) {
      setGlobalProgress(0);
      return;
    }
    const totalProgress = files.reduce((sum, file) => sum + file.progress, 0) / (files.length * 100);
    setGlobalProgress(totalProgress * 100);
  }, []);

  useEffect(() => {
    console.log('initialFiles received in FileUploadTable:', initialFiles);
    setFiles(initialFiles);
    updateGlobalProgress(initialFiles);
  }, [initialFiles, updateGlobalProgress]);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(async () => {
      setFiles((prevFiles: FileUpload[]): FileUpload[] => {
        const updatedFiles: FileUpload[] = prevFiles.map((file) => {
          if (file.status === 'Uploading' && file.progress < 100) {
            const newProgress = Math.min(file.progress + 10, 100);
            const newStatus: FileUpload['status'] = newProgress === 100 ? 'Done' : 'Uploading';

            if (newProgress === 100 && liveRegionRef.current) {
              liveRegionRef.current.textContent = `File ${file.relativePath} upload completed`;
            }
            return { ...file, progress: newProgress, status: newStatus };
          }
          return file;
        });

        updateGlobalProgress(updatedFiles);
        return updatedFiles;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, updateGlobalProgress]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = `Uploads ${isPaused ? 'resumed' : 'paused'}`;
    }
  }, [isPaused]);

  const formatSize = useCallback((size: number): string => {
    return size >= 1024 ? `${(size / 1024).toFixed(2)} MB` : `${size} KB`;
  }, []);

  return (
    <div className="file-upload-container">
      <h2>Upload Progress</h2>
      <div className="global-progress">
        <div className="label">{files.length} of {files.length} files completed</div>
        <div className="progress-bar-container">
          <div
            className="progress-bar"
            style={{ width: `${globalProgress}%` }}
            role="progressbar"
            aria-valuenow={globalProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          ></div>
        </div>
        <div className="status">
          <span>{globalProgress.toFixed(0)}% complete</span>
          <span>{files.length - Number((files.length * globalProgress / 100).toFixed(0))} remaining</span>
        </div>
      </div>

      <h2>Upload Queue</h2>
      <div className="upload-queue-table">
        <table>
          <thead>
            <tr>
              <th>Original Name</th>
              <th>Size</th>
              <th>Status</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.id}>
                <td>{file.relativePath}</td>
                <td>{formatSize(file.size)}</td>
                <td>
                  {file.status === 'Done' ? (
                    <span className="status-complete">
                      <svg viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Complete
                    </span>
                  ) : file.status === 'Error' ? (
                    <span className="status-error">Failed</span>
                  ) : (
                    file.status
                  )}
                </td>
                <td>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar"
                      style={{ width: `${file.progress}%` }}
                      role="progressbar"
                      aria-valuenow={file.progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                  <span className="progress-text">{file.progress}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <button className="upload-button" onClick={togglePause} tabIndex={0} aria-label={isPaused ? 'Resume all uploads' : 'Pause all uploads'}>
          {isPaused ? 'Resume All' : 'Pause All'}
        </button>
      </div>

      <div ref={liveRegionRef} aria-live="polite" aria-atomic="true" className="sr-only"></div>
    </div>
  );
};

export default FileUploadTable;