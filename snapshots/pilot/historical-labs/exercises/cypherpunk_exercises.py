#!/usr/bin/env python3
"""
Cypherpunk Ethos and Decentralized Trust Exercise
Interactive exercises for understanding the philosophical and historical foundations of blockchain
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
from rich.prompt import Prompt, Confirm
from rich.markdown import Markdown

console = Console()


class CypherpunkExercises:
    """Interactive exercises for understanding cypherpunk ethos and decentralized trust."""
    
    def __init__(self, server_url: str = "http://localhost:8000"):
        self.server_url = server_url
        self.client_id = f"cypherpunk_student_{int(time.time())}"
        self.score = 0
        self.total_questions = 0
        
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
    
    def display_intro(self):
        """Display introduction to cypherpunk ethos."""
        intro_text = """
# The Cypherpunk Ethos and Decentralized Trust

Welcome to an exploration of the philosophical and historical foundations that led to the creation of Bitcoin and blockchain technology.

## What You'll Learn:
- The **Cypherpunk movement** and its core principles
- Historical examples of **privacy through cryptography**
- The **Crypto Wars** and their impact on digital freedom
- How **decentralized trust** differs from traditional systems
- Real-world applications of cypherpunk principles

## Why This Matters:
Understanding the 'why' behind blockchain helps you:
- Evaluate new blockchain projects critically
- Understand the security implications of different designs
- Navigate policy debates about cryptocurrency regulation
- Design systems that align with cypherpunk principles

Let's begin our journey into the world of digital privacy, cryptography, and trust without intermediaries.
        """
        
        console.print(Panel.fit(
            Markdown(intro_text),
            title="🎯 Learning Objectives",
            border_style="blue"
        ))
    
    def exercise_1_trust_models(self):
        """Exercise 1: Understanding Trust Models"""
        console.print(Panel.fit(
            "[bold blue]Exercise 1: Trust Models - Centralized vs Decentralized[/bold blue]\n"
            "Explore how trust works in traditional systems vs blockchain systems.",
            title="🔍 Trust Analysis"
        ))
        
        console.print("\n[yellow]Scenario:[/yellow] You want to send $100 to a friend in another country.")
        
        # Traditional system analysis
        console.print("\n[bold]Traditional Banking System:[/bold]")
        console.print("""
1. You give money to your bank
2. Bank verifies your identity (KYC)
3. Bank checks you have sufficient funds
4. Bank sends money to friend's bank
5. Friend's bank credits their account
6. Both banks charge fees
        """)
        
        console.print("\n[bold cyan]Key Questions:[/bold cyan]")
        console.print("• Who do you trust in this system?")
        console.print("• What happens if a bank fails?")
        console.print("• Can banks block or reverse transactions?")
        console.print("• What are the costs of this system?")
        
        # Interactive discussion
        console.print("\n[yellow]Think-Pair-Share Activity:[/yellow]")
        console.print("Discuss with a partner: What are the advantages and disadvantages of this centralized trust model?")
        
        input("\nPress Enter when you've discussed the traditional system...")
        
        # Blockchain system analysis
        console.print("\n[bold]Blockchain System (Bitcoin):[/bold]")
        console.print("""
