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
    renderRoundDetails(resultsData.roundDetails, resultsData.ranking);

    // 4. Configurar botón de siguiente ronda
    nextRoundButton.disabled = false;
    nextRoundButton.textContent = 'Listo para la siguiente ronda';
    nextRoundButton.addEventListener('click', () => {
        nextRoundButton.disabled = true;
        nextRoundButton.textContent = 'Esperando a los demás...';
        socketManager.emit('player-ready-for-next-round');
    });

    // 5. Iniciar un contador simple
    let timeLeft = 30;
    const timerInterval = setInterval(() => {
        timeLeft--;
        if (timerEl) {
            timerEl.textContent = timeLeft;
        }
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
        }
    }, 1000);

    // Los listeners para 'next-round-progress' y 'next-round-starting' ya están en socket-manager.js
    // y funcionan globalmente.

    function renderRanking(ranking) {
        rankingListEl.innerHTML = ''; // Limpiar
        ranking.forEach(player => {
            const card = document.createElement('div');
            card.className = `player-card rank-${player.rank}`;
            
            let trophy = '';
            if (player.rank === 1) trophy = '🏆';
            else if (player.rank === 2) trophy = '🥈';
            else if (player.rank === 3) trophy = '🥉';

            card.innerHTML = `
                <div class="rank">#${player.rank} ${trophy}</div>
                <div class="player-name">${escapeHTML(player.name)}</div>
                <div class="score-change">+ ${player.scoreChange}</div>
                <div class="player-score">${player.score} PTS</div>
            `;
            rankingListEl.appendChild(card);
        });
    }

    function renderRoundDetails(details, ranking) {
        detailsContentEl.innerHTML = ''; // Limpiar
        if (!ranking || ranking.length === 0 || !details) return;

        const categories = Object.keys(details[ranking[0].name]);

        categories.forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category-results';
            
            let wordsHTML = '<div class="word-grid">';
            ranking.forEach(player => {
                const playerName = player.name;
                const result = details[playerName]?.[category];
                if (!result) return;

                const statusClass = result.isValid ? 'valid' : 'invalid';
                // La lógica de puntos se mantiene en el cliente porque el servidor no la provee por palabra.
                const points = result.isValid ? (isWordUnique(details, category, result.word) ? 10 : 5) : 0;

                wordsHTML += `
                    <div class="word-item ${statusClass}">
                        <div class="word-player">${escapeHTML(playerName)}</div>
                        <div class="word-text">${escapeHTML(result.word) || '—'}</div>
                        <div class="word-points">${points} pts</div>
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

    function isWordUnique(details, category, word) {
        if (!word) return false;
        let count = 0;
        for (const playerName in details) {
            const result = details[playerName][category];
            if (result.isValid && result.word.toLowerCase().trim() === word.toLowerCase().trim()) {
                count++;
            }
        }
        return count === 1;
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
