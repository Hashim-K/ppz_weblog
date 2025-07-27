"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/FileUpload";
import axios from "axios";

export default function UploadPage() {
	const [loading, setLoading] = useState(false);
	const [processingStatus, setProcessingStatus] = useState<string>("");
	const router = useRouter();

	const waitForSessionProcessing = async (
		sessionName: string,
		maxAttempts = 30,
	) => {
		setProcessingStatus("Waiting for files to be processed...");

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			try {
				// Check if session exists and has been processed
				const response = await axios.get(
					`http://localhost:8000/sessions/${sessionName}/info`,
				);
				if (response.status === 200) {
					setProcessingStatus("Files processed successfully! Redirecting...");
					// Session is ready, navigate to dashboard
					setTimeout(() => {
						router.push(`/dashboard?session=${sessionName}`);
					}, 1000);
					return;
				}
			} catch {
				// Session not ready yet, continue waiting
				setProcessingStatus(
					`Processing files... (${attempt + 1}/${maxAttempts})`,
				);
			}

			// Wait 2 seconds before next attempt
			await new Promise((resolve) => setTimeout(resolve, 2000));
		}

		// If we get here, processing took too long
		setProcessingStatus(
			"Processing is taking longer than expected. Check the sessions page.",
		);
		setTimeout(() => {
			router.push("/sessions");
		}, 3000);
	};

	const handleUploadSuccess = async (data: unknown, sessionName: string) => {
		console.log("Upload successful:", data);
		console.log("Session name:", sessionName);

		if (sessionName) {
			// Wait for the session to be processed before navigating
			await waitForSessionProcessing(sessionName);
		} else {
			// Fallback: navigate to sessions page
			router.push("/sessions");
		}
	};

	return (
		<div className="min-h-screen bg-background py-8">
			<div className="container mx-auto px-4">
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold text-foreground mb-2">
						Upload Files
					</h1>
					<p className="text-lg text-muted-foreground">
						Upload your Paparazzi UAV log files for processing
					</p>
				</div>
				<div className="max-w-2xl mx-auto">
					{processingStatus && (
						<div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
							<div className="flex items-center">
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
								<p className="text-blue-800">{processingStatus}</p>
							</div>
						</div>
					)}
					<FileUpload
						onUploadSuccess={handleUploadSuccess}
						loading={loading}
						setLoading={setLoading}
					/>
				</div>
			</div>
		</div>
	);
}
