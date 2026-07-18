import { charProfiles, characterNames, characterThemes } from './config.js';
import { fetchChatResponse } from './modules/api.js';
import { toggleMusic, playCurrentCharacterTrack, getMusicState } from './modules/audio.js';
import { triggerLLMTrivia } from './modules/trivia.js';

let promptsInCurrentWindow = 0;
let triviaTriggeredInCurrentWindow = false;
let currentCharacter = "Goku";
let conversationHistory = [];
let isGenerating = false;
let userPower = 0;

window.toggleMusic = () => toggleMusic(currentCharacter);
window.selectCharacter = selectCharacter;
window.sendMessage = sendMessage;
window.toggleLeaderboard = toggleLeaderboard;

async function toggleLeaderboard() {
    const panel = document.getElementById('leaderboard-panel');
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        const res = await fetch('/api/leaderboard');
        const data = await res.json();
        const list = document.getElementById('leaderboard-list');
        list.innerHTML = data.map(u => `<div class="leaderboard-item"><span>${u.username}</span><span>${u.current_power}</span></div>`).join('');
    } else {
        panel.classList.add('hidden');
    }
}

function updatePowerDisplay(newPower) {
    const oldPower = userPower;
    userPower = Math.min(newPower, 100);
    const fill = document.getElementById('power-fill');
    const value = document.getElementById('power-value');
    if (fill) fill.style.width = `${userPower}%`;
    if (value) value.textContent = userPower;
    
    // Check for mastery
    if (userPower >= 100) {
        applyAwakenedAura(true);
        if (oldPower < 100) {
            console.log("SURGE TRIGGERED: Power is 100+");
            document.body.classList.add('surge-body');
            setTimeout(() => {
                document.body.classList.remove('surge-body');
                console.log("SURGE REMOVED");
            }, 600);
        }
    } else {
        applyAwakenedAura(false);
    }
}


function scrollToBottom(smooth = true) {
    const chatBox = document.getElementById('chat-box');
    if (!chatBox) return;
    if (smooth) {
        chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
    } else {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

function getPrunedHistory() {
    const MAX_MESSAGES = 10; 
    if (conversationHistory.length <= MAX_MESSAGES + 1) {
        return conversationHistory;
    }
    const systemMessage = conversationHistory[0];
    const recentMessages = conversationHistory.slice(-MAX_MESSAGES);
    return [systemMessage, ...recentMessages];
}

function applyCharacterTheme(name) {
    const theme = characterThemes[name];
    if (!theme) return;
    Object.keys(theme).forEach(property => {
        if (property !== 'bgm') {
            document.documentElement.style.setProperty(property, theme[property]);
        }
    });

    if (getMusicState()) {
        playCurrentCharacterTrack(name);
    }
}

const selectSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');

function selectCharacter(name) {
    if (isGenerating) return; 
    
    selectSound.play().catch(e => console.log("Sound played blocked"));

    currentCharacter = name;
    document.querySelectorAll('.char-card').forEach(el => el.classList.remove('active'));
    const activeCard = document.getElementById(`card-${name}`);
    if (activeCard) activeCard.classList.add('active');
    
    applyCharacterTheme(name);
    
    document.getElementById('chat-char-name').textContent = characterNames[name];
    document.getElementById('chat-avatar').src = charProfiles[name].image;
    
    // Reset History State
    conversationHistory = [{ role: "system", content: charProfiles[name].system }];
    
    // Clear chat and show greeting initially
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = `<div class="msg bot ${name}">${charProfiles[name].greeting}</div>`;
    
    // Fetch History and State
    fetch('/api/chat', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            username: localStorage.getItem('anime_hub_user'),
            character: name,
            action: 'FETCH_STATE',
            messages: [{role: "system", content: charProfiles[name].system}] 
        })
    }).then(res => res.json()).then(data => {
        // Clear box again to render ONLY what is returned in data.history
        const chatBox = document.getElementById('chat-box');
        chatBox.innerHTML = '';
        
        // Render Greeting first
        chatBox.innerHTML += `<div class="msg bot ${name}">${charProfiles[name].greeting}</div>`;
        
        // Render full history if available
        if (data.history && Array.isArray(data.history) && data.history.length > 0) {
            data.history.forEach(msg => {
                if (msg.role !== 'system') {
                    // Avoid duplicating greeting if it is already in the history
                    if (msg.content === charProfiles[name].greeting) return;

                    const msgDiv = document.createElement('div');
                    msgDiv.className = `msg ${msg.role} ${name}`;
                    msgDiv.textContent = msg.content;
                    chatBox.appendChild(msgDiv);
                    
                    // Maintain local history state
                    conversationHistory.push(msg);
                }
            });
        }
        scrollToBottom(false);
        
        // Sync Power Level directly from Backend - NO LOCAL INCREMENT
        if (data.power !== undefined) {
            updatePowerDisplay(data.power);
        }
    });
}