1. You create a transaction with your private key
2. Transaction is broadcast to the network
3. Miners validate the transaction
4. Transaction is included in a block
5. Block is added to the blockchain
6. Friend receives the Bitcoin
        """)
        
        console.print("\n[bold cyan]Key Questions:[/bold cyan]")
        console.print("• Who do you trust in this system?")
        console.print("• What happens if miners disagree?")
        console.print("• Can transactions be blocked or reversed?")
        console.print("• What are the costs of this system?")
        
        # Comparison table
        table = Table(title="Trust Model Comparison")
        table.add_column("Aspect", style="cyan")
        table.add_column("Centralized (Banking)", style="red")
        table.add_column("Decentralized (Bitcoin)", style="green")
        
        table.add_row("Trust Required", "Banks, Governments", "Cryptography, Math")
        table.add_row("Single Point of Failure", "Yes (Bank)", "No")
        table.add_row("Transaction Fees", "High (2-3%)", "Variable")
        table.add_row("Censorship Resistance", "Low", "High")
        table.add_row("Speed", "Fast", "Slow (10 min)")
        table.add_row("Privacy", "Bank knows all", "Pseudonymous")
        
        console.print(table)
        
        console.print("\n[green]✓ Exercise 1 Complete![/green]")
        console.print("You should understand:")
        console.print("• How centralized trust works")
        console.print("• How decentralized trust works")
        console.print("• Trade-offs between the two models")
    
    def exercise_2_cypherpunk_history(self):
        """Exercise 2: Cypherpunk History and Philosophy"""
        console.print(Panel.fit(
            "[bold blue]Exercise 2: The Cypherpunk Movement[/bold blue]\n"
            "Explore the history and philosophy that led to Bitcoin.",
            title="📚 Historical Context"
        ))
        
        # Timeline exercise
        console.print("\n[yellow]Timeline Challenge:[/yellow]")
        console.print("Arrange these events in chronological order:")
        
        events = [
            "Bitcoin whitepaper published",
            "PGP encryption software released",
            "A Cypherpunk's Manifesto written",
            "DigiCash company founded",
            "Napster file sharing launched",
            "2008 Financial Crisis begins"
        ]
        
        console.print("\nEvents to arrange:")
        for i, event in enumerate(events, 1):
            console.print(f"{i}. {event}")
        
        # Correct order
        correct_order = [
            "PGP encryption software released (1991)",
            "A Cypherpunk's Manifesto written (1993)",
            "DigiCash company founded (1989)",
            "Napster file sharing launched (1999)",
            "2008 Financial Crisis begins (2008)",
            "Bitcoin whitepaper published (2008)"
        ]
        
        input("\nPress Enter to see the correct chronological order...")
        
        console.print("\n[bold green]Correct Chronological Order:[/bold green]")
        for i, event in enumerate(correct_order, 1):
            console.print(f"{i}. {event}")
        
        # Key figures
        console.print("\n[yellow]Key Figures in Cypherpunk History:[/yellow]")
        
        figures_table = Table(title="Cypherpunk Pioneers")
        figures_table.add_column("Person", style="cyan")
        figures_table.add_column("Contribution", style="magenta")
        figures_table.add_column("Significance", style="yellow")
        
        figures_table.add_row(
            "Eric Hughes",
            "A Cypherpunk's Manifesto (1993)",
            "Defined core philosophy: privacy through cryptography"
        )
        figures_table.add_row(
            "Phil Zimmermann",
            "PGP Encryption (1991)",
            "Made strong encryption accessible to public"
        )
        figures_table.add_row(
            "David Chaum",
            "DigiCash (1989)",
            "First attempt at digital cash with privacy"
        )
        figures_table.add_row(
            "Timothy C. May",
            "Crypto Anarchist Manifesto",
            "Envisioned cryptography enabling digital freedom"
        )
        figures_table.add_row(
            "Satoshi Nakamoto",
            "Bitcoin Whitepaper (2008)",
            "Synthesized decades of ideas into working system"
        )
        
        console.print(figures_table)
        
        # Philosophy discussion
        console.print("\n[yellow]Core Cypherpunk Principles:[/yellow]")
        console.print("""
1. **Privacy is a fundamental right** - not something to be granted by authorities
2. **Cryptography enables freedom** - strong crypto protects individual liberty
3. **Code is speech** - software source code should be protected expression
4. **Decentralization reduces power concentration** - no single point of control
5. **Trust should be minimized** - rely on math and code, not institutions
        """)
        
        console.print("\n[green]✓ Exercise 2 Complete![/green]")
        console.print("You should understand:")
        console.print("• The historical timeline of cypherpunk development")
        console.print("• Key figures and their contributions")
        console.print("• Core philosophical principles")
    
    def exercise_3_crypto_wars(self):
        """Exercise 3: The Crypto Wars"""
        console.print(Panel.fit(
            "[bold blue]Exercise 3: The Crypto Wars[/bold blue]\n"
            "Understand the battle for cryptographic freedom in the 1990s.",
            title="⚔️ Historical Battle"
        ))
        
        console.print("\n[yellow]The Conflict:[/yellow]")
        console.print("""
