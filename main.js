document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const stockSearchInput = document.getElementById('stockSearch');
    const searchButton = document.getElementById('searchButton');
    const searchResults = document.getElementById('searchResults');
    const contentSection = document.getElementById('contentSection');
    const metricsContainer = document.getElementById('metricsContainer');
    const stockMetrics = document.getElementById('stockMetrics');
    const timeRangeSelect = document.getElementById('timeRange');
    const daysSlider = document.getElementById('daysSlider');
    const daysLabel = document.getElementById('daysLabel');
    const generatePredictionButton = document.getElementById('generatePrediction');
    const externalDataBadge = document.getElementById('externalDataBadge');
    
    // Chart
    let stockChart;
    let currentTicker = '';
    let historicalData = [];
    let predictionData = [];
    let usedExternalData = false;
    
    // Event listeners
    stockSearchInput.addEventListener('input', debounce(handleSearch, 300));
    searchButton.addEventListener('click', () => handleSearch(stockSearchInput.value));
    timeRangeSelect.addEventListener('change', updateChart);
    daysSlider.addEventListener('input', updateDaysLabel);
    generatePredictionButton.addEventListener('click', generatePrediction);
    
    // Functions
    function debounce(func, delay) {
      let timeout;
      return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
      };
    }
    
    function handleSearch(event) {
      const query = typeof event === 'string' ? event : event.target.value;
      
      if (query.length < 1) {
        searchResults.innerHTML = '';
        searchResults.classList.add('hidden');
        return;
      }
      
      fetch(`/api/stocks/search?query=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
          if (data.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item">No results found</div>';
          } else {
            searchResults.innerHTML = '';
            data.forEach(stock => {
              const resultItem = document.createElement('div');
              resultItem.classList.add('search-result-item');
              resultItem.innerHTML = `
                <div>
                  <span class="ticker">${stock.ticker}</span>
                  <span class="name">- ${stock.name}</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="check-icon hidden"><polyline points="20 6 9 17 4 12"></polyline></svg>
              `;
              resultItem.addEventListener('click', () => selectStock(stock.ticker));
              searchResults.appendChild(resultItem);
            });
          }
          searchResults.classList.remove('hidden');
        })
        .catch(error => {
          console.error('Error searching stocks:', error);
          searchResults.innerHTML = '<div class="search-result-item">Error fetching results</div>';
        });
    }
    
    async function selectStock(ticker) {
      searchResults.classList.add('hidden');
      stockSearchInput.value = ticker;
      currentTicker = ticker;
      
      try {
        // Show loading state
        contentSection.classList.remove('hidden');
        stockMetrics.innerHTML = '<div class="loading-indicator">Loading metrics...</div>';
        
        // Fetch stock metrics
        const metricsResponse = await fetch(`/api/stocks/${ticker}/metrics`);
        const metrics = await metricsResponse.json();
        displayStockMetrics(metrics);
        
        // Fetch historical data
        const historicalResponse = await fetch(`/api/stocks/${ticker}/historical`);
        historicalData = await historicalResponse.json();
        
        // Reset prediction data
        predictionData = [];
        usedExternalData = false;
        externalDataBadge.classList.add('hidden');
        
        // Initialize chart
        updateChart();
        
      } catch (error) {
        console.error('Error fetching stock data:', error);
        alert('Failed to load stock data. Please try again.');
      }
    }
    
    function displayStockMetrics(metrics) {
      const isPositive = metrics.change >= 0;
      const changeClass = isPositive ? 'positive' : 'negative';
      const trendIcon = isPositive ? 
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>' :
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>';
      
      const changeSign = isPositive ? '+' : '';
      
      metricsContainer.querySelector('h2').innerHTML = `
        ${metrics.ticker} <span style="margin-left:1rem; font-size:1.5rem">$${metrics.currentPrice.toFixed(2)}</span>
        <span class="metrics-change ${changeClass}">${trendIcon} ${changeSign}${metrics.change.toFixed(2)} (${changeSign}${metrics.changePercent.toFixed(2)}%)</span>
      `;
      
      // Format large numbers
      function formatLargeNumber(num) {
        if (num >= 1000000) {
          return `${(num / 1000000).toFixed(2)}M`;
        }
        return num.toLocaleString();
      }
      
      // Generate metrics HTML
      stockMetrics.innerHTML = `
        <div class="metric-item">
          <div class="metric-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"></rect><rect x="2" y="14" width="20" height="8" rx="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
            Volume
          </div>
          <div class="metric-value">${formatLargeNumber(metrics.volume)}</div>
        </div>
        
        <div class="metric-item">
          <div class="metric-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
            Avg Volume
          </div>
          <div class="metric-value">${formatLargeNumber(metrics.avgVolume)}</div>
        </div>
        
        <div class="metric-item">
          <div class="metric-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            Market Cap
          </div>
          <div class="metric-value">${metrics.marketCap}</div>
        </div>
        
        <div class="metric-item">
          <div class="metric-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
            P/E Ratio
          </div>
          <div class="metric-value">${metrics.peRatio.toFixed(2)}</div>
        </div>
        
        <div class="metric-item">
          <div class="metric-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            Dividend
          </div>
          <div class="metric-value">$${metrics.dividend.toFixed(2)}</div>
        </div>
        
        <div class="metric-item">
          <div class="metric-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            52W High
          </div>
          <div class="metric-value">$${metrics.week52High.toFixed(2)}</div>
        </div>
        
        <div class="metric-item">
          <div class="metric-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
            52W Low
          </div>
          <div class="metric-value">$${metrics.week52Low.toFixed(2)}</div>
        </div>
      `;
    }
    
    function updateDaysLabel() {
      daysLabel.textContent = `${daysSlider.value} days`;
    }
    
    async function generatePrediction() {
      if (!currentTicker || historicalData.length === 0) {
        alert('Please select a stock first');
        return;
      }
      
      try {
        // Show loading state
        generatePredictionButton.disabled = true;
        generatePredictionButton.classList.add('loading');
        generatePredictionButton.textContent = 'Generating Prediction...';
        
        // Fetch prediction data
        const response = await fetch(`/api/stocks/${currentTicker}/prediction?days=${daysSlider.value}`);
        const data = await response.json();
        
        predictionData = data.predictions;
        usedExternalData = data.usedExternalData;
        
        // Update UI
        externalDataBadge.classList.toggle('hidden', !usedExternalData);
        
        // Update chart
        updateChart();
        
      } catch (error) {
        console.error('Error generating prediction:', error);
        alert('Failed to generate prediction. Please try again.');
      } finally {
        // Reset button
        generatePredictionButton.disabled = false;
        generatePredictionButton.classList.remove('loading');
        generatePredictionButton.textContent = 'Generate Prediction';
      }
    }
    
    function updateChart() {
      // Filter historical data based on selected time range
      const filteredData = filterDataByTimeRange(historicalData);
      
      // Combine historical and prediction data
      const combinedData = [...filteredData];
      if (predictionData.length > 0) {
        combinedData.push(...predictionData);
      }
      
      // Prepare datasets
      const datasets = [
        {
          label: 'Historical',
          data: filteredData.map(item => ({
            x: item.date,
            y: item.close
          })),
          borderColor: '#0EA5E9',
          backgroundColor: 'rgba(14, 165, 233, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.1
        }
      ];
      
      if (predictionData.length > 0) {
        // Add prediction line
        datasets.push({
          label: 'Prediction',
          data: predictionData.map(item => ({
            x: item.date,
            y: item.predicted
          })),
          borderColor: '#06B6D4',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 3,
          pointBackgroundColor: '#06B6D4',
          tension: 0.1
        });
        
        // Add confidence interval area
        datasets.push({
          label: 'Confidence Interval',
          data: predictionData.map(item => ({
            x: item.date,
            y: item.upper
          })),
          borderColor: 'transparent',
          pointRadius: 0,
          tension: 0.1,
          fill: false
        });
        
        datasets.push({
          label: 'Confidence Interval',
          data: predictionData.map(item => ({
            x: item.date,
            y: item.lower
          })),
          borderColor: 'transparent',
          backgroundColor: 'rgba(224, 242, 254, 0.5)',  // Light blue with transparency
          pointRadius: 0,
          tension: 0.1,
          fill: '-1'  // Fill to the previous dataset
        });
      }
      
      // Destroy existing chart
      if (stockChart) {
        stockChart.destroy();
      }
      
      // Create new chart
      const ctx = document.getElementById('stockChart').getContext('2d');
      stockChart = new Chart(ctx, {
        type: 'line',
        data: {
          datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false
          },
          scales: {
            x: {
              type: 'time',
              time: {
                unit: 'day',
                tooltipFormat: 'MMM d, yyyy',
                displayFormats: {
                  day: 'MMM d'
                }
              },
              grid: {
                display: false
              }
            },
            y: {
              title: {
                display: true,
                text: 'Price ($)'
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              }
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                filter: function(item) {
                  // Hide the "Confidence Interval" label
                  return item.text !== 'Confidence Interval';
                }
              }
            },
            tooltip: {
              enabled: true,
              callbacks: {
                label: function(context) {
                  const label = context.dataset.label || '';
                  if (label === 'Confidence Interval') {
                    return '';
                  }
                  
                  const value = context.parsed.y;
                  return `${label}: $${value.toFixed(2)}`;
                },
                afterBody: function(tooltipItems) {
                  const idx = tooltipItems[0].dataIndex;
                  if (predictionData.length > 0 && tooltipItems[0].datasetIndex === 1) {
                    const prediction = predictionData[idx - filteredData.length];
                    if (prediction) {
                      return [
                        `Upper bound: $${prediction.upper.toFixed(2)}`,
                        `Lower bound: $${prediction.lower.toFixed(2)}`
                      ];
                    }
                  }
                  return [];
                }
              }
            }
          }
        }
      });
    }
    
    function filterDataByTimeRange(data) {
      if (!data || data.length === 0) {
        return [];
      }
      
      const range = timeRangeSelect.value;
      const now = new Date();
      let daysToSubtract = 0;
      
      switch (range) {
        case '1W':
          daysToSubtract = 7;
          break;
        case '1M':
          daysToSubtract = 30;
          break;
        case '3M':
          daysToSubtract = 90;
          break;
        case '6M':
          daysToSubtract = 180;
          break;
        case '1Y':
          daysToSubtract = 365;
          break;
        case '5Y':
          daysToSubtract = 1825;
          break;
        default:
          daysToSubtract = 90;
      }
      
      const cutoffDate = new Date();
      cutoffDate.setDate(now.getDate() - daysToSubtract);
      
      return data.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= cutoffDate;
      });
    }
    
    // Initialize days label
    updateDaysLabel();
  });