
### **Lab 2: The ClassNet Shared Network**

**Objective:**
Join the "ClassNet" shared blockchain. You will use automated tools (`curl`) to discover peers, transact on a live network, use an automated **Agent** to simulate congestion, and attempt to break the rules (Double Spend).


#### Infrastructure 


* **Terminal:** [https://course.example.edu/labs/bitcoin/student1/](https://course.example.edu/labs/bitcoin/student1/) *(Replace `student1` with your ID)*

* **Share folder:** Anything in your home directory is accessible from outside the environment via:

[https://course.example.edu/labs/bitcoin/static-web-studentX/](https://course.example.edu/labs/bitcoin/static-web-studentX/)

This endpoint can also be reached via `http://bitcoin-student-X:8000/` from inside the environment. 

* **Mempool Explorer:** [https://course.example.edu/labs/bitcoin/mempool/](https://course.example.edu/labs/bitcoin/mempool/)
* **BTC Explorer:** [https://course.example.edu/labs/bitcoin/btc-explorer/](https://course.example.edu/labs/bitcoin/btc-explorer/)



#### **Step 1: Identity & Sharing**

The ClassNet node runs automatically in the background. This is a new blockchain unique
to this class that is accessible from every workstation in the lab.

It is a separate chain from the regtest network so your wallet from the previous lab
is not accessible.

1. **Create Your ClassNet Wallet:**
```bash
bitcoin-cli createwallet "student_wallet"

```


2. **Publish Your Address:**
Generate an address and host it on your personal web server so others can find you.
```bash
# Generate address
MY_ADDR=$(bitcoin-cli -rpcwallet=student_wallet getnewaddress)

# View your address
echo $MY_ADDR

# Save to public web folder.
echo $MY_ADDR > ~/share/address.txt

```

As a reminder,  anything in the ~/share folder is accessible via:

`https://course.example.edu/labs/bitcoin/static-web-studentX/`

from outside the environment, or

http://bitcoin-student-X:8000/ from inside the environment. 

#### **Step 2: Getting some coin. 

Inspecting the Tools (Code Literacy)**

Before you can send coins, you need to mine some. In this fork of
Bitcoin, it only takes 10 blocks before a the first block matures,
so we need to mine 11 total.


```bash
bitcoin-cli -rpcwallet=student_wallet generatetoaddress 11 $MY_ADDR

```
#### **Step 3: Peer Discovery & Transactions**

1. **Fetch a Peer's Address (Automated):**
Choose a student number (e.g., `student2`) and use `curl` to grab their address.
```bash
# Example: Grabbing Student 2's address
PEER_ADDR=$(curl -s http://bitcoin-student-2:8000/address.txt)

# CRITICAL: Verify the variable is not empty before proceeding!
echo "Targeting Peer: $PEER_ADDR"

```


2. **Send Funds:**
Send 0.01 BTC to the peer you just discovered.
```bash
bitcoin-cli -rpcwallet=student_wallet sendtoaddress $PEER_ADDR 0.01

```


3. **Manual Mining:**
Your transaction is "Unconfirmed." Run the python miner to confirm it yourself.

The miner script does the same thing as the `generatetoaddress` command 
you ran earlier, but you can see the algorithm in code. 
Read the `miner.py` script to see how it manually builds block headers. 
Open it and find the loop where `nonce` is incremented.
You'll want to skip to the `mine_block` method.
```bash
less ~/scripts/miner.py

```


*Press `q` to exit.*


```bash
python3 ~/scripts/miner.py -v --address $MY_ADDR | less

```


*Watch for the **Merkle Root** in the output. This is the cryptographic fingerprint of your transaction.*

#### **Step 4: Simulating Congestion (The Agent)**

In a real network, blocks have limited space. We will use an Agent to flood the network.

1. **Start the Agent:**
```bash
python3 ~/scripts/agent.py --wallet student_wallet --verbose 

```


2. **Observe the Fee Market:**
* Go to the [Mempool Explorer](https://course.example.edu/labs/bitcoin/mempool/).
* You will see the mempool filling up with transactions.
* **Concept Check:** If you wanted to send a transaction *right now* and ensure it gets mined in the next block despite this spam, what would you have to do? (Hint: Look at the "Fee Rate" of the unconfirmed transactions).


3. **Stop the Agent:**
```bash
# Press Ctrl+C

```


#### **Step 5: The Double Spend Challenge**

Can you cheat the system? Let's try to spend the same coins twice.

1. **Setup a "Burner" Wallet:**
We need a clean state. Create a temporary wallet and fund it.
```bash
bitcoin-cli createwallet "cheater"
CHEAT_ADDR=$(bitcoin-cli -rpcwallet=cheater getnewaddress)
bitcoin-cli generatetoaddress 11 $CHEAT_ADDR

```


2. **Check Balance:**
You should have exactly 50.0 BTC.
```bash
bitcoin-cli -rpcwallet=cheater getbalance

```


3. **The Attack:**
We will try to send **50 BTC** to Peer A, and then immediately try to send that **same 50 BTC** to Peer B.
```bash
# 1. Send ALL funds to Peer A (Subtract fee from amount to drain wallet completely)
bitcoin-cli -rpcwallet=cheater sendtoaddress $PEER_ADDR 50.0 "comment" "comment_to" true

# 2. Immediately try to send ALL funds again to yourself (or anyone else)
bitcoin-cli -rpcwallet=cheater sendtoaddress $MY_ADDR 50.0 "comment" "comment_to" true

```


4. **The Result:**
What happened?
* Did the node let you broadcast the second transaction?
* Read the error message carefully.
* **Discussion:** Did the error come from your local node, or did it come from the miners rejecting the block? (Hint: It was your local node preventing you from spamming the network with invalid requests).

#### **Step 5: Exploring the Chain**

Go to btc-explorer and mempool and explore your and your classmate's transactions:

* **Mempool Explorer:** [https://course.example.edu/labs/bitcoin/mempool/](https://course.example.edu/labs/bitcoin/mempool/)
* **BTC Explorer:** [https://course.example.edu/labs/bitcoin/btc-explorer/](https://course.example.edu/labs/bitcoin/btc-explorer/)


-------

Here are three additional exercises you can work if you finish the lab early.

#### **Step 4.5: Unsticking a Transaction (RBF)**

Now that the network is congested by the Agent, let's see what happens when you pay a fee that is too low, and then fix it.

1. **Send a "Cheap" Transaction:**
Send money to a peer with a fee rate lower than what the Agent is paying.
```bash
# Send with a manual fee rate of 1 sat/vB (Very low)
# The 'true' at the end enables Replace-By-Fee (RBF)
bitcoin-cli -named sendtoaddress address=$PEER_ADDR amount=0.001 fee_rate=1 replaceable=true

```


2. **Verify it is Stuck:**
Check the **Mempool Explorer**. Your transaction should be at the bottom of the list (or not appearing in the upcoming block) because the miners are prioritizing the Agent's high-fee transactions.
3. **Bump the Fee:**
Use `bumpfee` to increase your bid.
```bash
# Get the Transaction ID (TXID) from the previous output
bitcoin-cli bumpfee <YOUR_TXID>

```


4. **Confirm the Result:**
Check the explorer again. You will see a **new** transaction hash replacing the old one with a higher priority.

---

#### **Step 6: The Malicious Miner (Censorship)**

Miners decide exactly which transactions go into a block. In this step, you will modify your mining software to **censor** a specific transaction from your peer.

1. **Identify the Target:**
Ask your partner to send you a transaction. **Do not** mine it yet. Copy their **TXID**.
2. **Modify the Miner:**
The `miner.py` script builds the block manually. We will hack it to ignore your partner's transaction.
```bash
nano ~/scripts/miner.py

```


Find the section `4. Merkle Root`. Look for the loop: `for tx in transactions:`.
Add this logic (indentation matters in Python!):
```python
for tx in transactions:
    tx_id_hex = tx.get('txid', tx['hash'])

    # --- MALICIOUS CODE START ---
    if tx_id_hex == "YOUR_PARTNERS_TXID_HERE":
        print(f"🚫 CENSORING TRANSACTION: {tx_id_hex}")
        continue
    # --- MALICIOUS CODE END ---

    tx_hashes.append(binascii.unhexlify(tx_id_hex)[::-1])

```


3. **Mine the Block:**
Run your modified miner:
```bash
python3 ~/scripts/miner.py --address $MY_ADDR

```


4. **Observe the Result:**
* **Success:** You successfully mined a block!
* **The Censorship:** Check the **Mempool Explorer**. Even though a new block was added to the chain, your partner's transaction is **still unconfirmed** in the mempool. You effectively froze their funds while processing everyone else's.


#### **Step 7: The Difficulty Adjustment**

Bitcoin adjusts its difficulty to keep block times stable. On Mainnet, this happens every 2 weeks. On **ClassNet**, we have tweaked the code to update every **4 blocks**.

1. **Check Current Difficulty:**
```bash
bitcoin-cli getblockchaininfo | grep difficulty

```


2. **Mine a "Epoch":**
Mine 5 blocks in a row quickly (since you have high CPU power relative to the difficulty).
```bash
bitcoin-cli -rpcwallet=student_wallet generatetoaddress 5 $MY_ADDR

```


3. **Check Difficulty Again:**
```bash
bitcoin-cli getblockchaininfo | grep difficulty

```


**Analysis:** Did the difficulty go up or down? Why?
*(Answer: Since you mined 5 blocks very fast—faster than the target of 1 minute per block—the protocol increased the difficulty to make it harder for the next round.)*
