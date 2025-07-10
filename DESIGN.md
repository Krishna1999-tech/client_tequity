Design Document: Staff Document Upload Tool
Overview
The Staff Document Upload Tool is a React-based web application that allows users to upload multiple staff documents (e.g., PNG files) via drag-and-drop or file selection. The tool supports up to 3 parallel uploads, tracks progress, retries failed uploads, and displays the status in a table. This document outlines the performance optimizations, a proposed enhancement for network-aware pausing, and a key metric for monitoring system performance.
Performance Optimizations
The application includes several optimizations to ensure efficient performance and a smooth user experience:

Efficient State Updates: The FileUpload component uses functional updates (setUploadedFiles((prev) => [...prev, newFile])) to incrementally update the uploadedFiles state, minimizing re-renders.
Lazy Table Rendering: The FileUploadTable component only renders table rows when files are present, reducing unnecessary DOM updates when no files are uploaded.
Progress Simulation: Upload progress is simulated with 10% increments every 500ms to provide smooth visual feedback. A future version plans to use axios for real-time progress tracking.
Memory Cleanup: Once an upload completes or fails, its progress interval is cleared, ensuring efficient memory usage.
Accessible Feedback: An aria-live region (liveRegionRef) announces events like file additions, completions, or failures, improving accessibility for screen reader users.

Pause-on-Network-Drop (Future Enhancement)
To enhance reliability in unstable network conditions, a future version (v2) could automatically pause uploads when the network is slow or offline using the Network Information API. Here’s a simplified implementation plan:
const monitorNetwork = () => {
  const connection = navigator.connection;
  if (!navigator.onLine || connection?.effectiveType === 'slow-2g') {
    pauseUploads(); // Pause all uploads
    alertUser('Network issue detected. Uploads paused.');
    window.addEventListener('online', resumeUploads, { once: true }); // Resume when network is restored
  }
};

This would integrate with a new isPaused state in the FileUpload component to pause and resume uploads, preventing data loss during network issues.
Monitoring Metric: Upload Success Rate
To monitor the tool’s performance, we propose tracking the Upload Success Rate, calculated as:
(successful_uploads / total_upload_attempts) * 100

This metric will be logged to a monitoring system (e.g., Grafana) and segmented by:

File Size: To identify if larger files have higher failure rates.
Time Period: To detect server issues or performance degradation during peak usage.
Retry Attempts: To assess the effectiveness of the retry logic (up to 2 retries for 5xx errors).

This metric provides insights into system reliability and user experience, supporting alerting and capacity planning.