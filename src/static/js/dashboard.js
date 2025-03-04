
document.addEventListener('DOMContentLoaded', function() {
    let portfolioChart;
    let backtestResults = null;
    
    // Check if there are backtest results in sessionStorage
    const storedResults = sessionStorage.getItem('backtestResults');
    if (storedResults) {
        backtestResults = JSON.parse(storedResults);
        renderBacktestResults(backtestResults);
        // Clear the stored results
        sessionStorage.removeItem('backtestResults');
    } else {
        // Load dummy data for demo purposes
        loadDummyData();
    }
    
    // Period selector functionality
    const periodButtons = document.querySelectorAll('.period-btn');
    periodButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            periodButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Filter data based on selected period
            const period = this.getAttribute('data-period');
            filterChartData(period);
        });
    });
    
    // Modal functionality (same as main.js)
    const backTestModal = document.getElementById('backtest-modal');
    const backTestLink = document.getElementById('backtest-link');
    const closeButtons = document.querySelectorAll('.close');
    
    backTestLink.addEventListener('click', function() {
        openBacktestModal();
    });
    
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            backTestModal.style.display = 'none';
        });
    });
    
    window.addEventListener('click', function(event) {
        if (event.target === backTestModal) {
            backTestModal.style.display = 'none';
        }
    });
    
    function openBacktestModal() {
        backTestModal.style.display = 'block';
        
        // Set default dates (3 months back to today)
        const today = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        
        document.getElementById('backtest-end-date').value = formatDate(today);
        document.getElementById('backtest-start-date').value = formatDate(threeMonthsAgo);
        
        // Load analysts and models (placeholders for now)
        loadAnalysts();
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
            
            if (data.error) {
                alert('Error: ' + data.error);
            } else {
                backtestResults = data;
                renderBacktestResults(data);
            }
        })
        .catch(error => {
            // Remove loading indicator
            document.getElementById('loading-overlay').remove();
            console.error('Error running backtest:', error);
            alert('Error running backtest. See console for details.');
        });
    });
    
    function renderBacktestResults(results) {
        // Update performance metrics
        updatePerformanceMetrics(results.performance_metrics);
        
        // Create the portfolio chart
        createPortfolioChart(results.chart_data);
        
        // Update portfolio value and change
        updatePortfolioSummary(results.chart_data);
        
        // Update the positions table
        updatePositionsTable(results);
        
        // Update signals and trades tables
        // These would depend on your actual data structure
    }
    
    function updatePerformanceMetrics(metrics) {
        if (metrics) {
            document.getElementById('sharpe-ratio').textContent = metrics.sharpe_ratio ? metrics.sharpe_ratio.toFixed(2) : 'N/A';
            document.getElementById('sortino-ratio').textContent = metrics.sortino_ratio ? metrics.sortino_ratio.toFixed(2) : 'N/A';
            document.getElementById('max-drawdown').textContent = metrics.max_drawdown ? metrics.max_drawdown.toFixed(2) + '%' : 'N/A';
            
            // Other metrics would be populated similarly
            // These are placeholders for now
            document.getElementById('win-rate').textContent = '65.2%';
            document.getElementById('profit-factor').textContent = '2.1';
            document.getElementById('annualized-return').textContent = '18.7%';
        }
    }
    
    function createPortfolioChart(chartData) {
        const ctx = document.getElementById('portfolio-chart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (portfolioChart) {
            portfolioChart.destroy();
        }
        
        if (!chartData || chartData.length === 0) {
            // If no chart data, show placeholder
            ctx.font = '20px Arial';
            ctx.fillStyle = 'gray';
            ctx.textAlign = 'center';
            ctx.fillText('No portfolio data available', ctx.canvas.width / 2, ctx.canvas.height / 2);
            return;
        }
        
        // Prepare data for Chart.js
        const dates = chartData.map(item => item.date);
        const values = chartData.map(item => item.portfolio_value);
        const longExposure = chartData.map(item => item.long_exposure || 0);
        const shortExposure = chartData.map(item => item.short_exposure || 0);
        
        portfolioChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Portfolio Value',
                        data: values,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        tension: 0.1,
                        fill: true,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        borderWidth: 2
                    },
                    {
                        label: 'Long Exposure',
                        data: longExposure,
                        borderColor: '#2ecc71',
                        backgroundColor: 'rgba(46, 204, 113, 0.1)',
                        tension: 0.1,
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 3,
                        borderWidth: 1,
                        borderDash: [5, 5]
                    },
                    {
                        label: 'Short Exposure',
                        data: shortExposure,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        tension: 0.1,
                        fill: false,
                        pointRadius: 0,
                        pointHoverRadius: 3,
                        borderWidth: 1,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency: 'USD'
                                    }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }
    
    function updatePortfolioSummary(chartData) {
        if (!chartData || chartData.length === 0) return;
        
        const latestValue = chartData[chartData.length - 1].portfolio_value;
        const initialValue = chartData[0].portfolio_value;
        const change = latestValue - initialValue;
        const changePercent = (change / initialValue) * 100;
        
        document.getElementById('portfolio-value').textContent = latestValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        const changeElement = document.querySelector('.portfolio-change');
        const iconElement = changeElement.querySelector('i');
        const percentElement = document.getElementById('portfolio-change-pct');
        const valueElement = document.getElementById('portfolio-change-val');
        
        percentElement.textContent = Math.abs(changePercent).toFixed(2);
        valueElement.textContent = Math.abs(change).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        if (change >= 0) {
            changeElement.className = 'portfolio-change up';
            iconElement.className = 'fas fa-arrow-up';
        } else {
            changeElement.className = 'portfolio-change down';
            iconElement.className = 'fas fa-arrow-down';
        }
    }
    
    function updatePositionsTable(results) {
        const tableBody = document.getElementById('positions-table-body');
        tableBody.innerHTML = '';
        
        // This is placeholder data
        // In a real implementation, you would extract this from the backtest results
        const positions = [
            { ticker: 'AAPL', type: 'Long', quantity: 100, entryPrice: 178.92, currentPrice: 183.15, pnl: 423.00, pnlPercent: 2.36 },
            { ticker: 'MSFT', type: 'Long', quantity: 50, entryPrice: 328.64, currentPrice: 334.05, pnl: 270.50, pnlPercent: 1.65 },
            { ticker: 'NVDA', type: 'Long', quantity: 30, entryPrice: 874.10, currentPrice: 902.50, pnl: 852.00, pnlPercent: 3.25 }
        ];
        
        positions.forEach(position => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${position.ticker}</td>
                <td>${position.type}</td>
                <td>${position.quantity}</td>
                <td>$${position.entryPrice.toFixed(2)}</td>
                <td>$${position.currentPrice.toFixed(2)}</td>
                <td class="${position.pnl >= 0 ? 'up' : 'down'}">$${position.pnl.toFixed(2)}</td>
                <td class="${position.pnlPercent >= 0 ? 'up' : 'down'}">${position.pnlPercent.toFixed(2)}%</td>
            `;
            tableBody.appendChild(row);
        });
    }
    
    function filterChartData(period) {
        if (!backtestResults || !backtestResults.chart_data) return;
        
        let filteredData = [...backtestResults.chart_data];
        const now = new Date();
        
        // Filter based on period
        switch (period) {
            case '1d':
                filteredData = filteredData.filter(item => {
                    const date = new Date(item.date);
                    return date >= new Date(now.setDate(now.getDate() - 1));
                });
                break;
            case '1w':
                filteredData = filteredData.filter(item => {
                    const date = new Date(item.date);
                    return date >= new Date(now.setDate(now.getDate() - 7));
                });
                break;
            case '1m':
                filteredData = filteredData.filter(item => {
                    const date = new Date(item.date);
                    return date >= new Date(now.setMonth(now.getMonth() - 1));
                });
                break;
            case '3m':
                filteredData = filteredData.filter(item => {
                    const date = new Date(item.date);
                    return date >= new Date(now.setMonth(now.getMonth() - 3));
                });
                break;
            case '1y':
                filteredData = filteredData.filter(item => {
                    const date = new Date(item.date);
                    return date >= new Date(now.setFullYear(now.getFullYear() - 1));
                });
                break;
            // 'all' case - no filtering needed
        }
        
        // Update the chart with filtered data
        createPortfolioChart(filteredData);
        updatePortfolioSummary(filteredData);
    }
    
    function loadDummyData() {
        // Generate dummy data for demonstration purposes
        const dummyData = generateDummyData();
        
        // Render the dummy data
        renderBacktestResults({
            performance_metrics: {
                sharpe_ratio: 1.24,
                sortino_ratio: 1.87,
                max_drawdown: -12.4
            },
            chart_data: dummyData
        });
        
        // Populate the signals table with dummy data
        populateDummySignals();
        
        // Populate the trades table with dummy data
        populateDummyTrades();
    }
    
    function generateDummyData() {
        const result = [];
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);
        
        let value = 100000;
        let longExposure = 60000;
        let shortExposure = 10000;
        
        for (let i = 0; i < 180; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            
            // Add some randomness to the value
            const dailyChange = (Math.random() - 0.45) * 0.01;
            value = value * (1 + dailyChange);
            
            // Adjust exposures occasionally
            if (i % 14 === 0) {
                longExposure = value * (0.5 + Math.random() * 0.2);
                shortExposure = value * (0.1 + Math.random() * 0.1);
            }
            
            result.push({
                date: date.toISOString().split('T')[0],
                portfolio_value: value,
                long_exposure: longExposure,
                short_exposure: shortExposure
            });
        }
        
        return result;
    }
    
    function populateDummySignals() {
        const tableBody = document.getElementById('signals-table-body');
        tableBody.innerHTML = '';
        
        const signals = [
            { ticker: 'AAPL', agent: 'Warren Buffett', signal: 'Bullish', confidence: 'High', timestamp: '2023-04-15' },
            { ticker: 'MSFT', agent: 'Fundamentals', signal: 'Bullish', confidence: 'Medium', timestamp: '2023-04-14' },
            { ticker: 'NVDA', agent: 'Technicals', signal: 'Bullish', confidence: 'High', timestamp: '2023-04-13' },
            { ticker: 'AAPL', agent: 'Sentiment', signal: 'Neutral', confidence: 'Low', timestamp: '2023-04-12' },
            { ticker: 'MSFT', agent: 'Bill Ackman', signal: 'Bullish', confidence: 'Medium', timestamp: '2023-04-11' }
        ];
        
        signals.forEach(signal => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${signal.ticker}</td>
                <td>${signal.agent}</td>
                <td class="${signal.signal.toLowerCase()}">${signal.signal}</td>
                <td>${signal.confidence}</td>
                <td>${signal.timestamp}</td>
            `;
            tableBody.appendChild(row);
        });
    }
    
    function populateDummyTrades() {
        const tableBody = document.getElementById('trades-table-body');
        tableBody.innerHTML = '';
        
        const trades = [
            { date: '2023-04-15', ticker: 'AAPL', action: 'Buy', quantity: 50, price: 178.92, value: 8946.00 },
            { date: '2023-04-14', ticker: 'MSFT', action: 'Buy', quantity: 25, price: 328.64, value: 8216.00 },
            { date: '2023-04-13', ticker: 'NVDA', action: 'Buy', quantity: 15, price: 874.10, value: 13111.50 },
            { date: '2023-04-12', ticker: 'AMD', action: 'Sell', quantity: 100, price: 158.25, value: 15825.00 },
            { date: '2023-04-11', ticker: 'TSLA', action: 'Buy', quantity: 20, price: 175.30, value: 3506.00 }
        ];
        
        trades.forEach(trade => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${trade.date}</td>
                <td>${trade.ticker}</td>
                <td class="${trade.action.toLowerCase() === 'buy' ? 'up' : 'down'}">${trade.action}</td>
                <td>${trade.quantity}</td>
                <td>$${trade.price.toFixed(2)}</td>
                <td>$${trade.value.toFixed(2)}</td>
            `;
            tableBody.appendChild(row);
        });
    }
});