In the 1990s, the U.S. government classified strong cryptography as a 'munition' 
under the International Traffic in Arms Regulations (ITAR). This meant:

• Exporting encryption software was illegal
• Only weak encryption could be exported
• Government wanted 'backdoors' in all crypto
• Goal: Ensure NSA could break any code
        """)
        
        console.print("\n[bold]Government Position:[/bold]")
        console.print("• Strong crypto helps criminals and terrorists")
        console.print("• Law enforcement needs access to communications")
        console.print("• National security requires surveillance capabilities")
        console.print("• Only government should have strong crypto")
        
        console.print("\n[bold]Cypherpunk Response:[/bold]")
        console.print("• Privacy is essential for democracy")
        console.print("• Strong crypto protects individual liberty")
        console.print("• Code is protected speech under First Amendment")
        console.print("• Everyone deserves access to privacy tools")
        
        # PGP case study
        console.print("\n[yellow]Case Study: PGP (Pretty Good Privacy)[/yellow]")
        console.print("""
Phil Zimmermann created PGP in 1991 and released it for free online.
This triggered a 3-year federal criminal investigation for 'munitions smuggling.'

The Cypherpunk Solution:
1. Print the complete PGP source code in a book
2. Books are protected by First Amendment
3. Ship books internationally legally
4. Recipients scan pages and compile the code
5. Strong crypto spreads globally despite export ban
        """)
        
        # Legal battles
        console.print("\n[yellow]Legal Victories:[/yellow]")
        console.print("""
• Bernstein v. U.S. Department of Justice (1996)
  - Established that source code is protected speech
  - First Amendment protects cryptographic software
  
• Karn v. U.S. Department of State (1996)
  - Challenged ITAR restrictions on crypto exports
  - Led to relaxation of export controls
        """)
        
        # Modern relevance
        console.print("\n[yellow]Modern Relevance:[/yellow]")
        console.print("""
The Crypto Wars never really ended. Today we see:

• Calls for 'responsible encryption' with backdoors
• Government pressure on tech companies
• Debates over cryptocurrency regulation
• Surveillance vs. privacy tensions
        """)
        
        console.print("\n[green]✓ Exercise 3 Complete![/green]")
        console.print("You should understand:")
        console.print("• Why governments tried to restrict cryptography")
        console.print("• How Cypherpunks fought for crypto freedom")
        console.print("• Legal precedents that enabled Bitcoin")
        console.print("• Ongoing relevance of these debates")
    
    def exercise_4_early_failures(self):
        """Exercise 4: Learning from Early Digital Currency Failures"""
        console.print(Panel.fit(
            "[bold blue]Exercise 4: Early Digital Currency Failures[/bold blue]\n"
            "Analyze why early attempts at digital money failed.",
            title="💡 Learning from Mistakes"
        ))
        
        # DigiCash analysis
        console.print("\n[yellow]Case Study 1: DigiCash (1989-1998)[/yellow]")
        console.print("""
Created by: David Chaum (brilliant cryptographer)
Technology: Blind signatures for perfect privacy
Business Model: Licensed software to banks
Result: Company went bankrupt in 1998
        """)
        
        console.print("\n[bold]DigiCash Architecture:[/bold]")
        console.print("""
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User A    │    │   User B    │    │   User C    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌─────────────┐
                    │ DigiCash    │
                    │ Server       │
                    └─────────────┘
                           │
                    ┌─────────────┐
                    │   Bank      │
                    │ Partnership │
                    └─────────────┘
        """)
        
        console.print("\n[bold cyan]Critical Analysis Questions:[/bold cyan]")
        console.print("• What was DigiCash's fatal flaw?")
        console.print("• Why did it need bank partnerships?")
        console.print("• What happened when the company failed?")
        
        input("\nPress Enter to see the analysis...")
        
        console.print("\n[bold red]DigiCash's Fatal Flaw:[/bold red]")
        console.print("""
