#!/usr/bin/env python3
"""
Lab 1 Exercises: Proof of Work and Chain Forks
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


class Lab1Exercises:
    """Lab 1 exercises for Proof of Work and Chain Forks."""
    
    def __init__(self, server_url: str = "http://localhost:8000"):
        self.server_url = server_url
        self.client_id = f"lab1_student_{int(time.time())}"
        
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
    
    def get_blockchain_info(self) -> Dict:
        """Get current blockchain information."""
        try:
            response = requests.get(f"{self.server_url}/api/chain")
            if response.status_code == 200:
                return response.json()
            else:
                return {}
        except Exception as e:
            console.print(f"[red]Error getting blockchain info: {e}[/red]")
            return {}
    
    def display_blockchain_info(self):
        """Display blockchain information in a formatted table."""
        info = self.get_blockchain_info()
        
        if not info:
            console.print("[red]Failed to get blockchain information[/red]")
            return
        
        table = Table(title="Blockchain Information")
        table.add_column("Property", style="cyan")
        table.add_column("Value", style="magenta")
        
        table.add_row("Total Blocks", str(info.get("total_blocks", 0)))
        table.add_row("Main Chain Length", str(info.get("main_chain_length", 0)))
        table.add_row("Chain Tips", str(info.get("chain_tips", 0)))
        table.add_row("Difficulty", str(info.get("difficulty", 0)))
        table.add_row("Block Time", str(info.get("block_time", 0)))
        
        console.print(table)
    
    def exercise_1_1_basic_mining(self):
        """Exercise 1.1: Implement PoW Mining"""
        console.print(Panel.fit(
            "[bold blue]Exercise 1.1: Basic Mining Implementation[/bold blue]\n"
            "Learn how Proof of Work mining works by implementing and testing mining algorithms.",
            title="Lab 1 - Part A"
        ))
        
        console.print("\n[yellow]Step 1:[/yellow] Understanding the current blockchain state")
        self.display_blockchain_info()
        
        console.print("\n[yellow]Step 2:[/yellow] Let's implement a basic mining function")
        
        # Show the mining algorithm
        console.print("\n[bold]Mining Algorithm:[/bold]")
        console.print("""
def mine_block(previous_hash, merkle_root, timestamp, difficulty):
    nonce = 0
    target = "0" * difficulty
    
    while True:
        block_header = f"{previous_hash}{merkle_root}{timestamp}{nonce}"
        block_hash = sha256(block_header.encode()).hexdigest()
        
        if block_hash.startswith(target):
            return nonce, block_hash
        
        nonce += 1
        """)
        
        console.print("\n[yellow]Step 3:[/yellow] Test mining with the client")
        console.print("In your client terminal, run: [bold]mine[/bold]")
        
        input("\nPress Enter when you've tried mining...")
        
        console.print("\n[yellow]Step 4:[/yellow] Analyze the results")
        self.display_blockchain_info()
        
        console.print("\n[green]✓ Exercise 1.1 Complete![/green]")
        console.print("You should understand:")
        console.print("• How Proof of Work mining works")
        console.print("• How difficulty affects mining time")
        console.print("• How blocks are added to the chain")
    
    def exercise_1_2_block_validation(self):
        """Exercise 1.2: Block Validation"""
        console.print(Panel.fit(
            "[bold blue]Exercise 1.2: Block Validation[/bold blue]\n"
            "Learn how blocks are validated in the blockchain.",
            title="Lab 1 - Part A"
        ))
        
        console.print("\n[yellow]Step 1:[/yellow] Understanding block validation criteria")
        console.print("""
