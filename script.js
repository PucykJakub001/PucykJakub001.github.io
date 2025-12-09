document.addEventListener('DOMContentLoaded', () => {
    const gridContainer = document.getElementById('grid-container');
    const generateBtn = document.getElementById('generate-grid-btn');
    const startBtn = document.getElementById('start-btn');
    const resetVisBtn = document.getElementById('reset-visualization-btn');
    const clearAllBtn = document.getElementById('clear-all-btn');
    const gridSizeInput = document.getElementById('grid-size');
    const speedRange = document.getElementById('speed-range');
    const speedValueSpan = document.getElementById('speed-value');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const costDisplay = document.getElementById('cost-display');

    // Elementy do ładowania plików
    const fileInput = document.getElementById('file-input');
    const loadMapBtn = document.getElementById('load-map-btn');

    let gridSize = 20;
    let currentMode = 'start'; // start, end, wall
    let isRunning = false;
    let animationSpeed = 50; // ms

    let startNode = null;
    let endNode = null;
    
    // --- KLASA REPREZENTUJĄCA WĘZEŁ (KRATKĘ) ---
    class Node {
        constructor(row, col) {
            this.row = row;
            this.col = col;
            this.isStart = false;
            this.isEnd = false;
            this.isWall = false;
            
            // Wartości A*
            this.g = Infinity; 
            this.h = 0;        
            this.f = Infinity; 
            this.parent = null; 
        }
        
        // Zmieniona na odległość Euklidesową
        calculateH(end) {
            if (end) {
                 const dx = this.row - end.row;
                 const dy = this.col - end.col;
                 this.h = Math.sqrt(dx * dx + dy * dy); 
            } else {
                 this.h = 0;
            }
        }
    }
    
    let grid = []; // Macierz obiektów Node

    // --- FUNKCJE GENERUJĄCE I RYSUJĄCE SIATKĘ ---
    
    function generateGrid() {
        if (isRunning) return;
        
        gridSize = parseInt(gridSizeInput.value);
        if (gridSize < 5 || gridSize > 50) gridSize = 20; 
        
        grid = [];
        gridContainer.innerHTML = '';
        startNode = null;
        endNode = null;

        const cellSize = 500 / gridSize; 

        gridContainer.style.gridTemplateColumns = `repeat(${gridSize}, ${cellSize}px)`;
        gridContainer.style.gridTemplateRows = `repeat(${gridSize}, ${cellSize}px)`;

        for (let r = 0; r < gridSize; r++) {
            grid[r] = [];
            for (let c = 0; c < gridSize; c++) {
                const node = new Node(r, c);
                grid[r][c] = node;

                const nodeElement = document.createElement('div');
                nodeElement.classList.add('node');
                nodeElement.dataset.row = r;
                nodeElement.dataset.col = c;
                nodeElement.addEventListener('click', handleNodeClick);
                nodeElement.addEventListener('mouseover', handleNodeMouseOver);
                nodeElement.addEventListener('mouseout', handleNodeMouseOut);
                gridContainer.appendChild(nodeElement);
            }
        }
    }

    // Funkcja do rysowania siatki po wczytaniu z pliku (wykorzystuje istniejące globalne 'grid')
    function drawLoadedGrid() {
        gridContainer.innerHTML = '';
        const cellSize = 500 / gridSize; 

        gridContainer.style.gridTemplateColumns = `repeat(${gridSize}, ${cellSize}px)`;
        gridContainer.style.gridTemplateRows = `repeat(${gridSize}, ${cellSize}px)`;

        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const node = grid[r][c];
                const nodeElement = document.createElement('div');
                nodeElement.classList.add('node');
                nodeElement.dataset.row = r;
                nodeElement.dataset.col = c;
                
                if (node.isWall) nodeElement.classList.add('wall');
                if (node.isStart) nodeElement.classList.add('start');
                if (node.isEnd) nodeElement.classList.add('end');

                nodeElement.addEventListener('click', handleNodeClick);
                nodeElement.addEventListener('mouseover', handleNodeMouseOver);
                nodeElement.addEventListener('mouseout', handleNodeMouseOut);
                gridContainer.appendChild(nodeElement);
            }
        }
        resetVisualization(); 
    }
    
    // --- OBSŁUGA INTERAKCJI UŻYTKOWNIKA ---
    
    function handleNodeClick(e) {
        if (isRunning) return;
        
        const nodeElement = e.target;
        const row = parseInt(nodeElement.dataset.row);
        const col = parseInt(nodeElement.dataset.col);
        const node = grid[row][col];

        // 1. Logika ustawiania ściany (pojedyncze kliknięcie)
        if (currentMode === 'wall') {
            if (!node.isStart && !node.isEnd) {
                if (node.isWall) {
                    nodeElement.classList.remove('wall');
                    node.isWall = false;
                } else {
                    nodeElement.classList.add('wall');
                    node.isWall = true;
                }
            }
        } 
        // 2. Logika ustawiania Startu
        else if (currentMode === 'start') {
            if (startNode) {
                document.querySelector(`.node[data-row="${startNode.row}"][data-col="${startNode.col}"]`).classList.remove('start');
                startNode.isStart = false;
            }
            nodeElement.classList.remove('end', 'wall', 'open', 'closed', 'path'); 
            nodeElement.classList.add('start');
            node.isStart = true;
            node.isWall = false;
            node.isEnd = false;
            startNode = node;
        } 
        // 3. Logika ustawiania Mety
        else if (currentMode === 'end') {
            if (endNode) {
                document.querySelector(`.node[data-row="${endNode.row}"][data-col="${endNode.col}"]`).classList.remove('end');
                endNode.isEnd = false;
            }
            nodeElement.classList.remove('start', 'wall', 'open', 'closed', 'path');
            nodeElement.classList.add('end');
            node.isEnd = true;
            node.isWall = false;
            node.isStart = false;
            endNode = node;
        } 
        
        resetVisualization(); 
    }
    
    // Obsługa wyświetlania kosztów po najechaniu
    function handleNodeMouseOver(e) {
        const row = parseInt(e.target.dataset.row);
        const col = parseInt(e.target.dataset.col);
        const node = grid[row][col];
        
        if (node.g !== Infinity && node.f !== Infinity) {
            costDisplay.innerHTML = `
                **F:** ${node.f.toFixed(2)}<br>
                **G:** ${node.g.toFixed(2)} (Koszt do Startu)<br>
                **H:** ${node.h.toFixed(2)} (Heurystyka)
            `;
            costDisplay.classList.add('visible');
        } else if (node.isStart) {
            costDisplay.innerHTML = `**START** (G=0)`;
            costDisplay.classList.add('visible');
        } else if (node.isEnd) {
            costDisplay.innerHTML = `**META**`;
            costDisplay.classList.add('visible');
        } else if (node.isWall) {
            costDisplay.innerHTML = `**PRZESZKODA**`;
            costDisplay.classList.add('visible');
        }
    }

    function handleNodeMouseOut() {
        costDisplay.classList.remove('visible');
    }

    // Zmiana trybu interakcji (Start/Meta/Przeszkoda)
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isRunning) return;
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMode = btn.dataset.mode;
        });
    });

    // Zmiana szybkości animacji
    speedRange.addEventListener('input', (e) => {
        animationSpeed = 510 - parseInt(e.target.value); 
        speedValueSpan.textContent = `${e.target.value} (${animationSpeed} ms)`;
    });
    
    // --- FUNKCJE KONTROLUJĄCE ALGORYTM A* ---

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    async function visualizeAStar() {
        if (isRunning) return;

        if (!startNode || !endNode) {
            startBtn.textContent = '⛔ Ustaw Start i Metę';
            return;
        }
        
        resetVisualization(); 
        isRunning = true;
        startBtn.textContent = '⏸️ W TRAKCIE...';
        
        // --- INICJALIZACJA ---
        grid.forEach(rowArr => rowArr.forEach(node => {
            node.g = Infinity;
            node.f = Infinity;
            node.parent = null;
            node.calculateH(endNode); 
        }));
        
        startNode.g = 0;
        startNode.f = startNode.h;
        
        const openSet = [startNode]; 
        const closedSet = new Set(); 

        // --- GŁÓWNA PĘTLA A* ---
        while (openSet.length > 0) {
            
            openSet.sort((a, b) => a.f - b.f);
            const currentNode = openSet.shift(); 

            const currentNodeId = `${currentNode.row},${currentNode.col}`;
            
            if (closedSet.has(currentNodeId)) continue; 

            if (currentNode === endNode) {
                await reconstructPath(); 
                isRunning = false;
                startBtn.textContent = '✔️ ZAKOŃCZONO!';
                return;
            }
            
            closedSet.add(currentNodeId);

            const currentElement = document.querySelector(`.node[data-row="${currentNode.row}"][data-col="${currentNode.col}"]`);
            if (!currentNode.isStart && !currentNode.isEnd) {
                currentElement.classList.remove('open'); 
                currentElement.classList.add('closed');
            }

            await delay(animationSpeed); 

            const neighbors = getNeighbors(currentNode);

            for (const neighbor of neighbors) {
                const neighborId = `${neighbor.row},${neighbor.col}`;

                if (neighbor.isWall || closedSet.has(neighborId)) continue;

                const tentativeGScore = currentNode.g + 1; 
                const isInOpenSet = openSet.includes(neighbor);

                if (tentativeGScore < neighbor.g || !isInOpenSet) {
                    neighbor.parent = currentNode;
                    neighbor.g = tentativeGScore;
                    neighbor.f = neighbor.g + neighbor.h;

                    if (!isInOpenSet) {
                        openSet.push(neighbor);
                        
                        if (!neighbor.isStart && !neighbor.isEnd) {
                            const neighborElement = document.querySelector(`.node[data-row="${neighbor.row}"][data-col="${neighbor.col}"]`);
                            neighborElement.classList.add('open');
                        }
                    }
                }
            }
        }
        
        isRunning = false;
        startBtn.textContent = '❌ NIE ZNALEZIONO ŚCIEŻKI!';
    }
    
    // Funkcja pomocnicza: znajdź sąsiadów (4 kierunki, w kolejności: Góra, Dół, Lewo, Prawo)
    function getNeighbors(node) {
        const neighbors = [];
        const { row, col } = node;
        
        // Definicja kierunków w pożądanej kolejności:
        // [dr, dc] -> [Zmiana Wiersza, Zmiana Kolumny]
        const directions = [ 
            [-1, 0], // 1. GÓRA (row - 1)
            [1, 0],  // 2. DÓŁ (row + 1)
            [0, -1], // 3. LEWO (col - 1)
            [0, 1]   // 4. PRAWO (col + 1)
        ]; 

        for (const [dr, dc] of directions) {
            const newR = row + dr;
            const newC = col + dc;

            // Sprawdzenie, czy nowy węzeł mieści się w granicach siatki
            if (newR >= 0 && newR < gridSize && newC >= 0 && newC < gridSize) {
                neighbors.push(grid[newR][newC]);
            }
        }
        return neighbors;
    }

    async function reconstructPath() {
        let currentNode = endNode.parent; 
        while (currentNode !== null && currentNode !== startNode) {
            const element = document.querySelector(`.node[data-row="${currentNode.row}"][data-col="${currentNode.col}"]`);
            element.classList.remove('open', 'closed');
            element.classList.add('path');
            currentNode = currentNode.parent;
            await delay(30); 
        }
    }
    
    // --- OBSŁUGA WCZYTYWANIA PLIKÓW ---
    
    function parseGridData(text) {
        // 0 0 0... (Ignorowanie początkowych metadanych, jeśli są)
        const cleanText = text.replace(/\//g, '').trim(); 
        const lines = cleanText.split('\n').filter(line => line.trim().length > 0);
        const loadedGrid = [];
        
        if (lines.length === 0) return null;
        
        // Wczytanie pierwszej linii w celu ustalenia szerokości
        const firstRowData = lines[0].trim().split(/\s+/).map(Number);
        const size = firstRowData.length;
        if (size === 0) return null;
        
        let tempStartNode = null;
        let tempEndNode = null;
        
        for (let r = 0; r < lines.length; r++) {
            const rowData = lines[r].trim().split(/\s+/).map(Number);
            if (rowData.length !== size) {
                 console.error("Niespójna szerokość w wierszu:", r);
                 return null;
            }
            
            loadedGrid[r] = [];
            for (let c = 0; c < size; c++) {
                const node = new Node(r, c);
                const value = rowData[c];

                if (value === 5) { 
                    node.isWall = true;
                } else if (value === 1) { 
                    node.isStart = true;
                    tempStartNode = node;
                } else if (value === 2) { 
                    node.isEnd = true;
                    tempEndNode = node;
                }
                loadedGrid[r][c] = node;
            }
        }
        
        return { grid: loadedGrid, size: size, start: tempStartNode, end: tempEndNode };
    }

    function loadMapFromFile() {
        if (fileInput.files.length === 0) {
            alert("Wybierz plik tekstowy (.txt)!");
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const parsedData = parseGridData(text);

                if (parsedData) {
                    grid = parsedData.grid;
                    gridSize = parsedData.size;
                    startNode = parsedData.start;
                    endNode = parsedData.end;
                    
                    gridSizeInput.value = gridSize;
                    drawLoadedGrid();
                    alert(`Mapa ${gridSize}x${gridSize} załadowana pomyślnie! Konwencja: 1=Start, 2=Meta, 5=Ściana.`);
                } else {
                    alert("Błąd w parsowaniu pliku. Sprawdź, czy każda linia ma tę samą liczbę kolumn.");
                }
            } catch (error) {
                alert(`Wystąpił błąd podczas ładowania pliku: ${error.message}`);
            }
        };

        reader.readAsText(file);
    }

    // --- OBSŁUGA PRZYCISKÓW KONTROLNYCH ---

    function resetVisualization() {
        if (isRunning) {
            isRunning = false;
        }
        
        document.querySelectorAll('.node').forEach(element => {
            element.classList.remove('open', 'closed', 'path');
            
            const row = parseInt(element.dataset.row);
            const col = parseInt(element.dataset.col);
            const node = grid[row][col];
            node.g = Infinity;
            node.f = Infinity;
            node.parent = null;
        });
        
        startBtn.textContent = '▶️ START';
    }

    function clearAll() {
        if (isRunning) return;
        
        resetVisualization();
        
        document.querySelectorAll('.node').forEach(element => {
            element.classList.remove('start', 'end', 'wall');
        });
        
        grid.forEach(rowArr => rowArr.forEach(node => {
            Object.assign(node, new Node(node.row, node.col));
        }));
        
        startNode = null;
        endNode = null;
    }


    // --- PRZYPISANIE ZDARZEŃ ---
    generateBtn.addEventListener('click', generateGrid);
    startBtn.addEventListener('click', visualizeAStar);
    resetVisBtn.addEventListener('click', resetVisualization);
    clearAllBtn.addEventListener('click', clearAll);
    loadMapBtn.addEventListener('click', loadMapFromFile); // Przypisanie do przycisku wczytywania

    // Generowanie siatki startowej
    generateGrid();
});