'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ABI } from '../components/abi';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

const CONTRACT_ADDRESS = '0x8d80F85742d729D00C283A2C492980ea28A7c811'; // Replace with your contract address
const BMS_URL = 'https://bmsurl.co/BMSTNY/CFL0tjALkm'

async function resolveShortUrl(shortUrl: string): Promise<string | null> {
  try {
    const response = await fetch(shortUrl, {
      method: 'HEAD',
      redirect: 'follow'
    });
    
    // Get the final URL after all redirects
    const finalUrl = response.url;
    return finalUrl;
  } catch (error) {
    console.error('Error resolving short URL:', error);
    return null;
  }
}

export default function Todo() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputText, setInputText] = useState('');
  const [dependency, setDependency] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Request account access
  const getProvider = async () => {
    if (!(window as any).ethereum) {
      alert('Please install MetaMask');
      return null;
    }

    const provider = new ethers.BrowserProvider((window as any).ethereum, "sepolia");
    await provider.send('eth_requestAccounts', []); // Request account access
    return provider;
  };

  const getContract = async () => {
    const provider = await getProvider();
    if (!provider) return null;
  
    try {
      const signer = await provider.getSigner(); // Ensure the signer is set
      return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    } catch (err) {
      console.error('Error creating contract instance:', err);
      return null;
    }
  };
  const addTodo = async () => {
    if (inputText.trim() === '') return;
    setIsLoading(true);

    const contract = await getContract();
    if (!contract) {
      setIsLoading(false);
      return;
    }

    try {
      const tx = await contract.createTask(inputText.trim(), '');
      console.log("transaction hash", tx.hash);
      await tx.wait(); // Wait for the transaction to be mined

      // const newTodo: Todo = {
      //   id: Date.now(), // Use a placeholder ID for the frontend
      //   text: inputText.trim(),
      //   completed: false,
      // };

      // setTodos([...todos, newTodo]);
      setInputText('');
      getTodos();
    } catch (err) {
      console.error('Error adding todo:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTodo = async (id: number) => {
    const contract = await getContract();
    if (!contract) return;

    try {
      const tx = await contract.markTaskCompleted(id);
      await tx.wait(); // Wait for the transaction to be mined

      setTodos(todos.map(todo => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ));
    } catch (err) {
      console.error('Error toggling todo:', err);
    }
  };

  const deleteTodo = async (id: number) => {
    const contract = await getContract();
    if (!contract) return;

    try {
      const tx = await contract.deleteTask(id);
      await tx.wait(); // Wait for the transaction to be mined

      setTodos(todos.filter(todo => todo.id !== id));
    } catch (err) {
      console.error('Error deleting todo:', err);
    }
  };

  const getTodos = async () => {

    const contract = await getContract();
    if (!contract) return;

    const todosList = await contract.getUserTasks();

    console.log("todos", todosList.length);

    let fetchedTodos: Todo[] = [];
    for (let i = 0; i < todosList.length; i++) {
      const todo = todosList[i];
      const task = await contract.getTask(todo);
      console.log("each task", Object.values(task));
      
      if (!task[6]) { // Check if task is not deleted (isDeleted is false)
        fetchedTodos.push({
          id: Number(task[0]),
          text: task[2], 
          completed: task[4],
        });

      }
    }
    setTodos(fetchedTodos);
    console.log("Final todos showing in UI:", JSON.stringify(fetchedTodos));
  };

  useEffect(() => {
    getTodos();
    // Resolve and log the BMS URL
    resolveShortUrl(BMS_URL).then(finalUrl => {
      console.log('Resolved BMS URL:', finalUrl);
    });
  }, []);

  useEffect(() => {
    console.log("Todos updated:", todos);
  }, [todos]);

  return (
    <div>
      <div className="max-w-md mx-auto flex flex-col min-h-screen items-center justify-center p-6 bg-transparent">
        <h2 className="text-2xl font-bold mb-4 dark:text-white mb-10">Todo List</h2>
        <div className="flex gap-2 mb-10 w-full">
          <input
            type="text"
            className="flex-1 px-3 py-2 border rounded dark:bg-gray-700 dark:text-white dark:border-gray-600 "
            placeholder="Add a new todo..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTodo()}
            disabled={isLoading}
          />
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50"
            onClick={addTodo}
            disabled={isLoading}
          >
            {isLoading ? 'Adding...' : 'Add'}
          </button>
        </div>
        <ul className="space-y-2 w-full">
          {todos.map(todo => (
            <li key={todo.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded w-full">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                  className="h-4 w-4 dark:bg-gray-600 dark:border-gray-500"
                />
                <span className={todo.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'dark:text-white'}>
                  {todo.text}
                </span>
              </div>
              <button
                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                onClick={() => deleteTodo(todo.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}