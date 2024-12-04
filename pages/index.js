import React, { useState, useRef, useEffect } from 'react';
import styles from '../styles/Chat.module.css';
import RetryHandler from '../mcp-chat-ui/src/utils/retry';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [retryDelay, setRetryDelay] = useState(0);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateResponse = async (userMessage) => {
    setRetryCount(0);
    setRetryDelay(0);
    
    return await RetryHandler.withRetry(async () => {
      try {
        const response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt4-openai',
            prompt: userMessage,
            stream: false,
            options: {
              temperature: 0.7,
              top_p: 0.9,
              max_tokens: 2048,
            }
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.error || `HTTP error! status: ${response.status}`);
          if (errorData.error?.includes('rate limit')) {
            setRetryCount(prev => prev + 1);
            setRetryDelay(60000); // Show 1 minute delay for rate limits
          }
          throw error;
        }

        const data = await response.json();
        return data.response;
      } catch (error) {
        if (error.message?.includes('rate limit')) {
          setRetryCount(prev => prev + 1);
          setRetryDelay(60000);
        }
        throw error;
      }
    }, 'Ollama API call');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await generateResponse(userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message}. Please try again in a moment.`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1>MCP with Ollama Integration</h1>
      <p>Using gpt4-openai model</p>
      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          {retryCount > 0 && (
            <p className={styles.retryMessage}>
              Retry attempt {retryCount}. Waiting {Math.round(retryDelay / 1000)} seconds before next attempt...
            </p>
          )}
        </div>
      )}
      <div className={styles.messages}>
        {messages.map((message, index) => (
          <div key={index} className={`${styles.message} ${styles[message.role]}`}>
            <div className={styles.content}>{message.content}</div>
          </div>
        ))}
        {isLoading && (
          <div className={`${styles.message} ${styles.loading}`}>
            <div className={styles.content}>Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className={styles.input}
          disabled={isLoading}
        />
        <button type="submit" className={styles.button} disabled={isLoading}>
          Send
        </button>
      </form>
    </div>
  );
}
