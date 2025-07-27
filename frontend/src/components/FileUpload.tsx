"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, AlertCircle } from "lucide-react";
import axios from "axios";

interface FileUploadProps {
	onUploadSuccess: (data: unknown, sessionName: string) => void;
	loading: boolean;
	setLoading: (loading: boolean) => void;
}

interface UploadedFiles {
	logFile: File | null;
	dataFile: File | null;
}

export function FileUpload({
	onUploadSuccess,
	loading,
	setLoading,
}: FileUploadProps) {
	const [files, setFiles] = useState<UploadedFiles>({
		logFile: null,
		dataFile: null,
	});
	const [uploadProgress, setUploadProgress] = useState(0);
	const [processingState, setProcessingState] = useState<"uploading" | "processing" | null>(null);
	const [error, setError] = useState<string | null>(null);

	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			setError(null);

			const newFiles = { ...files };

			acceptedFiles.forEach((file) => {
				if (file.name.endsWith(".log")) {
					newFiles.logFile = file;
				} else if (file.name.endsWith(".data")) {
					newFiles.dataFile = file;
				}
			});

			setFiles(newFiles);
		},
		[files]
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"text/plain": [".log"],
			"application/octet-stream": [".data"],
		},
		multiple: true,
	});

	const removeFile = (type: "log" | "data") => {
		setFiles((prev) => ({
			...prev,
			[`${type}File`]: null,
		}));
	};

	const uploadFiles = async () => {
		if (!files.logFile || !files.dataFile) {
			setError("Please select both .log and .data files");
			return;
		}

		setLoading(true);
		setUploadProgress(0);
		setProcessingState("uploading");
		setError(null);

		try {
			const formData = new FormData();
			formData.append("log_file", files.logFile);
			formData.append("data_file", files.dataFile);

			const response = await axios.post(
				"http://localhost:8000/upload",
				formData,
				{
					headers: {
						"Content-Type": "multipart/form-data",
					},
					onUploadProgress: (progressEvent) => {
						if (progressEvent.total) {
							const progress = Math.round(
								(progressEvent.loaded * 100) / progressEvent.total
							);
							setUploadProgress(progress);
						}
					},
				}
			);

			// Upload completed, now processing
			setProcessingState("processing");
			setUploadProgress(100);

			// Wait for response (backend processes synchronously)
			// Extract session name from response
			const sessionName = response.data.session_name || "";
			onUploadSuccess(response.data, sessionName);
		} catch (err: unknown) {
			const errorMessage =
				err instanceof Error ? err.message : "Unknown error occurred";
			setError(
				errorMessage ||
					"Failed to upload files. Make sure the backend is running on http://localhost:8000"
			);
		} finally {
			setLoading(false);
			setUploadProgress(0);
			setProcessingState(null);
		}
	};

	const canUpload = files.logFile && files.dataFile && !loading;

	return (
		<div className="space-y-6">
			{/* File Drop Zone */}
			<div
				{...getRootProps()}
				className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
					isDragActive
						? "border-blue-500 bg-blue-50"
						: "border-gray-300 hover:border-gray-400"
				}`}
			>
				<input {...getInputProps()} />
				<Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
				{isDragActive ? (
					<p className="text-blue-600">Drop the files here...</p>
				) : (
					<div>
						<p className="text-gray-600 mb-2">
							Drag & drop your Paparazzi log files here, or click to select
						</p>
						<p className="text-sm text-gray-500">
							Upload both .log and .data files
						</p>
					</div>
				)}
			</div>

			{/* Selected Files */}
			{(files.logFile || files.dataFile) && (
				<div className="space-y-3">
					<h3 className="font-medium">Selected Files:</h3>

					{files.logFile && (
						<Card className="p-3">
							<div className="flex items-center justify-between">
								<div className="flex items-center space-x-3">
									<FileText className="h-5 w-5 text-blue-500" />
									<div>
										<p className="font-medium">{files.logFile.name}</p>
										<p className="text-sm text-gray-500">
											{(files.logFile.size / 1024 / 1024).toFixed(2)} MB
										</p>
									</div>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => removeFile("log")}
									disabled={loading}
								>
									Remove
								</Button>
							</div>
						</Card>
					)}

					{files.dataFile && (
						<Card className="p-3">
							<div className="flex items-center justify-between">
								<div className="flex items-center space-x-3">
									<FileText className="h-5 w-5 text-green-500" />
									<div>
										<p className="font-medium">{files.dataFile.name}</p>
										<p className="text-sm text-gray-500">
											{(files.dataFile.size / 1024 / 1024).toFixed(2)} MB
										</p>
									</div>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => removeFile("data")}
									disabled={loading}
								>
									Remove
								</Button>
							</div>
						</Card>
					)}
				</div>
			)}

			{/* Error Display */}
			{error && (
				<Card className="border-red-200 bg-red-50">
					<CardContent className="pt-6">
						<div className="flex items-center space-x-2 text-red-800">
							<AlertCircle className="h-5 w-5" />
							<p>{error}</p>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Upload Progress */}
			{loading && (
				<div className="space-y-2">
					<div className="flex justify-between text-sm">
						<span>
							{processingState === "uploading" 
								? "Uploading files..." 
								: processingState === "processing" 
								? "Processing files..." 
								: "Loading..."}
						</span>
						<span>
							{processingState === "uploading" ? `${uploadProgress}%` : "Processing..."}
						</span>
					</div>
					<Progress 
						value={processingState === "uploading" ? uploadProgress : 100} 
						className={processingState === "processing" ? "animate-pulse" : ""}
					/>
				</div>
			)}

			{/* Upload Button */}
			<Button
				onClick={uploadFiles}
				disabled={!canUpload}
				className="w-full"
				size="lg"
			>
				{loading ? "Processing..." : "Upload and Parse Files"}
			</Button>

			{/* Instructions */}
			<div className="text-sm text-gray-600 space-y-1">
				<p>
					<strong>Required files:</strong>
				</p>
				<ul className="list-disc list-inside space-y-1 ml-4">
					<li>
						<strong>.log file:</strong> Contains aircraft configuration and
						message definitions
					</li>
					<li>
						<strong>.data file:</strong> Contains telemetry data from the flight
					</li>
				</ul>
			</div>
		</div>
	);
}
