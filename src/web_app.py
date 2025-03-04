
from flask import Flask, render_template, request, jsonify, redirect, url_for
import os
import json
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

# Import the necessary components from the hedge fund system
from main import run_hedge_fund
from backtester import Backtester
from utils.analysts import ANALYST_ORDER
from llm.models import LLM_ORDER, get_model_info

app = Flask(__name__, 
            static_folder='static',
            template_folder='templates')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/api/run-hedge-fund', methods=['POST'])
def api_run_hedge_fund():
    data = request.json
    tickers = data.get('tickers', [])
    start_date = data.get('start_date')
    end_date = data.get('end_date', datetime.now().strftime("%Y-%m-%d"))
    selected_analysts = data.get('selected_analysts', [])
    model_name = data.get('model_name', 'gpt-4o')
    model_provider = data.get('model_provider', 'OpenAI')
    show_reasoning = data.get('show_reasoning', False)
    
    # Initialize a portfolio
    portfolio = {
        "cash": data.get('initial_cash', 100000),
        "margin_requirement": data.get('margin_requirement', 0.0),
        "positions": {
            ticker: {
                "long": 0,
                "short": 0,
                "long_cost_basis": 0.0,
                "short_cost_basis": 0.0,
            } for ticker in tickers
        },
        "realized_gains": {
            ticker: {
                "long": 0.0,
                "short": 0.0,
            } for ticker in tickers
        }
    }
    
    try:
        result = run_hedge_fund(
            tickers=tickers,
            start_date=start_date,
            end_date=end_date,
            portfolio=portfolio,
            show_reasoning=show_reasoning,
            selected_analysts=selected_analysts,
            model_name=model_name,
            model_provider=model_provider,
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/backtest', methods=['POST'])
def api_backtest():
    data = request.json
    tickers = data.get('tickers', [])
    start_date = data.get('start_date')
    end_date = data.get('end_date', datetime.now().strftime("%Y-%m-%d"))
    initial_capital = data.get('initial_capital', 100000)
    margin_requirement = data.get('margin_requirement', 0.0)
    selected_analysts = data.get('selected_analysts', [])
    model_name = data.get('model_name', 'gpt-4o')
    model_provider = data.get('model_provider', 'OpenAI')
    
    try:
        backtester = Backtester(
            agent=run_hedge_fund,
            tickers=tickers,
            start_date=start_date,
            end_date=end_date,
            initial_capital=initial_capital,
            model_name=model_name,
            model_provider=model_provider,
            selected_analysts=selected_analysts,
            initial_margin_requirement=margin_requirement,
        )
        
        performance_metrics = backtester.run_backtest()
        # Convert the portfolio_values to a format suitable for charting
        chart_data = [{
            'date': entry['Date'].strftime('%Y-%m-%d'),
            'portfolio_value': float(entry['Portfolio Value']),
            'long_exposure': float(entry.get('Long Exposure', 0)),
            'short_exposure': float(entry.get('Short Exposure', 0)),
        } for entry in backtester.portfolio_values]
        
        return jsonify({
            'performance_metrics': performance_metrics,
            'chart_data': chart_data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analysts')
def api_analysts():
    return jsonify([{'display': display, 'value': value} for display, value in ANALYST_ORDER])

@app.route('/api/models')
def api_models():
    return jsonify([{'display': display, 'value': value} for display, value, _ in LLM_ORDER])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
