"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Calendar,
	Clock,
	Plane,
	MessageSquare,
	PlayCircle,
} from "lucide-react";
import axios from "axios";

interface SessionInfo {
	session_id: string;
	filename: string;
	file_size: number;
	total_messages: number;
	start_time: string;
	end_time: string;
	duration: number;
	aircraft: Array<{
		id: number;
		name: string;
		color: string;
		total_messages: number;
	}>;
	message_types: Array<{
		name: string;
		count: number;
		description: string;
	}>;
}

interface SessionsProps {
	onSessionLoad: (sessionData: unknown, sessionId: string) => void;
}

export function Sessions({ onSessionLoad }: SessionsProps) {
	const [sessionNames, setSessionNames] = useState<string[]>([]);
	const [sessionInfos, setSessionInfos] = useState<Record<string, SessionInfo>>(
		{}
	);
	const [loading, setLoading] = useState(true);
	const [loadingSession, setLoadingSession] = useState<string | null>(null);

	const loadSessions = async () => {
		try {
			const response = await axios.get("http://localhost:8000/sessions");
			// Backend now returns array directly, not { sessions: [...] }
			const sessionNames = response.data || [];
			setSessionNames(sessionNames);

			// Load info for each session
			const infos: Record<string, SessionInfo> = {};
			for (const sessionName of sessionNames) {
				try {
					const infoResponse = await axios.get(
						`http://localhost:8000/sessions/${sessionName}/info`
					);
					infos[sessionName] = infoResponse.data;
				} catch (error) {
					console.error(
						`Failed to load info for session ${sessionName}:`,
						error
					);
				}
			}
			setSessionInfos(infos);
		} catch (error) {
			console.error("Failed to load sessions:", error);
			setSessionNames([]); // Set empty array on error
			setSessionInfos({});
		} finally {
			setLoading(false);
		}
	};

	const loadSession = async (sessionName: string) => {
		setLoadingSession(sessionName);
		try {
			await axios.post(`http://localhost:8000/sessions/${sessionName}/load`);
			const sessionData = await axios.get(
				`http://localhost:8000/sessions/${sessionName}`
			);

			// Call the callback to notify parent component
			onSessionLoad(sessionData.data, sessionName);

			console.log(`Session ${sessionName} loaded successfully`);
		} catch (error) {
			console.error(`Failed to load session ${sessionName}:`, error);
		} finally {
			setLoadingSession(null);
		}
	};

	useEffect(() => {
		loadSessions();
	}, []);

	const formatDuration = (seconds: number): string => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);

		if (hours > 0) {
			return `${hours}h ${minutes}m ${secs}s`;
		} else if (minutes > 0) {
			return `${minutes}m ${secs}s`;
		} else {
			return `${secs}s`;
		}
	};

	const formatDate = (isoString: string): string => {
		const date = new Date(isoString);
		return date.toLocaleDateString() + " " + date.toLocaleTimeString();
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600 dark:text-gray-400">Loading processed sessions...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold">Processed Log Sessions</h2>
					<p className="text-gray-600 dark:text-gray-400">
						Found {sessionNames.length} processed log session
						{sessionNames.length !== 1 ? "s" : ""}
					</p>
				</div>
				<Button onClick={loadSessions} variant="outline">
					Refresh
				</Button>
			</div>

			{sessionNames.length === 0 ? (
				<Card>
					<CardContent className="py-8">
						<div className="text-center">
							<Plane className="h-12 w-12 text-gray-400 mx-auto mb-4" />
							<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
								No processed sessions found
							</h3>
							<p className="text-gray-600 dark:text-gray-400 mb-4">
								Drop your .log and .data files in the backend/input folder to
								automatically process them.
							</p>
							<div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-left">
								<p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
									cp your_file.log your_file.data /path/to/backend/input/
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{sessionNames.map((sessionName) => {
						const sessionInfo = sessionInfos[sessionName];
						return (
							<Card
								key={sessionName}
								className="hover:shadow-lg transition-shadow"
							>
								<CardHeader className="pb-3">
									<div className="flex items-center justify-between">
										<CardTitle className="text-lg truncate">
											{sessionInfo?.filename || sessionName}
										</CardTitle>
										<Button
											onClick={() => loadSession(sessionName)}
											disabled={loadingSession === sessionName}
											size="sm"
											className="ml-2"
										>
											{loadingSession === sessionName ? (
												<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
											) : (
												<PlayCircle className="h-4 w-4" />
											)}
										</Button>
									</div>
									<p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
										<Calendar className="h-3 w-3 mr-1" />
										{sessionInfo
											? formatDate(sessionInfo.start_time)
											: "Loading..."}
									</p>
								</CardHeader>

								<CardContent className="space-y-3">
									{sessionInfo ? (
										<>
											{/* File info */}
											<div className="space-y-1">
												<p className="text-xs text-gray-500 dark:text-gray-400">File:</p>
												<p className="text-sm font-mono truncate">
													{sessionInfo.filename}
												</p>
											</div>

											{/* Stats */}
											<div className="grid grid-cols-2 gap-3">
												<div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
													<div className="flex items-center justify-center mb-1">
														<Plane className="h-4 w-4 text-blue-600 dark:text-blue-400" />
													</div>
													<p className="text-lg font-bold text-blue-600 dark:text-blue-400">
														{sessionInfo.aircraft.length}
													</p>
													<p className="text-xs text-gray-600 dark:text-gray-400">Aircraft</p>
												</div>

												<div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
													<div className="flex items-center justify-center mb-1">
														<MessageSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
													</div>
													<p className="text-lg font-bold text-green-600 dark:text-green-400">
														{sessionInfo.total_messages.toLocaleString()}
													</p>
													<p className="text-xs text-gray-600 dark:text-gray-400">Messages</p>
												</div>
											</div>

											{/* Duration */}
											<div className="flex items-center justify-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
												<Clock className="h-4 w-4 text-gray-600 dark:text-gray-400 mr-2" />
												<span className="text-sm font-medium">
													{formatDuration(sessionInfo.duration)}
												</span>
											</div>

											{/* Aircraft IDs */}
											<div>
												<p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
													Aircraft IDs:
												</p>
												<div className="flex flex-wrap gap-1">
													{sessionInfo.aircraft.slice(0, 5).map((aircraft) => (
														<Badge
															key={aircraft.id}
															variant="outline"
															className="text-xs"
														>
															{aircraft.id}
														</Badge>
													))}
													{sessionInfo.aircraft.length > 5 && (
														<Badge variant="outline" className="text-xs">
															+{sessionInfo.aircraft.length - 5} more
														</Badge>
													)}
												</div>
											</div>
										</>
									) : (
										<div className="flex items-center justify-center py-4">
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
											<span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
												Loading session info...
											</span>
										</div>
									)}
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}
