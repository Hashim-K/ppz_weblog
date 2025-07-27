"use client";

import { Sessions } from "@/components/Sessions";

export default function SessionsPage() {
	return (
		<div className="min-h-screen bg-background py-8">
			<div className="container mx-auto px-4">
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold text-foreground mb-2">Sessions</h1>
					<p className="text-lg text-muted-foreground">
						Manage your processed log sessions
					</p>
				</div>
				<Sessions />
			</div>
		</div>
	);
}
