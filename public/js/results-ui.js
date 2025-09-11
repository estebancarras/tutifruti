document.addEventListener('DOMContentLoaded', () => {
    const roundNumberEl = document.getElementById('round-number');
    const rankingListEl = document.getElementById('ranking-list');
    const detailsContentEl = document.getElementById('details-content');
    const nextRoundButton = document.getElementById('next-round-button');

    const resultsData = JSON.parse(sessionStorage.getItem('roundResults'));

    if (!resultsData) {
        console.error('No se encontraron datos de resultados.');
        // Posiblemente redirigir al inicio o mostrar un error
        rankingListEl.innerHTML = '<p>No se pudieron cargar los resultados.</p>';
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
        // Asumiendo que el socket está disponible globalmente o a través de un manager
        window.socketManager.emit('player-ready-for-next-round');
    });

    function renderRanking(ranking) {
        rankingListEl.innerHTML = ''; // Limpiar
        ranking.forEach(player => {
            const card = document.createElement('div');
            card.className = `player-card rank-${player.rank}`;
            
            let trophy = '';
            if (player.rank === 1) trophy = '🏆';
            if (player.rank === 2) trophy = '🥈';
            if (player.rank === 3) trophy = '🥉';

            card.innerHTML = `
                <div class="trophy">${trophy}</div>
                <div class="player-name">${escapeHTML(player.name)}</div>
                <div class="player-score">${player.score}</div>
                <div class="score-change">+${player.scoreChange}</div>
            `;
            rankingListEl.appendChild(card);
        });
    }

    function renderRoundDetails(details, ranking) {
        detailsContentEl.innerHTML = ''; // Limpiar
        const categories = Object.keys(details[ranking[0].name]);

        categories.forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category-results';
            
            let wordsHTML = '';
            ranking.forEach(player => {
                const playerName = player.name;
                const result = details[playerName][category];
                const statusClass = result.isValid ? 'valid' : 'invalid';
                const points = result.isValid ? (isWordUnique(details, category, result.word) ? 10 : 5) : 0;

                wordsHTML += `
                    <div class="word-item">
                        <div>
                            <span class="player">${escapeHTML(playerName)}:</span>
                            <span class="word">${escapeHTML(result.word) || '-'}</span>
                        </div>
                        <span class="status ${statusClass}">${points} pts</span>
                    </div>
                `;
            });

            categoryDiv.innerHTML = `<h3>${escapeHTML(category)}</h3>${wordsHTML}`;
            detailsContentEl.appendChild(categoryDiv);
        });
    }

    function isWordUnique(details, category, word) {
        if (!word) return false;
        let count = 0;
        for (const playerName in details) {
            const result = details[playerName][category];
            if (result.isValid && result.word.toLowerCase() === word.toLowerCase()) {
                count++;
            }
        }
        return count === 1;
    }

    function escapeHTML(str) {
        return str.replace(/[&<>"'/]/g, (match) => {
            const escape = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;',
                '/': '&#x2F;',
            };
            return escape[match];
        });
    }
});
