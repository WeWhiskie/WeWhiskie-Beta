import React, { useState, useEffect } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { FaMicrophone, FaVolumeUp, FaVolumeMute } from "react-icons/fa";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

const AIConcierge = () => {
    const [micOn, setMicOn] = useState(false);
    const [volumeOn, setVolumeOn] = useState(true);
    const { transcript, listening } = useSpeechRecognition();

    useEffect(() => {
        console.log("AI Concierge Loaded");
    }, []);

    const toggleMic = () => {
        if (!micOn) {
            SpeechRecognition.startListening();
        } else {
            SpeechRecognition.stopListening();
        }
        setMicOn(!micOn);
    };

    const toggleVolume = () => {
        setVolumeOn(!volumeOn);
    };

    const generateResponse = (input: string) => {
        const generatedText = `You said: ${input}. Here's a whisky recommendation...`;
        if (volumeOn) {
            const synth = window.speechSynthesis;
            const utterance = new SpeechSynthesisUtterance(generatedText);
            synth.speak(utterance);
        }
    };

    useEffect(() => {
        if (transcript) generateResponse(transcript);
    }, [transcript]);

    return (
        <div className="concierge-container">
            {/* Avatar Rendering */}
            <div className="concierge-avatar">
                <Canvas>
                    <OrbitControls />
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} />
                    <mesh>
                        <sphereGeometry args={[0.5, 32, 32]} />
                        <meshStandardMaterial color="#D2691E" />
                    </mesh>
                </Canvas>
            </div>

            {/* Controls */}
            <div className="concierge-controls">
                <button 
                    onClick={toggleMic} 
                    className={`mic-button ${micOn ? "active" : ""}`}
                    aria-label="Toggle microphone"
                >
                    <FaMicrophone />
                </button>
                <button 
                    onClick={toggleVolume} 
                    className={`volume-button ${volumeOn ? "active" : ""}`}
                    aria-label="Toggle volume"
                >
                    {volumeOn ? <FaVolumeUp /> : <FaVolumeMute />}
                </button>
            </div>
            
            {/* Chat Transcript */}
            {transcript && (
                <div className="transcript-container">
                    <p className="ai-response">"{transcript}"</p>
                </div>
            )}
        </div>
    );
};

export default AIConcierge;
