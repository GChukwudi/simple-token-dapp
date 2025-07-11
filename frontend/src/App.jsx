import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

// Contract ABI (you'll need to update this with your deployed contract's ABI)
const CONTRACT_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "_initialSupply", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "owner", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "spender", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "value", "type": "uint256"}
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "from", "type": "address"},
      {"indexed": true, "internalType": "address", "name": "to", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "value", "type": "uint256"}
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}, {"internalType": "address", "name": "", "type": "address"}],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_spender", "type": "address"}, {"internalType": "uint256", "name": "_value", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "success", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_to", "type": "address"}, {"internalType": "uint256", "name": "_value", "type": "uint256"}],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_to", "type": "address"}, {"internalType": "uint256", "name": "_value", "type": "uint256"}],
    "name": "transfer",
    "outputs": [{"internalType": "bool", "name": "success", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_from", "type": "address"}, {"internalType": "address", "name": "_to", "type": "address"}, {"internalType": "uint256", "name": "_value", "type": "uint256"}],
    "name": "transferFrom",
    "outputs": [{"internalType": "bool", "name": "success", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Replace with your deployed contract address
const CONTRACT_ADDRESS = "YOUR_CONTRACT_ADDRESS_HERE";

function App() {
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('0');
  const [contract, setContract] = useState(null);
  const [provider, setSigner] = useState(null);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [tokenInfo, setTokenInfo] = useState({
    name: '',
    symbol: '',
    totalSupply: '0'
  });

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      setAccount('');
      setBalance('0');
      setContract(null);
      setSigner(null);
    } else {
      setAccount(accounts[0]);
      loadContract(accounts[0]);
    }
  };

  const handleChainChanged = () => {
    window.location.reload();
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError('Please install MetaMask!');
        return;
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length > 0) {
        setAccount(accounts[0]);
        await loadContract(accounts[0]);
      }
    } catch (error) {
      setError('Failed to connect wallet: ' + error.message);
    }
  };

  const loadContract = async (userAccount) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      setContract(contractInstance);
      setSigner(signer);
      
      // Load token info
      const [name, symbol, totalSupply] = await Promise.all([
        contractInstance.name(),
        contractInstance.symbol(),
        contractInstance.totalSupply()
      ]);
      
      setTokenInfo({
        name,
        symbol,
        totalSupply: ethers.formatEther(totalSupply)
      });
      
      // Load user balance
      await loadBalance(contractInstance, userAccount);
    } catch (error) {
      setError('Failed to load contract: ' + error.message);
    }
  };

  const loadBalance = async (contractInstance, userAccount) => {
    try {
      const balance = await contractInstance.balanceOf(userAccount);
      setBalance(ethers.formatEther(balance));
    } catch (error) {
      setError('Failed to load balance: ' + error.message);
    }
  };

  const transferTokens = async () => {
    if (!contract || !recipient || !amount) return;
    
    setLoading(true);
    setError('');
    setTxHash('');
    
    try {
      const amountInWei = ethers.parseEther(amount);
      const tx = await contract.transfer(recipient, amountInWei);
      setTxHash(tx.hash);
      
      // Wait for transaction confirmation
      await tx.wait();
      
      // Reload balance
      await loadBalance(contract, account);
      
      // Clear form
      setRecipient('');
      setAmount('');
      
    } catch (error) {
      setError('Transaction failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const mintTokens = async () => {
    if (!contract || !recipient || !amount) return;
    
    setLoading(true);
    setError('');
    setTxHash('');
    
    try {
      const amountInWei = ethers.parseEther(amount);
      const tx = await contract.mint(recipient, amountInWei);
      setTxHash(tx.hash);
      
      // Wait for transaction confirmation
      await tx.wait();
      
      // Reload balance and token info
      await loadBalance(contract, account);
      const totalSupply = await contract.totalSupply();
      setTokenInfo(prev => ({
        ...prev,
        totalSupply: ethers.formatEther(totalSupply)
      }));
      
    } catch (error) {
      setError('Mint failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>SimpleToken DApp</h1>
        <p>Transfer ERC-20 tokens on Ethereum</p>
      </header>

      <div className="container">
        {!account ? (
          <div className="connect-section">
            <button onClick={connectWallet} className="connect-btn">
              Connect Wallet
            </button>
            <p>Please connect your MetaMask wallet to continue</p>
          </div>
        ) : (
          <div className="main-content">
            <div className="account-info">
              <h2>Account Information</h2>
              <p><strong>Address:</strong> {account}</p>
              <p><strong>Balance:</strong> {balance} {tokenInfo.symbol}</p>
            </div>

            <div className="token-info">
              <h2>Token Information</h2>
              <p><strong>Name:</strong> {tokenInfo.name}</p>
              <p><strong>Symbol:</strong> {tokenInfo.symbol}</p>
              <p><strong>Total Supply:</strong> {tokenInfo.totalSupply}</p>
            </div>

            <div className="transfer-section">
              <h2>Transfer Tokens</h2>
              <div className="form-group">
                <label>Recipient Address:</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x..."
                />
              </div>
              <div className="form-group">
                <label>Amount ({tokenInfo.symbol}):</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  step="0.01"
                />
              </div>
              <div className="button-group">
                <button 
                  onClick={transferTokens} 
                  disabled={loading || !recipient || !amount}
                  className="action-btn"
                >
                  {loading ? 'Transferring...' : 'Transfer'}
                </button>
                <button 
                  onClick={mintTokens} 
                  disabled={loading || !recipient || !amount}
                  className="action-btn mint-btn"
                >
                  {loading ? 'Minting...' : 'Mint'}
                </button>
              </div>
            </div>

            {txHash && (
              <div className="transaction-info">
                <h3>Transaction Successful!</h3>
                <p><strong>Transaction Hash:</strong> {txHash}</p>
                <a 
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on Etherscan
                </a>
              </div>
            )}

            {error && (
              <div className="error-message">
                <p>{error}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;