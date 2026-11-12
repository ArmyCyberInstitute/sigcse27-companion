#!/usr/bin/env python3
"""
Lab 2 Exercises: Transactions, Nonces, and Account Balances
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


class Lab2Exercises:
    """Lab 2 exercises for Transactions, Nonces, and Account Balances."""
    
    def __init__(self, server_url: str = "http://localhost:8000"):
        self.server_url = server_url
        self.client_id = f"lab2_student_{int(time.time())}"
        
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
    
    def get_mempool(self) -> List[Dict]:
        """Get current mempool transactions."""
        try:
            response = requests.get(f"{self.server_url}/api/tx/mempool")
            if response.status_code == 200:
                return response.json()
            else:
                return []
        except Exception as e:
            console.print(f"[red]Error getting mempool: {e}[/red]")
            return []
    
    def get_account_info(self, address: str) -> Dict:
        """Get account information."""
        try:
            response = requests.get(f"{self.server_url}/api/tx/account/{address}")
            if response.status_code == 200:
                return response.json()
            else:
                return {}
        except Exception as e:
            console.print(f"[red]Error getting account info: {e}[/red]")
            return {}
    
    def submit_transaction(self, from_addr: str, to_addr: str, amount: int, fee: int = 10, nonce: int = 1) -> bool:
        """Submit a transaction."""
        try:
            tx_data = {
                "from_addr": from_addr,
                "to_addr": to_addr,
                "amount": amount,
                "fee": fee,
                "nonce": nonce,
                "signature": "mock_signature"  # In real implementation, this would be a real signature
            }
            
            response = requests.post(f"{self.server_url}/api/tx", json=tx_data)
            return response.status_code == 200
        except Exception as e:
            console.print(f"[red]Error submitting transaction: {e}[/red]")
            return False
    
    def display_mempool(self):
        """Display mempool transactions in a formatted table."""
        mempool = self.get_mempool()
        
        if not mempool:
            console.print("[yellow]Mempool is empty[/yellow]")
            return
        
        table = Table(title="Mempool Transactions")
        table.add_column("TXID", style="cyan")
        table.add_column("From", style="magenta")
        table.add_column("To", style="green")
        table.add_column("Amount", style="yellow")
        table.add_column("Fee", style="red")
        table.add_column("Nonce", style="blue")
        
        for tx in mempool:
            table.add_row(
                tx.get("txid", "unknown")[:16] + "...",
                tx.get("from_addr", "unknown")[:16] + "...",
                tx.get("to_addr", "unknown")[:16] + "...",
                str(tx.get("amount", 0)),
                str(tx.get("fee", 0)),
                str(tx.get("nonce", 0))
            )
        
        console.print(table)
    
    def display_account_info(self, address: str):
        """Display account information in a formatted table."""
        info = self.get_account_info(address)
        
        if not info:
            console.print(f"[red]Failed to get account info for {address}[/red]")
            return
        
        table = Table(title=f"Account Information: {address[:16]}...")
        table.add_column("Property", style="cyan")
        table.add_column("Value", style="magenta")
        
        table.add_row("Address", info.get("address", "unknown"))
        table.add_row("Balance", str(info.get("balance", 0)))
        table.add_row("Nonce", str(info.get("nonce", 0)))
        
        console.print(table)
    
    def exercise_2_1_transaction_structure(self):
        """Exercise 2.1: Transaction Structure"""
        console.print(Panel.fit(
            "[bold blue]Exercise 2.1: Transaction Structure[/bold blue]\n"
            "Learn how transactions are structured and validated.",
            title="Lab 2 - Part A"
        ))
        
        console.print("\n[yellow]Step 1:[/yellow] Understanding transaction structure")
        console.print("""
Transaction Structure:
• from_addr: Sender address
• to_addr: Recipient address
• amount: Transaction amount
• fee: Transaction fee
• nonce: Transaction nonce (prevents replay)
• signature: Digital signature
• txid: Transaction ID (hash)
        """)
        
        console.print("\n[yellow]Step 2:[/yellow] Submit a test transaction")
        console.print("In your client terminal, run:")
        console.print("[bold]tx client_2 100[/bold]")
        
        input("\nPress Enter when you've submitted a transaction...")
        
        console.print("\n[yellow]Step 3:[/yellow] Check the mempool")
        self.display_mempool()
        
        console.print("\n[yellow]Step 4:[/yellow] Mine a block to include the transaction")
        console.print("In your client terminal, run: [bold]mine[/bold]")
        
        input("\nPress Enter when you've mined a block...")
        
        console.print("\n[yellow]Step 5:[/yellow] Verify transaction inclusion")
        self.display_mempool()
        
        console.print("\n[green]✓ Exercise 2.1 Complete![/green]")
        console.print("You should understand:")
        console.print("• Transaction structure and fields")
        console.print("• How transactions enter the mempool")
        console.print("• How transactions are included in blocks")
    
    def exercise_2_2_nonce_management(self):
        """Exercise 2.2: Nonce Management"""
        console.print(Panel.fit(
            "[bold blue]Exercise 2.2: Nonce Management[/bold blue]\n"
            "Learn how nonces prevent transaction replay attacks.",
            title="Lab 2 - Part A"
        ))
        
        console.print("\n[yellow]Step 1:[/yellow] Understanding nonces")
        console.print("""
