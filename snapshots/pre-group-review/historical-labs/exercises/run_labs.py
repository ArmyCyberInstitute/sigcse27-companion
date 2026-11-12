#!/usr/bin/env python3
"""
Lab Runner - Interactive Lab Selection
Run any lab exercise from the blockchain security course
"""

import sys
import subprocess
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()


def show_lab_menu():
    """Display the lab selection menu."""
    console.print(Panel.fit(
        "[bold green]Blockchain Security Course[/bold green]\n"
        "Interactive Lab Exercises",
        title="Welcome"
    ))
    
    table = Table(title="Available Labs")
    table.add_column("Lab", style="cyan")
    table.add_column("Title", style="magenta")
    table.add_column("Description", style="green")
    
    labs = [
        ("C", "Cypherpunk Ethos", "Philosophical foundations of blockchain"),
        ("1", "Lab 1", "Proof of Work and Chain Forks"),
        ("2", "Lab 2", "Transactions, Nonces, and Account Balances"),
        ("3", "Lab 3", "Network Attacks and Defenses"),
        ("4", "Lab 4", "Consensus Manipulation"),
        ("5", "Lab 5", "Double Spending Attacks"),
        ("6", "Lab 6", "Eclipse and Sybil Attacks"),
        ("7", "Lab 7", "Smart Contract Security"),
        ("8", "Lab 8", "DeFi Attack Vectors"),
        ("9", "Lab 9", "Multi-Signature and Time Locks"),
        ("10", "Lab 10", "Final Project - Security Audit"),
    ]
    
    for lab_num, lab_name, description in labs:
        table.add_row(lab_num, lab_name, description)
    
    console.print(table)
    
    console.print("\n[bold]Additional Options:[/bold]")
    console.print("• [bold]s[/bold] - Start server")
    console.print("• [bold]c[/bold] - Start client")
    console.print("• [bold]q[/bold] - Quit")


def run_lab(lab_number):
    """Run a specific lab exercise."""
    lab_files = {
        "C": "exercises/cypherpunk_exercises.py",
        "1": "exercises/lab1_exercises.py",
        "2": "exercises/lab2_exercises.py",
        "3": "exercises/lab3_exercises.py",
        # Add more labs as they're created
    }
    
    if lab_number in lab_files:
        try:
            console.print(f"[bold]Starting Lab {lab_number}...[/bold]")
            subprocess.run([sys.executable, lab_files[lab_number]], check=True)
        except subprocess.CalledProcessError:
            console.print(f"[red]Error running Lab {lab_number}[/red]")
        except FileNotFoundError:
            console.print(f"[red]Lab {lab_number} not found[/red]")
    else:
        console.print(f"[red]Lab {lab_number} not yet implemented[/red]")


def start_server():
    """Start the labchain server."""
    try:
        console.print("[bold]Starting Labchain server...[/bold]")
        subprocess.run([sys.executable, "-m", "app.main"], check=True)
    except subprocess.CalledProcessError:
        console.print("[red]Error starting server[/red]")
    except KeyboardInterrupt:
        console.print("[yellow]Server stopped[/yellow]")


def start_client():
    """Start a labchain client."""
    try:
        console.print("[bold]Starting Labchain client...[/bold]")
        subprocess.run([sys.executable, "clients/python/starter_client.py", "student"], check=True)
    except subprocess.CalledProcessError:
        console.print("[red]Error starting client[/red]")
    except KeyboardInterrupt:
        console.print("[yellow]Client stopped[/yellow]")


def main():
    """Main entry point for lab runner."""
    while True:
        try:
            show_lab_menu()
            choice = input("\nSelect lab (C, 1-10), 's' for server, 'c' for client, or 'q' to quit: ").strip().upper()
            
            if choice == 'Q':
                console.print("[bold]Goodbye![/bold]")
                break
            elif choice == 'S':
                start_server()
            elif choice == 'C':
                run_lab(choice)  # Run cypherpunk exercise
            elif choice.isdigit() and 1 <= int(choice) <= 10:
                run_lab(choice)
            else:
                console.print("[red]Invalid choice. Please select C, 1-10, 's', 'c', or 'q'.[/red]")
                
        except KeyboardInterrupt:
            console.print("\n[bold]Goodbye![/bold]")
            break
        except Exception as e:
            console.print(f"[red]Error: {e}[/red]")


if __name__ == "__main__":
    main()
