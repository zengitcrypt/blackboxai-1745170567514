// Web3Modal instance
let web3Modal;
let provider;
let web3;
let stakingContract;
let tokenContract;

// Contract addresses
const STAKING_CONTRACT_ADDRESS = "YOUR_STAKING_CONTRACT_ADDRESS";
const TOKEN_CONTRACT_ADDRESS = "0x597eeAF9ee81411734e64eb5053339d145f7c0F1"; // LOTINU Token Address

// Full ERC20 ABI
const TOKEN_ABI = [
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [{"name": "", "type": "string"}],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
];

async function init() {
    try {
        const ethereum = window.ethereum;
        
        if (!ethereum) {
            alert("Please install MetaMask or use a Web3-enabled browser");
            return;
        }

        web3 = new Web3(ethereum);
        console.log("Web3 initialized");

    } catch (error) {
        console.error("Initialization error:", error);
        alert("Failed to initialize Web3. Please try again.");
    }
}

async function connectWallet() {
    try {
        console.log("Connecting wallet...");
        
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const userAddress = accounts[0];
        console.log("Connected account:", userAddress);

        // Check network
        const chainId = await web3.eth.getChainId();
        console.log("Connected to chain:", chainId);
        
        if (chainId !== 56) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x38' }], // BSC Mainnet
                });
            } catch (error) {
                alert("Please switch to Binance Smart Chain network");
                return;
            }
        }

        // Initialize token contract
        tokenContract = new web3.eth.Contract(TOKEN_ABI, TOKEN_CONTRACT_ADDRESS);
        console.log("Token contract initialized");

        // Update UI
        const walletBtn = document.getElementById('connectWallet');
        walletBtn.textContent = `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;
        walletBtn.classList.add('connected');

        // Load wallet balance
        await updateWalletBalance(userAddress);
        
        // Set up automatic balance updates
        setInterval(() => updateWalletBalance(userAddress), 5000);

        // Setup event listeners
        setupEventListeners();

    } catch (error) {
        console.error("Connection error:", error);
        alert("Failed to connect wallet. Please try again.");
    }
}

async function updateWalletBalance(userAddress) {
    try {
        console.log("Fetching balance for:", userAddress);
        
        // Get token decimals
        const decimals = await tokenContract.methods.decimals().call();
        console.log("Token decimals:", decimals);

        // Get raw balance
        const balance = await tokenContract.methods.balanceOf(userAddress).call();
        console.log("Raw balance:", balance);

        // Format balance with correct decimals
        const formattedBalance = balance / (10 ** decimals);
        console.log("Formatted balance:", formattedBalance);

        // Update UI
        document.getElementById('walletBalance').textContent = 
            `${formattedBalance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            })} LOTINU`;

    } catch (error) {
        console.error("Error fetching balance:", error);
        document.getElementById('walletBalance').textContent = "Error loading balance";
    }
}

function setupEventListeners() {
    if (window.ethereum) {
        window.ethereum.on("accountsChanged", async (accounts) => {
            if (accounts.length > 0) {
                console.log("Account changed to:", accounts[0]);
                await updateWalletBalance(accounts[0]);
            } else {
                window.location.reload();
            }
        });

        window.ethereum.on("chainChanged", () => {
            console.log("Network changed, reloading...");
            window.location.reload();
        });

        window.ethereum.on("disconnect", () => {
            console.log("Wallet disconnected, reloading...");
            window.location.reload();
        });
    }
}

// Connect wallet button
document.getElementById('connectWallet').addEventListener('click', connectWallet);

// Initialize on page load
window.addEventListener('load', init);
