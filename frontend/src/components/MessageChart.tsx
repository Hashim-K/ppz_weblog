"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	BarChart,
	Bar,
} from "recharts";
import { useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface Message {
	timestamp: number;
	aircraft_id: number;
	message_type: string;
	message_id: number;
	fields: Record<string, unknown>;
}

interface MessageChartProps {
	messages: Message[];
}

export function MessageChart({ messages }: MessageChartProps) {
	const [chartType, setChartType] = useState<"timeline" | "frequency">(
		"timeline",
	);

	// Prepare data for timeline chart (message count over time)
	const timelineData = () => {
		if (messages.length === 0) return [];

		// Group messages by time intervals (1 second intervals)
		const intervals: Record<number, number> = {};
		const startTime = Math.floor(Math.min(...messages.map((m) => m.timestamp)));
		const endTime = Math.ceil(Math.max(...messages.map((m) => m.timestamp)));

		// Initialize intervals
		for (let t = startTime; t <= endTime; t++) {
			intervals[t] = 0;
		}

		// Count messages in each interval
		messages.forEach((message) => {
			const interval = Math.floor(message.timestamp);
			intervals[interval] = (intervals[interval] || 0) + 1;
		});

		return Object.entries(intervals)
			.map(([time, count]) => ({
				time: parseInt(time),
				count,
				timeLabel: `${parseInt(time)}s`,
			}))
			.slice(0, 100); // Limit to first 100 data points for performance
	};

	// Prepare data for frequency chart (message types)
	const frequencyData = () => {
		const typeCounts: Record<string, number> = {};

		messages.forEach((message) => {
			typeCounts[message.message_type] =
				(typeCounts[message.message_type] || 0) + 1;
		});

		return Object.entries(typeCounts)
			.map(([type, count]) => ({ type, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 15); // Show top 15 message types
	};

	const timeline = timelineData();
	const frequency = frequencyData();

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle>Message Analysis</CardTitle>
					<Select
						value={chartType}
						onValueChange={(value: "timeline" | "frequency") =>
							setChartType(value)
						}
					>
						<SelectTrigger className="w-[200px]">
							<SelectValue placeholder="Select chart type" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="timeline">Timeline</SelectItem>
							<SelectItem value="frequency">Message Types</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</CardHeader>
			<CardContent>
				<div className="h-[300px] w-full">
					{chartType === "timeline" && timeline.length > 0 ? (
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={timeline}>
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis dataKey="time" tickFormatter={(value) => `${value}s`} />
								<YAxis
									label={{
										value: "Message Count",
										angle: -90,
										position: "insideLeft",
									}}
								/>
								<Tooltip
									labelFormatter={(label) => `Time: ${label}s`}
									formatter={(value) => [value, "Messages"]}
								/>
								<Line
									type="monotone"
									dataKey="count"
									stroke="#2563eb"
									strokeWidth={2}
									dot={false}
								/>
							</LineChart>
						</ResponsiveContainer>
					) : chartType === "frequency" && frequency.length > 0 ? (
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={frequency} layout="horizontal">
								<CartesianGrid strokeDasharray="3 3" />
								<XAxis type="number" />
								<YAxis
									type="category"
									dataKey="type"
									width={120}
									fontSize={12}
								/>
								<Tooltip formatter={(value) => [value, "Count"]} />
								<Bar dataKey="count" fill="#2563eb" />
							</BarChart>
						</ResponsiveContainer>
					) : (
						<div className="flex items-center justify-center h-full text-gray-500">
							<p>No data available for visualization</p>
						</div>
					)}
				</div>

				{/* Chart Info */}
				<div className="mt-4 text-sm text-gray-600">
					{chartType === "timeline" && (
						<p>
							Showing message count over time (1-second intervals).
							{timeline.length >= 100 && " Limited to first 100 intervals."}
						</p>
					)}
					{chartType === "frequency" && (
						<p>
							Showing top {Math.min(frequency.length, 15)} most frequent message
							types.
						</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
