// Web3Modal instance
let web3Modal;
let provider;
let web3;
let stakingContract;
let tokenContract;

// Contract addresses (to be replaced with actual addresses)
const STAKING_CONTRACT_ADDRESS = "YOUR_STAKING_CONTRACT_ADDRESS";
const TOKEN_CONTRACT_ADDRESS = "YOUR_TOKEN_CONTRACT_ADDRESS";

// ABI (to be replaced with actual ABI)
const STAKING_ABI = [
    // Example ABI - Replace with actual contract ABI
    "function totalStaked() view returns (uint256)",
    "function getAPY() view returns (uint256)",
    "function getUnclaimedRewards(address) view returns (uint256)",
    "function getLockTime(address) view returns (uint256)",
    "function stake(uint256) returns (bool)",
    "function withdraw(uint256) returns (bool)",
    "function claimRewards() returns (bool)"
];

const TOKEN_ABI = [
    // Example ABI - Replace with actual token ABI
    "function approve(address spender, uint256 amount) returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)"
];

async function init() {
    const providerOptions = {
        walletconnect: {
            package: WalletConnectProvider,
            options: {
                rpc: {
                    56: 'https://bsc-dataseed.binance.org/'
                },
                chainId: 56,
                network: "binance"
            }
        }
    };

    web3Modal = new Web3Modal.default({
        cacheProvider: false,
        providerOptions,
        theme: {
            background: "rgb(10, 18, 41)",
            main: "rgb(199, 199, 199)",
            secondary: "rgb(136, 136, 136)",
            border: "rgba(255, 255, 255, 0.14)",
            hover: "rgb(16, 26, 32)"
        }
    });

    // Check if already connected
    if (localStorage.getItem('isWalletConnected') === 'true') {
        connectWallet();
    }
}

async function connectWallet() {
    try {
        provider = await web3Modal.connect();
        web3 = new Web3(provider);

        // Get connected chain id
        const chainId = await web3.eth.getChainId();
        
        if (chainId !== 56) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x38' }], // BSC Mainnet
                });
            } catch (switchError) {
                // This error code indicates that the chain has not been added to MetaMask
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x38',
                                chainName: 'Binance Smart Chain',
                                nativeCurrency: {
                                    name: 'BNB',
                                    symbol: 'BNB',
                                    decimals: 18
                                },
                                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                                blockExplorerUrls: ['https://bscscan.com/']
                            }]
                        });
                    } catch (addError) {
                        console.error("Failed to add BSC network:", addError);
                        alert("Please add Binance Smart Chain network to your wallet manually");
                        return;
                    }
                }
                console.error("Failed to switch network:", switchError);
                alert("Please switch to Binance Smart Chain network");
                return;
            }
        }

        const accounts = await web3.eth.getAccounts();
        const userAddress = accounts[0];

        // Initialize contracts
        stakingContract = new web3.eth.Contract(STAKING_ABI, STAKING_CONTRACT_ADDRESS);
        tokenContract = new web3.eth.Contract(TOKEN_ABI, TOKEN_CONTRACT_ADDRESS);

        // Update UI
        const walletBtn = document.getElementById('connectWallet');
        walletBtn.textContent = `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;
        walletBtn.classList.add('connected');

        localStorage.setItem('isWalletConnected', 'true');
        
        // Load staking data
        await updateStakingInfo(userAddress);
        setupEventListeners();
        setupProviderEvents();

    } catch (error) {
        console.error("Could not connect to wallet:", error);
        localStorage.setItem('isWalletConnected', 'false');
    }
}

async function updateStakingInfo(userAddress) {
    try {
        // Get total staked
        const totalStaked = await stakingContract.methods.totalStaked().call();
        document.getElementById('totalStaked').textContent = 
            `${parseFloat(web3.utils.fromWei(totalStaked, 'ether')).toLocaleString()} LOTINU`;

        // Get APY
        const apy = await stakingContract.methods.getAPY().call();
        document.getElementById('apy').textContent = `${apy}%`;

        // Get unclaimed rewards
        const unclaimedRewards = await stakingContract.methods.getUnclaimedRewards(userAddress).call();
        document.getElementById('unclaimedTreats').textContent = 
            `${parseFloat(web3.utils.fromWei(unclaimedRewards, 'ether')).toLocaleString()} TREATS`;

        // Get lock timer
        const lockTime = await stakingContract.methods.getLockTime(userAddress).call();
        document.getElementById('lockTimer').textContent = formatLockTime(lockTime);

    } catch (error) {
        console.error("Error updating staking info:", error);
    }
}

function formatLockTime(timestamp) {
    if (timestamp === '0') return "No lock";
    const now = Math.floor(Date.now() / 1000);
    const diff = parseInt(timestamp) - now;
    if (diff <= 0) return "Unlocked";
    
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
}

function setupEventListeners() {
    // Approve button
    document.getElementById('approveBtn').addEventListener('click', async () => {
        try {
            const accounts = await web3.eth.getAccounts();
            const amount = document.getElementById('stakeAmount').value;
            if (!amount || amount <= 0) {
                alert("Please enter a valid amount");
                return;
            }
            
            const weiAmount = web3.utils.toWei(amount.toString(), 'ether');
            
            const tx = await tokenContract.methods.approve(STAKING_CONTRACT_ADDRESS, weiAmount)
                .send({ from: accounts[0] });
            
            if (tx.status) {
                alert("Approval successful! You can now stake your tokens.");
            }
        } catch (error) {
            console.error("Error approving tokens:", error);
            alert("Failed to approve tokens. Please try again.");
        }
    });

    // Claim rewards button
    document.getElementById('claimBtn').addEventListener('click', async () => {
        try {
            const accounts = await web3.eth.getAccounts();
            const tx = await stakingContract.methods.claimRewards()
                .send({ from: accounts[0] });
            
            if (tx.status) {
                alert("Rewards claimed successfully!");
                updateStakingInfo(accounts[0]);
            }
        } catch (error) {
            console.error("Error claiming rewards:", error);
            alert("Failed to claim rewards. Please try again.");
        }
    });

    // Withdraw button
    document.getElementById('withdrawBtn').addEventListener('click', async () => {
        try {
            const accounts = await web3.eth.getAccounts();
            const amount = document.getElementById('stakeAmount').value;
            if (!amount || amount <= 0) {
                alert("Please enter a valid amount");
                return;
            }
            
            const weiAmount = web3.utils.toWei(amount.toString(), 'ether');
            
            const tx = await stakingContract.methods.withdraw(weiAmount)
                .send({ from: accounts[0] });
            
            if (tx.status) {
                alert("Withdrawal successful!");
                updateStakingInfo(accounts[0]);
            }
        } catch (error) {
            console.error("Error withdrawing tokens:", error);
            alert("Failed to withdraw tokens. Please try again.");
        }
    });
}

function setupProviderEvents() {
    if (provider.on) {
        provider.on("accountsChanged", (accounts) => {
            if (accounts.length > 0) {
                updateStakingInfo(accounts[0]);
            } else {
                localStorage.setItem('isWalletConnected', 'false');
                window.location.reload();
            }
        });

        provider.on("chainChanged", () => {
            window.location.reload();
        });

        provider.on("disconnect", () => {
            localStorage.setItem('isWalletConnected', 'false');
            window.location.reload();
        });
    }
}

// Connect wallet button
document.getElementById('connectWallet').addEventListener('click', connectWallet);

// Initialize on page load
window.addEventListener('load', init);
