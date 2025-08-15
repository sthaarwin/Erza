import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, Loader2 } from "lucide-react";

interface FileUploadProps {
  sessionId: string;
  onFileUploaded: (file: { id: string; filename: string; summary: string }) => void;
  onClose: () => void;
}

export default function FileUpload({ sessionId, onFileUploaded, onClose }: FileUploadProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sessionId", sessionId);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      onFileUploaded(data);
      setUploadProgress(0);
      toast({
        title: "Success",
        description: `File "${data.filename}" uploaded and processed successfully.`,
      });
    },
    onError: (error: Error) => {
      setUploadProgress(0);
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid File Type",
          description: "Only PDF files are supported.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Maximum file size is 10MB.",
          variant: "destructive",
        });
        return;
      }

      uploadMutation.mutate(file);
    }
  }, [uploadMutation, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    disabled: uploadMutation.isPending,
  });

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-ctp-text">Upload PDF</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-ctp-overlay1 hover:text-ctp-text"
          data-testid="button-close-file-upload"
        >
          <X size={16} />
        </Button>
      </div>

      <div
        {...getRootProps()}
        className={`p-6 border-2 border-dashed rounded-lg text-center transition-colors duration-200 cursor-pointer ${
          isDragActive
            ? "border-ctp-mauve bg-ctp-mauve/10"
            : "border-ctp-surface1 hover:border-ctp-surface2"
        } ${uploadMutation.isPending ? "pointer-events-none opacity-50" : ""}`}
        data-testid="dropzone-file-upload"
      >
        <input {...getInputProps()} data-testid="input-file-upload" />
        
        {uploadMutation.isPending ? (
          <div className="space-y-2">
            <Loader2 className="mx-auto h-8 w-8 text-ctp-mauve animate-spin" />
            <p className="text-ctp-subtext1 text-sm">Processing PDF...</p>
            <p className="text-ctp-overlay0 text-xs">Extracting text and generating summary</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="mx-auto h-8 w-8 text-ctp-overlay0" />
            <p className="text-ctp-subtext1 text-sm">
              {isDragActive ? "Drop the PDF here" : "Drop PDF files here or click to upload"}
            </p>
            <p className="text-ctp-overlay0 text-xs">Maximum file size: 10MB</p>
          </div>
        )}
      </div>

      {uploadProgress > 0 && (
        <div className="mt-2">
          <div className="flex items-center space-x-2">
            <FileText size={16} className="text-ctp-mauve" />
            <div className="flex-1">
              <div className="w-full bg-ctp-surface0 rounded-full h-2">
                <div
                  className="bg-ctp-mauve h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
            <span className="text-xs text-ctp-overlay0">{uploadProgress}%</span>
          </div>
        </div>
      )}
    </div>
  );
}