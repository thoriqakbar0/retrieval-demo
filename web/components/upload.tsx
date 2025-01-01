"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/utils';

export function Upload() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddAnother, setShowAddAnother] = useState(false);
  const router = useRouter();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    setError(null);
    
    try {
      const file = files[0];
      const allowedTypes = ['.md', '.txt', '.pdf'];
      const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      
      if (!allowedTypes.includes(fileExtension)) {
        throw new Error('Unsupported file type. Please upload a Markdown, Text, or PDF file.');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      
      try {
        // Wait for document to be available
        const checkDocument = async () => {
          const docResponse = await fetch(`${getApiUrl()}/documents/${data.document_id}`);
          if (docResponse.ok) {
            const docData = await docResponse.json();
            if (docData.id) {
              router.push(`/${data.document_id}`);
            } else {
              // Retry after a short delay
              setTimeout(checkDocument, 500);
            }
          } else {
            // Retry after a short delay
            setTimeout(checkDocument, 500);
          }
        };
        
        await checkDocument();
      } catch (docError) {
        console.error('Error checking document:', docError);
        throw new Error('Failed to verify document creation');
      }
      
    } catch (error) {
      console.error('Upload failed:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
      setShowAddAnother(true);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <input
          type="file"
          id="fileInput"
          className="hidden"
          onChange={handleFileInput}
          accept=".md,.txt,.pdf"
        />
        {isUploading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
            <p>Uploading...</p>
          </div>
        ) : (
          <div>
            <p className="text-lg mb-2">Drop files here or click to upload</p>
            <p className="text-sm text-gray-500">Supported formats: .md, .txt, .pdf</p>
          </div>
        )}
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          {error}
          {showAddAnother && (
            <button
              onClick={() => {
                setError(null);
                setShowAddAnother(false);
                router.push('/');
              }}
              className="ml-4 text-sm underline hover:text-red-800"
            >
              Try Another File
            </button>
          )}
        </div>
      )}
    </div>
  );
} 