Despite having superior privacy technology, DigiCash was CENTRALIZED:

1. Single company controlled the system
2. Required partnerships with traditional banks
3. When company failed, entire system died
4. Users lost access to their digital money
5. Proved that centralized digital cash is fragile

Lesson: Even perfect cryptography can't save a centralized system.
        """)
        
        # e-gold analysis
        console.print("\n[yellow]Case Study 2: e-gold (1996-2009)[/yellow]")
        console.print("""
Created by: Douglas Jackson and Barry Downey
Technology: Digital currency backed by physical gold
Business Model: Centralized service with gold reserves
Result: Shut down by U.S. government in 2009
        """)
        
        console.print("\n[bold cyan]e-gold's Success and Failure:[/bold cyan]")
        console.print("""
Success:
• Popular alternative currency (5 million accounts)
• Backed by real gold reserves
• Low transaction fees
• Global reach

Failure:
• Became hub for criminal activity
• Lax identity verification
• Centralized control = single target
• U.S. government shut it down
• Founders indicted for money laundering
        """)
        
        console.print("\n[bold red]e-gold's Fatal Flaw:[/bold red]")
        console.print("""
Centralized control made it vulnerable:

1. Single company could be shut down
2. Founders could be arrested
3. Government could freeze all accounts
4. No way to continue without central authority

Lesson: Any centralized digital currency is a single point of failure.
        """)
        
        # Bitcoin's solution
        console.print("\n[yellow]How Bitcoin Solved These Problems:[/yellow]")
        console.print("""
Bitcoin learned from these failures:

1. **No Central Company**: No headquarters to raid
2. **No Central Server**: Distributed network
3. **No Central Authority**: No CEO to arrest
4. **No Single Point of Failure**: Thousands of nodes
5. **Censorship Resistant**: Can't be shut down

The result: A digital currency that can't be killed by shutting down a company.
        """)
        
        console.print("\n[green]✓ Exercise 4 Complete![/green]")
        console.print("You should understand:")
        console.print("• Why DigiCash failed despite great technology")
        console.print("• Why e-gold was shut down by government")
        console.print("• The critical importance of decentralization")
        console.print("• How Bitcoin learned from these failures")
    
    def exercise_5_p2p_revolution(self):
        """Exercise 5: The P2P Revolution"""
        console.print(Panel.fit(
            "[bold blue]Exercise 5: The P2P Revolution[/bold blue]\n"
            "Understand how peer-to-peer networks changed everything.",
            title="🌐 Network Evolution"
        ))
        
        console.print("\n[yellow]The Napster Revolution (1999):[/yellow]")
        console.print("""
Napster proved that millions of people could share files directly:

• 80 million users at peak
• Shared music files peer-to-peer
• No central music store needed
• Challenged entire music industry
        """)
        
        console.print("\n[bold]Napster's Architecture:[/bold]")
        console.print("""
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User A    │    │   User B    │    │   User C    │
│ (has song)  │    │ (wants song)│    │ (has song)  │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌─────────────┐
                    │   Napster    │
                    │   Server     │
                    │ (file index) │
                    └─────────────┘
        """)
        
        console.print("\n[bold cyan]Napster's Weakness:[/bold cyan]")
        console.print("""
Napster had a central server that maintained the file index.
When record companies sued, the court ordered this server shut down.
Result: Napster died instantly.

Lesson: Even P2P systems can be vulnerable if they have central components.
        """)
        
        # BitTorrent evolution
        console.print("\n[yellow]BitTorrent: True Decentralization (2001):[/yellow]")
        console.print("""
