import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ethers } from 'ethers'
import { applySessionWalletState, checkNodeStatus, getGuestWallet, getWalletInfo, generateNewWallet, getWalletList, setActiveWallet } from './web3'
import { fetchSessionState, fetchSessionWalletBalance, patchSessionNamespace, resetSessionState } from './lib/sessionState'
import PoSABI from './PoS.json'
import { InstructorView } from './views/InstructorView'
import { DiagnosticsView } from './views/DiagnosticsView'
import { BeaconChainLabView } from './views/BeaconChainLabView'
import { ContractBuilderLabView } from './views/ContractBuilderLabView'
import { TokenizationLabView } from './views/TokenizationLabView'
import { ArcadeLabView } from './views/ArcadeLabView'
import { MarketplaceView } from './views/MarketplaceView'
import { LABS, INITIAL_SETUP, getLabById } from './constants/labs'
import { ROLE_CONTRACT_TEMPLATES } from './constants/roleContractTemplates'
import LabDetailView from './components/LabDetailView'
import { blockchainSync } from './lib/BlockchainSync'
import { copyToClipboard } from './lib/clipboard'
import { resolveRpcUrl, rpcClient } from './lib/RpcClient'
import { applyContractSourcesState } from './lib/contractSources'
import { ChainExplorer } from './components/ChainExplorer'
import { RoleHub } from './components/RoleHub'
import { PoSLeaderboard } from './components/PoSLeaderboard'
import { ErrorBoundary } from './components/ErrorBoundary'
import ArcadeTokenArtifact from './contracts/ArcadeToken.json'
import LabNFTArtifact from './contracts/LabNFT.json'
import {
  BlockchainVisualizer,
  AddressDecoder,
  StakingRewards,
  ValidatorProbability,
  SlashingPenalty,
  AttackCost,
} from './components/mini-labs'
import './index.css'

// Open Lab Terminal in a new window/tab.
// rpcUrl is browser-facing; terminalRpcUrl is an optional shell-only override.
function openLabTerminal(rpcUrl, terminalRpcUrl = '') {
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  let path = base.replace(/\/$/, '') + '/terminal';
  if (rpcUrl && rpcUrl.trim()) {
    path += '?rpc=' + encodeURIComponent(rpcUrl.trim());
  }
  if (terminalRpcUrl && terminalRpcUrl.trim()) {
    path += (path.includes('?') ? '&' : '?') + 'trpc=' + encodeURIComponent(terminalRpcUrl.trim());
  }
  window.open(path, 'lab-terminal-' + Date.now(), 'noopener,noreferrer,width=1000,height=700,scrollbars=yes');
}

const SHAREABLE_QUERY_VIEWS = new Set([
  'live',
  'diagnostics',
  'beacon-lab',
  'contract-builder-lab',
  'tokenization-lab',
  'arcade-lab',
  'nft-marketplace',
  'forensics-lab',
])

const DASHBOARD_WRITE_GAS_PRICE = ethers.parseUnits('2', 'gwei')
const DASHBOARD_WRITE_TX_OPTIONS = {
  eth: { gasLimit: 21000n, gasPrice: DASHBOARD_WRITE_GAS_PRICE },
  arc: { gasLimit: 120000n, gasPrice: DASHBOARD_WRITE_GAS_PRICE },
  nft: { gasLimit: 160000n, gasPrice: DASHBOARD_WRITE_GAS_PRICE },
}
const WALLET_BALANCE_POLL_MS = 5000

const dashboardShort = (value, left = 6) => (
  value ? `${String(value).slice(0, left)}...${String(value).slice(-4)}` : '-'
)

function dashboardLabUrl(path) {
  const base = import.meta.env.BASE_URL || '/'
  return base.endsWith('/') ? `${base}${path}` : `${base}/${path}`
}

function dashboardSafeBigInt(value, fallback = 0n) {
  try {
    if (value == null || value === '') return fallback
    return BigInt(value)
  } catch (_) {
    return fallback
  }
}

async function dashboardSafeJson(response) {
  if (!response || !response.ok) return {}
  try {
    return await response.json()
  } catch (_) {
    return {}
  }
}

function dashboardErrorMessage(error) {
  const seen = new Set()
  const collect = (value) => {
    if (!value) return []
    if (typeof value === 'string') return [value]
    if (typeof value !== 'object' || seen.has(value)) return []
    seen.add(value)

    const messages = []
    const push = (item) => {
      for (const msg of collect(item)) {
        if (msg && !messages.includes(msg)) messages.push(msg)
      }
    }

    push(value.shortMessage && value.shortMessage !== 'could not coalesce error' ? value.shortMessage : null)
    push(value.reason)
    push(value.error?.message)
    push(value.info?.error?.message)
    push(value.data?.message)
    push(value.cause)

    if (typeof value.body === 'string') {
      try { push(JSON.parse(value.body)) } catch (_) { push(value.body) }
    }

    push(value.message && value.message !== 'could not coalesce error' ? value.message : null)
    return messages
  }

  return collect(error)[0] || error?.message || String(error)
}

async function waitForDashboardTransactionReceipt(tx, providerLike, { timeoutMs = 90000, intervalMs = 1000 } = {}) {
  const hash = typeof tx === 'string' ? tx : tx?.hash
  if (!hash) throw new Error('Missing transaction hash.')
  const rpcProvider = tx?.provider || providerLike
  if (!rpcProvider?.send) throw new Error('Wallet provider cannot poll transaction receipts.')
  const deadline = Date.now() + timeoutMs
  let lastError = null
  while (Date.now() < deadline) {
    try {
      const receipt = await rpcProvider.send('eth_getTransactionReceipt', [hash])
      if (receipt) return { ...receipt, hash: receipt.transactionHash || hash }
    } catch (err) {
      lastError = err
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error(`Timed out waiting for transaction ${dashboardShort(hash)}${lastError ? `: ${dashboardErrorMessage(lastError)}` : ''}`)
}

function dashboardReceiptBlockNumber(receipt) {
  const raw = receipt?.blockNumber
  if (typeof raw === 'number') return raw
  if (typeof raw === 'bigint') return Number(raw)
  if (typeof raw === 'string' && raw.startsWith('0x')) return parseInt(raw, 16)
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

// Account 0 = deployer = bank/faucet (Hardhat's first test account).
// The deployer holds onlyInstructor privileges; the bank sends test ETH to students.
// ============= KM METADATA & PROVENANCE =============
const CONTENT_METADATA = {
    version: "1.1.3",
    lastUpdated: "March 27 2026",
    author: "Ethereum Lab Development Team",
    sources: [
        "Ethereum Foundation Documentation",
        "ethereum.org/staking",
        "Vitalik Buterin's Blog",
        "EIP-3675 (The Merge)"
    ],
    reviewedBy: "Academic Review Committee",
    accuracy: "Content verified against Ethereum mainnet specifications"
};

// Provenance Badge Component
const ProvenanceBadge = ({ showFull = false }) => (
    <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: showFull ? '12px 16px' : '6px 12px',
        background: 'rgba(34, 197, 94, 0.1)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        borderRadius: '8px',
        fontSize: showFull ? '0.85rem' : '0.75rem',
        color: '#86efac'
    }}>
        <span style={{color: '#22c55e'}}>✓</span>
        <span>Verified Content</span>
        {showFull && (
            <span style={{color: '#64748b', marginLeft: '8px'}}>
                | Updated {CONTENT_METADATA.lastUpdated} | v{CONTENT_METADATA.version}
            </span>
        )}
    </div>
);

// Social Proof Component - Shows community activity (compact, expandable)
const SocialProof = ({ validators, messages, stakersCount }) => {
    const [expanded, setExpanded] = useState(false);
    const localStats = { quizzes: 0, sessions: 0, feedbackCount: 0 };
    
    const activeStudents = validators?.length || 0;
    const totalMessages = messages?.length || 0;
    const participantCount = activeStudents || stakersCount || 0;
    
    return (
        <div style={{
            padding: '0.4rem 0.65rem',
            marginBottom: '0.75rem',
            background: 'rgba(59, 130, 246, 0.05)',
            borderRadius: '0.35rem',
            border: '1px solid rgba(59, 130, 246, 0.2)'
        }}>
            <button
                onClick={() => setExpanded(!expanded)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    padding: 0
                }}
            >
                <span>{expanded ? '▼' : '▶'}</span>
                <span>{participantCount} participants</span>
                {totalMessages > 0 && <span style={{color: '#64748b'}}>· {totalMessages} messages</span>}
            </button>
            {expanded && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(59,130,246,0.15)' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                background: 'rgba(34, 197, 94, 0.1)',
                borderRadius: '20px'
            }}>
                <span style={{fontSize: '1.1rem'}}>👥</span>
                <span style={{color: '#86efac', fontWeight: '600', fontSize: '0.9rem'}}>
                    {activeStudents} Active {activeStudents === 1 ? 'Student' : 'Students'}
                </span>
            </div>
            
            {totalMessages > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    background: 'rgba(139, 92, 246, 0.1)',
                    borderRadius: '20px'
                }}>
                    <span style={{fontSize: '1.1rem'}}>💬</span>
                    <span style={{color: '#a78bfa', fontWeight: '600', fontSize: '0.9rem'}}>
                        {totalMessages} {totalMessages === 1 ? 'Message' : 'Messages'} Shared
                    </span>
                </div>
            )}
            
            {stakersCount > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    background: 'rgba(251, 191, 36, 0.1)',
                    borderRadius: '20px'
                }}>
                    <span style={{fontSize: '1.1rem'}}>🏦</span>
                    <span style={{color: '#fcd34d', fontWeight: '600', fontSize: '0.9rem'}}>
                        {stakersCount} {stakersCount === 1 ? 'Validator' : 'Validators'} Staking
                    </span>
                </div>
            )}
            
            {localStats.quizzes > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 10px',
                    background: 'rgba(236, 72, 153, 0.1)',
                    borderRadius: '0.35rem',
                    fontSize: '0.8rem'
                }}>
                    <span>✅</span>
                    <span style={{color: '#f472b6', fontWeight: '600'}}>{localStats.quizzes} Quizzes</span>
                </div>
            )}
        </div>
            )}
        </div>
    );
};


// --- ORIENTATION CONTENT ---
const INTRO_SECTIONS = [
    {
        title: "🌐 What is Ethereum?",
        bullets: [
            "Ethereum is not just money—it's a global, shared computer that no one owns",
            "Decentralized: Runs on thousands of computers (nodes) simultaneously worldwide",
            "Immutable: Once data is written to the blockchain, it cannot be erased or altered",
            "Programmable: You can write code (smart contracts) that executes automatically"
        ]
    },
    {
        title: "🎯 Why This Lab Exists",
        bullets: [
            "Experience a complete Ethereum stack without cloud services or real money",
            "Understand how the world's second-largest blockchain actually works",
            "Practice safely in a classroom environment before touching production networks",
            "See firsthand why Ethereum switched from Proof-of-Work to Proof-of-Stake"
        ]
    },
    {
        title: "📚 What You'll Learn",
        bullets: [
            "How Ethereum's Proof-of-Stake consensus keeps the network secure",
            "Why validators stake 32 ETH and how they earn rewards",
            "What 'slashing' means and why it prevents attacks",
            "How DeFi protocols use staking beyond just validation",
            "The real economics: why a 51% attack costs $51 billion"
        ]
    },
    {
        title: "🛠️ What You'll Do",
        bullets: [
            "Generate your own wallet and receive test ETH from your instructor",
            "Send transactions to classmates and watch blocks confirm",
            "Stake ETH to become a validator and earn rewards",
            "Participate in the class chat (stored on-chain!)",
            "Experience the validator selection algorithm in action"
        ]
    },
    {
        title: "👥 Classroom Setup",
        bullets: [
            "Instructor runs a local Ethereum node with deployed smart contracts",
            "Students connect via web browser—no installation required",
            "Everyone shares the same blockchain producing blocks every ~12 seconds",
            "All transactions are real (but using test ETH with no real-world value)"
        ]
    }
]

const CONCEPT_CARDS = [
    {
        title: "🔐 Wallet Anatomy",
        description: "A wallet is cryptographic math, not a physical container. Your private key is everything.",
        highlight: [
            "Private key (64 hex chars) → signs transactions to prove you own the account",
            "Public address (0x + 40 hex chars) → your identity on Ethereum, derived from public key",
            "Never share your private key—anyone with it controls your funds",
            "Addresses start with '0x' and use hexadecimal (0-9, a-f)"
        ],
        // VIDEO PLACEHOLDER: Add YouTube URL explaining crypto wallets
        // Example: video: "https://www.youtube.com/embed/VIDEO_ID"
        video: "https://www.youtube.com/embed/qLZ1IoezucE"
    },
    {
        title: "⛽ Gas & Transaction Fees",
        description: "Every operation on Ethereum costs 'gas'—computational work measured in ETH.",
        highlight: [
            "Gas limit: Maximum gas you're willing to use (prevents infinite loops)",
            "Base fee: Burned (destroyed) ETH—reduces supply, can cause deflation",
            "Tip (priority fee): Goes to validator—higher tip = faster inclusion",
            "Simple ETH transfer: ~21,000 gas | Complex smart contract: 100k+ gas"
        ],
        // VIDEO PLACEHOLDER: Add YouTube URL explaining gas fees
        video: "https://www.youtube.com/embed/3ehaSqwUZ0s"
    },
    {
        title: "🧱 Blocks & Finality",
        description: "Ethereum produces a new block every ~12 seconds containing batched transactions.",
        highlight: [
            "Block = batch of transactions + cryptographic hash linking to previous block",
            "Block number (height) = total blocks since genesis (July 30, 2015)",
            "Finality: After ~15 minutes (64 blocks), blocks are irreversible",
            "Each block has a proposer (validator) who earns fees + rewards"
        ],
        // VIDEO PLACEHOLDER: Add YouTube URL explaining blockchain blocks
        video: "https://www.youtube.com/embed/eq1oRGLEG3Y"
    },
    {
        title: "🤝 Proof-of-Stake Consensus",
        description: "How 8,600+ validators worldwide agree on the state of Ethereum without a central authority.",
        highlight: [
            "Validators stake 32 ETH as collateral to participate",
            "Every 12 seconds, one validator is pseudo-randomly selected to propose a block",
            "Other validators attest (vote) that the block is valid",
            "Honest validators earn ~4-5% annual return; dishonest ones get slashed",
            "Replaced Proof-of-Work in Sept 2022, cutting energy use by 99.95%"
        ],
        diagram: true,
        fullWidth: true,
        // VIDEO PLACEHOLDER: Add YouTube URL explaining Proof of Stake (PRIORITY - core concept)
        video: null
    },
    {
        title: "💎 Ether (ETH)",
        description: "The native cryptocurrency of Ethereum—required for all transactions and staking.",
        highlight: [
            "Market cap: 2nd largest crypto after Bitcoin (~$200B+)",
            "Total supply: ~120 million ETH (no hard cap, but issuance is low)",
            "Uses: Pay gas fees, stake to become validator, collateral in DeFi",
            "Units: 1 ETH = 1,000,000,000 Gwei = 10¹⁸ Wei"
        ],
        // VIDEO PLACEHOLDER: Add YouTube URL explaining what ETH is
        video: null
    },
    {
        title: "📜 Smart Contracts",
        description: "Self-executing code deployed to Ethereum that anyone can interact with.",
        highlight: [
            "Written in Solidity, compiled to EVM bytecode",
            "Immutable: Once deployed, code cannot be changed",
            "Powers DeFi, NFTs, DAOs, games, and more",
            "Our lab uses a PoS simulator contract for staking and chat"
        ],
        // VIDEO PLACEHOLDER: Add YouTube URL explaining smart contracts
        video: null
    }
]

const EXPLORE_MISSIONS = [
    {
        title: "🔗 Understanding Staking",
        video: "https://www.youtube.com/embed/ja_Irb5LS1k",
        category: "Proof of Stake",
        action: "What is staking and why do validators lock up their ETH?",
        details: [
            "Staking means depositing ETH as collateral to become a validator",
            "Minimum stake on Ethereum: 32 ETH (our lab uses 1 ETH for learning)",
            "Staked ETH is locked—you can't spend it while validating",
            "Purpose: Creates 'skin in the game' so validators act honestly",
            "Honest validators earn rewards; dishonest ones get slashed"
        ],
        miniLab: 'staking-rewards',
        // VIDEO PLACEHOLDER: Add YouTube embed URL for staking explanation (PRIORITY)
        // Example: video: "https://www.youtube.com/embed/VIDEO_ID"
    },
    {
        title: "👮 Validator Responsibilities",
        category: "Network Security",
        action: "Learn what validators do to keep Ethereum secure",
        details: [
            "Propose new blocks when selected by the algorithm",
            "Verify (attest to) blocks proposed by other validators",
            "Must be online 24/7 with stable internet",
            "Run honest software—no cheating or double-signing",
            "Earn transaction fees + block rewards for good work"
        ],
        video: "https://www.youtube.com/embed/b9mNgGqxhJ8",
        miniLab: 'validator-probability',
        // VIDEO PLACEHOLDER: Add YouTube embed URL for validator duties explanation
    },
    {
        title: "⚔️ Slashing: The Penalty System",
        category: "Network Security",
        action: "Understand how Ethereum punishes bad actors",
        details: [
            "Slashing = Burning (destroying) a validator's staked ETH",
            "Triggers: Double-signing blocks, or proposing contradictory data",
            "Penalty: Lose up to 100% of staked ETH (usually ~1 ETH minimum)",
            "Purpose: Make attacks extremely expensive (would need 51% of stake)",
            "Slashed validators are forcibly ejected from the network"
        ],
        miniLab: 'slashing-penalty',
        video: null,
    },
    {
        title: "🏦 DeFi: Staking Beyond Validation",
        category: "DeFi Applications",
        action: "Explore how staking powers decentralized finance",
        details: [
            "Liquid Staking: Deposit ETH, get stETH token, still earn rewards",
            "Example: Lido, Rocket Pool let you stake without 32 ETH",
            "Yield Farming: Stake tokens in protocols to earn interest",
            "Governance: Staked tokens often give voting rights in DAOs",
            "Risk: Smart contract bugs or protocol failures"
        ],
        // VIDEO PLACEHOLDER: Add YouTube embed URL for DeFi/liquid staking
        video: "https://www.youtube.com/embed/e9Eg0CmboFU",
    },
    {
        title: "💰 Staking Rewards Economics",
        category: "Economics",
        action: "Calculate the incentives for running a validator",
        details: [
            "Base reward: ~4-5% annual return on staked ETH",
            "Higher when fewer validators are online",
            "Transaction fees (tips) add extra income",
            "MEV (Maximal Extractable Value): Advanced validators earn more",
            "Costs: Hardware, electricity, internet, downtime risks"
        ],
        // VIDEO PLACEHOLDER: Add YouTube embed URL for staking economics
        video: "https://www.youtube.com/embed/ja_Irb5LS1k",
    },
    {
        title: "🎯 Real-World Scenario: Attack Cost",
        category: "Network Security",
        
        action: "Calculate how expensive it is to attack Ethereum",
        details: [
            "To control 51% of validators, need 51% of all staked ETH",
            "Currently ~34 million ETH staked on Ethereum",
            "51% attack needs: ~17 million ETH",
            "At $3,000/ETH: $51 BILLION dollars needed",
            "And you'd LOSE it all via slashing if caught!",
            "Compare to Bitcoin: Rent mining hardware temporarily for attack"
        ],
        miniLab: 'attack-cost',
        video: "https://www.youtube.com/embed/8jOacOeGNSE",
        // VIDEO PLACEHOLDER: Add YouTube embed URL for 51% attack explanation
    },
    {
        title: "🔄 Observe the Chain",
        category: "Hands-On",
        video: "https://www.youtube.com/embed/SSo_EIwHSd4",
        action: "Watch how blocks are linked together in a real blockchain.",
        details: [
            "Ethereum produces a block every ~12 seconds",
            "Each block contains many transactions",
            "Block number = blockchain 'height'",
            "Each block references the previous block's hash",
            "This creates an immutable chain - changing one block breaks all following blocks"
        ],
        miniLab: 'blockchain-visualizer'
    },
    {
        title: "🔑 Decode an Address",
        category: "Hands-On",
        action: "Learn how Ethereum addresses work and practice reading them.",
        details: [
            "Addresses start with '0x' (hexadecimal notation)",
            "42 characters total (0x + 40 hex digits)",
            "Derived from your public key using Keccak-256 hash",
            "Shorthand: 0x1234...5678 helps in class/chat",
            "Your address = your public identity on Ethereum"
        ],
        miniLab: 'address-decoder'
    }
]

// LESSONS removed - content now covered in INTRO_SECTIONS and CONCEPT_CARDS

// --- COMPONENT: CLI LABS VIEW ---

const CLI_SECTIONS = [
    { id: 'available-labs', title: 'Available Labs', category: 'Getting Started', keywords: ['labs', 'lab list', 'house sale', 'ransomware', 'voting', 'crowdfunding', 'tickets', 'vehicle', 'classroom', 'token'] },
    { id: 'initial-setup', title: 'Initial Setup', category: 'Getting Started', keywords: ['install', 'npm', 'setup', 'connection', 'RPC', 'environment', 'configure', 'terminal', 'start', 'begin', 'cli'] },
    { id: 'menu-options', title: 'Menu Options', category: 'Getting Started', keywords: ['menu', 'options', 'interactive', 'CLI', 'list', 'commands', 'playground', 'builder', 'account'] },
    { id: 'playground', title: 'Playground Mode', category: 'Getting Started', keywords: ['playground', 'console', 'JavaScript', 'REPL', 'analyst', 'interactive', 'JS', 'eval', 'help'] },
    { id: 'deploy-share', title: 'Deploy & Share: Working as a Team', category: 'Smart Contracts', keywords: ['deploy', 'share', 'connect', 'classmate', 'team', 'address', 'collaborate', 'ABI', 'dashboard', 'other students'] },
    { id: 'individual-labs', title: 'Individual Lab Scripts', category: 'Getting Started', keywords: ['lab', 'script', 'forensics', 'explore', 'transaction', 'blockchain basics', 'sign', 'interact'] },
    { id: 'contract-builder', title: 'Smart Contract Builder', category: 'Smart Contracts', keywords: ['template', 'builder', 'house', 'voting', 'tickets', 'crowdfunding', 'vehicle', 'classroom', 'option 9'] },
    { id: 'walkthroughs', title: 'Forensics Walkthroughs', category: 'Forensics', keywords: ['address', 'trace', 'scan', 'blocks', 'investigation', 'events', 'suspicious', 'money flow', 'walkthrough', 'example'] },
    { id: 'test-accounts', title: 'Test Accounts', category: 'Getting Started', keywords: ['accounts', 'addresses', 'private key', 'hardhat', 'default', '10000 ETH', 'shared'] },
];

const CLI_CATEGORIES = ['All', 'Getting Started', 'Smart Contracts', 'Forensics'];

