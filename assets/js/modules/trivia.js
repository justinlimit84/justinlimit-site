/**
 * Trivia module for managing challenges
 */
export function triggerLLMTrivia(triviaData, currentCharacter) {
    document.getElementById('trivia-character-title').textContent = `⚡ ${currentCharacter.toUpperCase()}'S CHALLENGE!`;
    document.getElementById('trivia-question-text').textContent = triviaData.question;
    
    const container = document.getElementById('trivia-options-container');
    container.innerHTML = '';
    document.getElementById('trivia-feedback').textContent = '';
    
    triviaData.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.textContent = opt;
        btn.style.width = '100%';
        btn.style.padding = '12px';
        btn.style.background = '#11141a';
        btn.style.color = '#fff';
        btn.style.border = '1px solid var(--neon-cyan)';
        btn.style.borderRadius = '6px';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '1rem';
        btn.style.transition = 'all 0.2s ease';
        
        btn.onclick = () => {
            const feedback = document.getElementById('trivia-feedback');
            if (idx === parseInt(triviaData.correct)) {
                feedback.style.color = '#4caf50';
                feedback.textContent = '🎉 Awesome Job! +50 Power Levels! 💪';
                
                setTimeout(() => { 
                    document.getElementById('trivia-modal').style.display = 'none'; 
                }, 2000);
            } else {
                feedback.style.color = '#f44336';
                feedback.textContent = '❌ Try again! You can do it! 💥';
            }
        };
        container.appendChild(btn);
    });
    
    document.getElementById('trivia-modal').style.display = 'flex';
}