BitTorrent solved Napster's centralization problem:

• No central server at all
• Users find files by querying neighbors
• Neighbors query their neighbors
• Creates a distributed search network
• Impossible to shut down completely
        """)
        
        console.print("\n[bold]BitTorrent Architecture:[/bold]")
        console.print("""
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User A    │◄──►│   User B    │◄──►│   User C    │
│ (has file)  │    │ (wants file)│    │ (has file)  │
└─────────────┘    └─────────────┘    └─────────────┘
       ▲                   ▲                   ▲
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌─────────────┐
                    │   User D    │
                    │ (seeding)   │
                    └─────────────┘
        """)
        
        console.print("\n[bold green]BitTorrent's Innovation:[/bold green]")
        console.print("""
1. **Distributed Search**: No central index
2. **Incentive System**: Reward uploaders with faster downloads
3. **Fault Tolerance**: Network survives node failures
4. **Scalability**: More users = better performance
5. **Censorship Resistance**: Can't be shut down
        """)
        
        # Connection to Bitcoin
        console.print("\n[yellow]How This Led to Bitcoin:[/yellow]")
        console.print("""
BitTorrent proved that large-scale decentralized coordination was possible:

• Millions of users cooperating without central control
• Economic incentives encouraging good behavior
• Network that couldn't be shut down
• Global reach without intermediaries

This was the final technical proof that Bitcoin's vision was achievable.
        """)
        
        console.print("\n[green]✓ Exercise 5 Complete![/green]")
        console.print("You should understand:")
        console.print("• How Napster revolutionized file sharing")
        console.print("• Why Napster's centralization was its weakness")
        console.print("• How BitTorrent achieved true decentralization")
        console.print("• How P2P networks enabled Bitcoin's vision")
    
    def exercise_6_bitcoin_synthesis(self):
        """Exercise 6: Bitcoin as Synthesis"""
        console.print(Panel.fit(
            "[bold blue]Exercise 6: Bitcoin as Synthesis[/bold blue]\n"
            "Understand how Bitcoin combined decades of ideas.",
            title="🧩 Putting It All Together"
        ))
        
        console.print("\n[yellow]Bitcoin's Ingredients:[/yellow]")
        
        ingredients_table = Table(title="Bitcoin's Building Blocks")
        ingredients_table.add_column("Component", style="cyan")
        ingredients_table.add_column("Source", style="magenta")
        ingredients_table.add_column("Purpose", style="yellow")
        
        ingredients_table.add_row(
            "Public Key Cryptography",
            "1970s-80s",
            "Digital signatures for ownership"
        )
        ingredients_table.add_row(
            "Hash Functions",
            "1970s-90s",
            "Creating unique transaction IDs"
        )
        ingredients_table.add_row(
            "Cypherpunk Philosophy",
            "1990s",
            "Privacy and decentralization goals"
        )
        ingredients_table.add_row(
            "P2P Networks",
            "2000s",
            "Distributed communication"
        )
        ingredients_table.add_row(
            "Proof of Work",
            "Hashcash (1997)",
            "Consensus without central authority"
        )
        ingredients_table.add_row(
            "Economic Incentives",
            "BitTorrent",
            "Encouraging good behavior"
        )
        
        console.print(ingredients_table)
        
        # The breakthrough
        console.print("\n[yellow]Satoshi's Key Breakthrough:[/yellow]")
        console.print("""
The double-spending problem had stumped cryptographers for decades:

Problem: How do you prevent someone from spending the same digital coin twice?

Previous solutions all required a central authority (bank) to prevent double-spending.

Satoshi's solution: Use Proof of Work to make it expensive to rewrite history.
        """)
        
        console.print("\n[bold]How Proof of Work Solves Double-Spending:[/bold]")
        console.print("""
