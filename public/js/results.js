import { socketManager } from './socket-manager.js';

// Initialize socket connection for this page
socketManager.connect();

document.addEventListener('DOMContentLoaded', () => {
    const roundNumberEl = document.getElementById('round-number');
    const rankingListEl = document.getElementById('ranking-list');
    const detailsContentEl = document.getElementById('details-content');
    const nextRoundButton = document.getElementById('next-round-button');
    const timerEl = document.getElementById('timer');

    const resultsData = JSON.parse(sessionStorage.getItem('roundResults'));
    const isFinalResults = new URLSearchParams(window.location.search).get('final') === 'true';

    if (isFinalResults) {
        const finalData = JSON.parse(sessionStorage.getItem('finalResults'));
        handleFinalResults(finalData);
        return;
    }

    if (!resultsData) {
        console.error('No se encontraron datos de resultados de la ronda.');
        rankingListEl.innerHTML = '<p>No se pudieron cargar los resultados. <a href="/">Volver al inicio</a></p>';
        return;
    }

    // 1. Renderizar número de ronda
    roundNumberEl.textContent = resultsData.round;

    // 2. Renderizar el ranking de jugadores
    renderRanking(resultsData.ranking);

    // 3. Renderizar el detalle de la ronda
    renderRoundDetails(resultsData.scores, resultsData.ranking);

    // 4. Configurar botón de siguiente ronda
    nextRoundButton.disabled = false;
    nextRoundButton.textContent = 'Listo para la siguiente ronda';
    nextRoundButton.addEventListener('click', () => {
        nextRoundButton.disabled = true;
        nextRoundButton.textContent = 'Esperando a los demás...';
        socketManager.emit('player-ready-for-next-round');
    });

    // 5. Iniciar contador con transición automática
    let timeLeft = 30;
    const timerInterval = setInterval(() => {
        timeLeft--;
        if (timerEl) {
            timerEl.textContent = timeLeft;
            
            // Cambiar color cuando quede poco tiempo
            if (timeLeft <= 10) {
                timerEl.parentElement.style.background = 'linear-gradient(45deg, #e74c3c, #c0392b)';
                timerEl.parentElement.style.animation = 'pulse 1s infinite';
            } else if (timeLeft <= 20) {
                timerEl.parentElement.style.background = 'linear-gradient(45deg, #f39c12, #e67e22)';
            }
        }
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            // Auto-avanzar si no se ha presionado el botón
            if (!nextRoundButton.disabled) {
                nextRoundButton.click();
            }
        }
    }, 1000);

    // Los listeners para 'next-round-progress' y 'next-round-starting' ya están en socket-manager.js
    // y funcionan globalmente.

    function renderRanking(ranking) {
        rankingListEl.innerHTML = ''; // Limpiar
        
        if (!ranking || ranking.length === 0) {
            rankingListEl.innerHTML = '<p class="no-data">No hay datos de ranking disponibles</p>';
            return;
        }

        ranking.forEach((player, index) => {
            const card = document.createElement('div');
            card.className = `player-card rank-${player.rank}`;
            
            let trophy = '';
            if (player.rank === 1) trophy = '🏆';
            else if (player.rank === 2) trophy = '🥈';
            else if (player.rank === 3) trophy = '🥉';
            else trophy = '🎯';

            // Formatear cambio de puntaje
            const scoreChange = player.scoreChange || 0;
            const scoreChangeText = scoreChange > 0 ? `+${scoreChange}` : `${scoreChange}`;
            const scoreChangeClass = scoreChange > 0 ? 'positive' : scoreChange < 0 ? 'negative' : 'neutral';

            card.innerHTML = `
                <div class="rank">#${player.rank}</div>
                <div class="trophy">${trophy}</div>
                <div class="player-name">${escapeHTML(player.name)}</div>
                <div class="score-change ${scoreChangeClass}">${scoreChangeText} pts</div>
                <div class="player-score">${player.score || 0}</div>
            `;
            
            // Agregar delay de animación escalonado
            card.style.animationDelay = `${0.1 + (index * 0.1)}s`;
            
            rankingListEl.appendChild(card);
        });
    }

    function renderRoundDetails(scores, ranking) {
        detailsContentEl.innerHTML = ''; // Limpiar
        
        if (!ranking || ranking.length === 0 || !scores) {
            detailsContentEl.innerHTML = '<p class="no-data">No hay detalles de la ronda disponibles</p>';
            return;
        }

        // Obtener categorías del primer jugador que tenga detalles
        const firstPlayerName = ranking[0].name;
        const categories = Object.keys(scores[firstPlayerName]?.details || {});

        if (categories.length === 0) {
            detailsContentEl.innerHTML = '<p class="no-data">No hay categorías para mostrar</p>';
            return;
        }

        categories.forEach((category, categoryIndex) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category-results';
            categoryDiv.style.animationDelay = `${0.8 + (categoryIndex * 0.1)}s`;
            
            let wordsHTML = '<div class="word-grid">';
            
            ranking.forEach(player => {
                const playerName = player.name;
                const result = scores[playerName]?.details?.[category];
                
                const word = result?.word || '';
                const points = result?.score || 0;
                const isValid = points > 0;
                const statusClass = word ? (isValid ? 'valid' : 'invalid') : 'empty';
                
                wordsHTML += `
                    <div class="word-item ${statusClass}">
                        <div class="word-player">${escapeHTML(playerName)}</div>
                        <div class="word-text" title="${escapeHTML(result?.reason || '')}">${escapeHTML(word) || '(sin palabra)'}</div>
                        <div class="word-points">${points}</div>
                    </div>
                `;
            });
            
            wordsHTML += '</div>';

            categoryDiv.innerHTML = `<h3>${escapeHTML(category)}</h3>${wordsHTML}`;
            detailsContentEl.appendChild(categoryDiv);
        });
    }
    
    function handleFinalResults(finalData) {
        if (!finalData || !finalData.ranking) {
            rankingListEl.innerHTML = '<p>No se pudieron cargar los resultados finales.</p>';
            return;
        }
        document.getElementById('round-number').textContent = 'Final';
        document.getElementById('timer-container').style.display = 'none';
        document.getElementById('round-details').style.display = 'none';
        nextRoundButton.textContent = 'Jugar de Nuevo';
        nextRoundButton.disabled = false;
        nextRoundButton.addEventListener('click', () => window.location.href = '/');

        renderRanking(finalData.ranking);
    }

    function escapeHTML(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"'\/]/g, (match) => {
            const escape = {
                '&': '&amp;', '<': '&lt;', '>': '&gt;',
                '"': '&quot;', "'": '&#39;', '/': '&#x2F;',
            };
            return escape[match];
        });
    }
});
