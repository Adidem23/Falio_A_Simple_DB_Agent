import { useState, useEffect } from "react";
import './Command.css';
import axios from 'axios';
import Falio from '../Media/FaLIo.jpg';

const Command = () => {
  const [isListening, setIsListening] = useState(false);
  const [message, setMessage] = useState("Click the button and speak...");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!("webkitSpeechRecognition" in window)) {
      setMessage("Speech Recognition is not supported in your browser.");
    }
  }, []);

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window)) {
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setMessage("BOT🤖 is generating ...");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      setMessage(`You said: "${transcript}"`);
      handleCommand(transcript);
    };

    recognition.onerror = (event) => {
      setMessage(`Error: ${event.error}`);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleCommand = async (command) => {

    const response = await axios.post("http://localhost:1820/askrequest", { message: command }, { withCredentials: true });

    setHistory((prevHistory) => [...prevHistory, { user: command, assistant: response['data'].answer }]);

    speak(response['data'].answer);
    
  };

  const speak = (text) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    synth.speak(utterance);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <img src={Falio}  style={{marginTop:'30px',borderRadius:"50%",width:"350px",height:"300px"}} alt="NO FALIO FOUND...."/>
      <h1 className="text-2xl font-bold mb-4">Falio : DB Agent 🤖</h1>
      <p className="text-lg mb-6">{message}</p>

      <button
        onClick={startListening}
        className={`px-6 py-3 text-white rounded-md transition ${isListening ? "bg-red-500" : "bg-blue-500"
          }`}
      >
        {isListening ? "Listening..." : "Speak "}
      </button>

      <div className="mt-6 w-full max-w-md bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-2">Conversation History</h2>
        <div className="max-h-60 overflow-auto">
          {history.map((item, index) => (
            <div key={index} className="mb-2">
              <p className="text-blue-600"><strong>You:</strong> {item.user}</p>
              <p className="text-green-600"><strong>Assistant:</strong> {item.assistant}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Command;