from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import random
from datetime import datetime, timedelta
import csv

app = Flask(__name__)
app.secret_key = 'supersecretkey'

# Simulated in-memory user database
users = {}

# Mock stock suggestions
STOCK_SUGGESTIONS = [
    {"ticker": "AAPL", "name": "Apple Inc."},
    {"ticker": "MSFT", "name": "Microsoft Corporation"},
    {"ticker": "GOOGL", "name": "Alphabet Inc."},
    {"ticker": "AMZN", "name": "Amazon.com, Inc."},
    {"ticker": "META", "name": "Meta Platforms, Inc."},
    {"ticker": "TSLA", "name": "Tesla, Inc."},
    {"ticker": "NVDA", "name": "NVIDIA Corporation"},
    {"ticker": "JPM", "name": "JPMorgan Chase & Co."},
    {"ticker": "V", "name": "Visa Inc."},
    {"ticker": "WMT", "name": "Walmart Inc."},
]

def generate_historical_data(days=100):
    data = []
    price = 150 + random.random() * 50
    today = datetime.now()
    for i in range(days, -1, -1):
        date = today - timedelta(days=i)
        price += (random.random() - 0.5) * 5
        price = max(price, 50)
        volume = round(1_000_000 + random.random() * 9_000_000)
        open_price = price - (random.random() * 2)
        close = price
        high = close + (random.random() * 3)
        low = open_price - (random.random() * 3)
        data.append({
            "date": date.strftime("%Y-%m-%d"),
            "open": round(open_price, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(close, 2),
            "volume": volume
        })
    return data

def generate_prediction_data(historical_data, days=30):
    last_date = datetime.strptime(historical_data[-1]["date"], "%Y-%m-%d")
    last_price = historical_data[-1]["close"]
    prediction_data = []
    price = last_price
    for i in range(1, days + 1):
        date = last_date + timedelta(days=i)
        trend = 0.2
        randomness = (random.random() - 0.5) * 5
        price += trend + randomness
        prediction_data.append({
            "date": date.strftime("%Y-%m-%d"),
            "predicted": round(price, 2),
            "upper": round(price * 1.05, 2),
            "lower": round(price * 0.95, 2)
        })
    return prediction_data

def generate_stock_metrics(ticker):
    return {
        "ticker": ticker,
        "currentPrice": round(150 + random.random() * 50, 2),
        "change": round((random.random() * 2) - 0.5, 2),
        "changePercent": round((random.random() * 5) - 1.5, 2),
        "volume": round(1_000_000 + random.random() * 9_000_000),
        "avgVolume": round(1_200_000 + random.random() * 8_000_000),
        "marketCap": f"${round(200 + random.random() * 800, 2)}B",
        "peRatio": round(15 + random.random() * 25, 2),
        "dividend": round(0.5 + random.random() * 2, 2),
        "week52High": round(180 + random.random() * 50, 2),
        "week52Low": round(100 + random.random() * 40, 2),
    }

# Function to save user data to CSV
def save_user_data(email, password):
    with open('data.csv', mode='a', newline='') as file:
        writer = csv.writer(file)
        writer.writerow([email, password])

# Function to save prediction data to CSV
def save_prediction_data(prediction_data):
    with open('data.csv', mode='a', newline='') as file:
        writer = csv.writer(file)
        for prediction in prediction_data:
            writer.writerow([prediction['date'], prediction['predicted'], prediction['upper'], prediction['lower']])

# ======= AUTH ROUTES =======

@app.route('/', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        if email in users and users[email] == password:
            session['user'] = email
            return redirect(url_for('dashboard'))
        else:
            return render_template('login.html', error="Invalid email or password")
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        if email in users:
            return render_template('register.html', error="Email already registered")
        users[email] = password
        session['user'] = email
        save_user_data(email, password)  # Save user data to CSV
        return redirect(url_for('dashboard'))
    return render_template('register.html')

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login'))

# ======= DASHBOARD & API ROUTES =======

@app.route('/dashboard')
def dashboard():
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/api/stocks/search')
def search_stocks():
    query = request.args.get('query', '').lower()
    if not query:
        return jsonify([])
    results = [
        stock for stock in STOCK_SUGGESTIONS
        if query in stock["ticker"].lower() or query in stock["name"].lower()
    ]
    return jsonify(results)

@app.route('/api/stocks/<ticker>/historical')
def get_historical_data(ticker):
    days = int(request.args.get('days', 100))
    data = generate_historical_data(days)
    return jsonify(data)

@app.route('/api/stocks/<ticker>/prediction')
def get_prediction_data(ticker):
    days = int(request.args.get('days', 30))
    historical_data = generate_historical_data(100)
    prediction_data = generate_prediction_data(historical_data, days)
    save_prediction_data(prediction_data)  # Save prediction data to CSV
    used_external_data = random.choice([True, False])
    return jsonify({
        "predictions": prediction_data,
        "usedExternalData": used_external_data
    })

@app.route('/api/stocks/<ticker>/metrics')
def get_stock_metrics(ticker):
    metrics = generate_stock_metrics(ticker)
    return jsonify(metrics)

if __name__ == '__main__':
    app.run(debug=True)