"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileUpload } from "@/components/FileUpload";

export default function UploadPage() {
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const handleUploadSuccess = (data: unknown, sessionName: string) => {
		console.log("Upload successful:", data);
		console.log("Session name:", sessionName);

		if (sessionName) {
			// Navigate to dashboard with the specific session
			router.push(`/dashboard?session=${sessionName}`);
		} else {
			// Fallback: navigate to dashboard without session
			router.push("/dashboard");
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