Block validation checks:
• Hash meets difficulty requirement
• Previous block hash is correct
• Merkle root is valid
• Timestamp is reasonable
• Transactions are valid
        """)
        
        console.print("\n[yellow]Step 2:[/yellow] Test block validation")
        console.print("Try mining a block and observe the validation process")
        
        input("\nPress Enter when you've mined a block...")
        
        console.print("\n[yellow]Step 3:[/yellow] Check validation results")
        self.display_blockchain_info()
        
        console.print("\n[green]✓ Exercise 1.2 Complete![/green]")
        console.print("You should understand:")
        console.print("• How blocks are validated")
        console.print("• What makes a block valid")
        console.print("• How validation prevents invalid blocks")
    
    def exercise_1_3_chain_forks(self):
        """Exercise 1.3: Chain Forks"""
        console.print(Panel.fit(
            "[bold blue]Exercise 1.3: Chain Forks[/bold blue]\n"
            "Experience chain forks and understand the longest-chain rule.",
            title="Lab 1 - Part B"
        ))
        
        console.print("\n[yellow]Step 1:[/yellow] Start multiple clients")
        console.print("Open additional terminals and run:")
        console.print("[bold]python clients/python/starter_client.py client_2[/bold]")
        console.print("[bold]python clients/python/starter_client.py client_3[/bold]")
        
        input("\nPress Enter when you have multiple clients running...")
        
        console.print("\n[yellow]Step 2:[/yellow] Create a chain fork")
        console.print("In different clients, run [bold]mine[/bold] simultaneously")
        console.print("This will create competing chains (forks)")
        
        input("\nPress Enter when you've created a fork...")
        
        console.print("\n[yellow]Step 3:[/yellow] Observe fork resolution")
        console.print("Check [bold]info[/bold] in each client to see which chain won")
        
        input("\nPress Enter when you've observed the fork resolution...")
        
        console.print("\n[yellow]Step 4:[/yellow] Analyze the results")
        self.display_blockchain_info()
        
        console.print("\n[green]✓ Exercise 1.3 Complete![/green]")
        console.print("You should understand:")
        console.print("• How chain forks occur")
        console.print("• How the longest-chain rule works")
        console.print("• How forks are resolved")
    
    def exercise_1_4_difficulty_analysis(self):
        """Exercise 1.4: Difficulty Analysis"""
        console.print(Panel.fit(
            "[bold blue]Exercise 1.4: Difficulty Analysis[/bold blue]\n"
            "Analyze how difficulty affects mining and blockchain security.",
            title="Lab 1 - Part B"
        ))
        
        console.print("\n[yellow]Step 1:[/yellow] Current difficulty settings")
        info = self.get_blockchain_info()
        difficulty = info.get("difficulty", 4)
        
        console.print(f"Current difficulty: [bold]{difficulty}[/bold]")
        console.print(f"Target: [bold]{'0' * difficulty}[/bold] (leading zeros)")
        
        console.print("\n[yellow]Step 2:[/yellow] Test mining with current difficulty")
        console.print("Mine several blocks and observe:")
        console.print("• Time taken to find each block")
        console.print("• Hash patterns (all start with 0000)")
        console.print("• Nonce values")
        
        input("\nPress Enter when you've mined several blocks...")
        
        console.print("\n[yellow]Step 3:[/yellow] Analyze mining patterns")
        console.print("Observe:")
        console.print("• Block timing variations")
        console.print("• Hash distribution")
        console.print("• Mining efficiency")
        
        console.print("\n[green]✓ Exercise 1.4 Complete![/green]")
        console.print("You should understand:")
        console.print("• How difficulty affects mining time")
        console.print("• Why difficulty is important for security")
        console.print("• How mining difficulty maintains block timing")
    
    def exercise_1_5_attack_scenarios(self):
        """Exercise 1.5: Attack Scenarios"""
        console.print(Panel.fit(
            "[bold blue]Exercise 1.5: Attack Scenarios[/bold blue]\n"
            "Experience and understand blockchain attack vectors.",
            title="Lab 1 - Part C"
        ))
        
        console.print("\n[yellow]Step 1:[/yellow] Selfish Mining Attack")
        console.print("""
Selfish Mining Strategy:
1. Mine blocks privately without broadcasting
2. Release blocks strategically to create longer private chain
3. Analyze impact on honest miners' rewards
        """)
        
        console.print("\n[yellow]Step 2:[/yellow] Implement selfish mining")
        console.print("In one client:")
        console.print("1. Mine a block but don't submit it immediately")
        console.print("2. Let other clients mine on the shorter chain")
        console.print("3. Submit your block to create a longer chain")
        
        input("\nPress Enter when you've tried selfish mining...")
        
        console.print("\n[yellow]Step 3:[/yellow] Block Withholding Attack")
        console.print("""
Block Withholding Strategy:
1. Mine blocks but delay broadcasting
2. Other miners continue working on shorter chain
3. Release block to maximize reward
        """)
        
        console.print("\n[yellow]Step 4:[/yellow] Analyze attack impact")
        console.print("Observe:")
        console.print("• How attacks affect network consensus")
        console.print("• Impact on honest miners")
        console.print("• Network security implications")
        
        console.print("\n[green]✓ Exercise 1.5 Complete![/green]")
        console.print("You should understand:")
        console.print("• How selfish mining works")
        console.print("• Impact of block withholding")
        console.print("• Why these attacks are concerning")
    
    def run_all_exercises(self):
        """Run all Lab 1 exercises."""
        console.print(Panel.fit(
            "[bold green]Lab 1: Proof of Work and Chain Forks[/bold green]\n"
            "Interactive exercises for blockchain security course",
            title="Welcome to Lab 1"
        ))
        
        if not self.connect():
            console.print("[red]Cannot connect to server. Please start the server first.[/red]")
            return
        
        console.print("\n[bold]Available Exercises:[/bold]")
        console.print("1. Exercise 1.1: Basic Mining Implementation")
        console.print("2. Exercise 1.2: Block Validation")
        console.print("3. Exercise 1.3: Chain Forks")
        console.print("4. Exercise 1.4: Difficulty Analysis")
        console.print("5. Exercise 1.5: Attack Scenarios")
        console.print("6. Run All Exercises")
        
        while True:
            try:
                choice = input("\nSelect exercise (1-6) or 'q' to quit: ").strip()
                
                if choice == 'q':
                    break
                elif choice == '1':
                    self.exercise_1_1_basic_mining()
                elif choice == '2':
                    self.exercise_1_2_block_validation()
                elif choice == '3':
                    self.exercise_1_3_chain_forks()
                elif choice == '4':
                    self.exercise_1_4_difficulty_analysis()
                elif choice == '5':
                    self.exercise_1_5_attack_scenarios()
                elif choice == '6':
                    self.exercise_1_1_basic_mining()
                    self.exercise_1_2_block_validation()
                    self.exercise_1_3_chain_forks()
                    self.exercise_1_4_difficulty_analysis()
                    self.exercise_1_5_attack_scenarios()
                    console.print("\n[bold green]🎉 All Lab 1 exercises completed![/bold green]")
                else:
                    console.print("[red]Invalid choice. Please select 1-6 or 'q'.[/red]")
                    
            except KeyboardInterrupt:
                break
        
        console.print("\n[bold]Lab 1 Complete![/bold]")
        console.print("Next: Lab 2 - Transactions, Nonces, and Account Balances")


def main():
    """Main entry point for Lab 1 exercises."""
    exercises = Lab1Exercises()
    exercises.run_all_exercises()


if __name__ == "__main__":
    main()