async function sendMessage() {
    if (isGenerating) return;

    const input = document.getElementById('user-input');
    const messageText = input.value.trim();
    if (!messageText) return;

    isGenerating = true;
    input.disabled = true;
    const sendButton = document.querySelector('.chat-input-area button');
    if (sendButton) sendButton.disabled = true;
    const chatBox = document.getElementById('chat-box');
        
    const storedUsername = localStorage.getItem('anime_hub_user') || 'Anonymous User';

    const userMsgContainer = document.createElement('div');
    userMsgContainer.className = 'msg user';
        
    const nameBadge = document.createElement('div');
    nameBadge.className = 'msg-username-label';
    nameBadge.textContent = storedUsername;
        
    const textContent = document.createElement('div');
    textContent.className = 'msg-text-payload';
    textContent.textContent = messageText;
        
    userMsgContainer.appendChild(nameBadge);
    userMsgContainer.appendChild(textContent);
    chatBox.appendChild(userMsgContainer);

    input.value = '';
        
    const typingStatus = document.createElement('div');
    typingStatus.className = 'msg system-status';
    typingStatus.textContent = `${currentCharacter} is thinking...`;
    chatBox.appendChild(typingStatus);
    scrollToBottom(true);

    conversationHistory.push({ role: "user", content: messageText });
    promptsInCurrentWindow++;
    
    let shouldTriggerTrivia = false;

    if (!triviaTriggeredInCurrentWindow) {
        if (promptsInCurrentWindow >= 10) {
            shouldTriggerTrivia = true; 
        } else {
            shouldTriggerTrivia = Math.random() < 0.20;
        }
    }

    try {
        const data = await fetchChatResponse({ 
            username: storedUsername,
            character: currentCharacter,
            messages: getPrunedHistory(),
            generateTrivia: shouldTriggerTrivia 
        });

        typingStatus.remove();

        const botMsg = document.createElement('div');
        botMsg.className = `msg bot ${currentCharacter}`;
        botMsg.textContent = data.reply;
        chatBox.appendChild(botMsg);
        
        conversationHistory.push({ role: "assistant", content: data.reply });
        
        // Gamification: Update power display based on backend response
        if (data.power !== undefined) {
            updatePowerDisplay(data.power);
        }

        // Handle Trivia
        if (data.trivia && typeof data.trivia === 'object' && data.trivia.question) {
            setTimeout(() => {
                triggerLLMTrivia(data.trivia, currentCharacter);
            }, 1200);
        }
        
        if (promptsInCurrentWindow >= 10) {
            promptsInCurrentWindow = 0;
            triviaTriggeredInCurrentWindow = false;
        }
    } catch (error) {
        console.error("Communication error:", error);
        
        if (typingStatus.parentNode) typingStatus.remove();
        
        // Only show error if the error message is critical/blocked
        if (error.message.includes('403') || error.message.includes('busy')) {
            const networkErrBlock = document.createElement('div');
            networkErrBlock.className = 'msg system-status';
            networkErrBlock.style.borderColor = '#d62828';
            networkErrBlock.style.color = '#d62828';
            networkErrBlock.style.background = 'rgba(214, 40, 40, 0.1)';
            networkErrBlock.textContent = `❌ ${currentCharacter} is busy. Try again soon!`;
            
            chatBox.appendChild(networkErrBlock);
            conversationHistory.pop();
            promptsInCurrentWindow--;
        }
    } finally {
        isGenerating = false;
        input.disabled = false;
        if (sendButton) sendButton.disabled = false;
        input.focus();
        scrollToBottom(true);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('enter-hub-btn').addEventListener('click', () => {
        const usernameInput = document.getElementById('portal-username').value.trim();
        if (!usernameInput) {
            alert("Please enter a valid identity code name!");
            return;
        }
        localStorage.setItem('anime_hub_user', usernameInput);
        const portal = document.getElementById('landing-portal');
        portal.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        portal.style.opacity = '0';
        portal.style.transform = 'scale(1.05)';
        setTimeout(() => portal.remove(), 600);
    });

    document.getElementById('portal-username').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') document.getElementById('enter-hub-btn').click();
    });

    selectCharacter(currentCharacter);
});
