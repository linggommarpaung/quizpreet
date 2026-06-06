// client/src/pages/AIChatPage.jsx

import React, { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaRobot, FaArrowLeft } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import styles from './AIChatPage.module.css';

// Struktur Data untuk Pesan Chat
const initialMessages = [
    { type: 'ai', text: 'Halo! Saya adalah AI Edukasi QuizPreet. Tanyakan materi pelajaran apa saja, seperti Matematika, Sejarah, atau Bahasa Inggris!' },
];

const AIChatPage = () => {
    const [messages, setMessages] = useState(initialMessages);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef(null);

    // Otomatis scroll ke pesan terakhir
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (input.trim() === '' || isLoading) return;

        const userMessage = input.trim();
        
        // 1. Tambahkan pesan pengguna
        setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
        setInput('');
        setIsLoading(true);

        // 2. Simulasi jawaban AI (Ganti ini dengan panggilan API AI yang sebenarnya nanti)
        setTimeout(() => {
            const aiResponse = `Ini adalah jawaban simulasi untuk pertanyaan: "${userMessage}". Fitur AI ini akan segera terhubung ke model bahasa besar (LLM) untuk memberikan bantuan belajar yang mendalam.`;
            setMessages(prev => [...prev, { type: 'ai', text: aiResponse }]);
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className={styles.chatContainer}>
            <div className={styles.chatHeader}>
                <Link to="/forum" className={styles.backButton}>
                    <FaArrowLeft />
                </Link>
                <FaRobot className={styles.robotIcon} />
                <h1 className={styles.title}>AI Tutor Belajar</h1>
            </div>
            
            <div className={styles.chatWindow}>
                {messages.map((msg, index) => (
                    <div 
                        key={index} 
                        className={`${styles.message} ${msg.type === 'user' ? styles.userMessage : styles.aiMessage}`}
                    >
                        <p>{msg.text}</p>
                    </div>
                ))}

                {isLoading && (
                    <div className={`${styles.message} ${styles.aiMessage} ${styles.loadingMessage}`}>
                        <div className={styles.typingIndicator}>
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <form className={styles.inputForm} onSubmit={handleSend}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Tanyakan materi pelajaran apa saja..."
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading || input.trim() === ''}>
                    <FaPaperPlane />
                </button>
            </form>
        </div>
    );
};

export default AIChatPage;
