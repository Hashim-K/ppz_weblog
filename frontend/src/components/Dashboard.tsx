"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MessageChart } from "@/components/MessageChart";
import { MessageTable } from "@/components/MessageTable";
import { Plane, Activity, Clock, Database } from "lucide-react";
import axios from "axios";

interface DashboardProps {
	sessionData: {
		aircraft_count: number;
		message_count: number;
		session_id: number;
	} | null;
}

interface Aircraft {
	id: number;
	name: string;
	airframe: string;
	message_types: string[];
}

interface Message {
	timestamp: number;
	aircraft_id: number;
	message_type: string;
	message_id: number;
	fields: Record<string, unknown>;
}

export function Dashboard({ sessionData }: DashboardProps) {
	const [aircraft, setAircraft] = useState<Aircraft[]>([]);
	const [selectedAircraft, setSelectedAircraft] = useState<number | null>(null);
	const [selectedMessageType, setSelectedMessageType] = useState<string | null>(
		null
	);
	const [messages, setMessages] = useState<Message[]>([]);
	const [loading, setLoading] = useState(false);
	const [messageLimit, setMessageLimit] = useState(1000);

	// Load aircraft data
	useEffect(() => {
		const loadAircraft = async () => {
			try {
				const response = await axios.get("http://localhost:8000/aircraft");
				setAircraft(response.data.aircraft);
				if (response.data.aircraft.length > 0) {
					setSelectedAircraft(response.data.aircraft[0].id);
				}
			} catch (error) {
				console.error("Failed to load aircraft:", error);
			}
		};

		if (sessionData) {
			loadAircraft();
		}
	}, [sessionData]);

	// Load messages when aircraft or message type changes
	const loadMessages = useCallback(async () => {
		if (!selectedAircraft) return;

		setLoading(true);
		try {
			const params: Record<string, string | number> = {
				limit: messageLimit,
			};

			if (selectedMessageType) {
				params.message_type = selectedMessageType;
			}

			const response = await axios.get(
				`http://localhost:8000/messages/${selectedAircraft}`,
				{ params }
			);

			setMessages(response.data.messages);
		} catch (error) {
			console.error("Failed to load messages:", error);
		} finally {
			setLoading(false);
		}
	}, [selectedAircraft, selectedMessageType, messageLimit]);

	useEffect(() => {
		if (selectedAircraft && sessionData) {
			loadMessages();
		}
	}, [
		selectedAircraft,
		selectedMessageType,
		messageLimit,
		sessionData,
		loadMessages,
	]);

	// If no session data, show error
	if (!sessionData) {
		return (
			<Card>
				<CardContent className="text-center py-8">
					<p className="text-gray-500">No session data available</p>
				</CardContent>
			</Card>
		);
	}

	const selectedAircraftData = aircraft.find((a) => a.id === selectedAircraft);
	const availableMessageTypes = selectedAircraftData?.message_types || [];

	const messageStats = {
		total: messages.length,
		timeRange:
			messages.length > 0
				? {
						start: Math.min(...messages.map((m) => m.timestamp)),
						end: Math.max(...messages.map((m) => m.timestamp)),
				  }
				: null,
		types: [...new Set(messages.map((m) => m.message_type))].length,
	};

	return (
		<div className="space-y-6">
			{/* Session Info */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Aircraft</CardTitle>
						<Plane className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{sessionData.aircraft_count}
						</div>
						<p className="text-xs text-muted-foreground">Found in log file</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Total Messages
						</CardTitle>
						<Database className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{sessionData.message_count.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">
							Parsed from data file
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">
							Filtered Messages
						</CardTitle>
						<Activity className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{messageStats.total.toLocaleString()}
						</div>
						<p className="text-xs text-muted-foreground">Currently displayed</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Time Range</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{messageStats.timeRange
								? `${(
										messageStats.timeRange.end - messageStats.timeRange.start
								  ).toFixed(1)}s`
								: "N/A"}
						</div>
						<p className="text-xs text-muted-foreground">Duration</p>
					</CardContent>
				</Card>
			</div>

			{/* Filters */}
			<Card>
				<CardHeader>
					<CardTitle>Filters</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div className="space-y-2">
							<label className="text-sm font-medium">Aircraft</label>
							<Select
								value={selectedAircraft?.toString() || ""}
								onValueChange={(value) => setSelectedAircraft(parseInt(value))}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select aircraft" />
								</SelectTrigger>
								<SelectContent>
									{aircraft.map((aircraft) => (
										<SelectItem
											key={aircraft.id}
											value={aircraft.id.toString()}
										>
											{aircraft.name} (ID: {aircraft.id})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium">Message Type</label>
							<Select
								value={selectedMessageType || "all"}
								onValueChange={(value) =>
									setSelectedMessageType(value === "all" ? null : value)
								}
							>
								<SelectTrigger>
									<SelectValue placeholder="All message types" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All message types</SelectItem>
									{availableMessageTypes.slice(0, 20).map((type) => (
										<SelectItem key={type} value={type}>
											{type}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium">Message Limit</label>
							<Input
								type="number"
								value={messageLimit}
								onChange={(e) =>
									setMessageLimit(parseInt(e.target.value) || 1000)
								}
								min="1"
								max="10000"
							/>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium">Actions</label>
							<Button
								onClick={loadMessages}
								disabled={loading}
								className="w-full"
							>
								{loading ? "Loading..." : "Refresh Data"}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Current Selection Info */}
			{selectedAircraftData && (
				<Card>
					<CardHeader>
						<CardTitle>
							Selected Aircraft: {selectedAircraftData.name}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<p>
								<strong>Aircraft ID:</strong> {selectedAircraftData.id}
							</p>
							<p>
								<strong>Airframe:</strong> {selectedAircraftData.airframe}
							</p>
							<div>
								<strong>
									Available Message Types (
									{selectedAircraftData.message_types.length}):
								</strong>
								<div className="flex flex-wrap gap-1 mt-2">
									{selectedAircraftData.message_types
										.slice(0, 10)
										.map((type) => (
											<Badge key={type} variant="secondary" className="text-xs">
												{type}
											</Badge>
										))}
									{selectedAircraftData.message_types.length > 10 && (
										<Badge variant="outline" className="text-xs">
											+{selectedAircraftData.message_types.length - 10} more
										</Badge>
									)}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Data Visualization */}
			{messages.length > 0 && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<MessageChart messages={messages} />
					<MessageTable messages={messages.slice(0, 100)} />
				</div>
			)}

			{messages.length === 0 && !loading && selectedAircraft && (
				<Card>
					<CardContent className="text-center py-8">
						<p className="text-gray-500">
							No messages found for the selected filters. Try adjusting your
							selection.
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
