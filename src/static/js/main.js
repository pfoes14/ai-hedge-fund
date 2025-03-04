
document.addEventListener('DOMContentLoaded', function() {
    // Initialize TradingView widget
    new TradingView.widget({
        "width": "100%",
        "height": "100%",
        "symbol": "NASDAQ:AAPL",
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "light",
        "style": "1",
        "locale": "en",
        "toolbar_bg": "#f1f3f6",
        "enable_publishing": false,
        "hide_top_toolbar": true,
        "hide_legend": false,
        "save_image": false,
        "container_id": "tradingview_widget"
    });
    
    // Modal functionality
    const addTickersModal = document.getElementById('add-tickers-modal');
    const backTestModal = document.getElementById('backtest-modal');
    const addTickersBtn = document.getElementById('add-tickers');
    const backTestBtn = document.getElementById('run-backtest');
    const backTestLink = document.getElementById('backtest-link');
    const closeButtons = document.querySelectorAll('.close');
    
    // Current tickers
    let currentTickers = ['AAPL', 'MSFT', 'NVDA'];
    updateTickerList();
    
    // Open modals
    addTickersBtn.addEventListener('click', function() {
        addTickersModal.style.display = 'block';
    });
    
    backTestBtn.addEventListener('click', function() {
        openBacktestModal();
    });
    
    backTestLink.addEventListener('click', function() {
        openBacktestModal();
    });
    
    // Close modals
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            addTickersModal.style.display = 'none';
            backTestModal.style.display = 'none';
        });
    });
    
    window.addEventListener('click', function(event) {
        if (event.target === addTickersModal) {
            addTickersModal.style.display = 'none';
        }
        if (event.target === backTestModal) {
            backTestModal.style.display = 'none';
        }
    });
    
    // Add ticker functionality
    const addTickerButton = document.getElementById('add-ticker-btn');
    const tickerInput = document.getElementById('ticker-input');
    
    addTickerButton.addEventListener('click', function() {
        const newTickers = tickerInput.value.split(',').map(t => t.trim().toUpperCase());
        
        newTickers.forEach(ticker => {
            if (ticker && !currentTickers.includes(ticker)) {
                currentTickers.push(ticker);
            }
        });
        
        tickerInput.value = '';
        updateTickerList();
    });
    
    function updateTickerList() {
        const tickerList = document.getElementById('ticker-list');
        tickerList.innerHTML = '';
        
        currentTickers.forEach(ticker => {
            const tickerItem = document.createElement('div');
            tickerItem.className = 'ticker-item';
            tickerItem.innerHTML = `
                <span>${ticker}</span>
                <button class="remove-ticker" data-ticker="${ticker}">×</button>
            `;
            tickerList.appendChild(tickerItem);
        });
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-ticker').forEach(button => {
            button.addEventListener('click', function() {
                const tickerToRemove = this.getAttribute('data-ticker');
                currentTickers = currentTickers.filter(t => t !== tickerToRemove);
                updateTickerList();
            });
        });
    }
    
    // Backtest form functionality
    function openBacktestModal() {
        backTestModal.style.display = 'block';
        
        // Set default dates (3 months back to today)
        const today = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        
        document.getElementById('backtest-end-date').value = formatDate(today);
        document.getElementById('backtest-start-date').value = formatDate(threeMonthsAgo);
        document.getElementById('backtest-tickers').value = currentTickers.join(',');
        
        // Load analysts
        loadAnalysts();
        
        // Load models
        loadModels();
    }
    
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // Load analysts from API
    function loadAnalysts() {
        fetch('/api/analysts')
            .then(response => response.json())
            .then(analysts => {
                const container = document.getElementById('analyst-checkboxes');
                container.innerHTML = '';
                
                analysts.forEach(analyst => {
                    const checkbox = document.createElement('div');
                    checkbox.className = 'checkbox-item';
                    checkbox.innerHTML = `
                        <input type="checkbox" id="analyst-${analyst.value}" name="analysts" value="${analyst.value}" checked>
                        <label for="analyst-${analyst.value}">${analyst.display}</label>
                    `;
                    container.appendChild(checkbox);
                });
            })
            .catch(error => console.error('Error loading analysts:', error));
    }
    
    // Load models from API
    function loadModels() {
        fetch('/api/models')
            .then(response => response.json())
            .then(models => {
                const select = document.getElementById('model-select');
                select.innerHTML = '';
                
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.value;
                    option.textContent = model.display;
                    select.appendChild(option);
                });
            })
            .catch(error => console.error('Error loading models:', error));
    }
    
    // Handle backtest form submission
    const backtestForm = document.getElementById('backtest-form');
    backtestForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const tickers = document.getElementById('backtest-tickers').value.split(',').map(t => t.trim());
        const startDate = document.getElementById('backtest-start-date').value;
        const endDate = document.getElementById('backtest-end-date').value;
        const initialCapital = parseFloat(document.getElementById('initial-capital').value);
        const marginRequirement = parseFloat(document.getElementById('margin-requirement').value);
        
        // Get selected analysts
        const selectedAnalysts = Array.from(
            document.querySelectorAll('input[name="analysts"]:checked')
        ).map(checkbox => checkbox.value);
        
        // Get selected model
        const modelName = document.getElementById('model-select').value;
        
        // Show loading indicator
        backTestModal.style.display = 'none';
        document.body.innerHTML += '<div id="loading-overlay"><div class="spinner"></div><p>Running backtest...</p></div>';
        
        // Run the backtest
        fetch('/api/backtest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tickers,
                start_date: startDate,
                end_date: endDate,
                initial_capital: initialCapital,
                margin_requirement: marginRequirement,
                selected_analysts: selectedAnalysts,
                model_name: modelName,
            }),
        })
        .then(response => response.json())
        .then(data => {
            // Remove loading indicator
            document.getElementById('loading-overlay').remove();
            
            // Redirect to results page or display results
            if (data.error) {
                alert('Error: ' + data.error);
            } else {
                // Store results in sessionStorage and redirect to dashboard
                sessionStorage.setItem('backtestResults', JSON.stringify(data));
                window.location.href = '/dashboard';
            }
        })
        .catch(error => {
            // Remove loading indicator
            document.getElementById('loading-overlay').remove();
            console.error('Error running backtest:', error);
            alert('Error running backtest. See console for details.');
        });
    });
    
    // Run model button
    const runModelBtn = document.getElementById('run-model');
    runModelBtn.addEventListener('click', function() {
        if (currentTickers.length === 0) {
            alert('Please add at least one ticker first.');
            return;
        }
        
        // Show loading indicator
        document.body.innerHTML += '<div id="loading-overlay"><div class="spinner"></div><p>Running model...</p></div>';
        
        // Get today and 3 months ago dates
        const today = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        
        // Run the model
        fetch('/api/run-hedge-fund', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tickers: currentTickers,
                start_date: formatDate(threeMonthsAgo),
                end_date: formatDate(today),
                initial_cash: 100000,
                margin_requirement: 0.0,
                selected_analysts: [], // Use all analysts
                model_name: 'gpt-4o', // Default model
            }),
        })
        .then(response => response.json())
        .then(data => {
            // Remove loading indicator
            document.getElementById('loading-overlay').remove();
            
            // Update portfolio display
            updatePortfolioDisplay(data);
            
            // Update positions list
            updatePositionsList(data);
        })
        .catch(error => {
            // Remove loading indicator
            document.getElementById('loading-overlay').remove();
            console.error('Error running model:', error);
            alert('Error running model. See console for details.');
        });
    });
    
    function updatePortfolioDisplay(data) {
        // Implementation will depend on the data structure returned by the API
        console.log("Model results:", data);
        // TODO: Update the portfolio value and change display
    }
    
    function updatePositionsList(data) {
        const positionsList = document.getElementById('positions-list');
        positionsList.innerHTML = '';
        
        // Implementation will depend on the data structure returned by the API
        if (data.decisions) {
            const hasPositions = Object.keys(data.decisions).some(ticker => {
                const decision = data.decisions[ticker];
                return decision.action !== 'hold' && decision.quantity > 0;
            });
            
            if (hasPositions) {
                Object.keys(data.decisions).forEach(ticker => {
                    const decision = data.decisions[ticker];
                    if (decision.action !== 'hold' && decision.quantity > 0) {
                        const positionItem = document.createElement('div');
                        positionItem.className = 'position-item';
                        positionItem.innerHTML = `
                            <div class="position-ticker">${ticker}</div>
                            <div class="position-details">
                                <div class="position-action">${decision.action.toUpperCase()}</div>
                                <div class="position-quantity">${decision.quantity} shares</div>
                            </div>
                        `;
                        positionsList.appendChild(positionItem);
                    }
                });
            } else {
                positionsList.innerHTML = '<div class="no-positions">No active positions</div>';
            }
        } else {
            positionsList.innerHTML = '<div class="no-positions">No active positions</div>';
        }
    }
    
    // Add export data functionality
    document.getElementById('export-data').addEventListener('click', function() {
        // Create a simple CSV export of current tickers and portfolio
        let csv = 'Ticker,Action,Quantity\n';
        
        // Add some dummy data if no real data available
        if (currentTickers.length > 0) {
            currentTickers.forEach(ticker => {
                csv += `${ticker},hold,0\n`;
            });
        }
        
        // Create download link
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', 'portfolio_export.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
});
