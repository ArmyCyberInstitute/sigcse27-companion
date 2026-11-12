#!/usr/bin/env python3
"""
Lab 3 Exercises: Network Attacks and Defenses
Interactive exercises for blockchain security course
"""

import asyncio
import json
import time
import hashlib
from typing import List, Dict, Optional
import requests
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn

console = Console()


class Lab3Exercises:
    """Lab 3 exercises for Network Attacks and Defenses."""
    
    def __init__(self, server_url: str = "http://localhost:8000"):
        self.server_url = server_url
        self.client_id = f"lab3_student_{int(time.time())}"
        
    def connect(self) -> bool:
        """Connect to the labchain server."""
        try:
            response = requests.get(f"{self.server_url}/health")
            if response.status_code == 200:
                console.print("[green]✓[/green] Connected to Labchain server")
                return True
            else:
                console.print("[red]✗[/red] Failed to connect to server")
                return False
        except Exception as e:
            console.print(f"[red]✗[/red] Connection error: {e}")
            return False
    
    def get_peers(self) -> List[Dict]:
        """Get list of peer nodes."""
        try:
            response = requests.get(f"{self.server_url}/api/nodes/peers")
            if response.status_code == 200:
                return response.json()
            else:
                return []
        except Exception as e:
            console.print(f"[red]Error getting peers: {e}[/red]")
            return []
    
    def register_node(self, node_id: str) -> bool:
        """Register a new node."""
        try:
            response = requests.post(f"{self.server_url}/api/nodes/register", json={
                "node_id": node_id,
                "address": "localhost:8000",
                "timestamp": int(time.time())
            })
            return response.status_code == 200
        except Exception as e:
            console.print(f"[red]Error registering node: {e}[/red]")
            return False
    
    def display_peers(self):
        """Display peer nodes in a formatted table."""
        peers = self.get_peers()
        
        if not peers:
            console.print("[yellow]No peers found[/yellow]")
            return
        
        table = Table(title="Network Peers")
        table.add_column("Node ID", style="cyan")
        table.add_column("Address", style="magenta")
        table.add_column("Status", style="green")
        table.add_column("Last Seen", style="yellow")
        
        for peer in peers:
            table.add_row(
                peer.get("node_id", "unknown"),
                peer.get("address", "unknown"),
                peer.get("status", "unknown"),
                str(peer.get("timestamp", 0))
            )
        
        console.print(table)
    
    def exercise_3_1_network_topology(self):
        """Exercise 3.1: Network Topology"""
        console.print(Panel.fit(
            "[bold blue]Exercise 3.1: Network Topology[/bold blue]\n"
            "Learn about blockchain network topology and peer connections.",
            title="Lab 3 - Part A"
        ))
        
        console.print("\n[yellow]Step 1:[/yellow] Understanding network topology")
        console.print("""
Blockchain Network Topology:
• Peer-to-peer network
• No central authority
• Nodes discover and connect to peers
• Information propagates through gossip protocol
        """)
        
        console.print("\n[yellow]Step 2:[/yellow] Start multiple clients")
        console.print("Open additional terminals and run:")
        console.print("[bold]python clients/python/starter_client.py client_1[/bold]")
        console.print("[bold]python clients/python/starter_client.py client_2[/bold]")
        console.print("[bold]python clients/python/starter_client.py client_3[/bold]")
        
        input("\nPress Enter when you have multiple clients running...")
        
        console.print("\n[yellow]Step 3:[/yellow] Check network peers")
        self.display_peers()
        
        console.print("\n[yellow]Step 4:[/yellow] Observe network communication")
        console.print("In different clients, try:")
        console.print("• Mining blocks simultaneously")
        console.print("• Submitting transactions")
        console.print("• Watch WebSocket messages for network updates")
        
        input("\nPress Enter when you've observed network communication...")
        
        console.print("\n[green]✓ Exercise 3.1 Complete![/green]")
        console.print("You should understand:")
        console.print("• How blockchain networks are structured")
        console.print("• How nodes discover and connect to peers")
        console.print("• How information propagates through the network")
    
    def exercise_3_2_eclipse_attack(self):
        """Exercise 3.2: Eclipse Attack"""
        console.print(Panel.fit(
            "[bold blue]Exercise 3.2: Eclipse Attack[/bold blue]\n"
            "Experience and understand eclipse attacks.",
            title="Lab 3 - Part B"
        ))
        
        console.print("\n[yellow]Step 1:[/yellow] Understanding eclipse attacks")
        console.print("""
Eclipse Attack:
• Isolate target node from honest peers
• Control all connections to target
• Provide false network view
• Enable transaction censorship
        """)
        
        console.print("\n[yellow]Step 2:[/yellow] Simulate eclipse attack")
        console.print("Start multiple clients and observe:")
        console.print("• How nodes connect to each other")
        console.print("• What happens when connections are limited")
        console.print("• How eclipse affects network view")
        
        input("\nPress Enter when you've observed eclipse effects...")
        
        console.print("\n[yellow]Step 3:[/yellow] Test eclipse defense")
        console.print("""
Eclipse Defense Mechanisms:
• Multiple connection sources
• Outbound connection requirements
• Peer reputation system
• Network diversity checks
        """)
        
        console.print("\n[yellow]Step 4:[/yellow] Implement defense strategies")
        console.print("Try to prevent eclipse by:")
        console.print("• Maintaining multiple connections")
        console.print("• Connecting to diverse peer sets")
        console.print("• Monitoring peer behavior")
        
        input("\nPress Enter when you've tested defense strategies...")
        
        console.print("\n[green]✓ Exercise 3.2 Complete![/green]")
        console.print("You should understand:")
        console.print("• How eclipse attacks work")
        console.print("• Impact of eclipse attacks")
        console.print("• Defense mechanisms against eclipse")
    
    def exercise_3_3_sybil_attack(self):
        """Exercise 3.3: Sybil Attack"""
        console.print(Panel.fit(
            "[bold blue]Exercise 3.3: Sybil Attack[/bold blue]\n"
            "Experience and understand sybil attacks.",
            title="Lab 3 - Part B"
        ))
        
        console.print("\n[yellow]Step 1:[/yellow] Understanding sybil attacks")
        console.print("""
Sybil Attack:
• Create multiple fake node identities
• Overwhelm network with fake nodes
• Gain disproportionate network influence
• Manipulate consensus through fake nodes
        """)
        
        console.print("\n[yellow]Step 2:[/yellow] Simulate sybil attack")
        console.print("Start many clients with different IDs:")
        console.print("[bold]python clients/python/starter_client.py sybil_1[/bold]")
        console.print("[bold]python clients/python/starter_client.py sybil_2[/bold]")
        console.print("[bold]python clients/python/starter_client.py sybil_3[/bold]")
        console.print("... (start as many as you can)")
        
        input("\nPress Enter when you've started multiple sybil nodes...")
        
        console.print("\n[yellow]Step 3:[/yellow] Observe sybil impact")
        self.display_peers()
        console.print("Observe:")
        console.print("• How many fake nodes appear")
        console.print("• Network influence of sybil nodes")
        console.print("• Impact on honest nodes")
        
        console.print("\n[yellow]Step 4:[/yellow] Test sybil defense")
        console.print("""
Sybil Defense Mechanisms:
• Identity verification
• Connection limits per IP
• Reputation system
• Resource monitoring
        """)
        
        input("\nPress Enter when you've tested sybil defense...")
        
        console.print("\n[green]✓ Exercise 3.3 Complete![/green]")
        console.print("You should understand:")
        console.print("• How sybil attacks work")
        console.print("• Impact of sybil attacks")
        console.print("• Defense mechanisms against sybil")
    
    def exercise_3_4_denial_of_service(self):
        """Exercise 3.4: Denial of Service"""
        console.print(Panel.fit(
            "[bold blue]Exercise 3.4: Denial of Service[/bold blue]\n"
            "Experience and understand DoS attacks.",
            title="Lab 3 - Part C"
        ))
        
        console.print("\n[yellow]Step 1:[/yellow] Understanding DoS attacks")
        console.print("""
Denial of Service (DoS) Attacks:
• Overwhelm network with malicious traffic
• Exhaust network resources
• Prevent legitimate transactions
• Disrupt network consensus
        """)
        
        console.print("\n[yellow]Step 2:[/yellow] Simulate DoS attack")
        console.print("Try to overwhelm the network by:")
        console.print("• Submitting many transactions rapidly")
        console.print("• Mining blocks aggressively")
        console.print("• Creating network congestion")
        
        input("\nPress Enter when you've simulated DoS attack...")
        
        console.print("\n[yellow]Step 3:[/yellow] Observe DoS impact")
        console.print("Observe:")
        console.print("• Network performance degradation")
        console.print("• Transaction delays")
        console.print("• Mining difficulties")
        console.print("• System resource usage")
        
        console.print("\n[yellow]Step 4:[/yellow] Test DoS defense")
        console.print("""
DoS Defense Mechanisms:
• Rate limiting
• Resource monitoring
• Connection management
• Message validation
        """)
        
        input("\nPress Enter when you've tested DoS defense...")
        
        console.print("\n[green]✓ Exercise 3.4 Complete![/green]")
        console.print("You should understand:")
        console.print("• How DoS attacks work")
        console.print("• Impact of DoS attacks")
        console.print("• Defense mechanisms against DoS")
    
    def exercise_3_5_network_monitoring(self):
        """Exercise 3.5: Network Monitoring"""
        console.print(Panel.fit(
            "[bold blue]Exercise 3.5: Network Monitoring[/bold blue]\n"
            "Learn how to monitor and analyze network behavior.",
            title="Lab 3 - Part C"
        ))
        
        console.print("\n[yellow]Step 1:[/yellow] Understanding network monitoring")
        console.print("""
Network Monitoring:
• Track peer connections
• Monitor message propagation
• Analyze network health
• Detect anomalous behavior
        """)
        
        console.print("\n[yellow]Step 2:[/yellow] Monitor network activity")
        console.print("Observe network behavior by:")
        console.print("• Watching WebSocket messages")
        console.print("• Checking peer connections")
        console.print("• Monitoring transaction propagation")
        console.print("• Analyzing block announcements")
        
        input("\nPress Enter when you've monitored network activity...")
        
        console.print("\n[yellow]Step 3:[/yellow] Analyze network patterns")
        console.print("Look for patterns in:")
        console.print("• Message timing")
        console.print("• Peer behavior")
        console.print("• Network topology changes")
        console.print("• Consensus participation")
        
        console.print("\n[yellow]Step 4:[/yellow] Detect network anomalies")
        console.print("Try to identify:")
        console.print("• Unusual peer behavior")
        console.print("• Network congestion")
        console.print("• Consensus disruptions")
        console.print("• Security threats")
        
        input("\nPress Enter when you've analyzed network patterns...")
        
        console.print("\n[green]✓ Exercise 3.5 Complete![/green]")
        console.print("You should understand:")
        console.print("• How to monitor network behavior")
        console.print("• Network analysis techniques")
        console.print("• Anomaly detection methods")
    
    def run_all_exercises(self):
        """Run all Lab 3 exercises."""
        console.print(Panel.fit(
            "[bold green]Lab 3: Network Attacks and Defenses[/bold green]\n"
            "Interactive exercises for blockchain security course",
            title="Welcome to Lab 3"
        ))
        
        if not self.connect():
            console.print("[red]Cannot connect to server. Please start the server first.[/red]")
            return
        
        console.print("\n[bold]Available Exercises:[/bold]")
        console.print("1. Exercise 3.1: Network Topology")
        console.print("2. Exercise 3.2: Eclipse Attack")
        console.print("3. Exercise 3.3: Sybil Attack")
        console.print("4. Exercise 3.4: Denial of Service")
        console.print("5. Exercise 3.5: Network Monitoring")
        console.print("6. Run All Exercises")
        
        while True:
            try:
                choice = input("\nSelect exercise (1-6) or 'q' to quit: ").strip()
                
                if choice == 'q':
                    break
                elif choice == '1':
                    self.exercise_3_1_network_topology()
                elif choice == '2':
                    self.exercise_3_2_eclipse_attack()
                elif choice == '3':
                    self.exercise_3_3_sybil_attack()
                elif choice == '4':
                    self.exercise_3_4_denial_of_service()
                elif choice == '5':
                    self.exercise_3_5_network_monitoring()
                elif choice == '6':
                    self.exercise_3_1_network_topology()
                    self.exercise_3_2_eclipse_attack()
                    self.exercise_3_3_sybil_attack()
                    self.exercise_3_4_denial_of_service()
                    self.exercise_3_5_network_monitoring()
                    console.print("\n[bold green]🎉 All Lab 3 exercises completed![/bold green]")
                else:
                    console.print("[red]Invalid choice. Please select 1-6 or 'q'.[/red]")
                    
            except KeyboardInterrupt:
                break
        
        console.print("\n[bold]Lab 3 Complete![/bold]")
        console.print("Next: Lab 4 - Consensus Manipulation")


def main():
    """Main entry point for Lab 3 exercises."""
    exercises = Lab3Exercises()
    exercises.run_all_exercises()


if __name__ == "__main__":
    main()
