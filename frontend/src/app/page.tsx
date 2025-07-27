"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
	const router = useRouter();

	useEffect(() => {
		// Redirect to sessions page by default
		router.push("/sessions");
	}, [router]);

	return (
		<div className="min-h-screen bg-background py-8">
			<div className="container mx-auto px-4">
				<div className="text-center">
					<h1 className="text-4xl font-bold text-foreground mb-2">
						Paparazzi UAV Log Analyzer
					</h1>
					<p className="text-lg text-muted-foreground">
						Redirecting to sessions...
					</p>
				</div>
			</div>
		</div>
	);
}