Nonce (Number used Once):
• Prevents transaction replay attacks
• Must be sequential for each account
• Each account maintains its own nonce counter
• Transactions with invalid nonces are rejected
        """)
        
        console.print("\n[yellow]Step 2:[/yellow] Check account nonce")
        console.print("In your client terminal, run: [bold]info[/bold]")
        console.print("Look for the nonce value")
        
        input("\nPress Enter when you've checked the nonce...")
        
        console.print("\n[yellow]Step 3:[/yellow] Submit multiple transactions")
        console.print("Submit several transactions and observe nonce changes:")
        console.print("[bold]tx client_2 50[/bold]")
        console.print("[bold]tx client_3 75[/bold]")
        console.print("[bold]tx client_2 25[/bold]")
        
        input("\nPress Enter when you've submitted multiple transactions...")
        
        console.print("\n[yellow]Step 4:[/yellow] Check mempool for nonce order")
        self.display_mempool()
        
        console.print("\n[yellow]Step 5:[/yellow] Mine blocks to process transactions")
        console.print("Mine blocks to include transactions and update nonces")
        
        input("\nPress Enter when you've mined blocks...")
        
        console.print("\n[green]✓ Exercise 2.2 Complete![/green]")
        console.print("You should understand:")
        console.print("• How nonces prevent replay attacks")
        console.print("• Nonce sequencing and validation")
        console.print("• Account state management")
    
    def exercise_2_3_mempool_management(self):
        """Exercise 2.3: Mempool Management"""
        console.print(Panel.fit(
            "[bold blue]Exercise 2.3: Mempool Management[/bold blue]\n"
            "Learn how the mempool manages pending transactions.",
            title="Lab 2 - Part B"
        ))
        
        console.print("\n[yellow]Step 1:[/yellow] Understanding the mempool")
        console.print("""
Mempool (Memory Pool):
• Stores pending transactions
• Orders transactions by fee and nonce
• Prevents double spending
• Evicts transactions when full
        """)
        
        console.print("\n[yellow]Step 2:[/yellow] Fill the mempool")
        console.print("Submit many transactions to observe mempool behavior:")
        console.print("Try submitting 10-20 transactions with different amounts and fees")
        
        input("\nPress Enter when you've filled the mempool...")
        
        console.print("\n[yellow]Step 3:[/yellow] Analyze mempool ordering")
        self.display_mempool()
        console.print("Observe:")
        console.print("• Transaction ordering by fee")
        console.print("• Nonce sequencing per account")
        console.print("• Mempool size limits")
        
        console.print("\n[yellow]Step 4:[/yellow] Mine blocks to process mempool")
        console.print("Mine blocks to include transactions from the mempool")
        
        input("\nPress Enter when you've mined blocks...")
        
        console.print("\n[yellow]Step 5:[/yellow] Check mempool after mining")
        self.display_mempool()
        
        console.print("\n[green]✓ Exercise 2.3 Complete![/green]")
        console.print("You should understand:")
        console.print("• How mempool manages transactions")
        console.print("• Transaction ordering and prioritization")
        console.print("• Mempool eviction policies")
    
    def exercise_2_4_transaction_validation(self):
        """Exercise 2.4: Transaction Validation"""
        console.print(Panel.fit(
            "[bold blue]Exercise 2.4: Transaction Validation[/bold blue]\n"
            "Learn how transactions are validated before inclusion.",
            title="Lab 2 - Part B"
        ))
        
        console.print("\n[yellow]Step 1:[/yellow] Understanding transaction validation")
        console.print("""