1. Transactions are grouped into blocks
2. Miners compete to solve cryptographic puzzle
3. Winner gets to add block to blockchain
4. Solving puzzle costs real resources (electricity)
5. Rewriting history costs more than creating new blocks
6. Economic incentive prevents attacks
        """)
        
        # Genesis block message
        console.print("\n[yellow]The Genesis Block Message:[/yellow]")
        console.print("""
The first Bitcoin block contains a hidden message:

"The Times 03/Jan/2009 Chancellor on brink of second bailout for banks"

This is a direct quote from a newspaper headline about the 2008 financial crisis.
It's a permanent, timestamped declaration of Bitcoin's purpose:

To be an alternative to a failing, trust-based banking system.
        """)
        
        console.print("\n[green]✓ Exercise 6 Complete![/green]")
        console.print("You should understand:")
        console.print("• How Bitcoin synthesized decades of research")
        console.print("• The breakthrough that solved double-spending")
        console.print("• How Proof of Work enables decentralized consensus")
        console.print("• Bitcoin's connection to the 2008 financial crisis")
    
    def knowledge_quiz(self):
        """Interactive knowledge quiz."""
        console.print(Panel.fit(
            "[bold blue]Knowledge Quiz: Cypherpunk Ethos[/bold blue]\n"
            "Test your understanding of the material.",
            title="📝 Quiz Time"
        ))
        
        questions = [
            {
                "question": "What was the main goal of the Cypherpunk movement?",
                "options": [
                    "A) To create better banking software",
                    "B) To achieve privacy through cryptography",
                    "C) To help governments with surveillance",
                    "D) To make encryption illegal"
                ]
            },
            {
                "question": "Why did DigiCash fail despite having superior privacy technology?",
                "options": [
                    "A) The cryptography was too weak",
                    "B) It was centralized and dependent on a single company",
                    "C) Users didn't want privacy",
                    "D) It was too expensive to use"
                ]
            },
            {
                "question": "What was the main weakness of Napster's architecture?",
                "options": [
                    "A) It used weak encryption",
                    "B) It had a central server that could be shut down",
                    "C) It was too slow",
                    "D) It didn't have enough users"
                ]
            },
            {
                "question": "How did Bitcoin solve the double-spending problem?",
                "options": [
                    "A) By using a central bank",
                    "B) By using Proof of Work to make rewriting history expensive",
                    "C) By requiring government approval",
                    "D) By using weak cryptography"
                ]
            },
            {
                "question": "What does the Bitcoin Genesis Block message reference?",
                "options": [
                    "A) The creation of the internet",
                    "B) The 2008 financial crisis",
                    "C) The invention of cryptography",
                    "D) The Cypherpunk manifesto"
                ]
            }
        ]
        
        self.total_questions = len(questions)
        
        for i, q in enumerate(questions, 1):
            console.print(f"\n[bold]Question {i}/{self.total_questions}:[/bold]")
            console.print(f"[yellow]{q['question']}[/yellow]")
            
            for option in q['options']:
                console.print(f"  {option}")
            
            Prompt.ask("\nYour answer", choices=["A", "B", "C", "D"])
        console.print("\nResponses recorded for discussion; this exercise is ungraded.")

    def practical_exercise(self):
        """Practical exercise demonstrating cypherpunk principles."""
        console.print(Panel.fit(
            "[bold blue]Practical Exercise: Privacy in Practice[/bold blue]\n"
            "Experience cypherpunk principles through hands-on activities.",
            title="🔐 Hands-On Learning"
        ))
        
        console.print("\n[yellow]Exercise: Encrypted Communication[/yellow]")
        console.print("""
Let's simulate the experience of using strong encryption for private communication.

