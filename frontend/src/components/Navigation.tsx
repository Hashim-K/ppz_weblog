"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const navigation = [
	{ name: "Sessions", href: "/sessions" },
	{ name: "Upload", href: "/upload" },
	{ name: "Dashboard", href: "/dashboard" },
	{ name: "Settings", href: "/settings" },
];

export function Navigation() {
	const pathname = usePathname();

	return (
		<nav className="border-b bg-background">
			<div className="container mx-auto px-4">
				<div className="flex items-center justify-between h-16">
					<div className="flex items-center space-x-8">
						<Link href="/" className="text-xl font-bold text-foreground">
							Paparazzi UAV
						</Link>
						<div className="flex space-x-4">
							{navigation.map((item) => (
								<Link key={item.name} href={item.href}>
									<Button
										variant={pathname === item.href ? "default" : "ghost"}
										size="sm"
									>
										{item.name}
									</Button>
								</Link>
							))}
						</div>
					</div>
				</div>
			</div>
		</nav>
	);
}