Transaction Validation Checks:
• Sufficient balance (amount + fee)
• Valid nonce (sequential)
• Valid signature
• Positive amount
• Valid addresses
        """)
        
        console.print("\n[yellow]Step 2:[/yellow] Test valid transactions")
        console.print("Submit valid transactions and observe acceptance")
        
        input("\nPress Enter when you've submitted valid transactions...")
        
        console.print("\n[yellow]Step 3:[/yellow] Test invalid transactions")
        console.print("Try submitting transactions with:")
        console.print("• Insufficient balance")
        console.print("• Invalid nonce")
        console.print("• Negative amount")
        console.print("• Missing signature")
        
        input("\nPress Enter when you've tested invalid transactions...")
        
        console.print("\n[yellow]Step 4:[/yellow] Analyze validation results")
        self.display_mempool()
        console.print("Observe which transactions were accepted/rejected")
        
        console.print("\n[green]✓ Exercise 2.4 Complete![/green]")
        console.print("You should understand:")
        console.print("• Transaction validation criteria")
        console.print("• How invalid transactions are rejected")
        console.print("• Security implications of validation")
    
    def exercise_2_5_attack_scenarios(self):
        """Exercise 2.5: Attack Scenarios"""
        console.print(Panel.fit(
            "[bold blue]Exercise 2.5: Attack Scenarios[/bold blue]\n"
            "Experience transaction-based attacks and defenses.",
            title="Lab 2 - Part C"
        ))
        
        console.print("\n[yellow]Step 1:[/yellow] Transaction Replay Attack")
        console.print("""
Replay Attack:
1. Capture a valid transaction
2. Re-submit the same transaction
3. Observe how nonce prevents replay
        """)
        
        console.print("\n[yellow]Step 2:[/yellow] Test replay protection")
        console.print("Submit a transaction, then try to submit it again")
        console.print("Observe how the nonce prevents replay")
        
        input("\nPress Enter when you've tested replay protection...")
        
        console.print("\n[yellow]Step 3:[/yellow] Double Spending Attack")
        console.print("""
Double Spending:
1. Submit conflicting transactions
2. Try to spend same coins twice
3. Observe how validation prevents this
        """)
        
        console.print("\n[yellow]Step 4:[/yellow] Test double spending protection")
        console.print("Try to submit transactions that would double spend")
        console.print("Observe how validation prevents this")
        
        input("\nPress Enter when you've tested double spending protection...")
        
        console.print("\n[yellow]Step 5:[/yellow] Mempool Manipulation")
        console.print("""
Mempool Attacks:
1. Submit many low-fee transactions
2. Try to manipulate transaction ordering
3. Observe mempool behavior
        """)
        
        console.print("\n[yellow]Step 6:[/yellow] Test mempool attacks")
        console.print("Try various mempool manipulation techniques")
        
        input("\nPress Enter when you've tested mempool attacks...")
        
        console.print("\n[green]✓ Exercise 2.5 Complete![/green]")
        console.print("You should understand:")
        console.print("• Transaction replay attacks")
        console.print("• Double spending prevention")
        console.print("• Mempool security mechanisms")
    
    def run_all_exercises(self):
        """Run all Lab 2 exercises."""
        console.print(Panel.fit(
            "[bold green]Lab 2: Transactions, Nonces, and Account Balances[/bold green]\n"
            "Interactive exercises for blockchain security course",
            title="Welcome to Lab 2"
        ))
        
        if not self.connect():
            console.print("[red]Cannot connect to server. Please start the server first.[/red]")
            return
        
        console.print("\n[bold]Available Exercises:[/bold]")
        console.print("1. Exercise 2.1: Transaction Structure")
        console.print("2. Exercise 2.2: Nonce Management")
        console.print("3. Exercise 2.3: Mempool Management")
        console.print("4. Exercise 2.4: Transaction Validation")
        console.print("5. Exercise 2.5: Attack Scenarios")
        console.print("6. Run All Exercises")
        
        while True:
            try:
                choice = input("\nSelect exercise (1-6) or 'q' to quit: ").strip()
                
                if choice == 'q':
                    break
                elif choice == '1':
                    self.exercise_2_1_transaction_structure()
                elif choice == '2':
                    self.exercise_2_2_nonce_management()
                elif choice == '3':
                    self.exercise_2_3_mempool_management()
                elif choice == '4':
                    self.exercise_2_4_transaction_validation()
                elif choice == '5':
                    self.exercise_2_5_attack_scenarios()
                elif choice == '6':
                    self.exercise_2_1_transaction_structure()
                    self.exercise_2_2_nonce_management()
                    self.exercise_2_3_mempool_management()
                    self.exercise_2_4_transaction_validation()
                    self.exercise_2_5_attack_scenarios()
                    console.print("\n[bold green]🎉 All Lab 2 exercises completed![/bold green]")
                else:
                    console.print("[red]Invalid choice. Please select 1-6 or 'q'.[/red]")
                    
            except KeyboardInterrupt:
                break
        
        console.print("\n[bold]Lab 2 Complete![/bold]")
        console.print("Next: Lab 3 - Network Attacks and Defenses")


def main():
    """Main entry point for Lab 2 exercises."""
    exercises = Lab2Exercises()
    exercises.run_all_exercises()


if __name__ == "__main__":
    main()