You and a partner will:
1. Generate a shared secret key
2. Encrypt a message
3. Decrypt the message
4. Discuss the implications
        """)
        
        # Simple encryption demo
        console.print("\n[bold]Step 1: Generate a Secret Key[/bold]")
        import secrets
        key = secrets.token_hex(16)
        console.print(f"Your secret key: [bold]{key}[/bold]")
        console.print("(In real PGP, this would be your private key)")
        
        console.print("\n[bold]Step 2: Encrypt a Message[/bold]")
        message = Prompt.ask("Enter a message to encrypt")
        
        # Simple XOR encryption for demo
        encrypted = ''.join(chr(ord(c) ^ ord(key[i % len(key)])) for i, c in enumerate(message))
        encrypted_hex = encrypted.encode().hex()
        
        console.print(f"Encrypted message: [bold]{encrypted_hex}[/bold]")
        console.print("(This is what would be transmitted over the internet)")
        
        console.print("\n[bold]Step 3: Decrypt the Message[/bold]")
        decrypted_bytes = bytes.fromhex(encrypted_hex)
        decrypted = ''.join(chr(decrypted_bytes[i] ^ ord(key[i % len(key)])) for i in range(len(decrypted_bytes)))
        
        console.print(f"Decrypted message: [bold]{decrypted}[/bold]")
        
        console.print("\n[yellow]Discussion Questions:[/yellow]")
        console.print("• How does this demonstrate privacy through cryptography?")
        console.print("• What would happen if someone intercepted the encrypted message?")
        console.print("• How does this relate to Bitcoin's use of cryptography?")
        
        input("\nPress Enter when you've discussed these questions...")
        
        console.print("\n[green]✓ Practical Exercise Complete![/green]")
        console.print("You should understand:")
        console.print("• How cryptography enables private communication")
        console.print("• Why strong encryption is essential for privacy")
        console.print("• How these principles apply to blockchain systems")
    
    def run_all_exercises(self):
        """Run all cypherpunk exercises."""
        self.display_intro()
        
        if not self.connect():
            console.print("[red]Cannot connect to server. Continuing with offline exercises.[/red]")
        
        console.print("\n[bold]Available Exercises:[/bold]")
        console.print("1. Exercise 1: Trust Models")
        console.print("2. Exercise 2: Cypherpunk History")
        console.print("3. Exercise 3: The Crypto Wars")
        console.print("4. Exercise 4: Early Digital Currency Failures")
        console.print("5. Exercise 5: The P2P Revolution")
        console.print("6. Exercise 6: Bitcoin as Synthesis")
        console.print("7. Knowledge Quiz")
        console.print("8. Practical Exercise")
        console.print("9. Run All Exercises")
        
        while True:
            try:
                choice = input("\nSelect exercise (1-9) or 'q' to quit: ").strip()
                
                if choice == 'q':
                    break
                elif choice == '1':
                    self.exercise_1_trust_models()
                elif choice == '2':
                    self.exercise_2_cypherpunk_history()
                elif choice == '3':
                    self.exercise_3_crypto_wars()
                elif choice == '4':
                    self.exercise_4_early_failures()
                elif choice == '5':
                    self.exercise_5_p2p_revolution()
                elif choice == '6':
                    self.exercise_6_bitcoin_synthesis()
                elif choice == '7':
                    self.knowledge_quiz()
                elif choice == '8':
                    self.practical_exercise()
                elif choice == '9':
                    self.exercise_1_trust_models()
                    self.exercise_2_cypherpunk_history()
                    self.exercise_3_crypto_wars()
                    self.exercise_4_early_failures()
                    self.exercise_5_p2p_revolution()
                    self.exercise_6_bitcoin_synthesis()
                    self.knowledge_quiz()
                    self.practical_exercise()
                    console.print("\n[bold green]🎉 All Cypherpunk exercises completed![/bold green]")
                else:
                    console.print("[red]Invalid choice. Please select 1-9 or 'q'.[/red]")
                    
            except KeyboardInterrupt:
                break
        
        console.print("\n[bold]Cypherpunk Ethos Exercise Complete![/bold]")
        console.print("You now understand the philosophical and historical foundations of blockchain technology.")


def main():
    """Main entry point for cypherpunk exercises."""
    exercises = CypherpunkExercises()
    exercises.run_all_exercises()


if __name__ == "__main__":
    main()