function CLILabsView({ isInstructor = false, rpcUrl = '', terminalRpcUrl = '' }) {
    const [copiedCommand, setCopiedCommand] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [activeSection, setActiveSection] = useState(null);
    const [selectedLabId, setSelectedLabId] = useState(null);
    const sectionRefs = useRef({});
    const navRef = useRef(null);

    const selectedLab = selectedLabId ? getLabById(selectedLabId) : null;

    // Filter sections based on search query and category
    const filteredSections = CLI_SECTIONS.filter(section => {
        const matchesCategory = activeCategory === 'All' || section.category === activeCategory;
        if (!searchQuery.trim()) return matchesCategory;
        const q = searchQuery.toLowerCase();
        const matchesSearch = section.title.toLowerCase().includes(q) ||
            section.keywords.some(k => k.toLowerCase().includes(q)) ||
            section.category.toLowerCase().includes(q);
        return matchesSearch && matchesCategory;
    });

    const visibleIds = new Set(filteredSections.map(s => s.id));

    // Scroll to section
    const scrollToSection = (id) => {
        const el = sectionRefs.current[id];
        if (el) {
            const navHeight = navRef.current?.offsetHeight || 0;
            const top = el.getBoundingClientRect().top + window.scrollY - navHeight - 16;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    };

    // IntersectionObserver for active section highlighting
    useEffect(() => {
        const observers = [];
        const ids = CLI_SECTIONS.map(s => s.id);
        ids.forEach(id => {
            const el = sectionRefs.current[id];
            if (!el) return;
            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) setActiveSection(id);
                },
                { rootMargin: '-120px 0px -60% 0px', threshold: 0 }
            );
            observer.observe(el);
            observers.push(observer);
        });
        return () => observers.forEach(o => o.disconnect());
    }, []);

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedCommand(id);
        setTimeout(() => setCopiedCommand(null), 2000);
    };

    const CodeBlock = ({ code, id, label }) => (
        <div style={{
            background: '#0f172a',
            borderRadius: '0.5rem',
            overflow: 'hidden',
            border: '1px solid #334155',
            marginBottom: '0.75rem'
        }}>
            {label && (
                <div style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderBottom: '1px solid #334155',
                    color: '#93c5fd',
                    fontSize: '0.85rem',
                    fontWeight: '600'
                }}>
                    {label}
                </div>
            )}
            <div style={{display: 'flex', alignItems: 'stretch'}}>
                <pre style={{
                    flex: 1,
                    margin: 0,
                    padding: '1rem',
                    color: '#fbbf24',
                    fontFamily: "'Fira Code', 'Monaco', 'Consolas', monospace",
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap'
                }}>{code}</pre>
                <button
                    onClick={() => copyToClipboard(code, id)}
                    style={{
                        padding: '0.5rem 1rem',
                        background: copiedCommand === id ? '#22c55e' : '#334155',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        transition: 'background 0.2s'
                    }}
                >
                    {copiedCommand === id ? '✓' : '📋'}
                </button>
            </div>
        </div>
    );

    // Lab detail view - full instructions from docs/**/*.md (identical content, user chooses GUI or MD)
    if (selectedLab) {
        const basePath = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL.replace(/\/$/, '') : '';
        return (
            <LabDetailView
                lab={selectedLab}
                onBack={() => setSelectedLabId(null)}
                basePath={basePath}
                studentOnly={!isInstructor}
            />
        );
    }

    const menuOptions = [
        { num: '1', label: 'Network info', desc: 'View blockchain connection status (chain ID, block number, gas price)' },
        { num: '2', label: 'Block details', desc: 'Explore block data, timestamps, and transactions within a block' },
        { num: '3', label: 'Account balances', desc: 'Check ETH balances for all test accounts at once' },
        { num: '4', label: 'Transaction lookup', desc: 'Find and analyze transactions by hash — see sender, recipient, value, gas' },
        { num: '5', label: 'Select account', desc: 'Switch between test accounts or import your own private key' },
        { num: '6', label: 'Send ETH', desc: 'Transfer ETH between accounts — practice real transaction mechanics' },
        { num: '7', label: 'Contract interaction', desc: 'Call PoS contract functions (stake, unstake, check rewards)' },
        { num: '8', label: 'Playground (Analyst Console)', desc: 'Interactive JavaScript console for freeform blockchain forensics', highlight: true },
        { num: '9', label: 'Contract Builder Lab', desc: 'Build, compile, and deploy smart contracts from 6 templates', highlight2: true },
        { num: '10', label: 'Account Manager', desc: 'Generate new wallets, import keys, fund student accounts' }
    ];

    return (
        <div style={{maxWidth: '900px', margin: '0 auto', padding: '2rem'}}>
            {/* Header */}
            <div style={{marginBottom: '0.5rem'}}>
                <h2 style={{color: '#f8fafc', margin: '0 0 0.5rem 0', fontSize: '1.8rem'}}>
                    🔍 Blockchain Forensics CLI
                </h2>
                <p style={{color: '#94a3b8', fontSize: '1.1rem', margin: 0}}>
                    Interactive tools for blockchain analysis and investigation
                </p>
            </div>

            {/* ====== STICKY SEARCH + NAV BAR ====== */}
            <div ref={navRef} style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                background: 'linear-gradient(180deg, #0f172a 85%, transparent)',
                paddingTop: '0.75rem',
                paddingBottom: '1rem',
                marginBottom: '1rem'
            }}>
                {/* Search Input */}
                <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginBottom: '0.75rem'
                }}>
                    <div style={{
                        flex: 1,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        <span style={{
                            position: 'absolute', left: '0.75rem',
                            color: '#64748b', fontSize: '1rem', pointerEvents: 'none'
                        }}>&#128269;</span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search guides... (e.g. deploy, compile, forensics, ABI)"
                            style={{
                                width: '100%',
                                padding: '0.6rem 2.25rem 0.6rem 2.25rem',
                                background: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '0.5rem',
                                color: '#f8fafc',
                                fontSize: '0.9rem',
                                outline: 'none'
                            }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                style={{
                                    position: 'absolute', right: '0.5rem',
                                    background: '#334155', border: 'none', borderRadius: '50%',
                                    width: '22px', height: '22px', color: '#94a3b8',
                                    cursor: 'pointer', fontSize: '0.75rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >&times;</button>
                        )}
                    </div>
                </div>

                {/* Category Pills */}
                <div style={{
                    display: 'flex',
                    gap: '0.375rem',
                    flexWrap: 'wrap',
                    marginBottom: '0.6rem'
                }}>
                    {CLI_CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            style={{
                                padding: '0.3rem 0.75rem',
                                borderRadius: '999px',
                                border: activeCategory === cat ? 'none' : '1px solid #475569',
                                background: activeCategory === cat ? '#3b82f6' : '#334155',
                                color: activeCategory === cat ? 'white' : '#e2e8f0',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: activeCategory === cat ? '600' : '500',
                                transition: 'all 0.15s'
                            }}
                        >{cat}</button>
                    ))}
                    {(searchQuery || activeCategory !== 'All') && (
                        <button
                            onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                            style={{
                                padding: '0.3rem 0.75rem',
                                borderRadius: '999px',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#fca5a5',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                marginLeft: '0.25rem'
                            }}
                        >Clear Filters</button>
                    )}
                </div>

                {/* TOC Jump Links */}
                <div style={{
                    display: 'flex',
                    gap: '0.25rem',
                    flexWrap: 'wrap',
                    overflowX: 'auto'
                }}>
                    {filteredSections.map(s => (
                        <button
                            key={s.id}
                            onClick={() => scrollToSection(s.id)}
                            style={{
                                padding: '0.2rem 0.6rem',
                                borderRadius: '0.375rem',
                                border: activeSection === s.id ? 'none' : '1px solid #475569',
                                background: activeSection === s.id ? 'rgba(59, 130, 246, 0.35)' : '#334155',
                                color: activeSection === s.id ? '#93c5fd' : '#cbd5e1',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: activeSection === s.id ? '600' : '500',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.15s'
                            }}
                        >{s.title}</button>
                    ))}
                </div>
            </div>

            {/* No results message */}
            {filteredSections.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: '3rem 1.5rem',
                    color: '#94a3b8'
                }}>
                    <div style={{fontSize: '2.5rem', marginBottom: '1rem'}}>&#128270;</div>
                    <h3 style={{color: '#f8fafc', margin: '0 0 0.5rem 0'}}>No matching guides found</h3>
                    <p style={{margin: '0 0 1rem 0'}}>
                        No results for "<strong style={{color: '#fbbf24'}}>{searchQuery}</strong>"
                        {activeCategory !== 'All' && <> in <strong style={{color: '#93c5fd'}}>{activeCategory}</strong></>}
                    </p>
                    <button
                        onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                        style={{
                            padding: '0.5rem 1.25rem',
                            background: '#3b82f6',
                            border: 'none',
                            borderRadius: '0.5rem',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >Show All Guides</button>
                </div>
            )}

            {/* Available Labs - Lab list from docs */}
            {visibleIds.has('available-labs') && (
            <div id="cli-available-labs" ref={el => sectionRefs.current['available-labs'] = el}>
            <div style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.1))',
                border: '2px solid rgba(59, 130, 246, 0.4)',
                borderRadius: '1rem',
                padding: '1.5rem',
                marginBottom: '2rem'
            }}>
                <h3 style={{color: '#93c5fd', margin: '0 0 0.5rem 0'}}>📚 Available Labs</h3>
                <p style={{color: '#94a3b8', margin: '0 0 1rem 0', fontSize: '0.95rem'}}>
                    Click a lab to see the full instructions. Content is identical to <code style={{color: '#fbbf24'}}>docs/**/*.md</code> — use the GUI or open the markdown file directly, whichever you prefer.
                </p>
                <div style={{display: 'grid', gap: '0.75rem'}}>
                    {LABS.map(lab => (
                        <button
                            key={lab.id}
                            onClick={() => setSelectedLabId(lab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '1rem',
                                padding: '1rem 1.25rem',
                                background: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '0.75rem',
                                color: '#f8fafc',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.background = '#334155';
                                e.currentTarget.style.borderColor = '#475569';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.background = '#1e293b';
                                e.currentTarget.style.borderColor = '#334155';
                            }}
                        >
                            <div style={{flex: 1}}>
                                <div style={{fontWeight: '600', marginBottom: '0.25rem', fontSize: '1rem'}}>{lab.title}</div>
                                <div style={{color: '#94a3b8', fontSize: '0.85rem'}}>{lab.description}</div>
                                <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap'}}>
                                    <span style={{background: '#334155', padding: '0.15rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', color: '#94a3b8'}}>{lab.duration}</span>
                                    <span style={{background: '#334155', padding: '0.15rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', color: '#94a3b8'}}>{lab.difficulty}</span>
                                    <span style={{background: 'rgba(251, 191, 36, 0.2)', padding: '0.15rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', color: '#fbbf24'}}>
                                        {lab.terminalsNeeded} terminal{lab.terminalsNeeded > 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                            <span style={{color: '#64748b', fontSize: '1.25rem'}}>→</span>
                        </button>
                    ))}
                </div>
            </div>
            </div>)}

            {/* Initial Setup */}
            {visibleIds.has('initial-setup') && (
            <div id="cli-initial-setup" ref={el => sectionRefs.current['initial-setup'] = el}>
            <div style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(59, 130, 246, 0.15))',
                border: '2px solid rgba(34, 197, 94, 0.4)',
                borderRadius: '1rem',
                padding: '1.5rem',
                marginBottom: '2rem'
            }}>
                <h3 style={{color: '#86efac', margin: '0 0 1rem 0'}}>🚀 Initial Setup</h3>
                <p style={{color: '#94a3b8', margin: '0 0 1rem 0', fontSize: '0.9rem'}}>
                    {INITIAL_SETUP.description}
                </p>

                <div style={{display: 'grid', gap: '1rem'}}>
                    {INITIAL_SETUP.steps.map((s, i) => (
                        <div key={i} style={{marginBottom: i < INITIAL_SETUP.steps.length - 1 ? '0' : '0'}}>
                            <p style={{color: '#e2e8f0', margin: '0 0 0.5rem 0', fontWeight: '600'}}>
                                {i + 1}. {s.title}
                            </p>
                            <p style={{color: '#94a3b8', margin: '0 0 0.25rem 0', fontSize: '0.85rem'}}>{s.instruction}</p>
                            <CodeBlock code={s.code} id={`initial-setup-${i}`} />
                        </div>
                    ))}
                </div>

                <p style={{color: '#94a3b8', margin: '1rem 0 0 0', fontSize: '0.85rem'}}>
                    Multi-role labs need separate shells. Use the <strong>Lab Terminal</strong> button at the bottom of the sidebar when you need a shell. Pick labs from <strong>Available Labs</strong> or from the menu after <code style={{background: '#0f172a', padding: '2px 6px', borderRadius: '4px'}}>npm start</code>.
                </p>

                {/* Optional env for instructor-hosted chain */}
                <details style={{
                    background: '#0f172a',
                    borderRadius: '0.5rem',
                    padding: '0.75rem 1rem',
                    marginTop: '1rem',
                    border: '1px solid #334155'
                }}>
                    <summary style={{color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem'}}>Optional: RPC and contract env vars (instructor node)</summary>
                    <div style={{marginTop: '0.75rem'}}>
                        <CodeBlock code="cd scripts/cli-labs/standalone" id="cd-local" />
                        <CodeBlock code="npm install" id="npm-install" label="First time only" />
                        <CodeBlock 
                            code={`# Windows PowerShell:
$env:RPC_URL="http://INSTRUCTOR_IP:8545"
$env:CONTRACT_ADDRESS="0x..."

# Mac / Linux / Codespaces:
export RPC_URL="http://INSTRUCTOR_IP:8545"
export CONTRACT_ADDRESS="0x..."`} 
                            id="env"
                            label="Set environment variables (get values from instructor)"
                        />
                        <CodeBlock code="npm start" id="npm-start-local" />
                    </div>
                </details>
            </div>
            </div>)}

            {/* Menu Options */}
            {visibleIds.has('menu-options') && (
            <div id="cli-menu-options" ref={el => sectionRefs.current['menu-options'] = el}>
            <div style={{
                background: '#1e293b',
                borderRadius: '1rem',
                padding: '1.5rem',
                marginBottom: '2rem',
                border: '1px solid #334155'
            }}>
                <h3 style={{color: '#f8fafc', margin: '0 0 1rem 0'}}>📋 Menu Options</h3>
                <p style={{color: '#94a3b8', margin: '0 0 1rem 0'}}>
                    After running <code style={{background: '#0f172a', padding: '2px 6px', borderRadius: '4px'}}>npm start</code>, 
                    you'll see this menu:
                </p>
                
                <div style={{display: 'grid', gap: '0.5rem'}}>
                    {menuOptions.map(opt => {
                        const isHighlighted = opt.highlight || opt.highlight2;
                        const accentColor = opt.highlight ? '#fbbf24' : opt.highlight2 ? '#a78bfa' : '#3b82f6';
                        const bgColor = opt.highlight ? 'rgba(251, 191, 36, 0.15)' : opt.highlight2 ? 'rgba(167, 139, 250, 0.15)' : 'rgba(15, 23, 42, 0.5)';
                        const borderColor = opt.highlight ? 'rgba(251, 191, 36, 0.4)' : opt.highlight2 ? 'rgba(167, 139, 250, 0.4)' : 'transparent';
                        return (
                        <div 
                            key={opt.num}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '0.75rem 1rem',
                                background: bgColor,
                                borderRadius: '0.5rem',
                                border: `1px solid ${borderColor}`
                            }}
                        >
                            <span style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: accentColor,
                                color: isHighlighted ? '#0f172a' : 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '0.85rem',
                                flexShrink: 0
                            }}>
                                {opt.num}
                            </span>
                            <div style={{flex: 1}}>
                                <div style={{color: isHighlighted ? accentColor : '#f8fafc', fontWeight: '600'}}>
                                    {opt.label}
                                </div>
                                <div style={{color: '#94a3b8', fontSize: '0.85rem'}}>
                                    {opt.desc}
                                </div>
                            </div>
                            {opt.highlight && (
                                <span style={{
                                    background: '#fbbf24',
                                    color: '#0f172a',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    flexShrink: 0
                                }}>
                                    FORENSICS
                                </span>
                            )}
                            {opt.highlight2 && (
                                <span style={{
                                    background: '#a78bfa',
                                    color: '#0f172a',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '999px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    flexShrink: 0
                                }}>
                                    CONTRACTS
                                </span>
                            )}
                        </div>
                        );
                    })}
                </div>
            </div>
            </div>)}

            {/* Playground Section */}
            {visibleIds.has('playground') && (
            <div id="cli-playground" ref={el => sectionRefs.current['playground'] = el}>
            <div style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.1))',
                border: '2px solid rgba(251, 191, 36, 0.4)',
                borderRadius: '1rem',
                padding: '1.5rem',
                marginBottom: '2rem'
            }}>
                <h3 style={{color: '#fbbf24', margin: '0 0 1rem 0'}}>🎮 Playground Mode (Option 8)</h3>
                <p style={{color: '#e2e8f0', margin: '0 0 1rem 0'}}>
                    The Playground is an interactive JavaScript console designed for blockchain forensics. 
                    <strong> Variables persist between commands</strong> using the ctx object.
                </p>

                <div style={{
                    background: '#0f172a',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    marginBottom: '1rem',
                    fontFamily: "'Fira Code', monospace",
                    fontSize: '0.85rem'
                }}>
                    <div style={{color: '#22c55e', marginBottom: '0.5rem'}}>&gt; ctx.target = '0xf39F...'</div>
                    <div style={{color: '#22c55e', marginBottom: '0.5rem'}}>&gt; ctx.balance = await provider.getBalance(ctx.target)</div>
                    <div style={{color: '#22c55e', marginBottom: '0.5rem'}}>&gt; console.log(formatEth(ctx.balance), 'ETH')</div>
                    <div style={{color: '#94a3b8'}}>9998.5 ETH</div>
                </div>

                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem'}}>
                    <div style={{background: '#1e293b', padding: '0.75rem', borderRadius: '0.5rem'}}>
                        <div style={{color: '#93c5fd', fontWeight: '600', marginBottom: '0.25rem'}}>💡 help</div>
                        <div style={{color: '#94a3b8', fontSize: '0.85rem'}}>Show quick examples</div>
                    </div>
                    <div style={{background: '#1e293b', padding: '0.75rem', borderRadius: '0.5rem'}}>
                        <div style={{color: '#93c5fd', fontWeight: '600', marginBottom: '0.25rem'}}>💡 help forensics</div>
                        <div style={{color: '#94a3b8', fontSize: '0.85rem'}}>Address & transaction analysis</div>
                    </div>
                    <div style={{background: '#1e293b', padding: '0.75rem', borderRadius: '0.5rem'}}>
                        <div style={{color: '#93c5fd', fontWeight: '600', marginBottom: '0.25rem'}}>💡 help investigate</div>
                        <div style={{color: '#94a3b8', fontSize: '0.85rem'}}>Full investigation workflows</div>
                    </div>
                    <div style={{background: '#1e293b', padding: '0.75rem', borderRadius: '0.5rem'}}>
                        <div style={{color: '#93c5fd', fontWeight: '600', marginBottom: '0.25rem'}}>💡 vars</div>
                        <div style={{color: '#94a3b8', fontSize: '0.85rem'}}>Show stored variables</div>
                    </div>
                </div>
            </div>
            </div>)}

            {/* ====== DEPLOY & SHARE: Core Collaborative Workflow ====== */}
            {visibleIds.has('deploy-share') && (
            <div id="cli-deploy-share" ref={el => sectionRefs.current['deploy-share'] = el}>
            <div style={{
                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(168, 85, 247, 0.12))',
                border: '2px solid rgba(14, 165, 233, 0.5)',
                borderRadius: '1rem',
                padding: '1.5rem',
                marginBottom: '2rem'
            }}>
                <h3 style={{color: '#38bdf8', margin: '0 0 0.25rem 0', fontSize: '1.3rem'}}>
                    🤝 Deploy &amp; Share: Working with Contracts as a Team
                </h3>
                <p style={{color: '#e2e8f0', margin: '0 0 1.5rem 0'}}>
                    In this lab, one person <strong>deploys</strong> a smart contract and then <strong>shares the address</strong> with classmates so everyone can interact with the same contract on the shared blockchain.
                </p>

                {/* PART A: Deploy a Contract */}
                <div style={{
                    background: '#0f172a',
                    borderRadius: '0.75rem',
                    padding: '1.25rem',
                    marginBottom: '1.5rem',
                    border: '1px solid #334155'
                }}>
                    <h4 style={{color: '#38bdf8', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <span style={{
                            background: '#38bdf8', color: '#0f172a', width: '24px', height: '24px',
                            borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 'bold', fontSize: '0.85rem'
                        }}>A</span>
                        Deploy a Smart Contract (the Creator)
                    </h4>
                    <p style={{color: '#94a3b8', margin: '0 0 1rem 0', fontSize: '0.9rem'}}>
                        Use the Contract Builder to pick a template, customize it, and deploy it to the blockchain.
                    </p>

                    <div style={{display: 'grid', gap: '0.75rem'}}>
                        {[
                            { step: '1', title: 'Launch the Contract Builder', detail: 'From the Interactive CLI, choose option 9, or run directly:', code: 'cd scripts/cli-labs/standalone\nnpm start\n# Then select option 9\n\n# Or run directly:\nnode 5-contract-builder.js' },
                            { step: '2', title: 'Pick a template and customize', detail: 'Choose from 6 templates (House Sale, Vehicle Title, Event Tickets, Voting, Crowdfunding, Classroom Vote). Fill in the custom fields or press Enter to use defaults.' },
                            { step: '3', title: 'Review, compile, and deploy', detail: 'The builder shows you the generated Solidity code, compiles it with Hardhat, and deploys it. When deployment succeeds, you\'ll see:' , code: '✅ Contract deployed!\n📍 Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3\n📝 Transaction: 0xabc123...' },
                            { step: '4', title: 'Share the contract address with your classmates', detail: 'Copy the address (starts with 0x, 42 characters). Everyone on the same network can interact with your contract using this address. Also share the template type (e.g. "houseSale", "classroomVote") so they know the ABI.' }
                        ].map(s => (
                            <div key={s.step} style={{
                                background: 'rgba(30, 41, 59, 0.5)',
                                borderRadius: '0.5rem',
                                padding: '0.75rem 1rem',
                                borderLeft: '3px solid #38bdf8'
                            }}>
                                <div style={{display: 'flex', gap: '0.5rem', alignItems: 'baseline', marginBottom: '0.25rem'}}>
                                    <span style={{color: '#38bdf8', fontWeight: 'bold'}}>Step {s.step}:</span>
                                    <span style={{color: '#e2e8f0', fontWeight: '600'}}>{s.title}</span>
                                </div>
                                <p style={{color: '#94a3b8', margin: '0.25rem 0 0 0', fontSize: '0.85rem'}}>{s.detail}</p>
                                {s.code && (
                                    <pre style={{
                                        background: '#020617', borderRadius: '0.375rem', padding: '0.75rem',
                                        margin: '0.5rem 0 0 0', color: '#fbbf24',
                                        fontFamily: "'Fira Code', monospace", fontSize: '0.85rem',
                                        overflow: 'auto', whiteSpace: 'pre-wrap'
                                    }}>{s.code}</pre>
                                )}
                            </div>
                        ))}
                    </div>

                    <div style={{
                        background: 'rgba(251, 191, 36, 0.1)',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                        borderRadius: '0.5rem',
                        padding: '0.75rem 1rem',
                        marginTop: '1rem'
                    }}>
                        <p style={{color: '#fcd34d', margin: 0, fontSize: '0.85rem'}}>
                            <strong>After deploying</strong>, you can immediately interact with your contract through the builder's interactive menu. 
                            It will list all available functions (labeled <span style={{color: '#86efac'}}>[view]</span>, <span style={{color: '#60a5fa'}}>[write]</span>, or <span style={{color: '#fcd34d'}}>[payable]</span>) 
                            and prompt you for any required parameters.
                        </p>
                    </div>
                </div>

                {/* PART B: Connect to Someone Else's Contract */}
                <div style={{
                    background: '#0f172a',
                    borderRadius: '0.75rem',
                    padding: '1.25rem',
                    border: '1px solid #334155'
                }}>
                    <h4 style={{color: '#a78bfa', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <span style={{
                            background: '#a78bfa', color: '#0f172a', width: '24px', height: '24px',
                            borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 'bold', fontSize: '0.85rem'
                        }}>B</span>
                        Connect to a Classmate's Contract (Everyone Else)
                    </h4>
                    <p style={{color: '#94a3b8', margin: '0 0 0.5rem 0', fontSize: '0.9rem'}}>
                        <strong>What you need from the person who deployed:</strong>
                    </p>
                    <div style={{display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem'}}>
                        <span style={{background: '#1e293b', border: '1px solid #475569', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', color: '#e2e8f0', fontSize: '0.85rem'}}>
                            <strong style={{color: '#38bdf8'}}>1.</strong> Contract Address <span style={{color: '#94a3b8'}}>(0x...)</span>
                        </span>
                        <span style={{background: '#1e293b', border: '1px solid #475569', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', color: '#e2e8f0', fontSize: '0.85rem'}}>
                            <strong style={{color: '#38bdf8'}}>2.</strong> Template Type <span style={{color: '#94a3b8'}}>(e.g. "classroomVote", "houseSale")</span>
                        </span>
                    </div>

                    {/* Method 1: Playground (CLI) */}
                    <div style={{
                        background: 'rgba(30, 41, 59, 0.5)',
                        borderRadius: '0.5rem',
                        padding: '1rem',
                        marginBottom: '0.75rem',
                        borderLeft: '3px solid #a78bfa'
                    }}>
                        <div style={{color: '#c4b5fd', fontWeight: '600', marginBottom: '0.5rem'}}>
                            Method 1: CLI Playground (Option 8) — Full Control
                        </div>
                        <p style={{color: '#94a3b8', margin: '0 0 0.5rem 0', fontSize: '0.85rem'}}>
                            Use the Playground's JavaScript console to connect to any contract. You can read state, call functions, and send transactions.
                        </p>
                        <pre style={{
                            background: '#020617', borderRadius: '0.375rem', padding: '0.75rem',
                            margin: '0 0 0.5rem 0', color: '#fbbf24',
                            fontFamily: "'Fira Code', monospace", fontSize: '0.85rem',
                            overflow: 'auto', whiteSpace: 'pre-wrap'
                        }}>{`// === Connect to a classmate's Classroom Vote contract ===
// ctx is provided by Playground; ensure it exists if running elsewhere:
if (typeof globalThis.ctx === 'undefined') globalThis.ctx = {};
const ctx = globalThis.ctx;

// Step 1: Define the ABI (what functions the contract has)
ctx.abi = [
  'function question() view returns (string)',
  'function optionA() view returns (string)',
  'function optionB() view returns (string)',
  'function votesForA() view returns (uint256)',
  'function votesForB() view returns (uint256)',
  'function votingOpen() view returns (bool)',
  'function vote(bool voteForA)',
  'function getResults() view returns (string, string, uint256, string, uint256, uint256, bool)'
]

// Step 2: Connect using the address your classmate shared
ctx.vote = new ethers.Contract('0xPASTE_ADDRESS_HERE', ctx.abi, wallet)

// Step 3: Read the current state
console.log('Question:', await ctx.vote.question())
console.log('Option A:', await ctx.vote.optionA())
console.log('Option B:', await ctx.vote.optionB())
console.log('Votes A:', (await ctx.vote.votesForA()).toString())
console.log('Votes B:', (await ctx.vote.votesForB()).toString())

// Step 4: Cast your vote! (true = Option A, false = Option B)
await ctx.vote.vote(true)
console.log('Vote cast!')`}</pre>
                        <div style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '0.375rem',
                            padding: '0.5rem 0.75rem'
                        }}>
                            <p style={{color: '#93c5fd', margin: 0, fontSize: '0.8rem'}}>
                                <strong>Note:</strong> Use <code style={{color: '#fbbf24'}}>provider</code> instead of <code style={{color: '#fbbf24'}}>wallet</code> in Step 2 if you only need to <em>read</em> data. 
                                Use <code style={{color: '#fbbf24'}}>wallet</code> when you need to <em>write</em> (send transactions like voting or staking).
                            </p>
                        </div>
                    </div>

                    {/* Method 2: Web Dashboard */}
                    <div style={{
                        background: 'rgba(30, 41, 59, 0.5)',
                        borderRadius: '0.5rem',
                        padding: '1rem',
                        marginBottom: '0.75rem',
                        borderLeft: '3px solid #a78bfa'
                    }}>
                        <div style={{color: '#c4b5fd', fontWeight: '600', marginBottom: '0.5rem'}}>
                            Method 2: Web Dashboard — Visual Interface
                        </div>
                        <p style={{color: '#94a3b8', margin: '0 0 0.5rem 0', fontSize: '0.85rem'}}>
                            Open the standalone dashboard page in your browser. It provides a visual interface for viewing contract state.
                        </p>
                        <pre style={{
                            background: '#020617', borderRadius: '0.375rem', padding: '0.75rem',
                            margin: '0 0 0.5rem 0', color: '#fbbf24',
                            fontFamily: "'Fira Code', monospace", fontSize: '0.85rem',
                            overflow: 'auto', whiteSpace: 'pre-wrap'
                        }}>{`# Open in your browser:
http://localhost:5173/dashboard.html

# Or if using your instructor's URL:
http://INSTRUCTOR_IP:5173/dashboard.html`}</pre>
                        <p style={{color: '#94a3b8', margin: '0.5rem 0 0 0', fontSize: '0.85rem'}}>
                            On the dashboard page:
                        </p>
                        <ol style={{color: '#cbd5e1', margin: '0.25rem 0 0 0', paddingLeft: '1.5rem', fontSize: '0.85rem'}}>
                            <li>Enter the RPC URL (e.g. <code style={{color: '#fbbf24'}}>http://INSTRUCTOR_IP:8545</code>)</li>
                            <li>Click <strong>"Add Contract"</strong></li>
                            <li>Paste the <strong>contract address</strong> your classmate shared</li>
                            <li>Enter the <strong>template type</strong> (e.g. <code style={{color: '#fbbf24'}}>classroomVote</code>, <code style={{color: '#fbbf24'}}>houseSale</code>, <code style={{color: '#fbbf24'}}>voting</code>, <code style={{color: '#fbbf24'}}>crowdfunding</code>, <code style={{color: '#fbbf24'}}>vehicleTitle</code>, <code style={{color: '#fbbf24'}}>eventTickets</code>)</li>
                            <li>Give it a name and the dashboard will display its live state with auto-refresh</li>
                        </ol>
                    </div>

                    {/* ABI Reference */}
                    <div style={{
                        background: 'rgba(30, 41, 59, 0.5)',
                        borderRadius: '0.5rem',
                        padding: '1rem',
                        borderLeft: '3px solid #a78bfa'
                    }}>
                        <div style={{color: '#c4b5fd', fontWeight: '600', marginBottom: '0.5rem'}}>
                            ABI Quick Reference (for the Playground)
                        </div>
                        <p style={{color: '#94a3b8', margin: '0 0 0.75rem 0', fontSize: '0.85rem'}}>
                            The ABI tells ethers.js what functions a contract has. Copy the one matching your classmate's template type:
                        </p>
                        <div style={{display: 'grid', gap: '0.5rem'}}>
                            {[
                                { label: '🎓 classroomVote', code: `if (typeof globalThis.ctx === 'undefined') globalThis.ctx = {};\nconst ctx = globalThis.ctx;\nctx.abi = ['function question() view returns (string)','function optionA() view returns (string)','function optionB() view returns (string)','function votesForA() view returns (uint256)','function votesForB() view returns (uint256)','function votingOpen() view returns (bool)','function vote(bool voteForA)','function openVoting()','function closeVoting()','function getResults() view returns (string, string, uint256, string, uint256, uint256, bool)']` },
                                { label: '🗳️ voting', code: `if (typeof globalThis.ctx === 'undefined') globalThis.ctx = {};\nconst ctx = globalThis.ctx;\nctx.abi = ['function votingTitle() view returns (string)','function votingClosed() view returns (bool)','function getTotalVotes() view returns (uint256)','function getAllResults() view returns (string[] memory, uint256[] memory)','function vote(uint256 optionIndex)','function closeVoting()','function extendDeadline(uint256 additionalDays)']` },
                                { label: '💸 crowdfunding', code: `if (typeof globalThis.ctx === 'undefined') globalThis.ctx = {};\nconst ctx = globalThis.ctx;\nctx.abi = ['function campaignName() view returns (string)','function goalAmount() view returns (uint256)','function totalRaised() view returns (uint256)','function goalReached() view returns (bool)','function contribute() payable','function claimRefund()','function creatorWithdraw()','function getCampaignStatus() view returns (string, uint256, uint256, uint256, uint256, bool, bool)']` },
                                { label: '🏠 houseSale', code: `if (typeof globalThis.ctx === 'undefined') globalThis.ctx = {};\nconst ctx = globalThis.ctx;\nctx.abi = ['function propertyAddress() view returns (string)','function salePrice() view returns (uint256)','function seller() view returns (address)','function buyer() view returns (address)','function currentState() view returns (uint8)','function payDeposit() payable','function passInspection()','function payBalance() payable','function confirmTransfer()','function cancelSale()']` },
                                { label: '🚗 vehicleTitle', code: `if (typeof globalThis.ctx === 'undefined') globalThis.ctx = {};\nconst ctx = globalThis.ctx;\nctx.abi = ['function vin() view returns (string)','function currentOwner() view returns (address)','function getVehicleInfo() view returns (string, string, string, uint256, address, uint8)','function transferOwnership(address newOwner)','function updateMileage(uint256 miles)','function updateTitleStatus(uint8 status)']` },
                                { label: '🎟️ eventTickets', code: `if (typeof globalThis.ctx === 'undefined') globalThis.ctx = {};\nconst ctx = globalThis.ctx;\nctx.abi = ['function eventName() view returns (string)','function ticketsSold() view returns (uint256)','function maxSupply() view returns (uint256)','function getEventInfo() view returns (string, string, uint256, uint256, uint256, bool)','function buyTicket() payable','function transferTicket(address to)','function checkIn(address attendee)','function cancelEvent()']` }
                            ].map(a => (
                                <details key={a.label} style={{
                                    background: '#020617',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #1e293b'
                                }}>
                                    <summary style={{
                                        padding: '0.5rem 0.75rem',
                                        color: '#e2e8f0',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: '600'
                                    }}>{a.label}</summary>
                                    <pre style={{
                                        padding: '0.5rem 0.75rem',
                                        margin: 0,
                                        color: '#fbbf24',
                                        fontFamily: "'Fira Code', monospace",
                                        fontSize: '0.8rem',
                                        overflow: 'auto',
                                        whiteSpace: 'pre-wrap',
                                        borderTop: '1px solid #1e293b'
                                    }}>{a.code}</pre>
                                </details>
                            ))}
                        </div>
                        <div style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '0.375rem',
                            padding: '0.5rem 0.75rem',
                            marginTop: '0.75rem'
                        }}>
                            <p style={{color: '#93c5fd', margin: 0, fontSize: '0.8rem'}}>
                                <strong>After pasting the ABI</strong>, connect with: <code style={{color: '#fbbf24'}}>ctx.c = new ethers.Contract('0xADDRESS', ctx.abi, wallet)</code><br/>
                                Then call functions: <code style={{color: '#fbbf24'}}>await ctx.c.functionName()</code>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            </div>)}

            {/* Individual Labs */}
            {visibleIds.has('individual-labs') && (
            <div id="cli-individual-labs" ref={el => sectionRefs.current['individual-labs'] = el}>
            <div style={{
                background: '#1e293b',
                borderRadius: '1rem',
                padding: '1.5rem',
                marginBottom: '2rem',
                border: '1px solid #334155'
            }}>
                <h3 style={{color: '#f8fafc', margin: '0 0 0.5rem 0'}}>📚 Individual Lab Scripts</h3>
                <p style={{color: '#94a3b8', margin: '0 0 1.5rem 0'}}>
                    Each lab is a standalone guided exercise. Labs 4 and 5 are also in the Interactive CLI menu (option 8 and 9). Run from <code style={{color: '#fbbf24'}}>scripts/cli-labs/standalone</code> (see Initial Setup).
                </p>
                
                <div style={{display: 'grid', gap: '1.5rem'}}>
                    {/* Lab 1 */}
                    <div>
                        <CodeBlock code={`cd scripts/cli-labs/standalone
node 1-explore-blockchain.js`} id="lab1" label="Lab 1: Explore the Blockchain" />
                        <div style={{padding: '0 0.5rem', color: '#cbd5e1', fontSize: '0.9rem'}}>
                            <p style={{margin: '0.25rem 0 0.5rem 0'}}>
                                <strong>What you'll do:</strong> Connect to the blockchain and run your first queries — get the current block number, 
                                inspect block details (timestamp, miner, transactions), and check account balances.
                            </p>
                            <p style={{margin: 0, color: '#94a3b8', fontSize: '0.85rem'}}>
                                <strong>Key concepts:</strong> JSON-RPC connection, blocks, block height, accounts, wei vs ETH
                            </p>
                        </div>
                    </div>

                    {/* Lab 2 */}
                    <div>
                        <CodeBlock code={`cd scripts/cli-labs/standalone
node 2-sign-transaction.js`} id="lab2" label="Lab 2: Sign & Send Transactions" />
                        <div style={{padding: '0 0.5rem', color: '#cbd5e1', fontSize: '0.9rem'}}>
                            <p style={{margin: '0.25rem 0 0.5rem 0'}}>
                                <strong>What you'll do:</strong> Create a transaction from scratch, sign it with a private key, broadcast it to the network, 
                                and watch it get mined into a block. You'll see exactly how gas fees are calculated and deducted.
                            </p>
                            <p style={{margin: 0, color: '#94a3b8', fontSize: '0.85rem'}}>
                                <strong>Key concepts:</strong> Private key signing, nonce, gas limit, gas price, transaction lifecycle
                            </p>
                        </div>
                    </div>

                    {/* Lab 3 */}
                    <div>
                        <CodeBlock code={`cd scripts/cli-labs/standalone
node 3-interact-contract.js`} id="lab3" label="Lab 3: Interact with Smart Contracts" />
                        <div style={{padding: '0 0.5rem', color: '#cbd5e1', fontSize: '0.9rem'}}>
                            <p style={{margin: '0.25rem 0 0.5rem 0'}}>
                                <strong>What you'll do:</strong> Connect to the deployed PoS contract, read its state (total staked, your balance), 
                                send transactions to stake/unstake ETH, and listen for real-time events. Requires <code style={{color: '#fbbf24'}}>CONTRACT_ADDRESS</code> env variable.
                            </p>
                            <p style={{margin: 0, color: '#94a3b8', fontSize: '0.85rem'}}>
                                <strong>Key concepts:</strong> ABI, contract instance, read vs write calls, events, transaction receipts
                            </p>
                        </div>
                    </div>

                    {/* Lab 4 */}
                    <div>
                        <CodeBlock code={`cd scripts/cli-labs/standalone
node 4-forensics.js`} id="lab4" label="Lab 4: Blockchain Forensics" />
                        <div style={{padding: '0 0.5rem', color: '#cbd5e1', fontSize: '0.9rem'}}>
                            <p style={{margin: '0.25rem 0 0.5rem 0'}}>
                                <strong>What you'll do:</strong> Five guided forensics exercises — analyze addresses (EOA vs contract), trace transactions, 
                                scan blocks for patterns, query contract events, and generate investigation reports. Also available as Interactive CLI option 8.
                            </p>
                            <p style={{margin: 0, color: '#94a3b8', fontSize: '0.85rem'}}>
                                <strong>Key concepts:</strong> Address classification, receipt analysis, block scanning, event filtering, money flow tracking
                            </p>
                        </div>
                    </div>

                    {/* Lab 5 */}
                    <div>
                        <CodeBlock code={`cd scripts/cli-labs/standalone
node 5-contract-builder.js`} id="lab5" label="Lab 5: Smart Contract Builder" />
                        <div style={{padding: '0 0.5rem', color: '#cbd5e1', fontSize: '0.9rem'}}>
                            <p style={{margin: '0.25rem 0 0.5rem 0'}}>
                                <strong>What you'll do:</strong> Select from 6 real-world contract templates (house sale, vehicle title, event tickets, voting, 
                                crowdfunding, classroom voting), customize fields, compile with Hardhat, deploy to the blockchain, then interact with your contract. 
                                Also available as Interactive CLI option 9.
                            </p>
                            <p style={{margin: 0, color: '#94a3b8', fontSize: '0.85rem'}}>
                                <strong>Key concepts:</strong> Solidity, compilation, deployment, contract roles (admin/buyer/seller), view vs write functions
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            </div>)}

            {/* Smart Contract Builder Guide */}
            {visibleIds.has('contract-builder') && (
            <div id="cli-contract-builder" ref={el => sectionRefs.current['contract-builder'] = el}>
            <div style={{
                background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.1), rgba(139, 92, 246, 0.1))',
                border: '2px solid rgba(167, 139, 250, 0.4)',
                borderRadius: '1rem',
                padding: '1.5rem',
                marginBottom: '2rem'
            }}>
                <h3 style={{color: '#a78bfa', margin: '0 0 0.5rem 0'}}>🏗️ Smart Contract Builder (Option 9)</h3>
                <p style={{color: '#e2e8f0', margin: '0 0 1.25rem 0'}}>
                    Build and deploy real smart contracts from templates. Choose a use-case, customize fields, then compile and deploy to the live blockchain.
                </p>

                {/* Step-by-step workflow */}
                <div style={{
                    background: '#0f172a',
                    borderRadius: '0.75rem',
                    padding: '1.25rem',
                    marginBottom: '1.25rem',
                    border: '1px solid #334155'
                }}>
                    <h4 style={{color: '#c4b5fd', margin: '0 0 1rem 0', fontSize: '0.95rem'}}>Step-by-Step Workflow</h4>
                    <div style={{display: 'grid', gap: '0.75rem'}}>
                        {[
                            { step: '1', text: 'Select a template', detail: 'Choose from 6 real-world contract types (house sale, voting, tickets, etc.)' },
                            { step: '2', text: 'Customize fields', detail: 'Set names, prices, addresses, durations — or use defaults to get started quickly' },
                            { step: '3', text: 'Review the Solidity code', detail: 'See the generated .sol file with your custom values baked in' },
                            { step: '4', text: 'Compile with Hardhat', detail: 'The builder runs Hardhat compile automatically — look for "Compiled successfully"' },
                            { step: '5', text: 'Deploy to blockchain', detail: 'Your contract goes live! You\'ll get a contract address (save this!)' },
                            { step: '6', text: 'Interact via menu', detail: 'Call view functions (free) and write functions (cost gas) through the guided menu' }
                        ].map(s => (
                            <div key={s.step} style={{display: 'flex', gap: '0.75rem', alignItems: 'flex-start'}}>
                                <span style={{
                                    width: '26px', height: '26px', borderRadius: '50%',
                                    background: '#a78bfa', color: '#0f172a',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 'bold', fontSize: '0.8rem', flexShrink: 0, marginTop: '2px'
                                }}>{s.step}</span>
                                <div>
                                    <div style={{color: '#e2e8f0', fontWeight: '600'}}>{s.text}</div>
                                    <div style={{color: '#94a3b8', fontSize: '0.85rem'}}>{s.detail}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Contract Templates */}
                <h4 style={{color: '#c4b5fd', margin: '0 0 0.75rem 0', fontSize: '0.95rem'}}>Available Templates</h4>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem'}}>
                    {[
                        { icon: '🏠', name: 'House / Property Sale', desc: 'Real estate escrow with deposit, inspection period, and title transfer. Roles: Admin, Seller, Buyer.', fields: 'Address, price, deposit %, inspection days' },
                        { icon: '🚗', name: 'Vehicle Title Transfer', desc: 'Ownership registry with VIN tracking, title status (clean/salvage/rebuilt), and mileage history.', fields: 'VIN, make, model, year, owner' },
                        { icon: '🎟️', name: 'Event Tickets', desc: 'Limited-supply ticket sales with purchases, transfers, check-in verification, and refunds on cancellation.', fields: 'Event name, max supply, price, date' },
                        { icon: '🗳️', name: 'Voting System', desc: 'Multi-option voting with deadlines. Track votes, tally results, extend deadlines if needed.', fields: 'Title, options, duration, admin' },
                        { icon: '💸', name: 'Crowdfunding Campaign', desc: 'Fundraising with goal amounts and deadlines. Auto-refund if goal not met; creator withdraws when reached.', fields: 'Campaign name, goal, duration, min contribution' },
                        { icon: '🎓', name: 'Classroom Voting Demo', desc: 'Simple A/B voting. Deployer opens/closes voting; voters use wallets; dashboard shows live results.', fields: 'Question, Option A, Option B' }
                    ].map(t => (
                        <div key={t.name} style={{
                            background: '#1e293b',
                            borderRadius: '0.75rem',
                            padding: '1rem',
                            border: '1px solid #334155'
                        }}>
                            <div style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>{t.icon}</div>
                            <div style={{color: '#e2e8f0', fontWeight: '600', marginBottom: '0.25rem'}}>{t.name}</div>
                            <div style={{color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem'}}>{t.desc}</div>
                            <div style={{color: '#818cf8', fontSize: '0.8rem'}}>
                                <strong>Customize:</strong> {t.fields}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            </div>)}

            {/* Expanded Playground Examples */}
            {visibleIds.has('walkthroughs') && (
            <div id="cli-walkthroughs" ref={el => sectionRefs.current['walkthroughs'] = el}>
            <div style={{
                background: '#1e293b',
                borderRadius: '1rem',
                padding: '1.5rem',
                marginBottom: '2rem',
                border: '1px solid #334155'
            }}>
                <h3 style={{color: '#f8fafc', margin: '0 0 0.5rem 0'}}>🔬 Playground Forensics Walkthroughs</h3>
                <p style={{color: '#94a3b8', margin: '0 0 1.25rem 0'}}>
                    Copy these complete workflows into the Playground (Option 8) to practice real forensics techniques.
                </p>

                {/* Walkthrough 1: Full Address Investigation */}
                <div style={{marginBottom: '1.25rem'}}>
                    <h4 style={{color: '#86efac', margin: '0 0 0.5rem 0', fontSize: '0.95rem'}}>
                        Walkthrough 1: Full Address Investigation
                    </h4>
                    <p style={{color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 0.75rem 0'}}>
                        Analyze an unknown address — determine its type, check balance, review activity, and check staking status.
                    </p>
                    <CodeBlock id="wt1" code={`// Step 1: Pick a target address (ctx is provided by Playground; ensure it exists if running elsewhere)
if (typeof globalThis.ctx === 'undefined') globalThis.ctx = {};
const ctx = globalThis.ctx;
ctx.target = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'

// Step 2: Is it a wallet or a contract?
ctx.code = await provider.getCode(ctx.target)
console.log('Type:', ctx.code === '0x' ? 'Wallet (EOA)' : 'Smart Contract')

// Step 3: Check the balance
ctx.balance = await provider.getBalance(ctx.target)
console.log('Balance:', formatEth(ctx.balance), 'ETH')

// Step 4: How many transactions has it sent?
ctx.nonce = await provider.getTransactionCount(ctx.target)
console.log('Transactions sent:', ctx.nonce)

// Step 5: Check staking status (if contract is available)
ctx.stake = await contract.getStake(ctx.target)
console.log('Staked:', formatEth(ctx.stake), 'ETH')`} />
                </div>

                {/* Walkthrough 2: Trace a Transaction */}
                <div style={{marginBottom: '1.25rem'}}>
                    <h4 style={{color: '#86efac', margin: '0 0 0.5rem 0', fontSize: '0.95rem'}}>
                        Walkthrough 2: Trace a Suspicious Transaction
                    </h4>
                    <p style={{color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 0.75rem 0'}}>
                        Given a transaction hash, extract every detail — who sent it, where it went, how much gas was burned, and what events fired.
                    </p>
                    <CodeBlock id="wt2" code={`// Step 1: Get a recent transaction hash from a block
if (typeof globalThis.ctx === 'undefined') globalThis.ctx = {};
const ctx = globalThis.ctx;
ctx.block = await provider.getBlock('latest', true)
ctx.hash = ctx.block.prefetchedTransactions[0]?.hash
console.log('Investigating tx:', ctx.hash)

// Step 2: Pull the full transaction object
ctx.tx = await provider.getTransaction(ctx.hash)
console.log('From:', ctx.tx.from)
console.log('To:', ctx.tx.to)
console.log('Value:', formatEth(ctx.tx.value), 'ETH')
console.log('Gas limit:', ctx.tx.gasLimit.toString())

// Step 3: Get the execution receipt
ctx.receipt = await provider.getTransactionReceipt(ctx.hash)
console.log('Status:', ctx.receipt.status === 1 ? 'SUCCESS' : 'FAILED')
console.log('Gas used:', ctx.receipt.gasUsed.toString())
console.log('Events emitted:', ctx.receipt.logs.length)

// Step 4: Calculate the actual fee
ctx.fee = ctx.receipt.gasUsed * ctx.receipt.gasPrice
console.log('Fee paid:', formatEth(ctx.fee), 'ETH')`} />
                </div>

                {/* Walkthrough 3: Scan blocks for activity */}
                <div style={{marginBottom: '1.25rem'}}>
                    <h4 style={{color: '#86efac', margin: '0 0 0.5rem 0', fontSize: '0.95rem'}}>
                        Walkthrough 3: Scan Recent Blocks for Activity
                    </h4>
                    <p style={{color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 0.75rem 0'}}>
                        Scan the last 10 blocks, count transactions, find the most active block, and identify high-value transfers.
                    </p>
                    <CodeBlock id="wt3" code={`// Scan the last 10 blocks
if (typeof globalThis.ctx === 'undefined') globalThis.ctx = {};
const ctx = globalThis.ctx;
ctx.latest = await provider.getBlockNumber()
ctx.start = Math.max(0, ctx.latest - 10)
ctx.summary = []

for (let i = ctx.start; i <= ctx.latest; i++) {
  const b = await provider.getBlock(i, true)
  const txCount = b.prefetchedTransactions?.length || 0
  const totalValue = b.prefetchedTransactions?.reduce(
    (sum, tx) => sum + tx.value, 0n) || 0n
  ctx.summary.push({
    block: i,
    txs: txCount,
    totalETH: formatEth(totalValue),
    time: toDate(b.timestamp)
  })
}
console.table(ctx.summary)`} />
                </div>

                {/* Walkthrough 4: Contract interaction from Playground */}
                <div>
                    <h4 style={{color: '#86efac', margin: '0 0 0.5rem 0', fontSize: '0.95rem'}}>
                        Walkthrough 4: Interact with a Deployed Contract
                    </h4>
                    <p style={{color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 0.75rem 0'}}>
                        Connect to any deployed contract (including ones you built) from the Playground using its address and ABI.
                    </p>
                    <CodeBlock id="wt4" code={`// Connect to the PoS contract (already available as 'contract')
if (typeof globalThis.ctx === 'undefined') globalThis.ctx = {};
const ctx = globalThis.ctx;
ctx.totalStaked = await contract.totalStaked()
console.log('Network total staked:', formatEth(ctx.totalStaked), 'ETH')

// Query all staking events
ctx.events = await contract.queryFilter('Staked', 0)
console.log('Total staking events:', ctx.events.length)

// Show who staked and how much
ctx.events.forEach(e => {
  console.log(formatAddr(e.args[0]), 'staked', formatEth(e.args[1]), 'ETH')
})

// Connect to a CUSTOM contract (e.g. one you deployed):
// ctx.myContract = new ethers.Contract(
//   '0xYOUR_CONTRACT_ADDRESS',
//   ['function getTitle() view returns (string)', 
//    'function vote(uint option)'],
//   wallet
// )`} />
                </div>
            </div>
            </div>)}

            {/* Test Accounts */}
            {visibleIds.has('test-accounts') && (
            <div id="cli-test-accounts" ref={el => sectionRefs.current['test-accounts'] = el}>
            <div style={{
                background: '#1e293b',
                borderRadius: '1rem',
                padding: '1.5rem',
                border: '1px solid #334155'
            }}>
                <h3 style={{color: '#f8fafc', margin: '0 0 1rem 0'}}>👥 Test Accounts</h3>
                <p style={{color: '#94a3b8', margin: '0 0 1rem 0'}}>
                    All students share these test accounts (Hardhat defaults). Each starts with 10,000 ETH. You can also generate your own wallet using Account Manager (Option 10).
                </p>
                
                <div style={{
                    background: '#0f172a',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    fontFamily: "'Fira Code', monospace",
                    fontSize: '0.8rem',
                    overflow: 'auto'
                }}>
                    <div style={{display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.5rem 1rem'}}>
                        <span style={{color: '#94a3b8'}}>Account 0:</span>
                        <span style={{color: '#fbbf24'}}>0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266</span>
                        <span style={{color: '#94a3b8'}}>Account 1:</span>
                        <span style={{color: '#fbbf24'}}>0x70997970C51812dc3A010C7d01b50e0d17dc79C8</span>
                        <span style={{color: '#94a3b8'}}>Account 2:</span>
                        <span style={{color: '#fbbf24'}}>0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC</span>
                        <span style={{color: '#94a3b8'}}>Account 3:</span>
                        <span style={{color: '#fbbf24'}}>0x90F79bf6EB2c4f870365E785982E1f101E93b906</span>
                        <span style={{color: '#94a3b8'}}>Account 4:</span>
                        <span style={{color: '#fbbf24'}}>0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65</span>
                    </div>
                </div>

                <div style={{
                    background: 'rgba(251, 191, 36, 0.08)',
                    border: '1px solid rgba(251, 191, 36, 0.2)',
                    borderRadius: '0.5rem',
                    padding: '0.75rem 1rem',
                    marginTop: '0.75rem'
                }}>
                    <p style={{color: '#fcd34d', margin: 0, fontSize: '0.85rem'}}>
                        <strong>Important:</strong> These are shared test accounts — everyone on the network can see and use them. 
                        For your own private wallet, use Account Manager (Option 10) to generate a new keypair. Never use test private keys on mainnet!
                    </p>
                </div>
            </div>
            </div>)}
        </div>
    );
}

// --- COMPONENT: EXPLORE VIEW ---
const EXPLORE_BEACON_IDS = [
    'eth-explore-staking',
    'eth-explore-validators',
    'eth-explore-slashing',
    'eth-explore-defi',
    'eth-explore-rewards',
    'eth-explore-attack-cost',
    'eth-explore-chain',
    'eth-explore-address',
];

function ExploreView({ missions, exploreProgress, setExploreProgress, onBack, onContinue, fireProgressBeacon }) {
    const [expandedMission, setExpandedMission] = useState(null);
    const [quizAnswers, setQuizAnswers] = useState({});

    const toggleMission = (idx) => {
        const opening = expandedMission !== idx;
        setExpandedMission(opening ? idx : null);
        if (opening && fireProgressBeacon && !missions[idx].quiz) {
            fireProgressBeacon(EXPLORE_BEACON_IDS[idx]);
        }
    };

    const handleQuizAnswer = (missionIdx, answerIdx) => {
        const mission = missions[missionIdx];
        if (!mission.quiz) return;

        const isCorrect = answerIdx === mission.quiz.correct;
        setQuizAnswers({ ...quizAnswers, [missionIdx]: { selected: answerIdx, correct: isCorrect } });

        if (isCorrect) {
            const next = [...exploreProgress];
            next[missionIdx] = true;
            setExploreProgress(next);
            if (fireProgressBeacon) fireProgressBeacon(EXPLORE_BEACON_IDS[missionIdx]);
        }
    };

    const completedCount = exploreProgress.filter(Boolean).length;
    const totalCount = missions.length;

    return (
        <div className="explore-view">
            <div className="explore-header">
                <h2>🛰 Deep Dive: Staking, Validators & DeFi</h2>
                <p style={{fontSize: '1.1rem', color: '#cbd5e1', marginBottom: '1rem'}}>
                    Explore advanced Ethereum concepts through interactive missions
                </p>
                <div style={{
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))',
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    marginTop: '1rem'
                }}>
                    <strong style={{fontSize: '1.2rem'}}>Progress: {completedCount}/{totalCount} missions completed</strong>
                </div>
            </div>

            <div style={{marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                {missions.map((mission, idx) => {
                    const isExpanded = expandedMission === idx;
                    const isCompleted = exploreProgress[idx];
                    const quizState = quizAnswers[idx];

                    return (
                        <div 
                            key={idx}
                            style={{
                                background: isCompleted ? 'rgba(34,197,94,0.1)' : '#1e293b',
                                border: `2px solid ${isCompleted ? '#22c55e' : '#334155'}`,
                                borderRadius: '1rem',
                                overflow: 'hidden',
                                transition: 'all 0.3s'
                            }}
                        >
                            {/* Mission Header */}
                            <div 
                                onClick={() => toggleMission(idx)}
                                style={{
                                    padding: '1.5rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: isExpanded ? 'rgba(0,0,0,0.2)' : 'transparent'
                                }}
                            >
                                <div style={{flex: 1}}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem'}}>
                                        <span style={{
                                            background: isCompleted ? '#22c55e' : '#64748b',
                                            color: 'white',
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold'
                                        }}>
                                            {isCompleted ? '✓' : idx + 1}
                                        </span>
                                        <h3 style={{margin: 0, fontSize: '1.3rem', color: '#f8fafc'}}>{mission.title}</h3>
                                    </div>
                                    {mission.category && (
                                        <span style={{
                                            fontSize: '0.75rem',
                                            background: '#3b82f6',
                                            color: 'white',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '999px',
                                            marginLeft: '48px'
                                        }}>
                                            {mission.category}
                                        </span>
                                    )}
                                    <p style={{margin: '0.75rem 0 0 48px', color: '#94a3b8'}}>{mission.action}</p>
                                </div>
                                <span style={{fontSize: '1.5rem', transition: 'transform 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)'}}>
                                    ▼
                                </span>
                            </div>

                            {/* Mission Content (Expanded) */}
                            {isExpanded && (
                                <div style={{
                                    padding: '1.5rem',
                                    background: '#0f172a',
                                    borderTop: '1px solid #334155',
                                    animation: 'fadein 0.3s',
                                    color: '#e2e8f0'
                                }}>
                                    {mission.miniLab && (
                                        <div style={{marginBottom: '2rem'}}>
                                            {mission.miniLab === 'blockchain-visualizer' && <BlockchainVisualizer />}
                                            {mission.miniLab === 'address-decoder' && <AddressDecoder />}
                                            {mission.miniLab === 'staking-rewards' && <StakingRewards />}
                                            {mission.miniLab === 'validator-probability' && <ValidatorProbability />}
                                            {mission.miniLab === 'slashing-penalty' && <SlashingPenalty />}
                                            {mission.miniLab === 'attack-cost' && <AttackCost />}
                                        </div>
                                    )}
                                    
                                    {/* VIDEO EMBED - Shows when video URL is provided */}
                                    {mission.video && (
                                        <div style={{
                                            marginBottom: '2rem',
                                            borderRadius: '0.75rem',
                                            overflow: 'hidden',
                                            background: '#0f172a',
                                            border: '2px solid #10b981'
                                        }}>
                                            <div style={{
                                                padding: '0.75rem 1rem',
                                                background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                fontSize: '0.9rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}>
                                                🎬 Watch: {mission.title}
                                            </div>
                                            <div style={{position: 'relative', paddingBottom: '56.25%', height: 0}}>
                                                <iframe
                                                    src={mission.video}
                                                    title={`Video: ${mission.title}`}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        width: '100%',
                                                        height: '100%',
                                                        border: 'none'
                                                    }}
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            </div>
                                        </div>
                                    )}
                                    
                                    {mission.details && (
                                        <ul style={{
                                            listStyle: 'none',
                                            padding: 0,
                                            margin: '0 0 1.5rem 0'
                                        }}>
                                            {mission.details.map((detail, dIdx) => (
                                                <li key={dIdx} style={{
                                                    padding: '0.75rem',
                                                    marginBottom: '0.5rem',
                                                    background: 'rgba(59,130,246,0.1)',
                                                    borderLeft: '3px solid #3b82f6',
                                                    borderRadius: '0.25rem',
                                                    color: '#e2e8f0',
                                                    fontSize: '1rem',
                                                    lineHeight: '1.6'
                                                }}>
                                                    💡 {detail}
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    {mission.quiz && (
                                        <div style={{
                                            background: 'rgba(139,92,246,0.1)',
                                            padding: '1.5rem',
                                            borderRadius: '0.75rem',
                                            border: '1px solid rgba(139,92,246,0.3)'
                                        }}>
                                            <h4 style={{color: '#a78bfa', marginTop: 0}}>🎯 Quick Quiz</h4>
                                            <p style={{color: '#e2e8f0', fontSize: '1.05rem', fontWeight: 'bold', marginBottom: '1rem'}}>
                                                {mission.quiz.question}
                                            </p>
                                            <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                                                {mission.quiz.options.map((option, oIdx) => {
                                                    const isSelected = quizState?.selected === oIdx;
                                                    const isCorrectAnswer = oIdx === mission.quiz.correct;
                                                    const showResult = quizState !== undefined;

                                                    let bgColor = '#1e293b';
                                                    let borderColor = '#475569';
                                                    let textColor = '#e2e8f0';

                                                    if (showResult) {
                                                        if (isCorrectAnswer) {
                                                            bgColor = 'rgba(34,197,94,0.2)';
                                                            borderColor = '#22c55e';
                                                            textColor = '#86efac';
                                                        } else if (isSelected && !isCorrectAnswer) {
                                                            bgColor = 'rgba(239,68,68,0.2)';
                                                            borderColor = '#ef4444';
                                                            textColor = '#fca5a5';
                                                        }
                                                    } else if (isSelected) {
                                                        bgColor = 'rgba(59,130,246,0.2)';
                                                        borderColor = '#3b82f6';
                                                    }

                                                    return (
                                                        <button
                                                            key={oIdx}
                                                            onClick={() => !quizState && handleQuizAnswer(idx, oIdx)}
                                                            disabled={quizState !== undefined}
                                                            style={{
                                                                padding: '1rem',
                                                                background: bgColor,
                                                                border: `2px solid ${borderColor}`,
                                                                borderRadius: '0.5rem',
                                                                color: textColor,
                                                                cursor: quizState ? 'default' : 'pointer',
                                                                textAlign: 'left',
                                                                fontSize: '1rem',
                                                                transition: 'all 0.2s',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.75rem'
                                                            }}
                                                        >
                                                            <span style={{
                                                                width: '24px',
                                                                height: '24px',
                                                                borderRadius: '50%',
                                                                background: 'rgba(255,255,255,0.1)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontWeight: 'bold'
                                                            }}>
                                                                {String.fromCharCode(65 + oIdx)}
                                                            </span>
                                                            {option}
                                                            {showResult && isCorrectAnswer && ' ✓'}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            {quizState && (
                                                <div style={{marginTop: '1rem'}}>
                                                    <div style={{
                                                        padding: '1rem',
                                                        background: quizState.correct ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                                                        borderRadius: quizState.correct && mission.quiz.explanation ? '0.5rem 0.5rem 0 0' : '0.5rem',
                                                        color: quizState.correct ? '#86efac' : '#fca5a5',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {quizState.correct ? '✅ Correct! Mission completed.' : '❌ Not quite. Try again!'}
                                                    </div>
                                                    {/* EXPLANATION - Shows after correct answer */}
                                                    {quizState.correct && mission.quiz.explanation && (
                                                        <div style={{
                                                            padding: '1rem 1.25rem',
                                                            background: 'rgba(59, 130, 246, 0.1)',
                                                            borderRadius: '0 0 0.5rem 0.5rem',
                                                            borderTop: '1px solid rgba(59, 130, 246, 0.3)',
                                                            borderLeft: '3px solid #3b82f6'
                                                        }}>
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                marginBottom: '0.5rem',
                                                                color: '#93c5fd',
                                                                fontSize: '0.85rem',
                                                                fontWeight: '600'
                                                            }}>
                                                                💡 Why This Matters
                                                            </div>
                                                            <p style={{
                                                                margin: 0,
                                                                color: '#cbd5e1',
                                                                fontSize: '0.95rem',
                                                                lineHeight: '1.6',
                                                                fontWeight: 'normal'
                                                            }}>
                                                                {mission.quiz.explanation}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {!mission.quiz && (
                                        <button
                                            onClick={() => {
                                                const next = [...exploreProgress];
                                                next[idx] = !next[idx];
                                                setExploreProgress(next);
                                            }}
                                            style={{
                                                marginTop: '1rem',
                                                padding: '0.75rem 1.5rem',
                                                background: isCompleted ? '#64748b' : '#22c55e',
                                                border: 'none',
                                                borderRadius: '0.5rem',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {isCompleted ? 'Mark Incomplete' : 'Mark Complete ✓'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="concept-actions" style={{marginTop: '2rem'}}>
                <button onClick={onBack}>← Back to Basics</button>
                <button
                    className="primary-btn"
                    onClick={onContinue}
                >
                    Continue to Practice →
                </button>
            </div>
        </div>
    );
}

// --- COMPONENT: COMPREHENSIVE PoS VALIDATOR SIMULATION ---
// Based on Ethereum PoS research synthesis covering: validator lifecycle, consensus mechanics,
// randomness beacons, network modeling, incentives, attack vectors, and metrics collection

// =============================================================================
// EDUCATIONAL STORY MODE: "The Trust Problem"
// A beginner-friendly guided journey that builds understanding step-by-step
// =============================================================================

function SimulationMode({ onComplete }) {
    const [simStep, setSimStep] = useState(1);

    return (
        <div className="simulation-container">
            <h2>🧪 Practice Lab (Fake Mode)</h2>
            
            {simStep === 1 && (
                <div className="sim-step">
                    <h3>Step 1: Generate a Wallet</h3>
                    <p>Click the button to create a random key pair locally.</p>
                    <button onClick={() => setSimStep(2)}>Generate Keys 🎲</button>
                </div>
            )}

            {simStep === 2 && (
                <div className="sim-step">
                    <h3>Step 2: Review Credentials</h3>
                    <div className="fake-wallet">
                        <p><strong>Private Key:</strong> 0x4c0883a69102937d6231471b5dbb6204</p>
                        <p><strong>Address:</strong> 0x71C7656EC7ab88b098defB751B7401B5f6d8976F</p>
                    </div>
                    <p>In the real world, you would save the Private Key securely!</p>
                    <button onClick={() => setSimStep(3)}>I saved it ✅</button>
                </div>
            )}

            {simStep === 3 && (
                <div className="sim-step">
                    <h3>Step 3: Craft a Transaction</h3>
                    <p>Let's simulate sending 1.0 ETH to Alice.</p>
                    <div className="fake-tx-form">
                        <label>To:</label>
                        <input disabled value="0xAlice..." />
                        <label>Amount:</label>
                        <input disabled value="1.0 ETH" />
                        <label>Gas Fee:</label>
                        <input disabled value="0.00042 ETH" />
                    </div>
                    <button onClick={() => setSimStep(4)}>Sign & Send ✍️</button>
                </div>
            )}

             {simStep === 4 && (
                <div className="sim-step">
                    <h3>Step 4: Confirmed!</h3>
                    <p>Your transaction was included in Block #492.</p>
                    <div className="success-icon">🎉</div>
                    <button className="primary-btn" onClick={onComplete}>Go to Live Network 🚀</button>
                </div>
            )}
        </div>
    )
}

// Which hands-on labs students can open. Tokenization and Forensics are off by default.
// BACKLOG: let the instructor toggle these at runtime (e.g. via instructor config /
// api/config.json) instead of this hardcoded map. See hand-off.md "Backlog".
const LAB_ENABLED = {
  'contract-builder-lab': true,
  'beacon-lab': true,
  'tokenization-lab': true,
  'arcade-lab': true,
  'nft-marketplace': true,
  'forensics-lab': false,
};

const CACHE_BACKED_NODE_STATUS_VIEWS = new Set([
  'live',
  'tokens',
  'beacon-lab',
  'contract-builder-lab',
  'tokenization-lab',
  'arcade-lab',
  'nft-marketplace',
]);

// The old Live dashboard predates the instructor cache fan-in model and polls the
// shared node directly. Keep writes/manual actions available, but do not start its
// automatic RPC sync in managed classroom mode.
const LEGACY_LIVE_RPC_SYNC_ENABLED = false;

// The scenario/role system (Victim/Attacker, Seller/Buyer, etc. assigned via chat
// [SCENARIO:]/[ROLES:] messages) belongs to the CRUD/forensics labs that are cut
// from the active surface. Off by default so students aren't handed roles for
// labs that don't exist. Flip to true if those scenario labs are re-enabled.
const SCENARIO_ROLES_ENABLED = false;

// --- MAIN APP COMPONENT ---
function App() {
  // Check URL params for instructor mode and student (live) view
  const urlParams = new URLSearchParams(window.location.search)
  const urlWantsInstructor = urlParams.get('mode') === 'instructor'
  const viewFromUrl = urlParams.get('view')
  const sessionHydratedRef = useRef(false)
  const progressBeaconLastRef = useRef({})
  const patchSession = useCallback((namespace, patch) => {
    if (!sessionHydratedRef.current) return
    patchSessionNamespace(namespace, patch).catch((err) => {
      console.warn('[SessionState] persist failed:', namespace, err?.message || err)
    })
  }, [])

  // Session from Lab API: isInstructor (IP-checked), hasCreatedWallet (per-IP)
  const [session, setSession] = useState({ isInstructor: false, hasCreatedWallet: true, loading: true })
  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'lab-api/session').then(r => r.ok ? r.json() : null).then(data => {
      if (data) setSession({ isInstructor: data.isInstructor, hasCreatedWallet: data.hasCreatedWallet, loading: false })
      else setSession(prev => ({ ...prev, loading: false, hasCreatedWallet: true })) // Lab API unavailable: permissive
    }).catch(() => setSession(prev => ({ ...prev, loading: false, hasCreatedWallet: true })))
  }, [])

  // Only allow instructor view if URL has mode=instructor AND session confirms instructor IP
  const isInstructor = urlWantsInstructor && session.isInstructor && !session.loading
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    patchSession('ui', { theme });
  }, [theme, patchSession])

  const [view, setView] = useState(
    urlWantsInstructor ? 'instructor'
      : viewFromUrl === 'live' ? 'live'
      : viewFromUrl === 'diagnostics' ? 'diagnostics'
      : viewFromUrl === 'beacon-lab' ? 'beacon-lab'
      : viewFromUrl === 'contract-builder-lab' ? 'contract-builder-lab'
      : viewFromUrl === 'tokenization-lab' ? 'tokenization-lab'
      : viewFromUrl === 'arcade-lab' ? 'arcade-lab'
      : viewFromUrl === 'nft-marketplace' ? 'nft-marketplace'
      : viewFromUrl === 'forensics-lab' ? 'forensics-lab'
      : 'live'
  ); // intro -> concepts -> explore -> sim -> live -> diagnostics -> beacon-lab -> contract-builder-lab -> tokenization-lab -> arcade-lab -> forensics-lab -> cli | instructor
  const [appMode, setAppMode] = useState('live'); // 'learning' | 'live' | 'cli' | 'instructor' - top-level mode separation

  // Guard: a disabled lab can't be opened (even via deep link); fall back to the dashboard.
  useEffect(() => {
    if (LAB_ENABLED[view] === false) setView('live');
  }, [view]);

  useEffect(() => {
    if (typeof window === 'undefined') return
    const u = new URL(window.location.href)
    const nextView = SHAREABLE_QUERY_VIEWS.has(view) ? view : null
    if (nextView) {
      if (u.searchParams.get('view') === nextView) return
      u.searchParams.set('view', nextView)
      window.history.replaceState({}, '', u.toString())
      return
    }
    if (!u.searchParams.has('view')) return
    u.searchParams.delete('view')
    window.history.replaceState({}, '', u.toString())
  }, [view])

  // When session loads: if URL has ?mode=instructor but IP not allowed, strip param and redirect
  useEffect(() => {
    if (session.loading) return
    if (urlWantsInstructor && !session.isInstructor) {
      const u = new URL(window.location.href)
      u.searchParams.delete('mode')
      window.history.replaceState({}, '', u.toString())
      setView(
        viewFromUrl === 'live' ? 'live'
          : viewFromUrl === 'diagnostics' ? 'diagnostics'
          : viewFromUrl === 'beacon-lab' ? 'beacon-lab'
          : viewFromUrl === 'contract-builder-lab' ? 'contract-builder-lab'
          : viewFromUrl === 'tokenization-lab' ? 'tokenization-lab'
          : viewFromUrl === 'arcade-lab' ? 'arcade-lab'
          : viewFromUrl === 'nft-marketplace' ? 'nft-marketplace'
          : viewFromUrl === 'forensics-lab' ? 'forensics-lab'
          : 'live'
      )
    }
  }, [session.loading, session.isInstructor, urlWantsInstructor, viewFromUrl])
  
  // --- LIVE MODE STATE ---
  const isRemote = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
  const port = typeof window !== 'undefined' ? window.location.port : ''
  const normalizeBrowserRpcUrl = (value) => {
    const raw = (value || '').trim();
    if (!raw) return raw;
    return raw.replace(/\/(?:rpc|rpc-proxy)([?#].*)?$/, '/rpc-write$1');
  };
  const defaultRpcUrl = port === '5173'
    ? resolveRpcUrl('/rpc-write')
    : resolveRpcUrl('/rpc-write')
  
  // Check for student mode and auto-load config. Student mode is now driven by
  // runtime config/session state rather than browser-persisted flags.
  const isStudentMode = false
  const customRpc = ''

  const [trail, setTrail] = useState({ intro: false, concepts: false, explore: false })

  const [exploreProgress, setExploreProgress] = useState([false, false, false])

  const [navHint, setNavHint] = useState('')
  
  const [rpcUrl, setRpcUrl] = useState(customRpc || defaultRpcUrl)
  const [terminalRpcUrl, setTerminalRpcUrl] = useState('')
  const [runtimeConfigLoaded, setRuntimeConfigLoaded] = useState(false)
  // Whether the in-browser Lab Terminal exists for this lane. Student lanes set this
  // false (no terminal-server.js running) so we hide every terminal entry point and
  // don't leave dead buttons that fail to connect. Default true → instructor/standalone
  // and any legacy config without the field keep the terminal.
  const [labTerminalEnabled, setLabTerminalEnabled] = useState(true)
  const [showRpcConfig, setShowRpcConfig] = useState(isRemote || isStudentMode) // Show config for remote users and students
  const [provider, setProvider] = useState(null)
  const [nodeStatus, setNodeStatus] = useState({ connected: false, blockNumber: 0 })
  const [wallet, setWallet] = useState({ address: null, signer: null, balance: '0', mode: null, nickname: 'My Wallet' })
  const [walletBalanceMeta, setWalletBalanceMeta] = useState({ status: 'idle', ageMs: null, cached: false, error: '' })
  const [showLiveHelp, setShowLiveHelp] = useState(false)
  const [newWalletModal, setNewWalletModal] = useState(null) // { address, privateKey } when showing new wallet credentials
  const [accountModal, setAccountModal] = useState(null) // { address, nickname } when showing copyable account details
  const [topOffMiningOpen, setTopOffMiningOpen] = useState(false)
  const [topOffMiningAwarding, setTopOffMiningAwarding] = useState(false)
  const topOffAwardingRef = useRef(false)
  const [posAddress, setPosAddress] = useState("0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e")
  
  // Auto-load contract address and RPC URL from deploy config under the current base path.
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Try Docker/sandbox config first (has rpcUrl + mode), then deploy-generated
        for (const url of [
          import.meta.env.BASE_URL + 'api/config.json',
          import.meta.env.BASE_URL + 'contract-config.json',
        ]) {
          try {
            const response = await fetch(url);
            if (!response.ok) continue;
            const config = await response.json();
            const isStudent = config.mode === 'student' || config.role === 'student';
            const isInstructor = config.mode === 'instructor' || config.role === 'instructor';
            // Auto-set contract address
            if (config.contractAddress && config.contractAddress.length === 42) {
              if (posAddress !== config.contractAddress) {
                console.log('[Config] Updating contract address:', posAddress, '->', config.contractAddress);
                setPosAddress(config.contractAddress);
              }
            }
            // Auto-set RPC URL for both student and instructor (virtualized sandbox auto-config)
            if (config.rpcUrl && (isStudent || isInstructor)) {
              const nextRpcUrl = normalizeBrowserRpcUrl(config.rpcUrl);
              setRpcUrl(nextRpcUrl);
              console.log('[Config] RPC URL set from config:', nextRpcUrl, 'mode:', config.mode || config.role);
            }
            if (config.terminalRpcUrl && (isStudent || isInstructor)) {
              setTerminalRpcUrl(config.terminalRpcUrl);
              console.log('[Config] Terminal RPC URL set from config:', config.terminalRpcUrl);
            }
            // Hide all terminal entry points when the lane reports no terminal (student lanes).
            if (typeof config.labTerminalEnabled === 'boolean') {
              setLabTerminalEnabled(config.labTerminalEnabled);
              console.log('[Config] Lab Terminal enabled:', config.labTerminalEnabled);
            }
            // Wallets are now loaded from /api/ethereum/session/state so keys are
            // scoped to the claimed UUID instead of persisted in browser storage.
            if (config.contractAddress && config.contractAddress.length === 42) return;
          } catch (e) { /* config not available */ }
        }
        console.log('[Config] No deploy config found (using session state or fallback)');
      } finally {
        setRuntimeConfigLoaded(true);
      }
    };
    loadConfig();
  }, [])
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState("")
  const [validators, setValidators] = useState([]) // Note: This includes all participants (stakers + chatters)
  const [actualValidatorCount, setActualValidatorCount] = useState(0) // Actual stakers from contract
  const [statusMsg, setStatusMsg] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const hasAutoJoined = useRef(false) // Track if we've auto-joined this session
  const joiningClassRef = useRef(false) // Shared in-flight guard: prevents the auto-join and the manual "Join Class List" button from sending duplicate join txs (same nonce)
  
  // Nickname system - store nicknames for classmates
  const [nicknames, setNicknames] = useState({});
  const [myNickname, setMyNickname] = useState("");
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [sessionStart, setSessionStart] = useState(() => Date.now())

  // Peer To Peer Send State
  const [recipient, setRecipient] = useState("")
  const [sendAmount, setSendAmount] = useState("")
  const [sendAssetType, setSendAssetType] = useState("eth")
  const [sendNftTokenId, setSendNftTokenId] = useState("")
  const [dashboardAssetConfig, setDashboardAssetConfig] = useState({
    arcadeTokenAddress: "",
    nftAddress: "",
  })
  
  // Staking State (32 ETH = Ethereum mainnet validator minimum)
  const [stakeAmount, setStakeAmount] = useState("32")
  
  // Transaction History
  const [txHistory, setTxHistory] = useState([])
  const [myStake, setMyStake] = useState(() => {
    return {
      amount: '0',
      reward: '0',
      slashCount: 0,
      blocksProposed: 0,
      missedAttestations: 0,
      unbondingTime: 0,
      minStakeDuration: 0,
      hasAttestedThisEpoch: false,
      unbondingStartTime: 0,
      lastProposedBlockNumber: 0,
      role: ''
    };
  })
  
  // Enhanced PoS State
  const [currentEpoch, setCurrentEpoch] = useState(1)
  const [timeUntilNextEpoch, setTimeUntilNextEpoch] = useState(0)
  const [currentAPY, setCurrentAPY] = useState(5)
  const [withdrawalRequested, setWithdrawalRequested] = useState(false)
  
  // Sync status indicator
  const [lastSyncTime, setLastSyncTime] = useState(Date.now())
  const lastSyncRef = useRef(Date.now())
  const prevRoleRef = useRef('')
  const [roleAssignedBanner, setRoleAssignedBanner] = useState(false)
  const [roleContractInput, setRoleContractInput] = useState('')
  const [roleContractRegistering, setRoleContractRegistering] = useState(false)
  const [deployRoleInProgress, setDeployRoleInProgress] = useState(false)
  const [roleTemplateExpanded, setRoleTemplateExpanded] = useState(false)

  // Ransomware scenario (Phase 7)
  const [ransomContractAddress, setRansomContractAddress] = useState('')
  const [artifactsOpen, setArtifactsOpen] = useState(true)

  const [livePageBlocksOpen, setLivePageBlocksOpen] = useState({
    yourWalletBanner: true,
    roleAssigned: false,
    identityStrip: true,
    socialProof: false,
    createWalletBanner: true,
    walletAndRole: false,
    assetsCard: false,
    sendCard: false,
    connectionCard: false,
    txHistoryCard: false,
    classChat: true,
    evidenceSection: false,
  })
  const toggleLivePageBlock = (key) => {
    setLivePageBlocksOpen((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const saveTrail = (next) => {
    setTrail(next)
    patchSession('ui', { trail: next })
  }

  useEffect(() => {
    let cancelled = false
    const hydrateBackendSession = async () => {
      try {
        const data = await fetchSessionState()
        if (cancelled) return
        const ui = data?.state?.ui || {}
        const live = data?.state?.live || {}
        applySessionWalletState(data?.state?.wallets || {})
        applyContractSourcesState(data?.state?.['contract-sources'] || {})
        if (ui.theme === 'dark' || ui.theme === 'light') setTheme(ui.theme)
        if (ui.trail && typeof ui.trail === 'object') setTrail({
          intro: !!ui.trail.intro,
          concepts: !!ui.trail.concepts,
          explore: !!ui.trail.explore,
        })
        if (Array.isArray(ui.exploreProgress)) setExploreProgress(ui.exploreProgress.slice(0, 3).map(Boolean))
        if (typeof ui.nickname === 'string') setMyNickname(ui.nickname)
        if (ui.nicknames && typeof ui.nicknames === 'object' && !Array.isArray(ui.nicknames)) setNicknames(ui.nicknames)
        if (Number.isFinite(Number(ui.sessionStart))) setSessionStart(Number(ui.sessionStart))
        if (typeof ui.rpcUrl === 'string' && ui.rpcUrl.trim()) setRpcUrl(normalizeBrowserRpcUrl(ui.rpcUrl))
        if (typeof ui.posAddress === 'string' && ui.posAddress.length === 42) setPosAddress(ui.posAddress)
        if (typeof live.ransomContractAddress === 'string') setRansomContractAddress(live.ransomContractAddress)
        if (live.myStake && typeof live.myStake === 'object') {
          setMyStake((prev) => ({ ...prev, ...live.myStake }))
        }
        setSession((prev) => ({ ...prev, hasCreatedWallet: true }))
        sessionHydratedRef.current = true
      } catch (err) {
        console.warn('[SessionState] hydrate failed:', err?.message || err)
      }
    }
    hydrateBackendSession()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    patchSession('ui', { exploreProgress })
  }, [exploreProgress, patchSession])

  useEffect(() => {
    patchSession('ui', { nickname: myNickname, nicknames })
  }, [myNickname, nicknames, patchSession])

  useEffect(() => {
    patchSession('ui', { sessionStart })
  }, [sessionStart, patchSession])

  useEffect(() => {
    if (posAddress && posAddress.length === 42) patchSession('ui', { posAddress })
  }, [posAddress, patchSession])

  useEffect(() => {
    if (rpcUrl?.trim()) patchSession('ui', { rpcUrl: normalizeBrowserRpcUrl(rpcUrl) })
  }, [rpcUrl, patchSession])

  useEffect(() => {
    patchSession('live', { ransomContractAddress })
  }, [ransomContractAddress, patchSession])

  useEffect(() => {
    patchSession('live', { myStake: { role: myStake.role || '' } })
  }, [myStake.role, patchSession])

  // Notify when role is newly assigned
  useEffect(() => {
    const role = myStake.role || ''
    if (role && !prevRoleRef.current) {
      setRoleAssignedBanner(true)
    }
    prevRoleRef.current = role
  }, [myStake.role])

  // Extract artifacts from chat (instructor posts [ARTIFACT:...] for scenario clues)
  const artifacts = (messages || [])
    .filter(m => m.text && typeof m.text === 'string' && m.text.startsWith('[ARTIFACT:'))
    .map(m => ({ content: m.text.slice(10).replace(/\]$/, ''), timestamp: m.timestamp, sender: m.sender }))

  // Shared helper: parse messages for role assignment
  const parseRoleFromMessages = useCallback((msgList, address, validatorList) => {
    if (!SCENARIO_ROLES_ENABLED) return null; // scenario roles disabled for the active lab surface
    if (!msgList?.length || !address) return null;
    const myAddr = address.toLowerCase();
    let assignedRole = null;
    let latestTimestamp = 0;
    console.log('[Role] Parsing', msgList.length, 'messages for', myAddr.slice(0, 10) + '...');
    for (const m of msgList) {
      const text = (m?.text ?? m?.message ?? '').trim();
      if (!text || typeof text !== 'string') continue;
      // [SCENARIO:Name:Role1,Role2,...] — assign by participant index (sorted by address)
      const scenarioMatch = text.match(/\[SCENARIO:([^:]+):([^\]]+)\]/);
      if (scenarioMatch) {
        const roles = scenarioMatch[2].split(',').map(r => r.trim()).filter(Boolean);
        if (roles.length === 0) continue;
        const participants = [...(validatorList || [])].map(a => (typeof a === 'string' ? a : a?.address)?.toLowerCase?.()).filter(Boolean);
        if (!participants.includes(myAddr)) participants.push(myAddr);
        const sorted = [...new Set(participants)].sort();
        const idx = sorted.indexOf(myAddr);
        if (idx >= 0) {
          const role = roles[idx % roles.length];
          if (role && (m.timestamp || 0) >= latestTimestamp) {
            assignedRole = role;
            latestTimestamp = m.timestamp || 0;
          }
        }
      }
      // [ROLES:addr1:Role1;addr2:Role2;...] — direct assignment
      const rolesMatch = text.match(/\[ROLES:([^\]]+)\]/);
      if (rolesMatch) {
        console.log('[Role] Found ROLES message:', text.slice(0, 80) + '...');
        const pairs = rolesMatch[1].split(';');
        for (const p of pairs) {
          if (p.length < 44) { console.log('[Role] Skipping short pair:', p); continue; }
          const addr = p.slice(0, 42).toLowerCase();
          const sep = p[42];
          if (sep !== ':') { console.log('[Role] Bad separator at pos 42:', sep, 'pair:', p.slice(0, 50)); continue; }
          const role = p.slice(43).trim();
          console.log('[Role] Checking', addr.slice(0, 10), '===', myAddr.slice(0, 10), '?', addr === myAddr, 'role:', role);
          if (addr === myAddr && role && (m.timestamp || 0) >= latestTimestamp) {
            assignedRole = role;
            latestTimestamp = m.timestamp || 0;
          }
        }
      }
    }
    return assignedRole;
  }, []);

  // Parse chat for [SCENARIO:...] and [ROLES:...] — frontend-only role assignment
  useEffect(() => {
    if (!messages?.length || !wallet.address) return;
    const assignedRole = parseRoleFromMessages(messages, wallet.address, validators);
    if (assignedRole) {
      setMyStake(prev => ({ ...prev, role: assignedRole }));
      console.log('[Role] useEffect assigned:', assignedRole);
    } else {
      console.log('[Role] useEffect: no role found. messages:', messages.length, 'wallet:', wallet.address?.slice(0, 10));
    }
  }, [messages, wallet.address, validators, parseRoleFromMessages])

  // Reset entire session - clears all user data and creates fresh start
  const resetSession = async () => {
    if (!window.confirm('🔄 Reset your session?\n\nThis will:\n• Create a new wallet identity\n• Clear all progress\n• Clear chat nickname\n\nYour test ETH will be lost. Continue?')) {
      return;
    }

    try {
      await resetSessionState();
    } catch (err) {
      setStatusMsg('❌ Session reset failed: ' + (err?.message || err));
      setTimeout(() => setStatusMsg(''), 4000);
      return;
    }
    
    // Reset React state
    setTrail({ intro: false, concepts: false, explore: false });
    setExploreProgress([false, false, false]);
    setWallet({ address: null, signer: null, balance: '0', mode: null });
    setMessages([]);
    setValidators([]);
    setTxHistory([]);
    setMyStake({ 
      amount: '0', 
      reward: '0',
      slashCount: 0,
      blocksProposed: 0,
      missedAttestations: 0,
      unbondingTime: 0,
      minStakeDuration: 0,
      hasAttestedThisEpoch: false,
      unbondingStartTime: 0,
      lastProposedBlockNumber: 0,
      role: ''
    });
    setNicknames({});
    setMyNickname('');
    setWithdrawalRequested(false);
    hasAutoJoined.current = false;
    
    setSessionStart(Date.now());
    
    // Reload the page to ensure clean state
    setStatusMsg('🔄 Session reset! Reloading...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const markStageComplete = (stage) => {
    if (trail[stage]) return
    const updated = { ...trail, [stage]: true }
    saveTrail(updated)
  }

  const unlocks = {
    intro: true,
    concepts: true, // Always unlocked
    explore: true, // Always unlocked
    sim: true, // Always unlocked - Explore flows directly to Sim
    live: true, // Always unlocked - students can go straight to live network
    cli: true // Always unlocked - CLI labs
  }

  const fireProgressBeacon = (routeId) => {
    if (!routeId) return;
    const key = `eth_progress_${routeId}`;
    const now = Date.now();
    const last = progressBeaconLastRef.current[key] || 0;
    if (now - last < 5000) return;
    progressBeaconLastRef.current[key] = now;
    fetch('/api/ethereum/progress/touch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ route_id: `exercise:${routeId}` }),
      keepalive: true,
    }).catch(() => {});
  };

  const VIEW_BEACON_MAP = {
    intro: 'eth-trail-intro',
    concepts: 'eth-trail-concepts',
    explore: 'eth-trail-explore',
    sim: 'eth-sim',
    live: 'eth-live',
    tokens: 'eth-tokens',
    cli: 'eth-cli',
    diagnostics: 'eth-diagnostics',
    'beacon-lab': 'eth-beacon-lab',
    'contract-builder-lab': 'eth-contract-write',
    'tokenization-lab': 'eth-token-erc721',
    'arcade-lab': 'eth-ft-load',
  };

  useEffect(() => {
    fireProgressBeacon(VIEW_BEACON_MAP[view]);
  }, [view]);

  const requestView = (target) => {
        setView(target)
        setNavHint('')
  }

  // 1. Initialize Provider (use staticNetwork to avoid "network does not support ENS" on local/custom chains)
  useEffect(() => {
    const sanitizedUrl = (rpcUrl || "").trim()
    if (!sanitizedUrl) {
        setProvider(null)
        setNodeStatus({ connected: false, blockNumber: 0 })
        return
    }
    const resolvedUrl = resolveRpcUrl(sanitizedUrl)
    let cancelled = false
    const init = async () => {
      try {
        let chainId = 31337
        const sameOriginLabRpc = /^\/(rpc-write|rpc|rpc-proxy)(?:$|[?#])/.test(sanitizedUrl)
          || /\/labs\/ethereum_lab\/(rpc-write|rpc|rpc-proxy)(?:$|[?#])/.test(sanitizedUrl)
        if (!sameOriginLabRpc) {
          const temp = new ethers.JsonRpcProvider(resolvedUrl)
          try {
            const network = await temp.getNetwork()
            if (cancelled) return
            chainId = Number(network.chainId)
          } catch (_) {
            // RPC may not be ready; use 31337 for local Hardhat
            if (/localhost|127\.0\.0\.1|8545|\/rpc-write|\/rpc-proxy|\/rpc/.test(sanitizedUrl)) chainId = 31337
          }
        }
        if (cancelled) return
        const staticNet = ethers.Network.from(chainId)
        const newProvider = new ethers.JsonRpcProvider(resolvedUrl, staticNet, { staticNetwork: staticNet })
        setProvider(newProvider)
      } catch (e) {
        if (!cancelled) {
          console.error("Invalid RPC URL:", e)
          setProvider(null)
          setNodeStatus({ connected: false, blockNumber: 0 })
        }
      }
    }
    init()
    return () => { cancelled = true }
  }, [rpcUrl])

  // Sync RpcClient with app rpcUrl so InstructorView, faucet, etc. use same chain
  useEffect(() => {
    if (rpcUrl?.trim()) rpcClient.setRpcUrl(rpcUrl);
  }, [rpcUrl]);

  // 2. Auto-Connect Logic (Live Mode and Token Concepts need wallet for deploy/interact)
  // Skip auto-wallet if new student (by IP) must create first — no auto-EOA
  const hasLocalWallet = getWalletList().length > 0
  const mustCreateWalletFirst = !session.hasCreatedWallet && !hasLocalWallet && !session.loading

  // Owned NFTs for the "Your Assets" dashboard panel (from the shared marketplace cache; no RPC).
  const [myNftAssets, setMyNftAssets] = useState([]);
  const [myArcAsset, setMyArcAsset] = useState({ balanceWei: '0', ok: false });
  const navAssetImg = (src) => {
    if (!src || /^(data:|https?:)/.test(src)) return src;
    const path = String(src).replace(/^\/+/, '');
    const b = (import.meta.env.BASE_URL || '/');
    const base = b.endsWith('/') ? b : b + '/';
    return path.startsWith('labs/ethereum_lab/') ? base + path : src;
  };
  const formatArcAssetBalance = (wei) => {
    try {
      return `${Number(ethers.formatEther(BigInt(wei || '0'))).toLocaleString(undefined, { maximumFractionDigits: 4 })} ARC`;
    } catch (_) {
      return '0 ARC';
    }
  };
  const formatEthWalletBalance = (value) => {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return '0.0000 ETH';
    return `${n.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ETH`;
  };
  const mergeDashboardAssetConfig = useCallback((next = {}) => {
    setDashboardAssetConfig((prev) => {
      const arcadeTokenAddress = ethers.isAddress(next.arcadeTokenAddress || '') ? next.arcadeTokenAddress : prev.arcadeTokenAddress;
      const nftAddress = ethers.isAddress(next.nftAddress || '') ? next.nftAddress : prev.nftAddress;
      if (arcadeTokenAddress === prev.arcadeTokenAddress && nftAddress === prev.nftAddress) return prev;
      return { arcadeTokenAddress, nftAddress };
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadDashboardAssetConfig = async () => {
      const [runtime, statik] = await Promise.all([
        fetch(dashboardLabUrl('api/config.json'), { cache: 'no-store' }).then(dashboardSafeJson).catch(() => ({})),
        fetch(dashboardLabUrl('labs/ethereum_lab/tokenization-config.json'), { cache: 'no-store' }).then(dashboardSafeJson).catch(() => ({})),
      ]);
      if (cancelled) return;
      mergeDashboardAssetConfig({
        arcadeTokenAddress: runtime.arcadeTokenAddress || statik.arcadeTokenAddress || '',
        nftAddress: runtime.tokenizationNftAddress || statik.nftAddress || '',
      });
    };
    loadDashboardAssetConfig();
    return () => { cancelled = true; };
  }, [mergeDashboardAssetConfig]);

  useEffect(() => {
    const me = (wallet?.address || '').toLowerCase();
    if (!me) { setMyNftAssets([]); return; }
    let cancelled = false;
    const cbase = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const load = async () => {
      for (const url of [cbase + '/marketplace-state', cbase + '/lab-api/marketplace/state']) {
        try {
          const r = await fetch(url, { cache: 'no-store' });
          if (!r.ok) continue;
          const j = await r.json();
          if (!j || !j.ok) continue;
          if (!cancelled) {
            if (ethers.isAddress(j.nft || '')) mergeDashboardAssetConfig({ nftAddress: j.nft });
            const ids = (j.tokensByOwner && j.tokensByOwner[me]) || [];
            setMyNftAssets(ids.map((tid) => ({ tokenId: tid, ...(j.tokens?.[tid] || {}) })));
          }
          return;
        } catch { /* try next url */ }
      }
    };
    load();
    const iv = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [wallet?.address, mergeDashboardAssetConfig]);

  useEffect(() => {
    const me = (wallet?.address || '').toLowerCase();
    if (!me) { setMyArcAsset({ balanceWei: '0', ok: false }); return; }
    let cancelled = false;
    const cbase = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const load = async () => {
      for (const url of [cbase + '/arcade-state', cbase + '/lab-api/arcade/state']) {
        try {
          const r = await fetch(url, { cache: 'no-store' });
          if (!r.ok) continue;
          const j = await r.json();
          if (!j || !j.ok) continue;
          if (!cancelled) {
            if (ethers.isAddress(j.token || '')) mergeDashboardAssetConfig({ arcadeTokenAddress: j.token });
            setMyArcAsset({
              balanceWei: String((j.balances && j.balances[me]) || '0'),
              ok: true,
            });
          }
          return;
        } catch { /* try next url */ }
      }
      if (!cancelled) setMyArcAsset({ balanceWei: '0', ok: false });
    };
    load();
    const iv = setInterval(load, 5000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [wallet?.address, mergeDashboardAssetConfig]);

  useEffect(() => {
    if (sendAssetType !== 'nft') return;
    const stillOwned = sendNftTokenId && myNftAssets.some((n) => String(n.tokenId) === String(sendNftTokenId));
    if (!stillOwned) setSendNftTokenId(myNftAssets[0]?.tokenId ? String(myNftAssets[0].tokenId) : '');
  }, [sendAssetType, sendNftTokenId, myNftAssets]);

  const arcBalanceWei = dashboardSafeBigInt(myArcAsset.balanceWei);
  const canSendArc = myArcAsset.ok && arcBalanceWei > 0n;
  const canSendNft = myNftAssets.length > 0;
  const isSendingDashboardAsset = statusMsg.includes("Sending ETH") || statusMsg.includes("Sending ARC") || statusMsg.includes("Sending NFT");
  const openSendCardForAsset = (assetType, tokenId = '') => {
    setSendAssetType(assetType);
    if (tokenId) setSendNftTokenId(String(tokenId));
    setLivePageBlocksOpen((prev) => ({ ...prev, sendCard: true }));
    setTimeout(() => {
      document.getElementById('send-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  useEffect(() => {
    const needsAutoWallet = view === 'live' || view === 'tokens' || view === 'beacon-lab' || view === 'contract-builder-lab' || view === 'tokenization-lab' || view === 'arcade-lab' || view === 'nft-marketplace';
    if (!needsAutoWallet || !provider || wallet.mode === 'metamask') return;
    if ((view === 'tokenization-lab' || view === 'arcade-lab' || view === 'nft-marketplace') && !runtimeConfigLoaded) return;
    if (mustCreateWalletFirst) return; // Show create flow, don't auto-create

    let cancelled = false

    const hydrateGuestWallet = async () => {
        try {
        const { mode, signer } = await getGuestWallet()
            const addr = await signer.getAddress()
             const connectedSigner = signer.connect(provider)
             // Get wallet nickname from storage
             const walletInfo = getWalletInfo()
             const nickname = walletInfo?.nickname || 'My Wallet'
            if (!cancelled) {
                setWallet(prev => ({
                    ...prev,
                    address: addr,
                    signer: connectedSigner,
                    balance: prev.balance,
                    mode: mode || 'guest',
                    nickname: nickname
                }))
                // Register wallet creation with Lab API (per-IP) so future visits don't require create-first
                if (!session.hasCreatedWallet) {
                  fetch(import.meta.env.BASE_URL + 'lab-api/register-wallet', { method: 'POST' }).catch(() => {})
                  setSession(prev => ({ ...prev, hasCreatedWallet: true }))
                }
            }
        } catch (err) {
            console.error("Guest wallet init failed:", err)
        }
    }

    hydrateGuestWallet()

    const onWalletSwitched = () => hydrateGuestWallet()
    window.addEventListener('walletSwitched', onWalletSwitched)

    return () => {
        cancelled = true
        window.removeEventListener('walletSwitched', onWalletSwitched)
    }
  }, [provider, view, wallet.mode, mustCreateWalletFirst, session.hasCreatedWallet, runtimeConfigLoaded]);

  useEffect(() => {
    if (!wallet.address) {
      setWalletBalanceMeta({ status: 'idle', ageMs: null, cached: false, error: '' });
      return;
    }

    let cancelled = false;
    const activeAddress = wallet.address.toLowerCase();

    const loadWalletBalance = async () => {
      try {
        const data = await fetchSessionWalletBalance();
        if (cancelled) return;
        const returnedAddress = String(data?.address || '').toLowerCase();
        if (returnedAddress && returnedAddress !== activeAddress) return;
        if (data?.balanceEth != null) {
          setWallet(prev => {
            if (prev.address && prev.address.toLowerCase() !== activeAddress) return prev;
            return { ...prev, balance: data.balanceEth };
          });
        }
        setWalletBalanceMeta({
          status: 'ok',
          ageMs: Number.isFinite(Number(data?.ageMs)) ? Number(data.ageMs) : null,
          cached: !!data?.cached,
          error: '',
        });
      } catch (e) {
        if (cancelled) return;
        setWalletBalanceMeta({
          status: 'error',
          ageMs: null,
          cached: false,
          error: e?.message || 'Balance unavailable',
        });
      }
    };

    const refreshVisibleWalletBalance = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadWalletBalance();
    };

    loadWalletBalance();
    const interval = setInterval(refreshVisibleWalletBalance, WALLET_BALANCE_POLL_MS);
    const refreshOnFocus = () => refreshVisibleWalletBalance();
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', refreshOnFocus);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', refreshOnFocus);
    }

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', refreshOnFocus);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', refreshOnFocus);
      }
    };
  }, [wallet.address]);

  useEffect(() => {
    if (!CACHE_BACKED_NODE_STATUS_VIEWS.has(view)) return;
    let cancelled = false;
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    const urls = [base + '/chain-state', base + '/lab-api/chain/state'];

    const readCachedHead = async () => {
      for (const url of urls) {
        try {
          const r = await fetch(url, { cache: 'no-store' });
          if (!r.ok) continue;
          const j = await r.json();
          if (typeof j?.head === 'number') return j.head;
          if (Array.isArray(j?.blocks) && j.blocks.length) {
            const n = Number(j.blocks[0]?.number ?? j.blocks[j.blocks.length - 1]?.number);
            if (Number.isFinite(n)) return n;
          }
        } catch (_) {}
      }
      return null;
    };

    const tick = async () => {
      const head = await readCachedHead();
      if (cancelled) return;
      setNodeStatus(head == null
        ? { connected: false, blockNumber: 0 }
        : { connected: true, blockNumber: head });
    };

    tick();
    const interval = setInterval(tick, 4000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [view]);

  // 3. Auto-Join Class List when wallet is ready
  useEffect(() => {
    if (!LEGACY_LIVE_RPC_SYNC_ENABLED) return;
    // Reset auto-join flag when leaving live view
    if (view !== 'live') {
      hasAutoJoined.current = false;
      return;
    }
    
    // Only auto-join with valid wallet and contract
    if (!wallet.address || !wallet.signer || !posAddress || posAddress.length !== 42) return;
    // Don't re-join if already in validators list or already attempted this session
    if (validators.includes(wallet.address) || hasAutoJoined.current) return;
    
    const autoJoinClass = async () => {
      if (joiningClassRef.current) return; // Another join (manual or auto) is already in flight
      hasAutoJoined.current = true; // Mark as attempted
      console.log("[AutoJoin] Joining class as:", wallet.address);

      try {
        // Check if wallet has funds - can't join without gas
        const balance = await provider.getBalance(wallet.address);
        if (balance === 0n) {
          console.log("[AutoJoin] Wallet has no funds, skipping auto-join (user needs funds from instructor first)");
          hasAutoJoined.current = false; // Allow retry after they get funds
          return;
        }

        // Verify contract exists before trying to join
        const code = await provider.getCode(posAddress);
        if (code === '0x' || code === '0x0') {
          console.log("[AutoJoin] Contract not deployed yet, skipping auto-join");
          hasAutoJoined.current = false; // Allow retry when contract is ready
          return;
        }

        joiningClassRef.current = true;
        setStatusMsg("👋 Joining class...");
        const contract = new ethers.Contract(posAddress, PoSABI, wallet.signer);
        const tx = await contract.sendMessage("👋 Joined the class!");
        await tx.wait();
        console.log("[AutoJoin] Successfully joined class");
        setStatusMsg("✅ Joined class!");

        // Refresh data to show in classmates list
        if (LEGACY_LIVE_RPC_SYNC_ENABLED) blockchainSync.forceRefresh();

        setTimeout(() => setStatusMsg(""), 2000);
      } catch (err) {
        console.error("[AutoJoin] Failed:", err);
        // Don't show error to user - they can manually join if needed
        hasAutoJoined.current = false; // Allow retry on next attempt
      } finally {
        joiningClassRef.current = false;
      }
    };
    
    // Delay auto-join to ensure wallet is fully initialized
    const timer = setTimeout(autoJoinClass, 1500);
    return () => clearTimeout(timer);
  }, [view, wallet.address, wallet.signer, posAddress, validators]);

  // Legacy Live dashboard reads the shared chain cache. Do not poll the RPC node
  // from each student browser for balance/history/role data.
  useEffect(() => {
    if (!wallet.address || view !== 'live') return;

    let cancelled = false;
    const me = wallet.address.toLowerCase();
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

    const formatCachedWei = (value) => {
      try { return ethers.formatEther(BigInt(value ?? 0)); }
      catch (_) { return '0'; }
    };

    const loadFromChainCache = async () => {
      for (const url of [base + '/chain-state', base + '/lab-api/chain/state']) {
        try {
          const r = await fetch(url, { cache: 'no-store' });
          if (!r.ok) continue;
          const j = await r.json();
          if (!j?.ok || !Array.isArray(j.blocks)) continue;
          const history = [];
          for (const block of j.blocks) {
            for (const tx of block.transactions || []) {
              const fromAddr = tx.from?.toLowerCase?.();
              const toAddr = tx.to?.toLowerCase?.();
              if (fromAddr !== me && toAddr !== me) continue;
              history.push({
                hash: tx.hash,
                from: tx.from,
                to: tx.to || 'Contract Creation',
                value: formatCachedWei(tx.value),
                blockNumber: block.number,
                timestamp: Number(block.timestamp || 0),
                type: fromAddr === me ? 'sent' : 'received',
              });
            }
          }
          if (!cancelled) {
            setTxHistory(history.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20));
            lastSyncRef.current = Date.now();
            setLastSyncTime(Date.now());
          }
          return;
        } catch (_) {}
      }
    };

    loadFromChainCache();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadFromChainCache();
    }, 5000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [wallet.address, view])

  const createNamedWallet = async () => {
    const entered = window.prompt('Enter a nickname for your new wallet:');
    if (entered === null) return;
    const nickname = entered.trim() || 'My Wallet';
    try {
      const newWallet = await generateNewWallet(nickname);
      setNewWalletModal({ address: newWallet.address, privateKey: newWallet.privateKey });
      setStatusMsg(`✅ New wallet created: ${nickname}`);
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (e) {
      setStatusMsg('❌ Could not create wallet: ' + (e?.message || e));
      setTimeout(() => setStatusMsg(''), 4000);
    }
  };

  const switchWallet = async (id) => {
    try {
      // Persist the selection in the backend session store.
      await setActiveWallet(id);
      if (!provider) {
        // No chain connection yet: at least reflect the chosen identity in the UI.
        const info = getWalletInfo();
        if (info) setWallet(prev => ({ ...prev, address: info.address, nickname: info.nickname }));
        return;
      }
      // Rebuild the active signer directly so the UI updates without relying on the
      // walletSwitched listener (which only runs while the live/tokens effect is mounted).
      const { mode, signer } = await getGuestWallet();
      const addr = await signer.getAddress();
      const connectedSigner = signer.connect(provider);
      const info = getWalletInfo();
      setWallet(prev => ({
        ...prev,
        address: addr,
        signer: connectedSigner,
        balance: prev.balance,
        mode: mode || 'guest',
        nickname: info?.nickname || 'My Wallet'
      }));
    } catch (e) {
      console.error('Wallet switch failed:', e);
      setStatusMsg('❌ Could not switch wallet: ' + (e.reason || e.message));
      setTimeout(() => setStatusMsg(''), 4000);
    }
  };

  const grantTopOffAfterMining = useCallback(async ({ preserveWinMessage = false } = {}) => {
    if (!wallet.address) {
      setStatusMsg('❌ Create a wallet first.');
      setTimeout(() => setStatusMsg(''), 3000);
      return;
    }
    if (statusMsg.includes('Topping off') || statusMsg.includes('Mining reward')) return;

    try {
      if (!preserveWinMessage) {
        setStatusMsg('Mining reward accepted. Topping off wallet...');
      }
      // Add a fixed grant from the class bank through lab-api. The server handles
      // balance/nonce/receipt reads so browsers do not use read-capable RPC.
      const amountEth = '100';
      const receipt = await rpcClient.sendFromBank(wallet.address, amountEth);
      if (receipt?.balanceEth) {
        setWallet(prev => ({ ...prev, balance: receipt.balanceEth }));
        setWalletBalanceMeta({ status: 'ok', ageMs: 0, cached: false, error: '' });
      }
      setTxHistory(prev => [{
        hash: receipt?.hash || receipt?.transactionHash || '',
        from: receipt?.bankAddress || rpcClient.getBankSigner()?.address,
        to: wallet.address,
        value: receipt?.amountEth || amountEth,
        blockNumber: receipt?.blockNumber,
        timestamp: Math.floor(Date.now() / 1000),
        type: 'received',
        label: 'Wallet top-off'
      }, ...prev].slice(0, 20));
      if (receipt?.pending) {
        setStatusMsg(`⏳ Top-off submitted (${receipt?.amountEth || amountEth} ETH). Balance will update shortly.`);
        setTimeout(() => setStatusMsg(''), 5000);
        return;
      }
      const balanceLabel = receipt?.balanceEth ? ` — balance now ${parseFloat(receipt.balanceEth).toFixed(4)} ETH` : '';
      setStatusMsg(`✅ Added ${receipt?.amountEth || amountEth} ETH${balanceLabel}.`);
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (e) {
      console.warn('[TopOff] failed:', e?.shortMessage || e?.message || e);
      const retryHint = e?.retryable === false ? '' : ' Please try again in a moment.';
      setStatusMsg(`❌ Top-off failed: ${e?.message || 'class faucet is busy.'}${retryHint}`);
      setTimeout(() => setStatusMsg(''), 5000);
    }
  }, [statusMsg, wallet.address]);

  const topOffWallet = () => {
    if (!wallet.address) {
      setStatusMsg('❌ Create a wallet first.');
      setTimeout(() => setStatusMsg(''), 3000);
      return;
    }
    if (statusMsg.includes('Topping off') || statusMsg.includes('Mining reward')) return;
    setTopOffMiningAwarding(false);
    topOffAwardingRef.current = false;
    setTopOffMiningOpen(true);
    setStatusMsg('⛏️ Win the mining race to unlock a 100 ETH top-off.');
  };

  const closeTopOffMining = () => {
    if (topOffAwardingRef.current) return;
    setTopOffMiningOpen(false);
    setTopOffMiningAwarding(false);
    setStatusMsg(prev => prev.includes('Win the mining race') ? '' : prev);
  };

  useEffect(() => {
    const handleMiningWin = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'pow-mining-topoff-win' || event.data?.source !== 'ethereum_lab') return;
      if (topOffAwardingRef.current) return;
      topOffAwardingRef.current = true;
      setTopOffMiningAwarding(true);
      setStatusMsg('🏆 You won! Awarding 100 ETH now...');
      const startedAt = Date.now();
      Promise.resolve(grantTopOffAfterMining({ preserveWinMessage: true })).finally(() => {
        const remainingMs = Math.max(2000 - (Date.now() - startedAt), 0);
        setTimeout(() => {
          setTopOffMiningAwarding(false);
          topOffAwardingRef.current = false;
          setTopOffMiningOpen(false);
        }, remainingMs);
      });
    };
    window.addEventListener('message', handleMiningWin);
    return () => window.removeEventListener('message', handleMiningWin);
  }, [grantTopOffAfterMining]);

  // Helpers

  const refreshDashboardAssetCache = async (assetType, txHash = '') => {
      const cbase = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
      const targets = assetType === 'arc'
        ? [cbase + '/arcade-state', cbase + '/lab-api/arcade/state']
        : [cbase + '/marketplace-state', cbase + '/lab-api/marketplace/state'];
      for (const url of targets) {
        try {
          const response = await fetch(url, {
            method: assetType === 'arc' ? 'POST' : 'GET',
            headers: assetType === 'arc' ? { 'Content-Type': 'application/json' } : undefined,
            body: assetType === 'arc' ? JSON.stringify({ area: 'dashboard-asset-transfer', txHash }) : undefined,
            cache: 'no-store',
          });
          if (response.ok) return;
        } catch (_) {
          // Try the alternate route.
        }
      }
  }

  const sendAssetToPeer = async () => {
      if(!ethers.isAddress(recipient)) return setStatusMsg("Invalid Recipient Address")
      if(!wallet.signer) return setStatusMsg("Wallet not ready")
      if(isSendingDashboardAsset) return setStatusMsg("Transaction already in progress...")

      try {
          let tx
          let receipt
          let historyEntry
          const now = Math.floor(Date.now() / 1000)

          if (sendAssetType === 'arc') {
              if (!sendAmount) return setStatusMsg("Enter ARC amount")
              if (!ethers.isAddress(dashboardAssetConfig.arcadeTokenAddress)) return setStatusMsg("ARC token contract is not configured yet")
              if (!/^[1-9]\d*$/.test(String(sendAmount).trim())) return setStatusMsg("ARC transfers must be whole tokens: 1, 2, 3, ...")
              const amountWei = ethers.parseEther(sendAmount)
              if (amountWei <= 0n) return setStatusMsg("Enter an ARC amount greater than 0")
              if (amountWei > arcBalanceWei) return setStatusMsg("Not enough ARC in your wallet")

              setStatusMsg("Sending ARC...")
              const token = new ethers.Contract(dashboardAssetConfig.arcadeTokenAddress, ArcadeTokenArtifact.abi, wallet.signer)
              tx = await token.transfer(recipient, amountWei, DASHBOARD_WRITE_TX_OPTIONS.arc)
              receipt = await waitForDashboardTransactionReceipt(tx, wallet.signer.provider || provider)
              historyEntry = {
                hash: tx.hash,
                from: wallet.address,
                to: recipient,
                value: sendAmount,
                assetSymbol: 'ARC',
                assetType: 'erc20',
                blockNumber: dashboardReceiptBlockNumber(receipt),
                timestamp: now,
                type: 'sent',
                label: 'Sent ARC',
              }
              setMyArcAsset((prev) => {
                const next = dashboardSafeBigInt(prev.balanceWei) - amountWei
                return { ...prev, balanceWei: next > 0n ? next.toString() : '0' }
              })
              await refreshDashboardAssetCache('arc', tx.hash)
              setStatusMsg(`Sent ${sendAmount} ARC to ${dashboardShort(recipient)}!`)
          } else if (sendAssetType === 'nft') {
              if (!sendNftTokenId) return setStatusMsg("Choose an NFT to send")
              if (!ethers.isAddress(dashboardAssetConfig.nftAddress)) return setStatusMsg("NFT contract is not configured yet")
              const owned = myNftAssets.some((n) => String(n.tokenId) === String(sendNftTokenId))
              if (!owned) return setStatusMsg("That NFT is not in your cached asset list")

              setStatusMsg("Sending NFT...")
              const nft = new ethers.Contract(dashboardAssetConfig.nftAddress, LabNFTArtifact.abi, wallet.signer)
              tx = await nft.transferFrom(wallet.address, recipient, sendNftTokenId, DASHBOARD_WRITE_TX_OPTIONS.nft)
              receipt = await waitForDashboardTransactionReceipt(tx, wallet.signer.provider || provider)
              historyEntry = {
                hash: tx.hash,
                from: wallet.address,
                to: recipient,
                value: '1',
                assetSymbol: 'NFT',
                assetType: 'erc721',
                tokenId: sendNftTokenId,
                blockNumber: dashboardReceiptBlockNumber(receipt),
                timestamp: now,
                type: 'sent',
                label: `Sent NFT #${sendNftTokenId}`,
              }
              setMyNftAssets((prev) => prev.filter((n) => String(n.tokenId) !== String(sendNftTokenId)))
              await refreshDashboardAssetCache('nft', tx.hash)
              setStatusMsg(`Sent NFT #${sendNftTokenId} to ${dashboardShort(recipient)}!`)
          } else {
              if(!sendAmount) return setStatusMsg("Enter amount")
              const amountWei = ethers.parseEther(sendAmount)
              if (amountWei <= 0n) return setStatusMsg("Enter an ETH amount greater than 0")

              setStatusMsg("Sending ETH...")
              tx = await wallet.signer.sendTransaction({
                  to: recipient,
                  value: amountWei,
                  ...DASHBOARD_WRITE_TX_OPTIONS.eth,
              })
              receipt = await waitForDashboardTransactionReceipt(tx, wallet.signer.provider || provider)
              historyEntry = {
                hash: tx.hash,
                from: wallet.address,
                to: recipient,
                value: sendAmount,
                assetSymbol: 'ETH',
                assetType: 'eth',
                blockNumber: dashboardReceiptBlockNumber(receipt),
                timestamp: now,
                type: 'sent',
                label: 'Sent ETH',
              }
              setStatusMsg(`Sent ${sendAmount} ETH to ${dashboardShort(recipient)}!`)
          }

          if (historyEntry) setTxHistory(prev => [historyEntry, ...prev].slice(0, 20))
          setSendAmount("")
          setRecipient("")
          setTimeout(() => setStatusMsg(""), 3000)
      } catch (e) {
          setStatusMsg("Transfer Failed: " + dashboardErrorMessage(e))
          setTimeout(() => setStatusMsg(""), 5000)
      }
  }
  
  // Data Sync
  const syncBlockchainData = async () => {
      if (!posAddress || posAddress.length !== 42 || !provider) return
      setIsSyncing(true)
      try {
        // Verify contract exists before querying
        const code = await provider.getCode(posAddress)
        if (code === '0x' || code === '0x0') {
          setIsSyncing(false)
          return // Contract not deployed yet
        }
        
        const contract = new ethers.Contract(posAddress, PoSABI, provider)
        
        // Chat
        const chatEvents = await contract.queryFilter("NewMessage", 0)
        const formattedChat = chatEvents.map(e => {
          const a = e.args || []
          return {
            sender: a[0] ?? a.sender,
            text: a[1] ?? a.message ?? '',
            timestamp: Number(a[2] ?? a.timestamp ?? 0)
          }
        }).sort((a,b) => a.timestamp - b.timestamp)
        setMessages(formattedChat)

        // Inline role parsing right after fetching messages
        if (wallet.address && formattedChat.length > 0) {
          const role = parseRoleFromMessages(formattedChat, wallet.address, validators);
          if (role) {
            console.log('[syncBlockchainData] Inline role found:', role);
            setMyStake(prev => ({ ...prev, role }));
          }
        }

        // Roster Logic: Anyone who Staked OR Chatted is a "Participant"
        const stakeEvents = await contract.queryFilter("Staked", 0)
        const msgEvents = await contract.queryFilter("NewMessage", 0)
        const allAddrs = [
          ...stakeEvents.map(e => (e.args && (e.args[0] ?? e.args.validator))),
          ...msgEvents.map(e => (e.args && (e.args[0] ?? e.args.sender)))
        ].filter(Boolean)
        const uniqueAddrs = [...new Set(allAddrs)]
        
        // Only update if we have addresses (don't replace with empty)
        if (uniqueAddrs.length > 0) {
          setValidators(prev => {
            const combined = [...new Set([...prev, ...uniqueAddrs])];
            return combined;
          });
        }
        
        // Get actual validator count from contract (only those currently staking)
        const validatorCount = await contract.getValidatorCount()
        setActualValidatorCount(Number(validatorCount))

      } catch (e) {
        console.warn("syncBlockchainData error:", e);
      }
      setIsSyncing(false)
  }

   // Send chat message - accepts optional direct message to avoid state race conditions
   const sendChatMessage = async (directMessage = null) => {
      // If directMessage is an Event object (from onClick), ignore it and use chatInput
      const messageToSend = (typeof directMessage === 'string') ? directMessage : chatInput;
      if(!messageToSend?.trim()) {
          console.log("[Chat] No message to send");
          return false;
      }
      if(!posAddress || posAddress.length !== 42) {
          setStatusMsg("❌ Invalid Contract Address");
          return false;
      }
      if(!rpcUrl) {
          setStatusMsg("❌ No RPC URL configured");
          return false;
      }
      if(!wallet.signer) {
          setStatusMsg("❌ Wallet not ready. Please wait...");
          return false;
      }
      
      try {
          setStatusMsg("📤 Sending message...");
          
          // Use the user's wallet to send the message (so sender is correctly recorded)
          const contract = new ethers.Contract(posAddress, PoSABI, wallet.signer);
          
          console.log("[Chat] Sending as:", wallet.address, "Message:", messageToSend);
          const tx = await contract.sendMessage(messageToSend);
          
          // Clear input if we used the chatInput state (not a direct string message)
          if (typeof directMessage !== 'string') {
              setChatInput("");
          }
          
          setStatusMsg("⏳ Confirming...");
          await tx.wait();
          
          console.log("[Chat] Message confirmed");
          setStatusMsg("✅ Message sent!");
          
          const sender = wallet.address;
          if (sender) {
              const lower = sender.toLowerCase();
              const nickMatch = messageToSend.match?.(/\[NICK:([^\]]+)\]/);
              if (nickMatch) {
                  setNicknames(prev => ({ ...prev, [lower]: nickMatch[1].trim() }));
              }
              setValidators(prev => [...new Set([...prev, sender])]);
              setMessages(prev => [
                  ...prev,
                  { sender, text: messageToSend, timestamp: Math.floor(Date.now() / 1000) },
              ]);
          }
          
          setTimeout(() => setStatusMsg(""), 2000);
          return true;
          
      } catch (err) { 
          console.error("[Chat] Error:", err);
          const reason = err.reason || err.message || "Unknown error";
          setStatusMsg("❌ Chat failed: " + reason);
          return false;
      }
  }

  // "I am Here" Button - joins the class by sending a message
  const broadcastPresence = async () => {
      // Already joined? Nothing to do — avoids a duplicate tx (and a nonce clash).
      if (wallet.address && validators.includes(wallet.address)) {
          setStatusMsg("✅ You're already in the class!");
          setTimeout(() => setStatusMsg(""), 2000);
          return;
      }
      // Don't race the auto-join (or a previous click): only one join tx in flight.
      if (joiningClassRef.current) return;
      joiningClassRef.current = true;
      hasAutoJoined.current = true; // Suppress the auto-join effect; this click covers it
      try {
          // Pass message directly to avoid React state race condition
          const nickname = myNickname ? ` [NICK:${myNickname}]` : "";
          const success = await sendChatMessage(`👋 Joined the class!${nickname}`);
          if (success) {
              setStatusMsg("✅ Joined class!");
              setTimeout(() => setStatusMsg(""), 2000);
          } else {
              hasAutoJoined.current = false; // Let auto-join retry if the manual send failed
          }
      } finally {
          joiningClassRef.current = false;
      }
  }
  
  // Set nickname locally; Join Class includes it in the single on-chain join message.
  const saveNickname = async (newNickname) => {
    const trimmed = newNickname.trim().slice(0, 20); // Max 20 chars
    if (!trimmed) return;
    
    setMyNickname(trimmed);
    setEditingNickname(false);
    
    // Also save to local nicknames map for own address
    if (wallet.address) {
      setNicknames(prev => {
        const updated = { ...prev, [wallet.address.toLowerCase()]: trimmed };
        return updated;
      });
    }
    
    setStatusMsg(`✅ Nickname "${trimmed}" saved`);
    setTimeout(() => setStatusMsg(""), 2000);
  };
  
  // Helper to get display name for an address
  const getDisplayName = (address) => {
    if (!address) return "Unknown";
    const lowerAddr = address.toLowerCase();
    const nickname = nicknames[lowerAddr];
    const shortAddr = `${address.slice(0,6)}...${address.slice(-4)}`;
    return nickname ? `${nickname} (${shortAddr})` : shortAddr;
  };

  const copyAddress = async (addr) => {
      const ok = await copyToClipboard(addr);
      setStatusMsg(ok ? `Copied ${addr.slice(0,6)}...` : 'Copy failed — try selecting the address manually');
  }

  const getSessionAge = () => {
      const minutes = Math.floor((Date.now() - sessionStart) / 60000)
      return minutes
  }
  
  // Refresh sync indicator every second
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    if (view === 'live') {
      const timer = setInterval(() => forceUpdate(n => n + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [view]);

  // Enhanced blockchain sync using centralized service
  useEffect(() => {
    if (LEGACY_LIVE_RPC_SYNC_ENABLED && view === 'live' && posAddress.length === 42 && provider) {
      // Initialize the sync service
      blockchainSync.init(provider, posAddress);
      
      // Subscribe to updates from centralized sync
      const unsubscribe = blockchainSync.subscribe((data) => {
        if (data.error) {
          console.warn('[App] Sync error:', data.error);
          return;
        }
        
        // Update messages (only if we have messages)
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
          
          // Inline role parsing — don't wait for useEffect
          if (wallet.address) {
            const role = parseRoleFromMessages(data.messages, wallet.address, data.validators || []);
            if (role) {
              console.log('[App] Subscriber: inline role =', role);
              setMyStake(prev => ({ ...prev, role }));
            }
          }
          
          // Parse messages for nickname announcements (format: [NICK:NickName])
          const newNicknames = {};
          data.messages.forEach(msg => {
            const text = msg?.text ?? msg?.message ?? '';
            const nickMatch = text.match?.(/\[NICK:([^\]]+)\]/);
            if (nickMatch) {
              newNicknames[(msg.sender || '').toLowerCase()] = nickMatch[1].trim();
            }
          });
          if (Object.keys(newNicknames).length > 0) {
            setNicknames(prev => {
              const merged = { ...prev, ...newNicknames };
              return merged;
            });
          }
        }
        
        // Update validators list (merge with existing, don't replace with empty)
        if (data.validators && data.validators.length > 0) {
          setValidators(prev => {
            const combined = [...new Set([...prev, ...data.validators])];
            return combined;
          });
        }
        
        // Update network stats (skip on Live - staking is in Beacon Lab)
        if (data.network && view !== 'live') {
          setCurrentEpoch(data.network.currentEpoch);
          setTimeUntilNextEpoch(data.network.timeUntilNextEpoch);
          setCurrentAPY(data.network.currentAPY);
          setActualValidatorCount(data.network.validatorCount || 0);
        }
        
        console.log('[App] Sync update - Block:', data.blockNumber, 'Validators:', data.validators?.length || 0);
      });
      
      return () => {
        unsubscribe();
      };
    }
  }, [posAddress, provider, view])


  // Compute current mode from view
  const currentMode = ['intro', 'concepts', 'explore', 'sim', 'tokens'].includes(view) 
    ? 'learning' 
    : ['live', 'diagnostics', 'beacon-lab', 'contract-builder-lab', 'tokenization-lab', 'arcade-lab', 'nft-marketplace', 'forensics-lab'].includes(view)
      ? 'live' 
      : view === 'cli' 
        ? 'cli' 
        : 'instructor';
  const appBasePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
  // This asset intentionally lives under public/labs/ethereum_lab. In deployed
  // lane mode, nginx strips the first /labs/ethereum_lab prefix before proxying
  // to the student container, so the URL must include the public asset prefix.
  const topOffMiningUrl = `${appBasePath}/labs/ethereum_lab/pow-mining-topoff/index.html?mode=topoff&v=20260605-topoff-10hs`;

  const topOffMiningModal = topOffMiningOpen ? (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(2,6,23,0.88)',
        zIndex: 10002,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem'
      }}
      onClick={topOffMiningAwarding ? undefined : closeTopOffMining}
    >
      <div
        style={{
          width: 'min(1120px, 96vw)',
          height: 'min(780px, 92vh)',
          background: '#0f172a',
          borderRadius: '1rem',
          border: '1px solid rgba(45,212,191,0.45)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.85rem 1rem',
          borderBottom: '1px solid rgba(148,163,184,0.22)',
          background: 'linear-gradient(135deg, rgba(20,184,166,0.18), rgba(15,23,42,0.92))'
        }}>
          <div>
            <div style={{ color: '#f8fafc', fontWeight: 900, fontSize: '1rem' }}>Mine to top off</div>
            <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Win one Level 1 race against 6 robot miners at 10H/s to receive 100 ETH.</div>
          </div>
          <button
            onClick={closeTopOffMining}
            disabled={topOffMiningAwarding}
            style={{
              width: '2rem',
              height: '2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              borderRadius: '999px',
              border: '1px solid rgba(148,163,184,0.35)',
              background: 'rgba(15,23,42,0.9)',
              color: '#e2e8f0',
              cursor: topOffMiningAwarding ? 'not-allowed' : 'pointer',
              fontWeight: 900,
              fontSize: '1rem',
              lineHeight: 1,
              opacity: topOffMiningAwarding ? 0.5 : 1
            }}
            aria-label="Close mining challenge"
          >
            X
          </button>
        </div>
        <iframe
          title="Proof-of-work top-off mining challenge"
          src={topOffMiningUrl}
          sandbox="allow-scripts allow-same-origin"
          style={{
            border: 0,
            width: '100%',
            flex: 1,
            background: '#0e1117'
          }}
        />
        {topOffMiningAwarding && (
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            background: 'radial-gradient(circle at 50% 20%, rgba(34,197,94,0.22), rgba(2,6,23,0.94) 62%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{
              maxWidth: '460px',
              padding: '1.5rem',
              borderRadius: '1rem',
              border: '1px solid rgba(34,197,94,0.45)',
              background: 'rgba(15,23,42,0.92)',
              boxShadow: '0 18px 60px rgba(0,0,0,0.45)'
            }}>
              <div style={{ fontSize: '2.35rem', marginBottom: '0.65rem' }}>🏆</div>
              <div style={{ color: '#f8fafc', fontWeight: 900, fontSize: '1.45rem' }}>You won!</div>
              <div style={{ color: '#86efac', fontWeight: 800, marginTop: '0.45rem' }}>Awarding 100 ETH now...</div>
              <div style={{ color: '#94a3b8', marginTop: '0.45rem', lineHeight: 1.45 }}>The top-off request has started. This window will close automatically.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="app-layout">
        {/* NAVIGATION SIDEBAR */}
        <aside className="nav-sidebar">
            <h1>Ethereum Trainer</h1>
            <button
                type="button"
                className="theme-toggle"
                onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')}
                title="Switch between the light workshop theme and square-corner dark theme"
            >
                Theme: {theme === 'dark' ? 'Dark' : 'Light'}
            </button>
            
            {/* ============= MODE SWITCHER (TOP-LEVEL TABS) ============= */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: isInstructor ? '1fr 1fr' : '1fr',
                gap: '8px',
                marginBottom: '1.5rem',
                background: 'rgba(0,0,0,0.3)',
                padding: '8px',
                borderRadius: '12px'
            }}>
                <button 
                    onClick={() => { setView('live'); }}
                    style={{
                        padding: '12px 8px',
                        background: currentMode === 'live' ? 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' : 'transparent',
                        border: currentMode === 'live' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: currentMode === 'live' ? 'white' : '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: currentMode === 'live' ? 'bold' : 'normal',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s'
                    }}
                >
                    <span style={{fontSize: '1.2rem'}}>🌐</span>
                    Dashboard
                </button>
                {isInstructor && (
                    <button 
                        onClick={() => { setView('instructor'); }}
                        style={{
                            padding: '12px 8px',
                            background: currentMode === 'instructor' ? 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)' : 'transparent',
                            border: currentMode === 'instructor' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: currentMode === 'instructor' ? 'white' : '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: currentMode === 'instructor' ? 'bold' : 'normal',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <span style={{fontSize: '1.2rem'}}>🎓</span>
                        Instructor
                    </button>
                )}
            </div>
            
            {/* ============= LEARNING MODE SIDEBAR ============= */}
            {currentMode === 'learning' && (
                <nav>
                    <div style={{
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        marginBottom: '0.75rem',
                        paddingLeft: '0.5rem'
                    }}>
                        Learning Path
                    </div>
                    <div className="learning-roadmap">
                        <button className={`roadmap-step ${view === 'intro' ? 'active' : ''} ${trail.intro ? 'done' : ''}`} onClick={() => requestView('intro')}>
                            <span>1</span> Orientation
                        </button>
                        <button className={`roadmap-step ${view === 'concepts' ? 'active' : ''} ${trail.concepts ? 'done' : ''} ${!unlocks.concepts ? 'locked' : ''}`} onClick={() => requestView('concepts')}>
                            <span>2</span> Basics
                        </button>
                        <button className={`roadmap-step ${view === 'explore' ? 'active' : ''} ${trail.explore ? 'done' : ''} ${!unlocks.explore ? 'locked' : ''}`} onClick={() => requestView('explore')}>
                            <span>3</span> Explore
                        </button>
                        <button className={`roadmap-step ${view === 'sim' ? 'active' : ''} ${!unlocks.sim ? 'locked' : ''}`} onClick={() => requestView('sim')}>
                            <span>4</span> Test Your Knowledge
                        </button>
                        <button className={`roadmap-step ${view === 'tokens' ? 'active' : ''}`} onClick={() => setView('tokens')}>
                            <span>5</span> Token Concepts (FT vs NFT)
                        </button>
                    </div>
                    {navHint && <p className="nav-hint">{navHint}</p>}
                    
                    <div style={{
                        marginTop: '1.5rem',
                        padding: '1rem',
                        background: 'rgba(16,185,129,0.1)',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(16,185,129,0.3)'
                    }}>
                        <div style={{fontSize: '0.8rem', color: '#6ee7b7', marginBottom: '0.5rem'}}>
                            Ready for hands-on?
                        </div>
                        <button 
                            onClick={() => setView('live')}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                                border: 'none',
                                borderRadius: '0.5rem',
                                color: 'white',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            Go to Live Network →
                        </button>
                    </div>
                </nav>
            )}
            
            {/* ============= LIVE NETWORK MODE SIDEBAR ============= */}
            {currentMode === 'live' && (
                <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                    <div style={{
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        marginBottom: '0.75rem',
                        paddingLeft: '0.5rem'
                    }}>
                        Live Network
                    </div>
                    
                    {/* Connection Status Mini */}
                    <div style={{
                        padding: '0.75rem',
                        background: nodeStatus.connected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        borderRadius: '0.5rem',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: nodeStatus.connected ? '#10b981' : '#ef4444',
                            animation: nodeStatus.connected ? 'pulse 2s infinite' : 'none'
                        }}></div>
                        <span style={{
                            fontSize: '0.8rem',
                            color: nodeStatus.connected ? '#34d399' : '#fca5a5',
                            fontWeight: 'bold'
                        }}>
                            {nodeStatus.connected ? `Block #${nodeStatus.blockNumber}` : 'Disconnected'}
                        </span>
                    </div>
                    
                    {/* Account Switcher */}
                    <div style={{
                        padding: '0.75rem',
                        background: 'rgba(59, 130, 246, 0.15)',
                        borderRadius: '0.5rem',
                        marginBottom: '1rem',
                        border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}>
                        <div style={{fontSize: '0.75rem', color: '#60a5fa', marginBottom: '0.5rem'}}>
                            👤 Your Account
                        </div>
                        <div style={{fontSize: '0.8rem', color: '#f1f5f9', marginBottom: '0.5rem'}}>
                            {(() => {
                                const wallets = getWalletList();
                                const activeInfo = getWalletInfo();
                                if (wallets.length === 0) return <span style={{fontFamily: 'monospace', color: '#64748b'}}>No wallet</span>;
                                return (
                                    <select
                                        value={wallet?.address || activeInfo?.address || ''}
                                        onChange={(e) => {
                                            const w = wallets.find(x => x.address === e.target.value);
                                            if (w) switchWallet(w.id);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '0.35rem',
                                            background: 'rgba(0,0,0,0.3)',
                                            border: '1px solid rgba(59, 130, 246, 0.4)',
                                            borderRadius: '0.25rem',
                                            color: '#f1f5f9',
                                            fontSize: '0.8rem',
                                            fontFamily: 'monospace'
                                        }}
                                    >
                                        {wallets.map((w) => (
                                            <option key={w.id} value={w.address}>
                                                {w.nickname} ({w.address.slice(0,6)}...{w.address.slice(-4)}) {w.address === wallet?.address ? '● Active' : ''}
                                            </option>
                                        ))}
                                    </select>
                                );
                            })()}
                        </div>
                        <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                            <button
                                onClick={() => wallet.address && setAccountModal({ address: wallet.address, nickname: wallet.nickname })}
                                disabled={!wallet.address}
                                style={{
                                    flex: 1,
                                    padding: '0.5rem',
                                    background: wallet.address ? 'rgba(59, 130, 246, 0.2)' : 'rgba(71, 85, 105, 0.25)',
                                    border: '1px solid rgba(59, 130, 246, 0.4)',
                                    borderRadius: '0.35rem',
                                    color: wallet.address ? '#93c5fd' : '#64748b',
                                    cursor: wallet.address ? 'pointer' : 'not-allowed',
                                    fontSize: '0.75rem',
                                    fontWeight: '600'
                                }}
                            >
                                📋 Copy
                            </button>
                            <button
                                onClick={topOffWallet}
                                disabled={!wallet.address || !provider || statusMsg.includes('Topping off') || statusMsg.includes('Mining reward')}
                                style={{
                                    flex: 1,
                                    padding: '0.5rem',
                                    background: (!wallet.address || !provider) ? 'rgba(71, 85, 105, 0.25)' : 'rgba(34, 197, 94, 0.2)',
                                    border: '1px solid rgba(34, 197, 94, 0.4)',
                                    borderRadius: '0.35rem',
                                    color: (!wallet.address || !provider) ? '#64748b' : '#86efac',
                                    cursor: (!wallet.address || !provider) ? 'not-allowed' : 'pointer',
                                    fontSize: '0.75rem',
                                    fontWeight: '600'
                                }}
                            >
                                💰 Top off
                            </button>
                            <button
                                onClick={createNamedWallet}
                                style={{
                                    flex: 1,
                                    padding: '0.5rem',
                                    background: 'rgba(59, 130, 246, 0.2)',
                                    border: '1px solid rgba(59, 130, 246, 0.4)',
                                    borderRadius: '0.35rem',
                                    color: '#93c5fd',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    fontWeight: '600'
                                }}
                            >
                                🔑 New
                            </button>
                        </div>
                        <div style={{
                            marginTop: '0.75rem',
                            padding: '0.65rem 0.75rem',
                            background: 'rgba(15, 23, 42, 0.45)',
                            border: '1px solid rgba(148, 163, 184, 0.22)',
                            borderRadius: '0.5rem'
                        }}>
                            <div style={{fontSize: '0.68rem', color: '#93c5fd', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em'}}>
                                Live ETH balance
                            </div>
                            <div style={{fontSize: '1rem', color: '#f8fafc', fontWeight: '700', fontVariantNumeric: 'tabular-nums'}}>
                                {wallet.address ? formatEthWalletBalance(wallet.balance) : 'No wallet'}
                            </div>
                        </div>
                    </div>

                    {/* Diagnostics quick access */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <button
                            onClick={() => setView('diagnostics')}
                            disabled={view === 'diagnostics'}
                            style={{
                                flex: 1,
                                padding: '0.6rem',
                                borderRadius: '0.5rem',
                                border: '1px solid rgba(59,130,246,0.35)',
                                background: view === 'diagnostics' ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.12)',
                                color: '#bfdbfe',
                                fontWeight: 'bold',
                                cursor: view === 'diagnostics' ? 'not-allowed' : 'pointer',
                                fontSize: '0.8rem'
                            }}
                            title="Run safe connectivity checks"
                        >
                            🧪 Diagnostics
                        </button>
                        {view !== 'live' && (
                            <button
                                onClick={() => setView('live')}
                                style={{
                                    padding: '0.6rem 0.7rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    background: 'rgba(0,0,0,0.2)',
                                    color: '#e2e8f0',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem'
                                }}
                                title="Back to Live Network"
                            >
                                ↩ Live
                            </button>
                        )}
                    </div>

                    {/* Labs Section */}
                    <div style={{
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        marginBottom: '0.5rem',
                        paddingLeft: '0.5rem'
                    }}>
                        Hands-On Labs
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                        <button
                            onClick={() => setView('contract-builder-lab')}
                            style={{
                                width: '100%',
                                padding: '0.7rem',
                                background: view === 'contract-builder-lab' ? 'rgba(14,165,233,0.3)' : 'rgba(14,165,233,0.12)',
                                border: view === 'contract-builder-lab' ? '1px solid rgba(14,165,233,0.6)' : '1px solid rgba(14,165,233,0.3)',
                                borderRadius: '0.5rem',
                                color: '#7dd3fc',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: view === 'contract-builder-lab' ? 'bold' : 'normal',
                                textAlign: 'left'
                            }}
                        >
                            🏗 Smart Contract Lab
                        </button>
                        <button
                            onClick={() => setView('beacon-lab')}
                            style={{
                                width: '100%',
                                padding: '0.7rem',
                                background: view === 'beacon-lab' ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.12)',
                                border: view === 'beacon-lab' ? '1px solid rgba(139,92,246,0.6)' : '1px solid rgba(139,92,246,0.3)',
                                borderRadius: '0.5rem',
                                color: '#c4b5fd',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: view === 'beacon-lab' ? 'bold' : 'normal',
                                textAlign: 'left'
                            }}
                        >
                            ⛓ Beacon Chain Lab
                        </button>
                        {LAB_ENABLED['tokenization-lab'] && (
                        <button
                            onClick={() => setView('tokenization-lab')}
                            style={{
                                width: '100%',
                                padding: '0.7rem',
                                background: view === 'tokenization-lab' ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.12)',
                                border: view === 'tokenization-lab' ? '1px solid rgba(245,158,11,0.6)' : '1px solid rgba(245,158,11,0.3)',
                                borderRadius: '0.5rem',
                                color: '#fcd34d',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: view === 'tokenization-lab' ? 'bold' : 'normal',
                                textAlign: 'left'
                            }}
                        >
                            🪙 Tokenization Lab
                        </button>
                        )}
                        {LAB_ENABLED['arcade-lab'] && (
                        <button
                            onClick={() => setView('arcade-lab')}
                            style={{
                                width: '100%',
                                padding: '0.7rem',
                                background: view === 'arcade-lab' ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.12)',
                                border: view === 'arcade-lab' ? '1px solid rgba(34,197,94,0.6)' : '1px solid rgba(34,197,94,0.3)',
                                borderRadius: '0.5rem',
                                color: '#86efac',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: view === 'arcade-lab' ? 'bold' : 'normal',
                                textAlign: 'left'
                            }}
                        >
                            🕹 FT Arcade Lab
                        </button>
                        )}
                        {LAB_ENABLED['nft-marketplace'] && (
                        <button
                            onClick={() => setView('nft-marketplace')}
                            style={{
                                width: '100%',
                                padding: '0.7rem',
                                background: view === 'nft-marketplace' ? 'rgba(168,85,247,0.3)' : 'rgba(168,85,247,0.12)',
                                border: view === 'nft-marketplace' ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(168,85,247,0.3)',
                                borderRadius: '0.5rem',
                                color: '#d8b4fe',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: view === 'nft-marketplace' ? 'bold' : 'normal',
                                textAlign: 'left'
                            }}
                        >
                            🛒 NFT Marketplace
                        </button>
                        )}
                        {LAB_ENABLED['forensics-lab'] && (
                        <button
                            onClick={() => setView('forensics-lab')}
                            style={{
                                width: '100%',
                                padding: '0.7rem',
                                background: view === 'forensics-lab' ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.12)',
                                border: view === 'forensics-lab' ? '1px solid rgba(34,197,94,0.6)' : '1px solid rgba(34,197,94,0.3)',
                                borderRadius: '0.5rem',
                                color: '#86efac',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: view === 'forensics-lab' ? 'bold' : 'normal',
                                textAlign: 'left'
                            }}
                        >
                            🔎 Forensics Lab
                        </button>
                        )}
                    </div>

                    {/* Classmates Roster */}
                    <div className="roster-panel" style={{flex: 1}}>
                        <h3>👥 Classmates ({validators.filter(v => v && typeof v === 'string').length})</h3>
                        <p className="roster-hint">Click to copy/send</p>
                        
                        {/* Your Nickname Section */}
                        {wallet.address && (
                          <div style={{
                            padding: '0.75rem',
                            background: 'rgba(139, 92, 246, 0.15)',
                            borderRadius: '0.5rem',
                            marginBottom: '0.75rem',
                            border: '1px solid rgba(139, 92, 246, 0.3)'
                          }}>
                            <div style={{fontSize: '0.75rem', color: '#a78bfa', marginBottom: '0.5rem'}}>
                              📛 Your Nickname
                            </div>
                            {editingNickname ? (
                              <div style={{display: 'flex', gap: '0.5rem'}}>
                                <input
                                  type="text"
                                  value={nicknameInput}
                                  onChange={e => setNicknameInput(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && saveNickname(nicknameInput)}
                                  placeholder="Enter nickname..."
                                  maxLength={20}
                                  autoFocus
                                  style={{
                                    flex: 1,
                                    padding: '0.4rem',
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid #8b5cf6',
                                    borderRadius: '0.25rem',
                                    color: '#f8fafc',
                                    fontSize: '0.85rem'
                                  }}
                                />
                                <button
                                  onClick={() => saveNickname(nicknameInput)}
                                  style={{
                                    padding: '0.4rem 0.6rem',
                                    background: '#8b5cf6',
                                    border: 'none',
                                    borderRadius: '0.25rem',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem'
                                  }}
                                >✓</button>
                                <button
                                  onClick={() => { setEditingNickname(false); setNicknameInput(myNickname); }}
                                  style={{
                                    padding: '0.4rem 0.6rem',
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    borderRadius: '0.25rem',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem'
                                  }}
                                >✕</button>
                              </div>
                            ) : (
                              <div 
                                onClick={() => { setNicknameInput(myNickname); setEditingNickname(true); }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  cursor: 'pointer',
                                  padding: '0.4rem',
                                  background: 'rgba(0,0,0,0.2)',
                                  borderRadius: '0.25rem'
                                }}
                              >
                                <span style={{color: myNickname ? '#f8fafc' : '#64748b', fontWeight: myNickname ? '600' : '400'}}>
                                  {myNickname || 'Click to set nickname...'}
                                </span>
                                <span style={{marginLeft: 'auto', fontSize: '0.7rem', color: '#64748b'}}>✏️</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <ul>
                            {validators.filter(v => v && typeof v === 'string').map(v => {
                                const nickname = nicknames[v.toLowerCase()];
                                const isYou = v === wallet.address;
                                return (
                                  <li key={v} onClick={() => copyAddress(v)} title={`Click to Copy: ${v}`}>
                                      <div className="avatar" style={{background: `#${v.slice(2,8)}`}}>
                                        {nickname ? nickname[0].toUpperCase() : ''}
                                      </div>
                                      <div className="roster-item-content">
                                          {nickname && (
                                            <span style={{fontWeight: '600', color: '#f8fafc'}}>{nickname}</span>
                                          )}
                                          <span style={{fontSize: nickname ? '0.75rem' : '0.9rem', color: nickname ? '#94a3b8' : '#f8fafc'}}>
                                            {v.slice(0,6)}...{v.slice(-4)}
                                          </span>
                                          {isYou && <span className="you-badge">(You)</span>}
                                      </div>
                                  </li>
                                );
                            })}
                        </ul>
                        {!validators.includes(wallet.address) && wallet.address && (
                            <button 
                                className="secondary-btn small-btn" 
                                onClick={broadcastPresence}
                                disabled={statusMsg.includes("Sending") || statusMsg.includes("Confirming")}
                                style={{
                                    opacity: (statusMsg.includes("Sending") || statusMsg.includes("Confirming")) ? 0.6 : 1,
                                    cursor: (statusMsg.includes("Sending") || statusMsg.includes("Confirming")) ? 'wait' : 'pointer'
                                }}
                            >
                                {statusMsg.includes("Sending") || statusMsg.includes("Confirming") 
                                    ? "⏳ Joining..." 
                                    : "👋 Join Class List"}
                            </button>
                        )}
                        {validators.includes(wallet.address) && (
                            <div style={{
                                padding: '0.5rem',
                                background: 'rgba(34, 197, 94, 0.2)',
                                borderRadius: '0.5rem',
                                fontSize: '0.8rem',
                                color: '#22c55e',
                                textAlign: 'center'
                            }}>
                                ✅ You're in the class!
                            </div>
                        )}
                        <div className="session-info">
                            <small>Your Session: {getSessionAge()} min</small>
                        </div>
                    </div>
                    
                </div>
            )}
            
            {/* ============= CLI MODE SIDEBAR ============= */}
            {currentMode === 'cli' && (
                <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                    <div style={{
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        marginBottom: '0.75rem',
                        paddingLeft: '0.5rem'
                    }}>
                        CLI Labs
                    </div>
                    
                    <div style={{
                        padding: '1rem',
                        background: 'rgba(251, 191, 36, 0.1)',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(251, 191, 36, 0.3)',
                        marginBottom: '1rem'
                    }}>
                        <div style={{fontSize: '1rem', fontWeight: 'bold', color: '#fbbf24', marginBottom: '0.5rem'}}>
                            💻 Terminal Required
                        </div>
                        <p style={{fontSize: '0.85rem', color: '#cbd5e1', margin: 0}}>
                            These labs require command-line access. Start with <strong>Available Labs</strong> for step-by-step instructions.
                        </p>
                    </div>
                    
                    <div style={{
                        marginTop: 'auto',
                        padding: '1rem',
                        background: 'rgba(59,130,246,0.1)',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(59,130,246,0.3)'
                    }}>
                        <button 
                            onClick={() => setView('live')}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                                border: 'none',
                                borderRadius: '0.5rem',
                                color: 'white',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                            }}
                        >
                            🌐 Go to Live Network
                        </button>
                    </div>
                </div>
            )}
            
            {/* ============= INSTRUCTOR MODE SIDEBAR ============= */}
            {currentMode === 'instructor' && (
                <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                    <div style={{
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        marginBottom: '0.75rem',
                        paddingLeft: '0.5rem'
                    }}>
                        Instructor Tools
                    </div>
                    
                    <div style={{
                        padding: '1rem',
                        background: 'rgba(236, 72, 153, 0.1)',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(236, 72, 153, 0.3)',
                        marginBottom: '1rem'
                    }}>
                        <div style={{fontSize: '1rem', fontWeight: 'bold', color: '#f472b6', marginBottom: '0.5rem'}}>
                            🎓 Instructor Mode
                        </div>
                        <p style={{fontSize: '0.85rem', color: '#cbd5e1', margin: 0}}>
                            Monitor students, control epochs, and manage the network.
                        </p>
                    </div>
                    
                    {!isInstructor && (
                        <div style={{
                            padding: '1rem',
                            background: 'rgba(239, 68, 68, 0.2)',
                            borderRadius: '0.5rem',
                            color: '#fca5a5',
                            fontSize: '0.85rem'
                        }}>
                            ⚠️ Add <code>?mode=instructor</code> to URL for full access
                        </div>
                    )}
                </div>
            )}
            
            {/* Reset Session Button - Always visible at bottom */}
            <div style={{
                marginTop: 'auto',
                padding: '1rem',
                borderTop: '1px solid rgba(255,255,255,0.1)'
            }}>
                {labTerminalEnabled && (
                <button
                    onClick={() => openLabTerminal(rpcUrl, terminalRpcUrl)}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        marginBottom: '0.75rem',
                        background: 'rgba(139, 92, 246, 0.18)',
                        border: '1px solid rgba(139, 92, 246, 0.45)',
                        borderRadius: '0.5rem',
                        color: '#c4b5fd',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        fontWeight: 700
                    }}
                >
                    🖥️ Lab Terminal
                </button>
                )}
                <button
                    onClick={resetSession}
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'transparent',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        borderRadius: '0.5rem',
                        color: '#94a3b8',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.6)';
                        e.currentTarget.style.color = '#f87171';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                        e.currentTarget.style.color = '#94a3b8';
                    }}
                >
                    🔄 Reset My Session
                </button>
            </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="main-content">
            {/* 0. ORIENTATION VIEW */}
            {view === 'intro' && (
                <div className="intro-view" style={{maxWidth: '1200px', margin: '0 auto'}}>
                    {/* ========== COURSE HEADER ========== */}
                    <div style={{
                        background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #1a1a2e 100%)',
                        borderRadius: '1rem',
                        padding: '2.5rem',
                        marginBottom: '2rem',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: '300px',
                            height: '300px',
                            background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
                            pointerEvents: 'none'
                        }}></div>
                        
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem'}}>
                            <div style={{flex: '1 1 500px'}}>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: 'rgba(59, 130, 246, 0.2)',
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    marginBottom: '1rem',
                                    border: '1px solid rgba(59, 130, 246, 0.4)'
                                }}>
                                    <span style={{fontSize: '0.8rem', color: '#60a5fa', fontWeight: '600', letterSpacing: '0.05em'}}>
                                        BLOCKCHAIN FUNDAMENTALS
                                    </span>
                                </div>
                                
                                <h1 style={{
                                    fontSize: '2.5rem',
                                    fontWeight: '700',
                                    margin: '0 0 1rem 0',
                                    background: 'linear-gradient(135deg, #fff 0%, #93c5fd 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    lineHeight: '1.2'
                                }}>
                                    Ethereum Proof-of-Stake Laboratory
                                </h1>
                                
                                <p style={{fontSize: '1.15rem', color: '#cbd5e1', lineHeight: '1.7', marginBottom: '1rem', maxWidth: '600px'}}>
                                    Master the fundamentals of Ethereum's consensus mechanism through hands-on interaction 
                                    with a live blockchain environment. This lab provides practical experience with staking, 
                                    validation, and network security concepts.
                                </p>
                                
                                {/* Skip to Live - Classroom mode */}
                                <button
                                    onClick={() => setView('live')}
                                    style={{
                                        padding: '0.75rem 1.5rem',
                                        background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        marginBottom: '1rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                    }}
                                >
                                    I&apos;m in a class — take me to the lab →
                                </button>
                                
                                {/* PROVENANCE BADGE - Trust indicator */}
                                <div style={{marginBottom: '1.5rem'}}>
                                    <ProvenanceBadge showFull={true} />
                                </div>
                                
                                <div style={{display: 'flex', flexWrap: 'wrap', gap: '1.5rem', marginTop: '1rem'}}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                        <div style={{width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                            <span style={{fontSize: '1.2rem'}}>⏱️</span>
                                        </div>
                                        <div>
                                            <div style={{fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase'}}>Duration</div>
                                            <div style={{fontSize: '1rem', color: '#e2e8f0', fontWeight: '600'}}>45-60 minutes</div>
                                        </div>
                                    </div>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                        <div style={{width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                            <span style={{fontSize: '1.2rem'}}>📊</span>
                                        </div>
                                        <div>
                                            <div style={{fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase'}}>Level</div>
                                            <div style={{fontSize: '1rem', color: '#e2e8f0', fontWeight: '600'}}>Beginner</div>
                                        </div>
                                    </div>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                        <div style={{width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(251, 191, 36, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                            <span style={{fontSize: '1.2rem'}}>🎯</span>
                                        </div>
                                        <div>
                                            <div style={{fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase'}}>Format</div>
                                            <div style={{fontSize: '1rem', color: '#e2e8f0', fontWeight: '600'}}>Interactive Lab</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div style={{
                                flex: '0 0 auto',
                                background: 'rgba(15, 23, 42, 0.6)',
                                borderRadius: '1rem',
                                padding: '1.5rem',
                                border: '1px solid rgba(71, 85, 105, 0.5)',
                                minWidth: '280px'
                            }}>
                                <div style={{fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem', fontWeight: '600'}}>
                                    PREREQUISITES
                                </div>
                                <ul style={{listStyle: 'none', padding: 0, margin: 0, fontSize: '0.95rem'}}>
                                    <li style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem', color: '#e2e8f0'}}>
                                        <span style={{color: '#22c55e'}}>✓</span> Basic understanding of cryptocurrency
                                    </li>
                                    <li style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem', color: '#e2e8f0'}}>
                                        <span style={{color: '#22c55e'}}>✓</span> Web browser (Chrome/Firefox)
                                    </li>
                                    <li style={{display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0'}}>
                                        <span style={{color: '#22c55e'}}>✓</span> Network access to instructor's node
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* ========== LEARNING OBJECTIVES ========== */}
                    <div style={{
                        background: '#1e293b',
                        borderRadius: '1rem',
                        padding: '2rem',
                        marginBottom: '2rem',
                        border: '1px solid #334155'
                    }}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem'}}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem'
                            }}>🎯</div>
                            <div>
                                <h2 style={{margin: 0, fontSize: '1.4rem', color: '#f8fafc'}}>Learning Objectives</h2>
                                <p style={{margin: 0, fontSize: '0.9rem', color: '#94a3b8'}}>Upon completion, you will be able to:</p>
                            </div>
                        </div>
                        
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem'}}>
                            {[
                                {icon: '🔐', text: 'Explain how Ethereum wallets and addresses work using public-key cryptography'},
                                {icon: '⛽', text: 'Calculate and interpret gas fees for blockchain transactions'},
                                {icon: '🔗', text: 'Describe how blocks are linked to form an immutable chain'},
                                {icon: '🏦', text: 'Demonstrate the staking process and validator selection algorithm'},
                                {icon: '⚔️', text: 'Identify conditions that trigger slashing penalties'},
                                {icon: '💰', text: 'Analyze the economic incentives of Proof-of-Stake consensus'}
                            ].map((obj, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '12px',
                                    padding: '1rem',
                                    background: 'rgba(59, 130, 246, 0.08)',
                                    borderRadius: '0.75rem',
                                    border: '1px solid rgba(59, 130, 246, 0.2)'
                                }}>
                                    <span style={{fontSize: '1.3rem', flexShrink: 0}}>{obj.icon}</span>
                                    <span style={{color: '#e2e8f0', fontSize: '0.95rem', lineHeight: '1.5'}}>{obj.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ========== COURSE MODULES ========== */}
                    <div style={{
                        background: '#1e293b',
                        borderRadius: '1rem',
                        padding: '2rem',
                        marginBottom: '2rem',
                        border: '1px solid #334155'
                    }}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem'}}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem'
                            }}>📚</div>
                            <div>
                                <h2 style={{margin: 0, fontSize: '1.4rem', color: '#f8fafc'}}>Course Modules</h2>
                                <p style={{margin: 0, fontSize: '0.9rem', color: '#94a3b8'}}>4 modules • Progressive learning path</p>
                            </div>
                        </div>
                        
                        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                            {[
                                {num: 1, title: 'Core Concepts', desc: 'Wallets, Gas, Blocks, Consensus Mechanisms', time: '10 min', icon: '🧱', view: 'concepts'},
                                {num: 2, title: 'Deep Dive', desc: 'Staking, Validators, Slashing, DeFi Economics', time: '15 min', icon: '🛰', view: 'explore'},
                                {num: 3, title: 'Simulation', desc: 'Interactive Validator Selection Algorithm', time: '10 min', icon: '🎮', view: 'sim'},
                                {num: 4, title: 'Live Network', desc: 'Real Transactions, Staking, Rewards', time: '15 min', icon: '🌐', view: 'live'}
                            ].map((mod, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => {
                                        markStageComplete('intro');
                                        setView(mod.view);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '1.25rem',
                                        background: idx === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.2)',
                                        borderRadius: '0.75rem',
                                        border: idx === 0 ? '2px solid #10b981' : '1px solid #334155',
                                        transition: 'all 0.2s',
                                        cursor: 'pointer'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                                        e.currentTarget.style.borderColor = '#3b82f6';
                                        e.currentTarget.style.transform = 'translateX(8px)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = idx === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.2)';
                                        e.currentTarget.style.borderColor = idx === 0 ? '#10b981' : '#334155';
                                        e.currentTarget.style.transform = 'translateX(0)';
                                    }}
                                >
                                    <div style={{
                                        width: '50px',
                                        height: '50px',
                                        borderRadius: '12px',
                                        background: idx === 0 ? '#10b981' : '#334155',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.5rem',
                                        flexShrink: 0
                                    }}>
                                        {mod.icon}
                                    </div>
                                    <div style={{flex: 1}}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px'}}>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                color: '#64748b',
                                                fontWeight: '600'
                                            }}>MODULE {mod.num}</span>
                                            {idx === 0 && <span style={{
                                                fontSize: '0.7rem',
                                                background: '#10b981',
                                                color: 'white',
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                fontWeight: '600'
                                            }}>START HERE</span>}
                                        </div>
                                        <div style={{fontSize: '1.1rem', color: '#f8fafc', fontWeight: '600'}}>{mod.title}</div>
                                        <div style={{fontSize: '0.9rem', color: '#94a3b8'}}>{mod.desc}</div>
                                    </div>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                                        <div style={{
                                            fontSize: '0.85rem',
                                            color: '#64748b',
                                            background: 'rgba(0,0,0,0.3)',
                                            padding: '6px 12px',
                                            borderRadius: '20px',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            ⏱️ {mod.time}
                                        </div>
                                        <div style={{
                                            fontSize: '1.2rem',
                                            color: '#3b82f6',
                                            transition: 'transform 0.2s'
                                        }}>
                                            →
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p style={{
                            marginTop: '1rem',
                            fontSize: '0.85rem',
                            color: '#64748b',
                            textAlign: 'center',
                            fontStyle: 'italic'
                        }}>
                            💡 Click any module to jump directly to that section
                        </p>
                    </div>

                    {/* ========== CONTENT SOURCES - Trust & Transparency ========== */}
                    <div style={{
                        background: 'rgba(30, 41, 59, 0.5)',
                        borderRadius: '0.75rem',
                        padding: '1.25rem',
                        marginBottom: '2rem',
                        border: '1px solid #334155'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '0.75rem',
                            color: '#94a3b8',
                            fontSize: '0.85rem',
                            fontWeight: '600'
                        }}>
                            <span>📚</span> Content Sources & Verification
                        </div>
                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                            {CONTENT_METADATA.sources.map((source, idx) => (
                                <span key={idx} style={{
                                    padding: '4px 10px',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    borderRadius: '12px',
                                    fontSize: '0.8rem',
                                    color: '#93c5fd'
                                }}>
                                    {source}
                                </span>
                            ))}
                        </div>
                        <p style={{
                            margin: '0.75rem 0 0 0',
                            fontSize: '0.8rem',
                            color: '#64748b',
                            fontStyle: 'italic'
                        }}>
                            Last updated: {CONTENT_METADATA.lastUpdated} • Version {CONTENT_METADATA.version}
                        </p>
                    </div>

                    {/* ========== START BUTTON ========== */}
                    <div style={{textAlign: 'center', marginTop: '2rem'}}>
                        <button 
                            onClick={() => {
                                // Track session start for analytics
                                setSessionStart(Date.now());
                                markStageComplete('intro')
                                setView('concepts')
                            }}
                            style={{
                                padding: '1.25rem 3rem',
                                fontSize: '1.15rem',
                                fontWeight: '700',
                                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                                border: 'none',
                                borderRadius: '0.75rem',
                                color: 'white',
                                cursor: 'pointer',
                                boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
                                transition: 'all 0.3s',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                            Begin Course <span style={{fontSize: '1.3rem'}}>→</span>
                        </button>
                        <p style={{marginTop: '1rem', fontSize: '0.9rem', color: '#64748b'}}>
                            Estimated completion time: 45-60 minutes
                        </p>
                    </div>
                    
                    {/* ========== FEEDBACK SECTION ========== */}
                    <div style={{
                        marginTop: '2rem',
                        padding: '1.5rem',
                        background: 'rgba(15, 23, 42, 0.5)',
                        borderRadius: '0.75rem',
                        border: '1px solid #334155',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem'
                    }}>
                        <div>
                            <div style={{color: '#94a3b8', fontSize: '0.9rem'}}>
                                📣 Help us improve this lab
                            </div>
                            <div style={{color: '#64748b', fontSize: '0.8rem'}}>
                                Your feedback shapes future versions
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. BASIC CONCEPTS VIEW */}
            {view === 'concepts' && (
                <div className="concepts-view">
                    <h2>🔍 Core Concepts</h2>
                    <p className="section-subtitle">Skim each card and hover to expand the mental models you'll need later.</p>
                    <div className="concepts-grid">
                        {CONCEPT_CARDS.map(card => (
                            <div 
                                className="concept-card" 
                                key={card.title}
                                style={card.fullWidth ? {gridColumn: '1 / -1'} : {}}
                            >
                                <h3>{card.title}</h3>
                                <p>{card.description}</p>
                                <ul>
                                    {card.highlight.map(point => <li key={point}>{point}</li>)}
                                </ul>
                                {/* VIDEO EMBED - Shows when video URL is provided */}
                                {card.video && (
                                    <div style={{
                                        marginTop: '1.5rem',
                                        borderRadius: '0.75rem',
                                        overflow: 'hidden',
                                        background: '#0f172a',
                                        border: '2px solid #3b82f6'
                                    }}>
                                        <div style={{
                                            padding: '0.75rem 1rem',
                                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                                            color: 'white',
                                            fontWeight: 'bold',
                                            fontSize: '0.9rem'
                                        }}>
                                            🎬 Video Tutorial
                                        </div>
                                        <div style={{position: 'relative', paddingBottom: '56.25%', height: 0}}>
                                            <iframe
                                                src={card.video}
                                                title={`Video: ${card.title}`}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    border: 'none'
                                                }}
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        </div>
                                    </div>
                                )}
                                {card.diagram && (
                                    <div style={{marginTop: '1.5rem', padding: '1.5rem', background: 'white', borderRadius: '0.75rem', border: '2px solid #e2e8f0'}}>
                                        <h4 style={{marginTop: 0, marginBottom: '1rem', color: '#1e293b', textAlign: 'center', fontSize: '1.3rem'}}>
                                            📊 The Validation Cycle
                                        </h4>
                                        <div style={{maxWidth: '900px', margin: '0 auto'}}>
                                            <img 
                                                src="pos-diagram.svg" 
                                                alt="Proof of Stake Validation Flow" 
                                                style={{width: '100%', display: 'block', height: 'auto'}}
                                            />
                                        </div>
                                        <div style={{marginTop: '1.5rem', padding: '1rem', background: '#f1f5f9', borderRadius: '0.5rem', maxWidth: '900px', margin: '1.5rem auto 0'}}>
                                            <p style={{margin: 0, fontSize: '0.95rem', color: '#475569', lineHeight: '1.7'}}>
                                                <strong style={{color: '#1e293b', display: 'block', marginBottom: '0.5rem'}}>How it works:</strong>
                                                <span style={{color: '#1e293b'}}>①</span> Validator stakes ETH → 
                                                <span style={{color: '#1e293b'}}> ②</span> Algorithm selects validator → 
                                                <span style={{color: '#1e293b'}}> ③</span> Selected validator proposes block → 
                                                <span style={{color: '#1e293b'}}> ④</span> Others verify → 
                                                <span style={{color: '#1e293b'}}> ⑤</span> Block added to chain → 
                                                <span style={{color: '#1e293b'}}> ⑥</span> Validator earns rewards
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="concept-actions">
                        <button onClick={() => setView('intro')}>← Back to Orientation</button>
                        <button className="primary-btn" onClick={() => {
                            markStageComplete('concepts')
                            setView('explore')
                        }}>I'm ready to explore →</button>
                    </div>
                </div>
            )}

            {/* 2. EXPLORATION VIEW */}
            {view === 'explore' && (
                <ExploreView
                    missions={EXPLORE_MISSIONS}
                    exploreProgress={exploreProgress}
                    setExploreProgress={setExploreProgress}
                    onBack={() => setView('concepts')}
                    onContinue={() => { saveTrail({ ...trail, explore: true }); setView('sim'); }}
                    fireProgressBeacon={fireProgressBeacon}
                />
            )}

            {/* SIMULATION VIEW - Practice PoS concepts */}
            {view === 'sim' && (
                <section className="concept-actions"><button className="primary-btn" onClick={() => setView('beacon-lab')}>Open Beacon Chain lab</button></section>
            )}

            {/* TOKEN CONCEPTS VIEW - FT vs NFT Learning */}
            {view === 'tokens' && (
                <section className="concept-actions"><button className="primary-btn" onClick={() => setView('tokenization-lab')}>Open Tokenization lab</button></section>
            )}

            {/* 3. LIVE NETWORK VIEW */}
            {view === 'live' && (
                <div className="live-dashboard">
                    {/* Goal banner + Do This First */}
                    <div style={{
                        marginBottom: '1rem',
                        padding: '1rem 1.25rem',
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(59, 130, 246, 0.15) 100%)',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(34, 197, 94, 0.4)',
                    }}>
                        <button
                            type="button"
                            className="live-page-block-header"
                            onClick={() => toggleLivePageBlock('yourWalletBanner')}
                            style={{ marginBottom: livePageBlocksOpen.yourWalletBanner ? '0.5rem' : 0 }}
                        >
                            <span style={{ fontWeight: 'bold', fontSize: '1.05rem', color: '#86efac' }}>Your Wallet</span>
                            <span style={{ color: '#93c5fd', fontSize: '0.9rem' }}>{livePageBlocksOpen.yourWalletBanner ? '▼' : '▶'}</span>
                        </button>
                        {livePageBlocksOpen.yourWalletBanner && (
                        <>
                        <p style={{ fontSize: '0.9rem', color: '#cbd5e1', margin: '0 0 0.75rem 0' }}>
                            Check your wallet, top off test ETH, send transactions, inspect chain state, and use on-chain chat with classmates.
                        </p>
                        <details style={{ fontSize: '0.85rem', color: '#94a3b8' }} open>
                            <summary style={{ cursor: 'pointer', color: '#93c5fd' }}>Do This First</summary>
                            <ul style={{ margin: '0.5rem 0 0 1rem', paddingLeft: 0, listStyle: 'none' }}>
                                <li>{wallet?.address ? '✅' : '☐'} Wallet created</li>
                                <li>
                                    {parseFloat(wallet?.balance || 0) > 0 ? '✅' : '☐'} Wallet funded
                                    {parseFloat(wallet?.balance || 0) > 0 ? null : (
                                        <span style={{ color: '#94a3b8' }}> — click <strong>💰 Top off</strong> in the left panel</span>
                                    )}
                                </li>
                                <li>{txHistory.some(tx => tx.type === 'sent') ? '✅' : '☐'} Sent a transaction</li>
                                <li>{messages.some(m => m.sender === wallet.address) ? '✅' : '☐'} Posted in class chat</li>
                            </ul>
                        </details>
                        </>
                        )}
                    </div>
                    {/* Role assignment notification - shown when newly assigned */}
                    {roleAssignedBanner && myStake.role && (
                        <div style={{
                            marginBottom: '1rem',
                            padding: '1rem 1.25rem',
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(167, 139, 250, 0.2) 100%)',
                            border: '2px solid #8b5cf6',
                            borderRadius: '0.75rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                <button
                                    type="button"
                                    className="live-page-block-header"
                                    onClick={() => toggleLivePageBlock('roleAssigned')}
                                    style={{ flex: 1, margin: 0, alignItems: 'flex-start' }}
                                >
                                    <div>
                                        <div style={{fontSize: '1.1rem', fontWeight: 'bold', color: '#c4b5fd', marginBottom: '0.25rem'}}>
                                            🎭 You've been assigned: {myStake.role}
                                        </div>
                                        {!livePageBlocksOpen.roleAssigned && (
                                            <div style={{fontSize: '0.75rem', color: '#94a3b8'}}>Click to expand details</div>
                                        )}
                                    </div>
                                    <span style={{ color: '#c4b5fd', fontSize: '0.9rem', flexShrink: 0 }}>{livePageBlocksOpen.roleAssigned ? '▼' : '▶'}</span>
                                </button>
                                <button
                                    onClick={() => setRoleAssignedBanner(false)}
                                    style={{
                                        padding: '0.25rem 0.5rem',
                                        background: 'rgba(255,255,255,0.2)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: '0.25rem',
                                        color: '#e2e8f0',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        flexShrink: 0
                                    }}
                                >
                                    Dismiss
                                </button>
                            </div>
                            {livePageBlocksOpen.roleAssigned && (
                                <div style={{fontSize: '0.9rem', color: '#a78bfa'}}>
                                    Check your Role Hub below for goals, tasks, and quick actions.
                                </div>
                            )}
                        </div>
                    )}
                    {/* Active Identity - Compact */}
                    <div style={{
                        padding: '0.4rem 0.65rem',
                        marginBottom: '0.75rem',
                        background: 'rgba(30, 41, 59, 0.95)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '0.35rem',
                        fontSize: '0.8rem'
                    }}>
                        <button
                            type="button"
                            className="live-page-block-header"
                            onClick={() => toggleLivePageBlock('identityStrip')}
                            style={{ margin: 0, padding: '0.15rem 0' }}
                        >
                            <span style={{ color: '#94a3b8', fontWeight: 600 }}>You &amp; class contract</span>
                            <span style={{ color: '#64748b' }}>{livePageBlocksOpen.identityStrip ? '▼' : '▶'}</span>
                        </button>
                        {livePageBlocksOpen.identityStrip && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginTop: '0.35rem' }}>
                        <span style={{color: '#94a3b8'}}>You:</span>
                        <span style={{fontFamily: 'monospace', color: '#e2e8f0'}}>
                            {wallet?.address ? `${wallet.address.slice(0,6)}...${wallet.address.slice(-4)}` : 'No wallet'}
                        </span>
                        {wallet?.address && (
                        <button onClick={() => copyAddress(wallet.address)} style={{padding: '0.2rem 0.4rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid #334155', borderRadius: '0.25rem', color: '#94a3b8', cursor: 'pointer'}}>Copy</button>
                        )}
                        <span style={{color: '#64748b'}}>|</span>
                        <span style={{color: '#94a3b8'}}>Contract:</span>
                        <span style={{fontFamily: 'monospace', color: '#e2e8f0'}}>
                            {posAddress && posAddress.length === 42 ? `${posAddress.slice(0,8)}...` : 'Not set'}
                        </span>
                        {posAddress && posAddress.length === 42 && (
                            <button onClick={() => copyAddress(posAddress)} style={{padding: '0.2rem 0.4rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', border: '1px solid #334155', borderRadius: '0.25rem', color: '#94a3b8', cursor: 'pointer'}}>Copy</button>
                        )}
                        </div>
                        )}
                    </div>
                    
                    {/* Social Proof Banner - Community Activity */}
                    <div style={{marginBottom: '1rem'}}>
                        <button
                            type="button"
                            className="live-page-block-header"
                            onClick={() => toggleLivePageBlock('socialProof')}
                            style={{
                                marginBottom: livePageBlocksOpen.socialProof ? '0.5rem' : 0,
                                padding: '0.5rem 0.65rem',
                                background: 'rgba(30, 41, 59, 0.6)',
                                borderRadius: '0.35rem',
                                border: '1px solid rgba(71, 85, 105, 0.5)',
                            }}
                        >
                            <span style={{ fontWeight: 600, color: '#e2e8f0' }}>👥 Class activity</span>
                            <span style={{ color: '#94a3b8' }}>{livePageBlocksOpen.socialProof ? '▼' : '▶'}</span>
                        </button>
                        {livePageBlocksOpen.socialProof && (
                        <SocialProof 
                            validators={validators} 
                            messages={messages}
                            stakersCount={0}
                        />
                        )}
                    </div>

                    {/* Create your first wallet (new students by IP) */}
                    {mustCreateWalletFirst && (
                        <div style={{
                            marginBottom: '1rem',
                            padding: '1.5rem',
                            background: 'linear-gradient(135deg, #1e3a5f 0%, #312e81 100%)',
                            border: '2px solid #3b82f6',
                            borderRadius: '0.75rem',
                            color: 'white',
                            textAlign: 'center'
                        }}>
                            <button
                                type="button"
                                className="live-page-block-header"
                                onClick={() => toggleLivePageBlock('createWalletBanner')}
                                style={{ marginBottom: livePageBlocksOpen.createWalletBanner ? '0.5rem' : 0, color: 'white' }}
                            >
                                <span style={{fontSize: '1.25rem', fontWeight: 'bold'}}>👛 Create your first wallet</span>
                                <span style={{ color: '#93c5fd' }}>{livePageBlocksOpen.createWalletBanner ? '▼' : '▶'}</span>
                            </button>
                            {livePageBlocksOpen.createWalletBanner && (
                            <>
                            <p style={{margin: '0 0 1rem 0', opacity: 0.9, fontSize: '0.9rem'}}>
                                New students must create a wallet before receiving test ETH. You can create additional wallets later.
                            </p>
                            <div style={{display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap'}}>
                                <button
                                    onClick={createNamedWallet}
                                    style={{
                                        padding: '0.6rem 1.25rem',
                                        background: '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        fontSize: '0.95rem'
                                    }}
                                >
                                    Create wallet
                                </button>
                            </div>
                            </>
                            )}
                        </div>
                    )}

                    {/* Wallet Header - Compact (hidden when must create first) */}
                    {!mustCreateWalletFirst && (
                    <div style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        marginBottom: '1rem',
                        color: 'white'
                    }}>
                        <button
                            type="button"
                            onClick={() => toggleLivePageBlock('walletAndRole')}
                            style={{
                                width: '100%',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'rgba(0,0,0,0.2)',
                                border: 'none',
                                borderRadius: '0.5rem',
                                color: 'white',
                                cursor: 'pointer',
                                padding: '0.5rem 0.75rem',
                                marginBottom: '0.75rem',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                            }}
                        >
                            <span>
                                {wallet.nickname || 'My Wallet'}
                                <span style={{ opacity: 0.88, fontWeight: 400, marginLeft: '0.5rem' }}>
                                    · {parseFloat(wallet.balance || 0).toFixed(4)} ETH
                                </span>
                                {!livePageBlocksOpen.walletAndRole && wallet.address && (
                                    <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', opacity: 0.9 }}>{' '}· {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}</span>
                                )}
                            </span>
                            <span style={{ opacity: 0.9 }}>{livePageBlocksOpen.walletAndRole ? '▼' : '▶'}</span>
                        </button>
                        {livePageBlocksOpen.walletAndRole && (
                        <>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem'}}>
                            <div>
                                <div style={{fontSize: '0.85rem', opacity: 0.9, marginBottom: '0.5rem'}}>
                                    <span 
                                        className={`dot ${nodeStatus.connected ? 'green' : 'red'}`} 
                                        style={{
                                            marginRight: '0.5rem',
                                            animation: nodeStatus.connected ? 'pulse 2s infinite' : 'none'
                                        }}
                                    ></span>
                            {nodeStatus.connected ? `Block #${nodeStatus.blockNumber}` : 'Connecting...'}
                                    {nodeStatus.connected && (
                                        <span style={{
                                            marginLeft: '8px',
                                            fontSize: '0.7rem',
                                            color: '#22d3ee',
                                            opacity: 0.8
                                        }}>
                                            • Live {Math.floor((Date.now() - lastSyncTime) / 1000) < 2 ? '🟢' : '⏳'}
                                        </span>
                                    )}
                        </div>
                                <div style={{fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.25rem'}}>
                                    {wallet.nickname || 'My Wallet'}
                                </div>
                                <div style={{fontSize: '0.9rem', opacity: 0.8, fontFamily: 'monospace'}}>
                                    {wallet.address ? `${wallet.address.slice(0,6)}...${wallet.address.slice(-4)}` : 'No Wallet'}
                        </div>
                            </div>
                            <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                                <button 
                                    onClick={() => copyAddress(wallet.address)}
                                    style={{padding: '0.4rem 0.65rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '0.35rem', color: 'white', cursor: 'pointer'}}
                                >
                                    📋 Copy
                                </button>
                                <button 
                                    onClick={() => {
                                        const walletInfo = getWalletInfo();
                                        if (walletInfo) {
                                            alert(`Your Account:\n\nNickname: ${walletInfo.nickname}\nAddress: ${walletInfo.address}\n\nUse the sidebar buttons to copy the address, top off test ETH, or create wallets.`);
                                        }
                                    }}
                                    style={{padding: '0.4rem 0.65rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '0.35rem', color: 'white', cursor: 'pointer'}}
                                >
                                    ⚙️ Account
                                </button>
                                <button 
                                    onClick={() => setShowLiveHelp(true)}
                                    style={{padding: '0.4rem 0.65rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '0.35rem', color: 'white', cursor: 'pointer'}}
                                >
                                    ❓ Help
                                </button>
                            </div>
                        </div>
                        
                        <div style={{textAlign: 'center', padding: '1rem 0'}}>
                            <div style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem'}}>
                                {parseFloat(wallet.balance || 0).toFixed(4)} ETH
                            </div>
                            <div style={{fontSize: '0.9rem', opacity: 0.9}}>
                                ≈ ${(parseFloat(wallet.balance || 0) * 3000).toFixed(2)} USD
                            </div>
                        </div>
                        
                        {SCENARIO_ROLES_ENABLED && !myStake.role && (
                            <div style={{
                                marginTop: '0.75rem',
                                padding: '0.75rem 1rem',
                                background: 'rgba(148, 163, 184, 0.12)',
                                borderRadius: '0.35rem',
                                border: '1px solid rgba(148, 163, 184, 0.25)',
                                fontSize: '0.85rem',
                                color: '#94a3b8'
                            }}>
                                <div style={{fontWeight: '600', color: '#cbd5e1', marginBottom: '0.35rem'}}>🎭 No role yet</div>
                                <p style={{margin: 0, lineHeight: 1.5}}>
                                    Your instructor assigns roles via chat. Send a message so you appear in the list, then wait for a line like <code style={{background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.3rem', borderRadius: 3}}>[ROLES:your-address:Victim]</code> (role depends on the scenario).
                                </p>
                            </div>
                        )}
                        {myStake.role && (
                            <>
                                <RoleHub
                                    role={myStake.role}
                                    myStake={myStake}
                                    wallet={wallet}
                                    ransomAddr={ransomContractAddress}
                                    onRansomAddrChange={(v) => { setRansomContractAddress(v); }}
                                    onLoadScript={async (code) => {
                                      const ok = await copyToClipboard(code);
                                      setStatusMsg(ok
                                        ? '✓ Script copied. Open Lab Terminal from the sidebar and paste it at the Hardhat prompt.'
                                        : 'Script ready. Copy it manually, then paste it in the Lab Terminal at the Hardhat prompt.'
                                      );
                                      setTimeout(() => setStatusMsg(''), 4000);
                                    }}
                                    onExpandConsole={labTerminalEnabled ? (() => openLabTerminal(rpcUrl, terminalRpcUrl)) : undefined}
                                    setStatusMsg={setStatusMsg}
                                />
                                {/* Deploy & Register section */}
                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(139, 92, 246, 0.3)' }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#a78bfa' }}>
                                        📋 Deploy & Register
                                    </div>
                                    <div style={{
                                        padding: '0.75rem',
                                        background: myStake.roleContract ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0,0,0,0.2)',
                                        borderRadius: '0.5rem',
                                        border: myStake.roleContract ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(139, 92, 246, 0.2)',
                                    }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.4rem', color: myStake.roleContract ? '#34d399' : '#e2e8f0' }}>
                                            {(myStake.roleContract ? '✅' : '1️⃣') + ' Deploy your contract'}
                                        </div>
                                        {myStake.roleContract ? (
                                            <div style={{ fontSize: '0.8rem', color: '#34d399', fontFamily: 'monospace' }}>
                                                {String(myStake.roleContract).slice(0, 14)}...{String(myStake.roleContract).slice(-10)}
                                            </div>
                                        ) : (
                                            <div>
                                                {ROLE_CONTRACT_TEMPLATES[myStake.role] && (
                                                    <>
                                                        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 0.5rem 0' }}>
                                                            {ROLE_CONTRACT_TEMPLATES[myStake.role].description}
                                                        </p>
                                                        {ROLE_CONTRACT_TEMPLATES[myStake.role].name && (
                                                        <button
                                                            onClick={async () => {
                                                                const tmpl = ROLE_CONTRACT_TEMPLATES[myStake.role];
                                                                if (!tmpl?.name) return;
                                                                setDeployRoleInProgress(true);
                                                                setStatusMsg('🚀 Deploying ' + tmpl.name + '...');
                                                                try {
                                                                    const res = await fetch(import.meta.env.BASE_URL + `artifacts/${tmpl.name}.json`);
                                                                    if (!res.ok) throw new Error('Artifact not found: ' + tmpl.name);
                                                                    const artifact = await res.json();
                                                                    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet.signer);
                                                                    const needsArgs = artifact.abi.some(x => x.type === 'constructor' && x.inputs?.length > 0);
                                                                    let contract;
                                                                    if (needsArgs) {
                                                                        const argStr = window.prompt('Constructor argument needed (paste address from instructor if prompted):');
                                                                        if (!argStr) { setStatusMsg('Cancelled.'); setDeployRoleInProgress(false); return; }
                                                                        contract = await factory.deploy(argStr.trim());
                                                                    } else {
                                                                        contract = await factory.deploy();
                                                                    }
                                                                    await contract.waitForDeployment();
                                                                    const addr = await contract.getAddress();
                                                                    setStatusMsg('✅ Deployed! Registering with class...');
                                                                    const pos = new ethers.Contract(posAddress, PoSABI, wallet.signer);
                                                                    const tx = await pos.registerRoleContract(addr);
                                                                    await tx.wait();
                                                                    setMyStake(prev => ({ ...prev, roleContract: addr }));
                                                                    setStatusMsg('✅ Contract deployed & registered! Share address with instructor: ' + addr.slice(0, 10) + '...');
                                                                    setTimeout(() => setStatusMsg(''), 6000);
                                                                } catch (e) {
                                                                    setStatusMsg('❌ ' + (e.reason || e.message));
                                                                    setTimeout(() => setStatusMsg(''), 5000);
                                                                } finally {
                                                                    setDeployRoleInProgress(false);
                                                                }
                                                            }}
                                                            disabled={!wallet.signer || deployRoleInProgress}
                                                            style={{
                                                                padding: '0.5rem 1rem',
                                                                background: deployRoleInProgress ? '#475569' : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '0.5rem',
                                                                cursor: (!wallet.signer || deployRoleInProgress) ? 'wait' : 'pointer',
                                                                fontWeight: 'bold',
                                                                fontSize: '0.85rem',
                                                                width: '100%',
                                                                marginBottom: '0.5rem',
                                                                opacity: deployRoleInProgress ? 0.9 : 1
                                                            }}
                                                        >
                                                            {deployRoleInProgress ? '⏳ Deploying...' : '🚀 Deploy ' + ROLE_CONTRACT_TEMPLATES[myStake.role].name + ' (one click)'}
                                                        </button>
                                                        )}
                                                        {deployRoleInProgress && (
                                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                                                                ⏳ Deploying to blockchain, then registering with class...
                                                            </div>
                                                        )}
                                                        {statusMsg && (statusMsg.includes('Deploy') || statusMsg.includes('deployed') || statusMsg.includes('Register') || statusMsg.includes('❌')) && !deployRoleInProgress && (
                                                            <div style={{
                                                                marginTop: '0.5rem',
                                                                padding: '0.5rem 0.75rem',
                                                                borderRadius: '0.35rem',
                                                                fontSize: '0.85rem',
                                                                background: statusMsg.includes('❌') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                                                border: `1px solid ${statusMsg.includes('❌') ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.4)'}`,
                                                                color: statusMsg.includes('❌') ? '#fca5a5' : '#86efac'
                                                            }}>
                                                                {statusMsg}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Or paste address:</div>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.35rem' }}>
                                                    <input
                                                        placeholder="0x..."
                                                        value={roleContractInput}
                                                        onChange={e => setRoleContractInput(e.target.value)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '0.4rem 0.6rem',
                                                            background: '#0f172a',
                                                            border: '1px solid #475569',
                                                            borderRadius: '0.35rem',
                                                            color: '#e2e8f0',
                                                            fontSize: '0.8rem',
                                                            fontFamily: 'monospace'
                                                        }}
                                                    />
                                                    <button
                                                        onClick={async () => {
                                                            const addr = roleContractInput.trim();
                                                            if (!addr || !addr.startsWith('0x') || addr.length !== 42) {
                                                                setStatusMsg('❌ Enter a valid contract address');
                                                                return;
                                                            }
                                                            try {
                                                                setRoleContractRegistering(true);
                                                                const c = new ethers.Contract(posAddress, PoSABI, wallet.signer);
                                                                const tx = await c.registerRoleContract(addr);
                                                                await tx.wait();
                                                                setMyStake(prev => ({ ...prev, roleContract: addr }));
                                                                setRoleContractInput('');
                                                                setStatusMsg('✅ Contract registered!');
                                                                setTimeout(() => setStatusMsg(''), 3000);
                                                            } catch (e) {
                                                                setStatusMsg('❌ ' + (e.reason || e.message));
                                                            } finally {
                                                                setRoleContractRegistering(false);
                                                            }
                                                        }}
                                                        disabled={roleContractRegistering || !roleContractInput.trim()}
                                                        style={{
                                                            padding: '0.4rem 0.75rem',
                                                            background: !roleContractInput.trim() ? '#475569' : '#10b981',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '0.35rem',
                                                            cursor: !roleContractInput.trim() ? 'not-allowed' : 'pointer',
                                                            fontWeight: 'bold',
                                                            fontSize: '0.8rem'
                                                        }}
                                                    >
                                                        {roleContractRegistering ? '...' : 'Register'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <a href="/walkthrough.html" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#60a5fa', marginTop: '0.5rem', display: 'inline-block' }}>
                                        Open full walkthrough →
                                    </a>
                                    {ROLE_CONTRACT_TEMPLATES[myStake.role]?.template && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            <button
                                                onClick={() => setRoleTemplateExpanded(!roleTemplateExpanded)}
                                                style={{
                                                    background: 'transparent',
                                                    border: '1px solid rgba(139, 92, 246, 0.3)',
                                                    color: '#94a3b8',
                                                    padding: '0.3rem 0.6rem',
                                                    borderRadius: '0.25rem',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem'
                                                }}
                                            >
                                                {roleTemplateExpanded ? '▼ Hide Solidity source' : '▶ View Solidity source'}
                                            </button>
                                            {roleTemplateExpanded && (
                                                <pre style={{
                                                    marginTop: '0.5rem',
                                                    padding: '0.75rem',
                                                    background: '#0f172a',
                                                    borderRadius: '0.5rem',
                                                    fontSize: '0.75rem',
                                                    overflow: 'auto',
                                                    maxHeight: '240px',
                                                    color: '#94a3b8'
                                                }}>
                                                    {ROLE_CONTRACT_TEMPLATES[myStake.role].template}
                                                </pre>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                        </>
                        )}
                    </div>
                    )}

                    <div className="live-grid">
                        {/* Assets / Portfolio */}
                        <section className="card">
                            <button type="button" className="live-page-block-header" onClick={() => toggleLivePageBlock('assetsCard')}>
                                <h3>💼 Your Assets</h3>
                                <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{livePageBlocksOpen.assetsCard ? '▼' : '▶'}</span>
                            </button>
                            {livePageBlocksOpen.assetsCard && (
                            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: 0}}>
                                {/* ETH Balance */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    background: 'rgba(59,130,246,0.1)',
                                    borderRadius: '0.5rem',
                                    border: '1px solid rgba(59,130,246,0.3)'
                                }}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #627eea 0%, #8a92b2 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.2rem'
                                        }}>
                                            Ξ
                                        </div>
                                        <div>
                                            <div style={{fontWeight: 'bold', color: '#f8fafc'}}>Ethereum</div>
                                            <div style={{fontSize: '0.85rem', color: '#94a3b8'}}>ETH</div>
                                        </div>
                                    </div>
                                    <div style={{textAlign: 'right'}}>
                                        <div style={{fontWeight: 'bold', color: '#f8fafc'}}>{parseFloat(wallet.balance || 0).toFixed(4)} ETH</div>
                                        <div style={{fontSize: '0.85rem', color: '#94a3b8'}}>${(parseFloat(wallet.balance || 0) * 3000).toFixed(2)}</div>
                                    </div>
                                </div>
                                {myArcAsset.ok && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    background: 'rgba(34,197,94,0.1)',
                                    borderRadius: '0.5rem',
                                    border: '1px solid rgba(34,197,94,0.3)'
                                }}>
                                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.9rem',
                                            fontWeight: 900,
                                            color: '#052e16'
                                        }}>
                                            ARC
                                        </div>
                                        <div>
                                            <div style={{fontWeight: 'bold', color: '#f8fafc'}}>Arcade Token</div>
                                            <div style={{fontSize: '0.85rem', color: '#94a3b8'}}>ERC-20 ARC</div>
                                        </div>
                                    </div>
                                    <div style={{textAlign: 'right'}}>
                                        <div style={{fontWeight: 'bold', color: '#f8fafc'}}>{formatArcAssetBalance(myArcAsset.balanceWei)}</div>
                                        <div style={{fontSize: '0.85rem', color: '#94a3b8'}}>Fungible lab token</div>
                                        <button
                                            type="button"
                                            onClick={() => openSendCardForAsset('arc')}
                                            disabled={!canSendArc}
                                            style={{
                                                marginTop: '0.5rem',
                                                padding: '0.3rem 0.55rem',
                                                background: canSendArc ? '#16a34a' : '#475569',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '0.35rem',
                                                fontSize: '0.75rem',
                                                fontWeight: 700,
                                                cursor: canSendArc ? 'pointer' : 'not-allowed'
                                            }}
                                        >
                                            Send ARC
                                        </button>
                                    </div>
                                </div>
                                )}
                                {myNftAssets.length > 0 && (
                                <div>
                                    <div style={{fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem'}}>NFTs ({myNftAssets.length})</div>
                                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(74px, 1fr))', gap: '0.5rem'}}>
                                        {myNftAssets.map((n) => (
                                            <div key={n.tokenId} title={n.name || ('Token #' + n.tokenId)} style={{textAlign: 'center'}}>
                                                {n.image
                                                    ? <img src={navAssetImg(n.image)} alt={n.name || ''} style={{width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '0.4rem', background: '#0f172a', border: '1px solid #334155'}} />
                                                    : <div style={{width: '100%', aspectRatio: '1', borderRadius: '0.4rem', background: '#0f172a', border: '1px solid #334155'}} />}
                                                <div style={{fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.2rem'}}>#{n.tokenId}</div>
                                                <button
                                                    type="button"
                                                    onClick={() => openSendCardForAsset('nft', n.tokenId)}
                                                    style={{
                                                        marginTop: '0.25rem',
                                                        width: '100%',
                                                        padding: '0.22rem 0.3rem',
                                                        background: '#334155',
                                                        color: '#e2e8f0',
                                                        border: '1px solid #475569',
                                                        borderRadius: '0.3rem',
                                                        fontSize: '0.65rem',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Send
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                )}
                            </div>
                            )}
                        </section>

                        {/* Send Transaction */}
                        <section className="card" id="send-section">
                            <button type="button" className="live-page-block-header" onClick={() => toggleLivePageBlock('sendCard')}>
                                <h3>📤 Send Transaction</h3>
                                <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{livePageBlocksOpen.sendCard ? '▼' : '▶'}</span>
                            </button>
                            {livePageBlocksOpen.sendCard && (
                            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: 0}}>
                                <div>
                                    <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1'}}>
                                        Recipient Address
                                    </label>
                                    {(() => {
                                        const classmates = validators.filter(v => v && typeof v === 'string' && v.toLowerCase() !== (wallet.address || '').toLowerCase());
                                        return classmates.length > 0 ? (
                                            <select
                                                value=""
                                                onChange={e => { if (e.target.value) setRecipient(e.target.value); }}
                                                style={{width: '100%', marginBottom: '0.5rem'}}
                                            >
                                                <option value="">📇 Send to a classmate ({classmates.length} active)…</option>
                                                {classmates.map(v => {
                                                    const nick = nicknames[v.toLowerCase()];
                                                    return <option key={v} value={v}>{nick ? `${nick} — ` : ''}{v.slice(0,6)}…{v.slice(-4)}</option>;
                                                })}
                                            </select>
                                        ) : null;
                                    })()}
                                <input
                                        placeholder="0x... or pick a classmate above"
                                    value={recipient}
                                    onChange={e => setRecipient(e.target.value)}
                                        list="classmate-addrs"
                                        style={{width: '100%'}}
                                    />
                                    <datalist id="classmate-addrs">
                                        {validators.filter(v => v && typeof v === 'string' && v.toLowerCase() !== (wallet.address || '').toLowerCase()).map(v => {
                                            const nick = nicknames[v.toLowerCase()];
                                            return <option key={v} value={v}>{nick || ''}</option>;
                                        })}
                                    </datalist>
                                </div>
                                
                                <div>
                                    <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1'}}>
                                        Asset
                                    </label>
                                    <select
                                        value={sendAssetType}
                                        onChange={e => {
                                            setSendAssetType(e.target.value);
                                            if (e.target.value === 'nft' && !sendNftTokenId && myNftAssets[0]?.tokenId) {
                                                setSendNftTokenId(String(myNftAssets[0].tokenId));
                                            }
                                        }}
                                        style={{width: '100%'}}
                                    >
                                        <option value="eth">Ethereum (ETH)</option>
                                        <option value="arc" disabled={!canSendArc}>Arcade Token (ARC){canSendArc ? ` — ${formatArcAssetBalance(myArcAsset.balanceWei)}` : ''}</option>
                                        <option value="nft" disabled={!canSendNft}>Lab NFT{canSendNft ? ` — ${myNftAssets.length} owned` : ''}</option>
                                    </select>
                                </div>

                                {sendAssetType === 'nft' ? (
                                <div>
                                    <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1'}}>
                                        NFT
                                    </label>
                                    <select
                                        value={sendNftTokenId}
                                        onChange={e => setSendNftTokenId(e.target.value)}
                                        style={{width: '100%'}}
                                    >
                                        {myNftAssets.map((n) => (
                                            <option key={n.tokenId} value={n.tokenId}>
                                                #{n.tokenId}{n.name ? ` — ${n.name}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <div style={{fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.4rem'}}>
                                        Sends exactly one ERC-721 token from your cached asset list.
                                    </div>
                                </div>
                                ) : (
                                <div>
                                    <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1'}}>
                                        Amount ({sendAssetType === 'arc' ? 'ARC' : 'ETH'})
                                    </label>
                                    <input
                                        placeholder={sendAssetType === 'arc' ? '1' : '0.0'}
                                        type="number"
                                        min={sendAssetType === 'arc' ? '1' : '0'}
                                        step={sendAssetType === 'arc' ? '1' : '0.01'}
                                        value={sendAmount}
                                        onChange={e => setSendAmount(e.target.value)}
                                        style={{width: '100%'}}
                                    />
                                    <div style={{fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.4rem'}}>
                                        {sendAssetType === 'arc'
                                            ? `Available: ${formatArcAssetBalance(myArcAsset.balanceWei)}. ARC sends must be whole tokens.`
                                            : `Available: ${parseFloat(wallet.balance || 0).toFixed(4)} ETH`}
                                    </div>
                                </div>
                                )}
                                
                                <button 
                                    onClick={sendAssetToPeer}
                                    disabled={isSendingDashboardAsset || !recipient || (sendAssetType !== 'nft' && !sendAmount) || (sendAssetType === 'nft' && !sendNftTokenId) || (sendAssetType === 'arc' && !canSendArc) || (sendAssetType === 'nft' && !canSendNft)}
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        background: (isSendingDashboardAsset || !recipient || (sendAssetType !== 'nft' && !sendAmount) || (sendAssetType === 'nft' && !sendNftTokenId) || (sendAssetType === 'arc' && !canSendArc) || (sendAssetType === 'nft' && !canSendNft)) ? '#64748b' : '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        fontSize: '1rem',
                                        fontWeight: 'bold',
                                        cursor: (isSendingDashboardAsset || !recipient || (sendAssetType !== 'nft' && !sendAmount) || (sendAssetType === 'nft' && !sendNftTokenId) || (sendAssetType === 'arc' && !canSendArc) || (sendAssetType === 'nft' && !canSendNft)) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {isSendingDashboardAsset ? "⏳ Sending..." : `📤 Send ${sendAssetType === 'arc' ? 'ARC' : sendAssetType === 'nft' ? 'NFT' : 'ETH'}`}
                                </button>
                            </div>
                            )}
                        </section>

                        {/* Transaction History */}
                        <section className="card full-width">
                            <button
                                type="button"
                                className="live-page-block-header"
                                onClick={() => toggleLivePageBlock('txHistoryCard')}
                            >
                                <h3>📜 Transaction History</h3>
                                <span style={{fontSize: '0.9rem', color: '#94a3b8'}}>{livePageBlocksOpen.txHistoryCard ? '▼' : '▶'}</span>
                            </button>
                            {livePageBlocksOpen.txHistoryCard && (
                            <div style={{marginTop: '1rem'}}>
                                {txHistory.length === 0 ? (
                                    <div style={{textAlign: 'center', padding: '2rem', color: '#64748b'}}>
                                        No transactions yet. Send or receive ETH to see your history here.
                                    </div>
                                ) : (
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                                        {txHistory.map((tx, idx) => (
                                            <div key={idx} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '1rem',
                                                background: tx.type === 'sent' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                                                borderLeft: `4px solid ${tx.type === 'sent' ? '#ef4444' : '#22c55e'}`,
                                                borderRadius: '0.5rem'
                                            }}>
                                                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '50%',
                                                        background: tx.type === 'sent' ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '1.2rem'
                                                    }}>
                                                        {tx.type === 'sent' ? '📤' : '📥'}
                                                    </div>
                                                    <div>
                                                        <div style={{fontWeight: 'bold', color: '#f8fafc'}}>
                                                            {tx.label || (tx.type === 'sent' ? 'Sent' : 'Received')}
                                                        </div>
                                                        <div style={{fontSize: '0.85rem', color: '#94a3b8', fontFamily: 'monospace'}}>
                                                            {tx.type === 'sent' 
                                                              ? `To: ${tx.to?.slice(0,6)}...${tx.to?.slice(-4)}` 
                                                              : `From: ${tx.from?.slice(0,6)}...${tx.from?.slice(-4)}`}
                                                        </div>
                                                        <div style={{fontSize: '0.75rem', color: '#64748b'}}>
                                                            Block #{tx.blockNumber} • {new Date(tx.timestamp * 1000).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{textAlign: 'right'}}>
                                                    <div style={{
                                                        fontWeight: 'bold',
                                                        fontSize: '1.1rem',
                                                        color: tx.type === 'sent' ? '#fca5a5' : '#86efac'
                                                    }}>
                                                        {tx.assetType === 'erc721'
                                                            ? `NFT #${tx.tokenId || ''}`
                                                            : `${tx.type === 'sent' ? '-' : '+'}${parseFloat(tx.value || 0).toFixed(4)} ${tx.assetSymbol || 'ETH'}`}
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(tx.hash);
                                                            setStatusMsg(`Copied tx hash: ${tx.hash.slice(0,10)}...`);
                                                            setTimeout(() => setStatusMsg(''), 2000);
                                                        }}
                                                        style={{
                                                            background: 'transparent',
                                                            border: '1px solid #475569',
                                                            color: '#94a3b8',
                                                            padding: '0.25rem 0.5rem',
                                                            borderRadius: '0.25rem',
                                                            fontSize: '0.75rem',
                                                            cursor: 'pointer',
                                                            marginTop: '0.25rem'
                                                        }}
                                                    >
                                                        📋 Copy Hash
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            )}
                        </section>

                        {/* Global Chat */}
                        <section className="card full-width">
                            <button type="button" className="live-page-block-header" onClick={() => toggleLivePageBlock('classChat')}>
                                <h3>💬 Class Chat</h3>
                                <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{livePageBlocksOpen.classChat ? '▼' : '▶'}</span>
                            </button>
                            {livePageBlocksOpen.classChat && (
                            <>
                            <div className="chat-window">
                                {messages.length === 0 ? (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: '100%',
                                        color: '#64748b',
                                        textAlign: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <span style={{fontSize: '2rem'}}>💬</span>
                                        <span>No messages yet</span>
                                        <span style={{fontSize: '0.8rem', color: '#475569'}}>
                                            Be the first to say hello!
                                        </span>
                                    </div>
                                ) : (
                                    messages
                                        .filter(msg => !msg.text || !msg.text.startsWith('[ARTIFACT:'))
                                        .map((msg, i) => (
                                        <div key={i} className={`msg ${msg.sender === wallet.address ? 'my-msg' : ''}`}>
                                            <div className="msg-header">
                                                <span className="sender-name" onClick={() => {setRecipient(msg.sender); copyAddress(msg.sender)}}>
                                                    {msg.sender.slice(0,6)}
                                                </span>
                                                <span className="time">{new Date(msg.timestamp * 1000).toLocaleTimeString()}</span>
                                            </div>
                                            {msg.text}
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="input-group">
                                <input 
                                    placeholder="Type message..."
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                                    disabled={!wallet.signer}
                                />
                                <button 
                                    onClick={() => sendChatMessage()}
                                    disabled={!wallet.signer || !chatInput.trim()}
                                    style={{
                                        opacity: (!wallet.signer || !chatInput.trim()) ? 0.5 : 1,
                                        cursor: (!wallet.signer || !chatInput.trim()) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Post
                                </button>
                            </div>
                            {!wallet.signer && (
                                <p style={{fontSize: '0.8rem', color: '#f59e0b', margin: '0.5rem 0 0 0'}}>
                                    ⚠️ Wallet loading... please wait
                                </p>
                            )}
                            </>
                            )}
                        </section>

                        {/* Chain Explorer — kept visible so students can explore the chain */}
                        <section className="card full-width">
                            <h3 style={{ marginBottom: '0.6rem' }}>🔎 Chain Explorer</h3>
                            <ChainExplorer provider={provider} rpcUrl={rpcUrl} signer={wallet?.signer} cacheOnly />
                        </section>

                        {/* Connection Setup — config only, collapsed at the very bottom */}
                        <section className="card">
                            <button type="button" className="live-page-block-header" onClick={() => toggleLivePageBlock('connectionCard')}>
                                <h3>⚙️ Connection Setup</h3>
                                <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{livePageBlocksOpen.connectionCard ? '▼' : '▶'}</span>
                            </button>
                            {livePageBlocksOpen.connectionCard && (
                            <>
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 0.75rem 0' }}>
                                These auto-configure — you normally don’t need to change them.
                            </p>
                            {isRemote && (
                                <div className="remote-warning">
                                    📡 Remote Access Detected - Configure your connection below
                                </div>
                            )}
                            <div className="config-field">
                                <label>Class chat contract (PoS Simulator — not a wallet):</label>
                                <input
                                    placeholder="0x..."
                                    value={posAddress}
                                    onChange={e => {
                                        setPosAddress(e.target.value);
                                    }}
                                />
                            </div>
                            <div className="config-field">
                                <label>Blockchain RPC URL:</label>
                                <input
                                    placeholder={defaultRpcUrl}
                                    value={rpcUrl}
                                    onChange={e => {
                                        const v = normalizeBrowserRpcUrl(e.target.value);
                                        setRpcUrl(v);
                                    }}
                                />
                                {isRemote && (
                                    <small className="config-hint">
                                        💡 Ask instructor for the write RPC URL if the auto-detected same-origin proxy does not work. Classroom browsers should use the shared app path ending in <code>/rpc-write</code>; reads come from the cache endpoints.
                                    </small>
                                )}
                            </div>
                            <div className="connection-status">
                                {nodeStatus.connected ? (
                                    <span className="status-ok">✅ Connected to blockchain</span>
                                ) : (
                                    <span className="status-error">❌ Not connected - check RPC URL</span>
                                )}
                            </div>
                            </>
                            )}
                        </section>
                    </div>
                    
                    {/* ========== EVIDENCE / ARTIFACTS (scenario clues) ========== */}
                    {(artifacts.length > 0 || myStake.role) && (
                    <div style={{
                        marginTop: '2rem',
                        padding: '1.5rem',
                        background: '#1e293b',
                        borderRadius: '1rem',
                        border: '1px solid #334155'
                    }}>
                        <button
                            type="button"
                            className="live-page-block-header"
                            onClick={() => toggleLivePageBlock('evidenceSection')}
                            style={{ marginBottom: livePageBlocksOpen.evidenceSection ? '0.5rem' : 0, color: '#f8fafc' }}
                        >
                            <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>📂 Evidence &amp; Artifacts</span>
                            <span style={{ color: '#94a3b8' }}>{livePageBlocksOpen.evidenceSection ? '▼' : '▶'}</span>
                        </button>
                        {livePageBlocksOpen.evidenceSection && (
                        <>
                        <button
                            type="button"
                            onClick={() => setArtifactsOpen(!artifactsOpen)}
                            style={{
                                width: '100%',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'transparent',
                                border: 'none',
                                color: '#f8fafc',
                                fontSize: '1.1rem',
                                cursor: 'pointer',
                                padding: '0.5rem 0'
                            }}
                        >
                            <span>Artifact list {artifacts.length > 0 && <span style={{fontSize: '0.8rem', color: '#94a3b8'}}>({artifacts.length})</span>}</span>
                            <span>{artifactsOpen ? '▼' : '▶'}</span>
                        </button>
                        {artifactsOpen && (
                            <div style={{marginTop: '1rem'}}>
                                <p style={{fontSize: '0.9rem', color: '#94a3b8', marginBottom: '0.75rem'}}>
                                    <strong style={{color: '#e2e8f0'}}>{"What this is: "}</strong>
                                    {"Your instructor posts clues in class chat using "}
                                    <code style={{background: '#334155', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.8rem'}}>[ARTIFACT:...]</code>
                                    {". Those messages appear here so you can review them together."}
                                </p>
                                <p style={{fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem'}}>
                                    <strong>{"Ransomware / investigations: "}</strong>
                                    {"Your instructor may post ledger hints or hashes to trace on-chain flow. "}
                                    <strong>{"Other scenarios: "}</strong>
                                    {"Use artifacts as in-character clues for role-play labs."}
                                </p>
                                {artifacts.length === 0 ? (
                                    <div style={{padding: '1rem', background: '#0f172a', borderRadius: '0.5rem', color: '#64748b', fontSize: '0.9rem'}}>
                                        No artifacts yet. Your instructor will post clues in chat as the scenario unfolds.
                                    </div>
                                ) : (
                                    <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                                        {artifacts.map((a, i) => (
                                            <div key={i} style={{
                                                padding: '1rem',
                                                background: '#0f172a',
                                                borderRadius: '0.5rem',
                                                border: '1px solid #334155',
                                                fontSize: '0.9rem',
                                                color: '#e2e8f0'
                                            }}>
                                                <div style={{fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem'}}>
                                                    Artifact #{i + 1} · {new Date(a.timestamp * 1000).toLocaleString()}
                                                </div>
                                                {a.content}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        </>
                        )}
                    </div>
                    )}

                    {statusMsg && (
                        <div className="status-footer" style={{
                            background: statusMsg.includes('❌') ? 'rgba(239, 68, 68, 0.2)' : 
                                       statusMsg.includes('✅') ? 'rgba(34, 197, 94, 0.2)' :
                                       statusMsg.includes('⚠️') ? 'rgba(251, 191, 36, 0.2)' :
                                       'rgba(59, 130, 246, 0.2)',
                            borderColor: statusMsg.includes('❌') ? 'rgba(239, 68, 68, 0.4)' : 
                                        statusMsg.includes('✅') ? 'rgba(34, 197, 94, 0.4)' :
                                        statusMsg.includes('⚠️') ? 'rgba(251, 191, 36, 0.4)' :
                                        'rgba(59, 130, 246, 0.4)'
                        }}>
                            {statusMsg}
                        </div>
                    )}

                    {showLiveHelp && (
                        <div 
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0,0,0,0.9)',
                                zIndex: 10000,
                                overflow: 'auto',
                                padding: '2rem'
                            }}
                            onClick={() => setShowLiveHelp(false)}
                        >
                            <div 
                                style={{
                                    maxWidth: '900px',
                                    margin: '0 auto',
                                    background: '#1e293b',
                                    borderRadius: '1rem',
                                    padding: '2rem',
                                    border: '2px solid #3b82f6'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                                    <h2 style={{margin: 0, color: '#f8fafc', fontSize: '1.5rem'}}>📖 Live Network Guide</h2>
                                    <button
                                        onClick={() => setShowLiveHelp(false)}
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.2)',
                                            border: '1px solid rgba(239, 68, 68, 0.4)',
                                            color: '#fca5a5',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '0.5rem',
                                            cursor: 'pointer',
                                            fontSize: '1rem'
                                        }}
                                    >
                                        ✕ Close
                                    </button>
                                </div>
                                
                                <p style={{color: '#94a3b8', marginBottom: '2rem', fontSize: '1rem', lineHeight: 1.6}}>
                                    Welcome to the Live Network! This is your hands-on blockchain experience where you can send real transactions, 
                                    stake ETH, and interact with classmates.
                                </p>
                                
                                {/* Feature Guide Sections */}
                                <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                                    
                                    {/* Wallet Header */}
                                    <div style={{background: 'rgba(59, 130, 246, 0.1)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(59, 130, 246, 0.3)'}}>
                                        <h3 style={{color: '#60a5fa', margin: '0 0 0.75rem 0', fontSize: '1.1rem'}}>💳 Wallet Header (Blue Section)</h3>
                                        <ul style={{color: '#cbd5e1', margin: 0, paddingLeft: '1.25rem', lineHeight: 1.8}}>
                                            <li><strong>Connection Status:</strong> Shows if you're connected to the blockchain and the current block number</li>
                                            <li><strong>Your Nickname:</strong> Your display name visible to classmates</li>
                                            <li><strong>Your Address:</strong> Your unique blockchain address (like an account number)</li>
                                            <li><strong>Balance:</strong> How much ETH you have in your wallet</li>
                                            <li><strong>📋 Copy:</strong> Copy your address to share with others</li>
                                            <li><strong>⚙️ Account:</strong> View your account details</li>
                                        </ul>
                                    </div>
                                    
                                    {/* Wallet Funding */}
                                    <div style={{background: 'rgba(16, 185, 129, 0.1)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(16, 185, 129, 0.3)'}}>
                                        <h3 style={{color: '#34d399', margin: '0 0 0.75rem 0', fontSize: '1.1rem'}}>💰 Wallet Funding</h3>
                                        <ul style={{color: '#cbd5e1', margin: 0, paddingLeft: '1.25rem', lineHeight: 1.8}}>
                                            <li><strong>Top off:</strong> Add test ETH to your active wallet from the class bank.</li>
                                            <li><strong>Copy:</strong> Copy your wallet address to share with classmates.</li>
                                            <li><strong>New:</strong> Create another local wallet. Cancel closes the prompt without creating one.</li>
                                        </ul>
                                    </div>
                                    
                                    {/* Send ETH */}
                                    <div style={{background: 'rgba(139, 92, 246, 0.1)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(139, 92, 246, 0.3)'}}>
                                        <h3 style={{color: '#a78bfa', margin: '0 0 0.75rem 0', fontSize: '1.1rem'}}>📤 Send ETH Section</h3>
                                        <ul style={{color: '#cbd5e1', margin: 0, paddingLeft: '1.25rem', lineHeight: 1.8}}>
                                            <li><strong>Recipient Address:</strong> Paste the address of who you want to send ETH to</li>
                                            <li><strong>Amount:</strong> Enter how much ETH to send</li>
                                            <li><strong>Send Button:</strong> Executes the transaction on the blockchain</li>
                                            <li><em>Tip: Click a classmate's name in the sidebar to auto-fill their address!</em></li>
                                        </ul>
                                    </div>
                                    
                                    {/* Transaction History */}
                                    <div style={{background: 'rgba(236, 72, 153, 0.1)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(236, 72, 153, 0.3)'}}>
                                        <h3 style={{color: '#f472b6', margin: '0 0 0.75rem 0', fontSize: '1.1rem'}}>📜 Transaction History</h3>
                                        <ul style={{color: '#cbd5e1', margin: 0, paddingLeft: '1.25rem', lineHeight: 1.8}}>
                                            <li><strong>Sent/Received:</strong> Shows all your incoming and outgoing transactions</li>
                                            <li><strong>Block Number:</strong> Which block the transaction was included in</li>
                                            <li><strong>Copy Hash:</strong> Copy the transaction ID to look it up</li>
                                            <li><em>This is your permanent, immutable record on the blockchain!</em></li>
                                        </ul>
                                    </div>
                                    
                                    {/* Class Chat */}
                                    <div style={{background: 'rgba(6, 182, 212, 0.1)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(6, 182, 212, 0.3)'}}>
                                        <h3 style={{color: '#22d3ee', margin: '0 0 0.75rem 0', fontSize: '1.1rem'}}>💬 Class Chat</h3>
                                        <ul style={{color: '#cbd5e1', margin: 0, paddingLeft: '1.25rem', lineHeight: 1.8}}>
                                            <li><strong>Messages:</strong> Chat messages from all classmates</li>
                                            <li><strong>Click Names:</strong> Click a sender's name to copy their address</li>
                                            <li><strong>Post Message:</strong> Send a message that gets recorded on the blockchain</li>
                                            <li><em>Every message is a real blockchain transaction!</em></li>
                                        </ul>
                                    </div>
                                    
                                    {/* Sidebar */}
                                    <div style={{background: 'rgba(100, 116, 139, 0.2)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid rgba(100, 116, 139, 0.4)'}}>
                                        <h3 style={{color: '#94a3b8', margin: '0 0 0.75rem 0', fontSize: '1.1rem'}}>📋 Left Sidebar</h3>
                                        <ul style={{color: '#cbd5e1', margin: 0, paddingLeft: '1.25rem', lineHeight: 1.8}}>
                                            <li><strong>Connection Status:</strong> Green = connected, Red = disconnected</li>
                                            <li><strong>Your Account:</strong> Copy address, top off test ETH, or create wallets</li>
                                            <li><strong>Your Nickname:</strong> Set how you appear to classmates</li>
                                            <li><strong>Classmates List:</strong> See who's in the class - click to send them ETH</li>
                                            <li><strong>🧪 Diagnostics:</strong> Troubleshoot connection issues</li>
                                        </ul>
                                    </div>
                                    
                                </div>
                                
                                <div style={{marginTop: '2rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.5rem', textAlign: 'center'}}>
                                    <p style={{color: '#93c5fd', margin: 0, fontSize: '0.9rem'}}>
                                        💡 <strong>Pro Tip:</strong> Click anywhere outside this guide to close it, or press the ✕ button above.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 3b. DIAGNOSTICS VIEW */}
            {view === 'diagnostics' && (
                <DiagnosticsView
                    rpcUrl={rpcUrl}
                    provider={provider}
                    wallet={wallet}
                    posAddress={posAddress}
                    PoSABI={PoSABI}
                />
            )}
            
            {/* CLI LABS VIEW */}
            {view === 'cli' && (
                <CLILabsView isInstructor={isInstructor} rpcUrl={rpcUrl} terminalRpcUrl={terminalRpcUrl} terminalEnabled={labTerminalEnabled} />
            )}
            
            {/* INSTRUCTOR VIEW */}
            {view === 'instructor' && (
                <div className="instructor-view">
                    {!posAddress && (
                        <div className="instructor-setup">
                            <h2>🎓 Instructor Dashboard Setup</h2>
                            <div className="setup-card">
                                <label>Enter PoS Contract Address:</label>
                                <input 
                                    placeholder="0x..." 
                                    value={posAddress}
                                    onChange={e => {
                                        setPosAddress(e.target.value);
                                    }}
                                />
                                <small>This address was displayed when you ran the deployment script</small>
                                <small>Also saved in CONTRACT_ADDRESS.txt</small>
                            </div>
                        </div>
                    )}
                    {posAddress && (
                        <InstructorView 
                            provider={provider}
                            posAddress={posAddress}
                            rpcUrl={rpcUrl}
                            wallet={wallet}
                            onOpenTerminal={() => openLabTerminal(rpcUrl, terminalRpcUrl)}
                        />
                    )}
                </div>
            )}

            {/* BEACON CHAIN LAB */}
            {view === 'beacon-lab' && (
                <ErrorBoundary>
                    <BeaconChainLabView provider={provider} wallet={wallet} rpcUrl={rpcUrl} />
                </ErrorBoundary>
            )}
            {view === 'contract-builder-lab' && (
                <ErrorBoundary>
                    <ContractBuilderLabView provider={provider} wallet={wallet} rpcUrl={rpcUrl} terminalRpcUrl={terminalRpcUrl} terminalEnabled={labTerminalEnabled} fireProgressBeacon={fireProgressBeacon} />
                </ErrorBoundary>
            )}
            {view === 'tokenization-lab' && (
                <ErrorBoundary>
                    <TokenizationLabView provider={provider} wallet={wallet} rpcUrl={rpcUrl} fireProgressBeacon={fireProgressBeacon} />
                </ErrorBoundary>
            )}
            {view === 'arcade-lab' && (
                <ErrorBoundary>
                    <ArcadeLabView provider={provider} wallet={wallet} rpcUrl={rpcUrl} fireProgressBeacon={fireProgressBeacon} />
                </ErrorBoundary>
            )}
            {view === 'nft-marketplace' && (
                <ErrorBoundary>
                    <MarketplaceView provider={provider} wallet={wallet} rpcUrl={rpcUrl} />
                </ErrorBoundary>
            )}
            {view === 'forensics-lab' && (
                <ErrorBoundary>
                    <LabDetailView
                        lab={getLabById('ransomware-investigation')}
                        onBack={() => setView('live')}
                        basePath={typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL.replace(/\/$/, '') : ''}
                        studentOnly={!isInstructor}
                    />
                </ErrorBoundary>
            )}
        </main>
                    {/* New Wallet Credentials Modal - copyable address & private key */}
                    {newWalletModal && (
                        <div
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0,0,0,0.85)',
                                zIndex: 10001,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '2rem'
                            }}
                            onClick={() => setNewWalletModal(null)}
                        >
                            <div
                                style={{
                                    background: '#1e293b',
                                    borderRadius: '1rem',
                                    padding: '1.5rem 2rem',
                                    border: '2px solid #3b82f6',
                                    maxWidth: '500px',
                                    width: '100%'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3 style={{ margin: '0 0 1rem 0', color: '#f8fafc', fontSize: '1.25rem' }}>
                                    ✅ New Wallet Created
                                </h3>
                                <p style={{ color: '#94a3b8', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                    Save these credentials. You need the private key to access this wallet later.
                                </p>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.35rem'}}>Address</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <input
                                            readOnly
                                            value={newWalletModal.address}
                                            style={{
                                                flex: 1,
                                                padding: '0.5rem',
                                                background: 'rgba(0,0,0,0.3)',
                                                border: '1px solid rgba(59, 130, 246, 0.4)',
                                                borderRadius: '0.35rem',
                                                color: '#f1f5f9',
                                                fontFamily: 'monospace',
                                                fontSize: '0.85rem'
                                            }}
                                        />
                                        <button
                                            onClick={async () => { await copyToClipboard(newWalletModal.address); }}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                background: 'rgba(59, 130, 246, 0.3)',
                                                border: '1px solid rgba(59, 130, 246, 0.5)',
                                                borderRadius: '0.35rem',
                                                color: '#93c5fd',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            📋 Copy
                                        </button>
                                    </div>
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{display: 'block', color: '#fbbf24', fontSize: '0.8rem', marginBottom: '0.35rem'}}>⚠️ Private Key (NEVER share)</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <input
                                            readOnly
                                            value={newWalletModal.privateKey}
                                            style={{
                                                flex: 1,
                                                padding: '0.5rem',
                                                background: 'rgba(0,0,0,0.3)',
                                                border: '1px solid rgba(251, 191, 36, 0.4)',
                                                borderRadius: '0.35rem',
                                                color: '#f1f5f9',
                                                fontFamily: 'monospace',
                                                fontSize: '0.85rem'
                                            }}
                                        />
                                        <button
                                            onClick={async () => { await copyToClipboard(newWalletModal.privateKey); }}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                background: 'rgba(251, 191, 36, 0.2)',
                                                border: '1px solid rgba(251, 191, 36, 0.5)',
                                                borderRadius: '0.35rem',
                                                color: '#fcd34d',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            📋 Copy
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setNewWalletModal(null)}
                                    style={{
                                        width: '100%',
                                        padding: '0.6rem',
                                        background: 'rgba(34, 197, 94, 0.2)',
                                        border: '1px solid rgba(34, 197, 94, 0.5)',
                                        borderRadius: '0.35rem',
                                        color: '#86efac',
                                        cursor: 'pointer',
                                        fontSize: '1rem'
                                    }}
                                >
                                    Got it — I've saved my credentials
                                </button>
                            </div>
                        </div>
                    )}

                    {accountModal && (
                        <div
                            style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0,0,0,0.85)',
                                zIndex: 10001,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '2rem'
                            }}
                            onClick={() => setAccountModal(null)}
                        >
                            <div
                                style={{
                                    background: '#1e293b',
                                    borderRadius: '1rem',
                                    padding: '1.5rem 2rem',
                                    border: '2px solid #3b82f6',
                                    maxWidth: '500px',
                                    width: '100%'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3 style={{ margin: '0 0 1rem 0', color: '#f8fafc', fontSize: '1.25rem' }}>
                                    📋 Your Account
                                </h3>
                                <p style={{ color: '#94a3b8', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                    {accountModal.nickname ? `${accountModal.nickname} — share` : 'Share'} this address with classmates so they can send you ETH or interact with you on-chain.
                                </p>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{display: 'block', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.35rem'}}>Address</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <input
                                            readOnly
                                            value={accountModal.address}
                                            onFocus={(e) => e.target.select()}
                                            style={{
                                                flex: 1,
                                                padding: '0.5rem',
                                                background: 'rgba(0,0,0,0.3)',
                                                border: '1px solid rgba(59, 130, 246, 0.4)',
                                                borderRadius: '0.35rem',
                                                color: '#f1f5f9',
                                                fontFamily: 'monospace',
                                                fontSize: '0.85rem'
                                            }}
                                        />
                                        <button
                                            onClick={() => copyAddress(accountModal.address)}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                background: 'rgba(59, 130, 246, 0.3)',
                                                border: '1px solid rgba(59, 130, 246, 0.5)',
                                                borderRadius: '0.35rem',
                                                color: '#93c5fd',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            📋 Copy
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setAccountModal(null)}
                                    style={{
                                        width: '100%',
                                        padding: '0.6rem',
                                        background: 'rgba(34, 197, 94, 0.2)',
                                        border: '1px solid rgba(34, 197, 94, 0.5)',
                                        borderRadius: '0.35rem',
                                        color: '#86efac',
                                        cursor: 'pointer',
                                        fontSize: '1rem'
                                    }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Help Guide Overlay */}
        {topOffMiningModal}
    </div>
  )
}

export default App
