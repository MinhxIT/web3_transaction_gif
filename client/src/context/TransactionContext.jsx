import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import { contractABI, contractAddress } from "../utils/constants";

export const TransactionContext = React.createContext();

const { ethereum } = window;

const createEthereumContract = () => {
  const provider = new ethers.providers.Web3Provider(ethereum);
  const signer = provider.getSigner();
  const transactionContract = new ethers.Contract(
    contractAddress,
    contractABI,
    signer
  );
  return transactionContract;
};

export const TransactionsProvider = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState();
  const [formData, setformData] = useState({
    addressTo: "",
    amount: "",
    keyword: "",
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [transactionCount, setTransactionCount] = useState(
    localStorage.getItem("transactionCount")
  );
  const [transactions, setTransactions] = useState([]);

  const getAllTransactions = async () => {
    try {
      if (ethereum) {
        const transactionContract = createEthereumContract();

        const availableTransactions =
          await transactionContract.getAllTransactions();

        const structuredTransactions = availableTransactions.map(
          (transaction) => ({
            addressTo: transaction.receiver,
            addressFrom: transaction.sender,
            timestamp: new Date(
              transaction.timestamp.toNumber() * 1000
            ).toLocaleString(),
            message: transaction.message,
            keyword: transaction.keyword,
            amount: parseInt(transaction.amount._hex) / 10 ** 18,
          })
        );
        console.log(structuredTransactions);
        setTransactions(structuredTransactions);
      } else {
        return alert("Please install metamark");
      }
    } catch (error) {
      throw new Error(error);
    }
  };

  const checkIfWalletIsConnect = async () => {
    try {
      if (!ethereum) {
        return alert("Please install metamark");
      }
      const accounts = await ethereum.request({
        method: "eth_accounts",
      });
      if (accounts.length > 0) {
        setCurrentAccount(accounts[0]);
        getAllTransactions();
      }
    } catch (error) {
      throw new Error(error);
    }
  };

  const connectWallet = async () => {
    try {
      if (!ethereum) {
        return alert("Please install metamark");
      }
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      setCurrentAccount(accounts[0]);
      window.location.reload();
    } catch (error) {
      throw new Error(error);
    }
  };

  const sendTransaction = async () => {
    try {
      if (ethereum) {
        const { addressTo, amount, keyword, message } = formData;
        const transactionContract = createEthereumContract();
        const parsedAmount = ethers.utils.parseEther(amount);
        await ethereum.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: currentAccount,
              to: addressTo,
              gas: "0x5208",
              value: parsedAmount._hex,
            },
          ],
        });

        const transactionHash = await transactionContract.addToBlockchain(
          addressTo,
          parsedAmount,
          message,
          keyword
        );
        setIsLoading(true);
        await transactionHash.wait();
        setIsLoading(false);

        // const transactionCount1 =
        //   await transactionContract.getTransactionCount();
        // setTransactionCount(transactionCount1.toNumber());
        // localStorage.setItem("transactionCount", currentTransactionCount);
        window.location.reload();
      } else {
        return alert("Please install metamark");
      }
    } catch (error) {
      throw new Error(error);
    }
  };

  const handleChange = (e, name) => {
    setformData((prevState) => ({ ...prevState, [name]: e.target.value }));
  };

  const checkIfTransactionsExists = async () => {
    try {
      if (ethereum) {
        const transactionsContract = createEthereumContract();
        const currentTransactionCount =
          await transactionsContract.getTransactionCount();
        localStorage.setItem("transactionCount", currentTransactionCount);
      } else {
        return alert("Please install metamark");
      }
    } catch (error) {
      throw new Error(error);
    }
  };

  useEffect(() => {
    checkIfWalletIsConnect();
    checkIfTransactionsExists();
  }, [transactionCount]);

  return (
    <TransactionContext.Provider
      value={{
        connectWallet,
        currentAccount,
        handleChange,
        sendTransaction,
        formData,
        isLoading,
        transactions,
        transactionCount,
      }}>
      {children}
    </TransactionContext.Provider>
  );
};
